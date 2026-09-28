"""Synthetic articulated character used as a known-ground-truth sprite source.

The character is built from rigid-ish parts so landmarks, occlusion, and
hidden-surface reconstruction can be demonstrated without a trained detector.
"""

from __future__ import annotations

from typing import Dict, Tuple

import numpy as np
from PIL import Image, ImageDraw

from .types import LANDMARK_NAMES, SpriteState

W, H = 256, 320

# Canonical rest pose landmark positions (pixels)
CANONICAL = {
    "head": (128, 42),
    "hair": (128, 22),
    "neck": (128, 62),
    "shoulder_l": (98, 78),
    "shoulder_r": (158, 78),
    "elbow_l": (78, 118),
    "elbow_r": (178, 118),
    "wrist_l": (68, 158),
    "wrist_r": (188, 158),
    "torso": (128, 118),
    "joint_core": (128, 108),
    "waist": (128, 158),
    "hip_l": (110, 168),
    "hip_r": (146, 168),
    "knee_l": (108, 218),
    "knee_r": (148, 218),
    "ankle_l": (106, 268),
    "ankle_r": (150, 268),
    "skirt_l": (96, 188),
    "skirt_r": (160, 188),
}

# Palette — distinct so identity/texture consistency is visible
COLORS = {
    "head": (232, 196, 164, 255),
    "hair": (48, 28, 78, 255),
    "neck": (210, 170, 140, 255),
    "torso": (70, 110, 170, 255),
    "joint_core": (220, 190, 70, 255),
    "arm_l": (90, 150, 200, 255),
    "arm_r": (90, 150, 200, 255),
    "fore_l": (70, 130, 185, 255),
    "fore_r": (70, 130, 185, 255),
    "hand_l": (232, 196, 164, 255),
    "hand_r": (232, 196, 164, 255),
    "pelvis": (55, 90, 145, 255),
    "leg_l": (80, 95, 130, 255),
    "leg_r": (80, 95, 130, 255),
    "boot_l": (36, 36, 48, 255),
    "boot_r": (36, 36, 48, 255),
    "skirt": (160, 70, 120, 255),
    "eye": (30, 30, 40, 255),
    "stripe": (240, 230, 210, 255),
}


def _offset(canon: Dict[str, Tuple[float, float]], deltas: Dict[str, Tuple[float, float]]):
    out = {k: np.array(v, dtype=np.float32) for k, v in canon.items()}
    for k, d in deltas.items():
        out[k] = out[k] + np.array(d, dtype=np.float32)
    return out


def pose_idle() -> Dict[str, np.ndarray]:
    return _offset(CANONICAL, {})


def pose_reach() -> Dict[str, np.ndarray]:
    """Distant pose: right arm crosses the torso (occludes chest), left arm raised,
    hips shift, hair and skirt swing."""
    return _offset(
        CANONICAL,
        {
            "shoulder_r": (-6, 4),
            "elbow_r": (-52, -8),
            "wrist_r": (-78, 18),
            "shoulder_l": (4, -10),
            "elbow_l": (-8, -48),
            "wrist_l": (10, -88),
            "hair": (16, 4),
            "head": (4, 2),
            "neck": (2, 2),
            "torso": (-4, 2),
            "joint_core": (-4, 2),
            "waist": (-6, 2),
            "hip_l": (-10, 4),
            "hip_r": (-4, 2),
            "knee_l": (-14, 0),
            "knee_r": (8, -6),
            "ankle_l": (-16, 0),
            "ankle_r": (14, -4),
            "skirt_l": (-22, 8),
            "skirt_r": (8, 10),
        },
    )


def _draw_limb(draw, a, b, width, color):
    draw.line([tuple(a), tuple(b)], fill=color, width=width)
    r = width // 2
    for p in (a, b):
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


def _disk(draw, p, r, color):
    draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


def render_character(landmarks: Dict[str, np.ndarray], name: str) -> SpriteState:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    L = {k: (float(v[0]), float(v[1])) for k, v in landmarks.items()}

    # Draw order back-to-front. Right arm last so it occludes torso in pose_reach.
    # Skirt
    skirt_pts = [
        L["hip_l"],
        L["skirt_l"],
        ((L["skirt_l"][0] + L["skirt_r"][0]) / 2, L["skirt_l"][1] + 18),
        L["skirt_r"],
        L["hip_r"],
        L["waist"],
    ]
    draw.polygon(skirt_pts, fill=COLORS["skirt"])

    # Legs
    _draw_limb(draw, L["hip_l"], L["knee_l"], 16, COLORS["leg_l"])
    _draw_limb(draw, L["knee_l"], L["ankle_l"], 14, COLORS["leg_l"])
    _draw_limb(draw, L["hip_r"], L["knee_r"], 16, COLORS["leg_r"])
    _draw_limb(draw, L["knee_r"], L["ankle_r"], 14, COLORS["leg_r"])
    _disk(draw, L["ankle_l"], 11, COLORS["boot_l"])
    _disk(draw, L["ankle_r"], 11, COLORS["boot_r"])

    # Left arm (behind torso-ish)
    _draw_limb(draw, L["shoulder_l"], L["elbow_l"], 14, COLORS["arm_l"])
    _draw_limb(draw, L["elbow_l"], L["wrist_l"], 12, COLORS["fore_l"])
    _disk(draw, L["wrist_l"], 8, COLORS["hand_l"])

    # Pelvis + torso
    hx = 28
    hy = 22
    waist = L["waist"]
    torso = L["torso"]
    neck = L["neck"]
    draw.polygon(
        [
            (torso[0] - hx, neck[1] + 8),
            (torso[0] + hx, neck[1] + 8),
            (waist[0] + hx - 4, waist[1]),
            (waist[0] - hx + 4, waist[1]),
        ],
        fill=COLORS["torso"],
    )
    # chest stripe — unique texture identity
    draw.rectangle(
        [torso[0] - 18, torso[1] - 10, torso[0] + 18, torso[1] + 6],
        fill=COLORS["stripe"],
    )
    draw.rectangle(
        [torso[0] - 18, torso[1] + 10, torso[0] + 18, torso[1] + 16],
        fill=COLORS["stripe"],
    )
    _disk(draw, L["joint_core"], 7, COLORS["joint_core"])
    _disk(draw, L["waist"], 6, COLORS["joint_core"])

    # Head / hair / neck
    _draw_limb(draw, L["neck"], L["head"], 12, COLORS["neck"])
    _disk(draw, L["hair"], 18, COLORS["hair"])
    # extra hair tuft
    draw.polygon(
        [
            (L["hair"][0] - 16, L["hair"][1]),
            (L["hair"][0] - 28, L["hair"][1] - 10),
            (L["hair"][0] - 6, L["hair"][1] - 8),
        ],
        fill=COLORS["hair"],
    )
    _disk(draw, L["head"], 20, COLORS["head"])
    # face marks
    _disk(draw, (L["head"][0] - 7, L["head"][1] - 2), 3, COLORS["eye"])
    _disk(draw, (L["head"][0] + 7, L["head"][1] - 2), 3, COLORS["eye"])

    # Shoulders as mechanical joints
    _disk(draw, L["shoulder_l"], 8, COLORS["joint_core"])
    _disk(draw, L["shoulder_r"], 8, COLORS["joint_core"])

    # Right arm ON TOP — this is the occluder in pose_reach
    _draw_limb(draw, L["shoulder_r"], L["elbow_r"], 14, COLORS["arm_r"])
    _draw_limb(draw, L["elbow_r"], L["wrist_r"], 12, COLORS["fore_r"])
    _disk(draw, L["wrist_r"], 8, COLORS["hand_r"])
    _disk(draw, L["elbow_r"], 6, COLORS["joint_core"])

    arr = np.array(img)
    # Part masks via color proximity (good enough for synthetic)
    part_masks = _extract_part_masks(arr)
    return SpriteState(
        name=name,
        image=arr,
        landmarks={k: np.array(v, dtype=np.float32) for k, v in L.items()},
        part_masks=part_masks,
        part_order=list(part_masks.keys()),
        meta={"canonical": False, "size": (W, H)},
    )


def _extract_part_masks(arr: np.ndarray) -> Dict[str, np.ndarray]:
    rgb = arr[..., :3].astype(np.int16)
    a = arr[..., 3] > 0
    masks = {}

    def near(color, tol=18):
        c = np.array(color[:3], dtype=np.int16)
        d = np.abs(rgb - c).sum(axis=-1)
        return (d <= tol) & a

    masks["hair"] = near(COLORS["hair"])
    masks["head"] = near(COLORS["head"])
    masks["torso"] = near(COLORS["torso"]) | near(COLORS["stripe"])
    masks["skirt"] = near(COLORS["skirt"])
    masks["arm"] = near(COLORS["arm_l"]) | near(COLORS["fore_l"])
    masks["core"] = near(COLORS["joint_core"])
    masks["legs"] = near(COLORS["leg_l"]) | near(COLORS["boot_l"])
    return {k: v.astype(np.uint8) for k, v in masks.items()}


def render_canonical_atlas() -> SpriteState:
    """Front-facing rest sprite used as the preferred completion source."""
    st = render_character(pose_idle(), "canonical")
    st.meta["canonical"] = True
    return st


def save_sprite(state: SpriteState, path: str):
    Image.fromarray(state.image).save(path)
