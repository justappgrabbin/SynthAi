import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SynthiaSystem,
  MemoryExecutionPipelineStore,
  LocalStorageExecutionPipelineStore,
  EXECUTION_PIPELINE_STAGES,
  DIMENSIONS,
} from '../src/index.mjs';

function stage(result, name) {
  return result.pipeline.stages.find((entry) => entry.stage === name);
}

test('execution pipeline traverses every wired stage through the real Synthia execution path', async () => {
  const store = new MemoryExecutionPipelineStore();
  const synthia = new SynthiaSystem({ executionPipelineStore: store });
  const result = await synthia.executeArtifact({
    name: 'pipeline.js',
    type: 'javascript',
    content: 'console.log("pipeline-live");',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.pipeline.stages.map((entry) => entry.stage), [...EXECUTION_PIPELINE_STAGES]);
  assert.ok(result.pipeline.primitiveGraph.nodeCount > 0);

  const allocated = DIMENSIONS.reduce(
    (total, field) => total + result.pipeline.schedule.fieldSummaries[field].primitiveCount,
    0,
  );
  assert.equal(allocated, result.pipeline.primitiveGraph.nodeCount);
  assert.ok(result.pipeline.schedule.forwardingCount > 0);
  assert.equal(stage(result, 'artifact-execution').evidence.path, result.path);
  assert.equal(stage(result, 'ontological-address').evidence.canonicalAddressKey, result.canonicalAddressKey);
  assert.equal(synthia.executionSnapshot().runSequence, 1);
  assert.ok(synthia.mesh.metrics().projections.dependency.edges > 0);
});

test('analysis cache accelerates repeat intake but never skips the real artifact runtime', async () => {
  let executions = 0;
  const synthia = new SynthiaSystem({
    executionPipelineStore: new MemoryExecutionPipelineStore(),
    runtimeAdapters: [{
      id: 'foo-runtime',
      kinds: ['foo'],
      async execute({ artifact }) {
        executions += 1;
        return { ok: true, engine: 'foo-runtime', returnValue: String(artifact.content) };
      },
    }],
  });
  const artifact = { name: 'twice.foo', content: 'same-input' };

  const first = await synthia.executeArtifact(artifact);
  const second = await synthia.executeArtifact(artifact);

  assert.equal(first.pipeline.cache.analysisHit, false);
  assert.equal(second.pipeline.cache.analysisHit, true);
  assert.equal(executions, 2);
  assert.equal(second.path, 'registered-runtime');
  assert.equal(second.runtimeAdapter, 'foo-runtime');
});

test('pipeline analysis and five-field state persist across Synthia instances when they share a store', async () => {
  const store = new MemoryExecutionPipelineStore();
  const artifact = { name: 'persist.json', type: 'json', content: '{"alive":true}' };

  const firstSystem = new SynthiaSystem({ executionPipelineStore: store });
  const first = await firstSystem.executeArtifact(artifact);
  assert.equal(first.pipeline.cache.analysisHit, false);

  const secondSystem = new SynthiaSystem({ executionPipelineStore: store });
  const second = await secondSystem.executeArtifact(artifact);
  assert.equal(second.pipeline.cache.analysisHit, true);
  assert.equal(secondSystem.executionSnapshot().runSequence, 2);
  for (const field of DIMENSIONS) {
    assert.ok(secondSystem.executionSnapshot().fields[field].runs >= 2);
  }
});

test('artifact execution failures remain visible while the rest of the pipeline still records evidence', async () => {
  const synthia = new SynthiaSystem({ executionPipelineStore: new MemoryExecutionPipelineStore() });
  const result = await synthia.executeArtifact({ name: 'missing-runtime.rb', content: 'puts 1' });

  assert.equal(result.ok, false);
  assert.equal(stage(result, 'artifact-execution').ok, false);
  assert.equal(stage(result, 'state-commit').ok, true);
  assert.equal(stage(result, 'ontological-address').ok, true);
  assert.ok(result.learning);
  assert.ok(result.pipeline.commit.sequence >= 1);
});

test('creator supplied canonical address survives the full pipeline unchanged', async () => {
  const supplied = {
    planetary: 13,
    dimension: 'Space',
    gate: 64,
    line: 6,
    color: 6,
    tone: 6,
    base: 5,
    degree: { band: 5, subdivision: 29, structure: '5-of-29' },
    minute: 59,
    second: 59,
    arcAxis: { arcUnit: 99, axis: 'Diagonal' },
    zodiac: 12,
    house: 12,
  };
  const synthia = new SynthiaSystem({ executionPipelineStore: new MemoryExecutionPipelineStore() });
  const result = await synthia.executeArtifact(
    { name: 'address.js', type: 'javascript', content: 'return 7;' },
    { canonicalAddress: supplied },
  );

  assert.deepEqual(result.canonicalAddress, supplied);
  assert.equal(result.addressBasis, 'creator-supplied');
  assert.equal(stage(result, 'ontological-address').ok, true);
});


test('browser storage adapter persists committed pipeline state without swallowing storage failures',async()=>{
  const values=new Map();
  const storage={
    getItem(key){return values.has(key)?values.get(key):null;},
    setItem(key,value){values.set(key,String(value));},
  };
  const firstStore=new LocalStorageExecutionPipelineStore({key:'pipeline-test',storage});
  const firstSystem=new SynthiaSystem({executionPipelineStore:firstStore});
  const artifact={name:'browser-persist.json',content:'{"persisted":true}'};
  const first=await firstSystem.executeArtifact(artifact);
  assert.equal(first.pipeline.cache.analysisHit,false);
  assert.ok(values.get('pipeline-test'));

  const secondStore=new LocalStorageExecutionPipelineStore({key:'pipeline-test',storage});
  const secondSystem=new SynthiaSystem({executionPipelineStore:secondStore});
  const second=await secondSystem.executeArtifact(artifact);
  assert.equal(second.pipeline.cache.analysisHit,true);
  assert.equal(secondSystem.executionSnapshot().runSequence,2);

  const failing=new LocalStorageExecutionPipelineStore({
    key:'broken',
    storage:{getItem(){return null;},setItem(){throw new Error('quota-test');}},
  });
  const failingSystem=new SynthiaSystem({executionPipelineStore:failing});
  await assert.rejects(()=>failingSystem.executeArtifact({name:'failure.json',content:'{}'}),/quota-test/);
});
