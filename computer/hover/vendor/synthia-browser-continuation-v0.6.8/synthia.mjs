/**
 * synthia.mjs
 * ------------
 * The one door in. Pure JavaScript (ESM), zero external dependencies,
 * runs unchanged in Node or a browser <script type="module">.
 *
 * This boots:
 *   - the Resolver          (resolver/Resolver.mjs)       - ingests every piece, picks the
 *                                                            best version, keeps all the rest reachable
 *   - DISEMINER              (src/runtime/disseminer.js)   - semantic/context engine
 *   - AutolingEngine          (src/runtime/autoling.js)     - linguistic/morphological engine
 *   - IntegratedToolFactory   (src/UPGRADES/vendor/integrated-tool-factory) - spawns new tools
 *                                                              on demand, addressed by dimension/gate/line
 *   - FourCornerSpace         (resolver/FourCornerSpace.mjs) - the 4-corner relational word space
 *
 * Nothing else in the project (the ~270 archived pieces: TS engines, the MCP
 * server, the mesh server, the youniverse-diseminer app, autonovel, etc.) is
 * force-wired in, because a lot of it depends on other pieces that don't line
 * up 1:1 across the versions you sent - importing it blindly would silently
 * crash on load. Instead every one of those pieces is registered with the
 * Resolver and loadable on demand:
 *
 *     const mod = await synthia.resolver.resolve('GraphRuntime.ts');
 *
 * If a piece fails to load standalone, the Resolver reports that instead of
 * taking the rest of Synthia down - that's the "autonomous, resolves itself"
 * behavior you described. Use `synthia.diagnostics()` to see what loaded.
 */

import { Resolver } from './resolver/Resolver.mjs';
import { FourCornerSpace } from './resolver/FourCornerSpace.mjs';

const IS_BROWSER = typeof window !== 'undefined';

function baseUrlFor(importMetaUrl) {
  if (IS_BROWSER) return new URL('.', importMetaUrl).toString();
  const dir = new URL('.', importMetaUrl).pathname;
  return dir;
}

export async function createSynthia({ baseUrl } = {}) {
  const root = baseUrl || baseUrlFor(import.meta.url);
  const resolver = new Resolver({
    manifestUrl: 'manifest/synthia-manifest.json',
    baseUrl: root,
  });
  await resolver.load();

  const space = new FourCornerSpace(['Intent', 'Context', 'Form', 'Memory']);

  const status = { disseminer: false, autoling: false, toolFactory: false };
  let disseminer = null, autoling = null, toolFactory = null;

  try {
    const mod = await import(IS_BROWSER ? new URL('src/runtime/disseminer.js', root) : `file://${root}src/runtime/disseminer.js`);
    disseminer = new mod.DISEMINER();
    status.disseminer = true;
  } catch (e) { status.disseminerError = String(e.message || e); }

  try {
    const mod = await import(IS_BROWSER ? new URL('src/runtime/autoling.js', root) : `file://${root}src/runtime/autoling.js`);
    autoling = new mod.AutolingEngine();
    status.autoling = true;
  } catch (e) { status.autolingError = String(e.message || e); }

  try {
    const mod = await import(IS_BROWSER
      ? new URL('src/UPGRADES/vendor/integrated-tool-factory/src/integrated-tool-factory.mjs', root)
      : `file://${root}src/UPGRADES/vendor/integrated-tool-factory/src/integrated-tool-factory.mjs`);
    toolFactory = new mod.IntegratedToolFactory({});
    status.toolFactory = true;
  } catch (e) { status.toolFactoryError = String(e.message || e); }

  function diagnostics() {
    return { ...status, resolverModules: resolver.manifest.modules.length };
  }

  /**
   * chat(input) - the thing that was missing.
   * Routes text through whatever engines actually loaded, and - if the intent
   * looks like a request for a capability Synthia doesn't have yet - asks the
   * ToolFactory to generate one, addressed by dimension/gate/line the way the
   * factory already knows how to do (this is the "spawn tools to complete
   * tasks" behavior).
   */
  async function chat(input, { spawnTools = true } = {}) {
    const reply = { input, engines: [] };

    if (disseminer) {
      try {
        disseminer.ingest(input, 'chat');
        reply.semantics = disseminer.infer(input);
        reply.engines.push('disseminer');
      } catch (e) { reply.disseminerError = String(e.message || e); }
    }

    if (autoling) {
      try {
        const segments = autoling.segmentInput(input);
        reply.linguistics = autoling.multiPathParse(segments);
        reply.engines.push('autoling');
      } catch (e) { reply.autolingError = String(e.message || e); }
    }

    if (spawnTools && toolFactory) {
      try {
        const route = toolFactory.router.route(input);
        if (route.status === 'resolved') {
          const gen = toolFactory.generate({ purpose: input, input });
          if (gen.status === 'generated' || gen.status === 'existing') {
            reply.tool = gen.tool.manifest();
            reply.engines.push('toolFactory');
          }
        } else {
          reply.routing = route;
        }
      } catch (e) { reply.toolFactoryError = String(e.message || e); }
    }

    if (!reply.engines.length) {
      reply.note = 'No engine could process this yet (see synthia.diagnostics()). Nothing crashed - the resolver keeps every piece isolated.';
    }
    return reply;
  }

  return { resolver, space, disseminer, autoling, toolFactory, diagnostics, chat };
}

export { Resolver, FourCornerSpace };
export default createSynthia;

/**
 * createSynthiaContactRuntime()
 * Modern v0.6.5 contact → understand → act entrypoint.
 * Keeps the historical lightweight createSynthia() API intact while exposing
 * the GraphRuntime-backed contact router, browser workflow, LCM short path,
 * and AutoNovel→MESSY expression handoff.
 */
export async function createSynthiaContactRuntime(options = {}) {
  const mod = await import('./src/UPGRADES/bootstrap/createSynthiaContactRuntime.js');
  return mod.createSynthiaContactRuntime(options);
}
