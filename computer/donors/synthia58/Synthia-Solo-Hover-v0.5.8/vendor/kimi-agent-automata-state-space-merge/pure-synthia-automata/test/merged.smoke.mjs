// Smoke test for src/merged/ — run with node from project root.
import {
  selfTest, completeAnalogy, solveAnalogy, hammingStr,
  KING_WEN_TO_FUXI_DECIMAL, gateToFuXiDecimal, fuXiDecimalToGate, hexagramName,
  encodeIndex, decodePattern, flipLine, getInverse, getOpposite, getNeighbors, hammingDistance,
  DimensionRouter,
  ToolFactory, TOOL_LEVELS, stableId,
  SceneGrammar, SceneGrammarRule,
  GateLocus, GateProcessField,
  CANONICAL_CHANNELS, CENTERS, channelsForGate, centerForGate,
  LawfulGrammarConstructor,
  AnticipatoryMemory, publicAddress,
  MediaField, VideoTimeline, CodeWeaver, frameHash, popcount6,
  encodeBMP, encodeGIF, ArtifactWriter, fnv1a32Bytes,
} from '../src/merged/index.js';

let pass = 0; let fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log(`ok   ${name}`); } else { fail++; console.log(`FAIL ${name}`); } };

// 1. ato-analogy selfTest (Klein Table 4)
check('ato-analogy selfTest() === true', selfTest() === true);
check('solveAnalogy Klein = 10011001 (man loves dark)',
  solveAnalogy('10101010', '01100110', '01010101') === '10011001');

// 2. kingwen round-trip for all 64
let roundTrip = true;
const seen = new Set();
for (let g = 1; g <= 64; g++) {
  const d = gateToFuXiDecimal(g);
  if (seen.has(d) || fuXiDecimalToGate(d) !== g) roundTrip = false;
  seen.add(d);
}
check('kingwen round-trip all 64 (bijective)', roundTrip && seen.size === 64);
check('kingwen table has 64 entries, gate1=63, gate2=0, gate3=17',
  Object.keys(KING_WEN_TO_FUXI_DECIMAL).length === 64
  && gateToFuXiDecimal(1) === 63 && gateToFuXiDecimal(2) === 0 && gateToFuXiDecimal(3) === 17);
check('hexagram names: 1=The Creative, 2=The Receptive, 3=Difficulty at the Beginning',
  hexagramName(1) === 'The Creative' && hexagramName(2) === 'The Receptive' && hexagramName(3) === 'Difficulty at the Beginning');

// 3. fuxi-encoder involutions
let involutions = true;
for (let i = 0; i < 64; i++) {
  const p = encodeIndex(i);
  if (decodePattern(p) !== i) involutions = false;
  if (getInverse(getInverse(p)) !== p) involutions = false;
  if (getOpposite(getOpposite(p)) !== p) involutions = false;
  for (let l = 0; l < 6; l++) if (flipLine(flipLine(p, l), l) !== p) involutions = false;
  if (getNeighbors(p).length !== 6) involutions = false;
  if (hammingDistance(p, getOpposite(p)) !== 6) involutions = false;
}
check('fuxi-encoder encode/decode + flip/inverse/opposite involutions, 6 neighbors each', involutions);

// 4. tool-factory determinism
const factory = new ToolFactory();
const req = { purpose: 'classify the tone of this touch signal', input: '0.7' };
const r1 = factory.generate(req);
const r2 = factory.generate(req);
check('tool-factory deterministic: same request twice -> same id', r1.tool.id === r2.tool.id);
check('tool id is hex stableId form', /^tool-[0-9a-f]{16}$/.test(r1.tool.id));
check('tool address shape {gate,line,color,tone,base} + addressKey + levelName',
  r1.tool.address.gate >= 1 && r1.tool.address.gate <= 64
  && r1.tool.address.line === (r1.tool.level % 6) + 1
  && r1.tool.levelName === TOOL_LEVELS[r1.tool.level].name
  && typeof r1.tool.addressKey === 'string');
const t1out = await r1.tool.execute(0.7);
check('L1 yin/yang runtime works', t1out.isYang === true && t1out.isYin === false);
// address rule check
const f3 = new ToolFactory();
const r3 = f3.generate({ purpose: 'x', input: 'x', dimension: 'Design', level: 5, gate: 14 });
check('address rule: targetGate=((14+5*7-1)%64)+1=49, line=6, color=tone=6, base=((6-1)%5)+1=1',
  r3.tool.targetGate === 49 && r3.tool.address.line === 6 && r3.tool.address.color === 6
  && r3.tool.address.tone === 6 && r3.tool.address.base === 1);
check('explicit level wins (5=Hexagram)', r3.tool.level === 5 && r3.tool.levelName === 'Hexagram');
// operation fallback: Design structure -> 5; Movement transition -> 3
const rMov = new ToolFactory().generate({ purpose: 'zzq', input: 'zzq', dimension: 'Movement' });
check('dimension-operation fallback transition->3', rMov.tool.level === 3);
// L6 packet + L7 determinism
const r6 = new ToolFactory().generate({ purpose: 'p', input: 'i', dimension: 'Space', level: 6 });
const pkt = await r6.tool.execute('hello');
check('L6 event packet {sequence,from,to,signal,address}',
  pkt.sequence === 1 && pkt.signal === 'hello' && typeof pkt.from === 'number' && pkt.to === r6.tool.targetGate);
const m1 = new ToolFactory().generate({ purpose: 'p', input: 'i', dimension: 'Being', level: 7 });
const m2 = new ToolFactory().generate({ purpose: 'p', input: 'i', dimension: 'Being', level: 7 });
const w1 = (await m1.tool.execute('the cat sat on the mat the cat ran')).output;
const w2 = (await m2.tool.execute('the cat sat on the mat the cat ran')).output;
check('L7 Markov seeded: two fresh factories same walk, <=16 tokens', w1 === w2 && w1.split(' ').length <= 16);

// 5. dimension-router resolves a sample sentence
const router = new DimensionRouter();
const route = router.route('Where does the path begin and where does the journey start?');
check('dimension-router resolves Movement sentence', route.status === 'resolved' && route.dimension === 'Movement'
  && route.interrogative === 'Where' && route.operation === 'transition' && route.seedGate === 1
  && Array.isArray(route.tokens) && route.score > 0);
check('dimension-router unresolved on empty match', router.route('zxqv qwfp').status === 'unresolved');
const being = router.route('when am I present now, when do I exist?');
check('dimension-router Being=When mapping', being.status === 'resolved' && being.dimension === 'Being' && being.interrogative === 'When');

// 6. scene-grammar reinforce clamps
const grammar = new SceneGrammar();
grammar.addRule({ id: 'a', type: 'spawn', weight: 1, condition: { minEntities: 0 } });
grammar.addRule({ id: 'b', type: 'remove', weight: 0.5, condition: { minEntities: 6 } });
const sel = grammar.select({ tick: 1, entityCount: 2, tension: 0.2 });
check('scene-grammar select picks matching rule a', sel && sel.id === 'a');
for (let i = 0; i < 200; i++) grammar.reinforce('a', 1);
const wHigh = grammar.rules.get('a').weight;
for (let i = 0; i < 500; i++) grammar.reinforce('a', 0);
const wLow = grammar.rules.get('a').weight;
check('scene-grammar reinforce clamps weight to [0.05, 8]', wHigh <= 8 && wLow >= 0.05 && wLow === 0.05);
check('scene-grammar tickModulo condition', (() => {
  const g2 = new SceneGrammar();
  g2.addRule({ id: 'cut', type: 'cut', weight: 1, condition: { tickModulo: 48 } });
  return g2.select({ tick: 47, entityCount: 0 }) === null && g2.select({ tick: 48, entityCount: 0 })?.id === 'cut';
})());

// 7. gate-field
const locus = new GateLocus(1);
const other = new GateLocus(2);
const rel = locus.meet(other);
check('GateLocus.meet -> {pair, overlap, tension} hamming-derived (1 vs 2: complement)',
  rel.pair === 'G1:G2' && rel.overlap === 0 && rel.tension === 1 && rel.hamming === 6);
const field = new GateProcessField();
const view = field.tick({ activeGate: 6, resonance: 0.5 });
check('GateProcessField tick -> voices for 5 dimensions, 64 loci',
  field.loci.length === 64 && Object.keys(view.voices).length === 5);
check('meetAll -> 2016 pairwise relations', field.meetAll().length === 2016);
const l6 = field.locus(6);
check('addressed gate observes + history ring capped at 24', l6.observations === 1
  && (() => { for (let i = 0; i < 40; i++) field.tick({}); return field.locus(6).history.length === 24; })());

// 8. centers-channels
check('CANONICAL_CHANNELS has 36 pairs', CANONICAL_CHANNELS.length === 36);
check('Sacral=[5,14,29,34,59], 57 in Spleen only',
  CENTERS.Sacral.join(',') === '5,14,29,34,59' && centerForGate(57) === 'Spleen'
  && CENTERS.Spleen.includes(57));
check('9 centers', Object.keys(CENTERS).length === 9);
check('channelsForGate(10) = [10,20],[10,34],[10,57]',
  channelsForGate(10).map(p => p.join('-')).join(',') === '10-20,10-34,10-57');

// 9. lawful-grammar
const lgc = new LawfulGrammarConstructor();
const spec = lgc.automatonSpec({ observer: 'self', choice: 'question', transition: 'evidence-gated', memory: 'episodic', expression: 'action' });
check('lawful-grammar spec has 4 invariants + bnf',
  spec.invariants.join(',') === 'preserve-local-identity,no-claim-without-evidence,reversible-before-adoption,no-global-boss'
  && spec.bnf === '<automaton> → <observer> <choice> <transition> <memory> <expression>');
check('lawful-grammar validate ok, rejects illegal part', lgc.validate(spec).ok
  && (() => { try { lgc.automatonSpec({ observer: 'god', choice: 'act', transition: 'time-gated', memory: 'state', expression: 'silent' }); return false; } catch { return true; } })());

// 10. mesh-memory
const mem = new AnticipatoryMemory();
const full = { gate: 42, line: 3, color: 2, tone: 5, base: 1, degree: 100, minute: 20, second: 3, arcSecond: 5, zodiac: 7, house: 4 };
const pub = publicAddress(full);
check('publicAddress strips private coords', JSON.stringify(pub) === JSON.stringify({ gate: 42, line: 3, color: 2, tone: 5, base: 1 }));
mem.observe(full, { note: 'worked', confidence: 0.8, rawText: 'PRIVATE', userId: 'u1' });
const recalled = mem.recall({ gate: 42, line: 3, color: 2, tone: 5, base: 1 });
check('recall returns sanitized precedents (no rawText/userId/private coords)',
  recalled.length === 1 && recalled[0].data.note === 'worked' && !('rawText' in recalled[0].data)
  && !('userId' in recalled[0].data) && !('zodiac' in recalled[0].address));
const contributed = mem.contribute(full, { outcome: 'SUCCESS' });
check('contribute -> sanitized public form', contributed.address.gate === 42 && !('house' in contributed.address));

// 11. media-field (pure-JS media core)
const mfA = new MediaField();
const mfB = new MediaField();
const morphA = mfA.morphFrames(24, 41, 4);
const morphB = mfB.morphFrames(24, 41, 4);
check('media-field: morphFrames(24,41,4) -> 4 frames of 64*64*4 bytes, byte-identical across instances',
  morphA.length === 4 && morphA.every((f, i) => f.length === 64 * 64 * 4 && frameHash(f) === frameHash(morphB[i])));
check('media-field: changing lines = popcount(xor) = 2 (lines 2,6) for gates 24->41',
  mfA.lastMorph.changingLineCount === 2 && mfA.lastMorph.changingLines.join(',') === '2,6'
  && popcount6(mfA.lastMorph.changingMask) === 2);
check('media-field: injectFuXi/tick/frameRGBA deterministic + timeline exportFrames delays',
  (() => {
    const f1 = new MediaField(); const f2 = new MediaField();
    f1.injectFuXi(1, 0.8); f1.tick(1); f2.injectFuXi(1, 0.8); f2.tick(1);
    const same = frameHash(f1.frameRGBA()) === frameHash(f2.frameRGBA());
    const tl = new VideoTimeline();
    tl.addFrame(f1.frameRGBA(), 3);
    const ex = tl.exportFrames();
    return same && ex.length === 1 && ex[0].delay === 120 && ex[0].width === 64;
  })());
const cw = new CodeWeaver();
const src = 'import { q } from "./q.js";\nexport function doubleIt(n) { return n * 2; }';
check('codeWeaver.analyze -> functions/imports/exports/signature',
  cw.analyze(src).functions.includes('doubleIt') && cw.analyze(src).imports.includes('./q.js')
  && cw.analyze(src).exports.some((e) => e.includes('doubleIt'))
  && /^[0-9a-f]{8}$/.test(cw.analyze(src).signature));
check('codeWeaver.weave -> deterministic module string containing export; diffSummary flags change',
  cw.weave({ name: 'resonance counter', gates: [24, 41], purpose: 'p' }).includes('export')
  && cw.weave({ name: 'resonance counter', gates: [24, 41], purpose: 'p' })
    === cw.weave({ name: 'resonance counter', gates: [24, 41], purpose: 'p' })
  && cw.diffSummary(src, src + '\n// tail').identical === false);

// 12. artifacts (real file bytes: BMP + GIF89a + code)
const bmpSmoke = encodeBMP(2, 2, new Uint8ClampedArray([
  255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
]));
check('artifacts: BMP magic + size + offset 54 + bottom-up BGR first pixel',
  bmpSmoke[0] === 0x42 && bmpSmoke[1] === 0x4d && bmpSmoke.length === 54 + 2 * 8
  && bmpSmoke[10] === 54 && bmpSmoke[54] === 255 && bmpSmoke[55] === 0 && bmpSmoke[56] === 0);
const gifSmokeFrame = morphA[0].slice(0, 8 * 8 * 4); // top-left 8 rows of a morph frame
const gifSmoke = encodeGIF(8, 8, [{ rgba: gifSmokeFrame, delayCs: 8 }], { loop: true });
const gifSmoke2 = encodeGIF(8, 8, [{ rgba: gifSmokeFrame, delayCs: 8 }], { loop: true });
check('artifacts: GIF89a header + trailer + byte-deterministic',
  String.fromCharCode(...gifSmoke.slice(0, 6)) === 'GIF89a' && gifSmoke[gifSmoke.length - 1] === 0x3b
  && gifSmoke.length === gifSmoke2.length && gifSmoke.every((v, i) => v === gifSmoke2[i]));
const smokeWriter = new ArtifactWriter();
const cwArt = cw.weaveArtifact({ name: 'resonance counter', gates: [24, 41], purpose: 'p' }, smokeWriter).artifact;
check('artifacts: weaveArtifact -> {kind code, <name>.js, text/javascript, fnv hash} + writer list',
  cwArt.kind === 'code' && cwArt.fileName === 'resonanceCounter.js' && cwArt.mime === 'text/javascript'
  && cwArt.text.includes('export') && cwArt.hash === fnv1a32Bytes(cwArt.bytes)
  && smokeWriter.list().length === 1 && smokeWriter.list()[0].id === 'art-1');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
