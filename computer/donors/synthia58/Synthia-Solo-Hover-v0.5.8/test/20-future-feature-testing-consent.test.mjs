import test from 'node:test';
import assert from 'node:assert/strict';
import { FederatedSynthia, FutureFeatureTestingRegistry } from '../src/index.mjs';
import { configuredSynthia } from './helpers.mjs';

test('future feature testing is private by default and permission is per submission', () => {
  const registry = new FutureFeatureTestingRegistry();
  const privateSubmission = registry.registerSubmission({
    ownerId: 'person-a',
    name: 'Private Project',
    kind: 'project',
  });

  assert.equal(privateSubmission.consent.futureTesting, false);
  assert.equal(registry.eligibility([privateSubmission.submissionId]).eligible, false);
  assert.equal(registry.eligibility([privateSubmission.submissionId]).reason, 'future_testing_not_allowed');

  const optedIn = registry.setConsent(privateSubmission.submissionId, 'person-a', {
    futureTesting: true,
    useTestResultsForFutureDevelopment: true,
  });
  assert.equal(optedIn.consent.futureTesting, true);
  assert.equal(optedIn.consent.crossSubmissionTesting, false);
  assert.equal(registry.eligibility([privateSubmission.submissionId], {
    useTestResultsForFutureDevelopment: true,
  }).eligible, true);
});

test('cross-submission tests require every owner to opt in and revocation blocks future use without deleting history', () => {
  const registry = new FutureFeatureTestingRegistry();
  const a = registry.registerSubmission({
    ownerId: 'person-a',
    name: 'Project A',
    consent: {
      futureTesting: true,
      crossSubmissionTesting: true,
      useTestResultsForFutureDevelopment: true,
    },
  });
  const b = registry.registerSubmission({
    ownerId: 'person-b',
    name: 'Project B',
    consent: { futureTesting: true },
  });

  assert.equal(registry.eligibility([a.submissionId, b.submissionId]).eligible, false);
  registry.setConsent(b.submissionId, 'person-b', {
    futureTesting: true,
    crossSubmissionTesting: true,
    useTestResultsForFutureDevelopment: true,
  });

  const use = registry.recordTestUse({
    submissionIds: [a.submissionId, b.submissionId],
    purpose: {
      futureFeature: 'combined network capability',
      useTestResultsForFutureDevelopment: true,
    },
    testContext: { scenario: 'pairwise-capability-test' },
    resultRef: 'result:1',
  });
  assert.equal(use.submissionIds.length, 2);
  assert.equal(registry.snapshot().testUseLedger.length, 1);

  registry.revoke(a.submissionId, 'person-a', 'owner changed future-use preference');
  assert.equal(registry.eligibility([a.submissionId, b.submissionId]).eligible, false);
  assert.equal(registry.snapshot().testUseLedger.length, 1);
  assert.equal(registry.snapshot().historicalUseRecordsAreAppendOnly, true);
});

test('future feature testing registry is wired into FederatedSynthia and persists with runtime state', async (t) => {
  const fixture = await configuredSynthia('future-testing-person');
  t.after(fixture.cleanup);
  const { synthia, persistenceDir } = fixture;

  const submission = synthia.registerFutureFeatureSubmission({
    ownerId: 'future-testing-person',
    name: 'Resonance Network',
    kind: 'project',
    sourceRef: 'local:resonance-network',
  });
  assert.equal(submission.consent.futureTesting, false);

  synthia.setFutureFeatureTestingConsent(submission.submissionId, 'future-testing-person', {
    futureTesting: true,
    crossSubmissionTesting: true,
    useTestResultsForFutureDevelopment: true,
    allowMechanismIncorporation: true,
    allowResultingFeatureForOtherUsers: false,
  });
  const recorded = synthia.recordFutureFeatureTestUse({
    submissionIds: [submission.submissionId],
    purpose: {
      futureFeature: 'resonance-network-option',
      useTestResultsForFutureDevelopment: true,
      allowMechanismIncorporation: true,
    },
    testContext: { mode: 'owner-opted-in' },
  });
  assert.ok(recorded.id);
  await synthia.flushPersistence();

  const audit = synthia.wiringAudit();
  assert.equal(audit.futureFeatureTestingConsent, true);

  const restored = await FederatedSynthia.create({ persistenceDir });
  const snapshot = restored.futureFeatureTestingSnapshot();
  assert.equal(snapshot.submissions.length, 1);
  assert.equal(snapshot.submissions[0].name, 'Resonance Network');
  assert.equal(snapshot.submissions[0].consent.futureTesting, true);
  assert.equal(snapshot.testUseLedger.length, 1);
});
