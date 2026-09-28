import { AutomataMesh, Automaton } from '../ato-core/automaton.mjs';

const DEFAULT_EXCLUDED_GROUPS = new Set([
  'orchestration',
  'klein-hands',
  'foundry-tools',
]);

const DEFAULT_EXCLUDED_WORKERS = new Set();

function safeAddress(worker) {
  const a = worker?.address || {};
  return {
    mode: a.mode || 'macro',
    gate: Number(a.gate) >= 1 && Number(a.gate) <= 64 ? Number(a.gate) : 1,
    line: Number(a.line) >= 1 && Number(a.line) <= 6 ? Number(a.line) : 1,
    color: Number(a.color) >= 1 && Number(a.color) <= 6 ? Number(a.color) : 1,
    tone: Number(a.tone) >= 1 && Number(a.tone) <= 6 ? Number(a.tone) : 1,
    base: Number(a.base) >= 1 && Number(a.base) <= 5 ? Number(a.base) : 1,
  };
}

/**
 * Makes outer swarm hands discoverable from Synthia's existing ATO capability
 * broker. Every hand remains its own ProcessAdapter; this bridge only publishes
 * a callable proxy contract into an AutomataMesh.
 */
export class SwarmCapabilityBridge extends EventTarget {
  constructor({
    swarm,
    mesh = new AutomataMesh(),
    excludeGroups = DEFAULT_EXCLUDED_GROUPS,
    excludeWorkerIds = DEFAULT_EXCLUDED_WORKERS,
    onProxy = null,
  } = {}) {
    super();
    if (!swarm?.workers || typeof swarm.addEventListener !== 'function') {
      throw new TypeError('SwarmCapabilityBridge requires a SynthiaSwarmBody');
    }
    this.id = 'synthia-swarm-capability-bridge';
    this.swarm = swarm;
    this.mesh = mesh;
    this.excludeGroups = new Set(excludeGroups || []);
    this.excludeWorkerIds = new Set(excludeWorkerIds || []);
    this.onProxy = typeof onProxy === 'function' ? onProxy : null;
    this.proxies = new Map();
    this.listener = (event) => {
      if (event?.detail?.type === 'worker:registered') this.sync();
    };
    this.swarm.addEventListener('swarm', this.listener);
    this.sync();
  }

  eligible(worker) {
    return Boolean(
      worker &&
      Array.isArray(worker.capabilities) &&
      worker.capabilities.length &&
      !this.excludeGroups.has(worker.group) &&
      !this.excludeWorkerIds.has(worker.id)
    );
  }

  sync() {
    const added = [];
    for (const worker of this.swarm.workers.values()) {
      if (!this.eligible(worker)) continue;
      const id = `swarm:${worker.id}`;
      if (this.proxies.has(id)) continue;
      const proxy = new Automaton({
        id,
        address: safeAddress(worker),
        structure: 'hexagram',
        activeLevels: [1, 2, 3, 4, 5],
        functionalLevel: 'being',
        ports: [
          { id: 'input', direction: 'input', type: 'json', schemaVersion: '1' },
          { id: 'output', direction: 'output', type: 'json', schemaVersion: '1' },
        ],
        metadata: {
          family: 'swarm-hand-proxy',
          independent: false,
          proxiedWorkerId: worker.id,
          group: worker.group,
          location: worker.location,
          capabilities: Object.freeze([...worker.capabilities]),
        },
        implementation: async (input, context = {}) => worker.invoke(input, {
          ...context,
          source: 'synthia-inner-capability-broker',
          proxiedBy: this.id,
        }),
      });
      this.mesh.add(proxy);
      this.proxies.set(id, proxy);
      if (this.onProxy) this.onProxy(proxy, worker);
      added.push(id);
      this.dispatchEvent(new CustomEvent('proxy', { detail: { id, workerId: worker.id } }));
    }
    return Object.freeze(added);
  }

  snapshot() {
    return Object.freeze({
      id: this.id,
      proxyCount: this.proxies.size,
      proxies: Object.freeze([...this.proxies.values()].map((proxy) => Object.freeze({
        id: proxy.id,
        capabilities: Object.freeze([...(proxy.metadata?.capabilities || [])]),
        workerId: proxy.metadata?.proxiedWorkerId || null,
      }))),
    });
  }

  close() {
    this.swarm.removeEventListener('swarm', this.listener);
  }
}

export default SwarmCapabilityBridge;
