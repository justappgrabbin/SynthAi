# Morph Engine

State-node sprite interpolation via **persistent, trainable transition edges**.

UI is secondary. The executable test is `demo.py`.

```
python3 demo.py
```

Expected result: `PASS`, plus contact sheets in `output/`.

## Call shape

```python
from engine.pipeline import MorphEngine
from engine.character import render_character, pose_idle, pose_reach

engine = MorphEngine(edge_dir="edges")
a = engine.register_state(render_character(pose_idle(), "idle"))
b = engine.register_state(render_character(pose_reach(), "reach"))

frames = engine.morph(a, b, frames=8, learn=True, easing="smoothstep")
# [stateA, f1..f8, stateB]
```

## Pipeline

```
PoseMatcher → LandmarkRegistrar → Skeleton/MeshBuilder
  → MotionEstimator → JointInterpolator → MeshWarper
  → OpticalFlowRefiner → OcclusionDetector → SurfaceCompleter
  → SecondaryMotionSolver → FrameValidator
```

Primary appearance at time `t` is **not** a pixel crossfade. Joints interpolate with an easing curve; each bone is a similarity-warped canonical part texture; layers composite back-to-front (`arm_r` last). The torso stripe therefore continues to exist while the arm slides across it — that is the disocclusion path.

## Persistent edge

Each `fromState → toState` pair is an object stored as `edges/{from}__{to}.json` + `.npz`:

```
fromState, toState, duration, easing,
landmarkMapping, motionField, jointTrajectories,
deformationParameters, visibilityMasks, secondaryMotion,
learnedCorrections, qualityScore, observations
```

Re-running `morph(..., learn=True)` on the same pair loads the edge, blends a residual correction, and bumps `observations` / `qualityScore`.

Neural nets are optional and local. Geometry is the source of truth.

## Layout

```
engine/     core modules
sprites/    generated endpoint PNGs
edges/      persistent transition edges
output/     frames, contact sheets, metrics.json
demo.py     executable transition test
```

## What the test proves

- Distant poses (`idle` arms-down vs `reach` arm-across-chest) produce a continuous sequence.
- Mid-frame chest-stripe pixel count beats a naive RGBA crossfade (reconstruction vs dissolve).
- Endpoints are exact copies of A and B.
- The transition edge is written and updates on a second generation pass.
