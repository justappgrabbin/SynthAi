import { deterministicId, safe } from '../util.mjs';

export const FUTURE_FEATURE_CONSENT_KEYS = Object.freeze([
  'futureTesting',
  'crossSubmissionTesting',
  'useTestResultsForFutureDevelopment',
  'allowMechanismIncorporation',
  'allowResultingFeatureForOtherUsers',
]);

const DEFAULT_CONSENT = Object.freeze({
  futureTesting: false,
  crossSubmissionTesting: false,
  useTestResultsForFutureDevelopment: false,
  allowMechanismIncorporation: false,
  allowResultingFeatureForOtherUsers: false,
});

function cleanConsent(input = {}) {
  const requested = Object.fromEntries(FUTURE_FEATURE_CONSENT_KEYS.map((key) => [key, input?.[key] === true]));
  if (!requested.futureTesting) {
    return Object.freeze({ ...DEFAULT_CONSENT });
  }
  return Object.freeze(requested);
}

function copy(value) {
  return safe(value);
}

/**
 * User-controlled permission registry for future product/feature testing.
 *
 * Registration and private use do not imply testing permission. Permission is
 * explicit per submission, can be narrowed or revoked for future use, and all
 * decisions/tests remain in append-only ledgers for provenance.
 */
export class FutureFeatureTestingRegistry {
  constructor({ restored = null, onChange = null } = {}) {
    this.submissions = new Map();
    this.consentEvents = [];
    this.testUseLedger = [];
    this.sequence = 0;
    this.onChange = typeof onChange === 'function' ? onChange : null;
    if (restored) this.restore(restored);
  }

  #emit(type, record) {
    this.onChange?.(Object.freeze({ type, record: copy(record), snapshot: this.snapshot() }));
  }

  #next() { this.sequence += 1; return this.sequence; }

  registerSubmission(input = {}) {
    const ownerId = String(input.ownerId ?? '').trim();
    const name = String(input.name ?? '').trim();
    if (!ownerId) throw new TypeError('submission ownerId is required');
    if (!name) throw new TypeError('submission name is required');

    const sequence = this.#next();
    const submissionId = String(input.submissionId ?? deterministicId('submission', {
      ownerId,
      name,
      kind: input.kind ?? 'project',
      sourceRef: input.sourceRef ?? null,
    }, sequence));
    if (this.submissions.has(submissionId)) throw new Error(`submission already registered: ${submissionId}`);

    const record = Object.freeze({
      submissionId,
      ownerId,
      name,
      kind: String(input.kind ?? 'project'),
      sourceRef: input.sourceRef ?? null,
      capabilities: Object.freeze([...(input.capabilities ?? [])].map((value) => String(value))),
      context: copy(input.context ?? {}),
      registeredAt: input.registeredAt ?? sequence,
      status: 'active',
      consent: cleanConsent(input.consent),
      consentRevision: 0,
    });
    this.submissions.set(submissionId, record);
    this.consentEvents.push(Object.freeze({
      id: deterministicId('future-consent', { submissionId, kind: 'registration' }, sequence),
      sequence,
      submissionId,
      ownerId,
      operation: 'registration',
      consent: record.consent,
      reason: null,
    }));
    this.#emit('submission-registration', record);
    return record;
  }

  get(submissionId) { return this.submissions.get(String(submissionId)) ?? null; }

  list({ ownerId = null } = {}) {
    return Object.freeze([...this.submissions.values()].filter((entry) => ownerId == null || entry.ownerId === ownerId));
  }

  setConsent(submissionId, ownerId, consent = {}, { reason = null } = {}) {
    const id = String(submissionId);
    const current = this.get(id);
    if (!current) throw new Error(`unknown submission: ${id}`);
    if (current.ownerId !== String(ownerId)) throw new Error('submission owner mismatch');
    const nextConsent = cleanConsent(consent);
    const sequence = this.#next();
    const updated = Object.freeze({
      ...current,
      consent: nextConsent,
      consentRevision: current.consentRevision + 1,
    });
    this.submissions.set(id, updated);
    const event = Object.freeze({
      id: deterministicId('future-consent', { submissionId: id, revision: updated.consentRevision, consent: nextConsent }, sequence),
      sequence,
      submissionId: id,
      ownerId: current.ownerId,
      operation: nextConsent.futureTesting ? 'grant-or-update' : 'revoke-future-use',
      consent: nextConsent,
      reason: reason == null ? null : String(reason),
    });
    this.consentEvents.push(event);
    this.#emit('consent-change', event);
    return updated;
  }

  revoke(submissionId, ownerId, reason = null) {
    return this.setConsent(submissionId, ownerId, DEFAULT_CONSENT, { reason });
  }

  eligibility(submissionIds = [], purpose = {}) {
    const ids = [...new Set((Array.isArray(submissionIds) ? submissionIds : [submissionIds]).map(String).filter(Boolean))];
    if (!ids.length) return Object.freeze({ eligible: false, reason: 'no_submissions', submissions: [] });
    const submissions = ids.map((id) => this.get(id));
    const missing = ids.filter((_id, index) => !submissions[index]);
    if (missing.length) return Object.freeze({ eligible: false, reason: 'unknown_submission', missing: Object.freeze(missing), submissions: [] });
    if (submissions.some((entry) => entry.status !== 'active')) {
      return Object.freeze({ eligible: false, reason: 'inactive_submission', submissions: Object.freeze(submissions) });
    }
    if (submissions.some((entry) => entry.consent.futureTesting !== true)) {
      return Object.freeze({ eligible: false, reason: 'future_testing_not_allowed', submissions: Object.freeze(submissions) });
    }
    if (submissions.length > 1 && submissions.some((entry) => entry.consent.crossSubmissionTesting !== true)) {
      return Object.freeze({ eligible: false, reason: 'cross_submission_testing_not_allowed', submissions: Object.freeze(submissions) });
    }
    if (purpose.useTestResultsForFutureDevelopment === true
      && submissions.some((entry) => entry.consent.useTestResultsForFutureDevelopment !== true)) {
      return Object.freeze({ eligible: false, reason: 'future_development_result_use_not_allowed', submissions: Object.freeze(submissions) });
    }
    if (purpose.allowMechanismIncorporation === true
      && submissions.some((entry) => entry.consent.allowMechanismIncorporation !== true)) {
      return Object.freeze({ eligible: false, reason: 'mechanism_incorporation_not_allowed', submissions: Object.freeze(submissions) });
    }
    if (purpose.allowResultingFeatureForOtherUsers === true
      && submissions.some((entry) => entry.consent.allowResultingFeatureForOtherUsers !== true)) {
      return Object.freeze({ eligible: false, reason: 'resulting_feature_distribution_not_allowed', submissions: Object.freeze(submissions) });
    }
    return Object.freeze({ eligible: true, reason: 'consent_allows_requested_test', submissions: Object.freeze(submissions) });
  }

  recordTestUse(input = {}) {
    const submissionIds = [...new Set((input.submissionIds ?? []).map(String).filter(Boolean))];
    const purpose = Object.freeze({
      futureProduct: input.purpose?.futureProduct == null ? null : String(input.purpose.futureProduct),
      futureFeature: input.purpose?.futureFeature == null ? null : String(input.purpose.futureFeature),
      useTestResultsForFutureDevelopment: input.purpose?.useTestResultsForFutureDevelopment === true,
      allowMechanismIncorporation: input.purpose?.allowMechanismIncorporation === true,
      allowResultingFeatureForOtherUsers: input.purpose?.allowResultingFeatureForOtherUsers === true,
    });
    const eligibility = this.eligibility(submissionIds, purpose);
    if (!eligibility.eligible) {
      const error = new Error(`future feature test use denied: ${eligibility.reason}`);
      error.code = 'FUTURE_FEATURE_TESTING_CONSENT_REQUIRED';
      error.eligibility = eligibility;
      throw error;
    }
    const sequence = this.#next();
    const record = Object.freeze({
      id: deterministicId('future-test-use', { submissionIds, purpose, sequence }, sequence),
      sequence,
      submissionIds: Object.freeze(submissionIds),
      purpose,
      testContext: copy(input.testContext ?? {}),
      resultRef: input.resultRef ?? null,
      status: 'recorded',
      consentRevisions: Object.freeze(Object.fromEntries(eligibility.submissions.map((entry) => [entry.submissionId, entry.consentRevision]))),
    });
    this.testUseLedger.push(record);
    this.#emit('future-test-use', record);
    return record;
  }

  snapshot() {
    return Object.freeze({
      schema: 'synthia.future-feature-testing.v1',
      sequence: this.sequence,
      defaultPrivate: true,
      consentIsPerSubmission: true,
      historicalUseRecordsAreAppendOnly: true,
      revocationBlocksFutureUse: true,
      submissions: Object.freeze([...this.submissions.values()].map(copy)),
      consentEvents: Object.freeze(this.consentEvents.map(copy)),
      testUseLedger: Object.freeze(this.testUseLedger.map(copy)),
    });
  }

  restore(snapshot = {}) {
    if (!snapshot || snapshot.schema !== 'synthia.future-feature-testing.v1') {
      throw new TypeError('unsupported future feature testing snapshot');
    }
    this.submissions.clear();
    for (const record of snapshot.submissions ?? []) {
      this.submissions.set(record.submissionId, Object.freeze({ ...copy(record), consent: cleanConsent(record.consent) }));
    }
    this.consentEvents = (snapshot.consentEvents ?? []).map((entry) => Object.freeze(copy(entry)));
    this.testUseLedger = (snapshot.testUseLedger ?? []).map((entry) => Object.freeze(copy(entry)));
    this.sequence = Number.isInteger(snapshot.sequence) ? snapshot.sequence : 0;
    return this.snapshot();
  }
}

export default FutureFeatureTestingRegistry;
