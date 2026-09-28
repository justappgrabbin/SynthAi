# Baseline Acceptance Audit

**Captured:** 2026-09-19, before acceptance-criteria repairs  
**Audited build:** `synthia-integrated-automata` v0.5.1  
**Purpose:** preserve and evaluate the previously handed-off build without relying on its completion claims

## Preservation checkpoint

The complete pre-audit working tree was preserved at:

`backups/Synthia-Integrated-Automata-v0.5.1-pre-acceptance-audit.tar.gz`

SHA-256:

`984fc76af47b1989cb5ec38a2ad4ee2aa745be1d2571fa3bc1d1899fcb1d9368`

No source authority was removed or rewritten. The six original ZIP archives and
their extracted vendor trees remain present.

| Original authority | SHA-256 |
|---|---|
| SynthAI Exact Address Recall PATCH | `feb74171d99a011307f8b497247ae732e02fd9cbdc0f0e32aea9d65444f23468` |
| synthia-core v1.0.0 | `22944ae853ca73dc7ac5c1b9cdf06af6e560b7dab6140975b3df3f610a5d7095` |
| Synthia Codex Provider Runtime v0.1.1 | `1def70a163b159a05851465b0cdec49b4c62a2356b1ec4e526554cbbbc91e9c0` |
| Pure Synthia Trainable Assembly v0.4.2 | `cee899ef720a0e1776f525c959b6e12404a74dd3b4547da7caf34dff5febcc46` |
| Synthia Universal Execution Spine v0.4.0 | `4b407881be4324860d09e3c743b5d518d35b8f0daa0831545a6c7e2b3c62c6af` |
| Kimi Agent Automata State Space Merge | `fa3344dac6f8c4b2e838b9146ca5c6d339e1fc4ec0bb7aa15c3259724beff3fd` |

Baseline inventory: 34 integration source files, 10 integration test files,
895 preserved vendor files, and 6 immutable source archives.

## Unchanged baseline test result

Command: `npm test`

Exact result: **28 passed, 0 failed, 0 skipped, 0 todo** in
45,849.094347 ms.

This result is retained as baseline evidence only. It does not establish that
every prior completion claim is valid. In particular, the old genome test
explicitly requires only thirteen total chart placements.

## Preliminary evidence states

These states describe the build before repairs. They will not be upgraded
without an end-to-end observation satisfying the ten wiring criteria.

| Major component | Baseline state | Evidence / limitation |
|---|---|---|
| Immutable source authorities | VERIFIED | Six archive hashes were recalculated and matched. |
| Promoted primitive system and sealed D1/D2/D3 results | VERIFIED | Baseline suite reproduced all sealed fields with zero mismatch. |
| Primitive execution analysis | VERIFIED | Baseline tests observed distinct internal, hybrid, and external paths. |
| Seven-stage chat pipeline | VERIFIED | Baseline tests observed seven ordered consuming stages and a ScientistLoop experiment. |
| Mesh-of-meshes runtime transfers | VERIFIED | Baseline tests observed transfer consumption receipts across organism, center, and channel paths. |
| 64-codon / 768-aspect shared genome | VERIFIED | Runtime constructed 64 codons and 768 stable aspect identities; projections share identity objects. |
| Five-dimensional agent chart | PARTIALLY WIRED | The runtime projects the genome through five dimensions, but chart registration treats the 13 planets as ordinary placements carrying one selected dimension. The confirmed model requires 13 planetary filters operating through five dimensional frames. |
| Agent-chart persistence | PRESENT | Charts exist in an in-memory `Map`; no durable reload path was found in the integration runtime. |
| Genome front-screen controls | PARTIALLY WIRED | The UI reaches the live API, but saves only one selected address into the 13-record model and does not expose/verify all five dimensional frames. |
| Planetary-filter behavior | PRESENT | `planetary` participates in a numeric hash/modulation, but no first-class filter is instantiated and no filter output or downstream punctuation effect is exposed. |
| Exact fine-coordinate model | PARTIALLY WIRED | Minute and Second are numeric, but Degree is stored as an invented `5-of-29` object and Arc is stored as `arcAxis` 1–99. The confirmed agent model is Degree 0–31, Minute 0–59, Second 0–59, and Arc 0–99. |
| Integrated Linux persistence | PARTIALLY WIRED | The preserved Pure Synthia donor contains `FileCheckpointStore`, but the delivered front screen constructs the organism with `MemoryCheckpointStore`; proposal, science, exact-recall, cultivation, routing, and genome state are also integration-local memory. |
| Previous completion documentation | PRESENT | Reports exist, but use `Complete`/`Implemented` labels and overstate five-dimensional charts and persistence. They require correction after verification. |

## Known false-positive audit checks

The previous `wiringAudit()` reports `fullAgentAddressPreserved: true` when a
single primary address has 13 fields. It does not check that all five
dimensions participate through all 13 planetary filters. It also reports
`persistentAgentCharts: true` when an in-memory chart exists; it does not test
restart persistence. These checks must be strengthened before they can be used
as completion evidence.

## Confirmed address hierarchy

The authoritative agent state-space hierarchy supplied during this audit is:

`13 planetary filters → 5 dimensions → 64 gates / 36 channel relations → 6 lines → 6 colors → 6 tones → 5 bases → degree → minute → second → arc → zodiac → house`

Planetary values are filters or punctuation-like phase controls—not additional
dimensions and not extra genome identities. The fine ranges are Degree 0–31,
Minute 0–59, Second 0–59, and Arc 0–99. The earlier representation remains
preserved as compatibility provenance but is not sufficient as the live
agent-chart model.

## Audit rule

The status vocabulary for the repaired report is limited to:

- `PRESENT`
- `PARTIALLY WIRED`
- `WIRED`
- `VERIFIED`

File or schema existence alone cannot produce `WIRED` or `VERIFIED`.
