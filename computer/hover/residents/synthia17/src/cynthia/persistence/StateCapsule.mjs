const clone = (value) => structuredClone(value);

export class StateCapsule {
  constructor({ store, key = 'cynthia:organism' } = {}) {
    if (!store) throw new TypeError('STATE_STORE_REQUIRED');
    this.store = store; this.key = key;
  }
  capture(nervousSystem) {
    return Object.freeze({
      schema: 'cynthia-state/1',
      sources: nervousSystem.organism.mind.sources.snapshot(),
      pressure: nervousSystem.organism.mind.pressure.snapshot(),
      episodes: nervousSystem.organism.episodes.snapshot(),
      events: nervousSystem.ledger.snapshot(),
      learnedTools: nervousSystem.learnedTools?.snapshot?.() ?? null,
      bookDependencies: nervousSystem.bookDependencies?.snapshot?.() ?? null,
      morph: nervousSystem.morph?.snapshot?.() ?? null,
      business: nervousSystem.business?.snapshot?.() ?? null,
      personalSynths: nervousSystem.personalSynths?.snapshot?.() ?? null,
      toolFactory: nervousSystem.toolFactory?.snapshot?.() ?? null,
      toolField: nervousSystem.toolField?.snapshot?.() ?? null,
      mcpToolMesh: nervousSystem.mcpToolMesh?.snapshot?.() ?? null,
    });
  }
  async save(nervousSystem) { const snapshot = this.capture(nervousSystem); await this.store.save(this.key, snapshot); return snapshot; }
  async restore(nervousSystem) {
    const snapshot = await this.store.load(this.key);
    if (!snapshot) return Object.freeze({ status: 'empty' });
    if (snapshot.schema !== 'cynthia-state/1') throw new Error('UNSUPPORTED_STATE_SCHEMA');
    nervousSystem.organism.mind.sources.restore(clone(snapshot.sources));
    nervousSystem.organism.mind.pressure.restore(clone(snapshot.pressure));
    nervousSystem.organism.episodes.restore(clone(snapshot.episodes));
    nervousSystem.ledger.restore(clone(snapshot.events));
    if(snapshot.learnedTools&&nervousSystem.learnedTools){nervousSystem.learnedTools.restore(clone(snapshot.learnedTools));await nervousSystem.learnedTools.installAll(nervousSystem.ato.mesh);}
    if(snapshot.bookDependencies&&nervousSystem.bookDependencies)nervousSystem.bookDependencies.restore(clone(snapshot.bookDependencies));
    if(snapshot.morph&&nervousSystem.morph)nervousSystem.morph.restore(clone(snapshot.morph));
    if(snapshot.business&&nervousSystem.business)nervousSystem.business.restore(clone(snapshot.business));
    if(snapshot.personalSynths&&nervousSystem.personalSynths)nervousSystem.personalSynths.restore(clone(snapshot.personalSynths));
    if(snapshot.toolFactory&&nervousSystem.factoryBridge?.restoreSnapshot) nervousSystem.factoryBridge.restoreSnapshot(clone(snapshot.toolFactory));
    if(snapshot.mcpToolMesh&&nervousSystem.mcpToolMesh) nervousSystem.mcpToolMesh.restore(clone(snapshot.mcpToolMesh));
    if(snapshot.toolField&&nervousSystem.toolField) nervousSystem.toolField.restore(clone(snapshot.toolField));
    return Object.freeze({ status: 'restored', snapshot });
  }
}
