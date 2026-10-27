# Goal refinement donor: Prompt-based Evolutionary Neural Iteration System

## Provenance
User-provided original archive in Google Drive:
https://drive.google.com/file/d/1-kEoJoBYcOGOa-HyqpxW8fq6RRqy3o9r/view?usp=drivesdk

Original ZIP name: `Prompt-based-Evolutionary-Neural-Iteration-System-master.zip`.
Inspection date: 2026-10-27. The original ZIP is **not modified** by this integration.

## What was retained and what was not

Retained the underlying six-stage algorithm from `src/orchestrator.py`:
1. Define required elements for a goal.
2. Propose a candidate using previous-iteration feedback.
3. Execute the candidate through a chosen provider.
4. Evaluate each requirement from real output.
5. Record per-iteration evidence, score and failure notes.
6. Stop on acceptance or a bounded iteration count.

Implemented this as `computer/services/evolutionary-iteration.mjs`; registered in
`ComputerRuntime.boot()` as `computer.evolutionary` and service
`evolutionary-iteration`. The already-installed `ExperimentLoop` (formal
hypothesis lifecycle and replication) remains separate and unchanged. A
candidate accepted by an evaluator is **not** proof that a scientific
hypothesis is supported.

Excluded the original adult-video prompts, ComfyUI workflow, OpenAI and
Replicate bindings, and adult-media assets: those are application-specific.
They remain in the untouched source archive, not copied into the Computer.
The new optimizer is not a trained neural network and is not an LLM. It is a
reusable, explicitly invoked orchestration contract.

## Execution contract

```js
const result = await computer.evolutionary.optimize({
  id: 'world-motion-test-001',
  goal: 'Make the character respond to keyboard input',
  requirements: [
    { id: 'movement', description: 'Position changes after control input' }
  ],
  maxIterations: 4,
  propose: async ({ iteration, history }) => {
    // Existing approved model-maker, automata, or human proposal provider.
    // No provider is guessed or invoked automatically.
    return { attempt: iteration, prior: history.at(-1)?.checks ?? null };
  },
  execute: async (candidate) => {
    // Explicitly authorized sandbox test or existing Computer executor.
    // Implement real execution; never return an invented success.
    return runCharacterMovementTest(candidate);
  },
  evaluate: async ({ output }) => ({
    checks: { movement: output.movementVerified === true },
    notes: output.trace ?? ''
  })
});
```

Required boolean checks cannot be omitted. Only if **every** requirement is
true and the score meets `successThreshold` can a run be accepted by its
caller-supplied evaluator. The service never authorizes tools, performs
deployments, or modifies applications by itself. The caller retains
responsibility for API authorization, sandboxing, timeouts, quotas, cost,
evaluation quality, and safeguarding any secrets in outputs. The service
emits `evolutionary:started`, `evolutionary:observed`,
`evolutionary:finished`, and `evolutionary:failed`, and stores checkpoints
in Computer state under `computer.evolutionary.<run-id>`.

## Donor issues found in the original Python archive

- The CLI and orchestrator spell `replciate`, so the advertised `replicate`
  selector does not match the actual branch.
- Prompt instructions request resolutions up to 720×1280, but
  `chatgpt_utils.py` clamps both dimensions to 512.
- `evaluation.py` declares PNG frame bytes as `image/jpeg` data URLs.
- Model-based visual evaluation alone is not independent verification.
- "Local ComfyUI" still depends on remote OpenAI prompting and evaluation.
- The configured `iterations.success_threshold` is not used in the
  orchestration stop condition.

## Status and next connection

Unit tests exercise real callback execution, retries, strict validation,
checkpoint writes, and failure handling. Computer registration has a boot
test. This merges a **usable optimization service** into the existing
Computer architecture; it does **not** claim automatic coding agents, trained
video models, or a finished chat/workspace UI. Wire a specific existing
executor and an independent evaluator before offering a user-facing button.
