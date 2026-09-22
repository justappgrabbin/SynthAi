/**
 * Computer Address Service — Stage-4a mount.
 *
 * WRAPS the Back-up- donor providers; it does not reimplement them:
 *   - canonical address schema: donors/Back-up-/vendor/execution-spine-v0.4.0/src/canonical-address.mjs
 *   - DMS wheel codec (arc-seconds <-> gate/line/color/tone/base + degree/minute/second):
 *       donors/Back-up-/vendor/kimi-agent-automata-state-space-merge/.../state-space/addressing.js
 *   - HD chart engine (birth datum -> gate/line/color/tone/base + zodiac DMS):
 *       donors/Back-up-/vendor/kimi-agent-automata-state-space-merge/.../state-space/human-design.js
 *
 * Contract surface (computer/contracts/README.md):
 *   resolveAddress(entityOrEvent) / compareAddresses(a,b) /
 *   resolveRelationship(a,b,context) / traceAddressHistory(entity)
 *
 * Canonical address grammar = EXACTLY 13 fields (event-grammar-v1.yaml):
 *   planetary, dimension, gate, line, color, tone, base,
 *   degree, minute, second, arc, zodiac, house.
 * Donor field mapping (wrap, not copy):
 *   kimi addressing.js `arcSecond`  -> contract `arc` (int arc-seconds on the wheel)
 *   kimi addressing.js `zodiac`     (1-12) -> contract `zodiac` sign name via HD sign table
 *   execution-spine arcAxis.arcUnit (1-99) is preserved untouched inside
 *   provider_metadata.spine_address_structure; it is NOT the contract `arc` field.
 * Unknown fields stay null. No fabricated resolution.
 */

import { fileURLToPath } from 'node:url';

const DONOR_ROOT = fileURLToPath(new URL('../donors/Back-up-/vendor/', import.meta.url));
const SPINE_ADDRESS = DONOR_ROOT + 'execution-spine-v0.4.0/src/canonical-address.mjs';
const KIMI_STATE_SPACE = DONOR_ROOT + 'kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/';

export const ADDRESS_FIELDS = Object.freeze([
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base',
  'degree', 'minute', 'second', 'arc', 'zodiac', 'house',
]);

export const PROVIDER_ID = 'back-up-:execution-spine-canonical-address+kimi-dms-codec';
export const HD_PROVIDER_ID = 'back-up-:kimi-human-design';

export function emptyAddress() {
  return Object.freeze(Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, null])));
}

export class AddressService {
  constructor({ bus = null } = {}) {
    this.bus = bus;
    this.providerId = PROVIDER_ID;
    this._spine = null;   // lazy donor modules
    this._dms = null;
    this._hd = null;
  }

  async _load(name, path) {
    try {
      return await import(path);
    } catch (error) {
      const failure = { provider: name, path, error: String(error?.message ?? error) };
      this.bus?.emit('service:provider-failure', failure);
      const err = new Error(`address-service donor provider unavailable: ${name} (${failure.error})`);
      err.cause = error;
      err.providerFailure = failure;
      throw err;
    }
  }

  async spine() { return (this._spine ??= await this._load('execution-spine-canonical-address', SPINE_ADDRESS)); }
  async dms() { return (this._dms ??= await this._load('kimi-addressing-dms', KIMI_STATE_SPACE + 'addressing.js')); }
  async hd() { return (this._hd ??= await this._load('kimi-human-design', KIMI_STATE_SPACE + 'human-design.js')); }

  /**
   * Resolve a canonical 13-field address from real input only.
   * Accepted inputs (first match wins, rest recorded as unknown):
   *   { birthDate: 'YYYY-MM-DD', birthTime: 'HH:MM', planet? }  -> HD chart placement (default Sun)
   *   { arcSecond | arc: int }                                  -> DMS wheel decode
   *   { address: {...} }                                        -> normalize/validate onto 13 fields
   */
  async resolveAddress(entityOrEvent = {}) {
    const input = entityOrEvent?.input ?? entityOrEvent;
    if (input == null || typeof input !== 'object') throw new TypeError('resolveAddress: object input required');

    if (input.birthDate) return this._resolveFromBirthDatum(input);
    if (Number.isFinite(input.arcSecond ?? input.arc)) return this._resolveFromArc(input.arcSecond ?? input.arc);
    if (input.address && typeof input.address === 'object') return this.normalizeAddress(input.address);

    // Nothing resolvable: return the honest unknown address.
    return {
      address: emptyAddress(),
      provider: this.providerId,
      resolved_fields: [],
      status: 'unknown',
      reason: 'no birth datum, arc coordinate, or address supplied',
    };
  }

  async _resolveFromBirthDatum({ birthDate, birthTime = '00:00', planet = 'Sun' }) {
    const hd = await this.hd();
    const chart = hd.calculateHumanDesign(birthDate, birthTime, null);
    const placement = (chart.placements ?? []).find((p) => p.planet === planet) ?? null;
    if (!placement) {
      throw new Error(`HD chart returned no placement for planet: ${planet}`);
    }
    const dms = await this.dms();
    // Cross-decode the same longitude through the DMS wheel codec for `arc`/house.
    const arcSecond = Math.round(placement.longitude * 3600);
    const wheel = dms.addressForArcSec(arcSecond);
    const address = {
      planetary: placement.planet,
      dimension: null, // dimension is not derivable from a birth datum alone
      gate: placement.gate,
      line: placement.line,
      color: placement.color,
      tone: placement.tone,
      base: placement.base,
      degree: placement.degree,
      minute: placement.minute,
      second: placement.second,
      arc: arcSecond,
      zodiac: placement.zodiac, // sign name string (HD provider convention)
      house: wheel.house,       // 1-8 trigram houses (kimi codec convention)
    };
    return {
      address,
      provider: HD_PROVIDER_ID,
      resolved_fields: ADDRESS_FIELDS.filter((f) => address[f] !== null),
      status: 'resolved',
      provider_metadata: {
        wheel_decode: wheel,
        chart_summary: {
          type: chart.type ?? null,
          profile: chart.profile ?? null,
          authority: chart.authority ?? null,
          incarnationCross: chart.incarnationCross ?? null,
        },
      },
      chart,
    };
  }

  async _resolveFromArc(arcSecond) {
    const dms = await this.dms();
    const wheel = dms.addressForArcSec(arcSecond);
    const hd = await this.hd();
    const zodiac = hd.longitudeToZodiac(arcSecond / 3600);
    const address = {
      planetary: null,
      dimension: null,
      gate: wheel.gate,
      line: wheel.line,
      color: wheel.color,
      tone: wheel.tone,
      base: wheel.base,
      degree: zodiac.degree,
      minute: zodiac.minute,
      second: zodiac.second,
      arc: wheel.arcSecond,
      zodiac: zodiac.sign,
      house: wheel.house, // 1-8 trigram houses (kimi codec convention)
    };
    return {
      address,
      provider: this.providerId,
      resolved_fields: ADDRESS_FIELDS.filter((f) => address[f] !== null),
      status: 'resolved',
      provider_metadata: { wheel_decode: wheel },
    };
  }

  /** Normalize a partial/canonical address onto exactly the 13 contract fields. */
  async normalizeAddress(partial) {
    const address = emptyAddress();
    const resolved = [];
    for (const f of ADDRESS_FIELDS) {
      if (partial[f] !== undefined && partial[f] !== null) { address[f] = partial[f]; resolved.push(f); }
    }
    if (partial.arcSecond !== undefined && address.arc === null) { address.arc = partial.arcSecond; resolved.push('arc'); }
    return { address, provider: this.providerId, resolved_fields: resolved, status: resolved.length ? 'resolved' : 'unknown' };
  }

  /** Field-by-field comparison + donor Fu Xi Hamming distance when both gates known. */
  async compareAddresses(a, b) {
    const na = (await this.normalizeAddress(a?.address ?? a)).address;
    const nb = (await this.normalizeAddress(b?.address ?? b)).address;
    const shared = [];
    const differing = [];
    for (const f of ADDRESS_FIELDS) {
      if (na[f] === null || nb[f] === null) continue; // unknown stays unknown — never compared
      (String(na[f]) === String(nb[f]) ? shared : differing).push(f);
    }
    let hammingDistance = null;
    if (Number.isInteger(na.gate) && Number.isInteger(nb.gate)) {
      const dms = await this.dms();
      hammingDistance = dms.hamming(dms.gateBits(na.gate), dms.gateBits(nb.gate));
    }
    return {
      a: na, b: nb,
      shared_fields: shared,
      differing_fields: differing,
      hamming_distance: hammingDistance,
      same_address: shared.length === ADDRESS_FIELDS.length && differing.length === 0,
      provider: this.providerId,
    };
  }

  /**
   * Honest structural relationship: only what the donor math supports.
   * relational_class stays 'unknown' unless evidence warrants more.
   */
  async resolveRelationship(a, b, context = {}) {
    const cmp = await this.compareAddresses(a, b);
    const structural = [];
    if (cmp.shared_fields.includes('gate')) structural.push('shared_gate');
    if (cmp.shared_fields.includes('line')) structural.push('shared_line');
    if (cmp.hamming_distance !== null) {
      if (cmp.hamming_distance === 0) structural.push('identical_gate_binary');
      if (cmp.hamming_distance === 6) structural.push('complementary_gates');
    }
    return {
      a: cmp.a, b: cmp.b,
      comparison: cmp,
      structural_relations: structural,
      relational_class: 'unknown', // grammar v1: do not assert co_occurrence/causal without evidence
      context: context ?? null,
      provider: this.providerId,
    };
  }

  /**
   * Append-only address history: derived from the shared event log
   * (events where entity is actor or target and an address was recorded).
   */
  async traceAddressHistory(entity, { events = null } = {}) {
    const id = typeof entity === 'string' ? entity : entity?.identity ?? entity?.id;
    if (!id) return { identity: null, history: [], status: 'unknown', reason: 'no entity identity' };
    const log = events ?? [];
    const history = log
      .filter((e) => e && (e.actor_id === id || e.target_id === id))
      .filter((e) => e.actor_address || e.target_address || e.event_address)
      .map((e) => ({
        event_id: e.event_id,
        timestamp: e.timestamp,
        role: e.actor_id === id ? 'actor' : 'target',
        address: e.actor_id === id ? (e.actor_address ?? e.event_address) : (e.target_address ?? e.event_address),
        trajectory_id: e.trajectory_id ?? null,
      }));
    return {
      identity: id,
      history,
      status: history.length ? 'resolved' : 'unknown',
      provider: 'computer:events/event-emitter',
    };
  }
}

export default AddressService;
