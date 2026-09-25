/**
 * EvidenceMetaLearner — evidence-driven learning decision surface.
 *
 * Reconciles the intent of the older MetaLearningController into the current
 * living organism without restoring ephemeris, canned partner profiles, or
 * fixed domain plans (astronomy/codon-PDF/etc.).
 *
 * Process it owns:
 *   missing capability / support gap / open developmental pressure
 *   → learning goal
 *   → evidence gathering plan
 *   → capability hypothesis
 *   → (feeds EmergenceEngine + ATO path)
 *   → verification via later outcome evidence
 *
 * Who invokes: EmergenceEngine.onPulse / LivingLoop pressure path.
 * Consumes: DevelopmentalSelf, CoupledDevelopment, ComplementaryGap, SuccessMetabolism, open needs.
 * Produces: learning goals + structured hypotheses with provenance.
 * Output goes to: EmergenceEngine hypotheses + memory + optional factory pressure.
 * When: on living pulse when pressure or missing capability is present.
 * Why: the organism must learn first when it does not know how, rather than blind calculation or immediate ATO.
 */

const clone = x => x == null ? x : structuredClone(x);
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export class EvidenceMetaLearner {
  constructor({ unit } = {}) {
    if (!unit) throw new Error('EvidenceMetaLearner requires SynthiaUnit');
    this.unit = unit;
    this.memory = unit.memory;
    this.skillLibrary = new Map(); // retained concept: reusable learned skills/bridges
    this.learningQueue = [];
    this.synthesisLog = [];
    this.sequence = 0;
    this.#restore();
  }

  #restore() {
    for (const row of this.memory?.query?.('meta-learning-goals') || []) {
      const v = row.value || row;
      if (v?.id && !this.learningQueue.some(x => x.id === v.id)) this.learningQueue.push(v);
    }
    for (const row of this.memory?.query?.('meta-skill-library') || []) {
      const v = row.value || row;
      if (v?.key) this.skillLibrary.set(v.key, v);
    }
  }

  /**
   * Decide what to learn from current organism pressure.
   * Returns null when there is nothing that requires learning.
   */
  decideFromPressure({ development = null, coupled = null, openNeeds = [] } = {}) {
    const missing = [
      ...(development?.becoming?.missingCapabilities || []),
      ...(coupled?.supportGap || []),
    ].map(String).filter(Boolean);

    const gaps = this.unit.complement?.open?.() || [];
    const frictionCaps = gaps.map(g => g.capability || g.subject).filter(Boolean);

    const subjects = [...new Set([...missing, ...frictionCaps])];
    if (!subjects.length && !(openNeeds?.length > 0)) return null;

    const goals = [];
    for (const subject of subjects.slice(0, 4)) {
      const goal = this.#makeLearningGoal(subject, {
        development,
        coupled,
        gaps: gaps.filter(g => (g.capability || g.subject) === subject),
      });
      if (goal) goals.push(goal);
    }

    // Also consider high-pressure needs that are not yet capability-named
    for (const need of (openNeeds || []).filter(n => n.pressure >= 0.12).slice(0, 2)) {
      if (need.kind === 'capability-gap' && need.context?.capabilities?.length) continue; // already covered
      const subject = `need:${need.kind}:${need.subject || 'organism'}`;
      if (goals.some(g => g.subject === subject)) continue;
      const goal = this.#makeLearningGoal(subject, { need, development, coupled });
      if (goal) goals.push(goal);
    }

    if (!goals.length) return null;

    for (const g of goals) {
      const existing = this.learningQueue.find(x => x.id === g.id || (x.status === 'open' && x.subject === g.subject));
      if (existing) {
        existing.priority = Math.max(Number(existing.priority || 0), Number(g.priority || 0));
        existing.evidence = [...(existing.evidence || []), ...(g.evidence || [])].slice(-32);
        existing.updatedAt = Date.now();
        this.memory?.upsert?.('meta-learning-goals', existing.id, clone(existing));
      } else {
        this.learningQueue.push(g);
        this.memory?.upsert?.('meta-learning-goals', g.id, clone(g));
      }
    }
    // Keep queue bounded
    if (this.learningQueue.length > 128) this.learningQueue = this.learningQueue.slice(-96);

    return {
      type: 'meta-learning-decision',
      at: Date.now(),
      goals: goals.map(clone),
      skillCount: this.skillLibrary.size,
    };
  }

  #makeLearningGoal(subject, context = {}) {
    const id = `learn:${hash(`${subject}:${Date.now() >> 12}`)}`;
    const evidence = [];
    if (context.development) evidence.push({ type: 'developmental-self', id: context.development.id, distance: context.development.distance });
    if (context.coupled) evidence.push({ type: 'coupled-development', id: context.coupled.id, supportGap: context.coupled.supportGap });
    if (context.gaps?.length) evidence.push({ type: 'human-friction', count: context.gaps.length, ids: context.gaps.map(g => g.id) });
    if (context.need) evidence.push({ type: 'need', id: context.need.id, kind: context.need.kind, pressure: context.need.pressure });

    // Prefer reuse / recombination before new ATO creation
    const alternatives = [
      { kind: 'reuse-existing-process', preference: 1 },
      { kind: 'recombine-organs', preference: 2 },
      { kind: 'learn-from-outcome-evidence', preference: 3 },
      { kind: 'ato-create-only-if-necessary', preference: 4 },
    ];

    const goal = {
      id,
      type: 'learning-goal',
      subject,
      status: 'open',
      createdAt: Date.now(),
      priority: context.need?.pressure ?? (context.coupled?.user?.distance ?? 0.1),
      reason: `missing or pressured capability/process: ${subject}`,
      plan: [
        { step: 'gather-evidence', description: 'Collect current developmental, friction, and outcome evidence' },
        { step: 'generate-hypotheses', description: 'Form competing structural hypotheses for the missing capability' },
        { step: 'prefer-reuse', description: 'Attempt existing processes/organs before new tool synthesis' },
        { step: 'verify', description: 'Test against real or replayable outcome; retain only with lineage' },
      ],
      alternatives,
      evidence,
      provenance: { source: 'EvidenceMetaLearner', replaces: 'MetaLearningController.canned-domains' },
    };
    return goal;
  }

  /**
   * Record that a learning goal produced a verified capability or was rejected.
   * This closes the learning → verification loop.
   */
  recordOutcome(goalId, { ok = false, capability = null, toolId = null, reason = null, evidence = [] } = {}) {
    const goal = this.learningQueue.find(g => g.id === goalId) ||
      (this.memory?.query?.('meta-learning-goals') || []).map(r => r.value || r).find(g => g?.id === goalId);
    if (!goal) return null;

    goal.status = ok ? 'verified' : 'rejected';
    goal.closedAt = Date.now();
    goal.outcome = { ok, capability, toolId, reason, evidence: evidence.map(clone) };
    this.memory?.upsert?.('meta-learning-goals', goal.id, clone(goal));

    if (ok && capability) {
      const key = `skill:${capability}`;
      const skill = {
        key,
        capability,
        toolId,
        learnedAt: Date.now(),
        fromGoal: goal.id,
        evidence: evidence.map(clone),
      };
      this.skillLibrary.set(key, skill);
      this.memory?.upsert?.('meta-skill-library', key, clone(skill));
      this.synthesisLog.push({ at: Date.now(), kind: 'skill-acquired', capability, goalId: goal.id });
    }
    return clone(goal);
  }


  /**
   * Close any open learning goals satisfied by a capability that has actually
   * executed successfully. This prevents "learn" goals from accumulating after
   * the organism has already embodied the missing capability.
   */
  verifyExecutedCapability(capability, { toolId = null, evidence = [] } = {}) {
    const cap = String(capability || '').trim();
    if (!cap) return [];
    const matches = this.learningQueue.filter(g => g.status === 'open' && (
      g.subject === cap || g.subject.endsWith(`:${cap}`) || cap.endsWith(`:${g.subject}`) ||
      g.subject.includes(cap) || cap.includes(g.subject)
    ));
    return matches.map(g => this.recordOutcome(g.id, {
      ok: true, capability: cap, toolId, evidence: [{ type: 'executed-generated-capability', toolId, capability: cap }, ...evidence]
    })).filter(Boolean);
  }

  /**
   * Lightweight synthesis: connect newly verified skills into the skill library.
   * Does not invent bridges from canned domains.
   */
  synthesize() {
    const skills = [...this.skillLibrary.values()];
    if (skills.length < 2) return { bridges: 0 };
    // Simple co-occurrence bridge for skills learned close in time
    let bridges = 0;
    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        const a = skills[i], b = skills[j];
        if (Math.abs((a.learnedAt || 0) - (b.learnedAt || 0)) > 3_600_000) continue;
        const key = `bridge:${a.capability}->${b.capability}`;
        if (this.skillLibrary.has(key)) continue;
        const bridge = { key, from: a.capability, to: b.capability, at: Date.now(), kind: 'temporal-cooccurrence' };
        this.skillLibrary.set(key, bridge);
        this.memory?.upsert?.('meta-skill-library', key, clone(bridge));
        bridges++;
      }
    }
    if (bridges) this.synthesisLog.push({ at: Date.now(), kind: 'bridge-synthesis', bridges });
    return { bridges, skillCount: this.skillLibrary.size };
  }

  snapshot() {
    return {
      queueLength: this.learningQueue.length,
      openGoals: this.learningQueue.filter(g => g.status === 'open').length,
      verified: this.learningQueue.filter(g => g.status === 'verified').length,
      skillCount: this.skillLibrary.size,
      recentGoals: this.learningQueue.slice(-16).map(clone),
      synthesisLog: this.synthesisLog.slice(-16).map(clone),
    };
  }
}

export default EvidenceMetaLearner;
