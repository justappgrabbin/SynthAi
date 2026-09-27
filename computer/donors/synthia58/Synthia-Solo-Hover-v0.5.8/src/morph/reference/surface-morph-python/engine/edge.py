"""Persistent trainable transition-edge objects."""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np


def _arr(x):
    if isinstance(x, np.ndarray):
        return {"__nd__": True, "shape": list(x.shape), "dtype": str(x.dtype), "data": x.tolist()}
    return x


def _load_arr(x):
    if isinstance(x, dict) and x.get("__nd__"):
        return np.array(x["data"], dtype=x["dtype"]).reshape(x["shape"])
    return x


@dataclass
class TransitionEdge:
    fromState: str
    toState: str
    duration: float = 1.0
    easing: str = "smoothstep"
    landmarkMapping: Dict[str, List[str]] = field(default_factory=dict)
    motionField: Dict[str, Any] = field(default_factory=dict)
    jointTrajectories: Dict[str, Any] = field(default_factory=dict)
    deformationParameters: Dict[str, Any] = field(default_factory=dict)
    visibilityMasks: Dict[str, Any] = field(default_factory=dict)
    secondaryMotion: Dict[str, Any] = field(default_factory=dict)
    learnedCorrections: Dict[str, Any] = field(default_factory=dict)
    qualityScore: float = 0.0
    observations: int = 0
    updated_at: float = field(default_factory=time.time)

    @property
    def key(self) -> str:
        return f"{self.fromState}__{self.toState}"

    def to_jsonable(self) -> Dict:
        def meta(v):
            if isinstance(v, np.ndarray):
                return {"shape": list(v.shape), "dtype": str(v.dtype), "stored": "npz"}
            return v

        return {
            "fromState": self.fromState,
            "toState": self.toState,
            "duration": self.duration,
            "easing": self.easing,
            "landmarkMapping": self.landmarkMapping,
            "motionField": {k: meta(v) for k, v in self.motionField.items()},
            "jointTrajectories": {k: _arr(v) for k, v in self.jointTrajectories.items()},
            "deformationParameters": self.deformationParameters,
            "visibilityMasks": {k: meta(v) for k, v in self.visibilityMasks.items()},
            "secondaryMotion": self.secondaryMotion,
            "learnedCorrections": {k: meta(v) for k, v in self.learnedCorrections.items()},
            "qualityScore": self.qualityScore,
            "observations": self.observations,
            "updated_at": self.updated_at,
        }

    def save(self, folder: Path):
        folder = Path(folder)
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{self.key}.json"
        with open(path, "w") as f:
            json.dump(self.to_jsonable(), f, indent=2)
        # heavy arrays separately
        npz = folder / f"{self.key}.npz"
        payload = {}
        for name, blob in (("motionField", self.motionField), ("visibilityMasks", self.visibilityMasks)):
            for k, v in blob.items():
                if isinstance(v, np.ndarray):
                    payload[f"{name}__{k}"] = v
        r = self.learnedCorrections.get("residual")
        if isinstance(r, np.ndarray):
            payload["residual"] = r
        if payload:
            np.savez_compressed(npz, **payload)
        return path

    @classmethod
    def load(cls, folder: Path, key: str) -> Optional["TransitionEdge"]:
        folder = Path(folder)
        path = folder / f"{key}.json"
        if not path.exists():
            return None
        with open(path) as f:
            raw = json.load(f)
        edge = cls(
            fromState=raw["fromState"],
            toState=raw["toState"],
            duration=raw.get("duration", 1.0),
            easing=raw.get("easing", "smoothstep"),
            landmarkMapping=raw.get("landmarkMapping") or {},
            motionField={},
            jointTrajectories=raw.get("jointTrajectories") or {},
            deformationParameters=raw.get("deformationParameters") or {},
            visibilityMasks={},
            secondaryMotion=raw.get("secondaryMotion") or {},
            learnedCorrections=raw.get("learnedCorrections") or {},
            qualityScore=raw.get("qualityScore", 0.0),
            observations=raw.get("observations", 0),
            updated_at=raw.get("updated_at", time.time()),
        )
        npz = folder / f"{key}.npz"
        if npz.exists():
            data = np.load(npz, allow_pickle=False)
            for k in data.files:
                if k.startswith("motionField__"):
                    edge.motionField[k.split("__", 1)[1]] = data[k]
                elif k.startswith("visibilityMasks__"):
                    edge.visibilityMasks[k.split("__", 1)[1]] = data[k]
                elif k == "residual":
                    edge.learnedCorrections["residual"] = data[k]
        return edge

    def learn_from(self, report_score: float, residual: Optional[np.ndarray] = None, rate: float = 0.25):
        """Adaptive update: blend quality and optional residual correction field."""
        self.observations += 1
        self.qualityScore = (1 - rate) * self.qualityScore + rate * float(report_score)
        if residual is not None:
            prev = self.learnedCorrections.get("residual")
            if prev is None or prev.shape != residual.shape:
                self.learnedCorrections["residual"] = residual.astype(np.float32)
            else:
                self.learnedCorrections["residual"] = ((1 - rate) * prev + rate * residual).astype(np.float32)
            self.learnedCorrections["residual_norm"] = float(np.mean(np.abs(self.learnedCorrections["residual"])))
        self.updated_at = time.time()
