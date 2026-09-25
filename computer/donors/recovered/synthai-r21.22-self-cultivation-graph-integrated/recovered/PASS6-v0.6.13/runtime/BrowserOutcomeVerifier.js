const SUCCESS = Object.freeze({
  'form-workflow': /\b(application|form|submission)\b.{0,50}\b(received|submitted|complete|completed|successful|success|thank you)\b|\bthank you\b.{0,80}\b(apply|application|submission)\b/i,
  'purchase-workflow': /\b(order|purchase)\b.{0,50}\b(confirmed|complete|completed|received|successful|success)\b|\bthank you for your order\b/i,
  'booking-workflow': /\b(appointment|booking|reservation)\b.{0,50}\b(confirmed|scheduled|booked|complete|completed)\b/i
});
const FAILURE = /\b(failed|declined|error|could not|unable to|invalid|not submitted|not completed|payment failed)\b/i;
const freeze = (value) => Object.freeze(value);

export class BrowserOutcomeVerifier {
  verify({ route = {}, page = {}, dispatched = null } = {}) {
    const text = `${page?.title || ''}\n${page?.headings?.join(' ') || ''}\n${page?.text || ''}`.trim();
    const failure = text.match(FAILURE);
    if (failure) return freeze({ status: 'verified-failure', achieved: false, evidence: failure[0], task: route.task || null, dispatched: Boolean(dispatched?.ok ?? dispatched) });
    const pattern = SUCCESS[route.task];
    const success = pattern ? text.match(pattern) : null;
    if (success) return freeze({ status: 'verified-success', achieved: true, evidence: success[0], task: route.task || null, dispatched: Boolean(dispatched?.ok ?? dispatched) });
    return freeze({ status: 'submitted-unverified', achieved: false, evidence: null, task: route.task || null, dispatched: Boolean(dispatched?.ok ?? dispatched) });
  }
}

export default BrowserOutcomeVerifier;
