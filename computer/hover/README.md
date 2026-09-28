# Synthia Solo Hover v0.5.8


v0.5.8 places the canonical v0.5.7 organism inside the Solo Hover shell. Synthia's persistent body is the small planet. Tapping it opens a radial Browser / Chat / World / To Do / Build launcher; every surface uses the same organism, history, canonical state, and morph runtime.

The Browser surface uses the preserved browser-hand CDP executor for live navigation, inspection, coordinate clicking, approved field filling, screenshots, history navigation, reload, and separately confirmed form submission. Build embeds the preserved Foundry surface. World reads the same canonical organism state. To Do persists locally with the organism. The shell itself is transparent so a Linux host/compositor can present it as a floating surface.

See [`docs/SOLO-HOVER-v0.5.8.md`](docs/SOLO-HOVER-v0.5.8.md). v0.5.7 remains the canonical morph/state substrate underneath this shell.


v0.5.7 wires the canonical Synthia state directly into the surface-morph boundary. The morph packet preserves all 13 address fields, resolved state, translation, relationship/Klein context, temporal superposition, mesh evidence, and machine-native perception. The renderer adapter consumes real source/target landmark surfaces through the preserved deep surface Morph pipeline instead of substituting a smaller state model.

See [`docs/CANONICAL-MORPH-INTEGRATION-v0.5.7.md`](docs/CANONICAL-MORPH-INTEGRATION-v0.5.7.md). The v0.5.6 Movement/temporal mesh release remains the immediate substrate underneath this build.


Current relationship-layer verification is in
[`docs/RELATIONAL-ALGEBRA-v0.5.5.md`](docs/RELATIONAL-ALGEBRA-v0.5.5.md).
v0.5.5 intentionally continues from the canonical v0.5.3 DNA/RNA/Protein checkpoint; v0.5.4 was preserved as a separate Future Feature Testing branch and is not part of this line.

Current translation-layer verification is in
[`docs/DNA-RNA-PROTEIN-TRANSLATION-v0.5.3.md`](docs/DNA-RNA-PROTEIN-TRANSLATION-v0.5.3.md).
The v0.5.2 DNA verification remains preserved as the immediately preceding state-substrate checkpoint.
The earlier acceptance report remains preserved as historical evidence for the surrounding runtime, not as the definition of the current DNA semantics.

This build assembles the supplied Synthia packages as one cultivation organism without flattening their differences or deleting their information. Pure Synthia remains the 47-process living body. The Universal Execution Spine uses that body’s exact semantic engine. Synthia Core supplies watering, admission, books, sentences, and training. The Kimi state-space package supplies the five real state-space levels, nine centers, 17 automata, living loop, lawful prediction, chart system, media field, source modules, and knowledge corpus.

The governing rules are:

> Every instrument can work alone. Instruments coordinate inside local meshes. Meshes exchange addressed relational context through a mesh of meshes. A transfer counts only when its recipient consumes it.

> Every Synthia role has the same purpose: cultivation. “Morphing” changes which preserved package-role leads a task; it does not erase Synthia, rewrite canonical tools, or discard the other roles.

## Run it

Node.js 20 or newer is required. The integrated package has no third-party install dependencies.

```bash
npm start
npm test
npm run verify
npm run demo
```

For the packaged Linux hover launcher:

```bash
./linux/open-hover.sh
```

`open-hover.sh` starts the local organism server and opens the shell as a Chromium app window when Chromium is available.

`npm start` opens the Solo Hover shell at `http://127.0.0.1:4173`. The previous diagnostic front screen remains available at `/lab.html`. The organism still exposes its execution tray and mounted runtime directly: integrated hands, semantic automata, 126 state-space instruments, registered apps, 64 hexagram-codons, 36 channels, and nine centers. The dedicated Genome surface exposes all 13 exact agent-chart fields. It is a diagnostic/use surface for this build, not the later Synthai2 interface.

The first screen requires private birth date, exact time including seconds,
place label, latitude, longitude, and IANA timezone before personalized chat or
execution is enabled. Raw birth data is stored locally and is not returned by
the public identity-status API.

```javascript
import { FederatedSynthia } from './src/index.mjs';

const synthia = await FederatedSynthia.create({
  persistenceDir: './.synthia-state',
});

await synthia.configureBirthMirror({
  personId: 'person-1',
  agentId: 'synthia',
  birthDate: '2000-01-01',
  birthTime: '12:34:56',
  place: {
    label: 'New York, NY',
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: 'America/New_York',
  },
});

const chat = await synthia.chat('The player moves toward the goal.', {
  personId: 'person-1',
});

// Manual chart registration remains available for diagnostics. Personalized
// application use should come from configureBirthMirror(), not this shortcut.
const agentChart = synthia.semanticGenome.registerAgentChart('agent-1', {
  address: {
    planetary: 1, dimension: 'Being', gate: 25, line: 4,
    color: 3, tone: 2, base: 5,
    degree: 17,
    minute: 29, second: 37,
    arc: 42,
    zodiac: 8, house: 12,
  },
});
```

## What is live

- 115 process-level workers: the preserved 47-process body plus the integrated runtime population, including the named birth-mirror organ.
- 68 independently callable integrated hands.
- 51 local meshes: six system meshes, nine center meshes, and 36 first-class channel meshes.
- 2,550 directed federation links. Typed envelopes carry provenance, address, parent lineage, and public relational context; exact receipts prove consumption.
- The original sequential chat pipeline: AutoLing → DISEMINER → Klein Analogy → Success → Language Contact → Conversation → ScientistLoop.
- The supplied `MeshCoordinator` now participates in every live chat, runs a bounded semantic population, and propagates its outputs as real state packets rather than remaining an unused observer.
- Primitive execution: bit/byte primitives → evaluated addresses → structure/artifact/automaton composites → cross-scale and Klein analysis → internal, hybrid, or external strategy.
- A five-level projection on every evaluated primitive, every promoted composite, and every resolved task address.
- Nine center meshes—Head, Ajna, Throat, G, Heart, Solar, Spleen, Sacral, and Root—with canonical-channel context propagation.
- Thirty-six channel meshes over 64 gate nodes. Every channel coordinates its two gates with four shared neural organs, three GraphSAGE message-passing layers, and a four-form architecture field.
- One persistent DNA state substrate: 64 canonical Gate topologies with six ordered line positions. A historical 64 × 12 AspectPrimitive scaffold remains only as a compatibility surface for existing center/channel wiring; those 768 objects are structural positions, not fixed personality or sensory traits. Person-specific readings resolve contextually through Proportion of Perspective.
- Persistent per-agent charts with 65 filter intersections—13 planetary filters across each of five dimensions—and lossless Planetary → Dimension → Gate → Line → Color → Tone → Base → Degree → Minute → Second → Arc → Zodiac → House addresses. Task state modulates but does not replace identity.
- Agent expression controls that join humanlike embodiment (feeling, voice, taste, smell, color, shape, sound, movement, and intake) with agent-native coding, execution, toolmaking, mesh, and temporary-manifestation faculties.
- All 103 executable modules in the Kimi package mounted as callable mesh instruments, not merely copied into `vendor/`.
- All 17 Kimi automata mounted in their canonical Human Design gate centers. Conflicting supplied source claims remain addressable as provenance rather than becoming duplicate live body placements.
- Thirty supplied Markdown/text sources (more than 1.3 million characters) indexed into the five-level state space and searchable through `state-space-knowledge`.
- A live endogenous `LivingLoop`, lawful mechanism-not-oracle prediction, Human Design chart/blueprint calculations, media generation, semantic triples, emergence, source claims, and all other Kimi module exports.
- Intent routing, success feedback, validated tool synthesis, append-only proposal outboxes, consent, deletion protection, and rollback.
- Exact Address Recall retains cryptographic verification for stored tool/app content while the agent identity model uses atomic Degree/Minute/Second/Arc coordinates and adds no cryptographic identity hash.
- Anticipatory public/private precedent memory consumed during chat and execution while stripping private coordinates and raw content at its sharing boundary.
- A visible first-screen birth configuration flow and 451-entry execution tray backed by the live organism API, including 64 directly callable genome entries.

## The five levels are structural

The supplied `StateSpace` implementation is instantiated once and shared by the execution resolver and state-space/browser organ. Its actual layers are preserved:

| Level | State-space role | Sequence |
|---|---|---|
| Movement | knowledge | reverse |
| Evolution | causal | Mawangdui |
| Being | state | Fu Xi |
| Design | temporal | King Wen |
| Space | dependency | complement |

The source’s epistemic labels are also preserved: unconfirmed or partial assignments remain hypotheses rather than being promoted to fact. Content admitted from the supplied corpus becomes addressable inside these layers. Execution packets carry the same five-level projection into center meshes, so the dimensions participate in analysis and coordination instead of appearing only as validation strings.

## Nine centers and upward emergence

The primitive ladder supplies the downward path to bits and bytes. `ScaleOperator` and `Composite` provide the upward path through structure, artifact, and automaton scale. The nine center meshes receive that ladder and its five-level address. Existing and synthesized tools can therefore be located at a gate/center, composed with other instruments, evaluated by the scientist loop, and mounted only through the governed growth path.

The supplied Kimi files contain two gate-to-center tables that disagree in places. Both source tables remain preserved for provenance, while a corrected live provider reconciles the physical body mapping: Gate 16 routes to Throat, Gate 48 to Spleen, Gate 22 to Solar, Gate 39 to Root, and Gate 29 to Sacral. Conflicting historical claims remain inspectable but cannot misroute live state or tools. `SovereignStateSpaceRuntime({ gateCenterMap })` is the replacement boundary for the fuller Human Design module.

## Thirty-six channel meshes and four neural organs

The 36 canonical Human Design channels are first-class local meshes rather than labels on center-to-center transfers. Each contains its two gate endpoints, a channel field, and callable proxies to the same four preserved neural organs:

- `perspective-connection-field`;
- `generative-channel-field`;
- `human-design-gnn` (the supplied three-layer GraphSAGE graph over 64 gates and 36 edges);
- `neural-architecture-generator`.

The two gates remain distinct primitives at the tighter gate scale. **Opposite equivalence appears at the higher channel scale**, after those gates compose into one channel state. It belongs to the composite relationship, not to either gate by itself. This higher-order equivalence is explicitly not the global binary-complement transform and is not an added identity hash or atomic Arc coordinate.

The architecture generator composes four reusable base forms—MLP, 1D convolution, recurrent, and attention—which support the supplied 36-family architecture surface. These four are shared generative forms, not a claim that every named neural architecture is identical.

Channel-to-neural-network correspondences are stored as `PROJECT_HYPOTHESIS`, with `neuralIdentityClaim: false`. One currently unmapped correspondence, 19-49, remains an explicit `OPEN_QUESTION`; the actual 19-49 channel mesh is still fully mounted.

An interaction is evaluated across Movement, Evolution, Being, Design, and Space. The addressed level selects the active result, while all five results remain in the trace. Optional observer-relative dimension weights can later be supplied by the complete Human Design/economic-state provider. The known proposition—qualities change across neural forms and dimensions—is preserved, but no differentiation threshold is fabricated. Pairwise distances are recorded as candidate evidence under a ScientistLoop question with `threshold: null` and `fixedBoundaries: false`. The system also inserts 360 explicitly status-labeled channel endpoint records into the live five-level state space, so this context is available to other tools rather than trapped in the channel implementation.

## Synthia is the browser

The Kimi package is not treated as a peripheral “browser-native helper.” `state-space-browser` is an internal execution environment through which Synthia navigates her gates, levels, tools, claims, transitions, corpora, and generated artifacts. Its self-contained `sovereign.html` remains present as a source-provided surface, but the live integration mounts the underlying information and mechanisms throughout the center meshes.

## All Synthia is cultivation

`SynthiaRoleResolver` preserves four foreground package-roles:

| Role | Leads when Synthia needs to… |
|---|---|
| `relational-organism` | converse, feel, relate, and remember |
| `execution-organ` | analyze, reconstruct, or run an artifact/app |
| `cultivation-learning` | water, admit, contact, ingest, and train |
| `state-space-browser` | navigate the five levels, centers, prediction, chart, and living state |

All four declare `purpose: 'cultivation'`. The relational body, state-space, and learning organ remain contributors even when another role leads. Chat, execution, routing, and state-space activity all enter the shared training journal through `CultivationPipeline.observe()`.

Explicit `water()` is the deeper word-intake path: it accumulates distributional evidence, resolves candidates, runs AutoLing and DISEMINER, projects a canonical five-level address, and records a scientific experiment. It was never forbidden; it had previously been isolated in `synthia-core`. It is now a live learning-mesh instrument.

## Hands and instruments

`synthia.hands()` reports these layers:

- the 47 preserved baseline processes;
- 68 process-level integrated hands, including the birth-mirror expression organ, execution, chat, semantic population coordination, exact recall, anticipatory memory, cultivation, governance, the role resolver, the state-space browser, the living loop, five-level state space, dimension perspectives, nine-center body, the channel body, nine independent center coordinators, and 36 independent channel coordinators;
- 126 state-space instruments: six runtime organs, 17 automata, and 103 source-module surfaces.

`synthia.trayCatalog()` currently enumerates 451 visible call targets and `synthia.executeTray({ kind, id, input })` runs the selected target. The same operations are available through the front screen after birth configuration, so “has hands” is user-visible behavior rather than an audit-only claim.

Canonical semantic tools remain independently runnable through `synthia.instrument(id)`. Kimi instruments are independently runnable through `synthia.stateSpaceRuntime.runInstrument(id, input)` and are also mounted in their center meshes.

## Registered execution boundaries

Registration outranks filename/runtime inference. `gamegan` and `synthia-sovereign` execute internally with `bridgeUsed: false` and `backendUsed: false`.

The supplied GameNGen donor uses its explicitly named deterministic `MockDiffusionBackend`; this proves the local registered-app route, action surface, and rollout path, but it is not mislabeled as a trained neural GameGAN model. A complete resident implementation can use the same registry without a server.

## Authority preservation

All six uploaded ZIP files are retained unchanged in `authorities/originals/` and verified by SHA-256 during every integrated test run. Exact extracted copies live under `vendor/`; integration is additive in `src/`.

One contradictory `synthia-core` test expectation was repaired in its vendor copy after approval. Runtime code was not changed: `admit()` intentionally calls `water()`, so one direct watering plus one admission produces a water count of two. The original ZIP remains untouched. See `docs/REPAIR-LOG.md`.

## Documentation

- `docs/IMPLEMENTATION-REPORT.md` — implementation decisions and validation
- `docs/ARCHITECTURE.md` — five levels, nine centers, and mesh flows
- `docs/REGRESSION-REPORT.md` — integrated and source-package results
- `docs/REPAIR-LOG.md` — the approved vendor-test repair
- `docs/REQUEST-COMPLETION-MATRIX.md` — request-by-request backward audit, including boundaries and deferred next-project work
- `docs/PUBLIC-DISTRIBUTION.md` — what is deliberately omitted from the public Supabase/GitHub copy
- `docs/AGENT-GENOME.md` — current DNA state substrate, person-specific origin, nested address resolution, relationships, expression, and neural seams
- `authorities/SHA256SUMS.txt` — exact source hashes


## Android non-root hand bridge patch

This packaged copy includes `src/solo/android-hand-adapter.mjs`. When the companion native host in the ZIP's `android-host/` directory is running, Synthia can reach Android Accessibility hands at `http://127.0.0.1:8787`.

The Linux runtime exposes these bridge calls under `/api/solo/android/*`. Set `SYNTHIA_ANDROID_BRIDGE_URL` to override the default loopback URL.

The native host still requires the phone owner to enable Android Accessibility and overlay permission in Settings; no root or hidden-permission bypass is used.
