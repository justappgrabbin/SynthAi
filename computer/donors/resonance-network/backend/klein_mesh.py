"""
klein_mesh.py — Klein tools activated by emergent channels.

A channel (edge) forms via the locked Hamming-distance-1 rule (spec §2).
Which Klein tool activates, and what TYPE of output it produces, is
determined by which dimension the channel's Base value belongs to —
not hardcoded per-tool, derived from the address the same way everything
else in this system is derived.
"""

from field_scales import positionToAddress, BASE_TO_DIMENSION, MACRO_CHAINS

# ── KLEIN TOOLS (real, from Sheldon Klein's actual 1960s-70s work) ─────────
# Only tools with confirmed provenance — no invented ones.
KLEIN_TOOLS = {
    "MESSY": "Front door — captures raw input, no interpretation layer",
    "AUTOLING": "Router — WHY→WHEN→WHERE→WHAT→WHO resolution, dimension-filtered (spec §4.0)",
    "DISEMINER": "Dictionary-based extraction — question-answering, NOT the rejected narrative layer (spec §4.1)",
    "AutoNovel": "Narrative generation",
    "Control of Style": "Stylistic tuning",
    "Language Contact": "Multi-source mediation — MCP zero-point contact (spec §4.2)",
}

# ── DIMENSION → OUTPUT TYPE (locked, derived from Crystal structure §3.1) ──
DIMENSION_OUTPUT_TYPE = {
    "Personality": "song",      # Space half of Personality Crystal — "Hearing is Music"
    "Mind": "research_paper",   # Evolution half of Personality Crystal — "I Remember"
    "Body": "book",             # Being half of Design Crystal — "I Am", embodied narrative
    "Ego": "code",              # Design half of Design Crystal — "Life is Art", structure
    # Individuality (Movement/Monopole) intentionally has NO output type —
    # it's the connective dimension, not a producing one (spec §3.1).
}

DIMENSION_TO_TOOL = {
    "Personality": "Control of Style",  # rhythm/music/freedom → stylistic tuning
    "Mind": "DISEMINER",                # memory/research → dictionary extraction
    "Body": "AutoNovel",                # embodied narrative → novel generation
    "Ego": "AUTOLING",                  # structure/design → routing logic
}


def addressToBits(gate: int, line: int, color: int, tone: int, base: int) -> int:
    """Ported from field_core.js — same 18-bit encoding."""
    g = (gate - 1) & 0b111111
    l = (line - 1) & 0b111
    c = (color - 1) & 0b111
    t = (tone - 1) & 0b111
    b = (base - 1) & 0b111
    return (g << 12) | (l << 9) | (c << 6) | (t << 3) | b


def hammingDistance(bits_a: int, bits_b: int) -> int:
    return bin(bits_a ^ bits_b).count("1")


def channel_activates_tool(longitude_a: float, longitude_b: float) -> dict:
    """
    Given two node positions, check if a channel emerges between them
    (Hamming distance 1, spec §2), and if so, determine which Klein tool
    activates and what output type it produces — derived from the
    channel's Base dimension, not hardcoded per-channel.
    """
    addr_a = positionToAddress(longitude_a)
    addr_b = positionToAddress(longitude_b)

    bits_a = addressToBits(addr_a["gate"], addr_a["line"], addr_a["color"], addr_a["tone"], addr_a["base"])
    bits_b = addressToBits(addr_b["gate"], addr_b["line"], addr_b["color"], addr_b["tone"], addr_b["base"])
    emerges = hammingDistance(bits_a, bits_b) == 1

    if not emerges:
        return {"channel_emerges": False}

    # Individuality/Monopole (base=1) has no output type — it's the connector
    dimension_a = BASE_TO_DIMENSION[addr_a["base"]]
    dimension_b = BASE_TO_DIMENSION[addr_b["base"]]

    # The channel's active dimension is whichever endpoint isn't the Monopole
    active_dimension = dimension_b if dimension_a == "Individuality" else dimension_a

    if active_dimension == "Individuality":
        # Both ends are Monopole — pure connective channel, no tool/output
        return {
            "channel_emerges": True,
            "dimension": "Individuality",
            "role": "connective (Monopole) — routes, does not produce",
            "tool": None,
            "output_type": None
        }

    tool = DIMENSION_TO_TOOL.get(active_dimension)
    output_type = DIMENSION_OUTPUT_TYPE.get(active_dimension)

    return {
        "channel_emerges": True,
        "dimension": active_dimension,
        "tool": tool,
        "tool_description": KLEIN_TOOLS.get(tool),
        "output_type": output_type,
        "gate_a": addr_a["gate"], "gate_b": addr_b["gate"]
    }


if __name__ == "__main__":
    # Two nearby longitudes likely to form a channel (small offset)
    test_pairs = [
        (302.1, 302.1 + 0.001),   # very close — likely emerges
        (100.0, 250.0),            # far apart — likely doesn't
        (15.5, 15.5 + 0.0005),
    ]

    for lon_a, lon_b in test_pairs:
        result = channel_activates_tool(lon_a, lon_b)
        print(f"\n{lon_a}° <-> {lon_b}°:")
        for k, v in result.items():
            print(f"  {k}: {v}")
