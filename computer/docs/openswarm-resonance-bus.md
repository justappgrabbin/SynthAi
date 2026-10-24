# OpenSwarm resonance bus — SYNTH AI Computer

Reference: https://github.com/openswarm-os/openswarm (MIT; Copyright 2026 OpenSwarm Contributors). Read its README, neural-bus implementation, and Bus Signal Protocol. This module adapts the coordination pattern in independent, JavaScript-native code; it does not vendor the Python runtime or claim parity.

## Wired runtime behavior

- ComputerRuntime owns a ResonanceBus from computer/services/resonance-bus.mjs and registers it in the Computer services registry.
- Each independent worker carries mission vectors, a wake threshold, a domain and explicit permissions. The bus evaluates every subscriber once per signal (O(N) comparisons, each of 384 dimensions by default), not every pair of workers.
- Signal envelopes record type, optional domain/address, source, correlation ID and TTL.
- A signal only proposes matched workers by default. Actual work requires the trusted owner caller to set execute:true AND ownerApproved:true, then executes the existing registered AutomataEngine.run path and emits its normal run events.
- Agents need private tokens and bus:write permission to publish. Agents cannot authorize execution themselves.
- Max active matches per signal: 26. Active signal buffer: bounded/TTL. Threshold adjustments require caller-attested verified outcomes and evidence.

## Embedding integrity

OpenSwarm uses Sentence-BERT 384-dimensional learned embeddings. No Sentence-BERT or Ollama has been installed here. The phone-local initial matcher uses 384-dimensional lexical feature hashing (unigrams/bigrams) and cosine similarity. It recognizes lexical overlap, NOT semantic synonyms. A real on-device neural embedder can later be injected through the embedder option; embeddingSpace IDs isolate incompatible vector spaces. Numeric vectors may also be supplied explicitly.

## Using an existing executable automaton

1. Boot ComputerRuntime normally.
2. Register the real automaton through computer.automata.register with an executable implementation.
3. Call await computer.registerResonantAutomaton({ id: 'existing-id', missionText: 'work this automaton understands' }).
4. Propose work using await computer.publishResonanceSignal({ type: 'request', text: 'work this automaton understands' }). Read the matched list; nothing executes.
5. After owner authorization in the trusted Computer interface, call publishResonanceSignal with { execute: true, ownerApproved: true }. The result includes actual AutomataEngine executions.

The ownerApproved argument is a local trusted-caller assertion, NOT a real authentication or consent UI. Do not expose publishOwner or the privileged runtime method to third-party/HTTP callers. Mounted app service contracts deliberately omit it.

## Not shipped or verified here

This is a scoped code integration, not a ready phone install. No cloud LLM, Python, Docker, Redis, Ollama, Web browser agent, or auto-installed model. Original state space, four primitives, existing mesh and self-cultivation code remain in place. No durable neural bus state, OS-level sandbox, production audit proof, Android build, or phone acceptance is claimed.

## Next verification steps

Run the new node --test computer/tests/resonance-bus.test.mjs job, then the full Computer acceptance suite and native Android APK/device tests. Later attach actual on-device embeddings and project-outcome feedback from ResonanceNetwork/ExperimentLoop without duplicating existing engines.
