/** Read-only evaluator over chart state already computed by the resonance engine. */
export class ChartTiming {
  constructor({ chartStateProvider = null } = {}) {
    this.chartStateProvider = chartStateProvider;
    this.evaluations = [];
  }

  evaluate(proposal = {}, suppliedState = null) {
    const state = suppliedState ?? this.chartStateProvider?.() ?? {};
    const context = proposal.observation?.chartContext ?? proposal.chartContext ?? {};
    const gate = Number(context.gate);
    const line = Number(context.line);
    const definedGates = new Set(state.definedGates ?? state.gates?.filter((item) => item.defined).map((item) => item.gate) ?? []);
    const activeChannels = state.activeChannels ?? state.channels ?? [];
    let weight = 0;
    const reasons = [];
    if (Number.isInteger(gate) && definedGates.has(gate)) {
      weight += 1;
      reasons.push(`gate ${gate} is defined`);
    }
    const relevantChannel = activeChannels.find((channel) =>
      channel.gates?.includes?.(gate) || channel.gateA === gate || channel.gateB === gate);
    if (relevantChannel?.harmonic === true || relevantChannel?.completed === true) {
      weight += 1;
      reasons.push('a harmonic channel completion is active');
    }
    if (relevantChannel?.conflict === true || state.definitionConflict === true) {
      weight -= 2;
      reasons.push('a definition conflict is active');
    }
    if ([1, 2].includes(line) && ['architecture', 'pipeline'].includes(proposal.kind)) {
      weight += 0.5;
      reasons.push(`line ${line} supports foundational work`);
    }
    if ([5, 6].includes(line) && ['routing', 'tool_synthesis'].includes(proposal.kind)) {
      weight += 0.5;
      reasons.push(`line ${line} supports outward interaction work`);
    }
    if (!reasons.length) reasons.push('no relevant computed chart activation was supplied');
    const result = Object.freeze({
      appropriate: weight >= 0,
      heldUntil: weight < 0 ? (state.nextClearTransitAt ?? null) : null,
      context: reasons.join('; '),
      weight,
      source: 'read-only-computed-chart-state',
    });
    this.evaluations.push(result);
    return result;
  }
}

export default ChartTiming;
