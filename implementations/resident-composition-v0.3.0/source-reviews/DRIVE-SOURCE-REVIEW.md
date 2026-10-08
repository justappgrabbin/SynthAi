# Supplied archive review

All four supplied Drive archives were downloaded, hashed, and extracted separately with path checks. Archive hashes and source URLs are in `drive-archives.json`. Originals remain separate from the resident-composition overlay. No package has been mounted or represented as a verified integrated capability.

| Archive | Inspected contribution | Integration disposition |
|---|---|---|
| Synthia v0.5.5 relational patch | 16 Boolean operators, directional structures, R(A,B) third-state history, endpoint-presence channel AND, 121-value structural neural vector | Preserve donor semantics; needs canonical v0.5.3 base and full-address admission adapter |
| Predictive Memory v0.1 | Manual JavaScript VQ learning, chained semantic completion, episode recall, prediction/outcome calibration | Real trainable code exists; schema adaptation, outcome comparison repair, resolution safeguards, and persistence needed before mounting |
| Axion magnetic resonance | Physical axion/photon coupling matrices, unit conversion constants, propagation equations, domain/noise scans | Python scientific reference; a JS implementation needs explicit physical units and numerical validation. No supplied mapping establishes equivalence with symbolic resonance dimensions |
| Color analysis tool | OKLab/OKLCh perceptual math, deterministic clustering, CIEDE2000 merging, gamut handling, contrast and design-token output | Python color reference for an eventual JS visual instrument; canonical Color coordinate is not automatically an RGB or OKLCh value |

## Verified findings

- Predictive memory's supplied `node predictive-semantic-learning.test.js` passes on the extracted archive. Its neural parameters initialize with `Math.random()`; this single passing run does not establish reproducibility despite README/test descriptions calling the test deterministic.
- A direct outcome check reproduces a defect: `compareOutcome({result:{value:1}}, {result:{value:2}})` reports correct with score 1. The top-level-key JSON replacer also filters nested keys. This can reinforce a false outcome match.
- Predictive memory uses nine zero-based categorical fields: dimension/center/gate/line/color/tone/base/sign/house. Base has six categories; the resident canonical Base range is five. Planetary, DMSA, and other full-address context are absent from this neural encoding. Keep the donor schema explicit; do not shift indices or discard fields silently.
- `resolve()` permits repeated resolution of one prediction, recalibrates even without a comparable observation, and accepts absent evidence. Its fixed score threshold and learning/decay constants are donor choices, not canonical qualitative laws.
- The memory snapshot contains traces, not a serialization of the trained model/codebook or predictive loop state. Reconstruction after restart requires additional persistence support.
- Relational patch test cannot boot standalone: missing `vendor/pure-synthia-v0.4.0/src/synthia/swarm/bootstrap.mjs`. Static inspection finds 81 missing relative import occurrences, recorded separately. The patch manifest expressly requires the v0.5.3 DNA/RNA/Protein checkpoint, which was not found in the current workspace search.
- The relational donor distinguishes canonical endpoint presence from bitwise AND, preserves asymmetric direction, leaves intensity unassigned, and leaves rendered color/frequency/geometry unassigned. Preserve these distinctions.
- Relational runtime history is bounded and event sequence is based on retained history length. Persistent append-only identity history must be supplied by the host before adopting that event logic.

## Coverage and next integration order

Read the four top-level READMEs, relational design/patch docs, relational runtime, predictive loop and memory implementation sections, predictive test, axion coupling/unit equations, and package metadata. This is a targeted source review, not exhaustive verification of the physics, color methods, neural training, or federation runtime.

1. Repair predictive outcome comparison and guard one-time evidence-bearing resolution in a derived integration layer, retaining donor originals and provenance.
2. Bind predictive inputs/outputs to full addresses through an explicit schema mapping and persist model state. Predictions remain candidates until observed verification.
3. Recover the v0.5.3 base, then test the v0.5.5 overlay on its intended lineage. Port verified relational primitives additively into the resident system without replacing its engine.
4. Keep physical numerical scaling and perceptual color rendering as named instruments with explicit units/mappings and separate validation.

The new sources support extending the architecture. They do not yet establish the complete dimension-preserving reduction/scaling/reconstruction path.
