/**
 * Synthia Resolver
 * -----------------
 * Every piece from every upgrade zip you ever sent is in this project.
 * Nothing was thrown away. This file is the "you don't have to pick" button.
 *
 * How it works:
 *  - manifest/synthia-manifest.json lists all 218 logical modules Synthia is made of.
 *  - For each one, a "canonical" version was chosen automatically (the most
 *    evolved / most recent one, following the v0_2 -> v0_3 -> v0_4 -> v0_5 -> v0_6
 *    lineage actually present in your files).
 *  - Every OTHER version of that module (older drafts, forks, preserved copies)
 *    is archived under resolver/variants/<ModuleName>/<hash>.ext and listed here.
 *  - Nothing is deleted. Nothing is hidden. You can ask the resolver to load
 *    an older variant instead of the canonical one, compare them, or list them,
 *    at any time, without touching a zip file again.
 *
 * This is pure JavaScript (ESM). No build step. No bundler required to use it.
 * Works in Node and in the browser unchanged.
 */

export class Resolver {
  constructor({ manifestUrl, baseUrl } = {}) {
    this.manifestUrl = manifestUrl;
    this.baseUrl = baseUrl; // string prefix or URL used to resolve relative module paths
    this.manifest = null;
    this.cache = new Map(); // moduleName -> loaded exports
    this.overrides = new Map(); // moduleName -> variant hash to use instead of canonical
  }

  async load() {
    if (this.manifest) return this.manifest;
    const text = await this._fetchText(this.manifestUrl);
    this.manifest = JSON.parse(text);
    return this.manifest;
  }

  async _fetchText(relPath) {
    const full = this._resolvePath(relPath);
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      const res = await fetch(full);
      if (!res.ok) throw new Error(`Resolver: failed to fetch ${full}`);
      return res.text();
    }
    const { readFile } = await import('node:fs/promises');
    return readFile(full, 'utf8');
  }

  _resolvePath(relPath) {
    if (!this.baseUrl) return relPath;
    if (typeof window !== 'undefined') return new URL(relPath, this.baseUrl).toString();
    const base = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
    return base + relPath;
  }

  list() {
    if (!this.manifest) throw new Error('Resolver: call load() first');
    return this.manifest.modules.map(m => ({
      name: m.name,
      canonical: m.canonical.path,
      variantCount: m.variantCount,
    }));
  }

  find(name) {
    if (!this.manifest) throw new Error('Resolver: call load() first');
    const m = this.manifest.modules.find(x => x.name === name);
    if (!m) throw new Error(`Resolver: no module named "${name}"`);
    return m;
  }

  variants(name) {
    return this.find(name).variants;
  }

  /** Pin a module to a specific archived variant hash instead of the canonical file. */
  use(name, hash) {
    const m = this.find(name);
    if (hash && !m.variants.some(v => v.hash === hash) && m.canonical.hash !== hash) {
      throw new Error(`Resolver: "${name}" has no variant ${hash}`);
    }
    this.overrides.set(name, hash);
    this.cache.delete(name);
  }

  /** Reset a module back to its auto-selected canonical version. */
  reset(name) {
    this.overrides.delete(name);
    this.cache.delete(name);
  }

  /**
   * Dynamically import a module by its logical name (e.g. "SynthiaSubstrate.ts").
   * Resolves to whichever variant is currently selected (canonical by default).
   * .ts/.tsx entries are transparently redirected to their type-stripped .js sibling,
   * since Synthia is pure JavaScript at runtime.
   */
  async resolve(name) {
    if (this.cache.has(name)) return this.cache.get(name);
    const m = this.find(name);
    const pinned = this.overrides.get(name);
    let relPath;
    if (pinned && pinned !== m.canonical.hash) {
      const v = m.variants.find(v => v.hash === pinned);
      relPath = v.path;
    } else {
      relPath = m.canonical.path;
    }
    relPath = relPath.replace(/\.tsx?$/, '.js');
    const full = this._resolvePath(relPath);
    const url = typeof window !== 'undefined' ? full : new URL(`file://${full}`).href;
    let mod;
    try {
      mod = await import(/* @vite-ignore */ url);
    } catch (err) {
      // Autonomous degradation: a piece that can't stand on its own yet
      // doesn't take the rest of Synthia down with it.
      return { __resolverError: String(err && err.message || err), name, path: relPath };
    }
    this.cache.set(name, mod);
    return mod;
  }
}

export default Resolver;
