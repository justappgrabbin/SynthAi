import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESEARCH_REPORT_STAGES,
  ResearchReportAutomaton,
  detectSynthiaResearchBridge,
  researchReportCartridgeManifest,
} from '../runtime/research-report-automaton.mjs';

test('RESEARCH REPORT AUTOMATON: executes the seven bounded Automata in order and excludes unsupported claims', async () => {
  let now = 100;
  const automaton = new ResearchReportAutomaton({ bridge: null, clock: () => ++now });
  const result = await automaton.run({
    title: 'Fixture report',
    query: 'Does the fixture preserve evidence?',
    sources: [{
      id: 'local-a',
      title: 'Local evidence',
      content: 'The cartridge preserves source identifiers. Publication follows verification.',
    }],
    claims: [
      { id: 'supported', text: 'Source identifiers are preserved.', sourceIds: ['local-a'] },
      { id: 'unsupported', text: 'A phone accepted the report.' },
    ],
  });

  assert.deepEqual(result.trace.map(item => item.stage), RESEARCH_REPORT_STAGES.map(item => item[1]));
  assert.deepEqual(result.findings.map(item => item.id), ['supported']);
  assert.deepEqual(result.rejectedClaims.map(item => item.id), ['unsupported']);
  assert.equal(result.verification.passed, true);
  assert.match(result.publication.content, /Source identifiers are preserved\. \[source:local-a\]/);
  assert.doesNotMatch(result.publication.content.split('## Findings')[1].split('## Limitations')[0], /phone accepted/);
  assert.equal(result.publication.acceptance, 'statically-verified-not-user-accepted');
});

test('RESEARCH REPORT AUTOMATON: detects and uses the optional Synthia research bridge', async () => {
  const calls = [];
  const bridge = {
    async search(request) {
      calls.push(request);
      return [{ id: 'bridge-a', title: 'Bridge source', content: 'Bridge evidence is local to this fixture.' }];
    },
  };
  assert.equal(detectSynthiaResearchBridge({ SynthiaResearchBridge: bridge }), bridge);
  const automaton = new ResearchReportAutomaton({ bridge, clock: () => 1 });
  const result = await automaton.run({
    query: 'bridge query',
    claims: [{ text: 'Bridge evidence exists.', sourceIds: ['bridge-a'] }],
  });
  assert.equal(calls.length, 1);
  assert.equal(result.sources[0].kind, 'synthia-research-bridge');
  assert.equal(result.verification.passed, true);
});

test('RESEARCH REPORT AUTOMATON: publication refuses an unverified packet', () => {
  const automaton = new ResearchReportAutomaton({ bridge: null });
  assert.throws(() => automaton.publisher({
    schema: 'synthia.research-report-run/v1',
    request: { query: '', title: 'Unverified', sources: [], claims: [] },
    sources: [], evidence: [], findings: [], rejectedClaims: [], warnings: [], trace: [],
    plan: { title: 'Unverified' }, draft: '# Unverified', verification: { passed: false },
  }), /verification required/);
});

test('RESEARCH REPORT AUTOMATON: manifest is an ordered bounded cartridge for the PR #13 magazine', () => {
  const manifest = researchReportCartridgeManifest();
  assert.equal(manifest.capability, 'research.report');
  assert.deepEqual(manifest.automata.map(item => item.runner.operation), RESEARCH_REPORT_STAGES.map(item => item[0]));
  assert.equal(manifest.provenance.protectedPrime58Modified, false);
  assert.equal(manifest.provenance.lifeProcessSwarmRepurposed, false);
});

