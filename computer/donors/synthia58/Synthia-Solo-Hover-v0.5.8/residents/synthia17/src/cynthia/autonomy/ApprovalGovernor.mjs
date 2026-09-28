const freeze = (value) => Object.freeze(structuredClone(value));

export class ApprovalGovernor {
  constructor({ settings, now = () => Date.now() } = {}) {
    if (!settings) throw new TypeError('ApprovalGovernor requires protected settings');
    this.settings = settings;
    this.now = now;
    this.pending = new Map();
    this.history = [];
  }

  submit(change) {
    const proposal = freeze({
      id: change.id ?? `change-${crypto.randomUUID()}`,
      createdAt: this.now(),
      status: 'pending',
      confidence: 0,
      resonance: 0,
      risk: 'medium',
      touchesProtectedSettings: false,
      ...change,
    });
    this.pending.set(proposal.id, proposal);
    return proposal;
  }

  decide(id, decision, actor = 'owner') {
    const proposal = this.pending.get(id);
    if (!proposal) throw new Error('PROPOSAL_NOT_FOUND');
    if (!['approve', 'reject'].includes(decision)) throw new Error('INVALID_DECISION');
    return this.#close(proposal, decision === 'approve' ? 'approved' : 'rejected', actor);
  }

  governExpired() {
    const policy = this.settings.read();
    const results = [];
    for (const proposal of this.pending.values()) {
      if (this.now() - proposal.createdAt < policy.autonomy.approvalTimeoutMs) continue;
      const protectedChange = proposal.touchesProtectedSettings || proposal.risk === 'critical';
      const qualified = proposal.confidence >= policy.autonomy.confidenceThreshold
        && proposal.resonance >= policy.safety.resonanceThreshold;
      results.push(this.#close(proposal, !protectedChange && qualified ? 'governor-approved' : 'governor-rejected', 'governor'));
    }
    return results;
  }

  #close(proposal, status, actor) {
    this.pending.delete(proposal.id);
    const event = freeze({ ...proposal, status, decidedAt: this.now(), actor });
    this.history.push(event);
    return event;
  }
}

