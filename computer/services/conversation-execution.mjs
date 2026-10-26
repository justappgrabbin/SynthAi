import { SynthiaSystem } from '../engines/unified-execution-spine/src/synthia-system.mjs';
const serializable = (value) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'function' ? undefined : item));

/** Connects the existing Computer state to the two original donor engines. */
export class ConversationExecution {
  constructor(computer) {
    this.computer = computer;
    this.execution = new SynthiaSystem({
      executionPipelineStore: {
        load: async () => computer.state.get('computer.execution.pipeline', null),
        save: async (value) => {
          await computer.state.set('computer.execution.pipeline', value, { source: 'unified-execution-spine' });
          return true;
        },
      },
    });
  }

  async talk(input) {
    const text = String(input ?? '').trim();
    if (!text) throw new TypeError('A message is required.');
    if (text.length > 12000) throw new RangeError('Message exceeds 12,000 characters.');

    // Synthia's two graphs read the same situated message before any reply.
    // The semantic side stores speaker reports as reports, not verified facts.
    const residentReading = await this.computer.synthia.observe(text);

    // The original Morph Chat invokes AutoLing + DISEMINER through its tool
    // bridge, resolves the semantic mesh, then realizes readable language.
    const donor = await this.computer.automataGateway.talk(text);
    if (!donor.conversation?.semantic?.linguisticGrounded) {
      throw new Error('AutoLing did not ground this turn; the chat path is incomplete.');
    }
    // The execution-spine donor owns a separate address-first learning/contact
    // loop. Its result is consumed as evidence, not substituted for the answer.
    const learned = await this.execution.chat(text);
    // A measured Computer capability or attributed source wins over an authored
    // Morph Chat realization. The fallback remains accessible, but is explicitly
    // labeled as pattern-based: linguistic processing is NOT an LLM.
    const grounded = this.computer.groundedDialogue.respond(text, {
      currentReadingId: residentReading.id,
    });
    const responseText = grounded?.text ?? donor.text;
    const answerKind = grounded?.kind ?? 'legacy-pattern-realization';
    const replyProvider = grounded?.provider ?? 'donor:legacy-morph-patterns';
    const evidence = grounded?.evidence ?? [];
    const item = {
      id: crypto.randomUUID(), at: new Date().toISOString(), input: text,
      text: responseText, address: donor.runtime?.address ?? null,
      focus: donor.conversation.semantic.focus,
      intent: donor.conversation.semantic.intent,
      dimension: donor.conversation.semantic.dimension,
      // A successful parser is not proof of grounded factual claims.
      linguisticGrounded: Boolean(donor.conversation.semantic.linguisticGrounded),
      answerKind, evidence, evidenceVerified: false, llm: false,
      provider: replyProvider,
      learningRecord: learned.recordId,
    };
    const history = this.computer.state.get('computer.chat.history', []);
    await this.computer.state.set('computer.chat.history', [...history, item].slice(-120), { source: 'conversation' });
    const residentReceipt = await this.computer.synthia.recordReply(residentReading, {
      text: responseText, provider: replyProvider,
    });
    const event = await this.computer.emitEvent({
      actor_id: 'user:local', actor_type: 'user', target_id: 'synthia', event_type: 'message',
      input: text, event_address: item.address, provider: replyProvider,
      result: { text: item.text, focus: item.focus, intent: item.intent, learningRecord: item.learningRecord },
      result_status: 'success', observable_effect: 'readable reply and persistent conversation record',
    });
    return { ...item, eventId: event.event_id,
      resident: { id: residentReceipt.id, readingId: residentReading.id,
        learnedInference: residentReading.intent.chosen,
        provisionalClaims: residentReading.candidateClaims.length,
        toolEvidence: residentReading.toolEvidence } };
  }

  history() { return this.computer.state.get('computer.chat.history', []); }

  async executeArtifact({ name, type, content }) {
    if (!name || typeof content !== 'string') throw new TypeError('Artifact name and text content are required.');
    if (content.length > 500000) throw new RangeError('Artifact exceeds 500,000 characters.');
    const result = await this.execution.executeArtifact({ name, type, content });
    const receipt = {
      id: crypto.randomUUID(), at: new Date().toISOString(), name, type,
      ok: Boolean(result.ok), path: result.result?.path ?? result.path ?? null,
      address: result.canonicalAddress ?? null,
      stages: serializable(result.pipeline?.stages ?? result.stages ?? null),
      result: serializable(result),
    };
    const prior = this.computer.state.get('computer.execution.receipts', []);
    await this.computer.state.set('computer.execution.receipts', [...prior, receipt].slice(-40), { source: 'execution-spine' });
    await this.computer.emitEvent({
      actor_id: 'user:local', actor_type: 'user', event_type: 'tool_execution',
      input: { name, type }, event_address: receipt.address,
      provider: 'unified-execution-spine-v0.5.1',
      result: { ok: receipt.ok, path: receipt.path, receiptId: receipt.id },
      result_status: receipt.ok ? 'success' : 'failure',
      observable_effect: receipt.ok ? 'execution receipt stored' : 'execution failure stored',
    });
    return receipt;
  }
}
