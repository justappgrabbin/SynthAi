"""Generative Fu Xi ATO substrate for the IsoHuman chart.

This module deliberately separates three concerns:

* astronomy supplies tropical longitudes, a Fagan-Bradley ayanamsa, and the
  true lunar-node longitude;
* the chart layer derives Body (tropical), Mind (sidereal Fagan-Bradley), and
  Heart (true-node draconic) coordinates;
* the ATO layer encodes those coordinates in the 64-state Fu Xi binary space
  and generates analogical states with fixed-width XNOR.

No King Wen sequence is used as a computational index.  ``fuxi_number`` is
the one-based Earlier-Heaven/Shao-Yong binary position: 000000 is 1 and
111111 is 64.  Human Design gate labels may be attached by another adapter,
but they must not replace this binary coordinate.

The four angular house cusps (1/ASC, 4/IC, 7/DSC, 10/MC) anchor the being
state-space.  Houses 2, 3, 5, 6, 8, 9, 11, and 12 are explicit learnable
placements.  A deterministic circular interpolation baseline fills them
until a trained predictor supplies alternatives.  Every inferred value keeps
its method, confidence, and parent anchors so generated data is auditable.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import math
from typing import Any, Callable, Mapping, Sequence

STATE_COUNT = 64
STATE_BITS = 6
FULL_MASK = (1 << STATE_BITS) - 1
SECTOR_DEGREES = 360.0 / STATE_COUNT

LAYER_BODY = "body_tropical"
LAYER_MIND = "mind_sidereal_fagan_bradley"
LAYER_HEART = "heart_draconic_true_node"
LAYER_SYNTHESIS = "ato_synthesis"
LAYERS = (LAYER_BODY, LAYER_MIND, LAYER_HEART)
PLACEMENT_LAYERS = (*LAYERS, LAYER_SYNTHESIS)

CORNER_HOUSES = (1, 4, 7, 10)
LEARNABLE_HOUSES = (2, 3, 5, 6, 8, 9, 11, 12)
HOUSE_LABELS = {
    1: "Ascendant",
    4: "Imum Coeli",
    7: "Descendant",
    10: "Midheaven",
}


def normalize_longitude(value: float) -> float:
    """Return a finite longitude in the half-open range [0, 360)."""

    number = float(value)
    if not math.isfinite(number):
        raise ValueError("longitude must be finite")
    return number % 360.0


def clockwise_arc(start: float, end: float) -> float:
    """Positive zodiacal distance from ``start`` to ``end``."""

    return (normalize_longitude(end) - normalize_longitude(start)) % 360.0


def circular_distance(a: float, b: float) -> float:
    arc = clockwise_arc(a, b)
    return min(arc, 360.0 - arc)


def longitude_to_fuxi_value(longitude: float) -> int:
    """Quantize a zodiac longitude into the 0..63 Fu Xi binary state."""

    return min(int(normalize_longitude(longitude) / SECTOR_DEGREES), FULL_MASK)


def value_to_fuxi_code(value: int) -> str:
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= FULL_MASK:
        raise ValueError("Fu Xi value must be an integer from 0 through 63")
    return f"{value:0{STATE_BITS}b}"


def fuxi_code_to_value(code: str) -> int:
    if len(code) != STATE_BITS or set(code) - {"0", "1"}:
        raise ValueError("Fu Xi code must contain exactly six binary digits")
    return int(code, 2)


def ato_xnor(a: int, b: int, bits: int = STATE_BITS) -> int:
    """Klein's fixed-width Appositional Transformation Operator."""

    if isinstance(a, bool) or isinstance(b, bool) or not isinstance(a, int) or not isinstance(b, int):
        raise TypeError("ATO operands must be integers")
    if not 1 <= bits <= 52:
        raise ValueError("bits must be between 1 and 52")
    mask = (1 << bits) - 1
    if not 0 <= a <= mask or not 0 <= b <= mask:
        raise ValueError(f"ATO operands must fit in {bits} bits")
    return (~(a ^ b)) & mask


def complete_analogy(a: int, b: int, c: int, bits: int = STATE_BITS) -> int:
    """Complete ``A:B::C:D`` using ``D = ATO(C, ATO(A, B))``."""

    return ato_xnor(c, ato_xnor(a, b, bits), bits)


def _stable_unit_interval(seed: str) -> float:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") / ((1 << 64) - 1)


@dataclass(frozen=True)
class FuXiState:
    value: int
    code: str
    fuxi_number: int
    longitude: float
    sector_start: float
    sector_end: float

    @classmethod
    def from_longitude(cls, longitude: float) -> "FuXiState":
        normalized = normalize_longitude(longitude)
        value = longitude_to_fuxi_value(normalized)
        start = value * SECTOR_DEGREES
        return cls(
            value=value,
            code=value_to_fuxi_code(value),
            fuxi_number=value + 1,
            longitude=normalized,
            sector_start=start,
            sector_end=start + SECTOR_DEGREES,
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class Placement:
    house: int
    label: str
    layer: str
    longitude: float
    state: FuXiState
    status: str
    method: str
    confidence: float
    parents: tuple[int, ...]

    def __post_init__(self) -> None:
        if not 1 <= self.house <= 12:
            raise ValueError("house must be 1..12")
        if self.layer not in PLACEMENT_LAYERS:
            raise ValueError(f"unknown layer: {self.layer}")
        if self.status not in {"observed", "inferred"}:
            raise ValueError("status must be observed or inferred")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be between zero and one")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class LayerState:
    name: str
    frame: str
    placements: tuple[Placement, ...]

    def by_house(self, house: int) -> Placement:
        try:
            return next(item for item in self.placements if item.house == house)
        except StopIteration as exc:
            raise ValueError(f"house {house} is not present") from exc

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class LearningExample:
    layer: str
    target_house: int
    previous_corner_house: int
    next_corner_house: int
    previous_corner_longitude: float
    next_corner_longitude: float
    arc_fraction: float
    baseline_longitude: float
    target_longitude: float | None
    residual_degrees: float | None
    feature_states: tuple[int, int]
    target_state: int | None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class GenerativeBeingState:
    body: LayerState
    mind: LayerState
    heart: LayerState
    synthesis: tuple[Placement, ...]
    learning_examples: tuple[LearningExample, ...]
    metadata: dict[str, Any]

    def layer(self, name: str) -> LayerState:
        return {
            LAYER_BODY: self.body,
            LAYER_MIND: self.mind,
            LAYER_HEART: self.heart,
        }[name]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


Prediction = tuple[float, float, str]
PlacementPredictor = Callable[
    [str, int, Placement, Placement, float, float],
    Prediction | None,
]


def derive_layer_longitude(
    tropical_longitude: float,
    *,
    layer: str,
    fagan_bradley_ayanamsa: float,
    true_node_longitude: float,
) -> float:
    """Project a tropical coordinate into one of the three chart frames."""

    tropical = normalize_longitude(tropical_longitude)
    if layer == LAYER_BODY:
        return tropical
    if layer == LAYER_MIND:
        return normalize_longitude(tropical - fagan_bradley_ayanamsa)
    if layer == LAYER_HEART:
        return normalize_longitude(tropical - true_node_longitude)
    raise ValueError(f"unknown layer: {layer}")


def _validate_corner_map(corners: Mapping[int, float]) -> dict[int, float]:
    provided = set(corners)
    required = set(CORNER_HOUSES)
    if provided != required:
        missing = sorted(required - provided)
        extra = sorted(provided - required)
        raise ValueError(f"corners must be houses {CORNER_HOUSES}; missing={missing}, extra={extra}")
    normalized = {house: normalize_longitude(value) for house, value in corners.items()}
    ordered = (1, 4, 7, 10, 1)
    arcs = [
        clockwise_arc(normalized[start], normalized[end])
        for start, end in zip(ordered, ordered[1:])
    ]
    if any(arc <= 0.0 for arc in arcs):
        raise ValueError("corner longitudes must advance around the zodiac")
    if not math.isclose(sum(arcs), 360.0, abs_tol=1e-7):
        raise ValueError("corner longitudes do not form one complete zodiac")
    return normalized


def _house_segment(house: int) -> tuple[int, int, float]:
    segments = {
        2: (1, 4, 1 / 3),
        3: (1, 4, 2 / 3),
        5: (4, 7, 1 / 3),
        6: (4, 7, 2 / 3),
        8: (7, 10, 1 / 3),
        9: (7, 10, 2 / 3),
        11: (10, 1, 1 / 3),
        12: (10, 1, 2 / 3),
    }
    try:
        return segments[house]
    except KeyError as exc:
        raise ValueError(f"house {house} is not a learnable placement") from exc


def _placement(
    *,
    house: int,
    layer: str,
    longitude: float,
    status: str,
    method: str,
    confidence: float,
    parents: Sequence[int],
) -> Placement:
    normalized = normalize_longitude(longitude)
    return Placement(
        house=house,
        label=HOUSE_LABELS.get(house, f"House {house} cusp"),
        layer=layer,
        longitude=normalized,
        state=FuXiState.from_longitude(normalized),
        status=status,
        method=method,
        confidence=confidence,
        parents=tuple(parents),
    )


def build_layer(
    name: str,
    tropical_corners: Mapping[int, float],
    *,
    fagan_bradley_ayanamsa: float,
    true_node_longitude: float,
    predictor: PlacementPredictor | None = None,
    observed_houses: Mapping[int, float] | None = None,
) -> tuple[LayerState, tuple[LearningExample, ...]]:
    """Build all 12 cusps for one frame from four observed angular anchors."""

    corners = _validate_corner_map(tropical_corners)
    projected = {
        house: derive_layer_longitude(
            longitude,
            layer=name,
            fagan_bradley_ayanamsa=fagan_bradley_ayanamsa,
            true_node_longitude=true_node_longitude,
        )
        for house, longitude in corners.items()
    }
    observed_houses = observed_houses or {}
    unknown_observed = set(observed_houses) - set(LEARNABLE_HOUSES)
    if unknown_observed:
        raise ValueError(f"observed_houses may only contain {LEARNABLE_HOUSES}")

    placements: dict[int, Placement] = {
        house: _placement(
            house=house,
            layer=name,
            longitude=longitude,
            status="observed",
            method="astronomical-angle",
            confidence=1.0,
            parents=(),
        )
        for house, longitude in projected.items()
    }
    examples: list[LearningExample] = []

    for house in LEARNABLE_HOUSES:
        previous_house, next_house, fraction = _house_segment(house)
        previous = placements[previous_house]
        following = placements[next_house]
        baseline = normalize_longitude(
            previous.longitude
            + clockwise_arc(previous.longitude, following.longitude) * fraction
        )
        method = "circular-anchor-interpolation"
        confidence = 0.5
        inferred = baseline
        if predictor is not None:
            prediction = predictor(
                name,
                house,
                previous,
                following,
                fraction,
                baseline,
            )
            if prediction is not None:
                inferred, confidence, method = prediction
                if not method.strip():
                    raise ValueError("predictor method must be non-empty")

        target = (
            derive_layer_longitude(
                observed_houses[house],
                layer=name,
                fagan_bradley_ayanamsa=fagan_bradley_ayanamsa,
                true_node_longitude=true_node_longitude,
            )
            if house in observed_houses
            else None
        )
        placements[house] = _placement(
            house=house,
            layer=name,
            longitude=inferred,
            status="inferred",
            method=method,
            confidence=float(confidence),
            parents=(previous_house, next_house),
        )
        examples.append(
            LearningExample(
                layer=name,
                target_house=house,
                previous_corner_house=previous_house,
                next_corner_house=next_house,
                previous_corner_longitude=previous.longitude,
                next_corner_longitude=following.longitude,
                arc_fraction=fraction,
                baseline_longitude=baseline,
                target_longitude=target,
                residual_degrees=(
                    None
                    if target is None
                    else ((target - baseline + 180.0) % 360.0) - 180.0
                ),
                feature_states=(previous.state.value, following.state.value),
                target_state=(
                    None if target is None else longitude_to_fuxi_value(target)
                ),
            )
        )

    return (
        LayerState(
            name=name,
            frame={
                LAYER_BODY: "tropical",
                LAYER_MIND: "sidereal-fagan-bradley",
                LAYER_HEART: "draconic-tropical-true-node",
            }[name],
            placements=tuple(placements[house] for house in range(1, 13)),
        ),
        tuple(examples),
    )


def _synthesis_placement(
    house: int,
    body: Placement,
    mind: Placement,
    heart: Placement,
) -> Placement:
    """Generate the fourth analogical state from Body, Mind, and Heart."""

    value = complete_analogy(body.state.value, mind.state.value, heart.state.value)
    jitter = _stable_unit_interval(
        f"{house}:{body.state.code}:{mind.state.code}:{heart.state.code}"
    )
    longitude = (value + jitter) * SECTOR_DEGREES
    return _placement(
        house=house,
        layer=LAYER_SYNTHESIS,
        longitude=longitude,
        status="inferred",
        method="ato-fourth-corner-synthesis",
        confidence=min(body.confidence, mind.confidence, heart.confidence),
        parents=(house,),
    )


def build_generative_being_state(
    *,
    tropical_corners: Mapping[int, float],
    fagan_bradley_ayanamsa: float,
    true_node_longitude: float,
    predictor: PlacementPredictor | None = None,
    observed_houses: Mapping[int, float] | None = None,
) -> GenerativeBeingState:
    """Assemble the complete three-layer, 12-placement generative state."""

    ayanamsa = normalize_longitude(fagan_bradley_ayanamsa)
    if ayanamsa > 90.0:
        raise ValueError("Fagan-Bradley ayanamsa must be supplied as a 0..90 degree offset")
    node = normalize_longitude(true_node_longitude)

    layers: dict[str, LayerState] = {}
    examples: list[LearningExample] = []
    for name in LAYERS:
        layer, layer_examples = build_layer(
            name,
            tropical_corners,
            fagan_bradley_ayanamsa=ayanamsa,
            true_node_longitude=node,
            predictor=predictor,
            observed_houses=observed_houses,
        )
        layers[name] = layer
        examples.extend(layer_examples)

    synthesis = tuple(
        _synthesis_placement(
            house,
            layers[LAYER_BODY].by_house(house),
            layers[LAYER_MIND].by_house(house),
            layers[LAYER_HEART].by_house(house),
        )
        for house in range(1, 13)
    )
    return GenerativeBeingState(
        body=layers[LAYER_BODY],
        mind=layers[LAYER_MIND],
        heart=layers[LAYER_HEART],
        synthesis=synthesis,
        learning_examples=tuple(examples),
        metadata={
            "binary_sequence": "Fu Xi / Earlier Heaven / Shao Yong",
            "binary_convention": "000000=1 through 111111=64",
            "king_wen_computational_index": False,
            "ato": "fixed-width bitwise XNOR",
            "fagan_bradley_ayanamsa_degrees": ayanamsa,
            "draconic_node": "true lunar node",
            "true_node_tropical_longitude": node,
            "corner_houses": list(CORNER_HOUSES),
            "learnable_houses": list(LEARNABLE_HOUSES),
        },
    )


__all__ = [
    "CORNER_HOUSES",
    "LEARNABLE_HOUSES",
    "LAYERS",
    "LAYER_BODY",
    "LAYER_HEART",
    "LAYER_MIND",
    "LAYER_SYNTHESIS",
    "FuXiState",
    "GenerativeBeingState",
    "LayerState",
    "LearningExample",
    "Placement",
    "ato_xnor",
    "build_generative_being_state",
    "build_layer",
    "circular_distance",
    "complete_analogy",
    "derive_layer_longitude",
    "fuxi_code_to_value",
    "longitude_to_fuxi_value",
    "normalize_longitude",
    "value_to_fuxi_code",
]
