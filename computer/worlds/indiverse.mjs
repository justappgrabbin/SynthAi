const clone = value => value === undefined ? undefined : structuredClone(value);
const safeKey = value => String(value ?? 'world').replace(/[^A-Za-z0-9_-]/g, c => `_${c.charCodeAt(0).toString(16)}`);

export const DEFAULT_QUALIA_GRAMMAR = Object.freeze({
  colors: {}, materials: {}, symbols: {}, orientation: {}, scale: {}, thresholds: {}, movement: {}, embodiment: {}, sound: {}, atmosphere: {},
});

function mergeGrammar(grammar = {}) {
  return Object.fromEntries(Object.keys(DEFAULT_QUALIA_GRAMMAR).map(key => [key, { ...DEFAULT_QUALIA_GRAMMAR[key], ...(grammar[key] ?? {}) }]));
}

function missingAffordances(requirements = [], capabilities = []) {
  const have = new Set(capabilities.map(String));
  return requirements.filter(req => !have.has(String(req)));
}

export class IndiVerseRuntime {
  constructor({ state, bus = null, mesh = null, clock = () => Date.now() } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('IndiVerseRuntime requires a StateStore-like state service');
    Object.assign(this, { state, bus, mesh, clock });
  }

  async registerCanonicalObject(object = {}) {
    if (!object.id || !object.kind) throw new Error('canonical object requires id and kind');
    const record = {
      id: String(object.id), kind: String(object.kind), function: object.function ?? null,
      topology: clone(object.topology ?? {}), affordances: clone(object.affordances ?? []),
      entryPoints: clone(object.entryPoints ?? []), relations: clone(object.relations ?? []),
      presentation: clone(object.presentation ?? {}), metadata: clone(object.metadata ?? {}),
      updatedAt: this.clock(),
    };
    await this.state.set(`indiverse.canonical.${safeKey(record.id)}`, record, { source: 'indiverse' });
    this.bus?.emit('indiverse:canonical-object', clone(record));
    return clone(record);
  }

  canonicalObject(id) { return this.state.get(`indiverse.canonical.${safeKey(id)}`, null); }

  async createWorld(ownerId, { id = `indiverse:${ownerId}`, name = null, grammar = {}, publicState = {}, metadata = {} } = {}) {
    const record = {
      id: String(id), ownerId: String(ownerId), name: name ?? `${ownerId} IndiVerse`,
      grammar: mergeGrammar(grammar), publicState: clone(publicState), metadata: clone(metadata),
      createdAt: this.clock(), updatedAt: this.clock(),
    };
    await this.state.set(`indiverse.worlds.${safeKey(record.id)}`, record, { source: 'indiverse' });
    if (this.mesh) {
      await this.mesh.registerParticipant(record.id, {
        kind: 'indiverse', publicState: { name: record.name, ...clone(publicState) },
        capabilities: ['world.qualia-contract', 'world.host-expression', 'world.visitor-morph'], residency: 'warm',
        metadata: { ownerId: record.ownerId },
      });
    }
    this.bus?.emit('indiverse:world-created', clone(record));
    return clone(record);
  }

  world(id) { return this.state.get(`indiverse.worlds.${safeKey(id)}`, null); }

  async updateGrammar(worldId, patch = {}) {
    const world = this.world(worldId);
    if (!world) throw new Error(`unknown IndiVerse: ${worldId}`);
    world.grammar = mergeGrammar(Object.fromEntries(Object.keys(DEFAULT_QUALIA_GRAMMAR).map(key => [key, { ...(world.grammar?.[key] ?? {}), ...(patch[key] ?? {}) }])));
    world.updatedAt = this.clock();
    await this.state.set(`indiverse.worlds.${safeKey(worldId)}`, world, { source: 'indiverse' });
    this.bus?.emit('indiverse:grammar-updated', { worldId, grammar: clone(world.grammar) });
    return clone(world);
  }

  renderShared(objectId) {
    const canonical = this.canonicalObject(objectId);
    if (!canonical) throw new Error(`unknown canonical object: ${objectId}`);
    return { mode: 'shared', objectId: canonical.id, canonical: clone(canonical), expression: clone(canonical.presentation), grammar: null, difference: {} };
  }

  renderInWorld(worldId, objectId) {
    const world = this.world(worldId);
    const canonical = this.canonicalObject(objectId);
    if (!world) throw new Error(`unknown IndiVerse: ${worldId}`);
    if (!canonical) throw new Error(`unknown canonical object: ${objectId}`);
    const grammar = world.grammar;
    const objectKey = canonical.kind;
    const expression = {
      ...clone(canonical.presentation),
      color: grammar.colors[objectKey] ?? grammar.colors.default ?? canonical.presentation?.color ?? null,
      material: grammar.materials[objectKey] ?? grammar.materials.default ?? canonical.presentation?.material ?? null,
      symbol: grammar.symbols[objectKey] ?? grammar.symbols.default ?? canonical.presentation?.symbol ?? null,
      orientation: { ...(canonical.presentation?.orientation ?? {}), ...(grammar.orientation.default ?? {}), ...(grammar.orientation[objectKey] ?? {}) },
      scale: grammar.scale[objectKey] ?? grammar.scale.default ?? canonical.presentation?.scale ?? 1,
      atmosphere: { ...(grammar.atmosphere.default ?? {}), ...(grammar.atmosphere[objectKey] ?? {}) },
    };
    return {
      mode: 'host-qualia', worldId: world.id, ownerId: world.ownerId, objectId: canonical.id,
      canonical: clone(canonical), expression, grammar: clone(grammar),
      difference: {
        color: expression.color !== canonical.presentation?.color,
        material: expression.material !== canonical.presentation?.material,
        symbol: expression.symbol !== canonical.presentation?.symbol,
        orientation: JSON.stringify(expression.orientation) !== JSON.stringify(canonical.presentation?.orientation ?? {}),
        scale: expression.scale !== (canonical.presentation?.scale ?? 1),
      },
    };
  }

  visitorContract({ worldId, objectId, visitor = {}, scene = {} } = {}) {
    const rendered = this.renderInWorld(worldId, objectId);
    const thresholdRules = rendered.grammar.thresholds?.[rendered.canonical.kind] ?? rendered.grammar.thresholds?.default ?? {};
    const requirements = [...new Set([
      ...(rendered.canonical.affordances?.flatMap(a => a.requires ?? []) ?? []),
      ...(thresholdRules.requires ?? []),
      ...(scene.requires ?? []),
    ].map(String))];
    const missing = missingAffordances(requirements, visitor.capabilities ?? []);
    const alternatives = clone(thresholdRules.alternatives ?? scene.alternatives ?? {});
    return {
      worldId, objectId,
      identityInvariant: clone(visitor.identity ?? null),
      hostExpression: rendered.expression,
      hostGrammar: rendered.grammar,
      requiredAffordances: requirements,
      missingAffordances: missing,
      suggestedAdaptations: missing.map(req => alternatives[req] ?? { capability: req, mode: 'acquire-or-morph' }),
      sceneMorph: clone(scene.morph ?? rendered.grammar.embodiment?.default ?? null),
    };
  }

  snapshot() {
    return {
      worlds: Object.values(this.state.get('indiverse.worlds', {}) ?? {}).filter(Boolean),
      canonicalObjects: Object.values(this.state.get('indiverse.canonical', {}) ?? {}).filter(Boolean),
    };
  }
}

export default IndiVerseRuntime;
