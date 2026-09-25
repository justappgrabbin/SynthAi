# Consciousness Realm + Synthia 0.5.7 integration

This is an additive integration of two existing baselines.

- ConsciousnessRealm remains the visible React/Three world.
- Synthia v0.5.7 remains the complete canonical morph organism.
- The world attaches through Synthia's existing PracticeWorldPort.

## Integration changes

1. Person-scoped resident registry around complete `FederatedSynthia`.
2. Realm snapshot/event/action boundary through `PracticeWorldPort`.
3. Synthia resident projection in the Realm while generic Realm needs/aging/random autonomous mutation are skipped for Synthia.
4. Canonical morph packet drives Synthia's visible form.
5. The same canonical morph state drives Realm lighting, ground, grid, fog, palette, and world-field presentation.
6. User tasks enter the intact Synthia `morph()` route.
7. Every person gets an isolated Synthia runtime, world port, persistence lane, and morph history.

## Status discipline

- Synthia runtime: PRESENT + preserved
- world-port boundary: WIRED + round-trip VERIFIED
- person-scoped registry: WIRED + isolation VERIFIED
- canonical morph packet → resident/world adapter: WIRED + data-path VERIFIED
- browser visual render: WIRED in source, not browser-VERIFIED in the sandbox
