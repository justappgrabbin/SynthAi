// Live promotion surface. The implementations remain byte-for-byte in the
// preserved execution-spine authority and are exported into the live system.
export {
  Primitive,
  Composite,
  ScaleOperator,
  ScaleDerivation,
  newBenchmarkLedger,
  replayDerivation,
  replayMatches,
  stableStringify,
  fnv1a32,
} from '../../vendor/execution-spine-v0.4.0/src/pure-synthia/experiments/scale/core.js';
