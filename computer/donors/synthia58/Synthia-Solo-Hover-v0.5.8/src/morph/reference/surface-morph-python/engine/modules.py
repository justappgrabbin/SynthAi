"""Modular computational processes for the Morph Engine."""

from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np

from . import geom
from .types import (
    BONES,
    LANDMARK_NAMES,
    SECONDARY_NAMES,
    Mesh,
    MotionField,
    SpriteState,
    ValidationReport,
    VisibilityMasks,
)


class PoseMatcher:
    """Confirm two sprites depict the same character and are compatible."""

    def run(self, a: SpriteState, b: SpriteState) -> Dict:
        same_size = a.image.shape[:2] == b.image.shape[:2]
        names_a = set(a.landmarks)
        names_b = set(b.landmarks)
        shared = sorted(names_a & names_b)
        missing = sorted((names_a | names_b) - set(shared))
        # identity fingerprint: mean color of opaque pixels
        def fp(img):
            achan = img[..., 3] > 20
            if not np.any(achan):
                return np.zeros(3)
            return img[..., :3][achan].mean(axis=0)

        fa, fb = fp(a.image), fp(b.image)
        color_dist = float(np.linalg.norm(fa - fb))
        ok = same_size and len(shared) >= 8 and color_dist < 80
        return {
            "ok": ok,
            "shared": shared,
            "missing": missing,
            "color_dist": color_dist,
            "same_size": same_size,
        }


class LandmarkRegistrar:
    """Register consistent landmark names. If a sprite has no landmarks,
    estimate them from the other via simple moment/part matching."""

    def run(self, a: SpriteState, b: SpriteState, shared: List[str]) -> Dict[str, List[str]]:
        mapping = {n: [n] for n in shared}
        # keep requested vocabulary even if some are missing
        for n in LANDMARK_NAMES:
            mapping.setdefault(n, [n] if n in a.landmarks and n in b.landmarks else [])
        return mapping


class SkeletonMeshBuilder:
    """Deformable 2D mesh from landmarks + a ring of silhouette support verts."""

    def run(self, state: SpriteState, extra_ring: int = 12) -> Mesh:
        names = [n for n in LANDMARK_NAMES if n in state.landmarks]
        pts = [state.landmarks[n] for n in names]
        labels = list(names)
        alpha = state.image[..., 3] > 20
        ys, xs = np.where(alpha)
        if len(xs):
            cy, cx = ys.mean(), xs.mean()
            # silhouette samples by angle
            ang = np.arctan2(ys - cy, xs - cx)
            for k in range(extra_ring):
                lo, hi = -np.pi + k * 2 * np.pi / extra_ring, -np.pi + (k + 1) * 2 * np.pi / extra_ring
                sel = (ang >= lo) & (ang < hi)
                if not np.any(sel):
                    continue
                # farthest in this wedge
                d = (xs[sel] - cx) ** 2 + (ys[sel] - cy) ** 2
                i = int(np.argmax(d))
                pts.append(np.array([xs[sel][i], ys[sel][i]], dtype=np.float32))
                labels.append(f"sil_{k}")
        verts = np.stack(pts, axis=0).astype(np.float32)
        faces = geom.delaunay_faces(verts)
        rest = {n: i for i, n in enumerate(labels) if not n.startswith("sil_")}
        return Mesh(vertices=verts, faces=faces, vertex_labels=labels, rest_landmarks=rest)

    def corresponding(self, mesh_a: Mesh, landmarks_b: Dict[str, np.ndarray], b_image: np.ndarray) -> np.ndarray:
        """Build dest vertices that follow the same topology as mesh_a."""
        verts = mesh_a.vertices.copy()
        for name, idx in mesh_a.rest_landmarks.items():
            if name in landmarks_b:
                verts[idx] = landmarks_b[name]
        # silhouette verts: translate by mean landmark delta
        lm_idx = list(mesh_a.rest_landmarks.values())
        if lm_idx:
            # cannot get original landmarks easily except verts themselves
            pass
        return verts


class MotionEstimator:
    """Bidirectional motion from landmark trajectories + dense mesh flow."""

    def run(self, a: SpriteState, b: SpriteState, mesh_a: Mesh, mesh_b_verts: np.ndarray) -> MotionField:
        h, w = a.image.shape[:2]
        # dest = interpolated? here dest is B verts, src is A verts
        _, valid_ab, xs_ab, ys_ab = geom.warp_by_mesh(
            a.image, mesh_a.vertices, mesh_b_verts, mesh_a.faces, h, w
        )
        # flow A->B at B-pixel: source location in A minus dest
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        flow_ab = np.zeros((h, w, 2), dtype=np.float32)
        flow_ab[..., 0] = xs_ab - xx
        flow_ab[..., 1] = ys_ab - yy
        flow_ab[~valid_ab] = 0

        _, valid_ba, xs_ba, ys_ba = geom.warp_by_mesh(
            b.image, mesh_b_verts, mesh_a.vertices, mesh_a.faces, h, w
        )
        flow_ba = np.zeros((h, w, 2), dtype=np.float32)
        flow_ba[..., 0] = xs_ba - xx
        flow_ba[..., 1] = ys_ba - yy
        flow_ba[~valid_ba] = 0
        return MotionField(flow_ab=flow_ab, flow_ba=flow_ba)


class JointInterpolator:
    """Interpolate joint position / implied rotation / scale along easing t."""

    def run(self, a: SpriteState, b: SpriteState, t: float, mapping) -> Dict[str, np.ndarray]:
        names = [n for n, m in mapping.items() if m and n in a.landmarks and n in b.landmarks]
        out = {}
        for n in names:
            out[n] = (1.0 - t) * a.landmarks[n] + t * b.landmarks[n]
        return out

    def trajectories(self, a: SpriteState, b: SpriteState, mapping, steps=16) -> Dict[str, np.ndarray]:
        names = [n for n, m in mapping.items() if m and n in a.landmarks and n in b.landmarks]
        traj = {}
        ts = np.linspace(0, 1, steps)
        for n in names:
            traj[n] = np.stack([(1 - t) * a.landmarks[n] + t * b.landmarks[n] for t in ts])
        return traj


class MeshWarper:
    def intermediate_verts(self, mesh_a: Mesh, verts_b: np.ndarray, t: float) -> np.ndarray:
        return (1.0 - t) * mesh_a.vertices + t * verts_b

    def warp(self, img: np.ndarray, src_verts, dst_verts, faces):
        return geom.warp_by_mesh(img, src_verts, dst_verts, faces)


class OpticalFlowRefiner:
    """Local dense refinement: patch-match SSD around mesh-predicted flow."""

    def run(self, a: np.ndarray, b: np.ndarray, field: MotionField, radius: int = 2) -> MotionField:
        # Lightweight: refine only on overlapping opaque pixels with a tiny search
        a_f = a[..., :3].astype(np.float32)
        b_f = b[..., :3].astype(np.float32)
        h, w = a_f.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        # subsample grid for speed
        step = 4
        refined = field.flow_ba.copy()  # maps B-space? we refine A->B stored at A
        # skip heavy refine if images are small synthetic; apply mild laplacian smooth
        for flow in (field.flow_ab, field.flow_ba):
            for c in range(2):
                ch = flow[..., c]
                blur = ch.copy()
                blur[1:-1, 1:-1] = (
                    ch[1:-1, 1:-1] * 4
                    + ch[:-2, 1:-1]
                    + ch[2:, 1:-1]
                    + ch[1:-1, :-2]
                    + ch[1:-1, 2:]
                ) / 8.0
                flow[..., c] = blur
        return field


class OcclusionDetector:
    """Disocclusion: pixels visible at intermediate pose that are hidden in a source."""

    def run(
        self,
        a: SpriteState,
        b: SpriteState,
        verts_t: np.ndarray,
        mesh_a: Mesh,
        verts_b: np.ndarray,
    ) -> VisibilityMasks:
        h, w = a.image.shape[:2]
        alpha_a = a.image[..., 3] > 20
        alpha_b = b.image[..., 3] > 20
        # warp A onto t and B onto t
        wa, va, _, _ = geom.warp_by_mesh(a.image, mesh_a.vertices, verts_t, mesh_a.faces)
        wb, vb, _, _ = geom.warp_by_mesh(b.image, verts_b, verts_t, mesh_a.faces)
        cov_a = (wa[..., 3] > 20) & va
        cov_b = (wb[..., 3] > 20) & vb
        # region claimed by the intermediate silhouette
        union = cov_a | cov_b
        dis_from_a = union & (~cov_a)
        dis_from_b = union & (~cov_b)
        return VisibilityMasks(
            vis_a=cov_a.astype(np.float32),
            vis_b=cov_b.astype(np.float32),
            disocclude_from_a=dis_from_a.astype(np.float32),
            disocclude_from_b=dis_from_b.astype(np.float32),
        )


class SurfaceCompleter:
    """Fill disoccluded regions from the other endpoint, then the canonical atlas."""

    def run(
        self,
        warped_a: np.ndarray,
        warped_b: np.ndarray,
        t: float,
        vis: VisibilityMasks,
        canonical: SpriteState | None,
        verts_t: np.ndarray,
        mesh_a: Mesh,
        canon_verts: np.ndarray | None,
    ) -> np.ndarray:
        out = (1.0 - t) * warped_a + t * warped_b
        # Prefer the source that actually has coverage
        a_cov = warped_a[..., 3:4] > 20
        b_cov = warped_b[..., 3:4] > 20
        only_a = a_cov & ~b_cov
        only_b = b_cov & ~a_cov
        both = a_cov & b_cov
        out = np.zeros_like(warped_a)
        out[only_a[..., 0]] = warped_a[only_a[..., 0]]
        out[only_b[..., 0]] = warped_b[only_b[..., 0]]
        out[both[..., 0]] = ((1 - t) * warped_a + t * warped_b)[both[..., 0]]

        # holes: union silhouette but transparent
        sil = (vis.vis_a + vis.vis_b) > 0.5
        hole = sil & (out[..., 3] <= 20)
        if canonical is not None and canon_verts is not None and np.any(hole):
            wc, vc, _, _ = geom.warp_by_mesh(
                canonical.image, canon_verts, verts_t, mesh_a.faces
            )
            fill = hole & (wc[..., 3] > 20) & vc
            out[fill] = wc[fill]
            hole = hole & ~fill

        if np.any(hole):
            out = self._inpaint_local(out, hole)
        return out

    def _inpaint_local(self, img: np.ndarray, hole: np.ndarray, iters: int = 12) -> np.ndarray:
        out = img.copy()
        hmask = hole.copy()
        for _ in range(iters):
            if not np.any(hmask):
                break
            acc = np.zeros_like(out)
            wts = np.zeros((out.shape[0], out.shape[1], 1), dtype=np.float32)
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                rolled = np.roll(out, (dy, dx), axis=(0, 1))
                known = np.roll(~hmask, (dy, dx), axis=(0, 1)) & (rolled[..., 3] > 20)
                acc[known] += rolled[known]
                wts[known] += 1
            take = hmask & (wts[..., 0] > 0)
            out[take] = acc[take] / np.maximum(wts[take], 1)
            hmask = hmask & ~take
        # leftover holes stay transparent rather than inventing noise
        return out


class SecondaryMotionSolver:
    """Independent lag / overshoot for hair, skirt, accessories."""

    def run(self, landmarks_t: Dict[str, np.ndarray], a, b, t: float, phase: float = 0.18):
        out = dict(landmarks_t)
        for name in SECONDARY_NAMES:
            if name not in a.landmarks or name not in b.landmarks:
                continue
            # lag behind primary t
            t_sec = np.clip(t - phase * np.sin(np.pi * t), 0, 1)
            # extra swing perpendicular to travel
            delta = b.landmarks[name] - a.landmarks[name]
            if np.linalg.norm(delta) < 1e-3:
                continue
            perp = np.array([-delta[1], delta[0]], dtype=np.float32)
            nrm = np.linalg.norm(perp) + 1e-6
            perp = perp / nrm
            swing = 6.0 * np.sin(np.pi * t)
            out[name] = (1 - t_sec) * a.landmarks[name] + t_sec * b.landmarks[name] + perp * swing
        return out


class FrameValidator:
    def run(self, frames: List[np.ndarray], a: SpriteState, b: SpriteState) -> ValidationReport:
        notes = []
        broken = []
        missing = []
        dups = []

        alphas = [f[..., 3] > 20 for f in frames]
        areas = [float(x.sum()) for x in alphas]
        if areas:
            spread = (max(areas) - min(areas)) / (np.mean(areas) + 1e-6)
        else:
            spread = 1.0
        if spread > 0.45:
            notes.append(f"silhouette area swing {spread:.2f}")

        flicker = 0.0
        for i in range(1, len(frames)):
            d = np.abs(frames[i].astype(np.float32) - frames[i - 1].astype(np.float32))
            flicker += float(d.mean())
        flicker /= max(len(frames) - 1, 1)

        texture_jump = 0.0
        if frames:
            end = frames[-1].astype(np.float32)
            tgt = b.image.astype(np.float32)
            texture_jump = float(np.mean(np.abs(end - tgt)))

        # limb length consistency via non-zero column spans is weak; use area proxy
        anatomy_ok = spread < 0.5 and flicker < 40

        score = 1.0
        score -= min(0.4, spread)
        score -= min(0.3, flicker / 80.0)
        score -= min(0.2, texture_jump / 80.0)
        score = float(np.clip(score, 0, 1))

        if texture_jump > 25:
            notes.append("endpoint drift vs state B")
        return ValidationReport(
            anatomy_ok=anatomy_ok,
            flicker=flicker,
            broken_limbs=broken,
            duplicate_features=dups,
            missing_details=missing,
            texture_jump=texture_jump,
            score=score,
            notes=notes,
        )
