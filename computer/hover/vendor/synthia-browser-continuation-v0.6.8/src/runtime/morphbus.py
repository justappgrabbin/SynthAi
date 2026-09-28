"""
MORPHBUS — The Channel Communication Substrate
Organs only signal if their gates form a defined channel.
Signal carries the full 7D perceptual state tensor.
"""

from dataclasses import dataclass, field
from typing import Optional, Callable
from enum import Enum
import time
import math


# ── Universal Engine States ────────────────────────────────────────────────────
class EnginePhase(Enum):
    STATE      = 1  # current lattice address
    RELATION   = 2  # connect to harmonic via channel
    TENSION    = 3  # measure stress in relation
    RESOLUTION = 4  # find release → output
    RECURSION  = 5  # resolution becomes new state


# ── The 5 Bases (JUT dimensions) ──────────────────────────────────────────────
BASE_MAP = {
    1: {'dim': 'MOVEMENT',  'probe': 'WHERE', 'sense': 'seeing',  'keynote': 'I Define',   'polarity': 'Yang/Yang', 'element': 'Fire',  'sephirot': 'Keter'},
    2: {'dim': 'EVOLUTION', 'probe': 'WHAT',  'sense': 'taste',   'keynote': 'I Remember', 'polarity': 'Yang/Yin',  'element': 'Water', 'sephirot': 'Chokmah'},
    3: {'dim': 'BEING',     'probe': 'WHEN',  'sense': 'touch',   'keynote': 'I Am',        'polarity': 'Yin/Yin',   'element': 'Wood',  'sephirot': 'Binah'},
    4: {'dim': 'DESIGN',    'probe': 'WHY',   'sense': 'smell',   'keynote': 'I Design',    'polarity': 'Yin/Yang',  'element': 'Metal', 'sephirot': 'Tiferet'},
    5: {'dim': 'SPACE',     'probe': 'WHO',   'sense': 'hearing', 'keynote': 'I Think',     'polarity': 'Space',     'element': 'Earth', 'sephirot': 'Malkhut'},
}

# ── The 6 Tones (sensory/perception filter) ───────────────────────────────────
TONE_MAP = {
    1: {'theme': 'Security',    'dept': 'Smell',       'center': 'Splenic'},
    2: {'theme': 'Uncertainty', 'dept': 'Taste',       'center': 'Splenic'},
    3: {'theme': 'Action',      'dept': 'Outer Vision','center': 'Ajna'},
    4: {'theme': 'Meditation',  'dept': 'Inner Vision','center': 'Ajna'},
    5: {'theme': 'Judgement',   'dept': 'Feeling',     'center': 'SolarPlexus'},
    6: {'theme': 'Acceptance',  'dept': 'Touch',       'center': 'SolarPlexus'},
}

# ── The 6 Colors (motivational response / drive) ──────────────────────────────
COLOR_MAP = {
    1: {'response': 'FEAR',      'modes': ('Communalist','Separatist'),    'center': 'Splenic',     'flow': 'Essence→VitalForce'},
    2: {'response': 'HOPE',      'modes': ('Theist','Anti-theist'),        'center': 'Splenic',     'flow': 'VitalForce→Spirit'},
    3: {'response': 'DESIRE',    'modes': ('Leader','Follower'),           'center': 'Ajna',        'flow': 'Essence→Spirit'},
    4: {'response': 'NEED',      'modes': ('Master','Novice'),             'center': 'Ajna',        'flow': 'VitalForce→Essence'},
    5: {'response': 'GUILT',     'modes': ('Conditioner','Conditioned'),   'center': 'SolarPlexus', 'flow': 'Spirit→VitalForce'},
    6: {'response': 'INNOCENCE', 'modes': ('Observer','Observed'),         'center': 'SolarPlexus', 'flow': 'Spirit→Essence'},
}

# ── HD Channels (valid MorphBus connections) ──────────────────────────────────
# Only defined channels allow signal propagation
HD_CHANNELS = {
    frozenset({64, 47}): 'Abstraction',
    frozenset({61, 24}): 'Awareness',
    frozenset({63, 4}):  'Logic',
    frozenset({31, 7}):  'Alpha',
    frozenset({8, 1}):   'Inspiration',
    frozenset({33, 13}): 'Prodigal',
    frozenset({20, 34}): 'Charisma',
    frozenset({20, 57}): 'Brainwave',
    frozenset({10, 57}): 'PerfectedForm',
    frozenset({34, 57}): 'Power',
    frozenset({10, 20}): 'WakingDream',
    frozenset({10, 34}): 'ExplorationOfTransformation',
    frozenset({35, 36}): 'Transitoriness',
    frozenset({49, 19}): 'Synthesis',
    frozenset({30, 41}): 'Recognition',
    frozenset({32, 54}): 'Transformation',
    frozenset({21, 45}): 'Money',
    frozenset({40, 37}): 'Community',
    frozenset({48, 16}): 'WaveLength',
    frozenset({18, 58}): 'Judgment',
    frozenset({59, 6}):  'Mating',
    frozenset({27, 50}): 'Preservation',
    frozenset({29, 46}): 'Discovery',
    frozenset({5, 15}):  'Rhythm',
    frozenset({2, 14}):  'Beat',
    frozenset({9, 52}):  'Concentration',
    frozenset({3, 60}):  'Mutation',
    frozenset({42, 53}): 'Maturation',
    frozenset({51, 25}): 'Initiation',
    frozenset({44, 26}): 'Surrender',
    frozenset({28, 38}): 'Struggle',
    frozenset({39, 55}): 'Emoting',
    frozenset({22, 12}): 'Openness',
    frozenset({36, 35}): 'Transitoriness',
    frozenset({11, 56}): 'Curiosity',
    frozenset({17, 62}): 'Acceptance',
    frozenset({43, 23}): 'Structuring',
}

# Integration Circuit — non-negotiable backbone
INTEGRATION_GATES = {10, 20, 34, 57}
INTEGRATION_CHANNELS = {
    frozenset({10, 57}), frozenset({20, 57}), frozenset({34, 57}),
    frozenset({10, 20}), frozenset({10, 34}), frozenset({20, 34}),
}


# ── Perceptual State Tensor ────────────────────────────────────────────────────
@dataclass
class PerceptualStateTensor:
    """E(t) = {γ, σ, π, c, τ, μ, φ}"""
    gamma: int    # γ — Geometric Basin: gate (1-64)
    sigma: int    # σ — Sensory Axis: tone (1-6)
    pi: int       # π — Polarity: color binary (0=mode_a, 1=mode_b)
    c: int        # c — Color/Frequency: color (1-6)
    tau: int      # τ — Temporal Recursion: line (1-6)
    mu: int       # μ — Observer Weighting: base (1-5)
    phi: float    # φ — Attractor Phase: emergent (computed)
    
    # Organ identity
    source_organ: str = ""
    timestamp: float = field(default_factory=time.time)
    intensity: float = 1.0
    
    @property
    def lattice_address(self) -> tuple:
        """The 5-tuple address in the 69,120 space"""
        return (self.gamma, self.tau, self.c, self.sigma, self.mu)
    
    @property
    def lattice_index(self) -> int:
        """Linear index: 0 to 69,119"""
        g, l, c, t, b = self.gamma-1, self.tau-1, self.c-1, self.sigma-1, self.mu-1
        return g*1080 + l*180 + c*30 + t*5 + b
    
    @property
    def base_info(self) -> dict:
        return BASE_MAP[self.mu]
    
    @property
    def tone_info(self) -> dict:
        return TONE_MAP[self.sigma]
    
    @property
    def color_info(self) -> dict:
        return COLOR_MAP[self.c]
    
    def compute_phi(self, dim_outputs: dict) -> float:
        """
        Space (Base5/WHO) = interference pattern of bases 1-4.
        Never input — always emergent.
        φ = normalized vector sum of dimensional activations
        """
        if not dim_outputs:
            return 0.0
        vals = [dim_outputs.get(b, 0.0) for b in [1,2,3,4]]
        magnitude = math.sqrt(sum(v**2 for v in vals))
        return magnitude / (len(vals) * max(abs(v) for v in vals) + 1e-9)
    
    def describe(self) -> str:
        bi = self.base_info
        ti = self.tone_info
        ci = self.color_info
        mode = ci['modes'][self.pi]
        return (
            f"[{self.source_organ}] Gate {self.gamma} Line {self.tau} | "
            f"{ci['response']} ({mode}) | "
            f"{ti['theme']} via {ti['dept']} | "
            f"{bi['dim']}: {bi['keynote']} [{bi['probe']}] | "
            f"φ={self.phi:.3f} | addr={self.lattice_index}"
        )


# ── MorphBus ───────────────────────────────────────────────────────────────────
class MorphBus:
    """
    The channel communication substrate.
    Organs only receive signals if their gates form a defined channel.
    """
    
    def __init__(self):
        self._subscribers: dict[int, list[Callable]] = {}  # gate → [handlers]
        self._history: list[PerceptualStateTensor] = []
        self._integration_log: list[str] = []
    
    def subscribe(self, gate: int, handler: Callable):
        """Organ registers to receive signals on its gate"""
        if gate not in self._subscribers:
            self._subscribers[gate] = []
        self._subscribers[gate].append(handler)
    
    def emit(self, signal: PerceptualStateTensor, source_gate: int):
        """
        Emit signal — only propagates to gates forming valid channels.
        Integration Circuit gates always propagate to each other.
        """
        self._history.append(signal)
        delivered = []
        
        for target_gate, handlers in self._subscribers.items():
            if target_gate == source_gate:
                continue
            
            channel_key = frozenset({source_gate, target_gate})
            channel_name = HD_CHANNELS.get(channel_key)
            
            if channel_name:
                # Valid channel — propagate with channel context
                for handler in handlers:
                    handler(signal, channel_name)
                delivered.append((target_gate, channel_name))
                
                # Log Integration Circuit activations
                if channel_key in INTEGRATION_CHANNELS:
                    self._integration_log.append(
                        f"INTEGRATION [{channel_name}]: {source_gate}→{target_gate} | {signal.describe()}"
                    )
        
        return delivered
    
    def field_state(self) -> dict:
        """Current field snapshot — what's active across all organs"""
        if not self._history:
            return {}
        recent = self._history[-10:]
        base_activations = {}
        for sig in recent:
            b = sig.mu
            base_activations[b] = base_activations.get(b, 0) + sig.intensity
        return {
            'active_signals': len(self._history),
            'recent_bases': base_activations,
            'integration_events': len(self._integration_log),
            'last_signal': self._history[-1].describe() if self._history else None,
        }


# Singleton bus
BUS = MorphBus()
