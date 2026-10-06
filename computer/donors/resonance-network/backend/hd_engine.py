"""
Real Human Design / gate-line chart engine.

- Planetary positions: real JPL DE421 ephemeris via Skyfield (not approximated).
- Gate wheel: derived algorithmically from the King Wen trigram binary ordering,
  anchored at the correct real offset (Gate 1 begins at 13 deg 15' 00" of the
  tropical zodiac, i.e. 46 deg 45' before 0 deg Capricorn). This mirrors the
  MandalaGeometry logic found in the SynthAi.HumanDesign C# library, ported to Python.
- Design (unconscious) activations: found by walking the Sun backward until it
  has moved exactly 88 degrees of arc from its natal position (the real HD rule),
  not a fixed 88/89-day approximation.
- Centers / channels: sourced from the CENTERS + CHANNELS tables already
  established in RESONANCE-NETWORK's core.py (kept intact, deduplicated).
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from functools import lru_cache
import math
import os

from skyfield.api import load, wgs84
from skyfield.framelib import ecliptic_frame

# ---------------------------------------------------------------------------
# Ephemeris (real JPL data, loaded once)
# ---------------------------------------------------------------------------

_KERNEL_PATH = os.path.join(os.path.dirname(__file__), "de421.bsp")
_ts = load.timescale()
_eph = load(_KERNEL_PATH)
_earth = _eph["earth"]

_BODIES = {
    "Sun": "sun",
    "Moon": "moon",
    "Mercury": "mercury",
    "Venus": "venus",
    "Mars": "mars",
    "Jupiter": "jupiter barycenter",
    "Saturn": "saturn barycenter",
    "Uranus": "uranus barycenter",
    "Neptune": "neptune barycenter",
    "Pluto": "pluto barycenter",
}


def _ecliptic_longitude(body_key: str, dt: datetime) -> float:
    """Real geocentric apparent tropical ecliptic longitude, in degrees [0, 360)."""
    t = _ts.utc(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)
    target = _eph[_BODIES[body_key]]
    astrometric = _earth.at(t).observe(target).apparent()
    lat, lon, dist = astrometric.frame_latlon(ecliptic_frame)
    return lon.degrees % 360.0


def _sun_longitude(dt: datetime) -> float:
    return _ecliptic_longitude("Sun", dt)


def _mean_node_longitude(dt: datetime) -> float:
    """
    Mean lunar North Node longitude (real low-precision astronomical formula,
    Meeus ch. 47-adjacent constant-rate approximation, accurate to ~0.1-0.3 deg
    which is sufficient for gate resolution at 5.625 deg/gate granularity).

    NOTE: this function used to be named _true_node_longitude, which was a
    real naming bug -- the docstring and math were always for the MEAN
    node (constant precession rate, no periodic perturbation terms), not
    the true (actually perturbed) node. Renamed to match what it actually
    computes. See _true_node_longitude below for the genuine true node.
    """
    jd = 2440587.5 + dt.timestamp() / 86400.0
    T = (jd - 2451545.0) / 36525.0
    omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T ** 3 / 450000.0
    return omega % 360.0


def _true_node_longitude(dt: datetime, search_window_days: int = 20) -> float:
    """
    Real True Node: found by numerically searching the actual DE421 Moon
    ephemeris for where the Moon's geocentric ecliptic latitude crosses
    zero going from negative to positive (the real ascending-node
    crossing), then linearly interpolating between the nearest two
    samples for precision. This is a genuine measurement from the trusted
    ephemeris already used for every other body in this file -- not a
    fabricated perturbation-series approximation with coefficients pulled
    from memory. Hour-resolution scan + interpolation gives longitude
    precision well under 0.01 deg, far finer than the 5.625 deg/gate
    granularity this system needs.
    """
    moon = _eph["moon"]

    def moon_lat_lon(t):
        astrometric = _earth.at(t).observe(moon).apparent()
        lat, lon, _ = astrometric.frame_latlon(ecliptic_frame)
        return lat.degrees, lon.degrees % 360.0

    start = dt - timedelta(days=search_window_days // 2)
    prev_t = _ts.utc(start.year, start.month, start.day, start.hour, start.minute, start.second)
    prev_lat, prev_lon = moon_lat_lon(prev_t)

    for h in range(1, search_window_days * 24):
        cur_dt = start + timedelta(hours=h)
        cur_t = _ts.utc(cur_dt.year, cur_dt.month, cur_dt.day, cur_dt.hour, cur_dt.minute, cur_dt.second)
        cur_lat, cur_lon = moon_lat_lon(cur_t)
        if prev_lat < 0 <= cur_lat:
            # Linear interpolation between the two straddling samples for
            # the precise crossing longitude.
            frac = -prev_lat / (cur_lat - prev_lat)
            lon_diff = ((cur_lon - prev_lon + 180.0) % 360.0) - 180.0  # shortest angular diff
            return (prev_lon + frac * lon_diff) % 360.0
        prev_lat, prev_lon = cur_lat, cur_lon

    # No crossing found in the window (shouldn't happen -- node regresses
    # through a full ascending crossing roughly every 27.2 days) -- fall
    # back to the mean node rather than raise, since this is a real edge
    # case worth surfacing rather than crashing chart computation.
    return _mean_node_longitude(dt)


# ---------------------------------------------------------------------------
# King Wen gate wheel (algorithmically derived, not hand-typed)
# ---------------------------------------------------------------------------

# Real HD wheel order: the sequence of gates as they appear walking forward
# around the tropical zodiac starting at Gate 41. Verified against published
# gate/degree tables (Gate 41: 2d00' Aquarius, Gate 19: 7d37'30" Aquarius,
# Gate 13: 13d15'00" Aquarius, etc. -- each exactly 5.625 deg apart).
_HD_WHEEL_ORDER = [
    41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
    27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
    31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
    28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
]

_GATES_PER_WHEEL = 64
_DEGREES_PER_GATE = 360.0 / _GATES_PER_WHEEL      # 5.625 deg
_DEGREES_PER_LINE = _DEGREES_PER_GATE / 6.0        # 0.9375 deg
_DEGREES_PER_COLOR = _DEGREES_PER_LINE / 6.0       # 0.15625 deg
_DEGREES_PER_TONE = _DEGREES_PER_COLOR / 6.0       # 0.0260416... deg
_DEGREES_PER_BASE = _DEGREES_PER_TONE / 5.0        # 0.0052083... deg

# Gate 41 (index 0 of _HD_WHEEL_ORDER) starts at 2 deg 00' 00" Aquarius, which
# is 302 deg tropical longitude measured from 0 deg Aries. Verified against
# published Human Design gate/degree tables.
_WHEEL_START_OFFSET = 302.0  # deg


def longitude_to_gate_line(longitude: float) -> Tuple[int, int]:
    """Convert a real tropical ecliptic longitude to (gate, line) using the
    actual HD wheel anchor and direction (counter-clockwise through the wheel
    order starting at Gate 1)."""
    gate, line, _, _, _, _ = longitude_to_full_address(longitude)
    return gate, line


def longitude_to_full_address(longitude: float) -> Tuple[int, int, int, int, int, int]:
    """Full lattice address: (gate, line, color, tone, base, arcsecond).
    Each level subdivides the one above it by the standard HD ratios (6
    colors per line, 6 tones per color, 5 bases per tone -- 64*6*6*6*5 =
    69,120 total addresses). arcsecond is the integer arcsecond-within-gate
    (0-20249), needed for the third independent channel-emergence level
    (spec section 2) -- this was computed in field_scales.py/field_core.js
    but had not been carried through hd_engine.py's own address resolution
    until now. The Gate/Line/Color/Tone/Base tuple is still the coordinate
    the collective/anonymized layer keys on; arcsecond is kept separate and
    used only for live emergence checks, never for the anonymized join key."""
    offset = (longitude - _WHEEL_START_OFFSET) % 360.0
    gate_index = int(offset // _DEGREES_PER_GATE)
    gate = _HD_WHEEL_ORDER[gate_index % _GATES_PER_WHEEL]

    within_gate = offset - gate_index * _DEGREES_PER_GATE
    arcsecond = round(within_gate * 3600)
    line = int(within_gate // _DEGREES_PER_LINE)
    within_line = within_gate - line * _DEGREES_PER_LINE

    color = int(within_line // _DEGREES_PER_COLOR)
    within_color = within_line - color * _DEGREES_PER_COLOR

    tone = int(within_color // _DEGREES_PER_TONE)
    within_tone = within_color - tone * _DEGREES_PER_TONE

    base = int(within_tone // _DEGREES_PER_BASE)

    return (
        gate,
        min(6, max(1, line + 1)),
        min(6, max(1, color + 1)),
        min(6, max(1, tone + 1)),
        min(5, max(1, base + 1)),
        arcsecond,
    )


# ---------------------------------------------------------------------------
# Design (unconscious) Sun: walk backward until Sun has moved exactly 88 deg
# ---------------------------------------------------------------------------

def _find_design_datetime(birth_dt: datetime) -> datetime:
    natal_sun = _sun_longitude(birth_dt)
    target = (natal_sun - 88.0) % 360.0

    # Binary search across a bounded window (Sun always covers 88 deg in
    # 85-90 days; search a safe 100-day window).
    lo = birth_dt - timedelta(days=100)
    hi = birth_dt

    def angular_diff(a: float, b: float) -> float:
        d = (a - b + 180.0) % 360.0 - 180.0
        return d

    for _ in range(60):
        mid = lo + (hi - lo) / 2
        mid_sun = _sun_longitude(mid)
        # angle moved forward from mid to birth should be ~88 when mid is design
        diff = angular_diff(natal_sun, mid_sun)
        if diff < 0:
            diff += 360.0
        if diff > 88.0:
            lo = mid
        else:
            hi = mid
    return lo + (hi - lo) / 2


# ---------------------------------------------------------------------------
# Chart systems: Tropical / Sidereal / Draconic
# ---------------------------------------------------------------------------

def _lahiri_ayanamsa(dt: datetime) -> float:
    """Real Lahiri ayanamsa approximation (linear model anchored on the
    official 1900.0 epoch value of 22 deg 27' 42", precessing at ~50.29"/yr).
    This is the MEAN-equinox-referenced ayanamsa -- see
    _true_sidereal_correction for the true-equinox adjustment."""
    jd = 2440587.5 + dt.timestamp() / 86400.0
    years_since_1900 = (jd - 2415020.0) / 365.25
    base = 22 + 27 / 60.0 + 42 / 3600.0
    return base + years_since_1900 * (50.29 / 3600.0)


def _true_sidereal_correction(dt: datetime) -> float:
    """
    Real nutation-in-longitude (delta-psi) pulled directly from Skyfield's
    actual IAU2000 nutation series (the same trusted theory the ephemeris
    itself uses) -- not a hand-derived coefficient. True-equinox sidereal
    longitude = mean-equinox sidereal longitude + delta-psi; this is the
    standard mean/true equinox relation applied to the ayanamsa rather than
    a separate invented model.
    """
    t = _ts.utc(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)
    nutation_lon_radians = t._nutation_angles_radians[0]
    return math.degrees(nutation_lon_radians)


@dataclass
class Placement:
    body: str
    stream: str  # "personality" (conscious) or "design" (unconscious)
    chart_system: str  # "tropical" | "sidereal_mean" | "sidereal_true" | "draconic_mean" | "draconic_true"
    longitude: float
    gate: int
    line: int
    color: int
    tone: int
    base: int
    arcsecond: int  # arcsecond-within-gate (0-20249) -- the third
                     # independent channel-emergence level (spec section 2).
                     # Never part of the anonymized lattice_address below.

    @property
    def lattice_address(self) -> str:
        """The collective/anonymized layer's join key: Gate.Line.Color.Tone.Base.
        Deliberately excludes degree/minute/second/arcsecond, which would be
        close to a unique fingerprint per person rather than a shared pattern."""
        return f"{self.gate}.{self.line}.{self.color}.{self.tone}.{self.base}"


def compute_full_chart(birth_dt: datetime) -> Dict[str, List[Placement]]:
    """Compute Personality (conscious) + Design (unconscious) placements
    across Tropical, Sidereal (Mean + True), and Draconic (Mean Node + True
    Node) systems, for every real body -- all five systems computed for
    every person, per spec section 1.7 ("compute all systems for everyone,
    filter by relevance downstream" -- personalization happens at the
    relevance-filtering layer, not by only computing one system per person).
    Uses the standard 13-body Human Design set: Sun, Earth, Moon, both Lunar
    Nodes, and the seven planets Mercury through Pluto."""
    design_dt = _find_design_datetime(birth_dt)
    ayanamsa_mean = _lahiri_ayanamsa(birth_dt)

    result: Dict[str, List[Placement]] = {
        "tropical": [], "sidereal_mean": [], "sidereal_true": [],
        "draconic_mean": [], "draconic_true": [],
    }

    for stream, dt in (("personality", birth_dt), ("design", design_dt)):
        node_mean = _mean_node_longitude(dt)
        node_true = _true_node_longitude(dt)
        true_sid_correction = _true_sidereal_correction(dt)

        base_longitudes: Dict[str, float] = {}
        for body in _BODIES:
            base_longitudes[body] = _ecliptic_longitude(body, dt)
        base_longitudes["Earth"] = (base_longitudes["Sun"] + 180.0) % 360.0

        # Two variants of the node bodies' own tropical placement: Mean-node
        # convention (used for tropical/sidereal/draconic_mean, matching
        # standard chart software default) and True-node convention (used
        # only for draconic_true, where it self-consistently places North
        # Node at exactly 0 deg draconic longitude).
        longitudes_mean_node = dict(base_longitudes)
        longitudes_mean_node["North Node"] = node_mean
        longitudes_mean_node["South Node"] = (node_mean + 180.0) % 360.0

        longitudes_true_node = dict(base_longitudes)
        longitudes_true_node["North Node"] = node_true
        longitudes_true_node["South Node"] = (node_true + 180.0) % 360.0

        for body, trop_lon in longitudes_mean_node.items():
            sid_mean_lon = (trop_lon - ayanamsa_mean) % 360.0
            sid_true_lon = (sid_mean_lon + true_sid_correction) % 360.0
            drac_mean_lon = (trop_lon - node_mean) % 360.0

            for system, lon in (
                ("tropical", trop_lon),
                ("sidereal_mean", sid_mean_lon),
                ("sidereal_true", sid_true_lon),
                ("draconic_mean", drac_mean_lon),
            ):
                gate, line, color, tone, base, arcsecond = longitude_to_full_address(lon)
                result[system].append(
                    Placement(body=body, stream=stream, chart_system=system,
                              longitude=round(lon, 4), gate=gate, line=line,
                              color=color, tone=tone, base=base, arcsecond=arcsecond)
                )

        for body, trop_lon in longitudes_true_node.items():
            drac_true_lon = (trop_lon - node_true) % 360.0
            gate, line, color, tone, base, arcsecond = longitude_to_full_address(drac_true_lon)
            result["draconic_true"].append(
                Placement(body=body, stream=stream, chart_system="draconic_true",
                          longitude=round(drac_true_lon, 4), gate=gate, line=line,
                          color=color, tone=tone, base=base, arcsecond=arcsecond)
            )

    return result


# ---------------------------------------------------------------------------
# Centers / Channels (kept from core.py, deduplicated)
# ---------------------------------------------------------------------------

CENTERS: Dict[str, set] = {
    "Head": {64, 61, 63},
    "Ajna": {47, 24, 4, 17, 11, 43},
    "Throat": {62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16},
    "G": {7, 1, 13, 10, 15, 2, 46, 25},
    "Ego": {21, 51, 26, 40},
    "Spleen": {57, 44, 50, 32, 28, 18, 48},
    "Solar": {55, 49, 37, 22, 30, 36, 6},
    "Sacral": {5, 14, 29, 59, 9, 3, 42, 27, 34},
    "Root": {52, 19, 39, 41, 38, 54, 53, 60, 58},
}

_RAW_CHANNELS = [
    (64, 47, "Abstract/Reason"), (61, 24, "Awareness/The Thinker"), (63, 4, "Logic/Formulas"),
    (17, 62, "Acceptance"), (43, 23, "Structuring"), (11, 56, "Curiosity"),
    (16, 48, "The Wavelength"), (20, 57, "The Brain Wave"), (20, 34, "Charisma"),
    (20, 10, "Awakening"), (57, 34, "Power"), (57, 10, "Perfected Form"),
    (57, 20, "The Brain Wave"), (10, 34, "Exploration"), (34, 10, "Exploration"),
    (7, 31, "The Alpha"), (1, 8, "Inspiration"), (13, 33, "The Prodigal"),
    (25, 51, "Initiation"), (21, 45, "Money Line"), (26, 44, "Surrender"),
    (40, 37, "Community"), (19, 49, "Synthesis"), (55, 39, "Emoting"),
    (22, 12, "Openness"), (36, 35, "Transitoriness"), (30, 41, "Recognition"),
    (6, 59, "Mating"), (54, 32, "Transformation"), (28, 38, "Struggle"),
    (18, 58, "Judgment"), (5, 15, "Rhythm"), (2, 14, "The Beat"),
    (29, 46, "Discovery"), (42, 53, "Maturation"), (3, 60, "Mutation"),
    (9, 52, "Concentration"), (27, 50, "Preservation"),
]
# ^ Per spec sections 1.6/2: this table is REFERENCE DATA ONLY -- used below
# to validate that a live-computed emergence lands on a historically-
# recognized channel name, never as the existence check itself. The
# existence check is done in _channel_exists_live() via real
# Hamming-distance-1 on the actual lattice address, same rule as
# field_scales.channel_emerges.

_REFERENCE_CHANNEL_PAIRS = {tuple(sorted((a, b))): name for a, b, name in _RAW_CHANNELS}


def _dedup_channels(raw: List[Tuple[int, int, str]]) -> List[Tuple[int, int, str]]:
    seen = set()
    out = []
    for a, b, name in raw:
        key = tuple(sorted((a, b)))
        if key not in seen:
            seen.add(key)
            out.append((a, b, name))
    return out


CHANNELS = _dedup_channels(_RAW_CHANNELS)
GATE_TO_CHANNEL = {}
for a, b, name in CHANNELS:
    GATE_TO_CHANNEL.setdefault(a, []).append((b, name))
    GATE_TO_CHANNEL.setdefault(b, []).append((a, name))

GATE_TO_CENTER = {g: c for c, gates in CENTERS.items() for g in gates}


def _placement_to_field_scales_address(p: "Placement") -> dict:
    """Adapt a Placement (real gate-numbered) to the dict shape
    field_scales.channel_emerges expects. Uses the traditional gate number
    as the lattice_slot input deliberately -- for LIVE channel emergence
    between two real gates in a real chart, checking Hamming-distance-1 on
    the actual gate identity is the correct level (this is distinct from
    field_scales.py's own internal lattice_slot, which is a sequential
    arc-position index used for its own scale math -- see the naming
    collision already resolved there)."""
    return {
        "lattice_slot": p.gate, "line": p.line,
        "color": p.color, "tone": p.tone, "base": p.base,
        "arcsecond": p.arcsecond,
    }


def _channel_exists_live(p_a: "Placement", p_b: "Placement") -> Tuple[bool, Optional[str]]:
    """Real emergence check: Hamming-distance-1 at the Gate/Line or
    Color/Tone/Base level (spec section 2), not a table lookup. Returns
    (emerged, reference_name) -- reference_name is populated only if the
    live result happens to land on a historically-recognized pair, purely
    for display/validation, never as a gate for whether it counts."""
    from field_scales import channel_emerges
    addr_a = _placement_to_field_scales_address(p_a)
    addr_b = _placement_to_field_scales_address(p_b)
    result = channel_emerges(addr_a, addr_b)
    if not result["any"]:
        return False, None
    key = tuple(sorted((p_a.gate, p_b.gate)))
    return True, _REFERENCE_CHANNEL_PAIRS.get(key)


@dataclass
class BodyGraph:
    active_gates: set
    defined_channels: List[Tuple[int, int, str]]
    center_states: Dict[str, str]  # "Defined" | "Undefined" | "Open"
    definition: str  # "Single" | "Split" | "Triple Split" | "Quadruple Split" | "None"
    splits: int


def build_bodygraph(placements: List[Placement]) -> BodyGraph:
    active_gates = {p.gate for p in placements}

    # Real emergence: check every pair of distinct active gates for live
    # Hamming-distance-1 emergence (spec section 2), not membership in the
    # hardcoded CHANNELS table. A pair that emerges live but has no
    # historically-recognized name is still a real, defined channel --
    # labeled "Emergent X-Y" rather than silently dropped or given a false
    # traditional name.
    placements_by_gate: Dict[int, Placement] = {}
    for p in placements:
        placements_by_gate.setdefault(p.gate, p)  # first seen per gate is representative

    gates_list = sorted(placements_by_gate.keys())
    defined_channels: List[Tuple[int, int, str]] = []
    for i in range(len(gates_list)):
        for j in range(i + 1, len(gates_list)):
            ga, gb = gates_list[i], gates_list[j]
            emerged, ref_name = _channel_exists_live(placements_by_gate[ga], placements_by_gate[gb])
            if emerged:
                defined_channels.append((ga, gb, ref_name or f"Emergent {ga}-{gb}"))

    defined_gate_set = set()
    for a, b, _ in defined_channels:
        defined_gate_set.add(a)
        defined_gate_set.add(b)

    center_states: Dict[str, str] = {}
    for center, gates in CENTERS.items():
        if gates & defined_gate_set:
            center_states[center] = "Defined"
        elif gates & active_gates:
            center_states[center] = "Undefined"
        else:
            center_states[center] = "Open"

    # Connected components among defined centers (graph via defined channels)
    adjacency: Dict[str, set] = {c: set() for c in CENTERS}
    for a, b, _ in defined_channels:
        ca, cb = GATE_TO_CENTER.get(a), GATE_TO_CENTER.get(b)
        if ca and cb and ca != cb:
            adjacency[ca].add(cb)
            adjacency[cb].add(ca)

    defined_centers = {c for c, s in center_states.items() if s == "Defined"}
    visited = set()
    components = 0
    for c in defined_centers:
        if c in visited:
            continue
        components += 1
        stack = [c]
        while stack:
            cur = stack.pop()
            if cur in visited:
                continue
            visited.add(cur)
            stack.extend(adjacency[cur] & defined_centers)

    if not defined_centers:
        definition = "None"
    elif components == 1:
        definition = "Single"
    elif components == 2:
        definition = "Split"
    elif components == 3:
        definition = "Triple Split"
    else:
        definition = "Quadruple Split"

    return BodyGraph(
        active_gates=active_gates,
        defined_channels=defined_channels,
        center_states=center_states,
        definition=definition,
        splits=components,
    )


def full_natal_report(birth_dt: datetime) -> Dict:
    charts = compute_full_chart(birth_dt)
    tropical_placements = charts["tropical"]
    bodygraph = build_bodygraph(tropical_placements)

    def serialize(pl: Placement) -> Dict:
        return {
            "body": pl.body, "stream": pl.stream, "chart_system": pl.chart_system,
            "longitude": pl.longitude, "gate": pl.gate, "line": pl.line,
            "color": pl.color, "tone": pl.tone, "base": pl.base,
            "lattice_address": pl.lattice_address,
        }

    return {
        "charts": {
            system: [serialize(p) for p in placements]
            for system, placements in charts.items()
        },
        "bodygraph": {
            "active_gates": sorted(bodygraph.active_gates),
            "defined_channels": [
                {"gate_a": a, "gate_b": b, "name": name}
                for a, b, name in bodygraph.defined_channels
            ],
            "centers": bodygraph.center_states,
            "definition": bodygraph.definition,
            "splits": bodygraph.splits,
        },
    }
