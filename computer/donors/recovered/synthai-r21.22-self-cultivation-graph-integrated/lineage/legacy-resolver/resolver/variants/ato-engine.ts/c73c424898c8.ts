// ============================================================
// DISEMINER MCP Server — ATO Engine + Klein Tools
// Deterministic, Non-LLM, Graph-Based Narrative System
// ============================================================

// ─────────────────────────────────────────────────────────────
// SECTION 1: XNOR ATO (Appositional Transformation Operator)
// Based on Klein 1983 — strong equivalence / biconditional
// ─────────────────────────────────────────────────────────────

/**
 * XNOR operation on two 3-bit trigrams.
 * Klein's *product: *(a, b) = a XNOR b
 * Verified against paper examples:
 *   *(001, 000) = 110 (Mountain)
 *   *(011, 110) = 010 (Water)
 */
export function atoXNOR(a: string, b: string): string {
  if (a.length !== 3 || b.length !== 3) {
    throw new Error(`ATO XNOR requires 3-bit trigrams, got ${a} and ${b}`);
  }
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += (a[i] === b[i]) ? '1' : '0';
  }
  return result;
}

/**
 * Full hexagram ATO: applies XNOR to both upper and lower trigrams
 */
export function atoHexagram(upperA: string, lowerA: string, atoOp: string): { upper: string; lower: string } {
  return {
    upper: atoXNOR(upperA, atoOp),
    lower: atoXNOR(lowerA, atoOp)
  };
}

/**
 * Transform an entire house (array of 8 hexagrams) by ATO operator
 */
export function transformHouse(house: Hexagram[], atoOperator: string): Hexagram[] {
  return house.map(h => {
    const transformed = atoHexagram(h.upperTrigram, h.lowerTrigram, atoOperator);
    return {
      ...h,
      upperTrigram: transformed.upper,
      lowerTrigram: transformed.lower,
      binary: transformed.upper + transformed.lower,
      // Name lookup happens via the trigram→hexagram mapping
      name: lookupHexagramName(transformed.upper, transformed.lower)
    };
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION 2: TRIGRAM & HEXAGRAM REGISTRY
// ─────────────────────────────────────────────────────────────

export interface Trigram {
  binary: string;      // 3-bit: 000-111
  name: string;
  element: string;
  direction: string;
  season: string;
  climate: string;
  sound: string;
  emotion: string;
  bodyPart: string;
  color: string;
  animal: string;
  musicalNote: string;
  familyPosition: string;
}

export interface Hexagram {
  number: number;      // 1-64
  binary: string;      // 6-bit: upper(3) + lower(3)
  upperTrigram: string; // 3-bit
  lowerTrigram: string; // 3-bit
  name: string;
  houseId: number;     // 1-8
  housePosition: number; // 1-8 within house
}

// The 8 Trigrams (from Klein 1983, Wilhelm 1967)
export const TRIGRAMS: Record<string, Trigram> = {
  '111': { binary: '111', name: 'Heaven', element: 'metal', direction: 'south', season: 'summer', climate: 'hot', sound: 'shouting', emotion: 'grief', bodyPart: 'head', color: 'white', animal: 'horse', musicalNote: 'shang', familyPosition: 'father' },
  '000': { binary: '000', name: 'Earth', element: 'earth', direction: 'center', season: 'late summer', climate: 'humid', sound: 'singing', emotion: 'sympathy', bodyPart: 'belly', color: 'yellow', animal: 'ox', musicalNote: 'kung', familyPosition: 'mother' },
  '001': { binary: '001', name: 'Thunder', element: 'wood', direction: 'east', season: 'spring', climate: 'windy', sound: 'chiüeh', emotion: 'anger', bodyPart: 'foot', color: 'blue', animal: 'dragon', musicalNote: 'chiüeh', familyPosition: '1st son' },
  '010': { binary: '010', name: 'Water', element: 'water', direction: 'north', season: 'winter', climate: 'cold', sound: 'yü', emotion: 'fear', bodyPart: 'ear', color: 'black', animal: 'pig', musicalNote: 'yü', familyPosition: '2nd son' },
  '011': { binary: '011', name: 'Lake', element: 'metal', direction: 'west', season: 'autumn', climate: 'dry', sound: 'shang', emotion: 'pleasure', bodyPart: 'mouth', color: 'white', animal: 'sheep', musicalNote: 'shang', familyPosition: '3rd daughter' },
  '100': { binary: '100', name: 'Mountain', element: 'earth', direction: 'northeast', season: 'late winter', climate: 'still', sound: ''fang'', emotion: 'stillness', bodyPart: 'hand', color: 'yellow', animal: 'dog', musicalNote: 'kung', familyPosition: '3rd son' },
  '101': { binary: '101', name: 'Fire', element: 'fire', direction: 'southeast', season: 'early summer', climate: 'bright', sound: 'chih', emotion: 'joy', bodyPart: 'eye', color: 'red', animal: 'pheasant', musicalNote: 'chih', familyPosition: '2nd daughter' },
  '110': { binary: '110', name: 'Wind', element: 'wood', direction: 'southeast', season: 'spring', climate: 'penetrating', sound: 'hsüan', emotion: 'penetration', bodyPart: 'thigh', color: 'green', animal: 'fowl', musicalNote: 'chiüeh', familyPosition: '1st daughter' }
};

// Build hexagram name from trigram pair
export function lookupHexagramName(upper: string, lower: string): string {
  const upperTri = TRIGRAMS[upper];
  const lowerTri = TRIGRAMS[lower];
  if (!upperTri || !lowerTri) return 'Unknown';
  // Standard naming: [Upper] over [Lower]
  return `${upperTri.name} over ${lowerTri.name}`;
}

// The 8 Houses (from Klein 1983)
export const HOUSES: Record<number, Hexagram[]> = {
  1: [ // House of the Creative (Heaven)
    { number: 1, binary: '111111', upperTrigram: '111', lowerTrigram: '111', name: 'The Creative', houseId: 1, housePosition: 1 },
    { number: 44, binary: '111110', upperTrigram: '111', lowerTrigram: '110', name: 'Coming to Meet', houseId: 1, housePosition: 2 },
    { number: 33, binary: '111100', upperTrigram: '111', lowerTrigram: '100', name: 'Retreat', houseId: 1, housePosition: 3 },
    { number: 12, binary: '111000', upperTrigram: '111', lowerTrigram: '000', name: 'Standstill', houseId: 1, housePosition: 4 },
    { number: 20, binary: '110000', upperTrigram: '110', lowerTrigram: '000', name: 'Contemplation', houseId: 1, housePosition: 5 },
    { number: 23, binary: '100000', upperTrigram: '100', lowerTrigram: '000', name: 'Splitting Apart', houseId: 1, housePosition: 6 },
    { number: 35, binary: '101000', upperTrigram: '101', lowerTrigram: '000', name: 'Progress', houseId: 1, housePosition: 7 },
    { number: 14, binary: '101111', upperTrigram: '101', lowerTrigram: '111', name: 'Possession in Great Measure', houseId: 1, housePosition: 8 }
  ],
  2: [ // House of the Abysmal (Water)
    { number: 29, binary: '010010', upperTrigram: '010', lowerTrigram: '010', name: 'The Abysmal', houseId: 2, housePosition: 1 },
    { number: 60, binary: '010011', upperTrigram: '010', lowerTrigram: '011', name: 'Limitation', houseId: 2, housePosition: 2 },
    { number: 3, binary: '010001', upperTrigram: '010', lowerTrigram: '001', name: 'Difficulty at the Beginning', houseId: 2, housePosition: 3 },
    { number: 55, binary: '001101', upperTrigram: '001', lowerTrigram: '101', name: 'Abundance', houseId: 2, housePosition: 4 },
    { number: 49, binary: '011101', upperTrigram: '011', lowerTrigram: '101', name: 'Revolution', houseId: 2, housePosition: 5 },
    { number: 63, binary: '010101', upperTrigram: '010', lowerTrigram: '101', name: 'After Completion', houseId: 2, housePosition: 6 },
    { number: 36, binary: '000101', upperTrigram: '000', lowerTrigram: '101', name: 'Darkening of the Light', houseId: 2, housePosition: 7 },
    { number: 7, binary: '000010', upperTrigram: '000', lowerTrigram: '010', name: 'The Army', houseId: 2, housePosition: 8 }
  ],
  3: [ // House of Keeping Still (Mountain)
    { number: 52, binary: '100100', upperTrigram: '100', lowerTrigram: '100', name: 'Keeping Still', houseId: 3, housePosition: 1 },
    { number: 22, binary: '100101', upperTrigram: '100', lowerTrigram: '101', name: 'Grace', houseId: 3, housePosition: 2 },
    { number: 26, binary: '100111', upperTrigram: '100', lowerTrigram: '111', name: 'Taming Power of the Great', houseId: 3, housePosition: 3 },
    { number: 11, binary: '100000', upperTrigram: '100', lowerTrigram: '000', name: 'Peace', houseId: 3, housePosition: 4 },
    { number: 53, binary: '110100', upperTrigram: '110', lowerTrigram: '100', name: 'Development', houseId: 3, housePosition: 5 },
    { number: 10, binary: '111011', upperTrigram: '111', lowerTrigram: '011', name: 'Treading', houseId: 3, housePosition: 6 },
    { number: 61, binary: '110011', upperTrigram: '110', lowerTrigram: '011', name: 'Inner Truth', houseId: 3, housePosition: 7 },
    { number: 38, binary: '101011', upperTrigram: '101', lowerTrigram: '011', name: 'Opposition', houseId: 3, housePosition: 8 }
  ],
  4: [ // House of the Arousing (Thunder)
    { number: 51, binary: '001001', upperTrigram: '001', lowerTrigram: '001', name: 'The Arousing', houseId: 4, housePosition: 1 },
    { number: 17, binary: '001011', upperTrigram: '001', lowerTrigram: '011', name: 'Following', houseId: 4, housePosition: 2 },
    { number: 16, binary: '001000', upperTrigram: '001', lowerTrigram: '000', name: 'Enthusiasm', houseId: 4, housePosition: 3 },
    { number: 32, binary: '001110', upperTrigram: '001', lowerTrigram: '110', name: 'Duration', houseId: 4, housePosition: 4 },
    { number: 40, binary: '001010', upperTrigram: '001', lowerTrigram: '010', name: 'Deliverance', houseId: 4, housePosition: 5 },
    { number: 48, binary: '010110', upperTrigram: '010', lowerTrigram: '110', name: 'The Well', houseId: 4, housePosition: 6 },
    { number: 46, binary: '000110', upperTrigram: '000', lowerTrigram: '110', name: 'Pushing Upward', houseId: 4, housePosition: 7 },
    { number: 28, binary: '011110', upperTrigram: '011', lowerTrigram: '110', name: 'Preponderance of the Great', houseId: 4, housePosition: 8 }
  ],
  5: [ // House of the Gentle (Wind)
    { number: 57, binary: '110110', upperTrigram: '110', lowerTrigram: '110', name: 'The Gentle', houseId: 5, housePosition: 1 },
    { number: 18, binary: '110100', upperTrigram: '110', lowerTrigram: '100', name: 'Work on What Has Been Spoiled', houseId: 5, housePosition: 2 },
    { number: 42, binary: '110001', upperTrigram: '110', lowerTrigram: '001', name: 'Increase', houseId: 5, housePosition: 3 },
    { number: 21, binary: '110101', upperTrigram: '110', lowerTrigram: '101', name: 'Biting Through', houseId: 5, housePosition: 4 },
    { number: 9, binary: '111011', upperTrigram: '111', lowerTrigram: '011', name: 'Taming Power of the Small', houseId: 5, housePosition: 5 },
    { number: 25, binary: '111001', upperTrigram: '111', lowerTrigram: '001', name: 'Innocence', houseId: 5, housePosition: 6 },
    { number: 27, binary: '100001', upperTrigram: '100', lowerTrigram: '001', name: 'Corners of the Mouth', houseId: 5, housePosition: 7 },
    { number: 37, binary: '101001', upperTrigram: '101', lowerTrigram: '001', name: 'The Family', houseId: 5, housePosition: 8 }
  ],
  6: [ // House of the Clinging (Fire)
    { number: 30, binary: '101101', upperTrigram: '101', lowerTrigram: '101', name: 'The Clinging', houseId: 6, housePosition: 1 },
    { number: 50, binary: '101110', upperTrigram: '101', lowerTrigram: '110', name: 'The Cauldron', houseId: 6, housePosition: 2 },
    { number: 56, binary: '101100', upperTrigram: '101', lowerTrigram: '100', name: 'The Wanderer', houseId: 6, housePosition: 3 },
    { number: 13, binary: '101111', upperTrigram: '101', lowerTrigram: '111', name: 'Fellowship with Men', houseId: 6, housePosition: 4 },
    { number: 59, binary: '110010', upperTrigram: '110', lowerTrigram: '010', name: 'Dispersion', houseId: 6, housePosition: 5 },
    { number: 6, binary: '111010', upperTrigram: '111', lowerTrigram: '010', name: 'Conflict', houseId: 6, housePosition: 6 },
    { number: 64, binary: '101010', upperTrigram: '101', lowerTrigram: '010', name: 'Before Completion', houseId: 6, housePosition: 7 },
    { number: 4, binary: '100010', upperTrigram: '100', lowerTrigram: '010', name: 'Youthful Folly', houseId: 6, housePosition: 8 }
  ],
  7: [ // House of the Receptive (Earth)
    { number: 2, binary: '000000', upperTrigram: '000', lowerTrigram: '000', name: 'The Receptive', houseId: 7, housePosition: 1 },
    { number: 8, binary: '000010', upperTrigram: '000', lowerTrigram: '010', name: 'Holding Together', houseId: 7, housePosition: 2 },
    { number: 5, binary: '000111', upperTrigram: '000', lowerTrigram: '111', name: 'Waiting', houseId: 7, housePosition: 3 },
    { number: 19, binary: '000011', upperTrigram: '000', lowerTrigram: '011', name: 'Approach', houseId: 7, housePosition: 4 },
    { number: 43, binary: '001111', upperTrigram: '001', lowerTrigram: '111', name: 'Break-through', houseId: 7, housePosition: 5 },
    { number: 24, binary: '001000', upperTrigram: '001', lowerTrigram: '000', name: 'Return', houseId: 7, housePosition: 6 },
    { number: 34, binary: '011111', upperTrigram: '011', lowerTrigram: '111', name: 'The Power of the Great', houseId: 7, housePosition: 7 },
    { number: 15, binary: '000100', upperTrigram: '000', lowerTrigram: '100', name: 'Modesty', houseId: 7, housePosition: 8 }
  ],
  8: [ // House of the Joyous (Lake)
    { number: 58, binary: '011011', upperTrigram: '011', lowerTrigram: '011', name: 'The Joyous', houseId: 8, housePosition: 1 },
    { number: 47, binary: '011010', upperTrigram: '011', lowerTrigram: '010', name: 'Oppression', houseId: 8, housePosition: 2 },
    { number: 31, binary: '011100', upperTrigram: '011', lowerTrigram: '100', name: 'Influence', houseId: 8, housePosition: 3 },
    { number: 45, binary: '011000', upperTrigram: '011', lowerTrigram: '000', name: 'Gathering Together', houseId: 8, housePosition: 4 },
    { number: 39, binary: '010100', upperTrigram: '010', lowerTrigram: '100', name: 'Obstruction', houseId: 8, housePosition: 5 },
    { number: 62, binary: '000110', upperTrigram: '000', lowerTrigram: '110', name: 'Preponderance of the Small', houseId: 8, housePosition: 6 },
    { number: 54, binary: '001011', upperTrigram: '001', lowerTrigram: '011', name: 'The Marrying Maiden', houseId: 8, housePosition: 7 },
    { number: 41, binary: '100011', upperTrigram: '100', lowerTrigram: '011', name: 'Decrease', houseId: 8, housePosition: 8 }
  ]
};

// Build full 64-hexagram lookup
export const HEXAGRAMS: Record<number, Hexagram> = {};
for (const houseId of Object.keys(HOUSES)) {
  for (const hex of HOUSES[parseInt(houseId)]) {
    HEXAGRAMS[hex.number] = hex;
  }
}

// Hexagram number → gate number mapping (1:1 for HD)
export function hexagramToGate(hexNumber: number): number {
  return hexNumber; // Direct mapping in this system
}

export function gateToHexagram(gateNumber: number): Hexagram {
  return HEXAGRAMS[gateNumber];
}
