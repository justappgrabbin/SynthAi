"""MorphEngine pipeline: PoseMatcher → … → FrameValidator with persistent edges."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
from PIL import Image

from .character import pose_idle, render_canonical_atlas, render_character
from .edge import TransitionEdge
from .geom import apply_easing
from .parts import extract_atlas, reconstruct
from .modules import (
    FrameValidator,
    JointInterpolator,
    LandmarkRegistrar,
    MeshWarper,
    MotionEstimator,
    OcclusionDetector,
    OpticalFlowRefiner,
    PoseMatcher,
    SecondaryMotionSolver,
    SkeletonMeshBuilder,
    SurfaceCompleter,
)
from .types import SpriteState


class MorphEngine:
    def __init__(self, edge_dir: str | Path = "edges"):
        self.edge_dir = Path(edge_dir)
        self.edge_dir.mkdir(parents=True, exist_ok=True)
        self.pose_matcher = PoseMatcher()
        self.landmark_registrar = LandmarkRegistrar()
        self.mesh_builder = SkeletonMeshBuilder()
        self.motion_estimator = MotionEstimator()
        self.joint_interpolator = JointInterpolator()
        self.mesh_warper = MeshWarper()
        self.flow_refiner = OpticalFlowRefiner()
        self.occlusion_detector = OcclusionDetector()
        self.surface_completer = SurfaceCompleter()
        self.secondary = SecondaryMotionSolver()
        self.validator = FrameValidator()
        self.canonical = render_canonical_atlas()
        self._cache: Dict[str, SpriteState] = {"canonical": self.canonical}
        self.atlas = extract_atlas(self.canonical)

    def register_state(self, state: SpriteState):
        self._cache[state.name] = state
        return state

    def get_edge(self, a: str, b: str) -> Optional[TransitionEdge]:
        return TransitionEdge.load(self.edge_dir, f"{a}__{b}")

    def _ensure_edge(self, a: SpriteState, b: SpriteState, easing: str, duration: float) -> TransitionEdge:
        existing = self.get_edge(a.name, b.name)
        if existing:
            existing.easing = easing or existing.easing
            existing.duration = duration or existing.duration
            return existing
        return TransitionEdge(fromState=a.name, toState=b.name, duration=duration, easing=easing)

    def morph(
        self,
        stateA: SpriteState | str,
        stateB: SpriteState | str,
        frames: int = 8,
        learn: bool = True,
        easing: str = "smoothstep",
        duration: float = 1.0,
    ) -> List[np.ndarray]:
        a = self._resolve(stateA)
        b = self._resolve(stateB)

        match = self.pose_matcher.run(a, b)
        if not match["ok"]:
            raise ValueError(f"PoseMatcher rejected pair {a.name}->{b.name}: {match}")

        mapping = self.landmark_registrar.run(a, b, match["shared"])
        mesh_a = self.mesh_builder.run(a)
        verts_b = self.mesh_builder.corresponding(mesh_a, b.landmarks, b.image)
        # canonical verts in same topology
        verts_c = self.mesh_builder.corresponding(mesh_a, self.canonical.landmarks, self.canonical.image)

        field = self.motion_estimator.run(a, b, mesh_a, verts_b)
        field = self.flow_refiner.run(a.image, b.image, field)

        edge = self._ensure_edge(a, b, easing, duration)
        edge.landmarkMapping = mapping
        edge.motionField = {"flow_ab": field.flow_ab, "flow_ba": field.flow_ba}
        edge.jointTrajectories = self.joint_interpolator.trajectories(a, b, mapping)
        edge.deformationParameters = {
            "n_verts": int(len(mesh_a.vertices)),
            "n_faces": int(len(mesh_a.faces)),
        }

        n_inbetween = int(frames)
        ts = np.linspace(0, 1, n_inbetween + 2)  # includes endpoints
        generated = []
        residual_acc = None

        for raw_t in ts:
            t = apply_easing(float(raw_t), edge.easing)
            lm_t = self.joint_interpolator.run(a, b, t, mapping)
            lm_t = self.secondary.run(lm_t, a, b, t)
            verts_t = self.mesh_builder.corresponding(mesh_a, lm_t, a.image)
            # keep silhouette verts interpolating
            sil_mask = np.array([lab.startswith("sil_") for lab in mesh_a.vertex_labels])
            verts_t[sil_mask] = (1 - t) * mesh_a.vertices[sil_mask] + t * verts_b[sil_mask]

            # Canonical part textures driven by interpolated joints.
            # Hidden surfaces (torso stripe under the crossing arm) remain in the
            # torso layer and become visible as the arm layer moves off them.
            frame = reconstruct(self.atlas, lm_t, a.height, a.width)
            res = edge.learnedCorrections.get("residual")
            if isinstance(res, np.ndarray) and res.shape == frame.shape:
                frame = np.clip(frame + res * np.sin(np.pi * t) * 0.15, 0, 255)
            generated.append(frame.astype(np.float32))

        # force exact endpoints
        generated[0] = a.image.astype(np.float32)
        generated[-1] = b.image.astype(np.float32)

        uints = [np.clip(g, 0, 255).astype(np.uint8) for g in generated]
        report = self.validator.run(uints, a, b)

        # visibility summary stored on edge from mid frame
        mid = len(ts) // 2
        mid_t = apply_easing(float(ts[mid]), edge.easing)
        lm_mid = self.joint_interpolator.run(a, b, mid_t, mapping)
        verts_mid = self.mesh_builder.corresponding(mesh_a, lm_mid, a.image)
        vis_mid = self.occlusion_detector.run(a, b, verts_mid, mesh_a, verts_b)
        edge.visibilityMasks = {
            "disocclude_from_a": vis_mid.disocclude_from_a,
            "disocclude_from_b": vis_mid.disocclude_from_b,
        }
        edge.secondaryMotion = {"phase": 0.18, "names": ["hair", "skirt_l", "skirt_r"]}
        edge.qualityScore = report.score

        if learn:
            # residual = difference between naive blend and completed mid-frame
            naive = 0.5 * a.image.astype(np.float32) + 0.5 * b.image.astype(np.float32)
            mid_frame = generated[mid]
            residual = (mid_frame - naive).astype(np.float32)
            edge.learn_from(report.score, residual=residual * 0.15)

        edge.save(self.edge_dir)
        return uints

    def _resolve(self, state: SpriteState | str) -> SpriteState:
        if isinstance(state, SpriteState):
            self._cache[state.name] = state
            return state
        if state in self._cache:
            return self._cache[state]
        raise KeyError(f"Unknown state '{state}'. Register it first.")


def morph(stateA, stateB, frames=8, learn=True, **kw):
    engine = MorphEngine()
    return engine.morph(stateA, stateB, frames=frames, learn=learn, **kw)
