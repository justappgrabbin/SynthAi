"""Shared types for the Morph Engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

LANDMARK_NAMES = [
    "head",
    "neck",
    "shoulder_l",
    "shoulder_r",
    "elbow_l",
    "elbow_r",
    "wrist_l",
    "wrist_r",
    "torso",
    "waist",
    "hip_l",
    "hip_r",
    "knee_l",
    "knee_r",
    "ankle_l",
    "ankle_r",
    "hair",
    "skirt_l",
    "skirt_r",
    "joint_core",
]

SECONDARY_NAMES = {"hair", "skirt_l", "skirt_r"}

BONES = [
    ("head", "neck"),
    ("neck", "shoulder_l"),
    ("neck", "shoulder_r"),
    ("shoulder_l", "elbow_l"),
    ("elbow_l", "wrist_l"),
    ("shoulder_r", "elbow_r"),
    ("elbow_r", "wrist_r"),
    ("neck", "torso"),
    ("torso", "waist"),
    ("waist", "hip_l"),
    ("waist", "hip_r"),
    ("hip_l", "knee_l"),
    ("knee_l", "ankle_l"),
    ("hip_r", "knee_r"),
    ("knee_r", "ankle_r"),
    ("head", "hair"),
    ("waist", "skirt_l"),
    ("waist", "skirt_r"),
    ("torso", "joint_core"),
]


@dataclass
class SpriteState:
    name: str
    image: np.ndarray  # HxWx4 uint8 RGBA
    landmarks: Dict[str, np.ndarray]  # name -> (x, y) float
    part_masks: Dict[str, np.ndarray] = field(default_factory=dict)
    part_order: List[str] = field(default_factory=list)
    meta: Dict = field(default_factory=dict)

    @property
    def height(self) -> int:
        return self.image.shape[0]

    @property
    def width(self) -> int:
        return self.image.shape[1]


@dataclass
class Mesh:
    vertices: np.ndarray  # Nx2
    faces: np.ndarray  # Mx3
    vertex_labels: List[str]
    rest_landmarks: Dict[str, int]


@dataclass
class MotionField:
    flow_ab: np.ndarray  # HxWx2  A -> B
    flow_ba: np.ndarray  # HxWx2  B -> A


@dataclass
class VisibilityMasks:
    vis_a: np.ndarray  # HxW float 0-1 visible in A
    vis_b: np.ndarray
    disocclude_from_a: np.ndarray  # visible at t but missing in A
    disocclude_from_b: np.ndarray


@dataclass
class ValidationReport:
    anatomy_ok: bool
    flicker: float
    broken_limbs: List[str]
    duplicate_features: List[str]
    missing_details: List[str]
    texture_jump: float
    score: float
    notes: List[str] = field(default_factory=list)
