"""Part-texture atlas: canonical surfaces for disocclusion reconstruction.

Each bone is a 2-point similarity so a bending knee/elbow does not shear a
whole-limb bounding box.
"""

from __future__ import annotations

from typing import Dict, Tuple

import numpy as np

from .character import COLORS
from .geom import sample_bilinear
from .types import SpriteState

# (name, landmark0, landmark1, capsule_radius)
BONES: Tuple[Tuple[str, str, str, int], ...] = (
    ("hair", "hair", "head", 22),
    ("head", "head", "neck", 22),
    ("torso", "neck", "waist", 30),
    ("skirt_a", "waist", "skirt_l", 18),
    ("skirt_b", "waist", "skirt_r", 18),
    ("uarm_l", "shoulder_l", "elbow_l", 11),
    ("farm_l", "elbow_l", "wrist_l", 11),
    ("uarm_r", "shoulder_r", "elbow_r", 11),
    ("farm_r", "elbow_r", "wrist_r", 11),
    ("thigh_l", "hip_l", "knee_l", 12),
    ("shin_l", "knee_l", "ankle_l", 12),
    ("thigh_r", "hip_r", "knee_r", 12),
    ("shin_r", "knee_r", "ankle_r", 12),
)

DRAW_ORDER = [
    "thigh_l",
    "thigh_r",
    "shin_l",
    "shin_r",
    "skirt_a",
    "skirt_b",
    "uarm_l",
    "farm_l",
    "torso",
    "hair",
    "head",
    "uarm_r",
    "farm_r",
]


def _capsule(h: int, w: int, p0: np.ndarray, p1: np.ndarray, radius: float) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = p1 - p0
    L2 = float(v @ v) + 1e-6
    t = np.clip(((xx - p0[0]) * v[0] + (yy - p0[1]) * v[1]) / L2, 0.0, 1.0)
    px = p0[0] + t * v[0]
    py = p0[1] + t * v[1]
    return (xx - px) ** 2 + (yy - py) ** 2 <= radius * radius


def extract_atlas(state: SpriteState) -> Dict[str, dict]:
    img = state.image.astype(np.float32)
    h, w = img.shape[:2]
    alpha = state.image[..., 3] > 20
    atlas: Dict[str, dict] = {}

    rgb = state.image[..., :3].astype(np.int16)
    color_ok = {}
    for key, rgba in COLORS.items():
        color_ok[key] = (np.abs(rgb - np.array(rgba[:3], np.int16)).sum(-1) <= 26) & alpha

    for name, a0, a1, rad in BONES:
        if a0 not in state.landmarks or a1 not in state.landmarks:
            continue
        p0 = state.landmarks[a0].astype(np.float32)
        p1 = state.landmarks[a1].astype(np.float32)
        cap = _capsule(h, w, p0, p1, rad)

        if name == "torso":
            mask = cap & (color_ok["torso"] | color_ok["stripe"] | color_ok["joint_core"] | color_ok["neck"])
            # keep chest even if capsule misses corners
            mask |= color_ok["torso"] | color_ok["stripe"]
        elif name == "head":
            mask = color_ok["head"] | color_ok["eye"]
        elif name == "hair":
            mask = color_ok["hair"]
        elif name.startswith("skirt"):
            mask = cap & color_ok["skirt"]
        else:
            mask = cap & alpha

        ys, xs = np.where(mask)
        if len(xs) == 0:
            continue
        pad = 3
        y0, y1 = max(int(ys.min()) - pad, 0), min(int(ys.max()) + pad + 1, h)
        x0, x1 = max(int(xs.min()) - pad, 0), min(int(xs.max()) + pad + 1, w)
        tex = img[y0:y1, x0:x1].copy()
        tex[~mask[y0:y1, x0:x1]] = 0
        src = np.stack([p0, p1]) - np.array([x0, y0], dtype=np.float32)
        atlas[name] = {"tex": tex, "src": src, "anchor_names": (a0, a1)}
    return atlas


def _similarity(src: np.ndarray, dst: np.ndarray) -> np.ndarray:
    s0, s1 = src[0], src[1]
    d0, d1 = dst[0], dst[1]
    vs = s1 - s0
    vd = d1 - d0
    ls = float(vs @ vs) + 1e-6
    sc = float(vd @ vs) / ls
    ss = float(vs[0] * vd[1] - vs[1] * vd[0]) / ls
    R = np.array([[sc, -ss], [ss, sc]], dtype=np.float32)
    t = d0 - R @ s0
    return np.array([[R[0, 0], R[0, 1], t[0]], [R[1, 0], R[1, 1], t[1]]], dtype=np.float32)


def warp_part(tex: np.ndarray, M: np.ndarray, out_h: int, out_w: int) -> np.ndarray:
    M3 = np.vstack([M, [0.0, 0.0, 1.0]]).astype(np.float32)
    try:
        Minv = np.linalg.inv(M3)
    except np.linalg.LinAlgError:
        return np.zeros((out_h, out_w, tex.shape[2]), dtype=np.float32)
    yy, xx = np.mgrid[0:out_h, 0:out_w].astype(np.float32)
    xt = Minv[0, 0] * xx + Minv[0, 1] * yy + Minv[0, 2]
    yt = Minv[1, 0] * xx + Minv[1, 1] * yy + Minv[1, 2]
    return sample_bilinear(tex, xt, yt)


def reconstruct(atlas: Dict[str, dict], landmarks_t: Dict[str, np.ndarray], h: int, w: int) -> np.ndarray:
    canvas = np.zeros((h, w, 4), dtype=np.float32)
    for name in DRAW_ORDER:
        part = atlas.get(name)
        if part is None:
            continue
        a0, a1 = part["anchor_names"]
        if a0 not in landmarks_t or a1 not in landmarks_t:
            continue
        dst = np.stack([landmarks_t[a0], landmarks_t[a1]]).astype(np.float32)
        M = _similarity(part["src"], dst)
        layer = warp_part(part["tex"], M, h, w)
        a = np.clip(layer[..., 3:4] / 255.0, 0.0, 1.0)
        canvas = canvas * (1.0 - a) + layer * a
    np.clip(canvas, 0, 255, out=canvas)
    return canvas
