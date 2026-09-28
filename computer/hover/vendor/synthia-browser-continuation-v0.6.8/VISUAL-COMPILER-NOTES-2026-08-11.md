# Synthia v0.6.3 — semantic visual primitives

Parent: v0.6.2 semantic behavior compiler.

## New compiler layer

`src/runtime/VisualPrimitiveCompiler.{js,ts}` turns grounded visual language into a deterministic visual specification and executable renderer files. No LLM/API call is used.

Primitive vocabulary in this checkpoint:

- medium: image / video
- shape: circle / triangle
- count
- color
- glow
- spatial relation: above / below
- raster dimensions
- timeline duration / FPS
- x-position motion
- linear / smoothstep interpolation
- PNG raster encoding
- WebM encoding through a capability boundary

PNG generation is dependency-free Node code using built-in `zlib`. Video rendering uses the same deterministic PNG frame renderer, then hands frames to a local ffmpeg encoder when available. A browser `MediaRecorder` WebM renderer is emitted as the phone/browser fallback.

## Acceptance proofs

Image intent:

> Create a 512×512 image containing a glowing gold circle above three dark triangles.

Produces a real 512×512 RGB PNG.

Video intent:

> Create a five-second video of a red circle moving smoothly from the left edge to the right edge.

Produces 150 deterministic frame states at 30 FPS and a 5.000-second VP9 WebM when ffmpeg is mounted.

## Architecture boundary

This is procedural visual compilation, not photorealistic generative synthesis. The semantic/visual spec is intentionally renderer-independent so existing Synthia media-renderer, MRNN, Canvas, WebGL, WebGPU, or future image/video models can consume the same visual plan.
