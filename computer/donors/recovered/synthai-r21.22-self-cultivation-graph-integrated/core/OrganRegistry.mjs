/**
 * OrganRegistry — soft curtain version
 *
 * status values:
 *   active    — always eligible for automatic routing
 *   available — can be run by explicit request or when route() includes it
 *   legacy    — kept for continuity; runnable when explicitly asked
 *   dormant   — present but blocked until activated
 */
export class OrganRegistry {
  constructor() {
    this.organs = new Map();
    this.wiring = [];
  }

  register(organ, { status = 'active', source = [], replaces = [] } = {}) {
    if (!organ?.id || typeof organ.execute !== 'function') {
      throw new TypeError('organ requires id and execute');
    }
    this.organs.set(organ.id, { organ, status, source, replaces });
    return organ;
  }

  /** Promote or demote an organ without re-registering */
  setStatus(id, status) {
    const x = this.organs.get(id);
    if (!x) return false;
    x.status = status;
    return true;
  }

  activate(id) {
    return this.setStatus(id, 'active');
  }

  list() {
    return [...this.organs].map(([id, x]) => ({
      id,
      status: x.status,
      capabilities: x.organ.capabilities || [],
      source: x.source,
      replaces: x.replaces
    }));
  }

  find(intent) {
    return [...this.organs.values()]
      .filter(x => (x.status === 'active' || x.status === 'available') &&
                   (typeof x.organ.accepts !== 'function' || x.organ.accepts(intent)))
      .map(x => x.organ);
  }

  get(id) {
    return this.organs.get(id)?.organ || null;
  }

  async run(id, input) {
    const x = this.organs.get(id);
    if (!x) return { ok: false, error: `Unknown organ ${id}` };
    // Soft curtain: active, available, and legacy are all runnable.
    // Only 'dormant' is hard-blocked.
    if (x.status === 'dormant') {
      return { ok: false, error: `Organ ${id} is dormant — call registry.activate('${id}') first` };
    }
    return await x.organ.execute(input);
  }

  snapshot() {
    return this.list();
  }
}

export default OrganRegistry;
