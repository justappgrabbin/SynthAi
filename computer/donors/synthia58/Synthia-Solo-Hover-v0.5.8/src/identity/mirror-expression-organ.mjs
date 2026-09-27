import { safe } from '../util.mjs';

/** A stateful swarm organ whose output is used by every personalized path. */
export class MirrorExpressionOrgan {
  constructor({ semanticGenome, identityProvider } = {}) {
    if (!semanticGenome?.configureForTask) throw new TypeError('MirrorExpressionOrgan requires SemanticGenome');
    if (typeof identityProvider !== 'function') throw new TypeError('MirrorExpressionOrgan requires identityProvider');
    this.id = 'birth-mirror-expression-organ';
    this.capabilities = Object.freeze(['express-birth-mirror']);
    this.semanticGenome = semanticGenome;
    this.identityProvider = identityProvider;
    this.calls = 0;
    this.last = null;
  }

  run(input = {}, context = {}) {
    const identity = this.identityProvider();
    if (!identity?.configured) {
      const error = new Error('birth mirror must be configured before swarm expression');
      error.code = 'BIRTH_CONFIGURATION_REQUIRED';
      throw error;
    }
    const task = input.task ?? input.message ?? input;
    const configured = this.semanticGenome.configureForTask(task, {
      ...context,
      agentId: identity.agentId,
      personId: identity.personId,
      address: input.address ?? context.address,
    });
    const result = Object.freeze({
      ok: true,
      configurationId: identity.id,
      agentId: identity.agentId,
      personId: identity.personId,
      address: configured.address,
      identityAddress: configured.identityAddress,
      coordinateSignature: configured.coordinateSignature,
      workingSet: safe(configured.workingSet),
      strongestSynergies: safe(configured.strongestSynergies),
      heldTensions: safe(configured.heldTensions),
      downstreamContract: 'address-and-aspect-selection-must-enter-cognition/centers/channels',
    });
    this.calls += 1;
    this.last = result;
    return result;
  }

  exportState() {
    return Object.freeze({ calls: this.calls, last: safe(this.last) });
  }

  importState(state = {}) {
    this.calls = Number(state.calls ?? 0);
    this.last = state.last ?? null;
  }

  snapshot() {
    return Object.freeze({
      id: this.id,
      capabilities: this.capabilities,
      calls: this.calls,
      configured: Boolean(this.identityProvider()?.configured),
      last: safe(this.last),
    });
  }
}

export default MirrorExpressionOrgan;
