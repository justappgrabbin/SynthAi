import test from 'node:test';
import assert from 'node:assert/strict';

import { bootstrapCurrentSynthiaSwarm } from '../src/synthia/swarm/bootstrap.mjs';
import morphChat from '../src/synthia/morph-chat/runtime.mjs';
import nativeGrammar from '../src/synthia/native-grammar/runtime.mjs';
import { bindYNIToSwarm } from '../host/yniSwarmHands.mjs';
import { bindSelfhostedToSwarm } from '../host/selfhostedSwarmHand.mjs';

function tool(engine, id) {
  return engine.mesh.get?.(id) || engine.mesh.automata?.get?.(id) || null;
}

function fragment(filename, content, type = 'react-typescript') {
  return {
    id: `frag-${filename.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
    filename,
    type,
    content,
    glyph: '◈',
    metadata: { quality: 'tested', tags: [], origin: 'wiring-test' },
    added: new Date().toISOString(),
  };
}

test('FULL WIRING: canonical tools, state-space, chat, DEG/Geo-DEG, Morph, Foundry, browser and Linux hands touch end-to-end', async () => {
  const { swarm, synthia, capabilityBridge } = await bootstrapCurrentSynthiaSwarm();

  // 0. One process identity per actual worker. Semantic views/proxies are not
  // duplicated as #2 swarm processes.
  assert.equal([...swarm.workers.keys()].some((id) => /#\d+$/.test(id)), false);
  assert.equal(swarm.snapshot().groups.foundry, 4);

  // 1. The rich semantic AUTOLING / DISEMINER own the public ids. Lightweight
  // ATO-Klein fallbacks are explicit alternate hands and cannot shadow them.
  assert.equal(synthia.meshRuntime.privateBindings.has('autoling'), false);
  assert.equal(synthia.meshRuntime.privateBindings.has('diseminer'), false);
  assert.equal(synthia.meshRuntime.privateBindings.has('ato-klein:autoling'), true);
  assert.equal(synthia.meshRuntime.privateBindings.has('ato-klein:diseminer'), true);

  const semanticAutoLing = tool(synthia.meshRuntime.engine, 'autoling');
  const semanticDiseminer = tool(synthia.meshRuntime.engine, 'diseminer');
  assert.ok(semanticAutoLing && semanticDiseminer);
  const beforeAuto = semanticAutoLing.calls;
  const beforeDise = semanticDiseminer.calls;

  // 2. Main Synthia -> canonical address/state-space -> shared Morph Chat ->
  // canonical AUTOLING + DISEMINER -> canonical conversation weave.
  const talked = await synthia.talk('the dogs bark and the cats sleep');
  assert.ok(semanticAutoLing.calls > beforeAuto, 'talk must touch canonical AUTOLING');
  assert.ok(semanticDiseminer.calls > beforeDise, 'talk must touch canonical DISEMINER');
  assert.equal(talked.conversation.semantic.focus, 'dogs');
  assert.ok(talked.conversation.linguistic?.pipeline, 'AUTOLING pipeline must reach chat material');
  assert.ok(talked.conversation.concepts?.sense, 'DISEMINER state must reach chat material');
  assert.match(talked.conversation.woven?.utterance || '', /AUTOLING-rules:/);
  assert.match(talked.conversation.woven?.utterance || '', /DISEMINER-familiarity:/);
  assert.equal(talked.conversation.sharedContext?.addressText, talked.runtime.addressText);
  assert.ok(talked.runtime.address, 'main state-space address must exist');
  assert.ok(talked.runtime.result?.recognition?.addressKey, 'orchestrator must consume addressed recognition');

  // 3. Explicit semantic packet chain proves the tools affect one another,
  // rather than merely being called side-by-side.
  const chain = synthia.meshRuntime.engine.call(
    'autoling "the dogs bark" then diseminer "the dogs bark" then conversation "summarize"',
  );
  assert.deepEqual(chain.primitives, ['autoling', 'diseminer', 'conversation']);
  assert.equal(chain.ledger.operationsExecuted, 3);
  assert.ok(chain.ledger.edgesTraversed >= 3);
  assert.match(chain.output?.utterance || '', /\[weave:diseminer\]/);

  // 4. Morph Chat -> DEG learn -> persisted grammar -> Geo-DEG geometry on the
  // following turn. The second operation depends on state created by the first.
  const learned = await morphChat.send(
    'learn grammar examples: cobalt river opens; cobalt river bends',
  );
  const learnStep = learned.meshTools.results.find((x) => x.capability === 'grammar.learn');
  assert.equal(learnStep?.status, 'complete');
  assert.ok(learnStep.output?.ruleCount >= 2);

  const geometry = await morphChat.send('build geometry from the learned grammar');
  const geoStep = geometry.meshTools.results.find((x) => x.capability === 'geometry.build');
  assert.equal(geoStep?.status, 'complete');
  assert.ok(geoStep.output?.nodeCount >= 2);
  assert.ok(geoStep.output?.edgeCount >= 1);

  // 5. Native Grammar's optional language boundary must call the same canonical
  // AUTOLING, not a detached duplicate.
  const nativeBefore = semanticAutoLing.calls;
  const translated = await nativeGrammar.translate('the river remembers the gate', { useAutoLing: true });
  assert.equal(translated.linguistic.status, 'resolved');
  assert.ok(translated.linguistic.analysis?.pipeline);
  assert.ok(semanticAutoLing.calls > nativeBefore);

  // 6. Synthia's inner capability broker can see canonical semantic tools,
  // Native Grammar, Morph and the actual uploaded Foundry donor hands.
  assert.deepEqual(synthia.orchestrator.broker.discover('pipeline').map((x) => x.id), ['swarm:autoling']);
  assert.deepEqual(synthia.orchestrator.broker.discover('extract-claims').map((x) => x.id), ['swarm:diseminer']);
  assert.deepEqual(synthia.orchestrator.broker.discover('native.understand').map((x) => x.id), ['swarm:synthia-native-grammar']);
  assert.deepEqual(synthia.orchestrator.broker.discover('project.analyze').map((x) => x.id), ['swarm:synthia-morph-change']);
  assert.deepEqual(synthia.orchestrator.broker.discover('foundry.build').map((x) => x.id), ['swarm:foundry-builder']);

  const diseViaBroker = await synthia.orchestrator.broker.invoke('extract-claims', {
    operation: 'extract', text: 'rivers shape valleys',
  });
  assert.equal(diseViaBroker.status, 'complete');
  assert.equal(diseViaBroker.automatonId, 'swarm:diseminer');
  assert.ok((diseViaBroker.output?.output?.claims || diseViaBroker.output?.claims || []).length >= 1);

  // 7. Real Foundry hand must create a structurally valid app. App.tsx alone is
  // intentionally used so the fixed missing-entry path must generate main.tsx.
  const build = await synthia.orchestrator.broker.invoke('foundry.build', {
    op: 'build',
    fragments: [fragment('App.tsx', 'export default function App(){ return <main>Hello</main>; }')],
  });
  assert.equal(build.status, 'complete');
  assert.equal(build.automatonId, 'swarm:foundry-builder');
  assert.equal(build.output?.app?.metadata?.validationStatus, 'passed');
  assert.equal(build.output?.app?.structure?.entry, 'src/main.tsx');
  assert.ok(build.output?.app?.structure?.tree?.src?.['App.tsx']);
  assert.ok(build.output?.app?.structure?.tree?.src?.['main.tsx']);

  // 8. Morph is not just registered: invoke a real AST analysis through Synthia's
  // inner broker and require parsed structure back.
  const morph = await synthia.orchestrator.broker.invoke('project.analyze', {
    op: 'analyze',
    assets: [{ name: 'x.mjs', type: 'text/javascript', kind: 'code', text: 'export const x = 1;' }],
  });
  assert.equal(morph.status, 'complete');
  assert.equal(morph.automatonId, 'swarm:synthia-morph-change');
  assert.equal(morph.output?.files?.[0]?.filename, 'x.mjs');
  assert.ok((morph.output?.files?.[0]?.bindings || []).some((b) => b.name === 'x'));

  // 9. Hands registered *after wake* must flow back into the inner broker.
  bindYNIToSwarm(swarm, {
    host: { open: (url) => ({ opened: url }) },
    permissions: { allowNetwork: true, allowExecution: true, allowFiles: true },
    document: null,
    fetchImpl: null,
  });
  assert.deepEqual(synthia.orchestrator.broker.discover('browser.open').map((x) => x.id), ['swarm:hand:yni-browser']);
  const browser = await synthia.orchestrator.broker.invoke('browser.open', {
    op: 'open', url: 'https://example.com',
  });
  assert.equal(browser.status, 'complete');
  assert.equal(browser.output?.opened, 'https://example.com/');

  bindSelfhostedToSwarm(swarm);
  assert.deepEqual(synthia.orchestrator.broker.discover('selfhosted.dashboard').map((x) => x.id), ['swarm:hand:selfhosted-linux']);
  const linux = await synthia.orchestrator.broker.invoke('selfhosted.dashboard', { op: 'dashboard' });
  assert.equal(linux.status, 'complete');
  assert.equal(linux.output?.url, 'http://127.0.0.1:3000/dashboard');

  // The bridge should now include the initially attached organs plus all late hands.
  assert.ok(capabilityBridge.snapshot().proxyCount >= 30);
});
