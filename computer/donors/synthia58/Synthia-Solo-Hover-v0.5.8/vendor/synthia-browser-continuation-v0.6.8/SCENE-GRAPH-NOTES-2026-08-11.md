# Synthia v0.6.4 — Scene Graph + Renderer Routing

## What changed

v0.6.4 extends the deterministic semantic/visual compiler with a renderer-independent scene graph.

New runtime components:
- `src/runtime/SceneGraphCompiler.js` / `.ts`
- `src/runtime/RendererRouter.js` / `.ts`
- `src/runtime/SceneGraphCompiler.test.js`
- `src/scene-orchestrator-smoke-test.js`

`SemanticArtifactCompiler` now gives scene semantics priority over the v0.6.3 primitive visual compiler when scene vocabulary is present.

## Scene graph model

The graph can represent:
- entities and geometry
- materials
- spatial relations such as `behind`
- environment / lighting state
- camera state and motion
- timeline tracks
- requested output medium
- required renderer features

Acceptance intent:

> Create a five-second video where a gold sphere rises behind a mountain at sunset while the camera slowly pans right.

Compiled result includes:
- gold glowing sphere entity
- mountain entity
- `behind(sphere-1, mountain-1)` relation
- sunset gradient environment
- sphere Y-position timeline
- camera X-pan timeline
- 5 seconds at 30 fps

## Renderer routing

`RendererRouter` chooses a renderer from declared scene features.

For the acceptance scene all requested features are supported locally, so the selected route is:

`procedural-raster`

Fallbacks are retained as:
- `host-graphics`
- existing ATO `media-renderer` automaton

Every scene artifact also emits `media-composition.json`, so richer renderers can consume the same scene graph without changing semantic parsing.

## Execution proof

The acceptance scene was compiled through GraphRuntime and rendered as a real VP9 WebM:
- 640 × 360
- 30 fps
- 5.000 seconds
- 150 frames

Visual inspection confirmed:
- sphere begins occluded behind the mountain
- sphere rises into view
- mountain remains in front due relation/draw order
- camera pan changes projected world position
- sunset environment is rendered as a vertical gradient

## Regression status

`npm run verify` passes:
- runtime smoke
- semantic/orchestrator smoke
- v0.6.3 primitive image/video smoke
- v0.6.4 scene smoke
- full Node test tree

Final full test result: **118 passed / 0 failed**.

## Boundary

This is not photorealistic generation. It is the deterministic scene-composition layer that can route the same semantic scene to progressively richer renderers (Canvas/WebGL/MRNN/AutoNova/image or video models) without changing the scene-understanding representation.
