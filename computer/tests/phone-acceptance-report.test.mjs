import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPhoneAcceptanceReport } from '../phone-acceptance-report.mjs';

test('visible Android Home records user access without overstating phone acceptance', () => {
  const report = buildPhoneAcceptanceReport({
    androidHost: true,
    visibleHome: true,
    runtimeStatus: 'STARTING',
    creatorAccepted: false,
    observedAt: 10,
  });
  assert.equal(report.state, 'user-access-verified');
  assert.equal(report.checks.backendVerified, false);
  assert.equal(report.checks.creatorAccepted, false);
});

test('phone accepted requires creator acceptance, verified backend and observed restart', () => {
  const report = buildPhoneAcceptanceReport({
    androidHost: true,
    visibleHome: true,
    runtimeStatus: 'VERIFIED',
    previousBootAt: 9,
    creatorAccepted: true,
    services: ['projects', 'task-fit'],
    artifactSha256: 'f42de573effd5b0f8ee7707e8670baa8f63f3a3bb32686d32ea5db2d6974cfd5',
    observedAt: 10,
  });
  assert.equal(report.state, 'phone-accepted');
  assert.deepEqual(report.checks, {
    androidHost: true,
    visibleHome: true,
    backendVerified: true,
    restartObserved: true,
    creatorAccepted: true,
  });
  assert.equal(report.runtime.services.length, 2);
});
