// Compatibility surface retained from the earlier "Foundry socket" stage.
// The real foundry-complete.tar.gz donor is now present and mounted by
// foundryProcesses.mjs. Nothing in this file fabricates the missing historical
// Overseer implementation.
import { attachFoundryProcesses, createFoundryProcesses } from './foundryProcesses.mjs';

export const FOUNDRY_PROCESSES = Object.freeze([
  Object.freeze({ key: 'core', id: 'foundry-core', group: 'foundry', capabilities: ['foundry.glyph','foundry.parse-metadata','foundry.type-detect','foundry.merge-metadata'] }),
  Object.freeze({ key: 'selector', id: 'foundry-selector', group: 'foundry', capabilities: ['foundry.analyze','foundry.gap-detect','foundry.select'] }),
  Object.freeze({ key: 'builder', id: 'foundry-builder', group: 'foundry', capabilities: ['foundry.assemble','foundry.build','foundry.fill-gap'] }),
  Object.freeze({ key: 'vault', id: 'foundry-vault', group: 'foundry', capabilities: ['foundry.save-fragment','foundry.get-fragment','foundry.list-fragments','foundry.archive-fragment','foundry.save-app','foundry.get-app','foundry.list-apps','foundry.archive-app','foundry.save-job','foundry.get-job','foundry.list-jobs'] }),
]);

export const LEGACY_CONTRACT_NOT_PRESENT = Object.freeze([
  Object.freeze({ id: 'foundry-overseer', reason: 'Not implemented in the uploaded Pool/Forge/Vault donor; preserved as historical contract only.' }),
]);

// Old callers may keep the attachFoundryModules name, but it now attaches the
// actual donor generation rather than four fabricated placeholders.
export function attachFoundryModules(swarm) {
  return attachFoundryProcesses(swarm);
}

export { attachFoundryProcesses, createFoundryProcesses };
export default attachFoundryProcesses;
