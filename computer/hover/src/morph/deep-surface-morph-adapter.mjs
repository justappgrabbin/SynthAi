export const DEEP_SURFACE_MORPH_PIPELINE = Object.freeze([
  'PoseMatcher',
  'LandmarkRegistrar',
  'SkeletonMeshBuilder',
  'MotionEstimator',
  'JointInterpolator',
  'OpticalFlowRefiner',
  'OcclusionDetector',
  'SurfaceCompleter',
  'SecondaryMotionSolver',
  'FrameValidator',
]);

export function createDeepSurfaceMorphAdapter({ engine = null, MorphEngineLib = globalThis.MorphEngineLib } = {}) {
  const runtime = engine ?? (MorphEngineLib?.MorphEngine ? new MorphEngineLib.MorphEngine() : null);
  if (!runtime || typeof runtime.registerState !== 'function' || typeof runtime.morph !== 'function') {
    throw new Error('deep surface morph runtime unavailable');
  }
  return Object.freeze({
    id: 'deep-surface-morph',
    pipeline: DEEP_SURFACE_MORPH_PIPELINE,
    async morph({ packet, sourceSurface, targetSurface, options = {} } = {}) {
      runtime.registerState(sourceSurface);
      runtime.registerState(targetSurface);
      const output = await runtime.morph(sourceSurface, targetSurface, options);
      if (output && typeof output === 'object') {
        return { ...output, canonicalMorphPacketId: packet?.id ?? null };
      }
      return { output, canonicalMorphPacketId: packet?.id ?? null };
    },
  });
}

export default createDeepSurfaceMorphAdapter;
