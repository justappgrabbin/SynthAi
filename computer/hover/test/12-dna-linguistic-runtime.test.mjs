import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredSynthia } from './helpers.mjs';

test('DNA linguistic observer watches the real SemanticGenome path without replacing state-space mechanics', async () => {
  const { synthia, cleanup } = await configuredSynthia('dna-linguistics-test');
  try {
    const before = synthia.dnaLinguistics.snapshot();
    assert.equal(before.observations, 0);
    const first = synthia.semanticGenome.activate('first exact runtime expression', { personId: 'dna-linguistics-test' });
    const second = synthia.semanticGenome.activate('second exact runtime expression', {
      personId: 'dna-linguistics-test',
      address: { ...first.address, line: first.address.line === 6 ? 1 : first.address.line + 1 },
    });
    const snapshot = synthia.dnaLinguistics.snapshot();
    assert.equal(snapshot.status, 'WIRED');
    assert.equal(snapshot.observations, 2);
    assert.equal(snapshot.latest.sourceActivationId, second.id);
    assert.equal(snapshot.latest.provenance.mode, 'read-only-observer');
    assert.ok(snapshot.latest.roles.alphabet.evidence.length > 0);
    assert.equal(snapshot.latest.roles.sentence.evidence.dimensionalField.length, 5);
    assert.ok(snapshot.latest.roles.sentence.evidence.protein?.id);
    assert.ok(snapshot.latest.roles.grammar.evidence.address.gate >= 1);
    assert.ok(snapshot.latest.roles.semantics.evidence.manifestationClass);
    assert.ok(snapshot.latest.transition);
    assert.ok(snapshot.latest.transition.changedAddressLayers.includes('line'));
  } finally {
    await cleanup();
  }
});
