import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FederatedSynthia,
  resolveZonedBirthInstant,
} from '../src/index.mjs';
import { testBirthRecord } from './helpers.mjs';

async function temporaryDirectory(t, label) {
  const directory = await mkdtemp(join(tmpdir(), `${label}-`));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('birth mirror is mandatory and exact local seconds enter the live swarm/cognition path', async (t) => {
  const persistenceDir = await temporaryDirectory(t, 'synthia-birth-mandatory');
  const synthia = await FederatedSynthia.create({ persistenceDir });
  await assert.rejects(
    () => synthia.chat('generic is not personalized'),
    (error) => error.code === 'BIRTH_CONFIGURATION_REQUIRED',
  );

  const configured = await synthia.configureBirthMirror(testBirthRecord('birth-person'));
  assert.equal(configured.identity.configured, true);
  assert.equal(configured.identity.exactSecondsPreserved, true);
  assert.equal(synthia.birthMirror.configuration.resolvedTime.utcIso, '2000-01-01T17:34:56.000Z');
  assert.equal(configured.identity.fiveDimensionIntersections, 65);
  assert.equal(synthia.birthMirror.configuration.originAnchor.body, 'Personality Sun');
  assert.equal(synthia.birthMirror.configuration.originAnchor.dimension, 'Being');
  assert.equal(synthia.birthMirror.configuration.originAnchor.referenceFrame, 'Tropical');
  assert.deepEqual(synthia.semanticGenome.chartForAgent('synthia').originAddress, synthia.birthMirror.configuration.originAnchor.address);
  assert.equal(configured.identity.privateBirthRecordStored, true);
  assert.equal(configured.identity.rawBirthRecordExposed, false);
  assert.equal('birthDate' in configured.identity, false);
  assert.equal(configured.persistence.birthMirrorPersisted, true);

  const chat = await synthia.chat('Build a blue lantern.', { personId: 'birth-person' });
  assert.equal(chat.ok, true);
  assert.equal(chat.swarmExecution.executions[0].workerId, 'birth-mirror-expression-organ');
  assert.equal(chat.swarmExpression.configurationId, configured.identity.configurationId);
  assert.equal(chat.semanticGenome.address.gate, chat.swarmExpression.address.gate);
  assert.equal(chat.semanticGenome.identityAddress.gate, chat.swarmExpression.identityAddress.gate);
  assert.equal(chat.federation.centers.primaryCenter, synthia.stateSpaceRuntime.centersForGate(chat.swarmExpression.address.gate)[0]);
  assert.equal(synthia.mirrorExpressionOrgan.snapshot().calls >= 2, true);
  assert.equal(synthia.wiringAudit().ok, true);
});

test('different birth records produce different coordinates and observable expression', async (t) => {
  const firstDirectory = await temporaryDirectory(t, 'synthia-birth-a');
  const secondDirectory = await temporaryDirectory(t, 'synthia-birth-b');
  const first = await FederatedSynthia.create({ persistenceDir: firstDirectory });
  const second = await FederatedSynthia.create({ persistenceDir: secondDirectory });
  await first.configureBirthMirror(testBirthRecord('same-person'));
  await second.configureBirthMirror(testBirthRecord('same-person', {
    birthDate: '1988-06-15',
    birthTime: '03:21:09',
    place: {
      label: 'Second Test Place',
      latitude: 51.5074,
      longitude: -0.1278,
      timeZone: 'Europe/London',
    },
  }));
  const message = 'Configure the best tool for this exact task.';
  const left = await first.chat(message, { personId: 'same-person' });
  const right = await second.chat(message, { personId: 'same-person' });
  assert.notEqual(first.identityStatus().coordinateSignature, second.identityStatus().coordinateSignature);
  assert.notDeepEqual(left.swarmExpression.identityAddress, right.swarmExpression.identityAddress);
  assert.notEqual(left.federation.centers.primaryCenter, right.federation.centers.primaryCenter);
  assert.notDeepEqual(
    left.federation.centers.channels.map((flow) => flow.spec.id),
    right.federation.centers.channels.map((flow) => flow.spec.id),
  );
  for (const facet of [
    'feeling', 'taste', 'smell', 'color', 'shape', 'sound', 'voice',
    'touch', 'movement', 'intake',
  ]) {
    assert.notEqual(
      left.semanticGenome.sensoryExpression[facet].conditionStateId,
      right.semanticGenome.sensoryExpression[facet].conditionStateId,
      `birth-derived ${facet} projection must remain bound to the person's resolved condition`,
    );
  }
  assert.notDeepEqual(left.semanticGenome.embodiment, right.semanticGenome.embodiment);
  assert.notEqual(left.semanticGenome.resolvedState.stateId, right.semanticGenome.resolvedState.stateId);
  assert.notDeepEqual(left.semanticGenome.agentCapabilities, right.semanticGenome.agentCapabilities);
  assert.notEqual(left.utterance, right.utterance);
});

test('private birth mirror and the 65-place chart restore across process construction', async (t) => {
  const persistenceDir = await temporaryDirectory(t, 'synthia-birth-restart');
  const first = await FederatedSynthia.create({ persistenceDir });
  await first.configureBirthMirror(testBirthRecord('restart-person'));
  const coordinateSignature = first.identityStatus().coordinateSignature;
  await first.flushPersistence();

  const restored = await FederatedSynthia.create({ persistenceDir });
  const status = restored.identityStatus();
  assert.equal(status.configured, true);
  assert.equal(status.restored, true);
  assert.equal(status.coordinateSignature, coordinateSignature);
  assert.equal(restored.persistenceStatus.birthMirrorRestored, true);
  assert.equal(restored.semanticGenome.chartForAgent('synthia').filterIntersectionCount, 65);
  assert.equal(restored.semanticGenome.mirrors.has('restart-person'), true);
  const chat = await restored.chat('Continue after restart.', { personId: 'restart-person' });
  assert.equal(chat.ok, true);
  assert.equal(chat.swarmExecution.executions[0].workerId, 'birth-mirror-expression-organ');
});

test('timezone discontinuities surface instead of silently changing the birth instant', () => {
  assert.throws(
    () => resolveZonedBirthInstant({
      birthDate: '2024-03-10',
      birthTime: '02:30:00',
      timeZone: 'America/New_York',
    }),
    (error) => error.code === 'BIRTH_TIME_NONEXISTENT',
  );
  assert.throws(
    () => resolveZonedBirthInstant({
      birthDate: '2024-11-03',
      birthTime: '01:30:00',
      timeZone: 'America/New_York',
    }),
    (error) => error.code === 'BIRTH_TIME_AMBIGUOUS' && error.candidates.length === 2,
  );
  const earlier = resolveZonedBirthInstant({
    birthDate: '2024-11-03',
    birthTime: '01:30:00',
    timeZone: 'America/New_York',
    disambiguation: 'earlier',
  });
  const later = resolveZonedBirthInstant({
    birthDate: '2024-11-03',
    birthTime: '01:30:00',
    timeZone: 'America/New_York',
    disambiguation: 'later',
  });
  assert.equal(later.instant.getTime() - earlier.instant.getTime(), 3_600_000);
});
