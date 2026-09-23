/**
 * GENERATED FILE — verbatim constant extraction from shared/schema.ts (donor Foundry-Glyphs).
 * The literal bodies below are copied BYTE-FOR-BYTE from the donor file (schema.ts lines 163-166
 * and 326-363); only the `as const` / inline type annotations were erased (type-erasure only).
 * Extraction needed because shared/schema.ts imports drizzle-orm/zod at value level, which are not
 * installed here; the ephemeris resolver (resonance-engine.ts) consumes only these three constants.
 * Generated: 2026-09-22.
 */
export const zodiacSigns = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

export const MANDALA_CONSTANTS = {
  GATE_ARC: 5 + 37/60 + 30/3600,           // 5°37'30" per gate
  LINE_ARC: (5 + 37/60 + 30/3600) / 6,     // 0.9375° per line
  COLOR_ARC: (5 + 37/60 + 30/3600) / 36,   // 0.15625° per color
  TONE_ARC: (5 + 37/60 + 30/3600) / 216,   // 0.026041667° per tone
  BASE_ARC: (5 + 37/60 + 30/3600) / 1080,  // 0.005208333° per base
  FAGAN_BRADLEY_EPOCH: 1950,
  FAGAN_BRADLEY_BASE: 24 + 2/60 + 31/3600, // 24°02'31"
  PRECESSION_RATE: 50.2388475 / 3600,      // arcseconds/year to degrees
};

export const GATE_SEQUENCE = [
  { start: 0, gate: 25 }, { start: 3.875, gate: 17 }, { start: 9.5, gate: 21 },
  { start: 15.125, gate: 51 }, { start: 20.75, gate: 42 }, { start: 26.375, gate: 3 },
  { start: 32, gate: 27 }, { start: 37.625, gate: 24 }, { start: 43.25, gate: 2 },
  { start: 48.875, gate: 23 }, { start: 54.5, gate: 8 }, { start: 60.125, gate: 20 },
  { start: 65.75, gate: 16 }, { start: 71.375, gate: 35 }, { start: 77, gate: 45 },
  { start: 82.625, gate: 12 }, { start: 88.25, gate: 15 }, { start: 93.875, gate: 52 },
  { start: 99.5, gate: 39 }, { start: 105.125, gate: 53 }, { start: 110.75, gate: 62 },
  { start: 116.375, gate: 56 }, { start: 122, gate: 31 }, { start: 127.625, gate: 33 },
  { start: 133.25, gate: 7 }, { start: 138.875, gate: 4 }, { start: 144.5, gate: 29 },
  { start: 150.125, gate: 59 }, { start: 155.75, gate: 40 }, { start: 161.375, gate: 64 },
  { start: 167, gate: 47 }, { start: 172.625, gate: 6 }, { start: 178.25, gate: 46 },
  { start: 183.875, gate: 18 }, { start: 189.5, gate: 48 }, { start: 195.125, gate: 57 },
  { start: 200.75, gate: 32 }, { start: 206.375, gate: 50 }, { start: 212, gate: 28 },
  { start: 217.625, gate: 44 }, { start: 223.25, gate: 1 }, { start: 228.875, gate: 43 },
  { start: 234.5, gate: 14 }, { start: 240.125, gate: 34 }, { start: 245.75, gate: 9 },
  { start: 251.375, gate: 5 }, { start: 257, gate: 26 }, { start: 262.625, gate: 11 },
  { start: 268.25, gate: 10 }, { start: 273.875, gate: 58 }, { start: 279.5, gate: 38 },
  { start: 285.125, gate: 54 }, { start: 290.75, gate: 61 }, { start: 296.375, gate: 60 },
  { start: 302, gate: 41 }, { start: 307.625, gate: 19 }, { start: 313.25, gate: 13 },
  { start: 318.875, gate: 49 }, { start: 324.5, gate: 30 }, { start: 330.125, gate: 55 },
  { start: 335.75, gate: 37 }, { start: 341.375, gate: 63 }, { start: 347, gate: 22 },
  { start: 352.625, gate: 36 }, { start: 358.25, gate: 25 },
];
