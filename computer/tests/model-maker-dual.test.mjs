import test from 'node:test';
import assert from 'node:assert/strict';
import { ModelMaker } from '../services/model-maker.mjs';
import { SynthiaResident } from '../services/synthia-resident.mjs';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

function persistence() {
  const values = new Map();
  return {
    get: (key, fallback) => values.has(key) ? structuredClone(values.get(key)) : fallback,
    set: async (key, value) => { values.set(key, structuredClone(value)); },
  };
}

test('Model Maker constructs independent dual-interface models with real Klein tools', async () => {
  const store = persistence();
  const resident = await new SynthiaResident({ state: store }).boot();
  const maker = new ModelMaker({ state: store, resident });
  const a = maker.create({ id: 'project' });
  const b = maker.create({ id: 'journal' });
  assert.notEqual(a, b);
  assert.equal(a, maker.create({ id: 'project' }));
  assert.equal(a.status().examples, 0);
  assert.equal(a.status().pretrained, false);
  const semantic = await a.semantic.read('The archive remembers a source.');
  assert.equal(semantic.toolEvidence.autoling, 'executed');
  assert.equal(semantic.toolEvidence.diseminer, 'executed');
  assert.equal(semantic.claims.every(x => x.status === 'unverified-speaker-report'), true);
  const cold = await a.language.generate('How are source files saved?');
  assert.equal(cold.ready, false);
  assert.equal(cold.text, null);
});

test('owner-approved training grows language patterns and memory persists across restart', async () => {
  const state = persistence();
  let resident = await new SynthiaResident({ state }).boot();
  let model = resident.languageModel;
  const examples = [
    ['How do files stay safe?', 'Original source files remain intact while a working copy changes.'],
    ['How are files preserved?', 'The vault preserves originals and records where each working copy came from.'],
    ['Can I keep the source intact?', 'An original stays untouched while a second copy receives modifications.'],
  ];
  for (const [prompt, response] of examples)
    await model.language.teach({ prompt, response, accepted: true, capability: 'file-preservation' });
  const output = await model.language.generate('How can I preserve my original files?');
  assert.equal(output.ready, true);
  assert.equal(output.generatedBy, 'learned-conditional-decoder');
  assert.ok(output.text.length > 3);
  assert.ok(output.relevantExampleId);
  assert.equal(model.status().examples, 3);
  const rejection = await model.language.teach({
    prompt: 'How do I preserve my original files?',
    response: 'purplezebrasalwaysfly',
    accepted: false, capability: 'file-preservation',
  });
  assert.equal(rejection.accepted, false);
  assert.equal(model.status().examples, 3);
  assert.equal(model.status().retainedRecords, 4);
  const afterReject = await model.language.generate('How can I preserve my original files?');
  assert.equal(afterReject.text.includes('purplezebrasalwaysfly'), false);

  resident = await new SynthiaResident({ state }).boot();
  model = resident.languageModel;
  assert.equal(model.status().examples, 3);
  assert.equal(model.status().retainedRecords, 4);
  assert.equal(resident.inference.examples, 4);
  const recalled = model.memory.recall('preserve original files');
  assert.equal(recalled.total, 4);
  assert.ok(recalled.records.some(item => item.accepted && item.response.includes('copy')));
  assert.ok(recalled.records.every(item => item.epistemic === 'owner-training-example'));
  assert.equal((await model.language.generate('How can I preserve my original files?')).ready, true);
});

test('active Computer mounts Model Maker without claiming the model is pretrained', async () => {
  const computer = await new ComputerRuntime().boot();
  assert.equal(computer.synthia.languageModel.status().pretrained, false);
  assert.equal(computer.synthia.modelMaker.create(), computer.synthia.languageModel);
  assert.equal(computer.synthia.status().modelMaker.llm, false);
});
