/**
 * GrammarOrgan — real MonteCarloGrammar + AutomaticNovelWriter
 */
import { MonteCarloGrammarEngine } from './legacy/monte-carlo-grammar-engine.js';
import { AutomaticNovelWriter } from './legacy/automatic-novel-writer.js';

const DEFAULT_STYLE = {
  target: {
    formal: 0.45,
    poetic: 0.35,
    terse: 0.4,
    elaborate: 0.45,
    archaic: 0.15,
    technical: 0.25
  },
  tolerance: 0.55
};

export class GrammarOrgan {
  constructor() {
    this.id = 'grammar';
    this.capabilities = ['grammar', 'monte-carlo', 'disseminer', 'novel', 'style', 'generate'];
    this.grammar = null;
    this.novelWriter = null;
  }

  _ensureGrammar(styleProfile = DEFAULT_STYLE) {
    if (!this.grammar) {
      this.grammar = new MonteCarloGrammarEngine(styleProfile);
    } else if (styleProfile) {
      this.grammar.setStyleProfile(styleProfile);
    }
    return this.grammar;
  }

  _ensureNovel(styleProfile = DEFAULT_STYLE) {
    if (!this.novelWriter) {
      this.novelWriter = new AutomaticNovelWriter({
        styleProfile,
        genre: 'heroic',
        tone: 'heroic',
        theme: 'resonance',
        setting: 'the living field',
        protagonistTraits: ['Synthia', 'curious', 'autonomous'],
        numScenes: 3
      });
    }
    return this.novelWriter;
  }

  accepts(intent) {
    return /\b(grammar|monte.?carlo|disseminer|novel|write|story|style|generate sentence|prose|chapter|plot)\b/i.test(intent);
  }

  async execute({ intent, address, mode = 'complement' }) {
    const text = String(intent || '');
    const wantsNovel = /\b(novel|story|chapter|plot|book)\b/i.test(text);
    const countMatch = text.match(/\b(\d+)\s*(sentences?|lines?)\b/i);
    const n = countMatch ? Math.min(8, Math.max(1, +countMatch[1])) : 2;

    // Optional style hints from language
    const style = { ...DEFAULT_STYLE, target: { ...DEFAULT_STYLE.target } };
    if (/\bpoetic|poetry|lyric\b/i.test(text)) style.target.poetic = 0.85;
    if (/\bformal|academic|precise\b/i.test(text)) style.target.formal = 0.8;
    if (/\bterse|short|blunt\b/i.test(text)) style.target.terse = 0.85;
    if (/\btechnical|science|code\b/i.test(text)) style.target.technical = 0.8;
    if (/\barchaic|old|ancient\b/i.test(text)) style.target.archaic = 0.7;

    if (wantsNovel) {
      const writer = this._ensureNovel(style);
      let novel;
      try {
        novel = writer.generateNovel();
      } catch (e) {
        return { ok: false, organ: this.id, error: e.message, address };
      }
      const preview = (novel.scenes || []).slice(0, 2).map(s => s.prose?.slice?.(0, 280) || s).join('\n\n');
      return {
        ok: true,
        organ: this.id,
        path: 'novel',
        text: `Generated novel scaffold “${novel.title || 'Untitled'}” (${novel.wordCount || '?'} words).`,
        novel: {
          title: novel.title,
          summary: novel.summary,
          wordCount: novel.wordCount,
          sceneCount: (novel.scenes || []).length,
          preview
        },
        address,
        mode
      };
    }

    // Sentence / grammar generation
    const g = this._ensureGrammar(style);
    let sentences = [];
    try {
      sentences = g.generate(n) || [];
    } catch (e) {
      return { ok: false, organ: this.id, error: e.message, address };
    }

    const stats = g.getGrammarStats();
    return {
      ok: true,
      organ: this.id,
      path: 'grammar',
      text: sentences.length
        ? sentences.join(' ')
        : 'Grammar engine produced no sentences for this style profile.',
      sentences,
      style: style.target,
      stats,
      address,
      mode
    };
  }
}

export default GrammarOrgan;
