# Kimi donor intake: model diagnosis and integration checkpoint

Date: 2026-10-25. Target: existing justappgrabbin/SynthAi Computer, from Synthia resident PR #52. Originals remain unmodified in Google Drive.

## Original source IDs and SHA-256

1. Spacetime LLM with I Ching (2) — Drive ID 1fZaO-ZNsxptyWV8tCaRsXriK2OPLz3xs — SHA256 ad7fb4344c35b2bdd375af8e7fb138895b73d01ecc40fad25db2a4af3202f92c.
2. Adaptive Swarm 3D Engine (1) — Drive ID 10J0z6ruzKJXIhnFaZqSYpNNJa6tp2cw0 — SHA256 51a8a7e6b672ca6d6d9b6227bc82826a636279c137f84db655b10490e41cd23a.
3. Morphing Interactive Video App-1 — Drive ID 1Fccku-SABrRV48dL7FXCWtZd89kmoXNE — SHA256 8f4d307554f343d6b798365864c6ffb65dbfd993e4004c667603c903c59b48ef.

## Why it seems like a fake LLM

The TypeScript language workbench is a real interpreter/memory system but not a pretrained neural language generator. In app/src/engine/model.ts, groundedRealizations, learnedSequences and kleinRealizations construct candidate strings with authored sentence patterns. candidateScores and feedback tune selection. It has semantic memory and candidate provenance but cannot be represented as a broadly trained neural language model. The Computer's existing Synthia resident is also explicitly a non-LLM, trainable task classifier with separate semantic/Klein engines. Keep their labels accurate; do not substitute another generic template chat.

## Other donor capabilities and limits

The 3D archive has a real Three.js 12k-particle scene, player/APF, imported Simlish unified swarm, canonical addressing, persistent snapshots and dispatch receipts. Its app/src/synth.js ran in Node with stubbed localStorage: 64 initial agents, three UI-created relation events and three executed dispatch receipts that called the injected world callback. This proves only the narrow JS path. Source-created relationship clicks are not independent evidence of resonance, and a reported mutation is not an independently observed real-world effect.

The video archive has real WebGL video compositing, deterministic story choices and pre-shot footage. It is not a video diffusion generator, not verified face replacement, and its login/storage/server environment still needs separate offline inspection.

## What is committed in this branch

- computer/services/donor-event-integration.mjs — validates bounded, typed events for three named donors, deduplicates stable event IDs, attaches a Synthia resident interpretation, persists a receipt, and emits an append-only Computer observation.
- ComputerRuntime boot, service registry, snapshot and mounted app contract are wired. A real mounted application can call services.reportDonorEvent with its source identity bound to the appId.
- computer/tests/kimi-donor-evidence.test.mjs covers all three event shapes, provenance, restart persistence, duplicates, rejected spoof types and no automatic world effects.
- The existing Synthia/Klein/AutoLing/DISEMINER/AutoNovel code is preserved.

The bridge does NOT run imported donor code, install their visual UIs, make an APK, execute world effects or prove their claims. An input source status of executed still becomes unverified-provider-report unless independently witnessed and validated. Mere contact does not certify resonance. No unauthenticated ingestion HTTP endpoint was added.

## Next mounting gates

1. Convert the source 3D world into a Computer-mounted application that preserves Three.js code and actual assets. After real actions in app/src/synth.js, submit a source envelope: donor adaptive-swarm-3d, kind contact/relation/dispatch, eventId and payload. Run Android GPU and persistence acceptance separately.
2. Mount the video compositor/story engine as native executable modules (no iframe) and forward story-choice, scene-transition, and render-receipt envelopes following their actual execution. Verify video decoding and device performance.
3. Extract only the useful semantics/procedural details from the workbench, and emit interpretation and feedback envelopes without promoting user assertions or lexical similarity into verified facts.
4. Join observed event receipts to Computer's permissioned action/learning feedback pathways. Only verified events may cause a capability or self-cultivation change. Maintain the originals as immutable donors.

Example mounted app call:
await contract.services.reportDonorEvent({ eventId: 'session-9-choice-2', kind: 'story-choice', payload: { scene: 'platform', choice: 'follow', next: 'follow' } });

Until real mounted donors emit, status.observedReports remains 0; that is intentional and accurate.
