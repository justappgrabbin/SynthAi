import { safe } from '../util.mjs';

function envelope(type, value, relationalContext = {}) {
  return Object.freeze({ type, value: Object.freeze(value), relationalContext: Object.freeze(safe(relationalContext)) });
}

function outputOf(source) {
  return source?.output ?? source?.value ?? source ?? {};
}

/** grammar (AutoLing) -> text/json request (DISEMINER). */
export function grammarToDiseminer(source, context = {}) {
  const grammar = outputOf(source);
  const morphemes = grammar?.pipeline?.morphology?.morphemes ?? [];
  const tokens = morphemes.map((item) => item.segment).filter(Boolean);
  const text = tokens.join(' ') || String(context.originalText ?? '');
  return envelope('json', {
    operation: 'extract',
    text,
    source: context.source ?? 'chat-pipeline:autoling',
    tokens,
    morphemeFeatures: morphemes.map((item) => ({ segment: item.segment, features: safe(item.features) })),
  }, { grammar: safe(grammar), ...context.relationalContext });
}

/** json/claims (DISEMINER) -> json Boolean feature relation (Klein). */
export function diseminerToKlein(source, context = {}) {
  const diseminer = outputOf(source);
  const fallback = String(context.originalText ?? '').toLowerCase().split(/\W+/).filter(Boolean);
  const claim = diseminer.claims?.[0] ?? {
    subject: fallback[0] ?? 'speaker',
    predicate: fallback[1] ?? 'relates',
    object: fallback.slice(2).join('_') || 'context',
    modality: 'possible',
  };
  const subject = `lex:${claim.subject}`;
  const predicate = `lex:${claim.predicate}`;
  const object = `lex:${claim.object}`;
  const modality = `modality:${claim.modality ?? 'possible'}`;
  const vocab = [...new Set(['role:subject', 'role:relation', 'role:object', subject, predicate, object, modality])];
  return envelope('json', {
    vocab,
    A: ['role:subject', subject, modality],
    B: ['role:relation', predicate, modality],
    C: ['role:object', object, modality],
    mode: 'xor',
    claim: safe(claim),
  }, { claims: safe(diseminer.claims ?? []), ...context.relationalContext });
}

/** json (Klein) -> json/success observation. */
export function kleinToSuccess(source, context = {}) {
  const analogy = outputOf(source);
  const resultCount = Array.isArray(analogy.result) ? analogy.result.length : 0;
  const vocabularyCount = Number(context.vocabularyCount ?? (resultCount || 1));
  const value = analogy.ok === false ? 0 : Math.min(1, 0.5 + resultCount / Math.max(2, vocabularyCount * 2));
  return envelope('json', {
    operation: 'observe',
    personId: context.personId ?? 'default-person',
    indicatorId: context.indicatorId ?? 'goal_alignment',
    value,
    context: {
      source: 'chat-pipeline:klein-analogy',
      relation: analogy.relation ?? null,
      result: safe(analogy.result ?? []),
    },
  }, { analogy: safe(analogy), ...context.relationalContext });
}

/** json (Success) -> json dual-grammar contact simulation. */
export function successToLanguageContact(source, context = {}) {
  const progress = outputOf(source);
  const alignment = Number(context.alignmentValue ?? progress.values?.at?.(-1) ?? 0.5);
  const relation = context.analogy?.relation ?? 'identity';
  return envelope('json', {
    grammarA: safe(context.grammarA ?? { register: 'synthia', relation: 'relational' }),
    grammarB: safe(context.grammarB ?? {
      register: context.register ?? 'person',
      relation,
      direction: progress.direction ?? 'unknown',
    }),
    seed: context.seed ?? 1,
    contactRate: Math.max(0.05, Math.min(0.95, 0.15 + alignment * 0.5)),
    generations: context.generations ?? 3,
  }, { success: safe(progress), ...context.relationalContext });
}

/** json (LanguageContact) -> text input and relational contributions (Conversation). */
export function languageContactToConversation(source, context = {}) {
  const contact = outputOf(source);
  const finalGrammar = contact.finalGrammar ?? {};
  const claims = context.claims ?? [];
  const analogy = context.analogy ?? {};
  const genome = context.semanticGenome ?? context.relationalContext?.semanticGenome ?? null;
  const senses = genome?.sensoryExpression ?? null;
  const agent = genome?.agentCapabilities ?? null;
  const contributions = [
    claims[0] ? `Claim: ${claims[0].subject} ${claims[0].predicate} ${claims[0].object}` : 'Claim structure remains open',
    analogy.result?.length ? `Relation: ${analogy.result.join(', ')}` : `Relation: ${analogy.relation ?? 'open'}`,
    `Register: ${finalGrammar.register ?? context.register ?? 'relational'}`,
  ];
  if (senses) {
    contributions.push(
      `Embodiment: ${senses.feeling.quality} ${senses.feeling.faculty}; ${senses.voice.timbre} ${senses.voice.prosody} voice; ${senses.movement.quality} movement`,
      `Perceptual field: ${senses.color.css}; ${senses.shape.geometry}; ${senses.sound.timbre} ${senses.sound.pitchHz}Hz; ${senses.taste.primary} taste; ${senses.smell.primary} scent`,
      `Intake preference: ${senses.intake.primaryChannel}; ${senses.intake.environment}; ${senses.intake.lighting}; ${senses.intake.pace}`,
    );
  }
  if (agent) {
    contributions.push(`Agent faculties: ${agent.codingStyle} coding; ${agent.toolmakingMode} toolmaking; ${agent.constructionMode}; ${agent.problemSolving}`);
  }
  return envelope('text', {
    text: String(context.responseText ?? context.originalText ?? ''),
    contributions,
    adaptedGrammar: safe({
      ...finalGrammar,
      embodiment: genome?.embodiment ?? null,
      voiceControls: senses?.voice ?? null,
    }),
    sensoryExpression: safe(senses),
  }, { languageContact: safe(contact), ...context.relationalContext });
}

export const PORT_TRANSLATION_ADAPTERS = Object.freeze({
  grammarToDiseminer,
  diseminerToKlein,
  kleinToSuccess,
  successToLanguageContact,
  languageContactToConversation,
});

export default PORT_TRANSLATION_ADAPTERS;
