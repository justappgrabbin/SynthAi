/**
 * Klein language-to-model bridge. Reuses the EXISTING resident's AutoLing,
 * DISEMINER and AutoNovel donor instances. It does not replace donor code,
 * train new weights or give a language model tool-execution permission.
 *
 * observe() has already run AutoLing + DISEMINER and persisted the resident's
 * semantic evidence. This bridge transfers BOUNDED, epistemically labeled
 * observations to the optional language model, not executable instructions.
 */
const TOOLS = Object.freeze(['autoling', 'diseminer', 'autonovel']);
const take = (value, n) => String(value ?? '').slice(0, n);

export class KleinToolBridge {
  constructor({ resident, bus = null } = {}) {
    if (!resident || typeof resident.runTool !== 'function' || typeof resident.observe !== 'function')
      throw new TypeError('The existing booted Synthia resident is required.');
    this.resident = resident;
    this.bus = bus;
  }

  status() {
    return { provider: 'synthia:klein-donor-tools', connected: true,
      tools: [...TOOLS], modelContext: 'bounded-observations',
      toolExecution: 'explicit-owner-only', trainedLanguageModel: false };
  }

  /**
   * Reuse the results of resident.observe(). In particular, neither a
   * speaker's claim nor a heuristic guess is an independently verified fact.
   * Avoid feeding raw graph state, personal chat history or executable schemas
   * into a model. No second observation is performed.
   */
  ground({ reading, donorText = '' } = {}) {
    if (!reading?.id || reading.toolEvidence?.autoling !== 'executed' ||
        reading.toolEvidence?.diseminer !== 'executed')
      throw new TypeError('A real Synthia observation with executed Klein language tools is required.');
    const sense = reading.distribution ?? {};
    const chosen = reading.intent?.chosen;
    const context = {
      source: 'synthia:klein-donor-tools',
      evidenceType: 'heuristic-language-analysis-not-verified-world-facts',
      tools: { autoling: 'executed', diseminer: 'executed',
        autonovel: 'mounted-requires-explicit-invocation' },
      autoling: {
        grammarConfidence: Number.isFinite(reading.grammarConfidence)
          ? Math.max(0, Math.min(1, reading.grammarConfidence)) : null,
        frame: take(typeof reading.grammarFrame === 'string'
          ? reading.grammarFrame : JSON.stringify(reading.grammarFrame ?? null), 180),
      },
      diseminer: {
        wordCount: Number.isFinite(sense.wordCount) ? sense.wordCount : null,
        familiar: Number.isFinite(sense.familiar) ? sense.familiar : null,
        alert: sense.alert === true,
      },
      learnedIntent: {
        trained: reading.intent?.trained === true,
        label: chosen ? take(chosen.label, 48) : null,
        score: chosen && Number.isFinite(chosen.score) ? chosen.score : null,
      },
      candidateClaims: (reading.candidateClaims ?? []).slice(0, 2).map(item => ({
        text: take(item.text, 110),
        modality: take(item.modality, 24),
        status: 'unverified-speaker-report',
      })),
      donorDraft: take(donorText, 320),
    };
    // The existing SynthiaLanguageModel contract caps model context at 1500.
    const serialized = JSON.stringify(context);
    if (serialized.length > 1500) throw new RangeError('Klein context exceeded the model safety budget');
    this.bus?.emit('klein:model-context-created', {
      readingId: reading.id, tools: ['autoling', 'diseminer'],
      claims: context.candidateClaims.length,
    });
    return { text: serialized, evidence: {
      readingId: reading.id, provider: context.source,
      executed: ['autoling', 'diseminer'],
      availableOnly: ['autonovel'],
      epistemic: context.evidenceType,
    } };
  }

  /**
   * Deliberate owner invocation only. There is no LLM-to-tool autonomous
   * dispatch: AutoNovel 'register' and 'learn' can mutate donor state.
   */
  async invoke(tool, input, { ownerApproved = false } = {}) {
    if (ownerApproved !== true) throw new Error('Klein tool invocation requires explicit owner approval.');
    if (!TOOLS.includes(tool)) throw new TypeError('Unknown Klein donor tool.');
    const result = await this.resident.runTool(tool, input);
    this.bus?.emit('klein:invoked', { tool, provider: 'synthia-resident', ownerApproved: true });
    return result;
  }
}
export default KleinToolBridge;
