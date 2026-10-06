"""
soft_emergence.py — confidence-scored channel emergence via NMS.

EXPERIMENTAL, additive — does NOT replace the locked hard Hamming-distance-1
rule in field_core.js / spec §2. That rule stays as-is for actual channel
existence. This explores a softer signal: instead of a binary "channel
exists / doesn't," compute a continuous CONFIDENCE that a connection is
forming across a range of nearby positions, then use non-maximum
suppression (NMS) to find the real peaks — the pattern MxDNA uses for
adaptive DNA tokenization, but with a deterministic scoring function
instead of a trained model. No ML anywhere in this file.
"""

from hexagram_sequences import KING_WEN_BINARY


def hamming_distance(a: str, b: str) -> int:
    return sum(1 for x, y in zip(a, b) if x != y)


def connection_confidence(bits_a: str, bits_b: str) -> float:
    """
    Deterministic confidence score, NOT learned. Closer bit patterns score
    higher. This is the heuristic stand-in for MxDNA's trained router logit —
    same role (a confidence signal to run NMS over), fully computed.
    """
    dist = hamming_distance(bits_a, bits_b)
    return 1.0 / (1 + dist)


def non_max_suppression(candidates: list, window: int = 2) -> list:
    """
    candidates: list of (position, confidence) tuples, sorted by position.
    Suppresses any candidate that has a higher-confidence neighbor within
    `window` positions — keeps only local confidence peaks. This is the
    same NMS principle MxDNA uses to pick real token boundaries from a
    dense confidence signal.
    """
    kept = []
    for i, (pos, conf) in enumerate(candidates):
        window_slice = candidates[max(0, i - window): i + window + 1]
        local_max = max(c for _, c in window_slice)
        if conf == local_max:
            kept.append((pos, conf))
    return kept


def soft_emergence_scan(reference_bits: str, gate_range: range = range(1, 65), window: int = 2) -> list:
    """
    Scan a range of gates against a reference bit pattern, compute
    confidence at each, and NMS down to the real emergence peaks —
    a soft alternative to the hard Hamming-distance-1 check.
    """
    candidates = []
    for gate_num in gate_range:
        bits = KING_WEN_BINARY.get(gate_num)
        if bits is None:
            continue
        conf = connection_confidence(reference_bits, bits)
        candidates.append((gate_num, conf))

    candidates.sort(key=lambda c: c[0])  # sort by gate position
    peaks = non_max_suppression(candidates, window=window)
    peaks.sort(key=lambda c: -c[1])  # highest confidence first
    return peaks


if __name__ == "__main__":
    reference = KING_WEN_BINARY[1]  # Qian, 111111
    print(f"Reference: Gate 1 (Qian) = {reference}")
    print()

    peaks = soft_emergence_scan(reference)
    print("Top emergence peaks (soft, NMS-filtered), vs. all 64 gates:")
    for gate_num, conf in peaks[:10]:
        bits = KING_WEN_BINARY[gate_num]
        dist = hamming_distance(reference, bits)
        print(f"  Gate {gate_num:2d} ({bits})  confidence={conf:.3f}  hamming_dist={dist}")

    print()
    hard_matches = [g for g in range(1, 65) if hamming_distance(reference, KING_WEN_BINARY[g]) == 1]
    print(f"For comparison, the HARD rule (Hamming distance exactly 1) finds: {hard_matches}")
    print("Soft version surfaces a ranked field of near-connections instead of a binary yes/no.")
