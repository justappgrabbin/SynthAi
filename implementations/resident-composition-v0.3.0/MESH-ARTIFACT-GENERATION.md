# Addressed, source-qualified artifact generation

This checkpoint extends the existing semantic world, AutoCoder inspection, and Boolean ATO implementation. It supplies a usable assembly entry point and an authored game/app producer. It does not supply a pretrained neural model or independently invent the user's canonical mappings.

## Live entry point

```js
import { ScientificSynthiaAssembly } from './src/index.mjs';
const system = new ScientificSynthiaAssembly({
  autoStart: false,
  executionMode: 'resident',
  artifactGeneration: {
    verify: behavioralVerifier,
    // propose: javascriptNeuralProposer, // optional replacement for the authored producer
    // resolve: canonicalInterpreter,    // optional further interpretation after address validation
  },
});
const result = await system.generateArtifact({
  purpose: 'the human purpose for this output',
  kind: 'game',
  source: { address: completeOrganismAddress, experience: authoredExperience },
  // analogy: sourceQualifiedAnalogy,
  // parentId: previousGenerationId,
});
await system.close();
```

The assembly accepts only a complete existing 13-part organism address before proposing an artifact, including when a custom interpreter is provided. This validates the existing schema; it does not establish missing semantic correspondences. The active world and identity are captured in generation context. The injected proposer and verifier can support other artifact kinds; output kinds are not restricted at the orchestration boundary. Mounting requires a verifier and cannot silently replace an already mounted generation session.

`MeshAnalogyContext` requires an explicit source id/revision, an explicit operator, ordered unique features with meanings for both zero and one, and A/B/C examples in that same feature space. It reuses the recovered `completeAnalogy` and `retargetPlan` operations. It records the operator, derived vector, meanings, matching candidates, and optional transformed plan. Exact matches remain unique, ambiguous, or unmapped. Nearest-neighbor labels are not promoted into meanings; binary vectors are not converted to canonical gates.

## Functional authored outputs

`BehaviorArtifactProducer` compiles a supplied finite behavior graph into a portable JavaScript module and a self-contained HTML experience. A graph declares its initial state, unique labeled states, and actions with existing target states. All declared states must be reachable. The generated runtime preserves identity, rejects unavailable actions, and retains transition history. Its HTML uses the same runtime and renders authored labels with textContent, keeping authored text distinct from executable source.

The experience can come directly from the request, or from an explicitly supplied, uniquely matched analogy candidate. Missing or ambiguous experience mappings remain held. Game and app are the first supported authored output kinds. This compiler supplies no automatic neural inference, fullscreen swarm world renderer, physics, arbitrary-condition gameplay, asset generation, video encoder, or universal aesthetic. Existing donor producers remain intact.

## Lifecycle and evidence

Each generation has a persistent UUID, source/context snapshots, parent id, lifecycle, actual proposed files, and verification evidence. Unresolved interpretations and held producer responses stop before verification. Only passing verification with evidence asserts a GENERATED fact into the semantic world. Failed and unverified descendants leave verified parents unchanged. Reload marks in-flight records interrupted without replaying execution. Request data is copied before asynchronous work, and concurrent calls on one generator retain distinct identities.

The verifier must supply behavior checks and any execution isolation appropriate to the proposer. The coordinator itself does not run unknown proposed source. The example executes its own authored JavaScript; it is not an isolation mechanism for arbitrary generated code. No files are automatically deployed or added to the execution registry.

## Review and validation

`examples/authored-mesh-generation.mjs` exports `generateAuthoredExample()`, which returns actual files and a verified crossing/return history from the live assembly. Its coordinate is an explicit fixture, not an inferred life reading. A generated copy is available locally at `/workspace/assembly-audit/generated-crossing-demo/index.html` with `game.mjs` and `evidence.json`.

- `npm test`: assembly and existing regression suite, plus five generation tests.
- `node components/organism/tests/mesh-artifact-generation.mjs`: standalone generation compatibility.
- `node components/organism/tests/klein-primary-source-examples.mjs`: published ATO examples.

New checks execute generated game/app modules, exercise generated HTML buttons in a DOM harness, verify authored-text escaping, preserve identity, reject invalid graph targets/unreachable states, hold incomplete addresses and ambiguous mappings, reject evidence-free success, restore interrupted history, and preserve distinct concurrent calls. HTML has not been verified in a graphical browser during this checkpoint.

Next integration work includes a real JavaScript neural proposer, the remaining canonical semantic mappings/Gemini rendition, additional output producers, and the richer world presentation. These boundaries remain explicit rather than substituting template generation for trained neural behavior.

## Address-before-interaction checkpoint

Introductions now retain a complete canonical address binding. Explicit `inheritAddress: true` can bind generated files, experience states/actions, and world objects/actions to an already addressed parent. Partial introductions retain diagnostic records; they cannot execute or appear as interactive symbol compositions. Restored symbol records are revalidated. Complete composition addresses are supplied explicitly rather than inferred from constituent addresses. Existing occurrence identity and shared membership remain intact.

`MandalaMeasure.mjs` measures supplied gate origins using exact quarter-angular-second ticks, refining Gate → Line → Color → Tone → Base and reconstructing the original position including its residual. Gate width is 20,250 angular seconds, with subdivisions 6/6/6/5. Boundary tests cover Gate 3's Aries/Taurus crossing and start-inclusive/end-exclusive intervals. Source id/revision are mandatory. The utility does not resolve contradictory gate origins, infer planetary/house context, or equate the legacy `arc` field with angular seconds.

Reduction investigation located existing finite-state machines and sequential/parallel/Kleene automata composition in `components/execution-spine/src/pure-synthia/experiments/scale/`. The ingestion compiler's five fields are shared, knowledge, causal, dependency, and stateSpace; these are not the five resonance dimensions. Primitive extraction and retained-byte reconstruction already exist, but neither establishes a universally minimal behavioral machine or dimension-preserving scaled execution. That integration remains outstanding; no automatic prime factorization or unverified scaling formula has been introduced.

Validation at this checkpoint: 24 root tests pass, standalone generation and published Klein analogy checks pass, and the addressed crossing example has been regenerated with passing behavior evidence.

## Verified behavioral reduction

`AutomataReduction.mjs` now builds a deterministic qualitative quotient using the existing execution-spine FSM classes. Partition refinement retains authored state qualities, effective addresses, action qualities, action availability, and future transitions. It produces the smallest quotient under that observation contract, not a universal primitive ontology or numeric prime factorization. No resonance dimension is assigned from an execution field.

Every original state has a projection into a reduced state and a retained lifting membership. Exhaustive finite transition obligations certify qualitative deterministic bisimulation, covering arbitrary-length action traces by induction. Original definitions remain available for reconstruction. `createReducedSession()` runs reduced transitions and lifts them back to original identities after checking full introduction addresses. Generated game/app modules now execute the same reduced-transition check before their original-state transition. Proposal records retain the complete work-up, partition rounds, ratio, reconstruction definition, and verification obligations.

Tests demonstrate a two-state cycle executing as one primitive while reconstructing alternating original identities, and initially similar states separating when future outcomes differ. This is behavioral state reduction; numerical quantity rescaling and the cross-resonance-dimension work-up remain separate outstanding work.

Current validation: 26 root tests pass. This corrects the previous 24-test claim: its newly appended world-boundary fixture lacked required state/transition fields. The fixture now supplies valid structural fields so it checks the intended missing-address boundary.
