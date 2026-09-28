/**
 * FourCornerSpace
 * ----------------
 * My best-effort read of what you described: a dataset with four corners where
 * words are combined, and being placed in two different corners doesn't mean two
 * words don't belong together - proximity in the grid is just "space," and the
 * thing that actually anchors the space is the user (their context), not the grid.
 *
 * I built it as: a 2D grid with 4 named corner anchors (you can rename them).
 * Every word/phrase gets placed at coordinates influenced by its relation to
 * each of the 4 corners (a soft score per corner, 0..1), not locked into a
 * single quadrant. Two words "belong together" if their corner-relation
 * vectors are close, regardless of which quadrant they're nominally drawn in.
 *
 * The whole space can be re-anchored per user via `setUserContext()` - e.g. once
 * they "log in," their chart/context re-weights the corners and everything
 * currently in the space silently re-projects around the new center.
 *
 * If this isn't what you meant, tell me what's off and I'll reshape it -
 * this piece was the vaguest part of the brief so I made a real, working
 * guess rather than skip it.
 */

export class FourCornerSpace {
  constructor(corners = ['A', 'B', 'C', 'D']) {
    if (corners.length !== 4) throw new Error('FourCornerSpace needs exactly 4 corner names');
    this.corners = corners;
    this.words = new Map(); // word -> { relations: {corner: score}, meta }
    this.userContext = null; // e.g. { weights: {A:1,B:1,C:1,D:1}, center: {x,y} }
  }

  setUserContext(ctx) {
    this.userContext = ctx;
    return this;
  }

  /** relations: partial map of corner -> 0..1 affinity. Missing corners default to 0.1 */
  put(word, relations = {}, meta = {}) {
    const full = {};
    for (const c of this.corners) full[c] = relations[c] ?? 0.1;
    this.words.set(word, { relations: full, meta });
    return this;
  }

  /** Position is derived, not stored - space is always relative to current user context */
  position(word) {
    const rec = this.words.get(word);
    if (!rec) return null;
    const w = this.userContext?.weights || {};
    const [c1, c2, c3, c4] = this.corners;
    const weighted = c => rec.relations[c] * (w[c] ?? 1);
    // bilinear projection onto a unit square using the 4 corner affinities
    const x = weighted(c2) + weighted(c3) - weighted(c1) - weighted(c4);
    const y = weighted(c3) + weighted(c4) - weighted(c1) - weighted(c2);
    return { x, y, relations: rec.relations };
  }

  /** Two words "belong together" if their relation vectors are close - quadrant is irrelevant */
  affinity(wordA, wordB) {
    const a = this.words.get(wordA), b = this.words.get(wordB);
    if (!a || !b) return null;
    let dot = 0, na = 0, nb = 0;
    for (const c of this.corners) {
      dot += a.relations[c] * b.relations[c];
      na += a.relations[c] ** 2;
      nb += b.relations[c] ** 2;
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb)); // cosine similarity, 0..1
  }

  nearest(word, n = 5) {
    const scored = [...this.words.keys()]
      .filter(w => w !== word)
      .map(w => ({ word: w, score: this.affinity(word, w) }))
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, n);
  }

  snapshot() {
    return {
      corners: this.corners,
      userContext: this.userContext,
      words: [...this.words.entries()].map(([word, rec]) => ({
        word, ...rec, position: this.position(word),
      })),
    };
  }
}

export default FourCornerSpace;
