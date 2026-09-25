import assert from "node:assert/strict";
import { morphMirAdapter } from "../UPGRADES/adapters/MorphMirAdapter.js";

const tool = morphMirAdapter();
const context = {
  sessionId: "semantic-rebuild-smoke",
  expression: {
    capabilities: ["ingest_project", "rebuild"],
    parameters: {}
  },
  inputValues: {
    files: [
      {
        id: "math_utils",
        name: "math_utils.py",
        content: `"""Small arithmetic helpers used by the service."""
def double(value):
    return value * 2
`
      },
      {
        id: "service",
        name: "service.py",
        content: `"""Coordinates the helper and validates its result."""
from math_utils import double

def calculate(value):
    result = double(value)
    if result < 0:
        return 0
    return result
`
      }
    ]
  },
  runtimeState: {}
};

const output = await tool.execute(context);
assert.equal(output.success, true);

const project = output.outputValues.output;
assert.equal(project.mode, "semantic_js");
assert.equal(project.files.length, 2);
assert.ok(project.project.summary.localRelationships >= 1);

const service = project.files.find((file) => file.id === "service");
assert.ok(service);
assert.equal(service.regeneration.monteCarlo.name, "MonteCarloGrammarEngine");
assert.equal(service.regeneration.monteCarlo.reused, true);
assert.match(service.regeneration.code, /\bcalculate\b/);
assert.doesNotMatch(service.regeneration.code, /\bdef\s+calculate\b/);
assert.doesNotMatch(service.regeneration.code, /\bself\./);

const relationship = project.project.graph.edges.find(
  (edge) =>
    edge.from === "service" &&
    edge.to === "math_utils" &&
    edge.kind === "imports-local"
);
assert.ok(relationship);

console.log(JSON.stringify({
  pass: true,
  tool: "morph-mir",
  mode: project.mode,
  files: project.files.length,
  relationships: project.project.summary.localRelationships,
  monteCarlo: service.regeneration.monteCarlo.name,
  strategy: service.regeneration.strategy,
  confidence: service.regeneration.confidence
}));
