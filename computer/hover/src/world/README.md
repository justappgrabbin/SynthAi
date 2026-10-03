# Consciousness Realm inside Synthia Hover

`AgentLifeEngine.ts` is the user's Library file (SHA-256
`560dc5c001a665569a96b5e489c1b2a0b57c1ec648fff0c4fd0540a9314d392a`).
`AgentLifeEngine.mjs` is that source with TypeScript types stripped by Node 24's
`module.stripTypeScriptTypes`; the simulation logic is unchanged. The existing
Computer `ConsciousnessRealmAdapter` is copied here because the Hover rootfs
ships `computer/hover` only. `realm-runtime.mjs` persists the donor engine,
binds Synthia's configured birth chart, advances elapsed time on restart, and
exposes the world through the same loopback server as chat and tools.

`ui/morph` contains the provided Morph Reskin browser runtime and House source,
plus the user's Synthia Morph Studio. The Realm UI renders the actual Morph
surface beside the engine's places and actions. The photo studio is a local
preview and recipe editor; no image-generation service is bundled.

The WorldGen bridge source is preserved in `computer/donors/worldgen`. It
requires a separate GPU-backed Python service and is not executed on the T7.
The Triform Simworld archive was inspected as a second world option; its React,
Babylon, and server stack is not bundled in this build.
