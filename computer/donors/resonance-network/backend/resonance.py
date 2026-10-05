"""
9-field consciousness resonance engine.

Adapted from RESONANCE-NETWORK's original wave-coupling model, but seeded
from REAL gate/center activations (via hd_engine.py) instead of a hash of
lat/long/timestamp. The coupling matrix (how fields influence each other) is
kept as-is -- that's your design decision, not something to silently change.
"""

from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Tuple, Optional
import math

import hd_engine as hd


class FieldType(str, Enum):
    MIND = "Mind"
    HEART = "Heart"
    BODY = "Body"
    WILL = "Will"
    SHADOW = "Shadow"
    CHILD = "Child"
    SOUL = "Soul"
    SPIRIT = "Spirit"
    SYNTHESIS = "Synthesis"


# Which HD centers feed which of the 9 fields. This is an interpretive
# mapping (centers -> fields) -- flagging that this is a design choice, not
# a "canonical" HD rule, so it's easy to retune later.
CENTER_TO_FIELD = {
    "Ajna": FieldType.MIND,
    "Head": FieldType.MIND,
    "Ego": FieldType.WILL,
    "Solar": FieldType.HEART,
    "Sacral": FieldType.BODY,
    "Root": FieldType.BODY,
    "Spleen": FieldType.SHADOW,
    "G": FieldType.SOUL,
    "Throat": FieldType.CHILD,
}

# Coupling matrix: how fields influence each other (positive = amplifies,
# negative = dampens). Preserved from your original ResonanceNetwork design.
COUPLING: Dict[Tuple[FieldType, FieldType], float] = {
    (FieldType.HEART, FieldType.BODY): 0.8,
    (FieldType.MIND, FieldType.HEART): -0.6,
    (FieldType.SHADOW, FieldType.WILL): -0.7,
    (FieldType.CHILD, FieldType.SHADOW): -0.5,
    (FieldType.SOUL, FieldType.HEART): 0.9,
    (FieldType.SPIRIT, FieldType.SYNTHESIS): 0.95,
}

ARCHETYPES = {
    FieldType.MIND:      {"amplitude": 0.6, "frequency": 2.0,  "phase": 0.0,          "pattern": "CRYSTALLINE"},
    FieldType.HEART:     {"amplitude": 0.8, "frequency": 1.0,  "phase": math.pi / 2,  "pattern": "SPIRAL"},
    FieldType.BODY:      {"amplitude": 0.7, "frequency": 0.5,  "phase": 0.0,          "pattern": "HARMONIC"},
    FieldType.WILL:      {"amplitude": 0.5, "frequency": 3.0,  "phase": math.pi,      "pattern": "ASCENDING"},
    FieldType.SHADOW:    {"amplitude": 0.4, "frequency": 1.5,  "phase": math.pi,      "pattern": "CHAOTIC"},
    FieldType.CHILD:     {"amplitude": 0.9, "frequency": 5.0,  "phase": 0.0,          "pattern": "ASCENDING"},
    FieldType.SOUL:      {"amplitude": 0.5, "frequency": 0.1,  "phase": math.pi / 4,  "pattern": "HARMONIC"},
    FieldType.SPIRIT:    {"amplitude": 0.3, "frequency": 0.05, "phase": 0.0,          "pattern": "CRYSTALLINE"},
    FieldType.SYNTHESIS: {"amplitude": 0.6, "frequency": 1.0,  "phase": math.pi / 2,  "pattern": "HARMONIC"},
}


@dataclass
class FieldState:
    field_type: str
    amplitude: float
    frequency: float
    phase: float
    coherence: float
    entropy: float
    pattern: str


def fields_from_natal_report(report: Dict) -> Dict[str, FieldState]:
    """
    Derive the 9 field states from a REAL natal chart (hd_engine output),
    not from a hash of lat/long. Each field's amplitude/coherence is driven
    by how "loaded" its associated centers are (defined vs undefined vs open,
    and how many active gates sit in them). Phase is derived from the actual
    mean ecliptic longitude of that field's active gates, so two different
    charts produce genuinely different, comparable phases -- this is what
    makes matching real instead of a fixed constant every time.
    """
    centers = report["bodygraph"]["centers"]
    active_gates = set(report["bodygraph"]["active_gates"])

    # Real longitude per active gate, from the tropical personality placements
    gate_longitude: Dict[int, float] = {}
    for p in report["charts"]["tropical"]:
        if p["stream"] == "personality":
            gate_longitude[p["gate"]] = p["longitude"]

    gate_load: Dict[str, int] = {c: 0 for c in hd.CENTERS}
    for g in active_gates:
        c = hd.GATE_TO_CENTER.get(g)
        if c:
            gate_load[c] += 1

    fields: Dict[str, FieldState] = {}
    for field_type, base in ARCHETYPES.items():
        feeder_centers = [c for c, f in CENTER_TO_FIELD.items() if f == field_type]
        if feeder_centers:
            feeder_gates = [g for g in active_gates if hd.GATE_TO_CENTER.get(g) in feeder_centers]
            defined_count = sum(1 for c in feeder_centers if centers.get(c) == "Defined")
            total_load = sum(gate_load.get(c, 0) for c in feeder_centers)
            max_load = max(len(hd.CENTERS.get(c, [])) for c in feeder_centers) or 1

            coherence = min(1.0, 0.4 + 0.6 * (defined_count / len(feeder_centers)))
            entropy = max(0.0, 1.0 - coherence)
            amplitude = min(1.0, base["amplitude"] * (0.6 + 0.4 * min(1.0, total_load / max_load)))

            if feeder_gates:
                longitudes = [gate_longitude[g] for g in feeder_gates if g in gate_longitude]
                if longitudes:
                    # Circular mean of the real longitudes -> radians phase
                    sin_sum = sum(math.sin(math.radians(l)) for l in longitudes)
                    cos_sum = sum(math.cos(math.radians(l)) for l in longitudes)
                    phase = math.atan2(sin_sum, cos_sum) % (2 * math.pi)
                else:
                    phase = base["phase"]
            else:
                phase = base["phase"]
        else:
            coherence, entropy, amplitude, phase = 0.7, 0.3, base["amplitude"], base["phase"]

        fields[field_type.value] = FieldState(
            field_type=field_type.value,
            amplitude=round(amplitude, 4),
            frequency=base["frequency"],
            phase=round(phase, 4),
            coherence=round(coherence, 4),
            entropy=round(entropy, 4),
            pattern=base["pattern"],
        )

    return fields


def network_coherence(fields: Dict[str, FieldState]) -> float:
    return round(sum(f.coherence for f in fields.values()) / len(fields), 4)


def field_synchrony(a: FieldState, b: FieldState) -> float:
    phase_diff = abs(a.phase - b.phase) % (2 * math.pi)
    return round(1 - (phase_diff / math.pi), 4)


ALL_CENTERS = ["Head", "Ajna", "Throat", "G", "Ego", "Spleen", "Solar", "Sacral", "Root"]


def center_complementarity(centers_a: Dict[str, str], centers_b: Dict[str, str]) -> Dict:
    """Real Human Design complementarity: how much do these two people's
    bodygraphs COMPLETE each other, not resemble each other. A center where
    one person is Defined and the other is Undefined/Open is a real
    completion (their consistent output steadies the other's variable
    intake in that center) -- that's what scores here, not shared phase
    angle. Two people who are both Defined in the same centers score zero
    complementarity there (each already has their own supply, nothing to
    complete); two people both Undefined score zero too (shared gap,
    nobody's filling it).
    """
    completions = []
    shared_gaps = []
    shared_defined = []

    for c in ALL_CENTERS:
        a_def = centers_a.get(c) == "Defined"
        b_def = centers_b.get(c) == "Defined"
        if a_def and not b_def:
            completions.append(c)
        elif b_def and not a_def:
            completions.append(c)
        elif a_def and b_def:
            shared_defined.append(c)
        else:
            shared_gaps.append(c)

    complementarity_score = round(len(completions) / len(ALL_CENTERS), 4)

    return {
        "complementarity_score": complementarity_score,
        "completing_centers": completions,      # the real "you fill my gap" list
        "shared_defined_centers": shared_defined,
        "shared_gap_centers": shared_gaps,
    }


def resonance_score(fields_a: Dict[str, FieldState], fields_b: Dict[str, FieldState],
                     centers_a: Optional[Dict[str, str]] = None,
                     centers_b: Optional[Dict[str, str]] = None) -> Dict:
    """
    Real pairwise resonance between two people's field states: average
    synchrony across all 9 fields, weighted by the coupling matrix where
    two fields interact, PLUS real center-complementarity when both
    people's center-definition data is available. Complementarity is
    weighted more heavily than raw synchrony -- matching on "who completes
    my gaps" over "who resembles my pattern", per explicit design choice.
    """
    per_field = {}
    total = 0.0
    for name in fields_a:
        s = field_synchrony(fields_a[name], fields_b[name])
        per_field[name] = s
        total += s
    base_score = total / len(fields_a)

    # Cross-field coupling bonus/penalty (e.g. person A's Heart vs person B's Body)
    coupling_adjust = 0.0
    n = 0
    for (fa, fb), weight in COUPLING.items():
        sa = fields_a[fa.value]
        sb = fields_b[fb.value]
        coupling_adjust += weight * field_synchrony(sa, sb)
        n += 1
    if n:
        coupling_adjust = coupling_adjust / n

    result = {
        "per_field_synchrony": per_field,
        "coupling_adjustment": round(coupling_adjust, 4),
    }

    if centers_a and centers_b:
        comp = center_complementarity(centers_a, centers_b)
        # Complementarity carries real weight (0.5) -- this is the primary
        # signal per the design decision to match on completion, not
        # similarity. Synchrony/coupling stay as a secondary refinement.
        final_score = max(0.0, min(1.0,
            0.5 * comp["complementarity_score"] + 0.35 * base_score + 0.15 * coupling_adjust
        ))
        result["resonance_index"] = round(final_score, 4)
        result["complementarity"] = comp
    else:
        # No center data available -- fall back to synchrony only, but
        # this is the degraded path, not the intended one.
        final_score = max(0.0, min(1.0, base_score + 0.15 * coupling_adjust))
        result["resonance_index"] = round(final_score, 4)
        result["complementarity"] = None

    return result
