// Living loop tests — run with node from project root: node test/living-loop.test.mjs
// Covers src/organism/vitals.js + src/organism/living-loop.js: the endogenous
// living loop (sense -> need -> initiative -> consequence -> learn -> record).
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { SynthiaAutomata } from '../src/engine/synthia.js';
import { LivingLoop, verifyEpisodeChain, LOOP_PROVENANCE } from '../src/organism/living-loop.js';
import { Vitals, VITAL_CONFIG, VITAL_NAMES } from '../src/organism/vitals.js';
import { stableStringify } from '../src/engine/derivation.js';

const HEX8 = /^[0-9a-f]{8}$/;

/** A failing derivation record (as engine.intent.observe consumes) — gap fodder. */
const failingDerivation = (id, tool = 'iching-grammar') => ({
  id,
  operators: ['o_automaton'],
  primitives: [tool],
  output: { ok: false, reason: 'SIX_BINARY_LINES_REQUIRED' },
  evaluation: { accepted: false },
  chainResults: [{ tool, accepted: false }],
});

export async function run({ quiet } = {}) {
  let passed = 0; let failed = 0;
  const failures = [];
  const check = (name, cond) => {
    if (cond) { passed++; if (!quiet) console.log(`ok   ${name}`); }
    else { failed++; failures.push(name); console.log(`FAIL ${name}`); }
  };

  // =============== 1. ENDOGENOUS_CAP: double-run byte-identical over 200 ticks ===============
  {
    const runLife = () => {
      const engine = new SynthiaAutomata();
      const loop = new LivingLoop(engine, { seed: 7 });
      for (let t = 0; t < 200; t++) loop.tick();
      return { state: stableStringify(loop.getState()), log: stableStringify(loop.log.map((e) => ({ ...e }))), episodes: loop.log.length };
    };
    const a = runLife();
    const b = runLife();
    check('determinism: same seed + no exogenous calls + 200 ticks -> byte-identical getState()',
      a.state === b.state);
    check('determinism: byte-identical episode log (hash chain head included)',
      a.log === b.log);
    check('determinism: the loop actually LIVED (endogenous episodes were recorded)',
      a.episodes > 0);
  }

  // =============== 2. Forced tension -> endogenous initiative with NO external engine.call ===============
  {
    const engine = new SynthiaAutomata();
    const loop = new LivingLoop(engine, { seed: 11 });
    engine.intent.observe(failingDerivation('drv-ext-1'));
    engine.intent.observe(failingDerivation('drv-ext-2'));
    let episode = null;
    for (let t = 0; t < 10 && !episode; t++) {
      const r = loop.tick();
      if (r.episode) episode = r.episode;
    }
    check('initiative: recorded intent gaps raise tension and the loop ACTS on its own',
      episode !== null && episode.need.vital === 'tension');
    check('initiative: episode carries origin endogenous + a real engine derivation id',
      episode && episode.origin === 'endogenous' && /^drv-\d{4}$/.test(episode.derivationId || ''));
    const derivation = episode
      ? engine.runtime.derivations.find((d) => d.id === episode.derivationId)
      : null;
    check('initiative: the derivation landed in the engine ledger with origin/needId threaded through context',
      derivation && derivation.context && derivation.context.origin === 'endogenous'
      && derivation.context.needId === episode.needId);
    check('initiative: the proposal strategy addressed a recorded gap (evidence-linked)',
      episode && episode.action.strategy === 'proposal' && episode.action.meta
      && engine.intent.gaps.some((g) => g.id === episode.action.meta.gapId));
  }

  // =============== 3. Healthy vitals -> quiescent ticks (dormancy is valid and cheap) ===============
  {
    const engine = new SynthiaAutomata();
    const loop = new LivingLoop(engine, { seed: 2 });
    const results = [];
    for (let t = 0; t < 10; t++) results.push(loop.tick());
    check('dormancy: healthy engine -> every tick quiescent, zero episodes',
      results.every((r) => r.quiescent === true) && loop.log.length === 0);
    check('dormancy: quiescent ticks still record the cheap vital snapshot',
      loop.vitalHistory.length === 10
      && loop.vitalHistory.every((s) => s.values && VITAL_NAMES.every((n) => typeof s.values[n] === 'number')));
    check('dormancy: no endogenous derivation was minted',
      engine.runtime.derivations.every((d) => !d.context || d.context.origin !== 'endogenous'));
  }

  // =============== 4. Consequence learning: helpful strategy gains weight, unhelpful loses ===============
  {
    // 4a. curiosity: repeated known patterns -> experiment strategy relieves it -> weight gain
    const engine = new SynthiaAutomata();
    const loop = new LivingLoop(engine, { seed: 3 });
    loop.tick(); // baseline sense backfills history
    let episode = null;
    for (let round = 0; round < 15 && !episode; round++) {
      for (let k = 0; k < 5; k++) engine.call('conversation "same probe"'); // exogenous repetition
      const r = loop.tick();
      if (r.episode) episode = r.episode;
    }
    check('learning: novelty deficit (repeated patterns) fires the curiosity need',
      episode && episode.need.vital === 'curiosity' && episode.action.strategy === 'experiment');
    check('learning: a strategy that improves its vital gains policy weight (> 1.0)',
      episode && episode.consequence.score > 0
      && loop.getState().policyWeights['curiosity:experiment'] > 1.0);

    // 4b. tension: remediation probe at an always-failing tool -> weight loss
    const engine2 = new SynthiaAutomata();
    const loop2 = new LivingLoop(engine2, { seed: 11 });
    engine2.intent.observe(failingDerivation('drv-ext-1'));
    engine2.intent.observe(failingDerivation('drv-ext-2'));
    let episode2 = null;
    for (let t = 0; t < 10 && !episode2; t++) {
      const r = loop2.tick();
      if (r.episode) episode2 = r.episode;
    }
    check('learning: a strategy that fails to improve its vital loses policy weight (< 1.0)',
      episode2 && episode2.consequence.score < 0
      && loop2.getState().policyWeights['tension:proposal'] < 1.0);
  }

  // =============== 5. Episode log hash-chain verifies and replay() reproduces ===============
  {
    const engine = new SynthiaAutomata();
    const loop = new LivingLoop(engine, { seed: 13 });
    for (let t = 0; t < 120; t++) loop.tick(); // pure boot life — sociality/curiosity needs fire on their own
    check('autobiography: a pure-boot loop records episodes (it lives without any exogenous call)',
      loop.log.length > 0 && loop.log.every((e) => e.origin === 'endogenous'));
    const chain = verifyEpisodeChain(loop.log);
    check('autobiography: hash chain verifies (self-editor idiom: prevHash + hashObject)',
      chain.valid === true && chain.episodes === loop.log.length
      && loop.log.every((e) => HEX8.test(e.hash)));
    const tampered = loop.log.map((e, k) => (k === 2 ? { ...e, tick: 999 } : { ...e }));
    check('autobiography: tampering with an episode breaks the chain',
      verifyEpisodeChain(tampered).valid === false);
    const rep = loop.replay();
    check('replay: fresh engine + same seed + same tick count reproduces the log byte-for-byte',
      rep.valid === true && rep.reproduced === true && rep.logHash === rep.replayHash);
  }

  // =============== 6. No wall-clock / no Math.random (source + behavioral) ===============
  {
    const vitalsSrc = readFileSync(new URL('../src/organism/vitals.js', import.meta.url), 'utf8');
    const loopSrc = readFileSync(new URL('../src/organism/living-loop.js', import.meta.url), 'utf8');
    check('no wall-clock: neither module references Date.now / new Date / Math.random',
      !/Date\.now|new Date|Math\.random/.test(vitalsSrc) && !/Date\.now|new Date|Math\.random/.test(loopSrc));
    // Behavioral: two instances advanced in alternation (different wall-clock
    // moments per tick) stay identical.
    const engineA = new SynthiaAutomata();
    const engineB = new SynthiaAutomata();
    const loopA = new LivingLoop(engineA, { seed: 21 });
    const loopB = new LivingLoop(engineB, { seed: 21 });
    for (let t = 0; t < 60; t++) { loopA.tick(); loopB.tick(); }
    check('no wall-clock: interleaved instances at different wall-clock times are byte-identical',
      stableStringify(loopA.getState()) === stableStringify(loopB.getState())
      && stableStringify(loopA.log.map((e) => ({ ...e }))) === stableStringify(loopB.log.map((e) => ({ ...e }))));
  }

  // =============== 7. Energy accounting: actions deplete, ticks regenerate, never act broke ===============
  {
    const engine = new SynthiaAutomata();
    const loop = new LivingLoop(engine, {
      seed: 5,
      config: { vitals: { energy: { rates: { regen: 0.01 }, costs: { base: 0.4, perChainLink: 0.1 } } } },
    });
    engine.intent.observe(failingDerivation('x1'));
    engine.intent.observe(failingDerivation('x2'));
    for (let t = 0; t < 30; t++) loop.tick();
    const calls = loop.log.filter((e) => e.action.kind === 'call');
    const skips = loop.log.filter((e) => e.action.kind === 'skipped');
    check('energy: actions happened and every action was affordable at spend time',
      calls.length > 0 && calls.every((e) => e.action.energyBefore + 1e-9 >= e.action.cost));
    check('energy: actions deplete the budget by exactly the action cost',
      calls.every((e) => Math.abs((e.action.energyBefore - e.action.cost) - e.vitals.energy) < 1e-9));
    check('energy: the loop refuses to act below cost (skipped episodes, no derivation minted)',
      skips.length > 0 && skips.every((e) => e.action.reason === 'insufficient_energy' && e.derivationId === null));
    const history = loop.vitalHistory;
    const regenTicks = history.filter((s, k) => k > 0
      && Math.abs((s.values.energy - history[k - 1].values.energy) - 0.01) < 1e-9);
    check('energy: quiet ticks regenerate the budget at the configured rate',
      regenTicks.length > 0);
  }

  // =============== 8. Coexistence: endogenous + exogenous calls share one ledger ===============
  {
    const engine = new SynthiaAutomata();
    const loop = new LivingLoop(engine, { seed: 17 });
    const exo = engine.call('conversation "hello from outside"'); // exogenous, no origin
    engine.intent.observe(failingDerivation('ext-gap-1'));
    engine.intent.observe(failingDerivation('ext-gap-2'));
    for (let t = 0; t < 10; t++) loop.tick();
    const endo = engine.runtime.derivations.filter((d) => d.context && d.context.origin === 'endogenous');
    check('coexistence: endogenous initiatives and the exogenous call land in the same derivation ledger',
      endo.length > 0 && engine.runtime.derivations.includes(exo)
      && endo.every((d) => engine.runtime.derivations.includes(d)));
    check('coexistence: both paths draw from the same counter-derived drv-id sequence',
      [exo, ...endo].every((d) => /^drv-\d{4}$/.test(d.id)));
    check('coexistence: the loop observed the exogenous call (replay schedule captured)',
      loop.exogenousLog.some((e) => e.input === 'conversation "hello from outside"'));
    // Replay needs the full exogenous context: the observed call schedule PLUS
    // the direct gap injections (non-call stimulation is passed as apply-events).
    const events = [
      ...loop.exogenousLog,
      {
        tick: 1,
        apply: (e) => {
          e.intent.observe(failingDerivation('ext-gap-1'));
          e.intent.observe(failingDerivation('ext-gap-2'));
        },
      },
    ];
    const rep = loop.replay(loop.log, { exogenous: events });
    check('coexistence: replay with the observed exogenous schedule reproduces the log',
      rep.valid === true && rep.reproduced === true);
  }

  // =============== 9. Unit surface: vitals config frozen, getState frozen snapshot ===============
  {
    check('vitals: five vitals with frozen config (thresholds, hysteresis, rates)',
      VITAL_NAMES.length === 5 && Object.isFrozen(VITAL_CONFIG)
      && VITAL_NAMES.every((n) => Object.isFrozen(VITAL_CONFIG[n]) && Object.isFrozen(VITAL_CONFIG[n].rates)));
    const vitals = new Vitals();
    const engine = new SynthiaAutomata();
    const snapshot = vitals.sense(engine);
    check('vitals: every sense yields {value in [0,1], trend, lastInputs}',
      VITAL_NAMES.every((n) => snapshot[n].value >= 0 && snapshot[n].value <= 1
        && ['rising', 'falling', 'steady'].includes(snapshot[n].trend)
        && snapshot[n].lastInputs && typeof snapshot[n].lastInputs === 'object'));
    const loop = new LivingLoop(engine, { seed: 1 });
    loop.tick();
    const state = loop.getState();
    check('getState: frozen snapshot {tick, vitals, activeNeed, policyWeights, episodeCount, logHead}',
      Object.isFrozen(state) && Object.isFrozen(state.policyWeights)
      && state.tick === 1 && 'vitals' in state && 'activeNeed' in state
      && state.episodeCount === loop.log.length);
    check('provenance: all loop parameters tagged IMPLEMENTATION_CHOICE (no source claims)',
      Object.values(LOOP_PROVENANCE).every((p) => p.status === 'IMPLEMENTATION_CHOICE'));
  }

  return { passed, failed, failures };
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const { passed, failed } = await run();
  console.log(`\nliving-loop.test.mjs: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
