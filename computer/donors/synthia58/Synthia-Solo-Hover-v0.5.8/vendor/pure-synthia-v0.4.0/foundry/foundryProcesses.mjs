import {
  assignGlyph,
  parseGlyphMetadata,
  mergeGlyphMetadata,
  analyzeFragments,
  detectFileType,
  createAssemblyJob,
  assembleApp,
  saveFragment,
  getFragment,
  getAllFragments,
  getFragmentsByStatus,
  deleteFragment,
  saveApp,
  getApp,
  getAllApps,
  deleteApp,
  saveJob,
  getJob,
  getAllJobs,
} from './runtime/foundry-lib.mjs';

function opOf(input) {
  return String(input?.operation || input?.op || '').trim();
}

function requireFragments(input) {
  if (!Array.isArray(input?.fragments)) throw new TypeError('Foundry operation requires fragments[]');
  return input.fragments;
}

export function createFoundryProcesses() {
  const core = {
    id: 'foundry-core',
    capabilities: ['foundry.glyph', 'foundry.parse-metadata', 'foundry.type-detect', 'foundry.merge-metadata'],
    ownedState: { calls: 0 },
    async execute(input = {}) {
      this.ownedState.calls += 1;
      const op = opOf(input);
      if (op === 'glyph') return { glyph: assignGlyph(String(input.filename || 'artifact')) };
      if (op === 'parse-metadata') return parseGlyphMetadata(String(input.content || ''));
      if (op === 'type-detect') return { type: detectFileType(String(input.filename || '')) };
      if (op === 'merge-metadata') return mergeGlyphMetadata(input.fragment, input.parsed || null);
      throw new Error(`foundry-core unknown operation: ${op}`);
    },
  };

  const selector = {
    id: 'foundry-selector',
    capabilities: ['foundry.analyze', 'foundry.gap-detect', 'foundry.select'],
    ownedState: { analyses: 0 },
    async execute(input = {}) {
      this.ownedState.analyses += 1;
      const fragments = requireFragments(input);
      const analysis = await analyzeFragments(fragments);
      return { ...analysis, fragmentCount: fragments.length };
    },
  };

  const builder = {
    id: 'foundry-builder',
    capabilities: ['foundry.assemble', 'foundry.build', 'foundry.fill-gap'],
    ownedState: { builds: 0, lastAppId: null },
    async execute(input = {}) {
      this.ownedState.builds += 1;
      const fragments = requireFragments(input);
      const job = input.job || await createAssemblyJob(fragments);
      const app = await assembleApp(fragments, job);
      this.ownedState.lastAppId = app.id;
      return { job, app };
    },
  };

  const vault = {
    id: 'foundry-vault',
    capabilities: [
      'foundry.save-fragment', 'foundry.get-fragment', 'foundry.list-fragments', 'foundry.archive-fragment',
      'foundry.save-app', 'foundry.get-app', 'foundry.list-apps', 'foundry.archive-app',
      'foundry.save-job', 'foundry.get-job', 'foundry.list-jobs',
    ],
    ownedState: { calls: 0 },
    async execute(input = {}) {
      this.ownedState.calls += 1;
      if (!('indexedDB' in globalThis)) throw new Error('FOUNDRY_VAULT_REQUIRES_INDEXEDDB');
      const op = opOf(input);
      switch (op) {
        case 'save-fragment': await saveFragment(input.fragment); return { ok: true };
        case 'get-fragment': return getFragment(String(input.id));
        case 'list-fragments': return input.status ? getFragmentsByStatus(input.status) : getAllFragments();
        case 'archive-fragment': await deleteFragment(String(input.id)); return { ok: true, preserved: true };
        case 'save-app': await saveApp(input.app); return { ok: true };
        case 'get-app': return getApp(String(input.id));
        case 'list-apps': return getAllApps();
        case 'archive-app': await deleteApp(String(input.id)); return { ok: true, preserved: true };
        case 'save-job': await saveJob(input.job); return { ok: true };
        case 'get-job': return getJob(String(input.id));
        case 'list-jobs': return getAllJobs();
        default: throw new Error(`foundry-vault unknown operation: ${op}`);
      }
    },
  };

  return Object.freeze({ core, selector, builder, vault });
}

export function attachFoundryProcesses(swarm) {
  const processes = createFoundryProcesses();
  const specs = [
    [processes.core, 4],
    [processes.selector, 4],
    [processes.builder, 2],
    [processes.vault, 2],
  ];
  const registered = specs.map(([target, maxConcurrency]) => swarm.registerTarget(target, {
    id: target.id,
    group: 'foundry',
    capabilities: target.capabilities,
    maxConcurrency,
    metadata: {
      source: 'foundry-complete.tar.gz',
      generation: 'pool-forge-vault',
      preservation: 'soft-archive',
    },
  }).id);
  return Object.freeze({ registered: Object.freeze(registered), missingLegacy: Object.freeze(['foundry-overseer']) });
}

export default attachFoundryProcesses;
