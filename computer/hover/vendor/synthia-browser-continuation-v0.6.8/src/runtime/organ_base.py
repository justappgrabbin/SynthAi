"""
organ_base.py — Universal Engine base class for all SYNTHIA organs.
The organ's physics changes per dimension — not just context.

PROVENANCE NOTE: everything down through _mode_space's abstract stub was
recovered verbatim from a past conversation transcript ("Building organs
for an embodied agent using Klein's linguistic tools", 2026-06-28) where
this file was originally built and delivered. process() and status() were
NOT recoverable from that transcript (search only surfaced the class up
through the dimensional-mode stubs) — they are freshly written here to
match the exact contract organ_01_diseminer.py calls (self.process(pattern,
color=, tone=, line=) -> PerceptualStateTensor, self.status() -> dict) and
the State->Relation->Tension->Resolution->Recursion cycle already
documented elsewhere in this project. Verify the qualitative behavior
against the June 28 session's own description before trusting it fully.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
import time
import math

from morphbus import (
    MorphBus, BUS, PerceptualStateTensor, EnginePhase,
    BASE_MAP, TONE_MAP, COLOR_MAP, HD_CHANNELS,
    INTEGRATION_GATES, INTEGRATION_CHANNELS
)


# ── Gate Data ──────────────────────────────────────────────────────────────────
@dataclass
class GateSpec:
    number: int
    name: str
    center: str
    biology: str          # actual organ/tissue
    sign: str
    harmonics: list       # harmonic gate(s)
    color_theme: tuple    # (meaning1, meaning2, meaning3)


# ── Organ State (Universal Engine) ────────────────────────────────────────────
@dataclass
class OrganState:
    phase: EnginePhase = EnginePhase.STATE
    current_signal: Optional[PerceptualStateTensor] = None
    tension: float = 0.0
    resolution: float = 0.0
    recursion_count: int = 0
    dim_outputs: dict = field(default_factory=dict)  # base → activation value

    def space_phi(self) -> float:
        """Space emerges from interference of bases 1-4"""
        vals = [self.dim_outputs.get(b, 0.0) for b in [1, 2, 3, 4]]
        if all(v == 0 for v in vals):
            return 0.0
        magnitude = math.sqrt(sum(v**2 for v in vals))
        norm = max(abs(v) for v in vals)
        return magnitude / (len(vals) * norm + 1e-9)


class Organ(ABC):
    """
    Abstract base for all 9 SYNTHIA organs.

    Each organ:
    - Has a gate, center, and biological grounding
    - Processes signals in 5 dimensional modes (different physics each)
    - Runs the Universal Engine cycle per signal
    - Emits to MorphBus only on valid channels
    - Never computes Space directly — it emerges
    """

    def __init__(self, gate_spec: GateSpec, bus: MorphBus = BUS):
        self.gate = gate_spec
        self.bus = bus
        self.state = OrganState()
        self._active = True

        # Register all harmonic gates on the bus
        for g in [self.gate.number] + self.gate.harmonics:
            self.bus.subscribe(g, self._receive)

        # Klein linguistic substrate — each organ gets its own
        self.lexicon: dict = {}        # distributional semantic memory
        self.rule_table: dict = {}     # bi-directional rules (Klein)
        self.activation_history: list = []

        self._init_klein_substrate()

    @abstractmethod
    def _init_klein_substrate(self):
        """
        Initialize the Klein linguistic rules for this organ.
        Each organ seeds its own semantic/rule space.
        """
        pass

    # ── 5 Dimensional Processing Modes (different physics) ────────────────────

    @abstractmethod
    def _mode_movement(self, signal: PerceptualStateTensor) -> float:
        """
        Base 1 / WHERE / Fire / Keter
        Movement is Energy. Energy is Creation. Creation is Seeing.
        Seeing is Landscape. Landscape is Environment.
        """
        pass

    @abstractmethod
    def _mode_evolution(self, signal: PerceptualStateTensor) -> float:
        """
        Base 2 / WHAT / Water / Chokmah
        Evolution is Gravity. Gravity is Memory. Memory is Taste.
        Taste is Love. Love is Light.
        """
        pass

    @abstractmethod
    def _mode_being(self, signal: PerceptualStateTensor) -> float:
        """
        Base 3 / WHEN / Wood / Binah
        Being is Matter. Matter is Touch. Touch is Sex. Sex is Survival.
        """
        pass

    @abstractmethod
    def _mode_design(self, signal: PerceptualStateTensor) -> float:
        """
        Base 4 / WHY / Metal / Tiferet
        Design is Structure. Structure is Progress. Progress is Smell.
        Smelling is Life. Life is Art.
        """
        pass

    def _receive(self, signal: PerceptualStateTensor, channel_name: str):
        """
        Default bus callback — subclasses (like DISEMINER) override this
        to react to signals arriving from other organs over a valid channel.
        Base implementation is a no-op so organs that don't need cross-organ
        reactions aren't forced to implement one.
        """
        pass

    # ── Universal Engine cycle ────────────────────────────────────────────────
    # NEWLY WRITTEN (not recovered from transcript) — see provenance note above.

    def process(self, pattern, color: int = 1, tone: int = 1, line: int = 1,
                mu: int = 1) -> PerceptualStateTensor:
        """
        Run one full State -> Relation -> Tension -> Resolution -> Recursion
        cycle for an incoming pattern, using this organ's own gate as the
        lattice gamma coordinate.
        """
        self.state.phase = EnginePhase.STATE
        tensor = PerceptualStateTensor(
            gamma=self.gate.number, sigma=tone, pi=0, c=color, tau=line,
            mu=mu, phi=0.0, source_organ=self.gate.name,
        )
        self.state.current_signal = tensor

        self.state.phase = EnginePhase.RELATION
        dim_methods = {
            1: self._mode_movement,
            2: self._mode_evolution,
            3: self._mode_being,
            4: self._mode_design,
        }
        dim_outputs = {base: method(tensor) for base, method in dim_methods.items()}
        self.state.dim_outputs = dim_outputs

        self.state.phase = EnginePhase.TENSION
        vals = list(dim_outputs.values())
        mean = sum(vals) / len(vals) if vals else 0.0
        self.state.tension = (sum((v - mean) ** 2 for v in vals) / len(vals)) if vals else 0.0

        self.state.phase = EnginePhase.RESOLUTION
        for rule in self.rule_table.values():
            tensor = rule(tensor, dim_outputs)
        self.state.resolution = max(0.0, 1.0 - self.state.tension)

        self.state.phase = EnginePhase.RECURSION
        self.state.recursion_count += 1
        self.activation_history.append(tensor)
        tensor.phi = tensor.compute_phi(dim_outputs)

        # Emit to the bus so other organs on valid channels can react
        self.bus.emit(tensor, self.gate.number)

        return tensor

    def status(self) -> dict:
        """Snapshot of this organ's current engine state."""
        return {
            'gate': self.gate.number,
            'name': self.gate.name,
            'center': self.gate.center,
            'phase': self.state.phase.name,
            'tension': round(self.state.tension, 4),
            'resolution': round(self.state.resolution, 4),
            'recursion_count': self.state.recursion_count,
            'dim_outputs': {k: round(v, 4) for k, v in self.state.dim_outputs.items()},
            'space_phi': round(self.state.space_phi(), 4),
            'active': self._active,
        }
