import test from 'node:test';
import assert from 'node:assert/strict';
import { GenerativeSimulationLab } from '../services/generative-simulation-lab.mjs';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('LFCL numerical kernel advertises synthetic provenance', () => {
  const lab = new GenerativeSimulationLab();
  const kernels = lab.listKernels();
  assert.equal(kernels.length, 1);
  assert.equal(kernels[0].id, 'polymer-diffusion-v1');
  assert.equal(kernels[0].provenance.validation, 'not-empirically-calibrated');
});

test('LFCL numerical kernel computes and repeats a genuine scaling-law result', () => {
  const lab = new GenerativeSimulationLab();
  const params = { polymer: 'PP', massGMol: 100, temperatureC: 23 };
  const a = lab.run('polymer-diffusion-v1', params);
  const b = lab.run('polymer-diffusion-v1', params);
  assert.equal(a.output.diffusivityM2PerS, 1e-9);
  assert.deepEqual(a, b);
  assert.equal(a.evidence.measured, false);
  const lowMass = lab.run('polymer-diffusion-v1', { polymer: 'HDPE', massGMol: 50, temperatureC: 50 });
  const highMass = lab.run('polymer-diffusion-v1', { polymer: 'HDPE', massGMol: 500, temperatureC: 50 });
  assert.ok(lowMass.output.diffusivityM2PerS > highMass.output.diffusivityM2PerS);
});

test('LFCL grid generates bounded synthetic scenarios with labelled contrastive pairs', () => {
  const lab = new GenerativeSimulationLab();
  const grid = lab.grid('polymer-diffusion-v1', {
    polymers: ['PP', 'HDPE'], massesGMol: [50, 100], temperaturesC: [23, 50],
  });
  assert.equal(grid.count, 8);
  const contrasts = lab.contrastivePairs({ scenarios: grid.scenarios });
  assert.equal(contrasts.candidates, 12);
  assert.equal(contrasts.pairs.length, 12);
  assert.ok(contrasts.pairs.every(p => p.tgDiffK === 0));
  assert.match(contrasts.advisory, /Split by independent scenario/);
});

test('LFCL rejects unknown kernels, unbounded grids and invalid inputs', () => {
  const lab = new GenerativeSimulationLab();
  assert.throws(() => lab.run('missing', {}), /Unknown simulation kernel/);
  assert.throws(() => lab.run('polymer-diffusion-v1',
    { polymer: 'PP', massGMol: -1, temperatureC: 23 }), /massGMol/);
  assert.throws(() => lab.grid('polymer-diffusion-v1', {
    polymers: ['PP', 'HDPE'],
    massesGMol: Array.from({ length: 20 }, (_, i) => i + 1),
    temperaturesC: Array.from({ length: 20 }, (_, i) => i),
  }), /Maximum 256 scenarios/);
});

test('LFCL is registered in the existing Computer and runs through its public method', async () => {
  const runtime = await new ComputerRuntime().boot();
  const kernels = runtime.listSimulationKernels();
  assert.equal(kernels[0].id, 'polymer-diffusion-v1');
  assert.ok(runtime.services.has('generative-simulation-lab'));
  assert.ok(runtime.capabilityRegistry.has('numerical-simulation'));
  const result = runtime.simulate('polymer-diffusion-v1',
    { polymer: 'PP', massGMol: 100, temperatureC: 23 });
  assert.equal(result.output.diffusivityM2PerS, 1e-9);
  assert.equal(result.evidence.hypothesisStatus, 'not-evaluated');
});
