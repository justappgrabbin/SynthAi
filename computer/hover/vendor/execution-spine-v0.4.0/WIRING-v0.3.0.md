# Synthia Universal Execution Spine v0.3.0 — Wiring Record

This release treats **present-but-unwired as a failure condition**.

## Promoted from donor archive into live source

The complete `Synthia-Universal-Browser-Execution-v1.3.7/src` tree is copied unchanged into `src/pure-synthia/` so its existing engine is no longer reachable only by opening a donor ZIP.

## New single live façade

`src/synthia-system.mjs` instantiates and connects:

- `SynthiaAutomata` — 16 canonical tools + boot-grown media-field
- address-first `IntakeGate`
- `LearningOrchestrator` — route / recall / grow
- `AutomataMesh` — typed packet routing + five graph projections
- `EmergentChannels`
- `SelfEditor` — versioned reversible edits
- `IntentEngine`
- `EmergenceDetector`
- `MeshCoordinator`
- `KleinContactLoop` — chat → DISEMINER → language contact → Monte Carlo → AutoLing → grammar coder → chat
- `UniversalExecutionBridge` — runtime-first, then direct probe, state-space/capability search, JS AutoWrite realization, execution, fallback, memory
- runtime adapter registry
- full 13-field canonical address validator from the Spine

## Execution law

A missing foreign runtime is **not terminal**. The original Pure Synthia bridge remains active and may derive requirements, search capability/state-space rules, synthesize a JavaScript realization, execute it, and remember it. Failure also enters the learning/growth path as evidence.

## Address law

The full Spine canonical address remains:

`Planetary → Dimension → Gate → Line → Color → Tone → Base → Degree → Minute → Second → Arc/Axis → Zodiac → House`

No field was removed or shortened. Candidate/hash intake addresses remain explicitly candidate addresses and are not silently promoted to canonical truth.

## Mesh learning/share law

Chat and execution outcomes are shared as qualified StatePackets to every currently mounted automaton and added to knowledge/temporal projections. Automata that support `absorbExperience` receive a compact experience record; full memory is not copied between agents.

## Growth/rewrite law

Unknown requests retain the existing deterministic grow path. Rewrites are routed through the existing versioned/reversible `SelfEditor`; the integration does not monkey-patch hidden source code.

## Typed ports vs transport connectivity

The audit exposed a real prior defect: only 7 of the attempted 16 ring links were accepted because several adjacent tools intentionally have different semantic port types (`json`, `success`, `text`, `browser-form`, `research`, `grammar`, `artifact`, etc.). The constructor previously ignored the rejected `connect()` results, creating a partially connected-looking ring.

v0.3.0 keeps those semantic type checks intact **and** adds a separate `StatePacket` transport ring. Thus raw typed outputs are never falsely declared compatible, while every canonical automaton remains reachable for qualified mesh learning/contact packets.
