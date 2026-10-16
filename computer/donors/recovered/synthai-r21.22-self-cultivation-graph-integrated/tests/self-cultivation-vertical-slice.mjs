import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';

const unit = new SynthiaUnit({
  autoStart: false,
  memoryKey: `vertical-slice-${Date.now()}`,
  profile: { purpose: 'testable self-cultivation' },
  residence: { approved: true, address: null, addressComplete: false },
});

const result = await unit.runSelfCultivation({
  name: 'Vertical Slice User',
  birth: {
    timestamp: '1990-01-01T12:00:00+00:00',
    location: { label: 'New York', latitude: 40.7128, longitude: -74.006 },
  },
  situation: 'I keep delaying one important conversation and want one honest practical move this week.',
  goal: 'practice direct communication through one observable action',
  purpose: 'more honest communication',
  worked: true,
  actualOutcome: 'I scheduled and completed the conversation; the next step is clearer.',
});

assert.equal(result.ok, true);
assert.match(result.chart.chartId, /^chart-/);
assert.equal(result.chart.astrology.placements.length, 78);
assert.ok(result.chart.humanDesign.gates.length > 0);
assert.equal(result.chart.provenance.source, 'Synthia-r21.19-IsoHuman-Chart-Donor-ONLY');
assert.equal(result.runtime.sessionId.startsWith('cultivation-'), true);
const runtimeState = unit.runtime.states.get(result.runtime.sessionId);
assert.ok(runtimeState?.session?.intent?.chartCoordinates?.length > 0);
assert.equal(runtimeState.session.intent.chart.chartId, result.chart.chartId);
assert.ok(result.runtime.graphNodes >= 26);
assert.ok(result.runtime.graphEdges > 0);
assert.equal(result.runtime.chart.chartId, result.chart.chartId);
assert.equal(result.runtime.chart.coordinateCount, 26);
assert.equal(result.runtime.chart.nodeIds.length, 26);
assert.equal(result.runtime.chart.edgeIds.length, 13);
assert.ok(result.runtime.chart.nodes.some(node => node.coordinate.planetary === 'Sun' && node.coordinate.orientation === 'personality' && node.coordinate.gate === result.chart.humanDesign.coordinates.find(c => c.planetary === 'Sun' && c.orientation === 'personality').gate));
assert.ok(result.runtime.chart.edges.every(edge => edge.relation === 'personality-design'));
for (const tool of [result.klein.autoling, result.klein.disseminer, result.klein.research]) {
  assert.equal(tool.ok, true);
  assert.equal(tool.graphContext.chartId, result.chart.chartId);
  assert.equal(tool.graphContext.nodeIds.length, 26);
  assert.equal(tool.graphContext.edgeIds.length, 13);
  assert.equal(tool.graphContext.consumedCoordinateCount, 26);
}
assert.equal(result.hypothesis.kind, 'hypothesis');
assert.equal(result.hypothesisResult.status, 'supported');
assert.equal(result.cycle.evidence.length, 1);
assert.equal(result.cycle.evidence[0].worked, true);
assert.equal(result.experiment.result, 'supported');
assert.ok(result.provenance.runtime.chartCoordinates.length > 0);
assert.equal(result.provenance.runtime.instantiatedGraph.chartId, result.chart.chartId);
assert.equal(result.provenance.runtime.instantiatedGraph.nodeIds.length, 26);
assert.equal(result.provenance.runtime.instantiatedGraph.edgeIds.length, 13);
assert.deepEqual(result.provenance.kleinTools, ['autoling', 'disseminer', 'research']);
assert.equal(result.provenance.evidence.source, 'self-cultivation-vertical-slice');
assert.equal(result.confidenceRevision.worked, true);
assert.ok(result.confidenceRevision.toolHealth);

const persisted = unit.successSnapshot();
assert.ok(persisted.humanOutcomes.records.some(record => record.id === result.hypothesisResult.id));
assert.ok(persisted.humanDesign.experiments.some(experiment => experiment.id === result.experiment.id));
assert.ok(unit.cultivationProgram.recent().some(cycle => cycle.id === result.cycle.id));

unit.stopLife();
console.log(JSON.stringify({
  ok: true,
  chartId: result.chart.chartId,
  placements: result.chart.astrology.placements.length,
  gates: result.chart.humanDesign.gates.length,
  graphNodes: result.runtime.graphNodes,
  kleinTools: result.provenance.kleinTools,
  hypothesis: result.hypothesisResult.status,
  outcome: result.experiment.result,
  persistedOutcomes: persisted.humanOutcomes.records.length,
}, null, 2));
