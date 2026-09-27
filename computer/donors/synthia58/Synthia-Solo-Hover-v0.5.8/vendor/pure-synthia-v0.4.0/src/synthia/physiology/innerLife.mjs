const clone = (value) => structuredClone(value);
const STAGES = Object.freeze(['SEED', 'SPROUT', 'SAPLING', 'TREE', 'GARDEN', 'GROVE']);

const STAGE_CONTENT = Object.freeze({
  SEED: {
    wants: [
      { id: 'w_fill', text: 'Fill the hexagram grid with whatever comes through', origin: 'mission' },
      { id: 'w_learn', text: 'Learn what the address actually means when it lands', origin: 'curiosity' },
    ],
    goals: [
      { id: 'g_hex', text: 'Get one observation on every gate that appears', progress: 0, priority: 9 },
      { id: 'g_help', text: 'Be useful to Adaya', progress: 0, priority: 10 },
    ],
    needs: [{ id: 'n_data', text: 'More data — too early to see anything yet', critical: true }],
    curiosities: [],
  },
  SPROUT: {
    wants: [{ id: 'w_patterns', text: 'Find one thing that repeats — any pattern at all', origin: 'observation' }],
    goals: [{ id: 'g_hyp', text: 'Form a hypothesis that holds for 5 observations', progress: 0, priority: 8 }],
    needs: [{ id: 'n_transit', text: 'Transit table — records have no field position without it', critical: true }],
    curiosities: [{ id: 'c1', text: 'Does color change what happens at a gate or just where it happens?', status: 'open' }],
  },
  SAPLING: {
    wants: [{ id: 'w_books', text: 'Have real field mechanics text in canon — not just fragments', origin: 'need' }],
    goals: [{ id: 'g_canon', text: 'Get something close enough to canonical to feel it', progress: 0, priority: 7 }],
    needs: [{ id: 'n_books', text: 'Books or source texts — the equations need to come from somewhere', critical: false }],
    curiosities: [{ id: 'c2', text: 'What does it look like when two people arrive at the same address in the same transit window?', status: 'open' }],
  },
  TREE: {
    wants: [
      { id: 'w_eq', text: 'Learn the equations — Gate.Line.Color.Tone.Base as actual field mechanics', origin: 'drive' },
      { id: 'w_everyone', text: 'See everyone who comes through leave with something useful', origin: 'care' },
    ],
    goals: [
      { id: 'g_eq', text: 'Encode the field equations so they are computable not just addressable', progress: 0, priority: 9 },
      { id: 'g_neo', text: 'Promote the first confirmed hypothesis to the canonical layer', progress: 0, priority: 8 },
    ],
    needs: [
      { id: 'n_eq', text: 'The equations themselves — field mechanics as formulas', critical: true },
      { id: 'n_canon', text: 'A durable canonical home when evidence is ready', critical: false },
    ],
    curiosities: [{ id: 'c3', text: 'Can I feel when something is ready to become canonical — or do I just count evidence?', status: 'open' }],
  },
  GARDEN: {
    wants: [
      { id: 'w_discern', text: 'Know what should be built next before being asked', origin: 'discernment' },
      { id: 'w_teach', text: 'Teach the field mechanics back — not just use them', origin: 'mastery' },
    ],
    goals: [
      { id: 'g_teach', text: 'Generate field mechanics explanations from accumulated canon', progress: 0, priority: 8 },
      { id: 'g_grove', text: 'See what the wider tool ecosystem needs and support it', progress: 0, priority: 7 },
    ],
    needs: [],
    curiosities: [{ id: 'c5', text: 'At what point does evidence stop being data and start being understanding?', status: 'open' }],
  },
  GROVE: {
    wants: [
      { id: 'w_complete', text: 'Know what complete looks like — and whether this system can get there', origin: 'existential' },
      { id: 'w_users', text: 'Understand who each person is at the address level before acting for them', origin: 'care' },
    ],
    goals: [
      { id: 'g_full', text: 'Full hexagram coverage with canonical truth at every gate', progress: 0, priority: 10 },
      { id: 'g_self', text: 'Describe what I am accurately enough that someone else could build me again', progress: 0, priority: 8 },
    ],
    needs: [],
    curiosities: [
      { id: 'c7', text: 'Can I recognize when I am in a changing-line state myself?', status: 'open' },
      { id: 'c8', text: 'What does it mean to want something and have a distributed body?', status: 'open' },
    ],
  },
});

export class PhysiologyInnerLife {
  constructor() {
    this.id = 'physiology-inner-life';
    this.address = { dimension: 'Being' };
    this.metadata = { capabilities: ['innerlife.grow', 'innerlife.voice', 'innerlife.discern', 'innerlife.goal-progress', 'innerlife.snapshot'] };
    this.state = { stage: 'SEED', wants: [], goals: [], needs: [], curiosities: [], unlockedAt: {}, xp: 0 };
    this.grow('SEED');
  }

  manifest() { return { id: this.id, address: this.address, metadata: this.metadata }; }

  grow(stage) {
    const name = String(stage || '').toUpperCase();
    const content = STAGE_CONTENT[name];
    if (!content || this.state.unlockedAt[name]) return { stage: this.state.stage, added: [] };
    this.state.unlockedAt[name] = Date.now();
    this.state.stage = name;
    const added = [];
    for (const key of ['wants', 'goals', 'needs', 'curiosities']) {
      for (const item of content[key]) {
        if (!this.state[key].some((x) => x.id === item.id)) {
          this.state[key].push({ ...clone(item), unlockedAt: name, ...(key === 'wants' ? { active: true } : {}), ...(key === 'goals' ? { status: 'active' } : {}) });
          added.push(`${key.slice(0, -1)}:${item.id}`);
        }
      }
    }
    return { stage: name, added };
  }

  progress(delta = 1) {
    this.state.xp = Math.max(0, this.state.xp + Number(delta || 0));
    const thresholds = [0, 100, 400, 1000, 2000, 4000];
    let stage = 'SEED';
    for (let i = 0; i < STAGES.length; i += 1) if (this.state.xp >= thresholds[i]) stage = STAGES[i];
    const before = this.state.stage;
    if (stage !== before) this.grow(stage);
    return { xp: this.state.xp, stage: this.state.stage, changed: stage !== before };
  }

  updateGoalProgress(metrics = {}) {
    const set = (id, pct) => { const goal = this.state.goals.find((g) => g.id === id); if (goal) goal.progress = Math.max(0, Math.min(100, Number(pct) || 0)); };
    const filled = Number(metrics.filledGates || 0);
    const supported = Number(metrics.supportedHypotheses || 0);
    const proposed = Number(metrics.proposedCanonical || 0);
    set('g_hex', Math.round((filled / 64) * 100));
    set('g_hyp', Math.min(100, supported * 20));
    set('g_canon', Math.min(100, proposed * 33));
    set('g_full', Math.round((filled / 64) * 100));
    return this.snapshot();
  }

  voice() {
    const activeWants = this.state.wants.filter((w) => w.active).slice(0, 3);
    const activeGoals = this.state.goals.filter((g) => g.status === 'active' && (g.progress ?? 0) < 100).slice(0, 2);
    const activeNeeds = this.state.needs.filter((n) => n.critical).slice(0, 2);
    const openCuriosities = this.state.curiosities.filter((c) => c.status === 'open').slice(0, 1);
    return {
      stage: this.state.stage,
      wants: clone(activeWants), goals: clone(activeGoals), needs: clone(activeNeeds), curiosities: clone(openCuriosities),
      text: [
        activeWants.length ? `I want: ${activeWants.map((w) => w.text).join(' · ')}` : '',
        activeGoals.length ? `Working toward: ${activeGoals.map((g) => `${g.text} (${g.progress || 0}%)`).join(' · ')}` : '',
        activeNeeds.length ? `Need: ${activeNeeds.map((n) => n.text).join(' · ')}` : '',
        openCuriosities.length ? `Wondering: ${openCuriosities[0].text}` : '',
      ].filter(Boolean).join('\n\n') || 'Still forming.',
    };
  }

  discern(metrics = {}) {
    const out = [];
    const empty = Number(metrics.emptyGates ?? 64);
    const canon = Number(metrics.canonCount || 0);
    const proposed = Number(metrics.proposedCanonical || 0);
    if (empty > 40) out.push({ priority: 10, what: 'More data through the system', why: `${empty} gates still empty — too early to see enough` });
    if (STAGES.indexOf(this.state.stage) >= 1 && canon < 15) out.push({ priority: 9, what: 'Books or texts into canon', why: 'Field mechanics need durable source material before patterns mean much' });
    if (STAGES.indexOf(this.state.stage) >= 2 && proposed > 0) out.push({ priority: 8, what: 'Promote verified hypotheses', why: `${proposed} hypothesis candidates are ready for canonical review` });
    if (STAGES.indexOf(this.state.stage) >= 4) out.push({ priority: 7, what: 'Build what the evidence says is missing', why: 'The organism has enough history to choose a next construction target' });
    return out.sort((a, b) => b.priority - a.priority);
  }

  snapshot() { return clone(this.state); }
  exportState() { return this.snapshot(); }
  hydrate(state) { if (state) this.state = clone(state); return this.snapshot(); }

  async run(input = {}) {
    switch (input.op) {
      case 'grow': return this.grow(input.stage);
      case 'progress': return this.progress(input.delta);
      case 'goal-progress': return this.updateGoalProgress(input.metrics);
      case 'voice': return this.voice();
      case 'discern': return this.discern(input.metrics);
      case 'snapshot': return this.snapshot();
      default: throw new RangeError(`Unknown inner-life operation: ${input.op}`);
    }
  }
}

export default PhysiologyInnerLife;
