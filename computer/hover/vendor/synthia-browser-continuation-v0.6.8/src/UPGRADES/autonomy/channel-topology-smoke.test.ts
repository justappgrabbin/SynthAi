import assert from 'node:assert/strict';
import { ChannelRegistry, CANONICAL_CHANNEL_PAIRS, canonicalChannelId } from '../../runtime/ChannelRegistry';

const registry = new ChannelRegistry();
const ids = registry.getAllChannels().map(c => c.channelId);
assert.equal(CANONICAL_CHANNEL_PAIRS.length, 36);
assert.equal(new Set(ids).size, 36);
assert.ok(registry.findByGates(34, 57));
assert.ok(registry.findByGates(10, 57));
assert.ok(registry.findByGates(20, 34));
assert.equal(canonicalChannelId(57, 34), '34-57');
console.log(JSON.stringify({ rows: CANONICAL_CHANNEL_PAIRS.length, unique: new Set(ids).size, integration3457: true }));
