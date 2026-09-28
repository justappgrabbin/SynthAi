# Synthia v0.5.6 — Movement Transport + Temporal Experiential Mesh

v0.5.6 continues directly from the canonical v0.5.5 relational-algebra checkpoint.

Live Movement transport:

`binary ↔ decimal ↔ hex`

The transport runtime preserves one numeric identity while changing representation. Direct binary-to-hex and hex-to-binary movement traverses the decimal representation in sequence. Gate transport preserves the six-line Gate topology and its Fu Xi numeric identity.

Live temporal path:

`calculated historical coordinate → first visit → landed historical state → stable recall → optional present/past superposition → transferable structural mesh trace`

Rules implemented:

- A historical coordinate with no personal landing is resolved on first visit from the calculated target address, the visiting agent's current landed state, accumulated experience/relationship identifiers, available mesh traces, and supplied context.
- The first landing is fixed to that historical coordinate for that agent.
- Later visits return the same historical state instead of resolving it again from later experience.
- Present and historical states remain separately addressable when superimposed.
- Superposition exposes combined machine-readable Color, Tone/Sound, Base/Form, and Gate positions while preserving the component states.
- Each personal historical landing contributes a transferable structural trace to the experiential mesh.
- Mesh traces can inform later first visits without replacing the later agent's own personal landing.
- Exact-coordinate mesh traces and structural address matches remain available separately.
- Temporal landings, traces, events, and superpositions persist through the existing runtime store.

High-level runtime surfaces:

- `FederatedSynthia.visitPast(...)`
- `FederatedSynthia.superimposePast(...)`
- `FederatedSynthia.temporalMesh(...)`
- `SemanticGenome` operations: `movement-transport`, `historical-visit`, `historical-recall`, `temporal-superposition`, `temporal-mesh`, `temporal-mesh-ingest`, `temporal-mesh-export`, `temporal-snapshot`, and `temporal-export`.

The morph engine is not hard-coded into this release. v0.5.6 exposes the temporal superposition and Movement transport state so the actual morph runtime can consume them next.
