# Active host participation experiment

This checkpoint connects host observation, immediate authorized work, missing-information cultivation, and continuation through the existing organism registry and memory. It is a boundary experiment for the portable swarm; it does not replace its particles, DNA, grammar, resolver, qualitative rules, or embodiment engines.

## Operating behavior

A mounted `HostParticipationLoop` runs from `LivingLoop.pulse()` without waiting for a user intent. It discovers needs through a registered, host-bound `host:observe` tool. It selects a compatible executable tool from the existing GraphRuntime registry. A need with sufficient context executes under the host's standing policy without asking what to do. Explicit unresolved requirements become persistent questions. A missing contact path creates existing LivingLoop capability gaps and may be established through an authorized `host:establish-contact` tool. Establishing contact does not authorize sending a question or performing the eventual action.

Questions are sent at most once automatically. Scoped answers are retained through LocalMemory and supplied to the compatible tool on a later pulse. An inline authorized answer can continue in the same pulse. Pending questions do not block independent work. The host must expose an observation interface and effect capabilities, but does not assign a role at mount time. Host needs and questions must come from observed application contracts, not guessed intent.

The loop matches registered capability names; it does not prove semantic compatibility between arbitrary interfaces. It forwards missing-capability evidence into existing growth. Generated capability labels or generic success flags do not prove a contact path or functional host operation. A host-bound tool and a correlated receipt are required.

## Mounting and tool contract

On an applied v0.3.0 archive:

```js
unit.mountHostParticipation({
  hostId: 'story-maker',
  revision: '1',
  authorize: request => applicationPolicy.check(request),
});
await unit.pulse();
```

To move the same organism to another local host, call `await unit.unmountHostParticipation()` before mounting the next host. Unmounting prevents further effects from starting and drains existing work. The organism, constituent identities, and each host's retained context remain intact; returning to the previous host restores its scoped questions/answers.

`applicationPolicy.check` is a trusted host function, not an LLM decision or a tool declaration. It returns `{allowed: true, evidence: {source: 'standing-host-policy'}}` only for permitted operations. Denial requires no host execution. Policy must verify tool, scope, responder, and requested input; trusting a claimed responder string is insufficient. The loop checks policy anew for observe, establish-contact, ask, integrate-answer, and execute. A standing repair policy can permit routine repairs without a user prompt. Receiving an answer never grants action authority.

Tools use the existing `{toolId, provides, execute(context)}` contract. Observation/contact tools also carry `hostBinding: {hostId, revision}`. Explicit bindings to another host are excluded. Portable effect tools may be unbound but require host authorization before use. Inputs are passed through `context.inputValues`.

| Capability | Expected successful output |
| --- | --- |
| `host:observe` | `{success: true, outputValues: {observation: {hostId, revision, needs}}}` |
| `host:establish-contact` | Registers a matching host-bound `host:ask` tool and returns `{success: true, outputValues: {receipt: {hostId, revision, established: true, evidence}}}` |
| `host:ask` | `{success: true, outputValues: {receipt: {questionId, delivered: true, evidence}, answer?}}` |
| A discovered need's capability | `{success: true, outputValues: {receipt: {hostId, revision, needId, needRevision, completed: true, evidence}}}` |

A need is `{id, revision, goal, capability, requirements: []}`. Empty requirements mean act directly. A genuinely missing fact can be represented as `{key, question, choices?}` in requirements. A new meaning under the same ID needs a new revision. Completed work is retained and not repeated just because it is still listed. Removed needs are not executed from stale observations.

Answers contain `{questionId, hostId, revision, responder, value, evidence}`. A UI can call `unit.answerHostQuestion(questionId, answer)`, or the ask tool can return an inline answer. Answers must be JSON data, match any declared choices, and pass host policy. Context is keyed by host revision and need revision. Conflicting answers do not overwrite the first answer. Policy functions and executable tools are remounted on restart; they are not serialized into memory.

LocalMemory uses browser localStorage when available and swallows storage errors. Restart checks use a working localStorage fixture; retention is conditional on a working backing store and does not establish persistence in a plain Node process or across devices.

## Repairs and records

A need with `kind: 'repair'` executes immediately when its context and authority are sufficient. A repair tool may restore functionality itself or hand work to an authorized repair service. The receipt must additionally contain:

```js
{
  changes: [{target: 'app.mjs', before: 'old source', after: 'repaired source'}],
  verification: {pass: true, evidence: {source: 'functional-regression-check'}},
}
```

Only a verified repair is marked completed and added to `memory.query('host-repairs')`. The record includes the problem, host/need revisions, responsible tool, before/after changes, verification, and evidence. Generic generated success, a placeholder page, or a throwing survival stub is not accepted as functional restoration. Receipt verification is a host contract: the loop requires evidence, but cannot independently establish that an arbitrary external verifier is honest.

Unacknowledged delivery or execution is marked uncertain and not automatically repeated, including after restart. The host must reconcile the actual outcome; this checkpoint has no automated reconciliation/retry interface for uncertain effects. An authorized answer can still resolve an uncertain question. A changed host/need revision represents new work, not proof that an old effect failed.

## Particle composition and qualitative context

Action input includes `expression.field`, the existing shared composition snapshot, the existing GateProcessField snapshot, and supplied named qualities. World and page capabilities receive the same constituent IDs; host effect tools determine their field-specific realization. Photo references already present in an observed need remain references; this loop does not read, synthesize, or transmit image bytes independently.

Named qualities have `{name, dimension, source, ...}`. They retain their supplied values, address, provenance, and epistemic fields. Missing names/sources remain unresolved. This is source preservation, not a canonical quality resolver: it does not infer a person's chart, assign letters to qualities, rank innate strengths, or approve an arbitrary donor's mappings. The provided-chart test uses an illustrative fixture.

Mount this experiment only within the organism's trusted local residence. Full composition and process-field payloads can include sub-gate information. External/global delivery must use the existing IdentityBoundary hexagram projection instead; global host participation is not implemented here. See `DNA-ADDRESS-EXPRESSION-AUDIT.md` for the mechanisms and unresolved source conflicts before extending embodiment.

## Validation and remaining work

Run the reproducible targeted checks from the repository root with Node 22 or later:

```sh
node implementations/resident-composition-v0.3.0/experiments/verify-host-participation.mjs
node implementations/resident-composition-v0.3.0/experiments/audit-dna-sources.mjs
```

The first command builds a temporary verification workspace from exact overlay files and four existing donor helpers, then removes it. It does not apply the overlay to `computer/` or alter source. 33 targeted tests passed.

The targeted tests use the actual HostParticipationLoop, LivingLoop, ComplementaryGapModel, LocalMemory, NeedField, TraceableVariation, and AutoCoder, with explicit fixture host tools. They verify role-free discovery, immediate repair, contact establishment, authorization boundaries, concurrent pulses, restart, duplicate suppression, failure handling, and preservation of qualitative/composition context across fields.

The page/button case diagnoses actual missing mounts, restores existing authored definitions through AutoCoder.repair, dynamically imports the repaired module, and verifies route lookup and button behavior. It does not establish a general repair system for every GPT app, a browser rendering result, or automatic creation of unspecified page content.

The complete supplied baseline archive is absent from this workspace. Targeted tests were run using recovered donor helpers plus the overlay. The full assembly suite and SynthiaUnit initialization could not be verified: the repository does not contain the overlay's imported `state-space/state-space-foundation.mjs`. No replacement foundation was fabricated. The original source archive is still required to apply this overlay and run its full suite.

Remaining product work includes actual host observation/effect adapters, canonical source reconciliation, innate capability constraints, chart correctness, addressed qualitative channel contributions, and field-specific embodiment/rendering. No morph renderer changes are included in this experiment.
