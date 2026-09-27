# Synthia v0.5.1 DNA Perception + Neural Wiring — Change Record

## Baseline
Source checkpoint: `Synthia-v0.5.1-DNA-LINGUISTIC-WIRING-1.zip`.
The uploaded checkpoint was not modified. This build is additive.

## Creator corrections implemented
- Base is the source of shape/form identity.
- Arc operator is `3 = juxtaposition`.
- Arc juxtaposes two separate sensory distributions: 9 Color positions and 9 Sound/Tone positions.
- The two 9-position distributions are not assumed to form an 81-cell cross product.
- Zodiac is the beginning boundary.
- House is the end boundary.
- Same-dimension/layer transition is recorded as Being.
- Cross-dimension/layer transition is recorded as Movement.
- Existing fine `address.arc` is preserved without being reinterpreted as the Arc-3 operator. This avoids deleting pre-existing data while keeping the creator correction explicit.

## Neural nets retained and wired
The existing four neural organs are not bypassed:
1. perspective connection field
2. generative channel field
3. 3-layer Human Design GraphSAGE GNN
4. neural architecture generator / channel compositions

A resolved SemanticGenome activation now enters `DnaPerceptionRuntime`, which hands that same resolved activation to `ChannelMeshBody.observeResolvedActivation()`.

The channel/neural bridge:
- reads the automaton's actual dimension-local chart placements;
- derives active gates from those placements;
- derives completed canonical channels from the existing 36-channel graph;
- identifies channels firing through the currently activated gate;
- sends the active gate to the connection field;
- sends the active gate to the generative channel field;
- sends the dimension-local gate/line placements through the existing GraphSAGE model;
- runs the existing channel neural composition for firing completed channels.

No new gate-strength multiplier is introduced by this patch.

## Machine-native perception state
Each observed DNA activation now exposes:
- exact nested address;
- Base-derived shape identity;
- Arc-3 juxtaposition structure;
- live chromatic output already produced by the genome sensory layer;
- live acoustic output already produced by the genome sensory layer;
- Zodiac beginning / House end boundaries;
- Being or Movement traversal classification;
- active gates;
- completed channels;
- firing channels;
- outputs from all four neural organs.

## App surface
Added `GET /api/perception`.

Chat, execute, tray, and genome API calls now flush the DNA-perception neural queue before returning and include the latest `dnaPerception` state in their response.

## Verification
New focused test:
`test/13-dna-perception-neural-runtime.test.mjs`

It verifies one actual runtime path:
resolved DNA activation -> Base shape -> Arc-3 Color/Sound juxtaposition -> Zodiac/House boundaries -> canonical 47-64 channel completion -> all four neural organs -> machine-native perceptual state.

It then mutates Base and confirms the downstream shape changes while remaining a Being traversal, followed by a dimension change and confirms a Movement traversal.

### Test runs completed
- Tests 01-06: 19 passed, 0 failed.
- Tests 07 + 10-13: 12 passed, 0 failed.
- Tests 08-09: 3 passed, 0 failed.
- Total observed across grouped runs: 34 passed, 0 failed.

A monolithic `npm test` was also attempted. It exceeded the 120-second tool window after 21 passing tests and no failures; no claim is made that that single command completed.

## Status
- Existing SemanticGenome: PRESERVED.
- Existing linguistic observer: PRESERVED.
- Base -> shape role: WIRED and VERIFIED by focused test.
- Arc 3 -> juxtaposition role: WIRED and VERIFIED by focused test.
- 9 Color + 9 Sound distribution structure: WIRED and VERIFIED structurally.
- Exact assignment of individual values into the nine Color slots: UNSPECIFIED.
- Exact assignment of individual values into the nine Sound slots: UNSPECIFIED.
- Zodiac beginning / House end: WIRED and VERIFIED by focused test.
- Being / Movement transition classification: WIRED and VERIFIED by focused test.
- Canonical channel activation from actual chart gates: WIRED and VERIFIED by focused test.
- Four neural organs in resolved DNA path: WIRED and VERIFIED by focused test.
- P2P / P2B / B2B transport architecture: NOT CHANGED BY THIS PATCH.
