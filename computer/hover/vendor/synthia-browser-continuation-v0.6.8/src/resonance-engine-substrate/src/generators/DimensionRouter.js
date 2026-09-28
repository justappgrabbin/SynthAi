/**
 * DimensionRouter — real deterministic/inferential/stable per-word dimension
 * classifier + real ATO bigram completion + real ToolFactory wiring.
 *
 * This is the non-HTML module-source mirror of the exact same logic added
 * to organism.html this session (see /areas/synthia-substrate.md). Built
 * against THIS package's own real data (BY_KW/BY_FUXI from ../data/
 * hexagrams.js), not a duplicate copy of organism.html's separate GATE_
 * BINARY table -- same real King Wen data, this file's own real accessors.
 *
 * DETERMINISTIC = word is a real member of the sourced vocabulary for one
 *   or more dimensions -- kept in EVERY dimension it's real in, never
 *   collapsed to a single winner or stripped for appearing in more than
 *   one (per direct correction: presence in multiple dimensions is real
 *   sourced data, not noise -- what a sentence's OTHER words say decides
 *   which dimension wins overall).
 * PUNCTUATION = true grammatical/connector words (is/the/a/and/this/...) --
 *   tagged as their own real category, not silently dropped.
 * INFERENTIAL = not in the dictionary, resolved by real weighted proximity
 *   to whichever deterministic neighbors are present in the same sentence.
 * STABLE = once inferred, cached and re-checked first on future encounters.
 * LEARNED = a sentence with zero recognized real vocabulary still gets its
 *   real content words written into the cache under the fallback-
 *   determined dimension, so the system grows from every encounter, not
 *   only the ones that already had partial vocabulary to infer from.
 */

import { BY_KW, BY_FUXI } from '../data/hexagrams.js';

export const DIMENSION_SEED_GATE = { Movement: 1, Evolution: 2, Being: 6, Design: 14, Space: 20 };
const DIMENSION_VERBS = { am: 'Being', define: 'Movement', create: 'Movement', remember: 'Evolution', design: 'Design', think: 'Space' };
const POSITION_TO_DIMENSION = { beginning: 'Movement', middle: 'Being', end: 'Space' };

export const PUNCTUATION = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so', 'to', 'of', 'in', 'on', 'at',
  'for', 'with', 'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'not', 'no', 'nor', 'do', 'does', 'did',
  'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'shall', 'may', 'might', 'must', 'this', 'that', 'these',
  'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'me', 'him', 'them',
  'us', 'who', 'what', 'when', 'where', 'why', 'how', 'which', 'there', 'here', 'now']);

// DIMENSION_TERMS is populated at build time from integrated-tool-factory
// v1.6.0's real DIMENSIONS.terms (see /areas/integrated-tool-factory.md) --
// injected as JSON by the build script (build-dimension-terms.mjs) so this
// file stays real source, not a hand-typed 1000-word literal duplicated
// from organism.html. Placeholder empty object here; real data lives in
// dimension-terms.json, loaded by the caller (see README.md).
export function createDimensionRouter(DIMENSION_TERMS) {
  const inferredTermsCache = {};

  function resolveWordDimensions(word, sentenceWords, index) {
    const w = word.toLowerCase();
    if (PUNCTUATION.has(w)) return { word: w, mode: 'PUNCTUATION', dimensions: [] };
    if (DIMENSION_TERMS[w]) return { word: w, mode: 'DETERMINISTIC', dimensions: DIMENSION_TERMS[w] };
    if (inferredTermsCache[w]) return { word: w, mode: 'STABLE', dimensions: [inferredTermsCache[w].dimension] };
    const scores = {};
    for (let i = 0; i < sentenceWords.length; i++) {
      if (i === index) continue;
      const dims = DIMENSION_TERMS[sentenceWords[i].toLowerCase()];
      if (!dims) continue;
      for (const dim of dims) scores[dim] = (scores[dim] || 0) + 1 / Math.abs(i - index);
    }
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return { word: w, mode: 'UNRESOLVED', dimensions: [] };
    const dimension = ranked[0][0];
    inferredTermsCache[w] = { dimension, firstSeenIn: sentenceWords.join(' '), scores };
    return { word: w, mode: 'INFERENTIAL', dimensions: [dimension] };
  }

  function classifySentenceDimension(sentence) {
    const words = (sentence.match(/[A-Za-z']+/g) || []);
    const perWord = words.map((w, i) => resolveWordDimensions(w, words, i));
    const totals = {};
    for (const r of perWord) {
      const weight = r.mode === 'DETERMINISTIC' ? 2 : 1;
      for (const dim of r.dimensions) totals[dim] = (totals[dim] || 0) + weight;
    }
    const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return { dimension: ranked[0]?.[0] || null, totals, perWord };
  }

  function learnFromUnresolvedSentence(sentence, fallbackDimension) {
    const words = sentence.toLowerCase().match(/[a-z']+/g) || [];
    let learned = 0;
    for (const w of words) {
      if (PUNCTUATION.has(w) || DIMENSION_TERMS[w] || inferredTermsCache[w]) continue;
      inferredTermsCache[w] = { dimension: fallbackDimension, firstSeenIn: sentence, scores: { [fallbackDimension]: 1 }, learnedFromFallback: true };
      learned++;
    }
    return learned;
  }

  function routeSentenceToDimension(sentence) {
    const classified = classifySentenceDimension(sentence);
    if (classified.dimension) {
      return { dimension: classified.dimension, evidence: `real per-word classifier: ${JSON.stringify(classified.totals)}`, seedGate: DIMENSION_SEED_GATE[classified.dimension] };
    }
    const words = sentence.toLowerCase().match(/[a-z']+/g) || [];
    const iIdx = words.indexOf('i');
    let dimension, evidence;
    if (iIdx >= 0) {
      const verb = words[iIdx + 1];
      if (DIMENSION_VERBS[verb]) { dimension = DIMENSION_VERBS[verb]; evidence = `fallback: 'I ${verb}' directly names a dimension keyword`; }
      else {
        const frac = iIdx / Math.max(1, words.length - 1);
        const pos = frac < 0.34 ? 'beginning' : frac < 0.67 ? 'middle' : 'end';
        dimension = POSITION_TO_DIMENSION[pos]; evidence = `fallback: no classifier signal, no dimension verb; position of 'I' (${pos})`;
      }
    } else { dimension = 'Evolution'; evidence = "fallback: no classifier signal, no 'I' found; defaulting to Evolution"; }
    const learnedCount = learnFromUnresolvedSentence(sentence, dimension);
    if (learnedCount) evidence += ` | learned ${learnedCount} new word(s) into cache under ${dimension}`;
    return { dimension, evidence, seedGate: DIMENSION_SEED_GATE[dimension] };
  }

  function xnor(a, b, bits) { const mask = (1 << bits) - 1; return (~(a ^ b)) & mask; }
  function solveAnalogy(a, b, c, bits) { return xnor(xnor(a, b, bits), c, bits); }

  function dimensionBigramTool(sentence, toolFactory) {
    const route = routeSentenceToDimension(sentence);
    const otherDims = Object.keys(DIMENSION_SEED_GATE).filter(d => d !== route.dimension);
    const [dimA, dimB] = otherDims;
    const A = BY_KW[DIMENSION_SEED_GATE[dimA]].fuxi;
    const B = BY_KW[DIMENSION_SEED_GATE[dimB]].fuxi;
    const C = BY_KW[route.seedGate].fuxi;
    const foundFuxi = solveAnalogy(A, B, C, 6);
    const foundGate = BY_FUXI[foundFuxi];
    const event = {
      fromGate: route.seedGate,
      toGate: foundGate ? foundGate.kw : undefined,
      changingLines: foundGate ? changedLinesBetween(route.seedGate, foundGate.kw).map(n => ({ lineNumber: n })) : [],
    };
    const tool = foundGate && toolFactory ? toolFactory.generate(event) : null;
    return { route, dimA, dimB, foundFuxi, foundGate: foundGate ? foundGate.kw : null, tool };
  }

  function changedLinesBetween(gateA, gateB) {
    const x = BY_KW[gateA].fuxi ^ BY_KW[gateB].fuxi;
    const out = [];
    for (let n = 1; n <= 6; n++) if ((x >> (6 - n)) & 1) out.push(n);
    return out;
  }

  return { routeSentenceToDimension, classifySentenceDimension, dimensionBigramTool, resolveWordDimensions, learnFromUnresolvedSentence, inferredTermsCache };
}
