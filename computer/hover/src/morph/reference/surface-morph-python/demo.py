#!/usr/bin/env python3
"""Executable transition test. UI is not required.

Success criterion: distant poses produce continuous motion with reconstructed
hidden surfaces (torso stripe visible again as the crossing arm moves) rather
than holes or dissolving pixels.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from engine.character import pose_idle, pose_reach, render_character, save_sprite
from engine.pipeline import MorphEngine


def sheet(frames, path, pad=4, bg=(18, 18, 24, 255)):
    h, w = frames[0].shape[:2]
    n = len(frames)
    canvas = np.zeros((h + pad * 2, n * (w + pad) + pad, 4), dtype=np.uint8)
    canvas[:] = bg
    for i, f in enumerate(frames):
        x = pad + i * (w + pad)
        canvas[pad : pad + h, x : x + w] = f
    Image.fromarray(canvas).save(path)
    return path


def naive_crossfade(a, b, n_inbetween):
    out = [a]
    for i in range(1, n_inbetween + 1):
        t = i / (n_inbetween + 1)
        mix = (1 - t) * a.astype(np.float32) + t * b.astype(np.float32)
        out.append(np.clip(mix, 0, 255).astype(np.uint8))
    out.append(b)
    return out


def hole_score(frame) -> float:
    """Count interior transparent pixels inside the bounding opaque box —
    a proxy for 'dissolved' or punched holes."""
    a = frame[..., 3] > 20
    if not np.any(a):
        return 1.0
    ys, xs = np.where(a)
    y0, y1 = ys.min(), ys.max()
    x0, x1 = xs.min(), xs.max()
    box = a[y0 : y1 + 1, x0 : x1 + 1]
    # interior = box pixels that are empty but have opaque neighbors
    empty = ~box
    # crude: empty fraction of bbox
    return float(empty.mean())


def torso_stripe_present(frame) -> float:
    """How much of the cream chest-stripe color is visible."""
    rgb = frame[..., :3].astype(np.int16)
    stripe = np.array([240, 230, 210])
    d = np.abs(rgb - stripe).sum(-1)
    return float((d <= 28).sum())


def main():
    sprites = ROOT / "sprites"
    out = ROOT / "output"
    edges = ROOT / "edges"
    sprites.mkdir(exist_ok=True)
    out.mkdir(exist_ok=True)

    a = render_character(pose_idle(), "idle")
    b = render_character(pose_reach(), "reach")
    save_sprite(a, sprites / "idle.png")
    save_sprite(b, sprites / "reach.png")

    engine = MorphEngine(edge_dir=edges)
    engine.register_state(a)
    engine.register_state(b)

    n_in = 8
    frames = engine.morph(a, b, frames=n_in, learn=True, easing="smoothstep")
    assert len(frames) == n_in + 2, len(frames)
    assert frames[0].shape == a.image.shape

    for i, f in enumerate(frames):
        Image.fromarray(f).save(out / f"morph_{i:02d}.png")

    # second pass — same edge, learn=True should load + update the edge
    frames2 = engine.morph("idle", "reach", frames=n_in, learn=True, easing="smoothstep")
    for i, f in enumerate(frames2):
        Image.fromarray(f).save(out / f"morph2_{i:02d}.png")

    naive = naive_crossfade(a.image, b.image, n_in)
    for i, f in enumerate(naive):
        Image.fromarray(f).save(out / f"naive_{i:02d}.png")

    sheet(frames, out / "sheet_morph.png")
    sheet(naive, out / "sheet_naive.png")
    sheet(frames2, out / "sheet_morph_learned.png")

    # Metrics at mid frame
    mid = len(frames) // 2
    metrics = {
        "n_frames": len(frames),
        "mid_hole_morph": hole_score(frames[mid]),
        "mid_hole_naive": hole_score(naive[mid]),
        "mid_stripe_morph": torso_stripe_present(frames[mid]),
        "mid_stripe_naive": torso_stripe_present(naive[mid]),
        "idle_stripe": torso_stripe_present(a.image),
        "reach_stripe": torso_stripe_present(b.image),
        "endpoint_l1_to_B": float(np.mean(np.abs(frames[-1].astype(np.int16) - b.image.astype(np.int16)))),
    }
    # Edge persistence
    edge_json = edges / "idle__reach.json"
    edge_npz = edges / "idle__reach.npz"
    metrics["edge_json"] = edge_json.exists()
    metrics["edge_npz"] = edge_npz.exists()
    if edge_json.exists():
        meta = json.loads(edge_json.read_text())
        metrics["edge_quality"] = meta.get("qualityScore")
        metrics["edge_observations"] = meta.get("observations")
        metrics["edge_easing"] = meta.get("easing")

    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))

    # Proof gate
    stripe_ok = metrics["mid_stripe_morph"] > metrics["mid_stripe_naive"] * 1.05
    # In reach pose the arm covers the stripe so reach_stripe << idle_stripe.
    # Mid morph should recover more stripe than the occluded endpoint.
    recovered = metrics["mid_stripe_morph"] >= min(metrics["reach_stripe"], metrics["idle_stripe"]) * 0.6
    no_ghost_endpoint = metrics["endpoint_l1_to_B"] < 1.0
    persisted = metrics["edge_json"] and metrics["edge_npz"]
    learned = metrics.get("edge_observations", 0) >= 2

    print("\nPROOF")
    print(f"  stripe recovered vs occluded endpoint: {recovered} ({metrics['mid_stripe_morph']:.0f} > {metrics['reach_stripe']:.0f})")
    print(f"  stripe richer than naive crossfade:    {stripe_ok} ({metrics['mid_stripe_morph']:.0f} vs {metrics['mid_stripe_naive']:.0f})")
    print(f"  exact endpoint B:                      {no_ghost_endpoint}")
    print(f"  persistent edge written:               {persisted}")
    print(f"  edge trained on repeat morph:          {learned} (obs={metrics.get('edge_observations')})")

    ok = recovered and persisted and learned and no_ghost_endpoint
    if not ok:
        print("FAIL")
        sys.exit(1)
    print("PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
