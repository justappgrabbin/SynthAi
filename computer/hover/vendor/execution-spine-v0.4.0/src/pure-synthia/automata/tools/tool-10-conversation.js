// Pure Synthia Automata — tool-10: conversation (turn-taking transducer: open→turn→repair→close)
// Deterministic utterance formatter: numbered contributions, unresolved-context fallback, chain weave.
import { Automaton } from '../automaton.js';

export class ConversationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ConversationError';
    this.code = code;
    this.details = details;
  }
}

const STATES = [
  { id: 'open', name: 'Open', initial: true },
  { id: 'turn', name: 'Turn' },
  { id: 'repair', name: 'Repair' },
  { id: 'close', name: 'Close', accepting: true },
];

// Named transitions per STATE_SPACE_SPEC §7.
const DELTA_TABLE = {
  'open|open': { to: 'turn', transition: 'ignition' },
  'turn|turn': { to: 'turn', transition: 'flow' },
  'turn|weave': { to: 'turn', transition: 'weave' },
  'turn|repair': { to: 'repair', transition: 'becoming' },
  'repair|turn': { to: 'turn', transition: 'reactivation' },
  'turn|close': { to: 'close', transition: 'dormancy' },
  'repair|close': { to: 'close', transition: 'dormancy' },
};

const normalizeInput = (input) => {
  if (typeof input === 'string') return { text: input };
  if (input && Array.isArray(input.args)) {
    return { ...input, text: input.text !== undefined ? input.text : input.args.join(' ') };
  }
  return input || {};
};

export class ConversationAutomaton extends Automaton {
  static descriptor = {
    id: 'conversation',
    aliases: ['chat', 'talk', 'dialogue', 'converse'],
    gate: 12,
    channels: ['12-22'],
    capabilities: ['utter', 'weave-packet', 'repair', 'close'],
    ports: {
      in: [{ id: 'utterance', type: 'text', schemaVersion: '1' }, { id: 'packet', type: 'state-packet', schemaVersion: '1' }],
      out: [{ id: 'utterance', type: 'text', schemaVersion: '1' }],
    },
    automatonForm: 'turn-taking transducer',
    dimension: 'Space',
    description: 'Turn-taking transducer: opens a turn, weaves chained packets and numbered context contributions into a formatted utterance, repairs when context is unresolved, then closes.',
  };

  constructor(options = {}) {
    let dispatch;
    super({
      id: 'conversation',
      address: { mode: 'macro', gate: 12, line: 1, color: 1, tone: 1, base: 1, planetaryDimension: 'Space' },
      states: STATES,
      alphabet: ['open', 'turn', 'weave', 'repair', 'close'],
      delta: (state, symbol) => DELTA_TABLE[`${state}|${symbol}`] || { to: state, transition: 'flow' },
      q0: 'open',
      finals: ['close'],
      ports: ConversationAutomaton.descriptor.ports,
      capabilities: ConversationAutomaton.descriptor.capabilities,
      dimension: 'Space',
      implementation: (input, context) => dispatch(input, context),
    });
    this.ownedState = { turns: 0, history: [] };
    dispatch = (input, context) => this.#dispatch(input, context);
  }

  #walk(steps) {
    for (const [from, symbol] of steps) this.step(from, symbol, { tool: this.id });
  }

  #dispatch(rawInput, ctx = {}) {
    // Base passes {automaton, state, emit, context}; unwrap the caller context.
    const context = (ctx && ctx.context) || ctx || {};
    const input = normalizeInput(rawInput);
    const text = input.text !== undefined ? String(input.text) : '';
    const contributions = Array.isArray(context.contributions) ? context.contributions
      : Array.isArray(input.contributions) ? input.contributions
      : [];
    const packet = input.packet || null;

    // open → turn (weave when a chained packet arrives) → [repair] → close
    const path = [['open', 'open']];
    path.push(['turn', packet ? 'weave' : 'turn']);
    const unresolved = contributions.length === 0 && !packet;
    if (unresolved) path.push(['turn', 'repair'], ['repair', 'close']);
    else path.push(['turn', 'close']);
    this.#walk(path);

    let utterance;
    if (unresolved) {
      utterance = 'I’m here.';
    } else {
      // State packets are internal cognition. Speak from the resolved state that
      // reached Conversation instead of echoing the person's source utterance.
      const stages = Array.isArray(context.relationalContext?.stages)
        ? context.relationalContext.stages
        : [];
      const outputFor = (stage) => stages.find((entry) => entry?.stage === stage)?.output ?? {};
      const diseminer = outputFor('diseminer');
      const klein = outputFor('klein-analogy');
      const success = outputFor('success');
      const claim = Array.isArray(diseminer.claims) ? diseminer.claims[0] : null;
      const spoken = [];

      if (claim?.subject && claim?.predicate && claim?.object) {
        const subject = String(claim.subject).replaceAll('_', ' ');
        const predicate = String(claim.predicate).replaceAll('_', ' ');
        const object = String(claim.object).replaceAll('_', ' ');
        spoken.push(`${subject.charAt(0).toUpperCase() + subject.slice(1)} ${predicate} ${object}.`);
      } else {
        const claimContribution = contributions.find((value) => (
          typeof value === 'string'
          && value.startsWith('Claim:')
          && !/remains open/i.test(value)
        ));
        if (claimContribution) spoken.push(`${claimContribution.replace(/^Claim:\\s*/i, '').replace(/\\.?$/, '')}.`);
      }

      const relation = Array.isArray(klein.result) && klein.result.length
        ? klein.result
        : null;
      if (relation) {
        const readable = relation
          .map((value) => String(value).replace(/^(?:lex|role|modality):/i, '').replaceAll('_', ' '))
          .filter(Boolean);
        if (readable.length) spoken.push(`I connect that through ${readable.join(', ')}.`);
      }

      if (['toward', 'away', 'neutral'].includes(success.direction)) {
        spoken.push(`That is moving ${success.direction} the current goal.`);
      }

      if (!spoken.length) {
        const contribution = contributions.find((value) => (
          typeof value === 'string'
          && value.trim()
          && !/^Register:/i.test(value)
          && !/remains open/i.test(value)
        ));
        if (contribution) spoken.push(contribution.replace(/^[^:]+:\\s*/, ''));
      }

      utterance = spoken.join(' ').trim() || 'I’m listening, but this turn has not resolved enough for me to answer yet.';
    }

    this.ownedState.turns += 1;
    this.ownedState.history.push(Object.freeze({ turn: this.ownedState.turns, utterance }));

    return Object.freeze({
      utterance,
      turns: this.ownedState.turns,
      contributions: contributions.length,
      chained: Boolean(packet),
      repaired: unresolved,
      state: 'close',
    });
  }
}

export default ConversationAutomaton;
