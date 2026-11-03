/**
 * Synthia Runtime Bridge
 * Connects the External Opportunity / Consent membrane to an existing
 * SynthiaResonanceRuntime instance without modifying the runtime itself.
 */
export class SynthiaRuntimeBridge {
  constructor({runtime, successAutomaton=null, mesh=null, eventBus=null}={}) {
    if (!runtime) throw new Error('SynthiaRuntimeBridge requires an existing runtime instance');
    this.runtime = runtime;
    this.successAutomaton = successAutomaton;
    this.mesh = mesh;
    this.eventBus = eventBus;
  }

  /** Read unresolved runtime demands/gaps as normalized capability needs. */
  getOpenNeeds({owner='synthia'}={}) {
    const intent = this.runtime.intent;
    const aspiration = this.runtime.agent?.getAspiration?.() || this.runtime.agent?.aspiration;
    const demands = intent?.getDemands?.() || [];
    const gaps = aspiration?.getTopGaps?.(20) || aspiration?.getGaps?.()?.filter(g=>!g.resolvedAt) || [];

    const normalizedDemands = demands.map((d, i) => ({
      needId: d.id || `runtime-demand-${i}`,
      owner,
      description: d.description || d.context || d.type || 'Runtime capability demand',
      requiredCapabilities: Array.isArray(d.requiredCapabilities) ? d.requiredCapabilities : [d.type].filter(Boolean),
      urgency: Number.isFinite(d.urgency) ? d.urgency : Number.isFinite(d.intensity) ? d.intensity : 0.5,
      expectedValue: d.expectedValue || {},
      source: 'IntentFlow',
      runtimeRef: d
    }));

    const normalizedGaps = gaps.map((g, i) => ({
      needId: g.id || `runtime-gap-${i}`,
      owner,
      description: g.question || g.domain || 'Knowledge/capability gap',
      requiredCapabilities: Array.isArray(g.requiredCapabilities) ? g.requiredCapabilities : [g.domain].filter(Boolean),
      urgency: Number.isFinite(g.urgency) ? g.urgency : 0.5,
      expectedValue: g.expectedValue || {},
      source: 'AspirationCore',
      runtimeRef: g
    }));

    return [...normalizedDemands, ...normalizedGaps];
  }

  /** Adapter consumed by ExternalOpportunityOrchestrator.recordOutcome(). */
  scienceAdapter() {
    return {
      recordExperiment: async ({opportunityId, predicted, actual}) => {
        const science = this.runtime.agent?.getScience?.() || this.runtime.agent?.science;
        if (!science?.recordExperiment) return {recorded:false, reason:'ScienceMode unavailable'};
        const query = science.formulateQuestion?.(`Did external opportunity ${opportunityId} create the predicted reciprocal value?`);
        const queryId = query?.id || opportunityId;
        const exp = science.recordExperiment(queryId, `external_opportunity:${opportunityId}`, predicted, actual);
        await this.eventBus?.emit?.('science.external-opportunity.recorded', {opportunityId, experiment:exp});
        return {recorded:true, experiment:exp};
      }
    };
  }

  /** Adapter for the existing SuccessAutomaton or equivalent success system. */
  successAdapter() {
    return {
      observe: async (payload) => {
        const target = this.successAutomaton;
        if (!target) return {recorded:false, reason:'SuccessAutomaton unavailable'};
        if (typeof target.observe === 'function') return target.observe(payload);
        if (typeof target.record === 'function') return target.record(payload);
        if (typeof target.ingest === 'function') return target.ingest(payload);
        return {recorded:false, reason:'Unsupported SuccessAutomaton contract'};
      }
    };
  }

  /** Return an optional mesh adapter that emits external outcomes into the organism. */
  meshAdapter() {
    return {
      publish: async (type, payload) => {
        if (this.mesh?.emit) return this.mesh.emit(type, payload);
        if (this.mesh?.publish) return this.mesh.publish(type, payload);
        if (this.mesh?.dispatch) return this.mesh.dispatch({type, payload});
        return false;
      }
    };
  }
}
