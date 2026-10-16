import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';
import { matchGrid } from '../donors/verified/simlish/frame-morph.mjs';
import {
  FITNESS_PROVIDER, FITNESS_FORMATION, GEOMETRY_FORMATION,
} from '../services/fitness-morph.mjs';

const address = { mode: 'macro', gate: 17, line: 1, color: 1, tone: 1, base: 1 };
const image = (w, h, shift = 0) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const at = (y * w + x) * 4;
    const signal = Math.max(0, 255 - Math.abs(x - w / 2 + shift) * 8 - Math.abs(y - h / 2) * 5);
    data.set([signal, signal / 2, signal / 3, 255], at);
  }
  return data;
};
const samples = (gradient = true) => {
  const list = [];
  for (let y = -1; y <= 1.001; y += .2) for (let x = -1; x <= 1.001; x += .2) {
    const source = [110 + x * 4, 125 + y * 3, 145];
    const target = gradient ? source.map((v, c) =>
      v + [8, 4, -3][c] + [15, -10, 8][c] * x + [5, 12, -6][c] * y) : [...source];
    list.push({ x, y, source, target });
  }
  return list;
};

test('ACCEPTANCE 13: native Simlish CPU PSO alters real MorphEngine only with held-out improvement', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synthai-fitness-'));
  try {
    const path = join(dir, 'events.jsonl');
    const statePath = join(dir, 'state.json');
    const boot = async () => {
      const computer = await new ComputerRuntime({
        eventLogPath: path,
        persistence: new JsonFilePersistence(statePath),
        namespace: 'fitness-test',
      }).boot();
      await computer.enableFitnessMorph();
      return computer;
    };
    const computer = await boot();
    const forms = await computer.fitnessMorph.ensureFormations({ address });
    assert.equal(forms.length, 2);
    assert.equal(forms[0].id, FITNESS_FORMATION);
    assert.equal(forms[1].id, GEOMETRY_FORMATION);
    assert.equal(computer.fitnessMorph.constructor.name, 'ComputerFitnessMorph');

    const result = await computer.fitnessMorph.fit(samples());
    assert.equal(result.accepted, true);
    assert.equal(result.workers, false);
    assert.equal(result.gpu, false);
    assert.ok(result.heldOutAfter < result.heldOutBefore * .2);
    assert.equal(result.values.length, 9);
    assert.ok(result.values.every(v => Number.isFinite(v)));
    assert.deepEqual(computer.state.get('morph.targets.studio-lighting').fittedLighting, result.values);

    const rejected = await computer.fitnessMorph.fit(samples(false));
    assert.equal(rejected.accepted, false);
    assert.equal(rejected.gain, 0);
    assert.deepEqual(computer.state.get('morph.targets.studio-lighting').fittedLighting, result.values,
      'failed fitness evaluation cannot overwrite accepted parameters');
    const entries = await computer.fitnessMorph.history();
    assert.equal(entries.length, 2);
    assert.deepEqual(entries.map(e => e.result_status), ['success', 'partial']);
    assert.ok(entries.every(e => e.provider === FITNESS_PROVIDER));
    assert.ok(entries.every(e => e.input?.samples == null), 'raw image samples never enter persistent ledger');

    const restarted = await boot();
    assert.equal(restarted.formations.describe(FITNESS_FORMATION).revisions.length, 1);
    assert.deepEqual(restarted.state.get('morph.targets.studio-lighting').fittedLighting, result.values);
    assert.equal((await restarted.fitnessMorph.history()).length, 2);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('ACCEPTANCE 13: original Simlish actual frame pixels create mesh and ATO executes morph geometry', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synthai-geometry-'));
  try {
    const path = join(dir, 'events.jsonl');
    const computer = await new ComputerRuntime({ eventLogPath: path }).boot();
    await computer.enableFitnessMorph();
    await computer.fitnessMorph.ensureFormations({ address });
    const mesh = matchGrid(image(96, 128), image(96, 128, 4), 96, 128,
      { columns: 8, rows: 12, radius: 10 });
    assert.equal(mesh.source.length, 117);
    const atStart = await computer.fitnessMorph.interpolate(mesh, 0);
    const atHalf = await computer.fitnessMorph.interpolate(mesh, .5);
    const atEnd = await computer.fitnessMorph.interpolate(mesh, 1);
    assert.deepEqual(atStart.points, mesh.source);
    assert.deepEqual(atEnd.points, mesh.target);
    assert.equal(atHalf.points.length, mesh.source.length);
    assert.equal(atHalf.donor, 'Simlish/frame-morph.mjs');
    for (let i = 0; i < atHalf.points.length; i++) {
      assert.equal(atHalf.points[i].x, (mesh.source[i].x + mesh.target[i].x) / 2);
      assert.equal(atHalf.points[i].y, (mesh.source[i].y + mesh.target[i].y) / 2);
    }
    const history = await computer.formationHistory(GEOMETRY_FORMATION);
    assert.equal(history.filter(e => e.input.action === 'execute').length, 3);
    await assert.rejects(() => computer.fitnessMorph.interpolate(mesh, 1.5), /progress from zero to one/);
    const restarted = await new ComputerRuntime({ eventLogPath: path }).boot();
    await restarted.enableFitnessMorph();
    assert.equal((await restarted.fitnessMorph.interpolate(mesh, .25)).points.length, 117);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
