export class ReversibleChangeLedger {
  constructor() { this.entries = []; this.cursor = -1; }

  async apply(change) {
    if (typeof change.apply !== 'function' || typeof change.revert !== 'function') throw new TypeError('REVERSIBLE_CHANGE_REQUIRED');
    const result = await change.apply();
    this.entries.splice(this.cursor + 1);
    this.entries.push({ ...change, result, status: 'applied' });
    this.cursor = this.entries.length - 1;
    return result;
  }

  async back() {
    if (this.cursor < 0) return Object.freeze({ status: 'nothing-to-undo' });
    const entry = this.entries[this.cursor];
    const result = await entry.revert(entry.result);
    entry.status = 'reverted';
    this.cursor -= 1;
    return Object.freeze({ status: 'reverted', id: entry.id, result });
  }
}

