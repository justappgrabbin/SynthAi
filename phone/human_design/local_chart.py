from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime

from .being_state import CHANNEL_DATA
from .geonatal import calculate_geonatal
from .input import NormalizedBirthInput
from .labels import CHANNEL_LABELS, GATE_THEME_LABELS
from .schema import (
    ActivationRecord, CenterState, ChannelState, ChartSummary, DefinitionGroup,
    EngineInfo, GateActivationRef, GateState, HumanDesignChart, ImprintData,
    LabeledValue, VariableSet,
)

CENTERS = ("head", "ajna", "throat", "g", "heart", "spleen", "solar-plexus", "sacral", "root")
CENTER_NAMES = {
    "Head": "head", "Ajna": "ajna", "Throat": "throat", "G": "g",
    "Heart": "heart", "Spleen": "spleen", "Solar Plexus": "solar-plexus",
    "Sacral": "sacral", "Root": "root",
}
PLANET_SYMBOLS = {
    "Sun": "☉", "Earth": "⊕", "North Node": "☊", "South Node": "☋",
    "Moon": "☽", "Mercury": "☿", "Venus": "♀", "Mars": "♂",
    "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅", "Neptune": "♆", "Pluto": "♇",
}


def _lv(code: str, label: str | None = None) -> LabeledValue:
    return LabeledValue(code=code, label=label or code.replace("-", " ").title())


def calculate_local_chart(normalized: NormalizedBirthInput, *, geonatal_payload: dict | None = None) -> HumanDesignChart:
    location = normalized.chart_input.location
    latitude = location.latitude if location else 0.0
    longitude = location.longitude if location else 0.0
    geo = geonatal_payload or calculate_geonatal(
        normalized.birth_datetime_utc.isoformat(), latitude=latitude, longitude=longitude
    )
    tropical = [
        item for item in geo["placements"]
        if item["frame"] == "tropical" and item["dimension"] == "being"
    ]
    personality_rows = [item for item in tropical if item["orientation"] == "personality"]
    design_rows = [item for item in tropical if item["orientation"] == "design"]
    personality = _imprint("personality", geo["timestamp"], personality_rows)
    design = _imprint("design", geo["designTimestamp"], design_rows)
    all_activations = personality.activations + design.activations
    gates = {activation.gate for activation in all_activations}
    channels = _channels(gates)
    defined = {center for channel in channels for center in channel.centers}
    definitions = _definition_groups(channels)
    summary = _summary(personality, design, defined, channels, definitions)
    activations_by_gate: dict[int, list[ActivationRecord]] = defaultdict(list)
    for activation in all_activations:
        activations_by_gate[activation.gate].append(activation)

    gate_channels: dict[int, list[ChannelState]] = defaultdict(list)
    for channel in _all_channel_states():
        for gate in channel.gates:
            gate_channels[gate].append(channel)

    return HumanDesignChart(
        generated_at_utc=datetime.now(UTC).isoformat(),
        birth_datetime_utc=personality.datetime_utc,
        design_datetime_utc=design.datetime_utc,
        input=normalized.chart_input,
        engine=EngineInfo(
            name="synthia-local-geonatal",
            version="1.0.0",
            upstream="astronomy-engine + IsoHuman gate wheel",
            notes=(
                "Local, keyless calculation.",
                "Tropical Human Design activations; equal-house geonatal service.",
                "Original evidence and derived chart values remain separate.",
            ),
        ),
        summary=summary,
        variables=_variables(personality, design),
        definitions=definitions,
        centers=tuple(CenterState(code=c, label=c.replace("-", " ").title(), defined=c in defined) for c in CENTERS),
        channels=channels,
        activated_gates=tuple(
            GateState(
                gate=gate,
                label=str(gate),
                theme=GATE_THEME_LABELS.get(gate, f"Gate {gate}"),
                title=GATE_THEME_LABELS.get(gate, f"Gate {gate}"),
                center=_gate_center(gate),
                quarter="derived-from-wheel",
                channels=tuple(channel.code for channel in gate_channels[gate]),
                harmonic_gates=tuple(sorted(
                    other for channel in gate_channels[gate] for other in channel.gates if other != gate
                )),
                activations=tuple(
                    GateActivationRef(
                        imprint=a.imprint, planet_code=a.planet_code, planet_label=a.planet_label,
                        line=a.line, color=a.color, tone=a.tone, base=a.base,
                    ) for a in activations_by_gate[gate]
                ),
            )
            for gate in sorted(gates)
        ),
        personality=personality,
        design=design,
    )


def _imprint(name: str, timestamp: str, rows: list[dict]) -> ImprintData:
    return ImprintData(
        datetime_utc=timestamp,
        activations=tuple(
            ActivationRecord(
                imprint=name,
                planet_code=row["planetary"].lower().replace(" ", "-"),
                planet_label=row["planetary"],
                planet_symbol=PLANET_SYMBOLS.get(row["planetary"]),
                longitude=round(row["longitude"], 6),
                gate=row["gate"], gate_label=str(row["gate"]),
                gate_theme=GATE_THEME_LABELS.get(row["gate"], f"Gate {row['gate']}"),
                gate_title=GATE_THEME_LABELS.get(row["gate"], f"Gate {row['gate']}"),
                line=row["line"], color=row["color"], tone=row["tone"], base=row["base"],
            )
            for row in rows
        ),
    )


def _all_channel_states() -> tuple[ChannelState, ...]:
    return tuple(
        ChannelState(
            code=code, label=CHANNEL_LABELS.get(code, name), gates=gates,
            centers=(CENTER_NAMES[c1], CENTER_NAMES[c2]),
            channel_type=_lv(circuit.lower().replace(" ", "-"), circuit),
            circuit=_lv(circuit.lower().replace(" ", "-"), circuit),
            circuit_group=_lv(circuit.lower().replace(" ", "-"), circuit),
            is_creative=code == "01-08",
        )
        for code, name, gates, c1, c2, circuit, _analogue in CHANNEL_DATA
    )


def _channels(gates: set[int]) -> tuple[ChannelState, ...]:
    return tuple(channel for channel in _all_channel_states() if set(channel.gates) <= gates)


def _gate_center(gate: int) -> str:
    for channel in _all_channel_states():
        if gate in channel.gates:
            return channel.centers[channel.gates.index(gate)]
    return "unknown"


def _definition_groups(channels: tuple[ChannelState, ...]) -> tuple[DefinitionGroup, ...]:
    graph: dict[str, set[str]] = defaultdict(set)
    for channel in channels:
        left, right = channel.centers
        graph[left].add(right)
        graph[right].add(left)
    groups: list[DefinitionGroup] = []
    unseen = set(graph)
    while unseen:
        stack = [unseen.pop()]
        component: set[str] = set()
        while stack:
            center = stack.pop()
            component.add(center)
            neighbors = graph[center] & unseen
            unseen -= neighbors
            stack.extend(neighbors)
        groups.append(DefinitionGroup(centers=tuple(sorted(component))))
    return tuple(sorted(groups, key=lambda item: item.centers))


def _connected(channels: tuple[ChannelState, ...], starts: set[str], target: str) -> bool:
    graph: dict[str, set[str]] = defaultdict(set)
    for channel in channels:
        left, right = channel.centers
        graph[left].add(right)
        graph[right].add(left)
    seen = set(starts)
    stack = list(starts)
    while stack:
        node = stack.pop()
        if node == target:
            return True
        for neighbor in graph[node] - seen:
            seen.add(neighbor)
            stack.append(neighbor)
    return False


def _summary(personality: ImprintData, design: ImprintData, defined: set[str],
             channels: tuple[ChannelState, ...], groups: tuple[DefinitionGroup, ...]) -> ChartSummary:
    motor_to_throat = _connected(channels, {"heart", "sacral", "solar-plexus", "root"} & defined, "throat")
    if "sacral" in defined:
        type_code = "manifesting-generator" if motor_to_throat else "pure-generator"
        strategy, signature, not_self = "respond", "satisfaction", "frustration"
    elif motor_to_throat:
        type_code, strategy, signature, not_self = "manifestor", "inform", "peace", "anger"
    elif defined:
        type_code, strategy, signature, not_self = "projector", "invitation", "success", "bitterness"
    else:
        type_code, strategy, signature, not_self = "reflector", "wait-lunar-cycle", "surprise", "disappointment"

    if "solar-plexus" in defined:
        authority = "solar-plexus"
    elif "sacral" in defined:
        authority = "sacral"
    elif "spleen" in defined:
        authority = "splenic"
    elif "heart" in defined:
        authority = "ego"
    elif "g" in defined and "throat" in defined:
        authority = "self-projected"
    elif defined:
        authority = "mental"
    else:
        authority = "lunar"

    p_sun = next(a for a in personality.activations if a.planet_code == "sun")
    d_sun = next(a for a in design.activations if a.planet_code == "sun")
    p_earth = next(a for a in personality.activations if a.planet_code == "earth")
    d_earth = next(a for a in design.activations if a.planet_code == "earth")
    profile = f"{p_sun.line}-{d_sun.line}"
    count = len(groups)
    definition = {0: "no", 1: "single", 2: "split", 3: "triple-split", 4: "quadruple-split"}.get(count, f"{count}-part")
    cross = f"{p_sun.gate}-{p_earth.gate}-{d_sun.gate}-{d_earth.gate}-r"
    return ChartSummary(
        type=_lv(type_code), strategy=_lv(strategy), authority=_lv(authority),
        profile=_lv(profile, profile.replace("-", "/")), definition=_lv(definition),
        signature=_lv(signature), not_self_theme=_lv(not_self),
        incarnation_cross=_lv(cross, f"{p_sun.gate}/{p_earth.gate} | {d_sun.gate}/{d_earth.gate}"),
    )


def _variables(personality: ImprintData, design: ImprintData) -> VariableSet:
    p_sun = next(a for a in personality.activations if a.planet_code == "sun")
    p_node = next(a for a in personality.activations if a.planet_code == "north-node")
    d_sun = next(a for a in design.activations if a.planet_code == "sun")
    d_node = next(a for a in design.activations if a.planet_code == "north-node")
    orientation = "".join("R" if a.tone > 3 else "L" for a in (d_sun, d_node, p_node, p_sun))
    return VariableSet(
        orientation=_lv(orientation.lower(), orientation),
        determination=_lv(f"color-{d_sun.color}", f"Color {d_sun.color}"),
        cognition=_lv(f"tone-{d_sun.tone}", f"Tone {d_sun.tone}"),
        environment=_lv(f"color-{d_node.color}", f"Color {d_node.color}"),
        perspective=_lv(f"color-{p_node.color}", f"Color {p_node.color}"),
        motivation=_lv(f"color-{p_sun.color}", f"Color {p_sun.color}"),
        sense=_lv(f"tone-{p_sun.tone}", f"Tone {p_sun.tone}"),
    )
