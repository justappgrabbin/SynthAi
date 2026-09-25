import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

test('RESEARCH REPORT CARTRIDGE: native runtime auto-mounts and executes all seven Automata through the magazine', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'research-report-cartridge-integration',
    clock: (() => {
      let value = 1000;
      return () => ++value;
    })(),
  }).boot();

  const mounted = runtime.automataCartridges.list()
    .find(item => item.id === 'research-report-automaton-v0.1.0');
  assert.equal(mounted.status, 'active');
  assert.equal(mounted.automata.length, 7);

  const result = await runtime.createResearchReport({
    title: 'Magazine integration',
    query: 'Can the native magazine execute the bounded report pipeline?',
    sources: [{
      id: 'integration-source',
      title: 'Integration fixture',
      content: 'The native magazine executed the ResearchReportAutomaton fixture.',
    }],
    claims: [{
      id: 'integration-claim',
      text: 'The bounded report pipeline executed through the magazine.',
      sourceIds: ['integration-source'],
    }],
  });

  assert.equal(result.ok, true);
  assert.equal(result.assembly.plan[0].id, 'research-report-automaton-v0.1.0');
  assert.equal(result.output.trace.length, 7);
  assert.equal(result.output.verification.passed, true);
  assert.match(result.output.publication.content, /bounded report pipeline executed through the magazine/i);
  assert.equal(result.output.publication.acceptance, 'statically-verified-not-user-accepted');
});

