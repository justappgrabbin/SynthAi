const clone = value => value === undefined ? undefined : structuredClone(value);

export class TriformWorldAdapter {
  constructor({ worldModule, characters = [], id = 'lab:triform', initialState = null } = {}) {
    if (!worldModule?.createWorldState || !worldModule?.applyWorldConsequence) {
      throw new TypeError('TriformWorldAdapter requires createWorldState() and applyWorldConsequence()');
    }
    Object.assign(this, { worldModule, id });
    this.name = 'Triform';
    this.characters = [...characters];
    this.state = initialState ? clone(initialState) : worldModule.createWorldState(this.characters);
    this.residentCharacters = new Map();
    this.listeners = new Set();
    this.tick = 0;
    this.eventId = 0;
  }

  bindResident(residentId, character) {
    if (!character?.id) throw new Error('Triform resident requires a character with id');
    if (!this.characters.some(item => item.id === character.id)) this.characters.push(character);
    if (!this.state.presences?.some(item => item.characterId === character.id) && this.worldModule.addResidentToWorld) {
      this.state = this.worldModule.addResidentToWorld(this.state, character, this.characters);
    }
    this.residentCharacters.set(String(residentId), character.id);
    this.#emit({ type: 'triform:resident-bound', summary: `${character.name ?? residentId} entered Triform`, payload: { residentId, characterId: character.id } });
    return clone(character);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  snapshot() {
    return { id: this.id, name: this.name, tick: this.tick, eventId: this.eventId, state: clone(this.state), residents: Object.fromEntries(this.residentCharacters) };
  }

  async applyAction(action = {}) {
    const residentId = String(action.actor ?? action.residentId ?? 'synthia');
    const characterId = this.residentCharacters.get(residentId) ?? Number(action.actorId);
    const actor = this.characters.find(item => item.id === characterId);
    if (!actor) return { accepted: false, reason: 'NO_TRIFORM_RESIDENT', residentId };

    const type = String(action.type ?? action.action ?? 'consequence');
    const payload = action.payload ?? {};
    this.tick += 1;
    this.eventId += 1;

    if (type === 'guide' && this.worldModule.guideResident) {
      this.state = this.worldModule.guideResident(this.state, this.characters, actor.id);
    } else if (type === 'visit-automaton' && this.worldModule.visitAutomatonHome) {
      this.state = this.worldModule.visitAutomatonHome(this.state, actor, this.characters, String(payload.automatonId ?? action.target?.automatonId));
    } else if (type === 'automata-consequence' && this.worldModule.applyAutomataConsequence) {
      const output = this.worldModule.applyAutomataConsequence({
        state: this.state,
        actor,
        characters: this.characters,
        result: payload.result,
        tick: this.tick,
        eventId: this.eventId,
        intent: payload.intent,
        automatonId: payload.automatonId,
      });
      this.state = output.world;
      this.#emit({ type: 'triform:automata-consequence', summary: output.artifact?.phrase ?? 'Triform automata consequence', payload: clone(output) });
      return { accepted: true, type, ...clone(output), snapshot: this.snapshot() };
    } else if (payload.result) {
      this.state = this.worldModule.applyWorldConsequence(
        this.state,
        actor,
        this.characters,
        payload.result,
        this.tick,
        this.eventId,
        payload.intent,
      );
    } else {
      return { accepted: false, reason: 'TRIFORM_RESULT_REQUIRED', type };
    }

    const result = { accepted: true, type, tick: this.tick, eventId: this.eventId, snapshot: this.snapshot() };
    this.#emit({ type: 'triform:consequence', summary: `Triform consequence at tick ${this.tick}`, payload: result });
    return result;
  }

  #emit(event) {
    const normalized = { id: event.id ?? `triform-${this.eventId}`, source: this.id, at: new Date().toISOString(), ...clone(event) };
    for (const listener of this.listeners) {
      try { listener(clone(normalized)); } catch {}
    }
  }
}

export default TriformWorldAdapter;
