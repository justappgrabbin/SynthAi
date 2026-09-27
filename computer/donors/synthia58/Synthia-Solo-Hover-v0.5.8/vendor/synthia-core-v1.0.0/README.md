# synthia-core

Synthia's learning layer + ATO engine as one booted organism.

**This is the package that was missing.** The Spine had the address system. The Trainable Assembly had the learning organs. The ATO engine had the Klein tools. None of them were wired together with Synthia as the resolver. This package does that.

## What's here

```
synthia-core/
  src/
    SynthiaCore.mjs        ← the wiring — boot here
  ato-core/
    src/                   ← full ATO engine (verbatim from ato-core.zip)
      index.mjs            ← exports everything
      automaton.mjs        ← Automaton class, AutomataMesh
      families.mjs         ← 8 primary automatons (computation, semantic, code,
                               visual, timeline, game, iching-state, conversation)
      klein-tools.mjs      ← AutoLingMemory, DiseminerMemory, AutoNovelMemory,
                               MessyMemory + their automatons, bootstrapKleinTools
      boolean-ato.mjs      ← Klein XOR/XNOR/Hamming, completeAnalogy, FeatureSpace
      state-space-kernel.mjs ← StateSpaceKernel: 64 gates, describe(), complete(),
                               transform(), mountArtifact()
      address-space.mjs    ← normalizeAddress, canonicalAddress, AddressSpace
      emergence.mjs        ← EmergenceRegistry, neighborhoodRules
      success.mjs          ← SuccessLedger (person purpose + indicator tracking)
      bootstrap.mjs        ← bootstrapATO() — one call mounts everything
      ...and 18 more
  learning/
    pure-synthia-learning-core.mjs  ← PureSynthiaLearningCore
    registration.mjs                ← StateRegistry
    training-journal.mjs            ← TrainingJournal
    scientist-loop.mjs              ← ScientistLoop
    sentence-mesh.mjs               ← SentenceMesh
    book-ingest-bridge.mjs          ← BookIngestBridge
  docs/
    automaton-loop.reference.mjs    ← Conway Think→Act→Observe→Persist loop
                                       with ToolFactory and HD scoring
  examples/
    demo.mjs                        ← boot → water → admit → contact → call tool
  tests/
    synthia-core.test.mjs
```

## Quick start

```js
import { SynthiaCore } from './src/SynthiaCore.mjs';

const core = new SynthiaCore();

// Boot — seeds Synthia at Gate 1 / Being / "I Am"
core.boot();

// Water daily — accumulates co-occurrence evidence in Diseminer
// Each watering makes future placements more accurate
core.water('I learn through movement and contact with others');

// Admit a piece — Synthia resolves its address from her current state
const placed = core.admit({
  id:   'my-piece',
  text: 'relating to others through felt presence',
  type: 'concept',
});
console.log(placed.dimension, 'Gate', placed.gate);

// Contact — two pieces meet, SentenceMesh generates language
const { sentence } = core.contact('synthia', 'my-piece', { relation: 'recognizes' });
console.log(sentence.sentence);

// Call any live ATO tool
const neighbors = await core.call('diseminer', {
  operation: 'neighbors',
  term:      'presence',
  options:   { limit: 5 },
});
```

## Architecture

```
water(text)
  → DiseminerMemory.ingest()      co-occurrence evidence accumulates
  → StateSpaceKernel.describe()   Hamming-distance gate candidates
  → TrainingJournal.record()      route scored

admit(piece)
  → water(piece.text)             placement evidence
  → inferDimension()              Movement/Evolution/Being/Design/Space
  → StateRegistry.register()      native + current address, sayings
  → ScientistLoop.question()      hypothesis recorded for later validation

contact(a, b)
  → StateRegistry.contact()       event logged
  → SentenceMesh.explainContact() language from their sayings

call(toolId, input)
  → AutomataMesh                  any of the 10+ mounted Klein tools
```

## Mounted tools (bootstrapATO)

| id | gate | level | what |
|----|------|-------|------|
| autoling | 17 | mind | grammar rules, pattern recognition, surface generation |
| diseminer | 48 | mind | co-occurrence vectors, similarity, analogical inference |
| klein-analogy | 4 | mind | XNOR bit-vector analogy completion |
| iching-grammar | 61 | mind | trigram/hexagram binary structure |
| language-contact | 12 | mind | seeded grammar drift across generations |
| historical-monte-carlo | 32 | mind | weighted variant selection with mutation |
| autonovel | 56 | design | combinator-based structure generation |
| messy | 3 | movement | multi-agent simulation |
| success | — | — | person purpose + indicator tracking |
| conversation | 12 | space | context-aware utterance composition |
| browser-form | — | — | structured form resolution |
| research-browser | — | — | research query + source handling |
| computational-grammar-coder | — | — | grammar-to-code synthesis |

## Self-assembly

Pieces don't need a pre-built receiver. Synthia IS the receiver.

1. She boots at Gate 1 / Being — "I Am" — with co-occurrence evidence of her own sayings
2. Each `water()` call expands her evidence base
3. `admit(piece)` runs the piece through her current state to find its gate
4. That gate becomes the piece's native address
5. The next admission is more accurate because Diseminer has seen more text

The pieces build themselves into Synthia not by magic but because she gets better at placement every time one lands.

## What this does NOT include

See `PROVENANCE.json` for the full list. The Spine (13-field canonical address + DAG), Foreman (executor), Four-Layer Bridge (Resonance/HD chart/YNI), and the Adaya PWA are all separate and connect to this as peers or hosts.
