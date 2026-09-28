import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  Primitive,
  Composite,
  replayMatches,
  IntegratedExecutionAddressResolver,
  runD1Benchmark,
  runD2Benchmark,
  runD3Benchmark,
} from '../src/index.mjs';

const AUTHORITIES = Object.freeze({
  '01-SynthAI-Exact-Address-Recall-PATCH.zip': 'feb74171d99a011307f8b497247ae732e02fd9cbdc0f0e32aea9d65444f23468',
  '02-synthia-core-v1.0.0.zip': '22944ae853ca73dc7ac5c1b9cdf06af6e560b7dab6140975b3df3f610a5d7095',
  '03-Synthia-Codex-Provider-Runtime-v0.1.1.zip': '1def70a163b159a05851465b0cdec49b4c62a2356b1ec4e526554cbbbc91e9c0',
  '04-Pure-Synthia-Trainable-Assembly-v0.4.2.zip': 'cee899ef720a0e1776f525c959b6e12404a74dd3b4547da7caf34dff5febcc46',
  '05-Synthia-Universal-Execution-Spine-v0.4.0.zip': '4b407881be4324860d09e3c743b5d518d35b8f0daa0831545a6c7e2b3c62c6af',
  '06-Kimi_Agent_Automata-State-Space-Merge-1-.zip': 'fa3344dac6f8c4b2e838b9146ca5c6d339e1fc4ec0bb7aa15c3259724beff3fd',
});

test('all six supplied archives remain byte-exact source authorities', async () => {
  for (const [name, expected] of Object.entries(AUTHORITIES)) {
    const bytes = await readFile(new URL(`../authorities/originals/${name}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, name);
  }
});

test('promoted D1/D2/D3 implementations still match every sealed field', () => {
  for (const report of [runD1Benchmark(), runD2Benchmark(), runD3Benchmark()]) {
    assert.equal(report.reproduction.status, 'match');
    assert.equal(report.reproduction.mismatchCount, 0);
    assert.equal(report.metrics.derivationIntegrity, 1);
  }
});

test('descent produces evaluated primitives and resolve ascends with provenance', () => {
  const resolver = new IntegratedExecutionAddressResolver();
  const artifact = { name: 'local.json', content: '{"player":"moves"}' };
  const primitives = resolver.descend(artifact);
  assert.ok(primitives.length > 0);
  assert.ok(primitives.every((primitive) => primitive instanceof Primitive));
  assert.ok(primitives.every((primitive) => ['Movement', 'Evolution', 'Being', 'Design', 'Space'].includes(primitive.candidateDimension)));
  assert.ok(primitives.every((primitive) => primitive.candidateAddress?.score != null));
  assert.ok(primitives.every((primitive) => primitive.candidateAddress.fiveLevelProjection.length === 5));
  assert.equal(primitives.summary.byteLength, artifact.content.length);
  const resolved = resolver.resolve({ artifact, decomposition: primitives });
  assert.deepEqual(resolved.scaleLadder.map((record) => record.scale), ['bit', 'byte', 'structure', 'artifact', 'automaton']);
  assert.ok(resolved.top instanceof Composite);
  assert.equal(resolved.top.scale, 'automaton');
  assert.ok(resolved.scaleLadder.slice(2).every((record) => replayMatches(record.derivation)));
  assert.deepEqual(resolved.fiveLevelProjection.map((level) => level.level), ['Movement', 'Evolution', 'Being', 'Design', 'Space']);
  assert.ok(resolved.scaleLadder.slice(2).every((record) => record.fiveLevelProjection.length === 5));
  assert.deepEqual(resolved.derivation.inversePath, ['live_desequence', 'live_desequence', 'live_unbundle']);
});
