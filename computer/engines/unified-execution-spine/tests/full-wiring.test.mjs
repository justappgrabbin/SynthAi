import test from 'node:test';
import assert from 'node:assert/strict';
import { SynthiaSystem } from '../src/synthia-system.mjs';

const fullAddress = {
  planetary: 1,
  dimension: 'Movement',
  gate: 1,
  line: 1,
  color: 1,
  tone: 1,
  base: 1,
  degree: { gateSpanDegree: 0 },
  minute: 0,
  second: 0,
  arcAxis: { arcUnit: 1, axis: 'Vertical' },
  zodiac: 1,
  house: 1,
};

test('whole organism is live, not merely present', () => {
  const synthia = new SynthiaSystem();
  const audit = synthia.wiringAudit();
  assert.equal(audit.ok, true);
  assert.equal(audit.chat, true);
  assert.equal(audit.canonicalTools, 16);
  assert.ok(audit.mountedAutomata >= 17); // 16 canonical + boot-grown media-field
  assert.ok(audit.transportConnections >= 16);
  assert.equal(audit.learning, true);
  assert.equal(audit.growth, true);
  assert.equal(audit.reversibleRewrite, true);
  assert.equal(audit.executionBridge, true);
  assert.equal(audit.meshSharing, true);
});

test('chat traverses learning/contact and shares with every mounted automaton', async () => {
  const synthia = new SynthiaSystem();
  const before = synthia.mesh.automata.size;
  const result = await synthia.chat('chat with me about an unfamiliar frobnicator capability');
  assert.equal(result.ok, true);
  assert.ok(result.learned);
  assert.equal(result.contact.mode, 'deep-klein-contact-loop');
  assert.equal(result.shared.deliveries.length, synthia.mesh.automata.size);
  assert.ok(synthia.mesh.automata.size >= before);
});

test('execution carries full canonical address and shares first-run outcome', async () => {
  const synthia = new SynthiaSystem();
  const result = await synthia.executeArtifact({ name: 'hello.js', type: 'javascript', content: 'globalThis.__x = 2 + 2;' }, { canonicalAddress: fullAddress });
  assert.equal(result.ok, true);
  assert.deepEqual(result.canonicalAddress, fullAddress);
  assert.ok(result.shared.deliveries.length >= 17);
});

test('unknown foreign execution failure is observed by learning/grow path, not terminal', async () => {
  const synthia = new SynthiaSystem();
  const result = await synthia.executeArtifact({ name: 'x.rb', type: 'ruby', content: 'puts 1' }, { canonicalAddress: fullAddress });
  assert.equal(result.ok, false);
  assert.ok(result.learning);
  assert.ok(['grown','routed','learned-recall','emergent-channel','known-call'].includes(result.learning.mode));
});

test('agent rewrite is versioned through SelfEditor and shared across mesh', () => {
  const synthia = new SynthiaSystem();
  const out = synthia.rewriteAgent('conversation', { pattern: { when: 'test' }, transform: { action: 'retain-context' }, evidence: ['test-evidence'] });
  assert.equal(out.ok, true);
  assert.ok(out.ruleId.startsWith('rule:evolved:'));
  assert.ok(synthia.editor.summary().rulesAdded >= 1);
});
