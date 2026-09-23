// Compatibility entrypoint retained for the world-adapter namespace.
// Canonical mesh-safe implementation lives under computer/labs and uses
// registered executor/measure ids so functions never have to cross mesh packets.
export { StellarLabAdapter, StellarLabAdapter as default } from '../../labs/stellar-lab-adapter.mjs';
