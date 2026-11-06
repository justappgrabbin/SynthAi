/**
 * Kimi donor event bridge for the EXISTING Synthia Computer.
 *
 * A source report is not proof of a world mutation, generated video, or a
 * verified semantic claim. This bridge NEVER dispatches side effects.
 * An executable app must separately mount through the Computer application
 * pipeline and send receipts here after its own operation completes.
 */
const FORMATS = Object.freeze({
  'spacetime-workbench': ['interpretation', 'feedback'],
  'adaptive-swarm-3d': ['contact', 'relation', 'dispatch'],
  'remorph-video': ['story-choice', 'scene-transition', 'render-receipt'],
});
const KEY = 'computer.donorIntegration.events';
const MAX_PAYLOAD_BYTES = 12000;
const MAX_RECORDS = 256;

function safePayload(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Donor payload must be a JSON object.');
  const json = JSON.stringify(value);
  if (!json || json.length > MAX_PAYLOAD_BYTES)
    throw new RangeError('Donor event exceeds the bounded JSON limit.');
  return JSON.parse(json);
}
function validate(record) {
  if (!record || typeof record !== 'object') throw new TypeError('Donor event required.');
  const { donor, kind, eventId } = record;
  if (!Object.hasOwn(FORMATS, donor)) throw new TypeError('Unrecognized donor: ' + donor);
  if (!FORMATS[donor].includes(kind)) throw new TypeError('Unsupported donor event: ' + kind);
  if (typeof eventId !== 'string' || !/^[a-zA-Z0-9_.:-]{1,96}$/.test(eventId))
    throw new TypeError('Stable, bounded source eventId required.');
  const payload = safePayload(record.payload);
  if (kind === 'relation' || kind === 'contact') {
    if (typeof payload.from !== 'string' || typeof payload.to !== 'string')
      throw new TypeError('World relation/contact needs from and to.');
  }
  if (kind === 'dispatch' && !['executed', 'blocked', 'failed'].includes(payload.status))
    throw new TypeError('Dispatch must report an explicit executed/blocked/failed status.');
  if (kind === 'story-choice' && (!payload.scene || !payload.choice))
    throw new TypeError('Story choice needs a scene and choice.');
  if (kind === 'interpretation' && typeof payload.text !== 'string')
    throw new TypeError('Interpretation needs text.');
  return { donor, kind, eventId, payload };
}
function descriptiveObservation(event) {
  const { donor, kind, payload } = event;
  if (donor === 'spacetime-workbench')
    return 'A language workbench reported a ' + kind + ': ' + String(payload.text ?? payload.feedback ?? '').slice(0, 500);
  if (donor === 'adaptive-swarm-3d')
    return 'The 3D swarm reported ' + kind + ' from ' + String(payload.from ?? 'unspecified') +
      ' to ' + String(payload.to ?? 'unspecified') + ' with status ' + String(payload.status ?? 'unverified');
  return 'The interactive film reported ' + kind + ' in scene ' + String(payload.scene ?? 'unspecified') +
    ' with choice ' + String(payload.choice ?? 'unspecified');
}

export class DonorEventIntegration {
  constructor(computer) {
    if (!computer?.state || !computer?.synthia || !computer?.emitEvent)
      throw new TypeError('Existing Computer state, resident, and event emitter required.');
    this.computer = computer;
  }
  events({ donor = null, limit = 50 } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RECORDS)
      throw new RangeError('Invalid event history limit.');
    const entries = this.computer.state.get(KEY, []);
    return entries.filter(item => !donor || item.donor === donor).slice(-limit);
  }
  status() {
    const entries = this.computer.state.get(KEY, []);
    return {
      kind: 'donor-observation-bridge',
      executesDonorApps: false,
      upgradesClaimsToFacts: false,
      sourceFormats: Object.keys(FORMATS),
      observedReports: entries.length,
      byDonor: Object.fromEntries(Object.keys(FORMATS).map(id =>
        [id, entries.filter(item => item.donor === id).length])),
    };
  }
  async receive(record) {
    const input = validate(record);
    const prior = this.computer.state.get(KEY, []);
    const existing = prior.find(item => item.donor === input.donor && item.eventId === input.eventId);
    if (existing) return { ...existing, duplicate: true };

    // Never interpret a claimed "executed" status as host verification.
    // The source's own receipt is retained verbatim, with provider-report trust.
    const reading = await this.computer.synthia.observe(descriptiveObservation(input), {
      actor: 'donor:' + input.donor,
      context: { scope: 'source-reported', kind: input.kind, eventId: input.eventId },
    });
    const event = await this.computer.emitEvent({
      actor_id: 'donor:' + input.donor, actor_type: 'application',
      target_id: 'synthia-resident', event_type: 'observation',
      provider: 'kimi:' + input.donor, input: { kind: input.kind, payload: input.payload },
      context: { sourceEventId: input.eventId, residentReadingId: reading.id },
      result: { persistedAs: 'reported-evidence', effectsExecuted: false },
      result_status: 'unknown', observable_effect: 'Donor report received and linked to Synthia',
      evidence: { trust: 'donor-self-report', independentlyVerified: false },
    });
    const receipt = Object.freeze({
      donor: input.donor, kind: input.kind, eventId: input.eventId,
      payload: input.payload, computerEventId: event.event_id, residentReadingId: reading.id,
      evidenceStatus: 'unverified-provider-report',
      at: event.timestamp,
    });
    await this.computer.state.set(KEY, [...prior, receipt].slice(-MAX_RECORDS),
      { source: 'kimi-donor-event-integration' });
    return receipt;
  }
}

export const donorEventFormats = FORMATS;
export default DonorEventIntegration;
