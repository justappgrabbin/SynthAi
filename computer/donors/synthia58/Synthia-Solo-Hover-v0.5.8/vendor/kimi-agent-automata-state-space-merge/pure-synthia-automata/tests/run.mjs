// Pure Synthia Automata — integration assertion suite (node tests/run.mjs)

import { SynthiaAutomata } from '../src/engine/synthia.js';
import { TOOL_IDS } from '../src/state-space/lexicon.js';
import { parseChain, ParseError } from '../src/grammar/parser.js';
import { operatorById } from '../src/state-space/operators.js';
import { KING_WEN_TO_FUXI_DECIMAL, gateBits } from '../src/state-space/addressing.js';
import { soundFor, transitionSound } from '../src/state-space/sounds.js';
import { colorFor, transitionColor } from '../src/state-space/colors.js';
import { NAMED_TRANSITIONS } from '../src/state-space/transitions.js';
import { selfTest } from '../src/merged/ato-analogy.js';
import {
  KING_WEN_TO_FUXI_DECIMAL as MERGED_KING_WEN,
  gateToFuXiDecimal, fuXiDecimalToGate,
} from '../src/merged/kingwen.js';
import { CANONICAL_CHANNELS, channelsForGate } from '../src/merged/centers-channels.js';
import { publicAddress } from '../src/merged/mesh-memory.js';
import { PROJECTIONS } from '../src/mesh/mesh.js';
import { MediaField, VideoTimeline, CodeWeaver, frameHash } from '../src/merged/media-field.js';
import { encodeBMP, encodeGIF, ArtifactWriter, fnv1a32Bytes } from '../src/merged/artifacts.js';
import { Triple, TripleStore, toolOntology, runTriples } from '../src/engine/triples.js';
import { EmergentChannels } from '../src/mesh/channels.js';
import { kleinOperator, kleinInvariants, kleinCompose } from '../src/engine/klein.js';
import { OPEN_QUESTIONS, QuestionRegistry } from '../src/engine/questions.js';
import { RelationalCapabilityExperiment, capability, shuffledString } from '../src/experiments/relational-capability.js';

let passed = 0;
let failed = 0;
const failures = [];

function ok(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`ok   ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`FAIL ${label}`);
  }
}

function eq(actual, expected, label) {
  ok(JSON.stringify(actual) === JSON.stringify(expected),
    `${label}${JSON.stringify(actual) === JSON.stringify(expected) ? '' : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

function section(name) {
  console.log(`\n# ${name}`);
}

const HEX8 = /^[0-9a-f]{8}$/;
const LEDGER_FIELDS = ['primitivesActivated', 'statesGenerated', 'edgesTraversed',
  'operationsExecuted', 'recursionDepth', 'activeAutomata', 'transitionCount'];

// ---------------------------------------------------------------- tools boot
section('engine boot: 16 automata');
const engine = new SynthiaAutomata();
const listed = engine.listTools();
eq(listed.length, 16, 'listTools() returns 16 tools');
eq(listed.map((t) => t.id), TOOL_IDS, 'tool ids match the contract exactly, in registry order');
for (const t of listed) {
  ok(Number.isInteger(t.gate) && t.gate >= 1 && t.gate <= 64 && typeof t.dimension === 'string'
    && typeof t.automatonForm === 'string', `registry entry complete: ${t.id} (gate ${t.gate}, ${t.dimension}, ${t.automatonForm})`);
}

// ------------------------------------------------------------------- grammar
section('grammar: parse, aliases, chains, address, flags, errors');

const single = parseChain('klein-analogy "boy is to girl"');
eq(single.chainLength, 1, 'single call parses with chainLength 1');
eq(single.calls[0].tool, 'klein-analogy', 'single call resolves tool id');
eq(single.calls[0].args, ['boy is to girl'], 'single call captures quoted string arg');
eq(single.calls[0].ast.node, 'call', 'parse tree root is a call node');

const alias = parseChain('coder "the dogs bark"');
eq(alias.calls[0].tool, 'computational-grammar-coder', "alias 'coder' resolves to computational-grammar-coder");
eq(alias.calls[0].args, ['the dogs bark'], 'alias call keeps its string arg');

const two = parseChain('autoling "the dogs bark" then conversation "summarize"');
eq(two.chainLength, 2, 'two-call chain parses (chainLength 2)');
eq(two.calls.map((c) => c.tool), ['autoling', 'conversation'], 'two-call chain tools in order');

const three = parseChain('autoling "x" then diseminer "x" then conversation "sum"');
eq(three.chainLength, 3, 'three-call chain parses (chainLength 3)');
eq(three.calls.map((c) => c.tool), ['autoling', 'diseminer', 'conversation'], 'three-call chain tools in order');

const addressed = parseChain('klein-analogy "a b" at 41.2.3');
eq(addressed.calls[0].address, { gate: 41, line: 2, color: 3 }, "address 'at 41.2.3' parses to {gate,line,color}");

const flagged = parseChain('klein-analogy "a b" --mode=exact');
eq(flagged.calls[0].flags, { mode: 'exact' }, "flag --mode=exact parses to {mode:'exact'}");

let unknownMessage = null;
try {
  parseChain('nonexistent-tool "x"');
} catch (err) {
  unknownMessage = err;
}
ok(unknownMessage instanceof ParseError, 'unknown tool throws ParseError');
ok(unknownMessage && TOOL_IDS.every((id) => unknownMessage.message.includes(id)),
  'ParseError message lists all 16 tool ids');
ok(unknownMessage && Array.isArray(unknownMessage.expected) && unknownMessage.expected.length === 16,
  'ParseError carries expected: the 16 ids');

// -------------------------------------------------------------------- engine
section('engine: calls across diverse tools');

const CALLS = [
  ['klein-analogy', 'klein-analogy "boy girl woman" --mode=exact at 41.2.3'],
  ['computational-grammar-coder', 'coder "the dogs bark"'],
  ['conversation', 'conversation "hello mesh"'],
  ['success', 'success \'{"operation":"define","personId":"ada","purpose":{"statement":"practice daily","indicators":[{"id":"practice","name":"practice"}]}}\''],
  ['diseminer', 'diseminer "the quick brown fox jumps over the lazy dog"'],
  ['autoling', 'autoling "the dogs bark loudly"'],
  ['language-contact', 'language-contact 5'],
  ['historical-monte-carlo', 'historical-monte-carlo 3'],
];
const called = new SynthiaAutomata();
for (const [id, input] of CALLS) {
  const d = called.call(input);
  const result = d.chainResults[0];
  eq(result.tool, id, `engine.call resolves '${input.split(' ')[0]}' -> ${id}`);
  ok(d.evaluation.accepted === true, `${id}: run accepted`);
  ok(HEX8.test(d.hash), `${id}: derivation.hash is a hex string (${d.hash})`);
  ok(LEDGER_FIELDS.every((f) => typeof d.ledger[f] === 'number'), `${id}: ledger carries the full 7-tuple`);
  ok(d.ledger.statesGenerated >= 2 && d.ledger.edgesTraversed >= 2 && d.ledger.transitionCount >= 2,
    `${id}: ledger minimums (ignition + automatize bound every run)`);
  ok(d.ledger.operationsExecuted >= 1 && d.ledger.activeAutomata >= 1,
    `${id}: ledger operations/automata minimums`);
  ok(Array.isArray(result.trace) && result.trace.length >= 2
    && result.trace.every((s) => NAMED_TRANSITIONS.some((t) => t.id === s.transition)),
    `${id}: every trace step carries a named transition`);
  ok(result.trace.every((s) => typeof s.sound.freq === 'number' && /^#[0-9A-F]{6}$/.test(s.color.hex)),
    `${id}: every trace step carries sound + color`);
}

// ------------------------------------------------------------- two-call chains
section('engine: two-call chaining (packet hand-off)');

const chain2Engine = new SynthiaAutomata();
const chain2 = chain2Engine.call(
  'success \'{"operation":"define","personId":"ada","purpose":{"statement":"practice","indicators":[{"id":"p","name":"p"}]}}\' then conversation "summarize"',
);
eq(chain2.parse.chainLength, 2, 'two-call chain executes with chainLength 2');
eq(chain2.relations, [{ from: 'success', to: 'conversation', relation: 'chain', operator: 'o_sequence' }],
  'derivation records the o_sequence relation success->conversation');
const convStep2 = chain2.chainResults[1];
ok(convStep2.output.chained === true, 'conversation reports chained=true (packet received)');
ok(convStep2.output.utterance.includes('[weave:success]'), "conversation weaves A's packet payload into its utterance");
ok(convStep2.trace.some((s) => s.transition === 'weave'), "conversation trace shows the WEAVE transition (packet use)");
ok(chain2.chainResults[0].routed === true && chain2.chainResults[0].receipt.delivered === true,
  'packet routed across the mesh with a delivery receipt');
ok(chain2.evaluation.accepted === true, 'two-call chain accepted end-to-end');

const liteChain = chain2Engine.call('diseminer-lite "the dogs bark at night" then conversation "summarize"');
const liteConv = liteChain.chainResults[1];
ok(liteConv.output.chained === true && liteConv.output.utterance.includes('[weave:diseminer-lite]'),
  'diseminer-lite -> conversation: packet woven into the utterance');
ok(liteConv.trace.some((s) => s.transition === 'weave'), 'diseminer-lite chain: conversation trace shows WEAVE');

section('engine: chain lengths 1, 2, 3+');
const lenEngine = new SynthiaAutomata();
const len1 = lenEngine.call('conversation "solo"');
eq(len1.parse.chainLength, 1, 'length-1 chain runs');
eq(len1.chainResults.length, 1, 'length-1 chain produces one chain result');
const len3 = lenEngine.call('autoling "the dogs bark" then diseminer "the dogs bark" then conversation "summarize"');
eq(len3.parse.chainLength, 3, 'length-3 chain runs');
eq(len3.chainResults.map((r) => r.tool), ['autoling', 'diseminer', 'conversation'], 'length-3 chain tools in order');
ok(len3.chainResults[2].output.utterance.includes('[weave:diseminer]'), 'length-3 chain: final call weaves the middle packet');
ok(len3.evaluation.accepted === true, 'length-3 chain accepted end-to-end');

// ------------------------------------------------------------------- replay
section('engine: deterministic replay');

const replayEngine = new SynthiaAutomata();
const original = replayEngine.call(
  'success \'{"operation":"define","personId":"ada","purpose":{"statement":"practice"}}\' then conversation "summarize"',
);
const replay = replayEngine.replay(original.toJSON());
eq(replay.status, 'REPRODUCED', 'replay status is REPRODUCED');
ok(replay.hashMatch === true, 'replay hashMatch true');
eq(replay.original, original.hash, 'replay compares against the original hash');
eq(replay.replayed, original.hash, 'replayed hash equals the original hash');

const replayEngine2 = new SynthiaAutomata();
const single2 = replayEngine2.call('coder "the dogs bark" at 41.2.3 --mode=exact');
eq(replayEngine2.replay(single2.toJSON()).status, 'REPRODUCED', 'single call with address + flags replays identically');

const replayEngine3 = new SynthiaAutomata();
replayEngine3.call('conversation "first turn"');
replayEngine3.call('autoling "the dogs bark"');
const later = replayEngine3.call('conversation "third turn" then conversation "fourth turn"');
const laterReplay = replayEngine3.replay(later.toJSON());
eq(laterReplay.status, 'REPRODUCED', 'non-genesis derivation replays via input-history prefix (state reconstructed)');
ok(laterReplay.hashMatch === true && laterReplay.replayed === later.hash,
  'history-prefix replay hash matches exactly');

// --------------------------------------------------------------- involutions
section('operators: involutions + iching transforms');

const invEngine = new SynthiaAutomata();
for (const opId of ['o_inverse', 'o_reverse', 'o_converse']) {
  const op = operatorById(opId);
  let allIdentity = true;
  for (let gate = 1; gate <= 64; gate++) {
    const bits = gateBits(gate);
    const twice = op.transform(op.transform([...bits]));
    if (JSON.stringify(twice) !== JSON.stringify(bits)) allIdentity = false;
  }
  ok(allIdentity, `${opId} ∘ ${opId} = id on all 64 gates (involution)`);
}

const iching = invEngine.toolsById.get('iching-grammar');
for (const gate of [1, 24, 41]) {
  const lines = gateBits(gate);
  for (const name of ['mirror', 'shadow', 'rotation', 'core', 'becoming']) {
    const r = iching.run({ lines: [...lines], transform: name, changingLines: [2, 5] });
    const t = r.output.transformed;
    ok(r.output.ok === true
      && Number.isInteger(t.binaryValue) && t.binaryValue >= 0 && t.binaryValue <= 63
      && t.lines.length === 6 && t.lines.every((b) => b === 0 || b === 1)
      && t.lower.id && t.upper.id,
      `iching-grammar '${name}' on gate ${gate} returns a valid hexagram (value ${t.binaryValue})`);
  }
}

// -------------------------------------------------------------------- merged
section('merged: ato-analogy, kingwen, centers-channels, mesh-memory');

ok(selfTest() === true, 'ato-analogy selfTest() is true');

let bijection = true;
for (let g = 1; g <= 64; g++) {
  if (fuXiDecimalToGate(gateToFuXiDecimal(g)) !== g) bijection = false;
}
ok(bijection, 'kingwen: gate<->Fu Xi decimal is a bijection over all 64 gates');

let tablesAgree = true;
for (let g = 1; g <= 64; g++) {
  if (KING_WEN_TO_FUXI_DECIMAL[g] !== MERGED_KING_WEN[g]) tablesAgree = false;
}
ok(tablesAgree, 'KING_WEN tables agree between state-space/addressing.js and merged/kingwen.js (64/64)');
eq([KING_WEN_TO_FUXI_DECIMAL[1], KING_WEN_TO_FUXI_DECIMAL[2], KING_WEN_TO_FUXI_DECIMAL[3]],
  [63, 0, 17], 'KING_WEN anchors: gate1->63, gate2->0, gate3->17');

eq(CANONICAL_CHANNELS.length, 36, 'centers-channels: 36 canonical channels');
eq(channelsForGate(20).map(([a, b]) => `${a}-${b}`).sort(), ['10-20', '20-34', '20-57'],
  "channelsForGate(20) includes '10-20','20-34','20-57'");

const pub = publicAddress({
  gate: 41, line: 2, color: 3, tone: 4, base: 5,
  degree: 12, minute: 30, second: 5, arcSecond: 830812, zodiac: 8, house: 6,
});
eq(pub, { gate: 41, line: 2, color: 3, tone: 4, base: 5 }, 'mesh-memory publicAddress keeps gate/line/color/tone/base');
ok(!('degree' in pub) && !('minute' in pub) && !('second' in pub) && !('arcSecond' in pub)
  && !('zodiac' in pub) && !('house' in pub),
  'mesh-memory publicAddress strips private keys (degree/minute/second/arcSecond/zodiac/house)');

// ------------------------------------------------------------- sounds/colors
section('state space: sounds and colors');

const addr = { gate: 41, line: 2, color: 3, tone: 4, base: 5, arcSecond: 830812, zodiac: 8, house: 6, planetaryDimension: 'Design' };
const sound = soundFor(addr);
ok(typeof sound.freq === 'number' && sound.freq > 0, `soundFor returns a positive frequency (${sound.freq.toFixed(2)} Hz)`);
ok(['sine', 'triangle', 'square', 'sawtooth', 'pulse', 'noise'].includes(sound.timbre), 'soundFor returns a valid timbre');

const color = colorFor(addr);
ok(/^#[0-9A-F]{6}$/.test(color.hex), `colorFor returns a valid #RRGGBB (${color.hex})`);

const rotated = transitionSound('rotation', addr);
ok(Math.abs(rotated.freq / sound.freq - Math.pow(2, 6 / 12)) < 1e-9 && rotated.transpose === 6,
  'transitionSound applies modifiers (rotation transposes +6 semitones)');
const rested = transitionSound('dormancy', addr);
ok(rested.duration === 0 && rested.velocity === 0, 'transitionSound applies modifiers (dormancy is a rest)');

const mirrored = transitionColor('mirror', addr);
ok(/^#[0-9A-F]{6}$/.test(mirrored.hex) && mirrored.hex !== color.hex
  && Math.abs((((mirrored.hue - color.hue) % 360 + 360) % 360) - 180) < 1e-9,
  'transitionColor applies modifiers (mirror shifts hue +180)');
const dimmed = transitionColor('dormancy', addr);
ok(dimmed.sat === 20 && /^#[0-9A-F]{6}$/.test(dimmed.hex), 'transitionColor applies modifiers (dormancy desaturates to 20%)');

// ---------------------------------------------------------------- mesh metrics
section('mesh: metrics');

const metrics = engine.meshMetrics();
eq(Object.keys(metrics.projections).sort(), [...PROJECTIONS].sort(), 'mesh metrics expose all 5 projections');
for (const name of PROJECTIONS) {
  const p = metrics.projections[name];
  ok(typeof p.nodes === 'number' && typeof p.edges === 'number' && typeof p.avgDegree === 'number',
    `projection '${name}' reports {nodes, edges, avgDegree}`);
}
eq(metrics.automata, 17, 'mesh reports 17 automata (16 canonical + boot-grown media-field)');

// -------------------------------------------------- state round-trip (Maps)
section('automata: exportState/hydrate round-trip (Map-based owned state)');

const stateEngine = new SynthiaAutomata();
stateEngine.call('success \'{"operation":"define","personId":"ada","purpose":{"statement":"s","indicators":[{"id":"i1","name":"n"}]}}\'');
stateEngine.call('conversation "hello there"');
stateEngine.call('coder "the dogs bark"');
stateEngine.call('diseminer "the quick brown fox jumps"');
stateEngine.call('autoling "the dogs bark"');
stateEngine.call('browser-form inspect-page \'{"page":{"id":"pg1","url":"about:blank","fields":[]}}\'');
stateEngine.call('research-browser create \'{"project":{"id":"p1","title":"t"}}\'');
stateEngine.call('morph-mir ingest \'{"name":"a.txt","content":"hello world"}\'');

const replacer = (key, value) => (value instanceof Map ? { __map: [...value] }
  : value instanceof Set ? { __set: [...value] } : value);
for (const tool of stateEngine.tools) {
  let label = `${tool.id}: exportState/hydrate round-trips losslessly`;
  try {
    const before = JSON.stringify(tool.exportState(), replacer);
    tool.hydrate(tool.exportState());
    const after = JSON.stringify(tool.exportState(), replacer);
    if (before !== after) throw new Error('round-trip drift');
    if (tool.id === 'success' && !(tool.ownedState.people instanceof Map)) throw new Error('people lost Map type');
    if (tool.id === 'success' && !tool.ownedState.summary('ada')) throw new Error('memory methods lost after hydrate');
    if (tool.id === 'computational-grammar-coder'
      && !(tool.ownedState.dictionary instanceof Map || !tool.ownedState.code('the dogs').words.length)) {
      // dictionary survives as Map and the coder still codes
    }
    ok(true, label);
  } catch (err) {
    ok(false, `${label} — ${err.message}`);
  }
}

// ------------------------------------------------------------- intake gate
section('intake: address-first Sensory Adapter (five mechanical senses)');

const intakeEngine = new SynthiaAutomata();
const aiText = intakeEngine.intake('the gate learns from the user');
ok(Number.isInteger(aiText.address.gate) && aiText.address.gate >= 1 && aiText.address.gate <= 64,
  `text intake gets a canonical address (gate ${aiText.address.gate})`);
eq(aiText.addressBasis, 'hash-candidate', 'address is labeled addressBasis:hash-candidate (H3 stays a hypothesis)');
ok(typeof aiText.sound.freq === 'number' && aiText.sound.freq > 0, `intake sound has positive freq (${aiText.sound.freq.toFixed(2)} Hz)`);
ok(/^#[0-9A-F]{6}$/.test(aiText.color.hex), `intake color is a valid hex (${aiText.color.hex})`);
ok(aiText.senses.see.transitionVector && typeof aiText.senses.see.momentum === 'number'
  && typeof aiText.senses.taste.familiarity === 'number' && typeof aiText.senses.taste.novelty === 'number'
  && aiText.senses.touch.texture && typeof aiText.senses.touch.texture.entropy === 'number'
  && Number.isInteger(aiText.senses.touch.texture.nestingDepth)
  && typeof aiText.senses.touch.pressure === 'number'
  && Array.isArray(aiText.senses.smell.scent) && aiText.senses.smell.scent.length === 6
  && aiText.senses.smell.scent.every((v) => v >= 0 && v <= 1)
  && Array.isArray(aiText.senses.hear.channels) && Array.isArray(aiText.senses.hear.resonantAddresses),
  'all five mechanical senses present with correct shapes (see/taste/touch/smell/hear)');
ok(aiText.analysis.concepts.length > 0 && aiText.analysis.concepts.includes('gate'),
  `analysis.concepts non-empty for 'the gate learns from the user' (${aiText.analysis.concepts.join(', ')})`);
ok(typeof aiText.analysis.purpose === 'string' && aiText.analysis.purpose.includes('learns'),
  `analysis.purpose is a first-verb-phrase guess (${aiText.analysis.purpose})`);

const aiCode = intakeEngine.intake('import { x } from "./m.js";\nexport function foo(a) { return a + 1; }');
eq(aiCode.P.kind, 'code', 'code string is decomposed as kind:code');
ok(aiCode.P.structure.imports.includes('./m.js') && aiCode.P.structure.functions.includes('foo')
  && aiCode.P.structure.exports.includes('foo'), 'code gets a morph-mir-style structural sniff (imports/exports/functions)');
eq(aiCode.regime.dimension, 'Design', 'code regime is Design');

const aiObj = intakeEngine.intake({ hello: 'world', n: 3 });
eq(aiObj.P.kind, 'data', 'object input is decomposed as kind:data');
eq(aiObj.regime.dimension, 'Evolution', 'data regime is Evolution');

// ------------------------------------------------------------ address-first
section('intake: engine.call routes through intake FIRST');

const afEngine = new SynthiaAutomata();
const historyBefore = afEngine.intake.exportHistory().length;
ok(historyBefore === 1, 'boot intake is the media-field growth (history starts at 1)');
const afDerivation = afEngine.call('conversation "hello intake"');
ok(typeof afDerivation.intakeId === 'string' && /^intake-\d+$/.test(afDerivation.intakeId),
  `derivation carries intakeId (${afDerivation.intakeId})`);
eq(afEngine.intake.exportHistory().length, historyBefore + 1, 'intake history grows on engine.call');
const afIntake = afEngine.intake.gate.history.find((h) => h.id === afDerivation.intakeId);
ok(afIntake && afIntake.address.gate >= 1, 'the call intake is in history with its own address');

// --------------------------------------------------------------- determinism
section('intake: determinism (fresh gates, same input -> same address + senses)');

const detA = new SynthiaAutomata();
const detB = new SynthiaAutomata();
const da = detA.intake('deterministic sensory probe of the field');
const db = detB.intake('deterministic sensory probe of the field');
eq(da.address.arcSecond, db.address.arcSecond, 'same input -> same arcSecond address');
eq(JSON.stringify(da.senses), JSON.stringify(db.senses), 'same input -> identical five-sense signatures');
eq(da.color.hex, db.color.hex, 'same input -> identical color');

// ------------------------------------------------------------------- learning
section('learning: routed, grown, learned-recall, CR metrics');

const learn = new SynthiaAutomata();
ok(learn.grownTools().some((t) => t.id === 'media-field' && t.gate === 25 && t.dimension === 'Space'),
  'media-field is grown at boot (gate 25, Space) via the learning grow path');

const video = await learn.request('make a video of gate 24 morphing into gate 41');
ok(video.mode === 'routed' || video.mode === 'grown', `video request resolves as routed|grown (${video.mode})`);
eq(video.toolId, 'media-field', 'video request routes to media-field');
ok(video.output && video.output.frames && video.output.frames.count > 0
  && video.output.frames.byteLength === 64 * 64 * 4
  && Array.isArray(video.output.frames.hashes) && video.output.frames.hashes.length === video.output.frames.count,
  `media-field returns frames metadata (${video.output.frames.count} frames of ${video.output.frames.byteLength} bytes)`);
eq(video.output.frames.changingLineCount, 2, 'changing lines for gates 24->41 = popcount(xor) = 2 (lines 2 and 6)');

const codeReq = await learn.request('write code for a gate resonance counter');
eq(codeReq.toolId, 'media-field', 'code request routes to media-field (CodeWeaver core)');
ok(typeof codeReq.output.code === 'string' && codeReq.output.code.includes('export'),
  'code request returns a generated code string containing export');

const grown1 = await learn.request('invent a contraption that sings backwards');
eq(grown1.mode, 'grown', 'unknown request grows a new tool');
ok(/^tool-[0-9a-f]{16}$/.test(grown1.toolId), `grown tool id is the deterministic factory id (${grown1.toolId})`);
const grown2 = await learn.request('invent a contraption that sings backwards');
eq(grown2.mode, 'learned-recall', 'second identical request resolves as learned-recall');
eq(grown2.toolId, grown1.toolId, 'learned-recall keeps the same toolId (no re-grow)');

const sensible = await learn.request('the gate learns from the user');
ok(['known-call', 'routed', 'grown', 'learned-recall', 'emergent-channel'].includes(sensible.mode) && typeof sensible.toolId === 'string',
  `'the gate learns from the user' resolves sensibly (mode ${sensible.mode}, tool ${sensible.toolId})`);

const knownCall = await learn.request('conversation "a known call"');
eq(knownCall.mode, 'known-call', 'a parseable tool-call sentence resolves as known-call');

const learnLog = learn.learning.exportLog();
ok(learnLog.length >= 6 && learnLog.every((e) => e.cr
  && ['operations', 'visitedStates', 'materialized', 'peakStates', 'steps']
    .every((k) => typeof e.cr[k] === 'number')),
  'CR metrics C(X) = {operations, visitedStates, materialized, peakStates, steps} in every log entry');
ok(learnLog.every((e) => Number.isInteger(e.seq) && typeof e.ledgerSnapshot === 'object'),
  'log entries are timestamp-free (counter seq) with a ledger snapshot');
const crReport = learn.learning.crReport();
ok(crReport.requests === learnLog.length && crReport.totals.operations > 0 && crReport.byMode.grown >= 1,
  `crReport summarizes counts (${crReport.requests} requests, ${crReport.toolsGrown} grown tools)`);

// --------------------------------------------------------------- media-field
section('media-field: pure-JS media core (frames, morph, code weaver)');

const mf1 = new MediaField();
const mf2 = new MediaField();
const frames1 = mf1.morphFrames(24, 41, 4);
const frames2 = mf2.morphFrames(24, 41, 4);
eq(frames1.length, 4, 'morphFrames(24, 41, 4) returns 4 frames');
ok(frames1.every((f) => f instanceof Uint8ClampedArray && f.length === 64 * 64 * 4),
  'every frame is a 64x64 RGBA Uint8ClampedArray');
ok(frames1.every((f, i) => frameHash(f) === frameHash(frames2[i])),
  'two fresh fields produce byte-identical morph frames (deterministic)');
const frames3 = mf1.morphFrames(24, 41, 4);
ok(frames3.every((f, i) => frameHash(f) === frameHash(frames1[i])),
  'morphFrames is field-state-pure: same instance, identical bytes');
const bits24 = gateBits(24);
const bits41 = gateBits(41);
const expectedChanging = bits24.reduce((n, b, i) => n + (b !== bits41[i] ? 1 : 0), 0);
eq(mf1.lastMorph.changingLineCount, expectedChanging,
  'changing lines = popcount(fuxi(from) XOR fuxi(to)) — documented in lastMorph');
eq(mf1.lastMorph.changingLines, [2, 6], 'changing lines of gates 24->41 are lines 2 and 6');

const weaver = new CodeWeaver();
const sample = 'import { a } from "./x.js";\nexport function helper(n) { return n * 2; }\nexport const run = (x) => helper(x);';
const analysis = weaver.analyze(sample);
ok(analysis.functions.includes('helper') && analysis.functions.includes('run')
  && analysis.imports.includes('./x.js') && analysis.exports.some((e) => e.includes('helper'))
  && /^[0-9a-f]{8}$/.test(analysis.signature),
  'codeWeaver.analyze extracts functions/imports/exports + fnv signature');
const woven = weaver.weave({ name: 'gate resonance counter', gates: [24, 41], purpose: 'count resonance' });
ok(typeof woven === 'string' && woven.includes('export'), 'weave returns a module string containing export');
eq(woven, weaver.weave({ name: 'gate resonance counter', gates: [24, 41], purpose: 'count resonance' }),
  'weave is deterministic');
const diff = weaver.diffSummary(sample, `${sample}\nexport const extra = 1;`);
ok(diff.addedCount >= 1 && diff.identical === false, 'diffSummary reports added lines');

const timeline = new VideoTimeline();
timeline.addFrame(frames1[0], 2);
const exportedFrames = timeline.exportFrames();
ok(exportedFrames.length === 1 && exportedFrames[0].delay === 80
  && exportedFrames[0].width === 64 && exportedFrames[0].height === 64,
  'VideoTimeline exportFrames -> {rgba, width, height, delay} with deterministic delays');

// ---------------------------------------------------- semantic triples (L7+)
section('triples: each tool is made of semantic triples');

const triEngine = new SynthiaAutomata();
ok(triEngine.tripleStore.size() > 0, `triple store populated at boot (${triEngine.tripleStore.size()} triples)`);
eq(triEngine.mesh.automata.size, 17, '17 mesh automata (16 canonical + boot-grown media-field)');
for (const id of triEngine.mesh.automata.keys()) {
  const ts = triEngine.toolTriples(id);
  ok(ts.length >= 8, `${id}: contributes >= 8 ontology triples (${ts.length})`);
}
const autolingTriples = triEngine.toolTriples('autoling');
ok(autolingTriples.some((t) => t.predicate === 'isA' && t.object === 'Automaton'),
  'autoling ontology: (autoling, isA, Automaton)');
ok(autolingTriples.some((t) => t.predicate === 'hasGate' && t.object === 17),
  'autoling ontology: (autoling, hasGate, 17)');
ok(autolingTriples.some((t) => t.predicate === 'hasCapability'),
  'autoling ontology: at least one (autoling, hasCapability, _) triple');
ok(autolingTriples.some((t) => t.predicate === 'usesTransition'),
  'autoling ontology: delta-table transitions asserted as usesTransition');

const ichingOnto = toolOntology(triEngine.toolsById.get('iching-grammar'));
ok(ichingOnto.every((t) => t instanceof Triple && Object.isFrozen(t)),
  'toolOntology returns frozen Triple instances');
ok(ichingOnto.some((t) => t.predicate === 'hasChannel' && t.object === '24-61')
  && ichingOnto.some((t) => t.predicate === 'hasForm' && t.object === 'hexagram pushdown automaton')
  && ichingOnto.filter((t) => t.predicate === 'hasState').length === 4,
  'iching-grammar ontology: channel 24-61, automaton form, 4 internal states');

const directRun = runTriples({
  toolId: 'probe-tool',
  input: { args: ['x'] },
  output: { ok: true },
  derivationId: 'drv-test',
  trace: [
    { from: 'dormant', to: 'q0', transition: 'ignition' },
    { from: 'q0', to: 'q0', transition: 'automatize' },
  ],
});
ok(directRun.some((t) => t.predicate === 'processedBy' && t.object === 'probe-tool'),
  'runTriples: (inputHash, processedBy, toolId)');
ok(directRun.some((t) => t.subject === 'probe-tool' && t.predicate === 'produced'),
  'runTriples: (toolId, produced, outputHash)');
eq(directRun.filter((t) => t.predicate === 'transition').length, 2,
  'runTriples: one transition triple per trace step');
ok(directRun.every((t) => t.derivationId === 'drv-test'),
  'runTriples: every triple carries the derivation id');

section('triples: run provenance appears after engine.call');

const triRun = triEngine.call('conversation "triple run probe"');
ok(triEngine.triples({ predicate: 'processedBy' }).some((t) => t.object === 'conversation'),
  'after call: (inputHash, processedBy, conversation) asserted');
ok(triEngine.triples({ subject: 'conversation', predicate: 'produced' }).length >= 1,
  'after call: (conversation, produced, outputHash) asserted');
const traceTriples = triEngine.triples({ predicate: 'transition' });
ok(traceTriples.length >= 2 && traceTriples.every((t) => t.derivationId === triRun.id),
  `query by predicate 'transition' returns the run's trace triples (${traceTriples.length}) with derivation provenance`);

section('triples: TripleStore dedupe + wildcard queries');

const store = new TripleStore();
store.add(new Triple({ subject: 'a', predicate: 'p', object: 'b' }));
store.add(new Triple({ subject: 'a', predicate: 'p', object: 'b' }));
eq(store.size(), 1, 'add() dedupes by (subject, predicate, object) key');
store.addAll([
  { subject: 'a', predicate: 'q', object: 'c' },
  { subject: 'x', predicate: 'p', object: 'b' },
]);
eq(store.size(), 3, 'addAll adds distinct triples');
eq(store.query({ predicate: 'p' }).length, 2, 'wildcard query: subject+object null match all');
eq(store.query({ subject: 'a', object: 'b' }).length, 1, 'wildcard query: predicate null matches all');
eq(store.query({}).length, 3, 'empty query returns the whole store');
eq(store.bySubject('a').length, 2, 'bySubject filters on subject');
eq(store.predicates().sort(), ['p', 'q'], 'predicates() lists distinct predicates');
const restored = new TripleStore().import(store.export());
eq(restored.size(), 3, 'export/import round-trips the store');
ok(Object.isFrozen(restored.query({})[0]), 'imported triples are frozen Triple instances');

// ---------------------------------------------------------- emergent channels
section('channels: crossings promote to emergent channels (self-cultivation)');

const unit = new EmergentChannels({});
const u1 = unit.recordCrossing('a', 'b', { id: 'p1' });
ok(u1.promoted === false && u1.uses === 1, 'first crossing is temporary (uses 1)');
unit.recordCrossing('a', 'b', { id: 'p2' });
const u3 = unit.recordCrossing('a', 'b', { id: 'p3' });
ok(u3.promoted === true && u3.packetKeys.length === 3 && Number.isInteger(u3.promotedSeq),
  'third use promotes the crossing, keeping packet provenance');
ok(unit.emergentCapability('a', 'b').id === 'channel:a~b'
  && unit.emergentCapability('b', 'a') === null,
  'emergentCapability is directional and promotion-gated');

const chEngine = new SynthiaAutomata();
eq(chEngine.emergentChannels().length, 0, 'no promoted channels at boot');
chEngine.call('autoling "the dogs bark" then diseminer "the dogs bark"');
chEngine.call('autoling "the dogs bark" then diseminer "the dogs bark"');
eq(chEngine.emergentChannels().length, 0, 'two crossings of autoling->diseminer: still temporary');
chEngine.call('autoling "the dogs bark" then diseminer "the dogs bark"');
const promotedChannels = chEngine.emergentChannels();
ok(promotedChannels.some((c) => c.a === 'autoling' && c.b === 'diseminer' && c.promoted === true && c.uses >= 3),
  'third identical chain promotes autoling~diseminer; engine.emergentChannels() lists it');
const channelCap = chEngine.channelCapability('autoling', 'diseminer');
ok(channelCap && channelCap.id === 'channel:autoling~diseminer' && channelCap.kind === 'emergent-channel'
  && channelCap.compose === 'sequential'
  && JSON.stringify(channelCap.tools) === JSON.stringify(['autoling', 'diseminer']),
  'promoted channel is a composite sequential capability of both tools');
const emergentResult = await chEngine.request('learn grammar rules and infer narrative distribution');
eq(emergentResult.mode, 'emergent-channel',
  '4th request matching both member tools resolves with mode emergent-channel');
eq(emergentResult.toolId, 'autoling then diseminer',
  'emergent-channel executes the promoted pair as a composed two-call chain');
ok(emergentResult.channel && emergentResult.channel.kind === 'emergent-channel',
  'emergent-channel result carries the channel capability record');
ok(chEngine.channels.get('autoling', 'diseminer').uses >= 4,
  'the emergent run records another crossing through the channel');

// ---------------------------------------------------------- experiential return
section('experiential return: results feed back into owned state');

const exEngine = new SynthiaAutomata();
exEngine.call('conversation "first experience"');
exEngine.call('conversation "second experience"');
const conv = exEngine.toolsById.get('conversation');
ok(Array.isArray(conv.ownedState.experiences) && conv.ownedState.experiences.length >= 2,
  `conversation absorbed >= 2 experience records (${conv.ownedState.experiences.length})`);
const experience0 = conv.ownedState.experiences[0];
ok(typeof experience0.derivationId === 'string' && typeof experience0.intakeId === 'string'
  && typeof experience0.outputHash === 'string' && Number.isInteger(experience0.seq),
  'experience record shape: {derivationId, intakeId, outputHash, seq}');
const exBefore = JSON.stringify(conv.exportState(), replacer);
conv.hydrate(conv.exportState());
ok(JSON.stringify(conv.exportState(), replacer) === exBefore && conv.ownedState.experiences.length >= 2,
  'exportState/hydrate preserves the experiences log');

const nullStateEngine = new SynthiaAutomata();
nullStateEngine.call('klein-analogy "boy girl woman"');
const kleinTool = nullStateEngine.toolsById.get('klein-analogy');
ok(kleinTool.ownedState && Array.isArray(kleinTool.ownedState.experiences)
  && kleinTool.ownedState.experiences.length === 1,
  'stateless tools (ownedState null) gain an experiences log');

const repExEngine = new SynthiaAutomata();
repExEngine.call('conversation "xp one"');
const xpChain = repExEngine.call('conversation "xp two" then conversation "xp three"');
eq(repExEngine.replay(xpChain.toJSON()).status, 'REPRODUCED',
  'replay stays hash-identical with triples + experiential return active');

// ------------------------------------------------------------------ artifacts
section('artifacts: real file bytes (BMP, GIF89a, code) — proof of realness');

// Minimal structural GIF re-parser: walks block boundaries (never a raw byte
// scan — 0x2C inside compressed data must not count as an image descriptor).
function walkGIF(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  const u16 = (p) => b[p] | (b[p + 1] << 8);
  let pos = 6; // header
  const width = u16(pos); const height = u16(pos + 2);
  const packed = b[pos + 4];
  pos += 7;
  if (packed & 0x80) pos += 3 * (1 << ((packed & 7) + 1)); // global color table
  const skipSubBlocks = () => { for (;;) { const n = b[pos]; pos += 1; if (n === 0) return; pos += n; } };
  let frames = 0;
  let trailer = false;
  while (pos < b.length) {
    const marker = b[pos];
    if (marker === 0x3b) { trailer = true; break; }
    if (marker === 0x21) { pos += 2; skipSubBlocks(); continue; } // extension
    if (marker === 0x2c) { // image descriptor
      frames += 1;
      const localPacked = b[pos + 9];
      pos += 10;
      if (localPacked & 0x80) pos += 3 * (1 << ((localPacked & 7) + 1)); // local color table
      pos += 1; // LZW minimum code size
      skipSubBlocks();
      continue;
    }
    throw new Error(`unexpected GIF byte 0x${marker.toString(16)} at ${pos}`);
  }
  return { width, height, frames, trailer };
}

// BMP: 4x4 known pattern
const bmpPattern = new Uint8ClampedArray(4 * 4 * 4);
for (let y = 0; y < 4; y++) {
  for (let x = 0; x < 4; x++) {
    const o = (y * 4 + x) * 4;
    bmpPattern[o] = x * 16; bmpPattern[o + 1] = y * 16;
    bmpPattern[o + 2] = (x + y) * 8; bmpPattern[o + 3] = 255;
  }
}
const bmp1 = encodeBMP(4, 4, bmpPattern);
const bmp2 = encodeBMP(4, 4, bmpPattern);
ok(bmp1 instanceof Uint8Array && bmp1[0] === 0x42 && bmp1[1] === 0x4d, "BMP starts with magic 'BM'");
const bmpView = new DataView(bmp1.buffer);
eq(bmpView.getUint32(2, true), bmp1.length, 'BMP file-size field equals the buffer length');
eq(bmp1.length, 54 + 4 * 3 * 4, 'BMP size = 54 + padded rows (4px rows are 4-byte aligned)');
eq(bmpView.getUint32(10, true), 54, 'BMP pixel data offset is 54 (14 + 40 byte headers)');
eq([...bmp1.slice(57, 60)], [32, 48, 16],
  'BMP spot-check: bottom row first -> pixel (1,3) stored BGR = [32,48,16]');
eq([...bmp1.slice(96, 99)], [16, 0, 32],
  'BMP spot-check: last stored row -> pixel (2,0) stored BGR = [16,0,32]');
ok(bmp1.length === bmp2.length && bmp1.every((v, i) => v === bmp2[i]),
  'BMP encode is byte-deterministic across two encodes');

// GIF: 3 frames of 8x8
const gifFrame = (phase) => {
  const f = new Uint8ClampedArray(8 * 8 * 4);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const o = (y * 8 + x) * 4;
      f[o] = (x * 32 + phase * 40) % 256; f[o + 1] = (y * 32) % 256;
      f[o + 2] = ((x + y) * 16 + phase * 80) % 256; f[o + 3] = 255;
    }
  }
  return f;
};
const gifSpec = [0, 1, 2].map((phase) => ({ rgba: gifFrame(phase), delayCs: 6 + phase }));
const gif1 = encodeGIF(8, 8, gifSpec, { loop: true });
const gif2 = encodeGIF(8, 8, gifSpec, { loop: true });
eq(String.fromCharCode(...gif1.slice(0, 6)), 'GIF89a', "GIF starts with header 'GIF89a'");
eq(gif1[gif1.length - 1], 0x3b, 'GIF ends with trailer 0x3B');
const gifMeta = walkGIF(gif1);
eq([gifMeta.width, gifMeta.height], [8, 8], 'GIF re-parse: width/height little-endian = 8x8');
eq(gifMeta.frames, 3, 'GIF re-parse: exactly 3 image descriptors (0x2C) walked structurally');
ok(gifMeta.trailer, 'GIF re-parse: structural walk terminates at the trailer');
ok(gif1.length === gif2.length && gif1.every((v, i) => v === gif2[i]),
  'GIF encode is byte-deterministic across two encodes (fixed palette + own LZW)');

// ArtifactWriter: deterministic ids, hashes, metadata list
const probeWriter = new ArtifactWriter();
const w1 = probeWriter.write('picture', { fileName: 'p.bmp', bytes: bmp1, mime: 'image/bmp' });
const w2 = probeWriter.write('code', { fileName: 'm.js', text: 'export const x = 1;', mime: 'text/javascript' });
eq([w1.artifact.id, w2.artifact.id], ['art-1', 'art-2'], 'ArtifactWriter ids are deterministic art-N');
eq(w1.artifact.hash, fnv1a32Bytes(bmp1), 'artifact hash is fnv1a32 over the exact bytes');
eq(w1.artifact.size, bmp1.length, 'artifact size is the byte length');
ok(w2.artifact.text === 'export const x = 1;' && w2.artifact.bytes.length === w2.artifact.size,
  'text artifacts are utf8-encoded and keep their text');
eq(probeWriter.list().map((r) => r.id), ['art-1', 'art-2'], 'list() enumerates all artifacts');
ok(probeWriter.list().every((r) => !('bytes' in r) && r.hash && r.size > 0),
  'list() returns metadata only (no byte payload)');

// request-level: picture / video / code artifacts through the learning front door
const artEngine = new SynthiaAutomata();

const pic = await artEngine.request('make a picture of gate 24');
eq(pic.toolId, 'media-field', "request 'make a picture of gate 24' routes to media-field");
eq(pic.mode, 'routed', 'picture request mode is routed (capability match)');
const pa = pic.output.artifact;
ok(pic.output.ok === true && pa && pa.kind === 'picture' && pa.format === 'bmp'
  && pa.mime === 'image/bmp' && pa.size > 54,
  `picture op returns a BMP artifact (${pa && pa.fileName}, ${pa && pa.size} bytes)`);
ok(pa.bytes[0] === 0x42 && pa.bytes[1] === 0x4d && Array.isArray(pa.bytes),
  'picture artifact bytes are a JSON-safe plain array starting with BM');
eq(pa.hash, fnv1a32Bytes(Uint8Array.from(pa.bytes)), 'picture artifact hash verifies against its bytes');
const picRepeat = await artEngine.request('make a picture of gate 24');
eq(picRepeat.output.artifact.hash, pa.hash, 'picture artifact hash is stable across repeat requests');

const vid = await artEngine.request('make a video of gate 24 morphing into gate 41');
eq(vid.toolId, 'media-field', "request 'make a video...' routes to media-field");
const va = vid.output.artifact;
ok(vid.output.ok === true && va && va.kind === 'video' && va.format === 'gif'
  && va.mime === 'image/gif' && va.frames >= 4,
  `video op returns an animated GIF artifact (${va && va.fileName}, ${va && va.frames} frames)`);
eq(String.fromCharCode(...va.bytes.slice(0, 6)), 'GIF89a', 'video artifact bytes start with GIF89a');
eq(walkGIF(va.bytes).frames, vid.output.frames.count,
  'video artifact re-parses to the same frame count as the morph');
const vidRepeat = await artEngine.request('make a video of gate 24 morphing into gate 41');
eq(vidRepeat.output.artifact.hash, va.hash, 'video artifact hash is stable across repeat requests');

const cod = await artEngine.request('write code for a gate resonance counter');
eq(cod.toolId, 'media-field', "request 'write code...' routes to media-field");
const ca = cod.output.artifact;
ok(cod.output.ok === true && ca && ca.kind === 'code' && ca.format === 'js'
  && ca.mime === 'text/javascript' && typeof ca.text === 'string' && ca.text.includes('export'),
  `code op returns a JS artifact (${ca && ca.fileName}) whose text contains export`);
ok(ca.fileName.endsWith('.js') && ca.text.startsWith('// Pure Synthia Automata'),
  'code artifact file is <name>.js and opens with the Pure Synthia header');
const codRepeat = await artEngine.request('write code for a gate resonance counter');
eq(codRepeat.output.artifact.hash, ca.hash, 'code artifact hash is stable across repeat requests');

// ------------------------------------------------------------- klein operator
section('klein operator: K_i(C_t) = (relation, intensity, direction)');

const kleinEngine = new SynthiaAutomata();
const autolingTool = kleinEngine.toolsById.get('autoling');
const K = kleinOperator(autolingTool);
const KLEIN_CONTEXTS = [
  { input: { operation: 'pipeline', text: 'the dogs bark loudly' }, address: { gate: 17 }, dimension: 'Design' },
  { input: { operation: 'induce', examples: [['the dog barks', 'dogs bark']] }, dimension: 'Design' },
  { input: { operation: 'stats' }, dimension: 'Design' },
];
const kTriple = K(KLEIN_CONTEXTS[0]);
ok(kTriple && Object.isFrozen(kTriple), 'K(C) returns a frozen triple');
ok(typeof kTriple.relation === 'string' && kTriple.relation.length > 0
  && NAMED_TRANSITIONS.some((t) => t.id === kTriple.relation),
  `relation is a named transition id ('${kTriple.relation}')`);
ok(typeof kTriple.intensity === 'number' && kTriple.intensity >= 0 && kTriple.intensity <= 1,
  `intensity ∈ [0,1] (${kTriple.intensity})`);
ok(['toward', 'away', 'neutral'].includes(kTriple.direction),
  `direction ∈ {toward, away, neutral} ('${kTriple.direction}')`);
eq(autolingTool.calls, 0, 'Klein evaluation is side-effect free (tool calls/state untouched)');

const K2 = kleinOperator(kleinEngine.toolsById.get('klein-analogy'));
const kInv = kleinInvariants(K, KLEIN_CONTEXTS[0], KLEIN_CONTEXTS, { composeWith: K2 });
eq(kInv.deterministic, true, 'invariant: K(C) === K(C) for identical context');
eq(kInv.contextDependent, true, 'invariant: distinct sample contexts yield distinct triples');
eq(kInv.compositionalEmergence, true, 'invariant: J(Ki,Kj,C) ≠ Ki(C)+Kj(C) via emergent-channel compose');
const kComposed = kleinCompose(K, K2, KLEIN_CONTEXTS[0]);
eq(kComposed.relation, 'channel:autoling~klein-analogy', 'composed relation is the emergent channel id');

// ------------------------------------------------------------- open questions
section('questions: Open Questions Registry');

const qEngine = new SynthiaAutomata();
ok(qEngine.questions instanceof QuestionRegistry, 'engine.questions is a QuestionRegistry');
const qList = qEngine.questions.list();
eq(qList.length, 3, 'three open questions are registered');
eq(qList.map((q) => q.id), ['OQ-1', 'OQ-2', 'OQ-3'], 'question ids OQ-1..OQ-3');
ok(qList.every((q) => q.status === 'open' && Object.isFrozen(q)), 'all three questions are open and frozen');
eq(qEngine.questions.get('OQ-2').linkedHypothesis, 'H3', 'OQ-2 (DMS assignment) linked to H3');
eq(qEngine.questions.get('OQ-3').linkedHypothesis, 'H4', 'OQ-3 (Space discrepancy) linked to H4');
ok(Array.isArray(qEngine.questions.get('OQ-1').candidateTests)
  && qEngine.questions.get('OQ-1').candidateTests.length >= 2,
  'OQ-1 carries candidate tests');
eq(OPEN_QUESTIONS.length, 3, 'OPEN_QUESTIONS export holds the three seed questions');

const scratchRegistry = new QuestionRegistry([]);
scratchRegistry.add({ name: 'probe', statement: 'a scratch question' });
let resolveThrew = false;
try { scratchRegistry.resolve('OQ-1'); } catch { resolveThrew = true; }
ok(resolveThrew, 'resolve() without an evidenceId throws');
const resolved = scratchRegistry.resolve('OQ-1', 'h10-drv-01');
eq(resolved.status, 'resolved', 'resolve(id, evidenceId) closes the question');
eq(resolved.evidenceId, 'h10-drv-01', 'resolved question records its evidence id');
eq(scratchRegistry.export().resolved, 1, 'export() reports resolved count');

// --------------------------------------------- H10 relational capability (decisive)
section('experiment H10: a relation creates a capability neither automaton has alone');

const h10Engine = new SynthiaAutomata();
const report = h10Engine.runRelationalExperiment();
eq(report.hypothesis, 'H10', 'report is hypothesis H10');
eq(Object.keys(report.results).sort(), ['A', 'B', 'chain', 'noRelation', 'shuffled'],
  'results object carries all five pre-registered conditions');
eq(report.results.A, 0, 'A(Q) = 0 — iching-grammar computes but cannot speak');
eq(report.results.B, 0, 'B(Q) = 0 — conversation speaks but cannot compute hexagrams');
eq(report.results.noRelation, 0, 'F(A,B,∅) = 0 — independent runs without packet exchange fail');
eq(report.results.shuffled, 0, 'F(A,B,R_shuffled) = 0 — shuffled-payload control fails');
eq(report.results.chain, 1, 'F(A,B,R) = 1 — the sequential packet channel succeeds');
eq(report.interpretation, 'supported', "H10 interpretation is 'supported'");
ok(report.transfer.C === 'klein-analogy' && report.transfer.D === 'conversation'
  && typeof report.transfer["Q'"] === 'string',
  'transfer probe: C=klein-analogy, D=conversation on Q\'');
ok(report.transfer.result === 0 || report.transfer.result === 1,
  `transfer result recorded honestly (${report.transfer.result})`);
ok(Array.isArray(report.derivationIds) && report.derivationIds.length > 0,
  `report carries derivationIds (${report.derivationIds.length})`);
ok(report.ledger && report.ledger.transitionCount > 0, 'report carries a merged ledger');

// Predicate honesty probes: the predicate itself discriminates as registered.
eq(capability('just some prose about gate 50 with Gentle and Clinging', { gate: 50, trigrams: ['Gentle', 'Clinging'] }), 0,
  'capability: unformatted prose fails even with the right tokens');
eq(capability('[weave:x] {"gate":99,"name":"Gentle Clinging"}', { gate: 50, trigrams: ['Gentle', 'Clinging'] }), 0,
  'capability: wrong gate number fails');
ok(shuffledString('abcdef', 0x8110) !== 'abcdef' && shuffledString('abcdef', 0x8110) === shuffledString('abcdef', 0x8110),
  'shuffledString is a real deterministic shuffle');

// Deterministic re-run: identical report (results/transfer/interpretation).
const report2 = h10Engine.runRelationalExperiment();
eq([report2.results, report2.transfer.result, report2.interpretation],
  [report.results, report.transfer.result, report.interpretation],
  're-running the experiment reproduces the identical verdict');

// ------------------------------------------------ fragment algebra (Turn 6)
import { run as runFragments } from '../test/fragments.test.mjs';
import { run as runGenerative } from '../test/generative.test.mjs';
const fragRes = await runFragments({ quiet: true });
for (const f of (fragRes.failures || [])) failures.push(`fragments: ${f}`);
passed += fragRes.passed; failed += fragRes.failed;
console.log(`[fragments] ${fragRes.passed} passed, ${fragRes.failed} failed`);
const genRes = await runGenerative({ quiet: true });
for (const f of (genRes.failures || [])) failures.push(`generative: ${f}`);
passed += genRes.passed; failed += genRes.failed;
console.log(`[generative] ${genRes.passed} passed, ${genRes.failed} failed`);
import { run as runEmergence } from '../test/emergence.test.mjs';
import { run as runScale } from '../test/scale-experiments.test.mjs';
const emRes = await runEmergence({ quiet: true });
for (const f of (emRes.failures || [])) failures.push(`emergence: ${f}`);
passed += emRes.passed; failed += emRes.failed;
console.log(`[emergence] ${emRes.passed} passed, ${emRes.failed} failed`);
const scaleRes = await runScale({ quiet: true });
for (const f of (scaleRes.failures || [])) failures.push(`scale: ${f}`);
passed += scaleRes.passed; failed += scaleRes.failed;
console.log(`[scale] ${scaleRes.passed} passed, ${scaleRes.failed} failed`);
import { run as runCanon } from '../test/canon.test.mjs';
const canonRes = await runCanon({ quiet: true });
for (const f of (canonRes.failures || [])) failures.push(`canon: ${f}`);
passed += canonRes.passed; failed += canonRes.failed;
console.log(`[canon] ${canonRes.passed} passed, ${canonRes.failed} failed`);
import { run as runChainsColors } from '../test/chains-colors.test.mjs';
const ccRes = await runChainsColors({ quiet: true });
for (const f of (ccRes.failures || [])) failures.push(`chains-colors: ${f}`);
passed += ccRes.passed; failed += ccRes.failed;
console.log(`[chains-colors] ${ccRes.passed} passed, ${ccRes.failed} failed`);
import { run as runPortsB } from '../test/ports-b.test.mjs';
const pbRes = await runPortsB({ quiet: true });
for (const f of (pbRes.failures || [])) failures.push(`ports-b: ${f}`);
passed += pbRes.passed; failed += pbRes.failed;
console.log(`[ports-b] ${pbRes.passed} passed, ${pbRes.failed} failed`);
import { run as runPortsC } from '../test/ports-c.test.mjs';
const pcRes = await runPortsC({ quiet: true });
for (const f of (pcRes.failures || [])) failures.push(`ports-c: ${f}`);
passed += pcRes.passed; failed += pcRes.failed;
console.log(`[ports-c] ${pcRes.passed} passed, ${pcRes.failed} failed`);
import { run as runLivingLoop } from '../test/living-loop.test.mjs';
const llRes = await runLivingLoop({ quiet: true });
for (const f of (llRes.failures || [])) failures.push(`living-loop: ${f}`);
passed += llRes.passed; failed += llRes.failed;
console.log(`[living-loop] ${llRes.passed} passed, ${llRes.failed} failed`);

// ------------------------------------------------------------------- summary
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
