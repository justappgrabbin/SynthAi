import { StatePacket } from '../../vendor/execution-spine-v0.4.0/src/pure-synthia/mesh/packet.js';
import {
  grammarToDiseminer,
  diseminerToKlein,
  kleinToSuccess,
  successToLanguageContact,
  languageContactToConversation,
} from './adapters.mjs';
import { safe } from '../util.mjs';

const TOOL_SEQUENCE = Object.freeze([
  'autoling',
  'diseminer',
  'klein-analogy',
  'success',
  'language-contact',
  'conversation',
]);

/** Sequential, typed, context-consuming cognition pipeline over the shared mesh. */
export class ChatPipeline {
  constructor({ engine, scientist, federation = null } = {}) {
    if (!engine?.mesh) throw new TypeError('ChatPipeline requires the live Synthia engine');
    if (!scientist?.experiment) throw new TypeError('ChatPipeline requires ScientistLoop');
    this.engine = engine;
    this.scientist = scientist;
    this.federation = federation;
    this.sequence = 0;
    this.history = [];
  }

  #tool(id) {
    const tool = this.engine.mesh.get(id);
    if (!tool) throw new Error(`chat pipeline instrument is not mounted: ${id}`);
    return tool;
  }

  #ensurePurpose(personId, context) {
    const success = this.#tool('success');
    const existing = success.ownedState?.people?.get(personId);
    const required = ['goal_alignment', 'engagement', 'task_completion'];
    if (existing && required.every((id) => existing.purpose.indicators.some((indicator) => indicator.id === id))) return null;
    return success.run({
      operation: 'define',
      personId,
      purpose: {
        statement: context.purpose ?? 'Move this conversation toward the person’s stated goal.',
        indicators: [
          { id: 'goal_alignment', name: 'Goal alignment', direction: 'increase', weight: 1 },
          { id: 'engagement', name: 'Continued useful engagement', direction: 'increase', weight: 1 },
          { id: 'task_completion', name: 'Task completion', direction: 'increase', weight: 1 },
        ],
      },
    }, context);
  }

  #runStage({ from, to, typed, trace, relationalContext, context }) {
    const target = this.#tool(to);
    const packet = new StatePacket({
      id: `chat-packet-${++this.sequence}`,
      from,
      to,
      kind: `typed:${typed.type}`,
      payload: safe(typed.value),
      address: target.address,
      derivationId: context.derivationId ?? null,
    });
    const delivery = this.engine.mesh.route(packet);
    if (!delivery.delivered) throw new Error(`chat packet was not delivered to ${to}`);
    const input = { ...safe(typed.value), packet };
    const run = target.run(input, {
      ...context,
      relationalContext: safe(relationalContext),
      contributions: typed.value.contributions,
    });
    if (!run.accepted) throw new Error(`${to} did not accept translated ${typed.type} input`);
    target.absorbExperience({
      derivationId: context.derivationId ?? null,
      intakeId: null,
      outputHash: `pipeline:${this.sequence}`,
      seq: this.sequence,
      consumedPacketId: packet.id,
      relationalContextFrom: from,
    });
    this.engine.mesh.addEdge('knowledge', from, to, 'translated-context', { packetId: packet.id, type: typed.type });
    this.engine.mesh.addEdge('causal', from, to, 'continues-task', { packetId: packet.id });
    this.engine.mesh.addEdge('dependency', to, from, 'consumed-output-of', { packetId: packet.id });
    this.engine.mesh.addEdge('temporal', `chat:${this.sequence - 1}`, `chat:${this.sequence}`, 'next-stage', { from, to });
    trace.push(Object.freeze({
      stage: to,
      inputType: typed.type,
      packetId: packet.id,
      delivered: true,
      consumed: true,
      accepted: run.accepted,
      output: safe(run.output),
      trace: safe(run.trace),
    }));
    return run;
  }

  async run(message, context = {}) {
    const text = String(message ?? '');
    const personId = context.personId ?? 'default-person';
    this.#ensurePurpose(personId, context);
    const trace = [];
    const relationalContext = {
      task: text,
      personId,
      source: context.source ?? 'chat',
      receivedContext: safe(context.relationalContext ?? null),
      anticipatoryPrecedents: safe(context.anticipatoryPrecedents ?? []),
      semanticGenome: safe(context.semanticGenome ?? context.relationalContext?.semanticGenome ?? null),
      genomeMirror: safe(context.genomeMirror ?? context.relationalContext?.genomeMirror ?? null),
      stages: [],
    };

    const autoling = this.#tool('autoling').run({ operation: 'pipeline', text }, { ...context, relationalContext });
    if (!autoling.accepted) throw new Error('autoling rejected chat input');
    trace.push(Object.freeze({ stage: 'autoling', inputType: 'text', accepted: true, consumed: true, output: safe(autoling.output), trace: safe(autoling.trace) }));
    relationalContext.stages.push({ stage: 'autoling', output: safe(autoling.output) });

    const diseminerInput = grammarToDiseminer(autoling, { originalText: text, relationalContext });
    const diseminer = this.#runStage({ from: 'autoling', to: 'diseminer', typed: diseminerInput, trace, relationalContext, context });
    relationalContext.stages.push({ stage: 'diseminer', output: safe(diseminer.output) });

    const kleinInput = diseminerToKlein(diseminer, { originalText: text, relationalContext });
    const klein = this.#runStage({ from: 'diseminer', to: 'klein-analogy', typed: kleinInput, trace, relationalContext, context });
    relationalContext.stages.push({ stage: 'klein-analogy', output: safe(klein.output) });

    const successInput = kleinToSuccess(klein, {
      personId,
      vocabularyCount: kleinInput.value.vocab.length,
      relationalContext,
    });
    const success = this.#runStage({ from: 'klein-analogy', to: 'success', typed: successInput, trace, relationalContext, context });
    relationalContext.stages.push({ stage: 'success', output: safe(success.output) });

    const contactInput = successToLanguageContact(success, {
      grammarA: context.grammarA,
      grammarB: context.grammarB ?? context.peerGrammar,
      register: context.register,
      analogy: klein.output,
      seed: context.seed,
      relationalContext,
    });
    const contact = this.#runStage({ from: 'success', to: 'language-contact', typed: contactInput, trace, relationalContext, context });
    relationalContext.stages.push({ stage: 'language-contact', output: safe(contact.output) });

    const conversationInput = languageContactToConversation(contact, {
      originalText: text,
      responseText: context.responseText,
      claims: diseminer.output.claims,
      analogy: klein.output,
      register: context.register,
      semanticGenome: context.semanticGenome ?? context.relationalContext?.semanticGenome ?? null,
      relationalContext,
    });
    const conversation = this.#runStage({ from: 'language-contact', to: 'conversation', typed: conversationInput, trace, relationalContext, context });
    relationalContext.stages.push({ stage: 'conversation', output: safe(conversation.output) });

    const question = this.scientist.question(`Will the selected chat pipeline produce a useful utterance for ${personId}?`, {
      hypothesis: 'Sequential relational composition will retain and transform context through every stage.',
      method: TOOL_SEQUENCE.join(' -> '),
      source: ['chat-pipeline'],
    });
    const utterance = conversation.output.utterance;
    const experiment = this.scientist.experiment(question.id, {
      action: 'chat-pipeline',
      predicted: context.predictedUtterance ?? text,
      actual: utterance,
      toolPath: [...TOOL_SEQUENCE],
    });
    trace.push(Object.freeze({ stage: 'scientist-loop', inputType: 'experiment', accepted: true, consumed: true, output: safe(experiment) }));

    const emergence = this.engine.detector.testEmergence({
      id: `chat-emergence-${this.history.length + 1}`,
      primitives: trace.map((entry) => entry.stage),
      operators: ['o_sequence', 'o_discourse'],
      output: { utterance, traceLength: trace.length },
    }, { completePipeline: (result) => result.traceLength === 7 });

    const record = Object.freeze({
      id: `chat-pipeline-${this.history.length + 1}`,
      personId,
      utterance,
      trace: Object.freeze(trace),
      relationalContext: safe(relationalContext),
      experiment: safe(experiment),
      emergence: safe(emergence),
    });
    this.history.push(record);
    return record;
  }
}

export default ChatPipeline;
