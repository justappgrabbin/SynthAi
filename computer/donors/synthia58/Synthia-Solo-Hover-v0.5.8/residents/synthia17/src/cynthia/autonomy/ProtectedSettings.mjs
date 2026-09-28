const DEFAULTS = Object.freeze({
  autonomy: Object.freeze({ mode: 'supervised', confidenceThreshold: 0.9, approvalTimeoutMs: 72 * 60 * 60 * 1000 }),
  safety: Object.freeze({ resonanceThreshold: 0.75, allowMainRealmEval: false, protectSettings: true }),
});

const clone = (value) => structuredClone(value);

export class ProtectedSettings {
  #state;
  #ownerToken;

  constructor(initial = {}) {
    this.#ownerToken = Object.freeze({ owner: crypto.randomUUID() });
    this.#state = { ...clone(DEFAULTS), ...clone(initial) };
  }

  ownerCapability() { return this.#ownerToken; }
  read() { return Object.freeze(clone(this.#state)); }

  update(patch, capability) {
    if (capability !== this.#ownerToken) throw new Error('OWNER_CAPABILITY_REQUIRED');
    this.#state = { ...this.#state, ...clone(patch) };
    return this.read();
  }

  assertSelfEditAllowed(path) {
    if (/^(autonomy|safety)(\.|$)/.test(String(path))) throw new Error('PROTECTED_SETTINGS_BOUNDARY');
    return true;
  }
}

