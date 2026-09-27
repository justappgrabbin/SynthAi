import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredSynthia } from './helpers.mjs';

test('watering, admission, sentence contact, books, and training are live learning-mesh instruments', async (t) => {
  const fixture = await configuredSynthia('cultivation-person');
  t.after(fixture.cleanup);
  const { synthia } = fixture;

  const water = await synthia.water('I learn through movement and contact with others.', { personId: 'cultivation-person' });
  assert.equal(water.ok, true);
  assert.equal(water.waterCount, 1);
  assert.equal(water.trace.length, 5);
  assert.ok(water.trace.every((entry) => entry.consumed));
  assert.ok(water.canonicalAddress.arcAxis);
  assert.equal(water.federation.learning.receipt.consumed, true);
  assert.ok(water.federation.destinations.every((entry) => entry.receipt.consumed));

  const admitted = await synthia.admit({
    id: 'cultivated-piece',
    text: 'Relating to others through felt presence.',
    type: 'concept',
  }, { personId: 'cultivation-person' });
  assert.equal(admitted.ok, true);
  assert.equal(admitted.waterCount, 2);
  assert.equal(admitted.entity.entityId, 'cultivated-piece');
  assert.ok(admitted.entity.currentAddress.planetary);
  assert.ok(admitted.canonicalAddress.arcAxis);

  const contact = await synthia.contact('synthia', 'cultivated-piece', { relation: 'recognizes' }, { personId: 'cultivation-person' });
  assert.equal(contact.ok, true);
  assert.equal(contact.sentence.relation, 'recognizes');
  assert.ok(contact.sentence.sentence.length > 0);
  assert.ok(contact.utterance.length > 0);

  const book = await synthia.ingestBook({
    sourceId: 'cultivation-book',
    title: 'Cultivation Book',
    dimension: 'Being',
    text: 'Presence moves through the field.\n\nContact gives the movement relational meaning.',
  }, { personId: 'cultivation-person' });
  assert.equal(book.ok, true);
  assert.equal(book.fragmentCount, 2);
  assert.ok(book.fragments.every((fragment) => fragment.extracted.autoling));
  assert.ok(book.fragments.every((fragment) => fragment.extracted.diseminer));
  assert.ok(book.fragments.every((fragment) => fragment.extracted.monteCarlo));

  const training = synthia.trainingSnapshot();
  assert.equal(training.core.waterCount, 2);
  assert.ok(training.entities.entities.length >= 4);
  assert.equal(training.fragments.length, 2);
  assert.ok(training.routes.some((route) => route.route === 'diseminer>state-space-kernel'));

  const audit = synthia.wiringAudit();
  for (const field of ['watering', 'admissionRegistry', 'sentenceContact', 'bookIngestion', 'trainingJournal']) {
    assert.equal(audit[field], true, field);
  }
  assert.equal(audit.liveProcessCount, 115);
  assert.equal(audit.integratedHandCount, 68);
  assert.equal(audit.allSynthiaIsCultivation, true);
  assert.equal(audit.nineCenterBody, true);
  assert.equal(audit.crossMeshContextConsumption, true);
});
