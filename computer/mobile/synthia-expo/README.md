# Synthia Mobile donor protocol — staged integration

Source: owner-provided `SYNTHAI🪷MOBILE (1).zip`, dated October 6, 2026.
Donor: `_MConverter.eu_cynthia-expo-sdk54-unified`, an Expo 54 frontend.

This intentionally does **not** replace the canonical Computer, the existing
Synthia resident, the Automata Engine, or the original mobile source. Its small
mobile protocol talks to the **actual** host server at
`computer/host/server.mjs`:

- `GET /api/status` — confirm the current Computer server is ready.
- `POST /api/chat`, `{ "text": "..." }` — process via `ConversationExecution`;
  read the `text` field with the original provider and event receipt.
- No fake replies when disconnected; all failures surface.
- Host currently binds to `127.0.0.1:8765`. The Expo app must be on the
  same device as a running Computer server. For remote pairing, implement a
  separate authenticated/TLS gateway with owner permissions; **do not** open
  the Computer loopback server directly to the network.

## Complete source bundle

The owner has a separate downloadable Expo source ZIP, named
`Synthia_Mobile_Computer_Bridge_v1.zip`, containing this protocol wired
into the original Expo UI. It also fixes mismatched React / Expo version pins
and legacy Expo FileSystem imports, and honestly labels the pre-existing
Flutter/Godot starter ZIPs and static VGM sample as templates.

This repository addition is the integration contract and acceptance tests.
It is not an APK, not an independently deployed app, and not a language model.

## Follow-on donors (not silently executed)

- `CodeSculptor`: React/Express user interface; many chart calculations are
  flagged as explicit placeholders in its source.
- `tools/MindWeaver`: Mastra agents, sentence optimizer, game generator,
  universe and app builders; requires isolated dependencies, identity scoped
  capabilities, and explicit authorized effects.
- `VirtualGameMaster-main`: Python game master, scenario assets and
  NetworkX graph memory; should be admitted as a separate data + engine
  provider behind Computer world-service contracts, not replaced with a
  hard-coded level plan.
- `assets/neural/Neural_raw.bin`: unvalidated binary; not demonstrated to
  be an inference-compatible model.

Acceptance: `node --test computer/tests/synthia-mobile-bridge.test.mjs`.
Android app smoke test is still required and is not asserted complete.
