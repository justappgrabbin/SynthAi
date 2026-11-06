# LegacyBuild Drive donor integration

## Source identity

The two supplied Google Drive links resolve to separate Drive IDs with the same filename, size and bytes:

- `1z3EEDaiOigklugGzvTk33DEHTfq7XJmW`
- `1G5pIuRD17gVGiNscwCnKB_E43E2qL4vc`

Both are `LegacyBuild.zip`, 7,925,609 bytes, and were verified byte-for-byte identical during donor inventory. Treat them as duplicate references to one donor snapshot.

## Donor contents

LegacyBuild is a historical smart app assembly line. Its implemented flow includes:

- ZIP/file upload and extraction
- code analysis
- book/reference extraction
- pattern unification
- code-gap detection and filling
- generated application output
- monetization suggestions
- next-step suggestions
- downloadable generated ZIP

The archive also contains two nested donors:

1. `SynthUniverse_1762705621527.zip`
   - Cities / skills
   - coaching
   - collapse
   - TaskFit
   - builder/delegation
   - Sparkle
   - GameGAN mock
   - Ollama host integration
   - older Cynthia surfaces

2. `virtual_consciousness_engine_v2_1762696219864.zip`
   - 64-gate graph structures
   - Human Design channel graph
   - GNN message passing
   - awareness readouts
   - Sun/observer modulation
   - nine-field narrative extraction

## Integration decision

### Extracted now: TaskFit

The historical `SynthUniverse/server/services/taskfit.ts` contains a deterministic task-fit formula based on:

- weighted capability/trait axes
- ring bias
- gate affinity
- optional Sun-gate boost
- fit score and S/A/B/C/D tier

This fills a current five-document acceptance gap: a real host-side mechanism for role/capability matching.

The recovered adapter lives at:

- `computer/services/task-fit.mjs`

It is registered as:

- Computer service: `task-fit`
- Mobile mesh participant: `system:task-fit`
- Capability: `task-fit-matchmaking`

The adapter does not fabricate participant data or use the donor Cities module's random task-fit values.

### Preserved but not wired

- **Cities apply/compose**: PRESENT only. Historical implementation uses random task-fit and random activation changes, so it is not acceptable as deterministic evidence.
- **coachStub**: PRESENT only. Random canned response selection is not the canonical Synthia/Venom/Prime guidance path.
- **GameGAN mock**: PRESENT only. It logs a mock URL rather than generating a verified game artifact.
- **LegacyBuild OpenAI/Replit pipeline**: PRESENT as a donor for intake/unify/gap-fill/monetization mechanics, but its Replit/Neon/GCS credential and backend assumptions are not imported wholesale.
- **virtual_consciousness_engine_v2**: PRESENT for GNN/channel/awareness mechanism comparison. Its historical semantic mappings must be reconciled against the current canonical State Space / one-waveform architecture before any runtime promotion.

## Wiring standard

TaskFit is only promoted above PRESENT when:

1. imported by the running Computer runtime,
2. registered as a service,
3. registered on the mobile relational mesh,
4. reachable through the public Computer methods,
5. included in the staged browser/mobile runtime,
6. exercised by acceptance tests.

Network-wide live matchmaking remains incomplete until real people/project needs are routed through this service and an observed network action/outcome is recorded.
