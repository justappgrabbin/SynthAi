// Unicode symbols for glyphs - intentional and meaningful
const GLYPHS = [
  '⟁', '⟐', '⟡', '⟢', '⟣', '⟤', '⟥', '⟦', '⟧', '⟨',
  '⟩', '⟪', '⟫', '⟬', '⟭', '⟮', '⟯', '⧀', '⧁', '⧂',
  '⧃', '⧄', '⧅', '⧆', '⧇', '⧈', '⧉', '⧊', '⧋', '⧌',
  '⧍', '⧎', '⧏', '⧐', '⧑', '⧒', '⧓', '⧔', '⧕', '⧖',
  '⧗', '⧘', '⧙', '⧚', '⧛', '⧜', '⧝', '⧞', '⧟'
];

// Simple hash function for consistent glyph assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function assignGlyph(filename: string): string {
  const index = hashString(filename) % GLYPHS.length;
  return GLYPHS[index];
}

export function getRandomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

export { GLYPHS };
