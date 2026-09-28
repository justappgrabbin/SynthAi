# Structured Dataset Report — Hatcher Yijing / Gnostic Book of Changes / research_tool.mjs

Date: 2025 (investigation of `/mnt/agents/upload/`). Scope: two JSON datasets + one 4 KB Node script. No files modified outside this report.

---

## 1. `yijing_hatcher_dataset.json` (128 KB, 64 records)

**Provenance/license:** `metadata.source_copyright`: *"Copyright 2009, Bradford Hatcher, All Rights Reserved"* — source is *Yijing, Word By Word (Volume One)*. The extractor deliberately captured only short structural/reference sections (Key Words, Glossary, Dimensions headers) and **excluded** Hatcher's original interpretive prose (Judgment, Image, commentaries). Glossary strings are dictionary-style glosses of the Chinese hexagram name (short, reference-like), but they are still Hatcher's wording — treat as **quoted reference data, not freely redistributable** at scale.

### Schema

```
{ metadata: { source_title, source_author, source_copyright, extracted_fields[8],
              method, scope_note, hexagram_count: 64 },
  hexagrams: [ 64 records, ALL with identical key set:
    { hexagram: int 1..64,          // King Wen number, contiguous, no gaps
      pinyin: string,               // e.g. "QIAN2", tone-digit suffix; variants: "ZHUN1 (or TUN2)", "XUN4 (or SUN4)"
      name: string,                 // Hatcher's own English name (e.g. "Creating", NOT Wilhelm)
      header_page: int,             // 65..445, source page
      binary: string,               // 6 chars '0'/'1', LINE 1 (BOTTOM) FIRST, i.e. left-to-right = bottom→top
      decimal_raw: string,          // = parseInt(binary, 2) MSB-first, sometimes zero-padded ("02"); see quirks
      trigram_note: string,         // "Qian below, Qian above; Chong Gua" (empty string for hexagram 33 only)
      key_words: string,            // 465..506 chars, 5–6 comma-phrase clauses concatenated (original line breaks lost)
      glossary: string,             // 147..2068 chars, dictionary gloss of the hexagram name, semicolon-delimited senses
      dimensions: {                 // derived-hexagram relations; subkeys vary by record
        "pang tong gua": { pinyin_term: "opposite", value: "02, Kun, Accepting" },        // all 64
        "qian gua":      { pinyin_term: "inverse",  value: "01, Qian, Creating" },        // all 64
        "jiao gua":      { pinyin_term: "reverse",  value: "..." },                       // 62/64 (missing 4, 62)
        "hu gua":        { pinyin_term: "nuclear",  value: "..." },                       // 63/64 (missing 4)
        "zhi hu gua":    { pinyin_term: "nuclear of", value: "28, 44, 43, 01" },          // 16/64 (gates 1,2,23,24,27,28,37,38,39,40,43,44,53,54,63,64)
        "shi er di zhi": { pinyin_term: "12 branches", value: "Sovereign Gua, 4th Moon (May)" }, // all 64
        "jiao guo":      { ... }    // TYPO for jiao gua on hexagram 62 only
      } } ] }
```

### Full example record (verbatim, hexagram 1)

```json
{
  "hexagram": 1,
  "pinyin": "QIAN2",
  "name": "Creating",
  "header_page": 65,
  "binary": "111111",
  "decimal_raw": "63",
  "trigram_note": "Qian below, Qian above; Chong Gua",
  "key_words": "Higher purpose, self-actualizing drives, autonomy, calling, vocation, star quality Sovereignty, command, self-mastery, dragonhood, genius, authority, cogency Diligence, drive, lasting energy, enduring vigor, persistence or duration in time Higher orders, design, innovation; co-authoring with the infinite, dynamic life Positing, originality, initiative; sublimation, sunlight transforming water to vapor Perspective from outside of humanity, attunement to higher rhythms & purposes",
  "glossary": "Qian2 (to be) creative, vigorous, energetic, potent, dynamic, constant, enduring, lasting; dry, clean; exhausted; heavenly; (a, the) creation, initiative, authority, sovereignty, design, cogency, autonomy, command, energy, diligence, persistence, endurance, mastery, genius, higher order, higher purpose, calling, vocation, enduring activity, lasting vigor, dynamic living, dragonhood; heaven; warmth of the sun; vigorous appearance; (a, the) male, gang or yang principle; (to) create, initiate, design, author, master, persist, endure (s, ed, ing); creation's, creativity's; gan, (to be) dry, dried",
  "dimensions": {
    "pang tong gua": { "pinyin_term": "opposite", "value": "02, Kun, Accepting" },
    "qian gua":      { "pinyin_term": "inverse",  "value": "01, Qian, Creating" },
    "jiao gua":      { "pinyin_term": "reverse",  "value": "01. Qian, Creating (chong gua 7)" },
    "hu gua":        { "pinyin_term": "nuclear",  "value": "01, Qian, Creating" },
    "zhi hu gua":    { "pinyin_term": "nuclear of", "value": "28, 44, 43, 01" },
    "shi er di zhi": { "pinyin_term": "12 branches", "value": "Sovereign Gua, 4th Moon (May)" }
  }
}
```

### Verified semantics of `dimensions` (cross-checked against the state-space operator math)

| Hatcher key | pinyin_term | Actual math (verified on gates 3, 5, 28, 40, 41) | tool-04 / operators.js equivalent |
|---|---|---|---|
| `pang tong gua` | opposite | yin↔yang inversion of all 6 lines | `shadow` / `o_inverse` |
| `qian gua` | inverse | full line-order reversal (upside-down) | `mirror` / `o_reverse` |
| `jiao gua` | reverse | **upper↔lower trigram swap** (NOT line reversal) | **no existing transform — new operator** |
| `hu gua` | nuclear | lines 2-3-4 / 3-4-5 nuclear hexagram | `core` / `o_nuclear` |
| `zhi hu gua` | nuclear of | reverse index: list of gates whose nuclear = this gate | derivable by inverting `core` |
| `shi er di zhi` | 12 branches | Sovereign-Gua month correspondence (12 gates get months Feb..Jan) + "family" labels: Kan-Li / Xun-Zhen / Gen-Dui / No Family | calendar correspondence — new data |

All 64 `binary` strings verified **bit-identical** to `gatePattern(gate)` in `src/merged/kingwen.js` (line-1-first). `decimal_raw` = `parseInt(binary, 2)` for 63/64 records (zero-padded variants "02" etc.); **two quirks: hexagram 2 is the literal string `"00 & 64"`, and hexagram 41 says `"48"` where `parseInt("110001",2)=49` (source data error, 1-record anomaly).**

### Data-quality notes
- `key_words`: clause boundaries lost (space-joined), contains hyphenation artifacts; glossary has PDF hyphenation ("persis- tence").
- No per-line texts. No Chinese characters (only pinyin + a few curly quotes/é).
- `trigram_note` trigram names (Qian/Kun/Zhen/Kan/Dui/Gen/Li/Xun) match `TRIGRAMS[].id` in `src/state-space/constants.js` exactly (case-insensitive); "Chong Gua" = doubled-trigram flag (8 records).

---

## 2. `gnostic_book_of_changes_dataset.json` (30 KB, 64 records)

**Provenance/license:** *The Gnostic Book of Changes: Studies in Crypto-Teleological Solipsism*, "Michael Servetus" (pseudonym). Metadata `source_note` states the book is itself an aggregation of verbatim quotations from many **actively copyrighted** translations (Wilhelm/Baynes 1950, Blofeld 1965, Liu 1975, Ritsema/Karcher, Shaughnessy, Cleary, Wu...). The extractor pulled **only** the editor's own running name + "Other titles" synonym list and deliberately excluded all Judgment/Image/per-line content on copyright grounds. Note in metadata: **Legge 1899 is public domain and could be added later.**

### Schema

```
{ metadata: { source_title, source_author, source_note, extracted_fields: ["running_name","other_titles"],
              scope_note, hexagram_count: 64 },
  hexagrams: [ 64 records, identical key set:
    { hexagram: int 1..64,        // King Wen number, contiguous
      running_name: string,       // editor's own esoteric-leaning name, e.g. "The Dynamic", "The Magnetic",
                                    // "Enthusiasm/Self-Deception/Repose", "Unfinished Business"
      header_page: int,           // 87..961
      other_titles: string[] } ] } // 4..20 titles each, 731 total, avg 11.4; never empty
```

### Full example record (verbatim, hexagram 1)

```json
{
  "hexagram": 1,
  "running_name": "The Dynamic",
  "header_page": 87,
  "other_titles": [
    "The Creative", "The Symbol of Heaven", "The Creative Principle", "Force",
    "The Key", "Creativity", "The Originating", "Creative Power", "Primal Power",
    "Yang", "The Life Force", "Kundalini", "God the Father"
  ]
}
```

### Content character
- `other_titles` = multi-tradition synonym cloud per hexagram: Wilhelm/Baynes titles (exact match on 46/64 gates, near-match on most of the rest), Blofeld "The Symbol of ..." forms, plus occult/esoteric attributions ("Kundalini", "God the Father", "The Deep Psyche", "Cosmic Order"). This is the richest **cross-tradition name-resolution** source of the two datasets.
- **Contamination:** 5 entries on gates 9, 15, 33 are leaked prose fragments including translator attributions (e.g. gate 15: *"...to allow ourself to be led without resistance. – C.K. Anthony..."*, *"– Chung Wu"*, *"– T. Cleary."*) — filter titles containing `–`, `"`, `”` or ending in `.` before use; minimum clean-title count per gate after filtering is 4.
- No per-line texts, no binary patterns, no trigram data, no commentary. English only.

---

## 3. `research_tool.mjs` (4 KB) — verdict: **PORT (partial)**

**What it does:** standalone CLI + module. `research(url)` → real `fetch()` with UA header → extracts `<title>`, strips scripts/styles/comments/tags from `<body>` (`stripTags`, entity decoding for 6 entities, whitespace collapse), extracts `<pre>/<code>` blocks > 15 chars (`extractCodeBlocks`) → returns `{ url, title, text, codeBlocks, fetchedAt }`. `saveAsDocx(result, outPath)` renders title/URL/timestamp + first 200 paragraphs + code snippets (Courier New) into a `.docx` via the `docx` npm package. CLI: `node research_tool.mjs <url> <output.docx>`.

**Assessment:** The header comment is explicit — this is the *real* fetch/extract tool written as the contrast to five uploaded "browser" apps that were UI shells with no backend. It is honest, deterministic, dependency-light code. The Pure Synthia automata project already has `tool-12-research-browser.js`, but that is a **provenance-graph workspace** (sources→claims→notes→hypotheses) with no actual HTML fetching/extraction. research_tool.mjs is complementary, not redundant.

**Recommendation:** port `stripTags` + `extractCodeBlocks` + `extractTitle` (pure, ~50 lines, zero-dep) as the fetch/extract stage utility behind tool-12's `fetch` state; **skip** `saveAsDocx` (pulls the `docx` package dependency into an otherwise zero-runtime-dep codebase, and document rendering is out of scope for the automata engine — if export is wanted later, emit JSON/markdown instead). No tests ship with it; regex-based HTML stripping is fragile for malformed HTML but adequate for a research aid.

---

## 4. Integration recommendations

Primary key everywhere: **King Wen number 1..64** (`hexagram` field in both datasets = `gate` in kingwen.js / `gateFromBits` in addressing.js). Both datasets verified contiguous 1..64.

### 4a. Hatcher → `tool-04-iching-grammar.js` + new `src/merged/hatcher.js` (or extend `kingwen.js`)

| Hatcher field | Target |
|---|---|
| `binary` | validation cross-check against `gatePattern(gate)` (already verified 64/64 identical — use as regression fixture in `tests/`) |
| `dimensions.pang tong gua / qian gua / hu gua` | expected-output fixtures for `shadow`/`mirror`/`core` transforms in tool-04 |
| `dimensions.jiao gua` (trigram swap) | motivates a **new named transform** `swap` (upper↔lower trigram exchange) in tool-04 + operators.js; Hatcher's table = ready-made fixture (62/64 entries) |
| `dimensions.zhi hu gua` | reverse-nuclear index — precomputable from `core`, use as fixture |
| `dimensions.shi er di zhi` | new correspondence table (12 sovereign-gua months + 4 family labels) → state-space `dimensions.js`/constants; the only calendar/seasonal data in either dataset |
| `trigram_note` | parse "X below, Y above" → cross-check `trigramFor()` in tool-04; ids already align with `TRIGRAMS` |
| `key_words`, `glossary` | semantic payload: attach as `names`/`keywords` on a hexagram record; feed open-class seeds into `lexicon.js` (see 4c) |
| `pinyin`, `name`, `header_page` | provenance + display names |

### 4b. Gnostic → name-resolution table (extend `kingwen.js` or new `src/merged/hexagram-names.js`)

`running_name` + filtered `other_titles` give a per-gate synonym map spanning Wilhelm/Baynes, Blofeld, esoteric schools. This is the canonical answer to name conflicts.

### 4c. Lexicon feed (`src/state-space/lexicon.js`, currently 67 seed words)

Tokenize Hatcher `key_words` (comma-split, ~300 phrases/64 gates) and Gnostic `other_titles` into NOUN/VERB/ADJ open-class seeds tagged `domain: 'yijing'` — do not merge into closed classes. Suggested shape: `{ word, pos, gate, source: 'hatcher'|'gnostic' }`.

### 4d. Canonical-name resolution strategy

Conflicts are real: gate 1 = "The Creative" (Wilhelm, in kingwen.js) = "Creating" (Hatcher) = "The Dynamic" (Gnostic); gate 3 = "Difficulty at the Beginning" / "Rallying" / "Difficulty". Strategy:

1. **King Wen number (1..64) is the sole primary key** — never join on names.
2. Name tables become keyed views: `namesByGate[gate] = { wilhelm, hatcher, gnostic, synonyms[] }`; keep `KING_WEN_HEXAGRAM_NAMES` (Wilhelm) as the default display name for backwards compatibility.
3. Gnostic `other_titles` (filtered) = lookup index for resolving arbitrary user/tradition spellings → gate number (normalize: lowercase, strip parentheticals, strip "The ").
4. Structural identity fallback: `binary`/`gateFromBits` is ground truth — a name is only ever a label on a 6-bit pattern.

### 4e. License caution summary

- **Hatcher**: copyrighted 2009; extracted fields are short reference structures — store and use internally, avoid bulk republishing of `glossary` strings.
- **Gnostic**: names/synonyms are safe structural compilations per the extractor's scope note; the 5 contaminated entries contain quoted translator prose — drop them. The full book must NOT be re-extracted for line texts (copyrighted translators); the public-domain **Legge 1899** route noted in metadata is the safe path if per-line texts are ever wanted (neither dataset has any per-line content today).
