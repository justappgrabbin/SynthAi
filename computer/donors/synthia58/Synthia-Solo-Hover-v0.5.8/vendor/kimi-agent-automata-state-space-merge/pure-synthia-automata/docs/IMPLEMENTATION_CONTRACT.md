# Implementation Contract — Pure Synthia Automata (binding for all coder agents)

Pure ES modules (.js), zero dependencies, zero network, Node 18+ and browser.
No `eval`, no `new Function`. Deterministic everywhere (seeded PRNG only where specified).
Project root: /mnt/agents/output/pure-synthia-automata/
Read docs/STATE_SPACE_SPEC.md first — it defines the semantics you implement.

## Exact export surfaces (every module MUST match these)

### src/state-space/constants.js
```js
export const WHEEL_ARCSECONDS = 1296000;
export const GATE_ARCSECONDS = 20250;   // 5°37'30"
export const LINE_ARCSECONDS = 3375;    // 0°56'15"
export const SCALES = ['feature','phoneme','grapheme','morpheme','word','phrase','clause','sentence','discourse','automaton','mesh'];
export const DIMENSIONS = ['Movement','Evolution','Being','Design','Space'];
export const DIMENSION_META = { Movement:{interrogative:'Where',operation:'transition',seedGate:1,octave:2}, Evolution:{interrogative:'What',operation:'transform',seedGate:2,octave:3}, Being:{interrogative:'When',operation:'instantiate',seedGate:6,octave:4}, Design:{interrogative:'Why',operation:'structure',seedGate:14,octave:5}, Space:{interrogative:'Who',operation:'integrate',seedGate:20,octave:6} };
export const TRIGRAMS = [ // Fu Xi order, bits bottom-to-top, value = binary
  {id:'kun',name:'Receptive',element:'Earth',bits:[0,0,0],value:0},
  {id:'zhen',name:'Arousing',element:'Thunder',bits:[1,0,0],value:1},
  {id:'kan',name:'Abysmal',element:'Water',bits:[0,1,0],value:2},
  {id:'dui',name:'Joyous',element:'Lake',bits:[1,1,0],value:3},
  {id:'gen',name:'KeepingStill',element:'Mountain',bits:[0,0,1],value:4},
  {id:'li',name:'Clinging',element:'Fire',bits:[1,0,1],value:5},
  {id:'xun',name:'Gentle',element:'Wind',bits:[0,1,1],value:6},
  {id:'qian',name:'Creative',element:'Heaven',bits:[1,1,1],value:7} ];
export function mulberry32(seed); // deterministic PRNG factory, returns ()=>[0,1)
```

### src/state-space/addressing.js
```js
export function addressForArcSec(arcSec); // -> {gate(1-64),line(1-6),color(1-6),tone(1-6),base(1-5),degree,minute,second,arcSecond,zodiac(1-12),house(1-8)}
export function arcSecForAddress(addr);   // inverse
export function gateBits(gate);           // gate 1-64 -> [6 bits] Fu Xi binary (line1 first)
export function gateFromBits(bits);
export const KING_WEN_TO_FUXI_DECIMAL = {1:63, ...}; // full 64-entry table (King Wen gate# -> Fu Xi decimal 0-63) — take from merged/kingwen.js data if present, else embed
export function hamming(a,b); // two 6-bit arrays -> 0-6
export function addrKey(addr); // "G{gate}.L{line}.C{color}.T{tone}.B{base}"
```

### src/state-space/sounds.js
```js
export function soundFor(address); // -> {freq, cents, octave, scaleDegree, timbre('sine'|'triangle'|'square'|'sawtooth'|'pulse'|'noise'), duration(beats), velocity, rhythmicSlot(0-7)}
// Rules: zodiac(1-12) -> pitchClass = (zodiac-1); base 432Hz; cents = arcSecWithinSign/108000*100;
// line -> SCALEGRAM = [0,2,5,7,9,10][line-1]; octave = DIMENSION_META[dim].octave (dim from address.planetaryDimension or default 'Being');
// color -> timbre map 1..6; tone -> duration map [0.25,0.5,1,1.5,2,4]; base -> velocity [0.4,0.55,0.7,0.85,1.0]; house -> slot (house-1).
export function transitionSound(transitionId, address); // soundFor + transition modifier from transitions.js
```

### src/state-space/colors.js
```js
export function colorFor(address); // -> {hue(0-360), sat(%), light(%), hex, layer('stroke'|'fill'|'glow'|'frame'|'ground')}
// hue = totalArcSec/WHEEL_ARCSECONDS*360; sat = 30+line*10; light = 25+tone*7; layer from dimension.
export const COLOR_ANCHORS = {1:'#8C4A2F',2:'#C28E3C',3:'#3C6E8C',4:'#6E8C3C',5:'#7A5A8C',6:'#D9C98C'};
export function transitionColor(transitionId, address); // colorFor + transition effect (hue shift etc.)
export function hslToHex(h,s,l);
```

### src/state-space/transitions.js
```js
export const NAMED_TRANSITIONS = [ {id,symbol,effect,soundEffect,colorEffect,operatorId}, ... 16 entries ];
// ids: ignition flow weakening dormancy reactivation fusion chain mirror shadow rotation core becoming perspective recursion weave automatize
export function transitionById(id);
```

### src/state-space/features.js
```js
export const FEATURES = [ {id:'f.voice', contrast:'[±voice]'}, ... ]; // sub-letter distinctive features (spec §8)
export const PHONEMES = [ {id:'p.p', ipa:'p', bundle:['f.place.lab','f.manner.stop','f.voiceless'], scale:'phoneme'}, ... ]; // >=24 consonants + >=12 vowels
export function bundleSignature(featureIds); // canonical sorted "axis:value|..." string
```

### src/state-space/letters.js
```js
export const LETTERS = [ {char:'a', index:0, kind:'vowel'|'consonant', phonemes:['p.ei',...], candidateAddress:{...}, sound:{...}, color:{...}}, ... 26 ];
export function letterState(char); // full state object
```

### src/state-space/lexicon.js
```js
export const TOOL_IDS = [ /* exact 16 ids in registry order */ ];
export const TOOL_ALIASES = { 'auto-ling':'autoling', 'iching':'iching-grammar', 'monte-carlo':'historical-monte-carlo', 'coder':'computational-grammar-coder', 'morph':'morph-mir', 'novel':'autonovel', 'research':'research-browser', 'form':'browser-form', 'analogy':'klein-analogy', 'contact':'language-contact', 'grammar-coder':'computational-grammar-coder' };
export const KEYWORDS = { chain:['then'], addressMarker:['at'], flagPrefix:'--' };
export const SEED_WORDS = [ {word, pos} ... ]; // ~60 words: DET/PREP/CONJ/PRON/AUX closed classes + common NOUN/VERB/ADJ/ADV for the parser's POS tagging
export function posGuess(word); // closed-class lookup + suffix heuristics (ing/ed->VERB, ly->ADV, tion|ness|ment|ity->NOUN, able|ible|ful|ous->ADJ, else NOUN)
```

### src/state-space/operators.js
```js
export const OPERATORS = [ {id:'o_bundle',arity:'variadic',name:'Fusion',invariants:[...],transform(operands,context)}, ... 12 operators per spec §4 ];
export function operatorById(id);
// bundle: members w/ constituent identity preserved; sequence: positional, order-sensitive;
// mirror/shadow/rotation: bit transforms on 6-bit gate patterns (involutions); core: nuclear trigram bits [1,2,3] and [2,3,4];
// becoming: apply changing-lines mask (xor) -> target gate; perspective: re-tag dimension; recursion: apply inner operator depth-limited;
// weave: discourse composition; automatize: wrap {states,transitions} descriptor -> automaton spec object.
```

### src/state-space/dimensions.js
```js
export function projectDimension(state, fromDim, toDim); // T_{i->j}: returns re-tagged representation {identity, dimension:toDim, representation...}
export const DIMENSION_CHAINS = { Movement:['wait','prepare','move','transition'], Evolution:['retain','notice-change','adapt','transform'], Being:['remain-self','notice-other','relate','negotiate-relation'], Design:['sense','classify','build','test','mount'], Space:['witness','integrate','express','complete'] };
```

### src/grammar/tokens.js
```js
export function tokenize(input); // -> [{type:'word'|'string'|'number'|'flag'|'punct', value, position}]
// strings: 'single' or "double" quoted; flags: --name or --name=value; numbers: int/float; punct: . , ( )
```

### src/grammar/grammar.js
```js
export const GRAMMAR = { rules: [ {lhs:'chain', rhs:['call','THEN','chain'], note:'two-call+ chaining (right-assoc)'}, {lhs:'chain', rhs:['call']}, {lhs:'call', rhs:['TOOL','args']}, ... ], terminals:{...}, nonterminals:[...] };
// Descriptive + used by parser tests. Must document the full tool-call language of spec §10.
```

### src/grammar/parser.js
```js
export function parseChain(input); // -> {calls:[ParsedCall], chainLength}
// ParsedCall = {tool (canonical id), args:[string|number], address:null|{gate,line?,color?,tone?,base?}, flags:{}, raw, ast}
// ast = {node:'call', children:[...]} — the parse tree as composite.
export class ParseError extends Error { constructor(msg, {position, expected}) } // message must list known tool ids when tool unknown
export function posTagWords(words); // uses lexicon.posGuess
```

### src/mesh/packet.js
```js
export class StatePacket { constructor({id,from,to,kind='data',payload,address=null,activation=1,derivationId=null}); toJSON(); static fromJSON(); }
```

### src/mesh/mesh.js
```js
export const PROJECTIONS = ['knowledge','causal','phase','temporal','dependency'];
export class AutomataMesh {
  constructor();
  register(automaton);                    // by automaton.id; throws on duplicate
  connect(fromId, toId, {outputPort='output', inputPort='input'} = {}); // typed-port check
  route(packet);                          // deliver to automaton `to` (returns receipt)
  addEdge(projection, fromState, toState, relation, metadata={});
  neighbors(stateId, projection);
  metrics(); // per-projection {nodes, edges, avgDegree}
  snapshot();
}
```

### src/automata/automaton.js
```js
export class Automaton {
  constructor({id, address, states, alphabet, delta, q0, finals=[], ports, capabilities=[], dimension=null, implementation=null});
  // states: [{id, name?, accepting?, initial?}]; delta: (stateId, inputSymbol, ctx) -> {to, transition (NAMED id), output?, emit?}
  step(stateId, symbol, ctx);             // uses delta; records trace step {from,input,transition,to,sound,color}
  run(input, context={});                 // if implementation: call it within automaton lifecycle; else drive delta over input symbols
  // returns { output, trace, ledger:{primitivesActivated,statesGenerated,edgesTraversed,operationsExecuted,recursionDepth,activeAutomata,transitionCount}, accepted, finalState }
  exportState(); hydrate(state);
  manifest(); // ato.automaton.v1-compatible shape
}
```
Sound/color on each trace step: transitionSound/transitionColor(transition, this.address).

### src/automata/registry.js
```js
export const TOOL_REGISTRY = [ {id, aliases, className, gate, channels:[], capabilities:[], ports:{in:[...],out:[...]}, automatonForm, dimension, description}, ... 16 ];
export function resolveTool(nameOrAlias); // -> registry entry or null
export function createAllTools();         // -> Automaton[] instantiated (16)
```

### src/engine/ledger.js
```js
export class ComplexityLedger { constructor(); record(delta); snapshot(); merge(other); toJSON(); }
// fields: primitivesActivated statesGenerated edgesTraversed operationsExecuted recursionDepth activeAutomata transitionCount
```

### src/engine/derivation.js
```js
export function stableStringify(x); export function fnv1a32(str); export function hashObject(x);
export class Derivation { constructor({id,input,parse,primitives,operators,relations,context,transforms,output,evaluation,ledger,engineVersion,grammarVersion}); get hash(); toJSON(); }
```

### src/engine/synthia.js
```js
export class SynthiaAutomata {
  constructor();                            // builds mesh + registers 16 tool automata + seeds letters/features into state space
  call(input, context={});                  // parse -> per call: resolve tool, automaton.run(args) -> StatePacket -> route to next automaton in chain (two-call: B receives A's packet as input.packet)
                                            // returns Derivation { output: lastCallOutput, chainResults:[...], ledger, hash }
  listTools(); meshMetrics(); replay(derivationJSON); // replay -> {status:'REPRODUCED'|'MISMATCH', hashMatch}
}
```

### src/merged/ (merge agent; each file self-contained, zero deps except state-space)
- `ato-analogy.js`: `xnorBits(a,b)`, `xorBits(a,b)`, `completeAnalogy(a,b,c)` (c * (a xnor b) — 6-bit), `strongEquivalence(strA,strB)` string form, `solveAnalogy(X,Y,Z)`, `hammingStr(a,b)`
- `kingwen.js`: `KING_WEN_TO_FUXI_DECIMAL` (64 entries), `gateToFuXiDecimal(g)`, `fuXiDecimalToGate(d)`
- `fuxi-encoder.js`: encode/decode/flipLine/getNeighbors/getOpposite(complement bits)/getInverse(reverse bits)
- `dimension-router.js`: `class DimensionRouter {route(text)->{status,dimension,score,seedGate,interrogative,operation,tokens}}` with vocabularies: Movement≈['move','go','where','transition','change','travel','path','shift','begin','start','run','flow','journey','impulse','action']; Evolution≈['what','evolve','grow','learn','adapt','memory','remember','transform','become','develop','pattern','history','gravity']; Being≈['when','be','exist','body','survive','present','now','witness','is','am','matter','touch','alive']; Design≈['why','design','structure','plan','build','shape','form','architect','compose','arrange','smell','frame']; Space≈['who','integrate','space','person','relation','field','hear','context','meaning','personality','network','whole']
- `tool-factory.js`: `TOOL_LEVELS` 0-7 (Base/Tone/Color/Bigram/Trigram/Hexagram/Channel/Circuit with cue words), `stableId(str)`, `class ToolFactory {generate({purpose,input,dimension?,level?,gate?}) -> {tool:{id,name,address,level,execute(input)}}}` — deterministic; address rule: targetGate=((gate+level*7-1)%64)+1, line=(level%6)+1, color/tone=((line-1)%6)+1, base=((line-1)%5)+1. Runtimes: L0 echo, L1 yin/yang classify (gate LSB), L2 filter by address fields, L3 Jaccard matcher, L4 analyzer (counts + feature bundle), L5 rule accumulator, L6 addressed event packets, L7 Markov text gen (seeded).
- `scene-grammar.js`: `class SceneGrammarRule {constructor({id,type,weight,condition,action}); matches(context); reinforce(reward)}`, `class SceneGrammar {addRule, select(context), reinforce(id,reward)}`
- `gate-field.js`: `class GateLocus {constructor(gate); meet(other)->{pair,overlap,tension}}`, `class GateProcessField {constructor(); locus(gate); tick(externalState); meetAll()}`
- `centers-channels.js`: `CANONICAL_CHANNELS` (36 pairs), `CENTERS` (9: Head[64,61,63], Ajna[47,24,4,11], Throat[62,23,56,35,12,45,33,20], G[1,13,25,46,2,15,10], Heart[40,26,51,21], Solar[29,30,36,6,55,37,22], Spleen[48,16,44,57,50,32,18,28], Sacral[5,14,29,34,59], Root[58,38,54,19,39,41,53]), `channelsForGate(g)`
- `lawful-grammar.js`: `class LawfulGrammarConstructor { automatonSpec({observer,choice,transition,memory,expression}) -> spec object with invariants ['preserve-local-identity','no-claim-without-evidence','reversible-before-adoption','no-global-boss'] }`
- `mesh-memory.js`: `publicAddress(addr)` -> {gate,line,color,tone,base} only; `class AnticipatoryMemory {observe(addr,precedent); recall(publicAddr); contribute(addr,data) -> sanitized}`

## Hard rules
1. `Automaton.run()` returns `{output, trace, ledger, accepted, finalState}`; every trace step carries named transition id + sound + color.
2. Exact 16 tool ids; aliases resolve via lexicon TOOL_ALIASES.
3. Two-call chain: `A "x" then B` — B's automaton.run receives `{args:[], packet:<StatePacket from A>}`; B's implementation must use packet.payload when present.
4. Parser: unknown tool -> ParseError whose message lists all 16 ids.
5. Ledger records the 7-tuple on every run; engine merges per-call ledgers.
6. No imports from engine/ or demo into state-space/, grammar/, mesh/, automata/, merged/.
7. Stateful tools persist memory across calls (their Automaton instance holds ownedState).
8. Every file starts with a one-line comment: `// Pure Synthia Automata — <module role>`.
