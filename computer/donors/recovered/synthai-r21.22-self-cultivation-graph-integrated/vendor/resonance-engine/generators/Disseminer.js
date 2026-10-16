/**
 * Disseminer — broadcast and distribution engine.
 * Sub-tool 3 of AutoLing (Trigram-level tool).
 *
 * Inspired by Klein's Disseminer — a system for broadcasting learned
 * linguistic and structural knowledge across instances of the system.
 * Each instance is unique (different origin graph) but all benefit from
 * shared learning flowing through the mesh.
 *
 * In the generative hierarchy this operates at Level 4 (Trigram) and
 * Level 6 (Channel) — it's both a structural unit AND a connector.
 *
 * Modernized capabilities beyond Klein's original:
 *   - Real-time tool distribution across instances
 *   - Grammar diff broadcasting (not full grammar dumps)
 *   - Selective subscription by language, feature vector, or hexagram
 *   - Origin tracking: every item carries its source address
 */

import { v4 as uuidv4 } from 'uuid';

// ── Dissemination item types ─────────────────────────────────────────────────
const ITEM_TYPES = {
  GRAMMAR_UPDATE: 'grammar_update',
  TOOL:           'tool',
  MORPHO_UPDATE:  'morpho_update',
  SEMNET_UPDATE:  'semnet_update',
  ADDRESS:        'address',
  PATTERN:        'pattern',
};

// ── Subscription ─────────────────────────────────────────────────────────────
class Subscription {
  constructor({ id, filter, callback }) {
    this.id = id || uuidv4();
    this.filter = filter || (() => true); // predicate on DisseminationItem
    this.callback = callback;
    this.receivedCount = 0;
  }

  matches(item) {
    try { return this.filter(item); } catch { return false; }
  }
}

// ── DisseminationItem ─────────────────────────────────────────────────────────
class DisseminationItem {
  constructor({ type, data, originAddress = null, originInstanceId = null, language = null }) {
    this.id = uuidv4();
    this.type = type;
    this.data = data;
    this.originAddress = originAddress;
    this.originInstanceId = originInstanceId;
    this.language = language;
    this.ts = Date.now();
    this.hops = 0; // how many instances this has passed through
  }
}

// ── Disseminer ────────────────────────────────────────────────────────────────
export class Disseminer {
  constructor(instanceId = null) {
    this.instanceId = instanceId || uuidv4();
    this.subscriptions = new Map();
    this.outQueue = [];        // items queued for outbound mesh
    this.inLog = [];           // items received from mesh (last N)
    this.outLog = [];          // items sent to mesh (last N)
    this.MAX_LOG = 100;
    this.level = 4;
    this.originAddress = null;

    // Learned routing table: language/type → priority
    this.routingWeights = new Map();
    Object.values(ITEM_TYPES).forEach(t => this.routingWeights.set(t, 1));

    console.log(`[Disseminer:${this.instanceId.slice(0,8)}] initialized`);
  }

  /**
   * Subscribe to incoming items matching a filter.
   */
  subscribe(filter, callback) {
    const sub = new Subscription({ filter, callback });
    this.subscriptions.set(sub.id, sub);
    return sub.id;
  }

  unsubscribe(subId) {
    this.subscriptions.delete(subId);
  }

  /**
   * Publish an item — enqueues for mesh broadcast and delivers locally.
   */
  publish(type, data, { originAddress = null, language = null } = {}) {
    const item = new DisseminationItem({
      type,
      data,
      originAddress,
      originInstanceId: this.instanceId,
      language,
    });

    this.outQueue.push(item);
    this.outLog.push(item);
    if (this.outLog.length > this.MAX_LOG) this.outLog.shift();

    // Deliver locally to matching subscriptions
    this._deliver(item);

    // Update routing weight (reinforce frequently-published types)
    const w = this.routingWeights.get(type) || 1;
    this.routingWeights.set(type, Math.min(5, w + 0.1));

    return item.id;
  }

  /**
   * Receive an item from the mesh (from another instance).
   */
  receive(item) {
    // Don't re-process items from this instance
    if (item.originInstanceId === this.instanceId) return;
    // Limit hop count to prevent loops
    if (item.hops > 5) return;

    item.hops++;
    this.inLog.push(item);
    if (this.inLog.length > this.MAX_LOG) this.inLog.shift();

    this._deliver(item);
  }

  _deliver(item) {
    this.subscriptions.forEach(sub => {
      if (sub.matches(item)) {
        sub.receivedCount++;
        try { sub.callback(item); } catch (e) {}
      }
    });
  }

  /**
   * Drain the outbound queue — called by P2P transport.
   * Returns items and clears the queue.
   */
  drainOutQueue() {
    const items = [...this.outQueue];
    this.outQueue = [];
    return items;
  }

  /**
   * Learn from dissemination patterns — which item types are most active?
   * Adjusts routing weights accordingly.
   */
  learn() {
    // Increase weight for types that appear frequently in inLog
    const typeCounts = new Map();
    this.inLog.forEach(item => {
      typeCounts.set(item.type, (typeCounts.get(item.type) || 0) + 1);
    });
    typeCounts.forEach((count, type) => {
      const w = this.routingWeights.get(type) || 1;
      this.routingWeights.set(type, Math.min(5, w + count * 0.01));
    });
    return { routingWeights: Object.fromEntries(this.routingWeights) };
  }

  /**
   * Filter subscription: only items of a specific type.
   */
  static filterByType(type) {
    return (item) => item.type === type;
  }

  /**
   * Filter subscription: only items in a specific language.
   */
  static filterByLanguage(language) {
    return (item) => item.language === language;
  }

  /**
   * Filter subscription: only items from a specific hexagram address.
   */
  static filterByGate(gate) {
    return (item) => item.originAddress && item.originAddress.includes(`G${gate}`);
  }

  getStats() {
    return {
      instanceId: this.instanceId,
      subscriptions: this.subscriptions.size,
      outQueueLength: this.outQueue.length,
      inLogLength: this.inLog.length,
      outLogLength: this.outLog.length,
      routingWeights: Object.fromEntries(this.routingWeights),
      level: this.level,
    };
  }

  toJSON() {
    return this.getStats();
  }
}

export { ITEM_TYPES };
