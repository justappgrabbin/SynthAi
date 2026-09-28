export const MORPH_CHARTER = Object.freeze({
  identity: 'Morph changes Cynthia\'s embodiment and expression, never her continuous identity.',
  sequence: Object.freeze(['preserve-original','interrogate','analyze','derive-address','plan-descendant','sandbox','verify','request-binding-approval','retain-corrections']),
  invariants: Object.freeze([
    'anything perceptible may enter as a candidate source',
    'the original and provenance remain immutable',
    'addressing follows interrogation and analysis',
    'identity continuity is measured across generated scenes',
    'repository descriptions are claims rather than runtime evidence',
    'modifications are versioned descendants',
    'local execution is preferred when the device is capable',
    'sovereign backend is an optional heavy-work extension',
    'external binding actions require owner review',
    'corrections strengthen later morphs'
  ]),
  modes: Object.freeze({
    media: Object.freeze(['photo','artwork','video','3d-asset','game-file']),
    repository: Object.freeze(['code','assets','documentation','dependencies','tests','commit-history']),
    expression: Object.freeze(['character','tool','interface','game-object','workspace','document','embodied-guide','interactive-application'])
  })
});

export const MORPH_CAPABILITIES = Object.freeze({
  media: Object.freeze(['sensory-ingestion','identity-embedding','appearance-transform','pose-expression-control','animation','sprite-export','texture-export','model-export','scene-export','game-component-export','identity-consistency-verifier']),
  repository: Object.freeze(['repository-reader','dependency-inspector','test-runner','crash-runner','architecture-mapper','runtime-translator','descendant-builder','deterministic-replay','performance-comparator','playable-build-verifier','pattern-retention']),
  expression: Object.freeze(['continuous-identity','form-composer','interface-generator','browser-hand','permission-bridge','review-gate'])
});
