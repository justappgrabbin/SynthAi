import { DISEMINER } from '../runtime/disseminer.js';
import { AutolingEngine } from '../runtime/autoling.js';
import { SynthiaAutomata } from '../../vendor/kimi-state-space/src/engine/synthia.js';
import { GeometryOperatorRegistry } from './geometry/GeometryOperatorRegistry.mjs';
import { renderSvg } from './geometry/MorphSvgRenderer.mjs';
import { SourceMemory } from './SourceMemory.mjs';
import { PressureMesh } from './PressureMesh.mjs';
import { extractProcedures } from './ProcedureExtractor.mjs';

export class FirstMind {
  constructor() {
    this.diseminer = new DISEMINER();
    this.autoling = new AutolingEngine();
    this.stateSpace = new SynthiaAutomata();
    this.geometry = new GeometryOperatorRegistry();
    this.sources = new SourceMemory();
    this.pressure = new PressureMesh();
    for (const tool of this.stateSpace.listTools()) this.pressure.register(tool.id, { competence: 0.6 });
    this.pressure.register('geometry-operator-registry', { competence: 0.7 });
    this.pressure.register('morph-renderer', { competence: 0.7 });
  }

  async ingestText(text, metadata = {}) {
    const source = this.sources.preserve(String(text), metadata);
    this.diseminer.ingest(String(text), source.id);
    const [semantics, linguistics] = await Promise.all([
      Promise.resolve(this.diseminer.infer(String(text))),
      this.autoling.runPipeline(String(text)),
    ]);
    const procedures = extractProcedures(text);
    const addressed = this.stateSpace.intake(String(text), { sourceId: source.id });
    const analysis = Object.freeze({ semantics, linguistics, procedures, addressed });
    this.sources.attachAnalysis(source.id, analysis);
    return Object.freeze({ source, analysis });
  }

  async learnOperator({ sourceText, sourceMetadata = {}, contract, implementation, inputs, verifier, render = true }) {
    const intake = await this.ingestText(sourceText, sourceMetadata);
    this.pressure.press('geometry-operator-registry', { need: 1, unresolved: 1, salience: 0.8 });
    const candidate = this.geometry.propose({ ...contract, sourceId: intake.source.id }, implementation, {
      procedures: intake.analysis.procedures,
      address: intake.analysis.addressed.address,
    });
    const report = this.geometry.evaluate(candidate.id, inputs, verifier);
    this.pressure.record('geometry-operator-registry', report.verification.passed);
    let artifact = null;
    if (report.verification.passed && render && report.output?.primitives) {
      this.pressure.press('morph-renderer', { need: 1, urgency: 0.4, salience: 0.8 });
      artifact = renderSvg(report.output.primitives);
      this.pressure.record('morph-renderer', Boolean(artifact));
      this.stateSpace.editor.addPrimitiveFromPattern({
        identity: contract.name,
        contrast: 'verified/unverified',
        position: intake.analysis.addressed.address,
        operations: intake.analysis.procedures.steps.map((step) => step.action),
        dependencies: contract.dependencies || [],
      }, contract.scale || 'geometry');
    }
    this.pressure.release('geometry-operator-registry');
    this.pressure.release('morph-renderer');
    return Object.freeze({ intake, candidate, report, artifact, retained: Boolean(this.geometry.get(candidate.id)) });
  }
}

