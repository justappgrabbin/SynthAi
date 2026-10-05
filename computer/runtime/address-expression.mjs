import { gatePattern, hexagramName } from '../donors/phone-neural/kingwen.mjs';
import { soundFor } from '../donors/phone-neural/state-space/sounds.js';
import { colorFor } from '../donors/phone-neural/state-space/colors.js';
const SIGNS = 'Aries Taurus Gemini Cancer Leo Virgo Libra Scorpio Sagittarius Capricorn Aquarius Pisces'.split(' ');

export const ONTOLOGICAL_FIELDS = Object.freeze([
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base',
  'degree', 'minute', 'second', 'arc', 'zodiac', 'house',
]);
const NATO = 'Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey X-ray Yankee Zulu'.split(' ');

// Every channel derives from the same resolved source. No decorative addresses.
export function expressAddress(address, { encodings = true } = {}) {
  if (!address || typeof address !== 'object' || !ONTOLOGICAL_FIELDS.some(key => address[key] != null)) return null;
  const canonical = Object.fromEntries(ONTOLOGICAL_FIELDS.map(key => [key, address[key] ?? null]));
  const source = JSON.stringify(canonical);
  const bits = Number.isInteger(canonical.gate) && canonical.gate >= 1 && canonical.gate <= 64 ? gatePattern(canonical.gate) : [];
  const sentence = ONTOLOGICAL_FIELDS.map(key => `${key} ${canonical[key] ?? 'unresolved'}`).join('; ') + '.';
  const resolved = ['gate', 'line', 'color', 'tone', 'base', 'arc'].every(key => Number.isFinite(canonical[key])) && SIGNS.includes(canonical.zodiac);
  const projection = resolved ? { ...canonical, planetaryDimension: canonical.dimension ?? 'Being', arcSecond: canonical.arc, zodiac: SIGNS.indexOf(canonical.zodiac) + 1 } : null;
  const expression = {
    address: canonical, source, sentence,
    channels: projection ? { sound: soundFor(projection), color: colorFor(projection), projection: projection.planetaryDimension,
      source: 'Pure Synthia semantic-mesh state-space; explicit render projection, raw address unchanged' } : null,
    structure: { bits, bigrams: [bits.slice(0, 2), bits.slice(2, 4), bits.slice(4, 6)],
      trigrams: [bits.slice(0, 3), bits.slice(3, 6)], hexagram: bits.length ? String.fromCodePoint(0x4dc0 + canonical.gate - 1) : null,
      name: bits.length ? hexagramName(canonical.gate) : null, convention: 'King Wen → Fu Xi; line 1 first' },
  };
  if (!encodings) return expression;
  const bytes = new TextEncoder().encode(source);
  const ascii = [...source].map(char => char.codePointAt(0) <= 127 ? char : `\\u{${char.codePointAt(0).toString(16)}}`).join('');
  return { ...expression,
    binary: [...bytes].map(byte => byte.toString(2).padStart(8, '0')).join(' '),
    ascii,
    nato: [...ascii].map(char => /[a-z]/i.test(char) ? NATO[char.toUpperCase().charCodeAt(0) - 65] : char).join(' '),
    transliteration: source.normalize('NFKD').replace(/\p{M}/gu, ''),
    unicode: [...source].map(char => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(' '),
  };
}
