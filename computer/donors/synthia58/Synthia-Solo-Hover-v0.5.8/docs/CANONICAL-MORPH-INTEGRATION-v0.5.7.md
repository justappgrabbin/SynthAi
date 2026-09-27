# Canonical Morph Integration v0.5.7

## State boundary

The morph boundary consumes the existing Synthia resolved activation without replacing its address or flattening it into a donor schema.

The morph packet carries:

- full canonical address
- resolved state
- structural vector
- sensory expression
- translation, genotype, phenotype
- Movement transport
- matching relationship state and Klein structure
- temporal superposition
- supplied experiential-mesh evidence
- latest machine-native perception for the same agent
- environment context
- source and target surface descriptors

## Surface boundary

A render endpoint is a named landmark surface. The deep-surface adapter passes the source and target surfaces to the preserved Morph runtime.

Browser runtime stages:

`PoseMatcher → LandmarkRegistrar → SkeletonMeshBuilder → MotionEstimator → JointInterpolator → OpticalFlowRefiner → OcclusionDetector → SurfaceCompleter → SecondaryMotionSolver → FrameValidator`

The preserved Python reference engine additionally contains the full geometry reference pipeline and persistent trainable transition-edge implementation.

## Integration surfaces

```js
const packet = synthia.morphState({
  sourceSurface,
  targetSurface,
  superposition,
  meshEvidence,
  environment,
}, { personId, agentId: 'synthia' });
```

Browser rendering can attach the preserved deep-surface runtime once and then use the canonical execution path:

```js
const renderer = createDeepSurfaceMorphAdapter();
synthia.attachEmbodimentRenderer(renderer);

const result = await synthia.embodimentMorph({
  sourceSurface,
  targetSurface,
  superposition,
  meshEvidence,
  environment,
}, { personId, agentId: 'synthia' });
```

The same renderer can be supplied as `morphRenderer` when `FederatedSynthia` is created. In a browser where `MorphEngineLib.MorphEngine` is already loaded, the deep-surface adapter is attached automatically.
