/**
 * Verified Wheel Provider (added 2026-10-19, branch fill/synthai-20261019).
 *
 * An ADDITIONAL address provider, next to the donor providers. It does not
 * replace, re-route or edit address-service.mjs or any donor. Nothing calls
 * it unless a caller chooses to; the existing routing is unchanged.
 *
 * What it adds: tropical ecliptic longitude -> the 13-field contract address
 * (event-grammar-v1, see address-service.mjs ADDRESS_FIELDS) using the gate
 * wheel checked in research/hd-math-verification.md s.1:
 *   gate 41 starts at 302.0 deg tropical; each gate 5.625 deg; line 0.9375;
 *   color 0.15625; tone 93.75"; base 18.75". Three published tables and
 *   human-design-py (gate 25 at 358.25) agree; 0 mismatches over 64 gates.
 * Same order as the donor GATE_WHEEL (Rave Mandala order) and as Black Book
 * (Ra Uru Hu 1991, Drive copy) p.16 "These Gates and the
 * Constellations/Hexagrams of the Wheels are identical."
 *
 * FLAG (not fixed): the donor human-design.js longitudeToHD() anchors gate 41
 * at 58.0 deg (its own HD_WHEEL_ANCHOR_VARIANTS records 58.0 / 311.75 / 46.75
 * as CONFLICT claims). The verified 302.0 anchor is added here as a fourth,
 * separately sourced variant (VERIFIED_WHEEL_ANCHOR). Choosing between them
 * is Alexis's decision.
 *
 * ZODIAC: gates are read on the longitude given (tropical anchor). Her
 * requirement is Fagan-Bradley: investigating. If an ayanamsa is supplied,
 * the Fagan-Bradley sign/DMS is reported in provider_metadata only.
 *
 * Fields left null, as the contract requires for unknowns ("Unknown fields
 * stay null. No fabricated resolution."):
 *   dimension - investigating (no sourced planet->dimension rule; the donor
 *               letters.js mapping is labeled PROJECT_HYPOTHESIS H3)
 *   arc       - investigating (contract: int arc-seconds "on the wheel"; the
 *               wheel's zero point for this field is not stated in a source)
 *   house     - investigating (needs birth time/place and a house system)
 */

export const VERIFIED_WHEEL_PROVIDER_ID = 'verified:hd-math-verification-302';

export const VERIFIED_WHEEL_ANCHOR = Object.freeze({
  anchorDegrees: 302.0,
  gate41At: '302.0 deg tropical (2 deg 00 min Aquarius)',
  status: 'VERIFIED_EXTERNAL',
  source: 'research/hd-math-verification.md s.1 (3 published gate tables + human-design-py HD_START_DEGREE=358.25)',
});

export const WHEEL_FROM_41 = Object.freeze([
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
]);

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const GATE = 360 / 64, LINE = GATE / 6, COLOR = LINE / 6, TONE = COLOR / 6, BASE = TONE / 5, EPS = 1e-12;
const norm = (d) => ((d % 360) + 360) % 360;

export function wheelActivation(longitude) {
  if (!Number.isFinite(longitude)) throw new TypeError(`wheelActivation: bad longitude ${longitude}`);
  const x = norm(norm(longitude) - VERIFIED_WHEEL_ANCHOR.anchorDegrees);
  const k = Math.min(63, Math.floor(x / GATE + EPS));
  let r = x - k * GATE;
  const line = Math.min(6, Math.floor(r / LINE + EPS) + 1); r -= (line - 1) * LINE;
  const color = Math.min(6, Math.floor(r / COLOR + EPS) + 1); r -= (color - 1) * COLOR;
  const tone = Math.min(6, Math.floor(r / TONE + EPS) + 1); r -= (tone - 1) * TONE;
  const base = Math.min(5, Math.floor(r / BASE + EPS) + 1);
  return { gate: WHEEL_FROM_41[k], line, color, tone, base };
}

export function zodiacDms(longitude) {
  const x = norm(longitude);
  const s = Math.floor(x / 30);
  let rem = (x - 30 * s) * 3600;
  const degree = Math.floor(rem / 3600 + EPS); rem -= degree * 3600;
  const minute = Math.floor(rem / 60 + EPS); rem -= minute * 60;
  return { zodiac: SIGNS[s], degree, minute, second: Math.floor(rem + 1e-9) };
}

/**
 * Tropical longitude -> 13-field contract address.
 * opts.planet       planetary field, passed through as given.
 * opts.ayanamsaDeg  optional Fagan-Bradley ayanamsa (deg) for metadata only.
 *                   Fixtures: 24.7403 at J2000, 25.103512 on 1 Jan 2026
 *                   (hd-math-verification.md s.5, Swiss Ephemeris, mean).
 */
export function resolveFromLongitude(longitude, opts = {}) {
  const a = wheelActivation(longitude);
  const z = zodiacDms(longitude);
  const address = Object.freeze({
    planetary: opts.planet ?? null,
    dimension: null,
    gate: a.gate, line: a.line, color: a.color, tone: a.tone, base: a.base,
    degree: z.degree, minute: z.minute, second: z.second,
    arc: null,
    zodiac: z.zodiac,
    house: null,
  });
  const provider_metadata = {
    provider: VERIFIED_WHEEL_PROVIDER_ID,
    anchor: VERIFIED_WHEEL_ANCHOR,
    zodiac_system: 'tropical',
    investigating: ['dimension', 'arc', 'house', 'tropical-vs-Fagan-Bradley for reading gates'],
  };
  if (typeof opts.ayanamsaDeg === 'number') {
    provider_metadata.fagan_bradley = { ayanamsaDeg: opts.ayanamsaDeg, ...zodiacDms(longitude - opts.ayanamsaDeg) };
  }
  return { address, provider_metadata };
}

/** Side-by-side comparison with the donor's longitudeToHD (read-only). */
export async function compareWithDonor(longitude) {
  const donor = await import(new URL('../donors/Back-up-/vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/human-design.js', import.meta.url));
  const d = donor.longitudeToHD(longitude);
  const v = wheelActivation(longitude);
  return {
    longitude,
    donor: { anchor: 58.0, gate: d.gate, line: d.line },
    verified: { anchor: 302.0, gate: v.gate, line: v.line },
    agree: d.gate === v.gate && d.line === v.line,
  };
}
