const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export class PressureMesh {
  constructor() {
    this.capacity = new Map();
    this.memory = new Map();
    this.current = new Map();
  }

  register(id, { availability = 1, competence = 0.5 } = {}) {
    this.capacity.set(id, Object.freeze({ availability: clamp01(availability), competence: clamp01(competence) }));
    if (!this.memory.has(id)) this.memory.set(id, { successes: 0, failures: 0, uses: 0 });
    return this;
  }

  press(id, { need = 0, urgency = 0, unresolved = 0, salience = 0 } = {}) {
    const pressure = clamp01((clamp01(need) * 0.4) + (clamp01(urgency) * 0.25) + (clamp01(unresolved) * 0.25) + (clamp01(salience) * 0.1));
    this.current.set(id, pressure);
    return pressure;
  }

  release(id) { this.current.delete(id); }

  memoryStrength(id) {
    const record = this.memory.get(id) || { successes: 0, failures: 0, uses: 0 };
    return record.uses ? record.successes / record.uses : 0.5;
  }

  weight(from, to, resonance = 1) {
    const a = this.capacity.get(from) || { availability: 0, competence: 0 };
    const b = this.capacity.get(to) || { availability: 0, competence: 0 };
    const pressure = Math.max(this.current.get(from) || 0, this.current.get(to) || 0);
    const availability = Math.min(a.availability, b.availability);
    const competence = (a.competence + b.competence + this.memoryStrength(from) + this.memoryStrength(to)) / 4;
    return clamp01(pressure * clamp01(resonance) * availability * competence);
  }

  record(id, success) {
    const prior = this.memory.get(id) || { successes: 0, failures: 0, uses: 0 };
    const next = { successes: prior.successes + (success ? 1 : 0), failures: prior.failures + (success ? 0 : 1), uses: prior.uses + 1 };
    this.memory.set(id, next);
    return Object.freeze({ ...next });
  }
  snapshot() { return Object.freeze({ capacity:[...this.capacity.entries()], memory:[...this.memory.entries()], current:[...this.current.entries()] }); }
  restore(snapshot) { this.capacity=new Map(snapshot.capacity??[]);this.memory=new Map(snapshot.memory??[]);this.current=new Map(snapshot.current??[]);return this; }
}
