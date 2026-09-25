/**
 * ResearchOrgan — drives ResearchWorkspace (claims, sources, hypotheses, experiments)
 * Self-referential: tools can read project state via snapshot.
 */
import { ResearchWorkspace } from '../vendor/ato-core/src/research-browser.mjs';

export class ResearchOrgan {
  constructor() {
    this.id = 'research';
    this.capabilities = ['research', 'citations', 'hypothesis', 'experiment', 'problem-solve'];
    this.workspace = new ResearchWorkspace();
    this.activeProjectId = null;
  }

  accepts(intent) {
    return /\b(research|investigate|study|find out|look up|hypothesis|claim|source|evidence|problem.?solve|analyze)\b/i.test(intent);
  }

  async execute({ intent, address, mode = 'complement', graphContext = null }) {
    const text = String(intent || '').trim();
    // Create or continue a project from the intent as the research question
    let projectId = this.activeProjectId;
    if (!projectId || /\b(new research|start research|investigate)\b/i.test(text)) {
      const snap = this.workspace.create({
        title: text.slice(0, 80) || 'Open inquiry',
        question: text || 'What is the structure of this field?',
        scope: mode
      });
      projectId = snap.id;
      this.activeProjectId = projectId;
    }

    // Seed a claim from the intent itself (self-referential starting point)
    const claim = this.workspace.claim(projectId, {
      text: `Working claim derived from intent: ${text.slice(0, 200)}`,
      sourceIds: [],
      kind: 'working-claim',
      confidence: 0.4
    });

    this.workspace.note(projectId, {
      text: `Address context: gate=${address?.gate ?? address?.canonical?.gate ?? '?'} mode=${mode}`,
      claimIds: [claim.id]
    });

    const hyp = this.workspace.hypothesis(projectId, {
      statement: `If we treat the intent as a research question, the next step is to gather sources and test coherence against state-space.`,
      evidenceClaimIds: [claim.id]
    });

    const experiment = this.workspace.experiment(projectId, {
      hypothesisId: hyp.id,
      protocol: '1) Collect sources 2) Extract claims 3) Check against StateSpaceKernel vectors 4) Revise hypothesis',
      executor: 'local',
      effects: ['research-record', 'state-space-read']
    });

    const snap = this.workspace.snapshot(projectId);
    if (graphContext) this.workspace.note(projectId, { text: `Live GraphRuntime chart graph consumed: ${graphContext.chartId}; nodes=${(graphContext.nodeIds || []).length}; edges=${(graphContext.edgeIds || []).length}`, claimIds: [claim.id] });

    return {
      ok: true,
      organ: this.id,
      text: `Research project “${snap.title}” is live. Question: ${snap.question}. ` +
            `${Object.keys(snap.sources || {}).length} sources, ${Object.keys(snap.claims || {}).length} claims, ` +
            `${Object.keys(snap.hypotheses || {}).length} hypotheses. Next: add sources or run the designed experiment.`,
      project: snap,
      claim,
      hypothesis: hyp,
      experiment,
      address,
      mode,
      graphContext: graphContext ? { chartId: graphContext.chartId, nodeIds: [...(graphContext.nodeIds || [])], edgeIds: [...(graphContext.edgeIds || [])], consumedCoordinateCount: (graphContext.nodes || []).length } : null
    };
  }
}

export default ResearchOrgan;
