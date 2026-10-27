# Synthia's weights — provenance and non-destructive checkpoint protection

## Two genuinely distinct weight systems

1. **Synthia Computer resident (current):** `computer/services/synthia-resident.mjs`.
   Trainable online 96-feature input × 16-hidden inference network with task heads,
   supervised `teach()` and local Computer `StateStore` persistence at
   `computer.synthia.resident.v1`. It is a task/intent learner, NOT an LLM.
2. **Simlish Neural Language Contact Model (separate source):**
   [`justappgrabbin/Simlish`, branch `neural-language-contact-model`](https://github.com/justappgrabbin/Simlish/tree/neural-language-contact-model/language-contact-model).
   Actual tracked trained binary: [`artifacts/multimodal-contact-model.npz`](https://github.com/justappgrabbin/Simlish/blob/neural-language-contact-model/language-contact-model/artifacts/multimodal-contact-model.npz)
   (47,134 bytes, Git blob SHA `2ddbe7b25c43d253b8a682cb39b2015806ff27fb`).
   Independent recurrent NumPy model with 24-hidden state, learned movement/speech/sign
   projection encoders, task heads and history-based correction. Its loader uses
   `np.load(..., allow_pickle=False)` and validates parameter shapes and finite values.
   The source includes a model card, dataset lineage and benchmark reports.
   It is **not currently connected to the SynthAi Computer** in this PR.
   Speaker classification in a nine-person limited corpus ≠ speech recognition or an LLM.

Do not substitute one set of weight tensors for the other. Their names, input
representations, dimensions, training objectives and persistence formats differ.

## Problem fixed in this PR

Previously, the resident's `NeuralInferenceGraph(saved)` validated only
whether the saved top-level matrix had 16 rows. A bad row, nonfinite number,
missing bias or corrupted head could be adopted, and an incompatible layout
could silently fall back to freshly initialized weights.

The new pure-JS `validateSavedSynthiaInference(saved.inference)` is executed
**before** loading the checkpoint into the resident. It validates 16×96
numeric finite weights, all 16 hidden bias values, each task head's 16
weights and bias, and training example counts.

On invalid saved state, `SynthiaResident.boot()` throws, emits a sanitized
`synthia:weights-rejected` event, and **does not save or overwrite** the
original checkpoint. An operator should restore from a previous trusted backup
or inspect corrupted state offline; there is NO automatic reset or migration.
First boot with no saved checkpoint remains unchanged.

## Read-only host audit

This PR does **not** access your Linux machine or its private
`computer/runtime/data/local-computer/state.json`. That path is normally
ignored by Git and may contain private conversation history.

Use the separately delivered `synthia_weight_audit_20261027.zip`, which
contains a read-only Python 3 script and three local unit tests. It reports
the saved Computer JSON model structure or NumPy NPZ structure, counts and
SHA-256 without printing conversation data or weight values. Example:

```bash
python3 audit_synthia_weights.py --state computer/runtime/data/local-computer/state.json
python3 audit_synthia_weights.py --npz /path/to/Simlish/language-contact-model/artifacts/multimodal-contact-model.npz
```

If a file isn't present in the path checked, this is NOT evidence that no
trained weights exist elsewhere. Before training or migrating, stop any
service writing state, back up both original files separately to encrypted
private storage, record SHA-256, and validate recovered checkpoints.

## Verification boundaries

CI synthetic tests cover valid restart preservation, corrupt row rejection,
NaN/Infinity rejection, task head mismatch, and no checkpoint overwrite.
They do **not** prove that the real Linux host's weights are valid or that
Simlish's NPZ is the intended special architecture. Neither weight system
is replaced by Ollama or an externally downloaded generative model.
