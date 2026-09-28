# SOURCE MATRIX — Pure Synthia (bias-cleared epistemology reset)

**Rule of this document:** Represent first. Compare second. Test third. Canonize last.
No source is ranked above another. No reconciliation. No gap-filling. Authority is deferred:
*authority comes later based on the question being asked.*

---

## 1. Method preamble

**Claim types** used in cells and index:

| Tag | Meaning |
|---|---|
| SOURCE_STATEMENT | What the source itself states, in its own terminology |
| STRUCTURAL_MATH | A formal/mathematical structure asserted or verified |
| IMPLEMENTATION_CHOICE | Something the project's code/datasets already do |
| PROJECT_HYPOTHESIS | The author-corpus's own posits (Tab 1, crystals, USF, pipelines) |
| DERIVED_RESULT | A brief-author's extraction/analysis layer (e.g. "candidate dimension attribution" sections) |
| EXPERIMENTAL_RESULT | Verified checks (e.g. dataset↔code bit-identity) |
| CONFLICT | Registered cross-source or intra-source disagreement (see §4) |

**Null rule.** `null` = the source does not address the topic. Nulls are never guessed, never
back-filled from another source, and never "repaired." Where a brief itself is ambiguous, the cell
says what the brief says + `[uncertain]` (pass-through from the brief).

**Neutrality rules.** Sources are listed alphabetically and evenly; there is no "canonical" column
and no winner column. Every cell carries a citation `[file §/line or book page]`. The two
"project-side" columns (Inventory, Author master doc) are sources like any other — their claims are
PROJECT_HYPOTHESIS / IMPLEMENTATION_CHOICE, not verdicts.

**Source key (alphabetical; tag = column header):**

| Tag | Source | Brief file |
|---|---|---|
| ADL | Joseph A. Adler, *The Yijing: A Guide* (2022) | adler-yijing-guide.md |
| AUT | Project author's master document (generative grammar) | generative-grammar-master.md |
| BB5 | Ra Uru Hu, *The Human Design System* ("Black Book", 1991/92) | black-book-5.md |
| DAO | Maja D'Aoust, *The Occult I Ching* (2019) | daoust-occult-iching.md |
| DAT | Structured datasets report (Hatcher JSON / Gnostic JSON / research_tool) | datasets-report.md |
| GOV | Lama Anagarika Govinda, *The Inner Structure of the I Ching* (1981) | govinda-inner-structure.md |
| HAT | Bradford Hatcher, *The Book of Changes: Yijing, Word by Word* (2009) | yijing1-2.md |
| INV | Existing code inventory (src/state-space baseline) | existing-inventory.md |
| MOG | Hanna Moog & Carol K. Anthony, *I Ching: The Oracle of the Cosmic Way* (2002) | moog-cosmic-way.md |
| MOR | Steve Moore, *The Trigrams of Han* (1989) | moore-trigrams-of-han.md |
| REI | Sam Reifler, *I Ching: A New Interpretation for Modern Times* (1974) | reifler-new-interpretation.md |
| RUT | Richard Rutt, *The Book of Changes (Zhouyi): A Bronze Age Document* (1996) | zhouyi-bronze-age.md |
| SIC | Alex Chiu, *Super I Ching* (Wen Wang Gua / Najia course) | super-iching.md |
| WEN | Benebell Wen, *I Ching, The Oracle* (2023) | wen-oracle.md |

Citation shorthand: `[adler §2.6 p.70]` = brief file's section + printed book page;
`[ggm §1a L17–30]` = master-doc brief section + raw-file lines; `[inv line 17]` = inventory line.
DERIVED_RESULT cells cite the brief's own §5/§H analyst tables and are marked `(brief-analyst layer)` —
these are NOT source statements.

---

## 2. THE MATRIX

### Group A — State space & primitives

| Topic | ADL | AUT | BB5 | DAO | DAT | GOV | HAT | INV | MOG | MOR | REI | RUT | SIC | WEN |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **A1. Line primitives (yin/yang; 2 vs 4 line types; marks)** | solid⚊=yang, broken⚋=yin; firm/yielding; 4 types young(7,8)/mature(9,6); "modes of qi" [§1.1 p.3,21–30] | yang solid = subject–verb unity; yin broken = subject/object split; changing = mirror; stable = nested [§6h L1745–56] | 64 gates = 32 yin + 32 yang spectrum, Hex 2→Hex 1 [§1.4 p.20] | 4 kinds: yin/yang × changing/static; marks X (yin) / O or dot (yang) [F2 p.35–36] | binary strings '0'/'1', line-1 (bottom) first [§1] | 2 types only; line = direction vector (up/down); binary-computer analogy; moving lines marked ○/□ [§1.1 p.11,26,71] | Rou O/0 vs Gang I/1; casting 6=X, 7=solid, 8=broken, 9=0 [§C, conventions] | 6/7/8/9 numeric layer absent (gap #4); transforms exist [line 31] | light line = Cosmic Consciousness = Yes; dark = Nature = No [§1.1] | yang light/firm, yin dark/yielding; casting nos. 7 stable yang, 9 changing yang, 8 stable yin, 6 changing yin [B2 p.16–17] | 4 tokens: 6 moving yin —x—, 7 yang, 8 yin, 9 moving yang —o—; inversion: "Yang directs action, Yin IS action" [§1.1–1.2 p.23] | whole/broken; stable/changeable = later formalization; shorthand jiao X / dan — / zhe - - / chong O [§3.2 p.156] | 4-token alphabet: —, - -, O (moving yang), X (moving yin) [§1.1] | full polarity table; line titles 初九/六二…; odd places yang, even yin [F1, F4] |
| **A2. Existence/nature of 64-state space; encoding** | 2^6 = 64; each = "pattern or type of situation"; xiantian binary 0–63 (top-down valuation); possible numeral origin (1,5,6,7,8) [§1.5 p.3; §1.7 p.99–103; §1.1 p.29–30] | 64 gates × 6 lines × color × tone × base + DMS arc-second address = "cosmic coordinate" [§6a L2979–80; §3c L5529–32] | 64 hexagrams as "Constellations", each 5°37'30" of ecliptic [§1.2 p.12] | "sixty-four permutations of the eight bagua"; Leibniz/Bouvet binary noted [F8 p.17; C2 p.25–26] | hexagram 1..64 King Wen = sole primary key; binary verified bit-identical to code [§1, §4d] | 64 = "sixty-four movements"; projected = multi-faceted diamond; 8 doubled trigrams = inner movements [§1.9 p.145–169] | "six-digit binary numbers 00–63… they are numbers" (Xian Tian, yang=2^(n−1)); 78 diagrams = 2+4+8+64 [§C v2 p.15] | gateBits/gateFromBits; KING_WEN_TO_FUXI_DECIMAL bijective (verified); 64-loci gate-field [lines 17, 23] | 62 hexagrams = Cosmic Principles; Hex 1 = all principles; Hex 2 = Nature's [§1.3] | five-line precursor hypothesis: 32 original figures, 6th line interpolated → 64 [§A p.33–35] | "Sixty-four was found to be the most convenient number (…requires a square number)" [sic — 64 is not square; as stated §1.6] | pre-figural bagua numerals: 6-digit groups e.g. 766718; odd→whole, even→broken; hexagrams never numbered, only tagged [§3.1 p.98–100; §3.3 p.101] | 6 lines; looked up in 8 groups keyed by bottom gua (8-palace organization) [§1.1] | Leibniz 3-bit trigrams 000–111 [C24]; 64 codon parallel [C25]; phantom 65th hexagram Xuán [C21] |
| **A3. Trigram set & attribute system** | Table 1.2 image+virtue; Shuogua 7–10 virtues/animals/body/family; Table 1.5 full grid (Fuxi dirs/seasons) [§1.3, §4.3] | trigram→dimension lookup ( Heaven→Space/Movement … Lake→Design ); Dimension→WuXing+2 trigrams each [§8 L3688–3718, L4320–35] | null (gates seat in centers; no trigram attribute system) | null — no systematic trigram tables (confirmed negative) [header] | names only via trigram_note "X below, Y above" [§1] | master table pp.45–47: image/polarity/family/movement-code/principles/psych. qualities/states/hour/direction/season/body/function; 4 structural classes (universal/organic/elemental/inorganic) [§1.4–1.5] | full Ba Gua entries: binary, keywords, Shuogua glosses, Zhen/Hui behavior, Shao Yong names, winds, time, space, body, senses, element, Qabalah/tarot/astrology [§E3] | TRIGRAMS in Fu Xi order, names only — no attribute matrix (gap #1) [lines 18, 27–28] | trigrams = 8 consciousness types ("Cosmic Family"); traditional correspondences explicitly rejected [§1.2] | master list: nature image/quality/family/element; element attribution varies by arrangement [§B4, C1–C3] | idiosyncratic table: 5 attributes, family, animal, anatomy, element (Grass/Soil/Wood/Stone/Air/Fire/Flesh/Metal), color, season, direction [§1.4 pp.14–15, uncertain OCR] | Table 19 Zuo-stratum: natural force + family only; Shuogua ¶7–11 lists; Zhouyi itself "no consciousness of trigrams" [§5.1–5.2 p.174,447–9; p.98] | 8 gua × 23-slot Meihua lists (weather…colour/number/taste); idiosyncratic romanizations [§1.8] | 8×20 master matrix: wuxing, direction, ritual tool, planet, zodiac, moon phase, hours, sound, body, totem, immortal, archetype [§C1] |
| **A4. Line-place semantics (6 places)** | built bottom-up; centrality zhong (2,5), correctness zheng (yang-odd/yin-even), ruler (5th or meaning-line), correspondence ying 1↔4/2↔5/3↔6 [§1.2, R-A5–A8 p.39–40] | Line = sixfold subdivision; style of expression; exalt/detriment binary polarity; 384 gate-line names [§6a L2673; §9] | 6 lines per gate, each 56'15"; per-line keynote + exalted/detriment planet [§1.2, §1.4–1.5] | 6-place lens grammar: 1 Self, 2 Other, 3 unification, 4 Earth, 5 conflict, 6 view-from-above [R3 p.37–38] | null (no per-line content) [§1–2] | place parity (odd yang/even yin) + strata EE/MM/HH; social names (5=Ruler, 4=Minister, 3=transition, 2=Official); 6×10-year life slicing [§1.2 p.31,70–71] | Yao Wei: Xi Ci II.9 + Shchutskii arc; body/people/situation/structure lists; binary place-values 32..1; Yao De rule-set (Zhong/Dang/Zheng/Ying/Fen/Bi/Lin/rulers) [F13–F14 p.25–29] | null — known gap #2 [line 29] | null — no place-rank semantics; lines = sub-principles (confirmed negative) [§1.4] | trigram lines Earth/Man/Heaven; hexagram: 1&6 "outside the action", 2 official, 3 transition, 4 minister, 5 king [B3 p.17,141] | null — no systematic place doctrine; imagery only [§1.8] | line numbers = late (Warring-States) insertion; meaning moves base→top; supernumerary yong lines (Hex 1/2) [S5; §3.2, §3.6] | J= self line / U= opponent line fixed per hexagram; 6 animals assigned to lines 1–6 by day stem [§1.2, §1.5] | seven parallel systems: Five Ranks, feudal hierarchy, narrative arc, six chapters, changing-line positions, Buddhist lens, ancestral; line 5 = ruler/crux [C26, R4] |
| **A5. Nuclear trigrams** | hugua = lines 2-3-4 & 3-4-5; attr. Jing Fang; "up to four trigrams" per hexagram [§1.4 p.10,81–82] | nuclear hexagrams lines [2,3,4]/[3,4,5] in grid pipeline [§6f#9 L4179–4200] | null | "interior hexagrams" via Karcher manipulation toolkit [R5 p.40] | hu gua + zhi hu gua fields; 16 nuclei listed [§1] | "inner signs" C=2-3-4, D=3-4-5; subconscious/compensatory [§1.7 p.70] | Hu Gua rule; only 16 nuclei, each nucleus of 4; 4 second-order nuclei; full table [F8 p.18–19] | null — known gap #3 [line 30] | null (searched; negative) [§1.4] | null | "inner trigrams" lines 2,3,4 / 3,4,5 (footnote to Wilhelm) [§1.5 p.16] | null | null (hiders are palace-based, not nuclear) [§1.2] | null — F7 heading says "Nuclear/structural transforms" but content = Gua Bian flips only [uncertain] [F7] |
| **A6. Text strata & dating** | strata 1–10: gua → names → judgments → line statements → Zhouyi → Ten Wings (7 texts counted as 10) [§3.1] | no dating; uses Wing-era structures (Ban Xiang, Gua Bian, sovereign gua) [§6f#9] | Zhouyi text entirely absent; Wilhelm-style names kept [§3] | 10-slot entry template (number→…→all-lines-changing); Xi-Ci consultation quote [§4 S1, S3] | provenance/copyright strata of the two JSON extracts; no text layers [§1–2] | 3 strata: trigram layer (Fu Xi) / main text (King Wen + Duke of Chou) / Ten Wings; privileges Shuo Gua & Da Chuan [§3] | layer codes .M/.0/.1–.6/.T/.X/.xc/.wy/.sg/.xg/.zg/.m; Zhouyi 1100–800 BCE; "Ten Wings NOT a reliable guide" [§A] | Wilhelm/Baynes names ×64 in kingwen.js; hexagram texts = gap #9 [lines 23, 36] | Judgment + line sayings kept; Image stratum REMOVED (anti-Confucian rule) [§1.4] | line texts older than judgments; Shuo Kua latest + two-part; text fixed Early Han (136 BC?) [§A p.27–45] | works from Legge; discards commentarial structure [§2 G4] | S0–S9 stratification: numerals → oracles → indications → prognostics → compiled Zhouyi (825–800 BC) → line numbers → Zuo layer → Wings → Han canon → Song system [§1] | Zhouyi text entirely absent; classical source = Ming "Golden Text" (Wen Wang Gua) [header, §3] | Zhouyi basic classic (King Wen / Duke of Zhou attributions) + Ten Wings (Confucius attribution) [S1] |
| **A7. Primacy: trigrams-first vs hexagrams-first** | records both: received text "no awareness of trigrams"; Mawangdui trigram-based [§1.7 p.10–11] | null | null | trigrams implied prior: hexagrams = "permutations of the eight bagua" [F8 p.17] | null | trigrams first (Fu Xi, ~5000 yrs) [§3] | "no evidence trigrams existed when the Zhouyi was written"; but text construction implies early trigram-image use [§A; v2 p.22] | null | null | trigrams contemporary with or later than 6-line figures (five-line theory corollary) [§A p.33–35] | stacking 1→2→3→6 lines (trigram en route to hexagram) [§1.3 p.13] | hexagrams OLDER than trigrams: 3-numeral groups are later; "no consciousness of trigrams" in Zhouyi [§3.1 p.98–100] | trigram = indexing unit (bottom-gua groups) [§1.1] | trigrams first: Fuxi ordinal numbering 1–8 [F3] |

### Group B — Order, casting, operators, decision rules

| Topic | ADL | AUT | BB5 | DAO | DAT | GOV | HAT | INV | MOG | MOR | REI | RUT | SIC | WEN |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **B1. Sequence/arrangement systems** | King Wen pairs (inversions); Mawangdui; Fuxi xiantian binary (Shao Yong); houtian trigram wheel; family sequence; 12 sovereign gua; Eight Palaces; Yilin 4096 [§1.7] | five sequences ↔ dimensions: FuXi=Structure, KingWen=Time/Story, EightPalaces=Relation, Bigua=Rhythm, Mawangdui=Lineage [§7d] | Rave wheel = zodiacal gate order, explicitly NOT King Wen order [§1.2 p.33f] | Fu Xi vs King Wen mentioned as algorithm-changing; no diagrams [F12 p.40] | King Wen number = primary key; sovereign-gua months in Hatcher data [§1, §4] | Fu Xi axial/polar vs King Wen peripheral/temporal; Eight Houses generation rule; 2 four-cycles Abstract→Temporal; misplaced-hexagram hypothesis [R6, R8, R9, R17] | Hou Tian algorithm (even = inverse, else opposite); Xian Tian Xu 00–63; Mawangdui noted; Xian Tian Ba Gong 8×8 grid [F4; §C] | only Fu Xi order exists in code; Earlier/Later Heaven = gap #7 [lines 18, 34] | received order used; sequence-based speculation (11/12, 63/64, 12 calendar gua) rejected as false [G5] | THREE trigram arrangements (Senses/Thought/Elements) + Lo Shu T'ai I circuit; MWD rules + full 64-map; current-sequence pair rules [C1–C4, E1–E2] | null | received-order pairing (inversion/counter-change); Mawangdui octets; King Wen order first attested AD 175–183 stone tablets; xiantian = Song creation [§4.3; S8–S9] | 8 groups by bottom gua = 8-palace organization [§1.1] | King Wen (authoritative) / Mawangdui / Fuxi (Shao Yong); Lo Shu & He Tu maps; 12 sovereign + 4 perfected hexagrams; Plum Blossom numbers [S3, C4, C13–C14, C27] |
| **B2. Casting/number system (6/7/8/9, yarrow, coins, plum blossom, numerals)** | full yarrow algorithm (Zhu Xi recon.); coin method (Fire Pearl Forest); 6/7/8/9 = parity-purity detector (6=2+2+2…9=3+3+3) [§2.6 R-D1–D2; §1.6] | no yarrow/coin; DMS→gate/line→binary→changing-line conversion pipeline; CI formula decides collapse [§6f#4; §5b] | null — no casting; birth-time calculation (Personality + Design wheels) [R2] | 3 coins; 3T=changing yin, 3H=changing yang, 2T1H=static yin, 2H1T=static yang; turtle-shell/yarrow history note [R1 p.34–37] | null | OMITS 6/7/8/9 layer entirely (notable negative); yarrow = concentration ritual "imitating seasons"; coins deprecated [§1.10; R16] | 3 coins (2/3 sides) → 6/7/8/9; Chinese pref: 4-char side=2, Hatcher uses heads=2; Transitional Hexagrams multi-line method [R-H1; §C] | null — numeric casting layer = gap #4 [line 31] | 3 coins, heads=3/tails=2; sums 6–9; changing lines redefined as message pointers; rtcm yes/no verification protocol [§1.1; T1–T7] | casting numbers 7/9/8/6 only; counting-rod base-five hypothesis links broken/unbroken to 5/1 [B2; §A p.33] | yarrow 16-step (50 sticks) + coins (tails=2/heads=3); 6/7/8/9 [§1.1 pp.8–10] | Dayan wand math: 49 necessary & sufficient; 18 ops/hexagram; probabilities (1 moving ≈36%, none ≈18%); coins flatten odds; bagua numerals imply UNKNOWN method [§4.1; §3.1] | 3-coin grammar, 6 tosses bottom-up; no 6/7/8/9 numbers — tokens O/X; ritual limits (≤3–4 tosses/day) [§1.1] | yarrow per Zhu Xi w/ cosmological justification (55; 50/49); coins (two conflicting traditions; her choice = M&P); Plum Blossom numerology (rice-grain, calendar/horary formulas) [R1, R2, R7] |
| **B3. Pair/transformation operators** | changing lines (4096 matrix); gua bian; Eight Palaces generations + roaming/returning soul; pangtong full complement; nuclear extraction; waxing/waning 12-cycle; King Wen inversion pairs [§1.7, §2.5] | Axis = opposite-polarity gate (1↔2); inverse/opposite/reverse pairs + nuclear in grid pipeline; Gua Bian 7 change types; Fan Yao pairs; Ben→Zhi; composed operator O = B∘T∘M∘L∘G [§6a, §6f#9, §6g] | harmonic-gate pairing (channel partner); no inversion/complement operators [§1.2] | shadow line (fan yao) per line w/ lookup NN.n; relating hexagram; all-lines-changing section [F9–F11] | pang tong (opposite), qian gua (inverse/mirror), jiao gua (trigram swap — NOT in code), hu gua (core), zhi hu gua, shi er di zhi; math verified [§1 table] | complementary opposite O (all-lines invert); mirror-image reversal pairs; C1/C2 coordinated values; P parallel; reduplication S/S; 2 four-cycles [R6, §1.5, R9] | Qian Gua inverse (28 pairs), Pang Tong opposite (32; sum 63), Jiao Gua reverse swap (28), Hu Gua nuclear, Fan Yao (50 pairs), Zhi Gua interpolation, 12-branch permutation; 8 historical change-system types [F3–F9; §C] | 12 OPERATORS incl. reverse/inverse/converse/nuclear/change; involutions verified [line 14] | NO second hexagram; changing lines = messages, not transforms (explicit rule) [R5] | change 9→8 / 6→7; current-sequence pairing (inverse; opposite when self-inverse); rising/falling minority lines; polarity reversal at extremes; T'ai I circulation; lunar najia [G3, E2, M12–M13, M15] | moving lines flip → second hexagram; all-six-moving special texts (Hex 1/2) [R7–R8] | pairing rule: inversion; 8 non-invertible → counter-change; zhi citation "A zhi B" (line named by its target); changeable lines absent in Western Zhou [§4.3; §3.2] | moving lines flip → 2nd hexagram (stars inherit by element); bond/strike/combo/trap operators; advance/retreat through element sequence; 6-strike/6-match hexagram types [§1.1, §1.6–1.7] | transformed hexagram by flipping; King Wen pair logic (flips; boundary pairs = polarities); Wu Xing as change-agents between trigrams; dual solar-term systems invert [R1.8, R8, C7, C15] |
| **B4. Evaluation/decision rules (which text layer answers)** | Zhu Xi 8-case rule: 0 changing → Tuan; 1 → that line; 2 → both lines (upper rules); 3 → both Tuan (zhen/hui); 4 → 2 unchanged of result; 5 → 1 unchanged of result; 6 → result Tuan / Using-all [§2.6 R-D3] | Sentence Authority Resolver (Monopole > Design > Personality → line hierarchy → planetary rulership → yang-over-yin); CI collapse threshold; interpretation layers Literal→Emotional→Intentional→Resonant [§6f#1 L958–72; §5b] | activation rule (planet opens gate; 2 harmonic gates complete channel); definition rule; synthesis rule [R3–R4, R8] | read general + changing lines + shadow lines + relating hexagram; anti-prediction; "your reaction is the secret" [R2, R4] | null | question must be written, unambiguous, one clear answer; "only if two movements are fixed can we predict"; no sign inherently lucky — relation decides [R16; R14] | Yao Ci = interpolation between Ben and Zhi gua (central thesis); 146 zhi-referencing lines; Yao De auspice statistics [§C, F3, F14] | null (engine has derivation/replay/questions registry, no oracle decision table) [line 22] | rtcm protocol (yes/no verification, termination rule, Sage never answers twice); reading order name→Judgment→changing lines; no 2nd hexagram [T1–T7, R3, R5] | null — "not another work on divination" [§Preface p.7] | read general oracle + moving lines only; non-moving lines optional clarification; no-moving = static/end [R4–R6] | Nanjing rules: 55 − Σ(xiang) → indicated line via fixed table; 4 reading cases; validity "remains unresolved"; Zuo-practice statistics [§4.2] | appointed-star (yongshen) selection by question type; strength from month/date kill-produce field; kill/produce outranks bond/match; timing via strike/fulfill triggers [§1.3, §2 R5–R18] | cast-field protocol: primary Oracle → changing lines → transformed = if-then → parting lines; locked-hexagram rule (line 5 = crux); ≥3 changing = volatile [R3–R5] |
| **B5. Rule/operator grammar layer (system-level rule sets)** | complete operator algebra documented (ying/zheng/zhong/ruler + hexagram operators); xiangshu vs yili schools [§7; §3.3] | rule layers: binary sentence-form grammar; Gua Bian 7 types; 8 pipelines; NOTE: "the corpus never defines the project's 12 operators" [§6h, §6f, §10] | geometric/activation rule set R1–R8 [§2] | rule set R1–R5 (casting, reading, lenses, conduct, toolkit) [§3] | operator-verification table (Hatcher dims ↔ code transforms) [§1] | rules R1–R17 (place parity, direction vectors, houses, cycles, divination posture) [§2] | 8 change-system types of history; Yao De rule-set; 16 numbered rules R-H1–H16 [§C; F14; §G] | 12 OPERATORS in operators.js; 16 NAMED_TRANSITIONS [lines 14–15] | consultation prerequisites + rtcm + interpretive grammar G1–G5 [§2] | 15 numbered rules R-M1–M15 [§G] | casting + moving-line rules R1–R8; fixed interpretive format G1–G4 [§2] | casting grammar + Nanjing rules + composition rules + two-process model [§4] | ~40 explicit rules + "hundreds" of case annotations; kill/produce, bond/strike/combo/trap/empty; star-interaction matrix [§2, §6] | rules R1–R10 (yarrow, coins, cast-field, locked, multi-changing, ritual, Plum Blossom, layering, spellcraft, study levels) [§3] |

### Group C — Language, valuation, grammar

| Topic | ADL | AUT | BB5 | DAO | DAT | GOV | HAT | INV | MOG | MOR | REI | RUT | SIC | WEN |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **C1. Formulaic language / valuation terms (ji/xiong/hui/lin/wujiu; yuan-heng-li-zhen)** | formulaic oracular pronouncements (auspicious/danger/misfortune/disastrous, no blame); yuan-heng-li-zhen in 50 statements; Wenyan four-virtues reading [§3.1–3.2 p.32–36] | Yijing wrapper supplies tense/aspect ("Already complete" / "Not yet complete"); no ji/xiong inventory [§6b L1850–55] | per-line bipolar valuation: exalted/detriment planets ("not simply good or bad") [§1.4 p.20] | no omen-phrase glossary (deliberate deliteralization); per-hexagram mottos = valence layer [S2] | null (names/glosses only; no line texts) [§1–2] | not systematic; judgments = collections of wise statements; "good and bad luck… in the judgments" (SG I) [§3 p.31,37] | valence set Ji/Xiong/Hui/Lin/Wu Jiu + line-place statistics; yuan-heng-li-zhen = NOT four parallel ideas ("greatest rewards from sustained hard work"); si-de ↔ Si Xiang mapping (later layer) [§B; R-H16] | null — formulaic morphemes = gap #5 [line 32] | Wilhelm formulas retained w/ cosmic glosses + counts; misfortune = warning not prediction; yuan-heng-li-zhen = 4-step consultation process [§3, G2–G3] | mantic phrases ("Good fortune", "Perseverance", "Success") = one of 3 line-text sources, probably later [§A p.27–28] | full valence-morpheme inventory w/ counts (Auspicious ~132, Ominous ~53, No mistakes ~70…); yuan/heng/li/zhen verbatim only Hex 1–2 [§3, G2] | CORE SOURCE: 4-slot line grammar (oracle/indication/prognostic/observation); valuation inventory ji 147× / li 27× / jiu 100× (93× wujiu) / xiong 88× / hui 34× / lin 20× / ta 3×; yuanheng+lizhen = TWO items ("grand sacrifice" + "propitious prognostication"); rival glosses recorded [§2.1–2.4] | Zhouyi valuation text entirely absent; hexagram names = lookup labels only [§3] | phrase inventory w/ valence: jí/xiōng/wú jiù/lìn glossed; lì shè dà chuān; yuan-heng-li-zhen Confucian 4 virtues vs original Zhou ritual meanings [S2] |
| **C2. Symbol/punctuation alphabets** | changing line marked "x"; ⚊/⚋ figures [§1.6 p.31] | **19-mark Unified Syntax Field** (• . ° : ; , – ′ ″ "" () [] {} / \ * … = →) w/ metaphysical + linguistic + ontological columns; marks double as DMS coordinate syntax; punctuation-as-physics glosses [§3a–3d] | null | X / O / dot changing-line marks [F2] | null | mnemonic geometric marks: ○ heaven, □ earth, ∪ arousing, ∩ keeping-still, △ fire, ▽ water; moving lines ○/□ [§1.6, §1.1] | O/I line glyphs; W R H Y four-emblem letters; X/0 casting marks [conventions; §C] | 26 LETTERS + 41 PHONEMES + 21 FEATURES (project alphabet layer) [lines 10–12] | coin-sum notation ++, +++, – –, – – – record shorthand [T5] | null | —x— / —o— moving-line glyphs [§1.1] | jiao X / dan / zhe / chong O line-kind shorthand [§3.2 p.156] | 4-token cast alphabet (—, - -, O, X) [§1.1] | X marks changing lines [F5] |
| **C3. Generative sentence grammar** | null (but: "trigrams became part of the 'grammar' in which the natural world was described" [§6 p.19,90]) | **SOLE SYSTEM**: slot grammar (Dimension→Gate→Line→Color→Tone→Base→DMS→Axis→Zodiac→House); slot→part-of-speech table; 4 sentence templates; 8 pipelines incl. 5-layer routing engine; SSV = w₁S+w₂E+w₃R+w₄I; binary sentence forms [§6a–6h] | null | null | null | null | null | tool-call grammar + chain parser (parser.js) — implementation, not sentence generation [line 21] | null | null | null | Early Old Chinese register: parataxis "grammar of telegrams", no tense/case; prognostications in gnomic rhyme [§2.5] | null | null |

### Group D — Correspondence systems

| Topic | ADL | AUT | BB5 | DAO | DAT | GOV | HAT | INV | MOG | MOR | REI | RUT | SIC | WEN |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **D1. Color correspondences** | wuxing colors: blue-green/red/yellow/white/black [Table 1.3 p.24] | Color = motivation filter (6 archetypal motives, HD-derived); "resonance color" from Personality/Design beat frequency [§6a L2676; §5b] | center colors: Head yellow, Ajna green, Throat brown, Heart red… (items 4–8 OCR-garbled) [§1.3, uncertain] | null | null | wuxing colors green/red/yellow/white/(blue)black; diamond adds violet = combinations; Earth repeated at center [§4.3, §4.5] | per-trigram Shuogua colors (Zhen indigo+yellow, Xun white, Qian deep red, Kun black soil, Kan red…) [§E3 sg.11] | colors.js: hue = arcSec/1296000×360; sat=30+line×10; light=25+tone×7; 6 COLOR_ANCHORS [line 20] | null | direction colors: S red, W white, N black, E azure (ch'ing), Centre yellow [B6 p.20–22] | per-trigram colors: purple/black/orange/red/green/white/yellow/blue — idiosyncratic [§1.4, uncertain] | null (only stray color mentions inside Shuogua ¶11 lists, e.g. deep red) [§5.2] | 6 Animals/Colors (black tortoise, white tiger, grey serpent, yellow array, red bird, green dragon) assigned to lines by day stem; gua 'Colour' slot [§1.5, §1.8] | wuxing color row (green/red/yellow/white/blue-black); trigram color fields (Qian "sublime red", Wind white…) [C5, C1] |
| **D2. Sound correspondences** | five notes jiao/zhi/gong/shang/yu ↔ wuxing [Table 1.3 p.24] | audio engine: planetary modulators; gate frequencies (e.g. 312 Hz ± planet); 88° detune = binaural beat; dimensional gain curves [§7c; §5b] | null | null (only metaphor: qian = "string pulled taut… yields a specific tone") [S2 p.43–45] | null | "five tones in the scale of classical Chinese music" mentioned, not enumerated per trigram [§4.3 p.51] | null | sounds.js: 432 Hz base; zodiac→pitch class; line→hexagram scale [0,2,5,7,9,10]; dimension→octave [line 19] | null | trigrams correlated with "eight types of instrumental music" — NOT tabulated [§F p.56, gap] | null | null (gnomic-verse rhyme = delivery register, not tone correspondence) [§2.5] | null (B star semantics include sound/talking; not a tone system) [§1.3] | per-trigram Sound field (drumbeat, chimes, fast/high tempo, clamorous, arias/birdsong, mantras/minor keys, dark timbres, silence); NO pitch-pipe (律呂) system [C1; negative §2] |
| **D3. Channels/centers** | null | framework layer: Dimension→centers (Movement=G/Sacral/Root; Evolution=Head/Ajna; Being=SolarPlexus/Spleen; Design=Throat/Heart; Space=all); Eight Palaces ↔ Centers/Channels [§8 L3636–42; §7d] | **9 centers + 32 channels** (1991 ed.; later canon 36); harmonic-gate rule; center keynotes/glands/colors [§1.2–1.3] | null | null | null | chakra (Bindu) attributions per trigram in Wai Guang layer (extracultural) [§E3; §I] | merged centers-channels module (36/9); emergent channels θ=3 in engine [lines 22–23] | null | null | null | null | null | 8 doubled hexagrams = "Eight Spirit Helpers" w/ programmable functions (not channels) [R9] |
| **D4. Wheels/addressing (DMS, zodiac, Lo Shu, compass)** | Hetu (1–10, sums 25+30=55) & Luoshu (magic-15) maps; Luoshu trigram-map; Shao Yong 129,600-yr cycle; circular 64 diagram [§2.7 R-H1–H6] | full address chain + coordinate string; ° ′ ″ = resolution operators (orientation→sensation→environment); 88° Design/Personality offset [§6a, §3c, §5b] | **gate = 5°37'30"; line = 56'15"**; 12-sign zodiac ring; wheel order ≠ King Wen [§1.2 R1] | Lo Shu/Saturn magic-square metaphor; golden ratio phi as pattern-limit [C5; F14] | null | Lo Shu = center of Eight Houses diagram (magic 15, key 5); Fu Xi / King Wen compass tables; hours per trigram [§1.10; §4.1–4.2] | Xian Tian Ba Gong 8×8 grid (master coordinate system); Shao Yong circle: opposites sit opposite [§C; F6] | DMS wheel: 1,296,000 arc-sec; gate 20250″, line 3375″, color 562.5″, tone 93.75″, base 18.75″ [line 17] | null | Lo Shu trigram-number assignment via T'ai I circuit (K'an=1…Li=9; lines sum 15); Devil Valley 6-ring diagram; Eight Gates table; NO compass degrees (gap) [C4, D1–D2, §I] | null | hexagram reference chart = 8×8 image, not transcribed [§4] | null (Dayan 55 = number theology, not a wheel) [§4.2] | null (annotation grid + calendar header; no wheel) [§1.2] | Lo Shu grid (4 9 2/3 5 7/8 1 6) ↔ King Wen trigrams; feng-shui Lo Shu sectors; 24 solar terms ≈15° longitude; hour branches [C4, C15–C16, C27] |
| **D5. DNA/codons, tarot, astrology cross-mappings** | null for DNA/tarot; astrology-adjacent: najia stems, ganzhi 60-cycle, guaqi 24 solar terms, 12 sovereign gua [R-A15–A17; §1.7] | Gate 25 = Histidine codon; slot→physics compiler (Gate→codon/amino acid); zodiac/house/planet keyword lexicons [§6e; §6f#1 L944–50] | astrology IS the substrate: zodiac wheel, planets exalted/detriment per line; synthesis claim (Kabbalah, chakras, astrology, physics…) [§1.1–1.4] | tarot map for all 64 (her own set, 22 majors + 42 minors); DNA: Stent purine/pyrimidine vs Yan rival maps; serpent/daimon lexicon [C1–C3] | null | Schönberger genetic-code isomorphism: 64 codons; stop/start codons ↔ hexagrams 33/12/56 [§1.11 p.63–65] | Wai Guang: tarot/Qabalah/astrology per emblem + per trigram (flagged extracultural); 12-moon ↔ zodiac table [§E2–E3; F9; §I] | merged ato-analogy module [line 23] | null | lunar najia (6 trigrams ↔ stems ↔ moon phases); branches ↔ zodiac/double-hours; no DNA/tarot [C2; B8] | null | null (Dragon-star astronomy behind Hex 1 line series) [§3.4 p.291] | null | 12 dates = years/months/days/hours + animal signs; no DNA/tarot [§1.4] | DNA: Yan 1991 vs Yang Li 1998 rival maps; tarot: Crowley Thoth (21) + her own 72/78 system + phantom 9th gua; Qabalah 4 worlds; zodiac wheels; Bodhisattvas; physics-law Spirit Helpers [C18–C25, C11] |

### Group E — The project's five-dimension system

| Topic | ADL | AUT | BB5 | DAO | DAT | GOV | HAT | INV | MOG | MOR | REI | RUT | SIC | WEN |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **E1. Five dimensions Movement/Evolution/Being/Design/Space** | null as a 5-fold system; closest: xiantian=a priori / houtian=a posteriori 2-fold split [R-X1 p.106] | **DEFINES THEM**: Movement=Energy=Creation=Seeing=Landscape=Environment ("I Define"/"I Create"); Evolution=Gravity=Memory=Taste=Love=Light ("I Remember"); Being=Matter=Touch=Sex=Survival ("I Am"; one chain cell blank [L46]); Design=Structure=Progress=Smell=Life=Art ("I Design"); Space=Form=Illusion=Hearing=Music=Freedom ("I Think"/"I Communicate") [§1a, §1c, §8] | null | null | null | null as system; hint: KIAN=time-experience, KUN=space-experience as trigram-level qualities [§5 note p.45] | null as system; Needham row "four dimensions: Length/Time/Breadth/Depth" inside Si Xiang accretions [§E2] | 5 DIMENSIONS + DIMENSION_META implemented: Movement:Where/g1/oct2, Evolution:What/g2/oct3, Being:When/g6/oct4, Design:Why/g14/oct5, Space:Who/g20/oct6 [line 16] | null | null | null (artha/kama/moksha 3-fold interpretive split — unrelated) [§1.7] | null | null | null |
| **E2. Sense ↔ dimension mapping** | null | **Seeing→Movement, Taste→Evolution, Touch→Being, Smell→Design, Hearing→Space** (chain-verified); internal conflict: Taste at Tone 3 AND Tone 5 [§2] | null | null | null | bodily-function row per trigram (awareness/digestion/mobility/receptivity/visibility/"SPACE" [uncertain]/nourishment/reliability) — 8-fold, not 5-sense [§1.4 p.47] | per-trigram sense fields (8-fold): vision→Li, hearing→Kan, taste→Dui, olfaction→Xun, touch/proprioceptive→Gen, kinesthetic→Zhen, alimentary→Kun, cerebroception→Qian [§E3] | intake Q_t + 5 senses in engine [line 22] | null | null | null | null | null | null | wuxing sense row: Wood=sight, Fire=touch, Earth=taste, Metal=smell, Water=hearing [C5] |
| **E3. Space: first-class fifth dimension vs emergent condition** (CONFLICT row by design) | null (brief-analyst layer maps qi/model-of-heaven-earth to Space-as-container [§5 — analyst]) | **BOTH POSITIONS PRESENT**: (a) Space = dimension #5 with full chain (Tab 1) [§1a L66–76]; (b) "Space does not belong to these equations; it arises later as a condition produced by the interaction of the fields"; personality = interference pattern of the other four [§1a L6–8, L103–106]; plus 6th-dimension speculation (global phase/coherence) [§8 L5728–84] | null | null | null | null (brief-analyst: synchronicity = Space-as-resonance-container [§5 — analyst]) | null (brief-analyst: Hu Gua as "contextual matrix" → Space [§H — analyst]) | null (DIMENSION_META lists Space:Who/g20/oct6 as first-class) [line 16] | null (brief-analyst: Helpers/Sage/Centering → Space [§5 — analyst]) | null (brief-analyst: resonance/web → Space [§H — analyst]) | null | null | null (brief-analyst: stars/J-U as Space containers [§4 — analyst]) | null (brief-analyst: He Tu = innate flow map → Space [§5 — analyst]) |

---

## 3. AGREEMENT / DIVERGENCE INDEX (per topic)

Convention: AGREE = sources stating the same structure; DIVERGE = each position listed separately
with supporters (no winner); SINGLE = only one source addresses it (weak epistemic footing);
GAP = no source addresses it (candidate for hypothesis or experiment, NOT filled here).

**A1. Line primitives**
- AGREE: two line types, solid=yang / broken=yin — ADL, GOV, MOR, REI, RUT, SIC, WEN, HAT, DAO, MOG (as light/dark), AUT (as solid/broken sentence forms), DAT (0/1), INV (code).
- AGREE: four line types via changing/static (6/7/8/9 or token equivalents) — ADL, MOR, REI, RUT, HAT, DAO, SIC, WEN, MOG (sums only).
- DIVERGE (marks): ○/□ [GOV] · X/0 [HAT] · X/O-or-dot [DAO, RUT shorthand jiao/chong] · —x—/—o— [REI] · O/X [SIC] · "x" [ADL] · ++/– – shorthand [MOG].
- DIVERGE (semantics): yin/yang = modes of qi [ADL] · direction vectors [GOV] · Yes/No ur-vocabulary [MOG] · action inversion "Yang directs, Yin acts" [REI] · sentence-form primitives [AUT].

**A2. 64-state space & encoding**
- AGREE: 64 = 2^6 combinatorial closure — ADL, HAT, RUT, DAT, INV, AUT (stacked), GOV (movements), DAO (permutations), WEN.
- AGREE: binary encoding of the figures — HAT (00–63 "they are numbers"), ADL (xiantian 0–63), DAT (verified bit-identical), INV (gateBits), WEN (Leibniz), DAO (Leibniz/Bouvet), GOV (computer analogy).
- DIVERGE (encoding substrate): 6-bit binary [HAT, ADL, DAT, INV, WEN, DAO] · 6-digit numeral groups, odd/even→whole/broken [RUT] · ecliptic arc-slices [BB5, AUT DMS, INV DMS] · movements/diamond [GOV] · 62 principles + 2 meta [MOG] · 64+1 (phantom 65th) [WEN] · 32 original 5-line figures [MOR].
- DIVERGE (nature): situation-patterns [ADL] · ways of life [REI] · oracle symbols/daimons [DAO] · energy fields [BB5] · tags/labels only [RUT, ADL "tags"] · language of God formula [SIC].

**A3. Trigram attributes**
- AGREE (core Shuogua set): image/family/body/animal per trigram — ADL, GOV, HAT, RUT, MOR, WEN, REI (with deviations), SIC (Meihua lists).
- DIVERGE (element attribution): standard wuxing map [MOR B4, WEN C1] · only 5 of 8 trigrams are elements, Lake=Iron [GOV R11] · idiosyncratic 8-element set (Grass/Stone/Air/Flesh…) [REI] · scale-of-four Greater/Lesser set (Qian=Greater Air…) [HAT E3] · project dimension-map (Thunder+Wind=Movement/Wood…) [AUT §8]. → C-M13.
- DIVERGE (animals): Qian=horse, Zhen=dragon (received) [ADL, MOR, RUT, WEN] vs emended swap Qian=dragon, Zhen=horse [HAT]. → C-M24.
- SINGLE: consciousness-type replacement of ALL correspondences [MOG]. 8×20 matrix incl. ritual tools/immortals [WEN]. 23-slot Meihua lists [SIC].

**A4. Line-place semantics**
- AGREE: bottom-up build/read — ADL, GOV, MOR, HAT, RUT, REI, WEN, SIC, DAO, MOG, BB5, AUT.
- AGREE: place 5 = ruler/crux — GOV, ADL, MOR, WEN (R4), HAT (rulers table).
- DIVERGE (place meanings): social ranks EE/MM/HH [GOV, MOR] · zhong/zheng/ying formal rules [ADL, HAT] · narrative arc base→peak [RUT, HAT Shchutskii] · Self→Heaven lenses [DAO] · Five Ranks + 6 other parallel systems [WEN] · J/U self/opponent [SIC] · exalt/detriment keynotes [BB5, AUT] · NONE by design [MOG, REI].
- GAP (code-side): INV gap #2 (not implemented).

**A5. Nuclear trigrams**
- AGREE (rule): lines 2-3-4 and 3-4-5 — ADL, GOV, HAT, REI, AUT, DAT (verified), DAO ("interior").
- DIVERGE (semantics): subconscious tendencies [GOV] · latent matrix/seed [HAT] · interpretive expansion [ADL, attr. Jing Fang] · (no semantics) [REI].
- SINGLE: 16-nuclei/4-domain closure + 4 second-order nuclei [HAT; DAT carries fields].
- GAP (code): INV gap #3.

**A6. Text strata**
- AGREE (layered text): ADL, RUT, MOR, HAT, GOV, WEN all stratify; Zhouyi core + Ten Wings shared.
- DIVERGE (dating/order): line texts OLDER than judgments [MOR] · no evidence either way, judgments "most defective" [RUT] · judgments attributed King Wen, lines Duke of Zhou (traditional) [ADL, WEN] · Wings unreliable [HAT] · Wings privileged Shuo Gua/Da Chuan [GOV].
- DIVERGE (stance): strata retained [ADL, WEN, HAT, RUT, MOR, GOV] · Image stratum removed [MOG] · text absent entirely [SIC, BB5] · structure discarded [REI] · mottos replace [DAO].

**A7. Trigram primacy**
- DIVERGE: trigrams first (tradition) [GOV, WEN, REI, DAO implied, SIC implied] vs hexagrams first [RUT, MOR, HAT qualified] vs ADL records both. → C-M9.

**B1. Sequences/arrangements**
- AGREE (existence of the same set): King Wen received, Mawangdui, Fuxi/xiantian, houtian wheel — ADL, MOR, HAT, RUT, WEN, GOV.
- AGREE (King Wen pair rule): inverse pairs, complement when self-inverse — MOR E2, HAT F4, RUT §4.3, WEN R8; ADL states inversions but omits the complement refinement [§1.7, noted gap].
- DIVERGE (antiquity of xiantian): primordial [GOV, WEN] vs Song creation [ADL, RUT, MOR, HAT]. → C-M12.
- DIVERGE (extra systems): Eight Houses generation [GOV] · Eight Palaces [ADL, SIC, AUT] · three arrangements incl. "World of the Elements" [MOR] · Rave wheel zodiacal [BB5] · five-sequences-to-dimensions codex [AUT] · 12 sovereign gua [ADL, HAT, WEN, AUT, DAT].
- SINGLE: misplaced-hexagram re-ordering hypothesis [GOV R17]; Moore's two-halves reconstruction [MOR E2, speculative].

**B2. Casting/numbers**
- AGREE (6/7/8/9 semantics): 6 changing yin, 7 static yang, 8 static yin, 9 changing yang — ADL, MOR, REI, RUT, HAT, WEN, DAO (token form), SIC (token form).
- AGREE (yarrow algorithm): 50→49, divide, count by 4s, 3 changes/line — ADL, WEN, REI, RUT (with math proof).
- DIVERGE (coin-side values): heads=2 [HAT] vs heads=3 [MOG, WEN M&P, DAO, REI]. → C-M16.
- DIVERGE (elder/younger labels): standard 6=mature yin/9=mature yang [ADL, MOR, HAT, REI, RUT] vs Wen's swapped labels [uncertain]. → C-M18.
- DIVERGE (probability note): yarrow ≠ coin odds [ADL, RUT] — both agree they differ.
- SINGLE: Plum Blossom numerology formulas [WEN]; unknown ancient numeral method [RUT]; omission of number layer [GOV]; DMS-derived changing lines [AUT]; no casting at all [BB5].

**B3. Pair/transformation operators**
- AGREE (inverse + complement pairs): ADL, HAT, MOR, RUT, WEN, GOV, DAT, INV (reverse/inverse), AUT.
- AGREE (changing lines → second hexagram): ADL, HAT, REI, DAO, WEN, SIC, RUT (as later theory), GOV. vs NO second hexagram [MOG]. → C-M7.
- DIVERGE (extra operators): trigram-swap Jiao Gua [HAT, DAT — absent from INV code] · shadow line fan yao lookup [DAO; cf. HAT Fan Yao reciprocal pairs — related but distinct] · bond/strike/combo/trap/empty [SIC] · roaming/returning souls [ADL] · C1/C2/P/reduplicate [GOV] · axis-as-basis [AUT].
- SINGLE: 50 Fan Yao reverse-line pairs [HAT]; 12-operator code set [INV]; "12 operators never defined in master doc" [AUT]. → C-M6.

**B4. Evaluation/decision rules**
- DIVERGE (which layer answers): Zhu Xi 8-case [ADL; WEN inherits yarrow] · Nanjing 55-remainder rules [RUT, validity unresolved] · Wen cast-field protocol [WEN] · appointed-star WWG rules [SIC] · Ben–Zhi interpolation [HAT] · rtcm dialogue [MOG] · relating-hex-as-potential [DAO] · activation/definition geometry [BB5] · authority-resolver/CI [AUT]. → C-M17.
- AGREE: no-changing-lines case → hexagram-level statement/static reading [ADL, RUT, WEN (locked), REI, MOG].
- SINGLE: Nanjing rules [RUT]; Zhu Xi full 8-case table [ADL].

**B5. Rule/operator grammar layer**
- AGREE (a formal rule layer exists): all except DAT/INV-as-data (INV has operators.js).
- DIVERGE (scale): "hundreds of rules" case law [SIC] · 8 historical change-system types [HAT] · documented operator algebra [ADL] · R1–R17 [GOV] · R-M1–15 [MOR] · 8 pipelines + sentence grammar [AUT].
- SINGLE: eight change-system typology (evolution/combination/sequence/cycle/substitution/transposition/permutation/interpolation) [HAT].

**C1. Formulaic language/valuation**
- AGREE (morpheme set exists): ji/xiong/hui/lin/wujiu family — RUT (with frequencies), ADL, HAT, WEN, REI (counts), MOG (counts, reglossed), MOR (as late additions).
- DIVERGE (yuan-heng-li-zhen): four virtues [ADL via Wenyan; WEN] · two ritual items [RUT; Shaughnessy; Kunst] · non-parallel "sustained work" [HAT] · 4-step consultation [MOG] · verbatim only Hex 1/2 [REI]. → C-M10.
- DIVERGE (valuation stance): bipolar fortune scale [RUT, ADL, HAT, WEN] · warning-not-prediction [MOG, DAO, WEN partially] · exalted/detriment "not good or bad" [BB5] · valence replaced by mottos [DAO] · valence absent [SIC].

**C2. Symbol/punctuation alphabets**
- SINGLE (full mark system with linguistic+ontological columns): 19-mark USF [AUT only].
- DIVERGE (small cast-mark sets): see A1 marks; project phoneme/letter layer [INV] — different domain.

**C3. Generative sentence grammar**
- SINGLE: AUT only (slot grammar, templates, pipelines, SSV). Verified null in ADL, GOV, MOR, REI, RUT, HAT, MOG, WEN, DAO, BB5, SIC, DAT. INV has a tool-call parser (different artifact). Weak epistemic footing — candidate for testing.
- Nearest neighbors (not sentence grammar): "Yi as grammar/code" metaphor [ADL §6]; telegram-parataxis register [RUT]; "words become verbs" per sequence [AUT §7d].

**D1. Colors**
- AGREE (wuxing color set): green(azure)/red/yellow/white/black(blue-black) — ADL, MOR, WEN, GOV (with violet addition), (HAT per-trigram Shuogua colors partially align).
- DIVERGE: per-trigram idiosyncratic palette [REI] · center colors [BB5] · 6 line-colors by day stem [SIC] · computed hue from arc-seconds [INV] · Color = 6 motivations (HD) [AUT]. → C-M25.

**D2. Sound**
- DIVERGE: five notes jiao/zhi/gong/shang/yu ↔ phases [ADL] · per-trigram sound fields [WEN] · "five tones" unenumerated [GOV] · 8 instrument types untabulated [MOR] · synthetic 432 Hz map [INV] · planetary-modulated gate frequencies [AUT].
- GAP: pitch-pipe (律呂) correspondence system — no source tabulates it (WEN negative; MOR gap; INV gap #8).

**D3. Channels/centers**
- SINGLE (as a full system): BB5 (9 centers + 32 channels, 1991 ed.).
- DIVERGE (channel count): 32 [BB5] vs 36 [INV code; later HD canon noted in BB5 brief]. → C-M22.
- NEAR: dimension→centers framework [AUT]; centers-channels module [INV]; chakra rows [HAT Wai Guang]; 8 Spirit Helpers [WEN — different structure].

**D4. Wheels/addressing**
- AGREE (DMS equivalence): gate = 5°37'30" = 20250″ [BB5] ≡ gate 20250″, line 3375″ ≡ 56'15" [INV]; AUT uses °′″ resolution operators on the same scheme.
- AGREE (Lo Shu magic-15): GOV, ADL, MOR, WEN, DAO (metaphor).
- DIVERGE (wheel order): zodiacal Rave wheel [BB5] vs King Wen order vs Fu Xi binary circle [ADL, HAT, GOV, WEN, MOR].
- GAP: 24-mountain/compass-degree tables — none (MOR §I gap).

**D5. DNA/tarot/astrology**
- DIVERGE (DNA codon maps): Stent [DAO] · Yan 1991 [WEN, DAO] · Yang Li 1998 [WEN] · Schönberger stop/start codons [GOV] · Gate 25 = Histidine [AUT]. → C-M20.
- DIVERGE (tarot maps): D'Aoust all-64 [DAO] · Crowley Thoth 21 [WEN C19] · Wen's own 72/78 + phantom gua [WEN C20] · Hatcher Wai Guang per-trigram/emblem [HAT].
- DIVERGE (astrology): zodiac wheel primary [BB5, AUT] · sovereign-gua/solar-term calendars [ADL, HAT, WEN, DAT] · lunar najia [MOR, ADL] · branches/animals/hours [SIC, MOR, WEN].
- NULL: MOG (rejects), REI, RUT (except Dragon-stars note).

**E1. Five dimensions**
- SINGLE (definitions + exact chains): AUT only. INV implements them (DIMENSION_META). All book sources null. Weak footing — flagged.
- NEAR (not the system): xiantian/houtian a priori split [ADL]; time/space as trigram-level qualities [GOV hint]; artha/kama/moksha [REI — unrelated triad]; Needham Length/Time/Breadth/Depth row [HAT accretion].

**E2. Sense ↔ dimension**
- SINGLE (exact 5-sense chain): AUT only.
- DIVERGE (rival sense maps): wuxing senses [WEN] · 8-fold per-trigram senses [HAT] · bodily functions [GOV]. Cross-chained through AUT's own dimension↔wuxing table: sight↔Wood agrees (AUT Movement=Wood + Seeing→Movement vs WEN sight=Wood); touch conflicts (AUT Touch→Being=Earth vs WEN touch=Fire). → C-M26.

**E3. Space first-class vs emergent**
- CONFLICT BY DESIGN: both positions inside AUT (see matrix). → C-M1.
- Book sources: all null (several briefs' analyst layers independently map "container/resonance" → Space; those are DERIVED_RESULT, not source statements).

---

## 4. CONFLICT REGISTRY

Every cross-source (and author-internal) conflict found. All statuses: **open**. No winners picked.

| ID | Topic | Position 1 (supporters, citation) | Position 2 (supporters, citation) | Position 3+ | Status |
|---|---|---|---|---|---|
| C-M1 | Space: dimension vs emergent | Space = first-class 5th dimension, full chain Space=Form=Illusion=Hearing=Music=Freedom [AUT §1a L66–76] | Space "does not belong to these equations; it arises later as a condition produced by the interaction of the fields"; personality = interference pattern of the other four [AUT §1a L6–8, L103–106] | INV implements Space as first-class (Who/g20/oct6) [inv line 16]; brief-analyst layers treat Space as container/resonance [GOV/ADL/MOR §5 — analyst] | open (author-internal, by design) |
| C-M2 | Movement keynote | "I Define" (Tab 1/Tab 2, pressure-shell) [AUT §1a L20, §1d L760–767] | "I Create" (crystal/monopole layer, Individuality→Monopole) [AUT §1c L672–674, L810–812] | — | open (author-internal) |
| C-M3 | Space keynote | "I Think" (Tab 1/Tab 2, pressure-shell) [AUT §1a L68, §1d] | "I Communicate" (Personality Crystal layer) [AUT §1c L636–638, L778–780] | — | open (author-internal) |
| C-M4 | Taste tone assignment | Tone 3 = Taste ("Taste sensory vector") [AUT §2 L1043–1044] | Tone 5 = Taste [AUT §2 L5178, L5282] | — | open (author-internal) |
| C-M5 | Two element systems | Wu Xing dimension map: Movement=Wood, Evolution=Water, Being=Earth, Design=Metal, Space=Fire [AUT §8 L3688–3718] | Elemental ontology: Earth=structure, Water=emotion, Air=thought, Fire=energy/will/intent, Aether=synthesis/consciousness [AUT §7a L6744–6758] | — | open (author-internal) |
| C-M6 | The 12 operators | 12 OPERATORS exist in code (bundle…change; involutions verified) [INV line 14] | "The corpus never defines the project's 12 operators as such" [AUT §10] | — | open (author-internal code↔doc) |
| C-M7 | Second/resulting hexagram | Changing lines flip → second hexagram [ADL R-D1; HAT §C; REI R7; DAO F10; WEN R1.8; SIC §1.1; RUT §4.2 (as late theory); GOV moving lines §1.1] | NO second hexagram — "the Sage advised not to follow the tradition" [MOG R5] | — | open |
| C-M8 | 6/7/8/9 numeric layer | Fully specified old/new yin-yang arithmetic [ADL §1.6; RUT §4.1; HAT §C; MOR B2; REI §1.1; WEN R1] | Layer omitted entirely (notable negative) [GOV §1.10] | Token-only O/X without numbers [SIC §1.1]; numbers kept but changing-line MEANING redefined as message pointer [MOG §1.1] | open |
| C-M9 | Trigram vs hexagram primacy | Trigrams primordial (Fu Xi invents 8 trigrams) [GOV §3; WEN F3; ADL Fuxi myth §3.1; DAO F8 implied; SIC implied] | Hexagrams older than trigrams: 6-numeral groups precede 3-numeral groups; Zhouyi "no consciousness of trigrams" [RUT §3.1 p.98–100; MOR §A p.33–35; HAT §A] | ADL records both strata without deciding [§1.7] | open |
| C-M10 | yuan heng li zhen reading | Four Virtues (sublimity/accomplishment/furtherance/perseverance) [ADL §3.1 via Wenyan; WEN S2 "Confucian"] | Two items: yuanheng = "grand sacrifice/primary receipt", lizhen = "propitious prognostication/beneficial to divine" [RUT §2.3; Shaughnessy; Kunst therein] | Not four parallel ideas: "greatest rewards from sustained hard work" [HAT §B]; 4-step consultation process [MOG G3]; verbatim only Hex 1–2 [REI G2] | open |
| C-M11 | Changeable lines: primordial vs late | Moving lines treated as core mechanism [REI, MOG, WEN, DAO, SIC, BB5 n/a, GOV] | "Nothing explicit or implicit in Zhouyi suggests changeable lines were known in Western Zhou"; explicit only in Ouyang Xiu (11th c.); line numbers = Warring-States insertion [RUT §3.2 p.154; S5] | — | open |
| C-M12 | Xiantian/Fuxi binary antiquity | Primordial order of Fu Xi [GOV §4.1, R8; WEN S3] | Song-period creation (Chen Tuan → Shao Yong, 11th c.) [ADL §1.7; RUT S9 p.440; MOR §C2 p.91–93; HAT F4 dates Shao Yong 1011–1077] | — | open |
| C-M13 | Trigram ↔ element assignment | Standard wuxing: Qian/Dui Metal, Zhen/Xun Wood, Kan Water, Li Fire, Gen/Kun Earth [MOR B4; WEN C1–C2] | Only 5 trigrams are elements; first 3 universal; Lake=Iron, Mountain=Earth [GOV R11 p.28–29, §4.3] | Idiosyncratic 8: Metal/Soil/Grass/Wood/Stone/Air/Fire/Flesh [REI §1.4]; Scale-of-four set: Qian=Greater Air, Zhen=Lesser Fire, Kan=Greater Water… [HAT E3]; project map Thunder+Wind=Wood/Movement etc. [AUT §8] | open |
| C-M14 | "Elements" terminology | "Elements" defended ("Active Principles") [MOR B5 p.18–20] | "Phases, not elements… temporary stages of qi" [ADL R-F2 p.23] | "Xíng means movement… agents of change" [WEN F8]; "dynamic operators rather than static elements" [AUT §7a] | open |
| C-M15 | Yin/yang activity polarity | yang active / yin receptive [GOV §1.4; ADL §1.1; MOR B1–B2; WEN F1] | Inverted: "Yang represents the powers that direct and impel action. Yin represents action directly" [REI §1.2 p.23] | — | open |
| C-M16 | Coin-side values | heads = 2 (Hatcher's use; Chinese pref. 4-char side = 2) [HAT §C] | heads = 3 / tails = 2 [MOG §1.1; WEN R2 (M&P choice); DAO R1; REI §1.1 (blank/heads=3)] | — | open |
| C-M17 | Which text layer answers | Zhu Xi 8-case decision table [ADL R-D3; WEN R1 lineage] | Nanjing 55-remainder rules [RUT §4.2 — "validity remains unresolved"] | Wen cast-field protocol [WEN R3–R5]; appointed-star WWG rules [SIC §2]; Ben→Zhi interpolation [HAT §C]; rtcm [MOG T1–T7]; relating-as-potential [DAO R2] | open |
| C-M18 | Elder/younger labels for 6–9 | 6 = mature (elder) yin, 9 = mature (elder) yang; 7/8 young [ADL §1.1; MOR B2; HAT §C; REI §1.1; RUT §4.1] | Wen Table 7-2 labels 7 = Elder yang, 8 = Elder yin, 9 = Younger yang (swap flagged) [WEN F5, uncertain] | — | open [uncertain pass-through] |
| C-M19 | Image stratum | Retained (Daxiang/Xiaoxiang as Wings 3–4) [ADL §3.1; WEN S1; HAT .X/.x; RUT S7] | Removed entirely as "feudal" distortion [MOG §1.4] | — | open |
| C-M20 | DNA codon correspondence | Stent: yang=purine/yin=pyrimidine; old yang/yin = A–T pair [DAO C2 p.24] | Yan 1991: A=elder yin, T=younger yin, C=younger yang, G=elder yang [WEN C25; DAO C2] | Yang Li 1998: A=younger yin, T=younger yang, C=elder yang, G=elder yin [WEN C25]; Schönberger: stop codons UAA/UAG = Hex 33/12, AUG = Hex 56 [GOV §1.11, OCR-garbled]; Gate 25 = Histidine [AUT §6e] | open |
| C-M21 | State space closed at 64 | Closed 64-state set [ADL, HAT, RUT, GOV, MOR, REI, MOG, DAO, SIC, BB5, AUT, INV, DAT] | Phantom 65th hexagram Xuán via doubled Spirit-Helper cards [WEN C21]; "ten thousand" from 4-base combos [DAO F15] | Reifler's "square number" claim [sic — 64 not square; REI §1.6] | open |
| C-M22 | Channel count | 32 channels "based on the Sephiroth" (1991 first edition, as printed) [BB5 §1.2 p.13] | 36 channels (later HD canon; code merged centers-channels 36/9) [BB5 §6 note; INV line 23] | — | open (intra-system evolution) |
| C-M23 | Design-wheel timing | Design wheel = "three months before birth" [BB5 §1.2 p.12] | Design/Personality ≈ 88° apart in solar degrees [AUT §5b L11332–52] | — | open (intra-HD evolution) |
| C-M24 | Qian/Zhen animals | Qian = horse, Zhen = dragon (Shuogua 8 received) [ADL §1.3; RUT §5.2; MOR §B4; WEN C1 totems] | Emended swap: Qian = dragon, Zhen = horse (Hatcher's editorial choice) [HAT §E3; §I] | — | open |
| C-M25 | Color systems | wuxing five colors (azure-green/red/yellow/white/black-blue) [ADL T1.3; MOR B6; WEN C5; GOV §4.3 + violet] | Reifler's per-trigram palette: Qian purple, Kun black, Zhen orange, Kan red, Gen green, Xun white, Li yellow, Dui blue [REI §1.4, uncertain OCR] | 6 line-colors by day stem [SIC §1.5]; computed hue=arcSec/1,296,000×360 [INV line 20]; Color=6 motivations, not wuxing [AUT §6a]; center colors [BB5 §1.3] | open |
| C-M26 | Sense maps | 5-sense dimension chain: Seeing→Movement, Taste→Evolution, Touch→Being, Smell→Design, Hearing→Space [AUT §2] | wuxing senses: sight=Wood, touch=Fire, taste=Earth, smell=Metal, hearing=Water [WEN C5] | 8-fold per-trigram senses [HAT E3]; bodily-function row [GOV §1.4]; chained via AUT's Movement=Wood etc.: sight agrees, touch conflicts (Being=Earth vs Fire) — unresolved | open |

---

## 5. COVERAGE STATISTICS

**Topic rows:** 20 (A1–A7, B1–B5, C1–C3, D1–D5, E1–E3).
**Conflict count:** 26 (C-M1 … C-M26), all status: open. Author-internal: C-M1–C-M6 (6). Cross-source: C-M7–C-M26 (20).
**Single-source topics (weak epistemic footing):** C3 generative sentence grammar (AUT only); E1 five dimensions (AUT defines; INV implements); E3 space-emergence (AUT only; analyst-layer echoes excluded); C2 full mark alphabet (AUT only; small cast-mark sets elsewhere); D3 channels/centers (BB5 only as a system; AUT/INV project-side).
**Gap topics (no source fills):** pitch-pipe (律呂) tone system [D2 sub-gap]; 24-mountain compass-degree table [D4 sub-gap]; code-side gaps #1–#7 recorded in INV (trigram attribute matrix, line-place semantics, nuclear trigrams, casting numbers, formulaic morphemes, King Wen pair structure, Earlier/Later Heaven arrangements).

**Null density per source** (share of the 20 topic rows where the source is `null`, roughly):

| Source | null rows | ≈ % |
|---|---|---|
| ADL | C3, D3, E1, E2, E3 | 25% |
| AUT | A7 (A6 partial) | ~5% |
| BB5 | A3, A5, A7, C2, C3, D2, E1, E2, E3 | 45% |
| DAO | A3, C3, D1, D2, D3, E1, E2, E3 | 40% |
| DAT | A4, B2, B4, C1, C2, C3, D1, D2, D3, D4, D5, E1, E2, E3 | 70% |
| GOV | C3, D3, E3 (E1/E2 carry fragments) | 15% |
| HAT | C3, D2, E1, E3 | 20% |
| INV | A4, A5, A7, B2, B4, C1, E3 | 35% |
| MOG | A4, A5, A7, C3, D1, D2, D3, D4, D5, E1, E2, E3 | 60% |
| MOR | A5, B4, C2, C3, D3, E1, E2, E3 | 40% |
| REI | A4, B1, C3, D2, D3, D5, E1, E2, E3 | 45% |
| RUT | A5, C3, D1, D2, D3, D4, E1, E2, E3 | 45% |
| SIC | A5, C3, D2, D3, D4, E1, E2, E3 | 40% |
| WEN | A5, C3, E1, E3 | 20% |

**[uncertain] pass-throughs preserved:** Govinda KAN bodily function "SPACE"; Govinda pentagram caption; Reifler trigram-table OCR + romanizations; Moog Part-I page numbers; Wen elder/younger Table 7-2 + page ±2; D'Aoust tarot-header romanizations; BB5 center glands/colors OCR; Moore World-of-Elements figure reading + 8-gates Chinese names; Rutt pentagram stage / zhi-as-genitive / Nanjing validity / bone-column origin; Super I Ching romanizations; Hatcher Tai Yang Wai Guang truncation + ruling-line hex 45 omission; master-doc blank "Matter is ___" chain cell + OCR log.

*End of matrix. Authority deferred: which source answers which question is decided later, per question.*

---

## 6. TURN-10 ADDITIONS — Black Book pp.126–130 & Book of Colors chart

New source columns (Turn-10 uploads, transcribed verbatim from page photographs;
brief: `docs/corpus/black-book-chains-colors.md`; code: `src/state-space/chains.js`;
tests: `test/chains-colors.test.mjs`):

| Tag | Source | Brief file |
|---|---|---|
| BB | Black Book pages 126–130 (chains chart, One.–Five. list, Four Dimension chart, Three Conditions, Crystals & Monopole) | black-book-chains-colors.md |
| BOC | Book of Colors, last page (COLOR/TONE/BASE tables) | black-book-chains-colors.md |

**Attestation rows (all transcriptions verbatim; printed spellings preserved, e.g. `Smelt`, `UNCERTENTY`, `MEDITION`, `ACCEPTENCE`):**

| Topic | Attestation | Source | Status |
|---|---|---|---|
| Dimension chains (macro) | Five "X is Y" chains, one per dimension; author Turn-10: chains are PER-DIMENSION PERSPECTIVES, not absolute orderings. Being chain contains the blank cell "Matter is" (C17, predicate never filled; struck-through duplicate "Matter is Touch" is a print artifact) | BB-p126 | SOURCE_STATEMENT |
| Ordinal perspective | One.–Five. = Being/Movement/Space/Design/Evolution is how Being sees itself in relation to the whole; Movement/Evolution/Design/Space ordinal perspectives NOT attested → `null`, never guessed | BB-p127 | SOURCE_STATEMENT |
| Keynotes | C13 Movement: "I Define" [BB-p126 + BOC-chart Base 1] vs "I Create" [BB-p130]; C14 Space: "I Think" [BB-p126 + BOC-chart Base 5] vs "I Communicate" [BB-p130] — the BB/BOC attestations of C-M2 / C-M3 | BB-p126, BB-p130, BOC-chart | CONFLICT (open; both attested, never resolved) |
| Senses | Base-table senses Seeing→Movement, Taste→Evolution, Touching→Being, Smell→Design, Hearing→Space AGREE with E2 / SENSE_DIMENSIONS / intake.js — agreement noted, not merged. TONE-table departments (Smell/Taste/Outer Vision/Inner Vision/Feeling/Touch, keyed to tone number 1–6) are a SEPARATE architecture — no merging | BOC-chart | SOURCE_STATEMENT (+ agreement) |
| Color / Tone / Base | COLOR = 6 motivations (FEAR/HOPE/DESIRE/NEED/GUILT/INNOCENCE; Color 6 INNOCENCE agrees with AUT `Gate:Innocence°`); TONE = 6 themes under side label SOUND; BASE = 5 rows (Base 3 dimension printed "(Being)"). Recursion: Line → Color (motivation) → Tone → Base | BOC-chart | SOURCE_STATEMENT |
| Space-emergence | Space absent from the "Four Dimension" chart (appended row only) [BB-p128]; Space exists only in the post-Big-Bang state, dimensional counts 2 → 4 → 5 [BB-p129]. Supports C-M1 position 2 (SpaceModel.B); position 1 (SpaceModel.A, full Space chain on BB-p126) remains equally represented | BB-p128, BB-p129 | SOURCE_STATEMENT (supports open C-M1; no resolution) |
| Crystals & Monopole | Personality Crystal = The Witness, Head Center, binary The Personality (Space chain) / The Mind (Evolution chain); Design Crystal = The Vehicle, Ajna Center, binary The Body (Being chain; "Matter is." — C17 second attestation) / The Ego (Design chain); Magnetic Monopole = The Attractor, G Center, Individuality (Movement chain) | BB-p130 | SOURCE_STATEMENT |
