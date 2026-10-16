// Pure-JS Klein contact wiring for Synthia.
// Two roles are deliberately kept separate:
//   1) PublicLanguageContactModel: contact between people/agents at the public address boundary (through Base only).
//   2) DeepLanguageContactModel: internal mesh loop that lets existing Klein tools exchange meaning, variation and learned grammar.

import { formatContactAddress } from './canonical-address-code.js';
import { mulberry32 } from '../state-space/constants.js';

const asGrammar = (value) => {
  if (!value) return {};
  if (!Array.isArray(value)) return { ...value };
  const out = {};
  value.forEach((rule, i) => {
    const key = rule?.lhs || rule?.id || `R${i + 1}`;
    out[key] = rule?.rhs ?? rule?.template ?? rule?.targetPattern ?? rule;
  });
  return out;
};

const valueText = (v) => typeof v === 'string' ? v : JSON.stringify(v);

export class PublicLanguageContactModel {
  run({ partyA = {}, partyB = {}, grammarA = {}, grammarB = {}, contactRate = 0.15, generations = 10, seed = 1 } = {}) {
    // Only the public/contact address is allowed into the contact record.
    const addressA = formatContactAddress(partyA.canonicalAddress || partyA.address || partyA);
    const addressB = formatContactAddress(partyB.canonicalAddress || partyB.address || partyB);
    const rng = mulberry32(seed);
    let current = asGrammar(grammarA);
    const donor = asGrammar(grammarB);
    const trajectory = [{ generation: 0, grammar: { ...current } }];

    for (let generation = 1; generation <= generations; generation++) {
      const next = { ...current };
      for (const rule of Object.keys(donor).sort()) {
        if (rng() < contactRate) next[rule] = donor[rule];
      }
      current = next;
      trajectory.push({ generation, grammar: { ...current } });
    }

    const borrowed = Object.keys(donor).filter((rule) => current[rule] === donor[rule] && asGrammar(grammarA)[rule] !== donor[rule]);
    return Object.freeze({
      ok: true,
      mode: 'public-contact-through-base',
      parties: Object.freeze([addressA, addressB]),
      finalGrammar: current,
      borrowedRules: borrowed,
      borrowedCount: borrowed.length,
      trajectory,
      privacyBoundary: 'Base',
    });
  }
}

export class DeepLanguageContactModel {
  constructor({ engine }) {
    if (!engine) throw new Error('DeepLanguageContactModel requires the Synthia engine');
    this.engine = engine;
  }

  #tool(id) {
    const tool = this.engine.toolsById.get(id);
    if (!tool) throw new Error(`Klein contact loop missing registered tool: ${id}`);
    return tool;
  }

  run(input = {}, context = {}) {
    const text = String(input.text ?? input.message ?? '').trim();
    if (!text) throw new Error('Klein contact loop requires input.text');

    const diseminer = this.#tool('diseminer');
    const contact = this.#tool('language-contact');
    const monte = this.#tool('historical-monte-carlo');
    const autoling = this.#tool('autoling');
    const coder = this.#tool('computational-grammar-coder');
    const conversation = this.#tool('conversation');

    // CHAT reaches into DISEMINER for meaning/evidence rather than inventing the meaning itself.
    const observed = diseminer.run({ operation: 'observe', text }, context).output;
    const extracted = diseminer.run({ operation: 'extract', text, source: input.source || 'chat' }, context).output;

    // AUTOLING's persistent grammar is the host language. A peer grammar may come from another mesh participant.
    const autolingBefore = autoling.run({ operation: 'stats' }, context).output;
    const grammarA = asGrammar(input.grammarA || autolingBefore.rules || {});
    const grammarB = asGrammar(input.grammarB || input.peerGrammar || {});

    // Language Contact performs actual rule-system contact. No names or private sub-Base person data are required here.
    const contactResult = contact.run({
      grammarA,
      grammarB,
      contactRate: input.contactRate ?? 0.15,
      generations: input.contactGenerations ?? 10,
      seed: input.seed ?? 1,
    }, context).output;

    // Historical Monte Carlo explores the contacted grammar as a variant field.
    const contactedGrammar = asGrammar(contactResult.finalGrammar || grammarA);
    const variants = Object.fromEntries(Object.keys(contactedGrammar).map((key) => [key, 1]));
    const monteResult = monte.run({
      variants: Object.keys(variants).length ? variants : { unchanged: 1 },
      seed: (input.seed ?? 1) + 1,
      mutationScale: input.mutationScale ?? 0.1,
      generations: input.monteCarloGenerations ?? 20,
    }, context).output;

    // AUTOLING learns from the observed language and, when contact produced rules, induces a reusable contact rule.
    const learned = autoling.run({ operation: 'pipeline', text }, context).output;
    let induced = null;
    const contactExamples = Object.entries(contactedGrammar).map(([rule, value]) => ({
      input: { relations: ['language-contact'], constraints: [rule, 'contact'] },
      output: valueText(value),
    }));
    if (contactExamples.length) {
      induced = autoling.run({ operation: 'induce', examples: contactExamples }, context).output;
    }

    // Grammar coder realizes a computational/syntactic coding of the same meaning-bearing signal.
    const coded = coder.run({ text }, context).output;

    // CHAT is the surface again: it receives contributions from the internal contact loop.
    const contactSummary = `contact:${contactResult.borrowedCount ?? 0} borrowed; monte:${monteResult.dominantVariant ?? 'none'}; autoling:${induced?.rule?.status ?? 'observed'}`;
    const chat = conversation.run({
      text,
      contributions: [contactSummary],
    }, context).output;

    return Object.freeze({
      ok: true,
      mode: 'deep-klein-contact-loop',
      stages: Object.freeze({
        diseminer: Object.freeze({ observed, extracted }),
        languageContact: contactResult,
        historicalMonteCarlo: monteResult,
        autoling: Object.freeze({ learned, induced }),
        grammarCoder: coded,
        chat,
      }),
      learnedCapabilityCandidate: induced?.rule || null,
    });
  }
}

export class KleinContactLoop {
  constructor({ engine }) {
    this.public = new PublicLanguageContactModel();
    this.deep = new DeepLanguageContactModel({ engine });
  }

  run(input = {}, context = {}) {
    if (input.mode === 'public' || input.publicContact === true) return this.public.run(input);
    return this.deep.run(input, context);
  }
}
