// ============================================================================
// SynthiaSubstrate.ts
// ============================================================================
// The Synthia State Space Architecture — Core Coordinate Model
//
// This is NOT a database. NOT a lookup table. NOT a knowledge graph.
//
// This is a high-dimensional coordinate space where every computation
// is represented as movement through structured coordinates.
// Function emerges from coordinate relationships, not hardcoding.
//
// Architecture:
//   Side (2: Personality/Design, Conscious/Unconscious)
//     Planet (13 domains)
//       Dimension (5: Movement, Evolution, Being, Design, Space)
//         Gate (64)
//           Line (6)
//             Color (6)
//               Tone (6)
//                 Base (5)
//                   Degree (0-59)
//                     Minute (0-59)
//                       Second (0-59)
//                         Arc (0-99)
//                           Zodiac/Season (12/4)
//                             House (12/8)
//
// Coordinate Encoding:
//   Bit-packed 32-bit integer for compact addressing
//   [side:1][planet:4][dimension:3][gate:6][line:3][color:3][tone:3][base:3] = 26 bits
//   Plus positional: degree:6, minute:6, second:6, arc:7 = 25 bits
//   Total: 51 bits → split across two 32-bit integers
//
// Memory Model:
//   Float32Array for activation intensities (69,120 nodes per side)
//   Uint32Array for addresses (compact encoding)
//   Sparse activation — only active states exist in memory
//   Dynamic edge emergence — edges computed, not stored
//
// Computational Model:
//   1. Receive input
//   2. Determine planetary domain
//   3. Resolve dimensional state
//   4. Locate candidate gates
//   5. Refine through line, color, tone, base
//   6. Resolve positional coordinates
//   7. Apply macro-coordinate context
//   8. Compute edge emergence
//   9. Allow centers to emerge
//   10. Produce transformed state
// ============================================================================
// ============================================================================
// CONSTANTS
// ============================================================================
export const CONSTANTS = {
    SIDES: 2, // Personality/Design, Conscious/Unconscious
    PLANETS: 13, // 13 planetary domains
    DIMENSIONS: 5, // Movement, Evolution, Being, Design, Space
    GATES: 64, // 64 gates (I Ching hexagrams)
    LINES: 6, // 6 lines per gate
    COLORS: 6, // 6 colors
    TONES: 6, // 6 tones
    BASES: 5, // 5 bases
    DEGREES: 60, // 0-59
    MINUTES: 60, // 0-59
    SECONDS: 60, // 0-59
    ARCS: 100, // 0-99
    ZODIACS: 12, // 12 zodiac signs
    SEASONS: 4, // 4 seasons
    HOUSES_ZODIAC: 12, // 12 houses (zodiac side)
    HOUSES_SEASON: 8, // 8 houses (season side)
    CHANNELS: 36, // 36 channels (Human Design)
    CENTERS: 9, // 9 emergent centers
};
// Total nodes per side: 64 × 6 × 6 × 6 × 5 = 69,120
export const NODES_PER_SIDE = CONSTANTS.GATES * CONSTANTS.LINES * CONSTANTS.COLORS * CONSTANTS.TONES * CONSTANTS.BASES;
// Total nodes: 69,120 × 2 sides = 138,240
export const TOTAL_NODES = NODES_PER_SIDE * CONSTANTS.SIDES;
// ============================================================================
// DIMENSION NAMES
// ============================================================================
export const DIMENSION_NAMES = [
    'Movement', // D1: Energy, Creation, Seeing, Landscape
    'Evolution', // D2: Gravity, Memory, Taste, Love, Light
    'Being', // D3: Matter, Touch, Sex, Survival
    'Design', // D4: Structure, Progress, Smelt, Life, Art
    'Space', // D5: Form, Illusion, Hearing, Music, Freedom
];
// ============================================================================
// BASE NAMES (from your design images)
// ============================================================================
export const BASE_NAMES = [
    { id: 1, name: 'Individuality', yang: true, sense: 'Seeing', location: 'Where', mantra: 'I Define', dimension: 'Movement' },
    { id: 2, name: 'Mind', yang: true, sense: 'Taste', location: 'What', mantra: 'I Remember', dimension: 'Evolution' },
    { id: 3, name: 'Body', yin: true, sense: 'Touching', location: 'When', mantra: 'I Am', dimension: 'Being' },
    { id: 4, name: 'Ego', yin: true, sense: 'Smell', location: 'Why', mantra: 'I Design', dimension: 'Design' },
    { id: 5, name: 'Personality', yang: true, sense: 'Hearing', location: 'Who', mantra: 'I Think', dimension: 'Space' },
];
// ============================================================================
// COLOR NAMES (from your design image)
// ============================================================================
export const COLOR_NAMES = [
    { id: 1, name: 'Fear', response: 'Fear', mode: 'Communalist', binary: 'Splenic' },
    { id: 2, name: 'Hope', response: 'Hope', mode: 'Theist', binary: 'Splenic' },
    { id: 3, name: 'Desire', response: 'Desire', mode: 'Leader', binary: 'Ajna' },
    { id: 4, name: 'Need', response: 'Need', mode: 'Master', binary: 'Ajna' },
    { id: 5, name: 'Guilt', response: 'Guilt', mode: 'Conditioner', binary: 'Solar' },
    { id: 6, name: 'Innocence', response: 'Innocence', mode: 'Observer', binary: 'Plexus' },
];
// ============================================================================
// TONE NAMES (from your design image)
// ============================================================================
export const TONE_NAMES = [
    { id: 1, name: 'Security', theme: 'Security', department: 'Smell', binary: 'Splenic' },
    { id: 2, name: 'Uncertainty', theme: 'Uncertainty', department: 'Taste', binary: 'Splenic' },
    { id: 3, name: 'Action', theme: 'Action', department: 'Outer Vision', binary: 'Ajna' },
    { id: 4, name: 'Meditation', theme: 'Meditation', department: 'Inner Vision', binary: 'Ajna' },
    { id: 5, name: 'Judgement', theme: 'Judgement', department: 'Feeling', binary: 'Solar' },
    { id: 6, name: 'Acceptance', theme: 'Acceptance', department: 'Touch', binary: 'Plexus' },
];
// ============================================================================
// BIT-PACKED ADDRESS ENCODING
// ============================================================================
export class CoordinateEncoder {
    // Pack coordinate into two 32-bit integers
    // Word 1: [side:1][planet:4][dimension:3][gate:6][line:3][color:3][tone:3][base:3] = 26 bits
    // Word 2: [degree:6][minute:6][second:6][arc:7][zodiac:4][house:4] = 33 bits (uses 33 of 32, so we split)
    static encode(coord) {
        const word1 = (coord.side & 0x1) |
            ((coord.planet & 0xF) << 1) |
            ((coord.dimension & 0x7) << 5) |
            ((coord.gate & 0x3F) << 8) |
            ((coord.line & 0x7) << 14) |
            ((coord.color & 0x7) << 17) |
            ((coord.tone & 0x7) << 20) |
            ((coord.base & 0x7) << 23);
        const word2 = (coord.degree & 0x3F) |
            ((coord.minute & 0x3F) << 6) |
            ((coord.second & 0x3F) << 12) |
            ((coord.arc & 0x7F) << 18) |
            ((coord.zodiac & 0xF) << 25) |
            ((coord.houseZodiac & 0xF) << 29);
        return [word1 >>> 0, word2 >>> 0];
    }
    static decode(word1, word2) {
        return {
            side: (word1 & 0x1),
            planet: (word1 >> 1) & 0xF,
            dimension: (word1 >> 5) & 0x7,
            gate: (word1 >> 8) & 0x3F,
            line: (word1 >> 14) & 0x7,
            color: (word1 >> 17) & 0x7,
            tone: (word1 >> 20) & 0x7,
            base: (word1 >> 23) & 0x7,
            degree: word2 & 0x3F,
            minute: (word2 >> 6) & 0x3F,
            second: (word2 >> 12) & 0x3F,
            arc: (word2 >> 18) & 0x7F,
            zodiac: (word2 >> 25) & 0xF,
            season: 0, // Derived from zodiac
            houseZodiac: (word2 >> 29) & 0xF,
            houseSeason: 0, // Derived from houseZodiac
        };
    }
    // Get linear index for array access (0 to 69,119 per side)
    static toIndex(coord) {
        return coord.gate * CONSTANTS.LINES * CONSTANTS.COLORS * CONSTANTS.TONES * CONSTANTS.BASES +
            coord.line * CONSTANTS.COLORS * CONSTANTS.TONES * CONSTANTS.BASES +
            coord.color * CONSTANTS.TONES * CONSTANTS.BASES +
            coord.tone * CONSTANTS.BASES +
            coord.base;
    }
    // Get side offset (0 or 69,120)
    static sideOffset(side) {
        return side * NODES_PER_SIDE;
    }
    // Full linear address (0 to 138,239)
    static fullAddress(coord) {
        return this.sideOffset(coord.side) + this.toIndex(coord);
    }
}
// ============================================================================
// THE SYNTHIA SUBSTRATE
// ============================================================================
export class SynthiaSubstrate {
    // Activation intensities: Float32Array of length 138,240 (2 sides × 69,120 nodes)
    // Index 0-69,119 = side 0 (Personality/Conscious)
    // Index 69,120-138,239 = side 1 (Design/Unconscious)
    activation;
    // Address lookup: Uint32Array for fast reverse mapping
    // Stores packed addresses for active nodes only (sparse)
    activeAddresses;
    activeCoordinates = new Map();
    activeCount = 0;
    // Edge emergence cache: Map from node index to connected node indices
    // Computed dynamically, not stored statically
    edgeCache = new Map();
    // Channel definitions (36 channels from Human Design)
    channels = [
        [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59],
        [7, 31], [9, 52], [10, 20], [11, 56], [12, 22], [13, 33],
        [16, 48], [17, 62], [18, 58], [19, 49], [20, 10], [21, 45],
        [23, 43], [24, 61], [25, 51], [26, 44], [27, 50], [28, 38],
        [29, 46], [30, 41], [32, 54], [34, 57], [35, 36], [37, 40],
        [39, 55], [42, 53], [47, 64], [60, 3], [61, 24], [63, 4],
    ];
    // Center definitions (9 centers, emergent from gate organization)
    centerGates = new Map([
        ['Head', [64, 61, 63]],
        ['Ajna', [47, 24, 4, 11]],
        ['Throat', [62, 23, 56, 35, 12, 45, 33, 20]],
        ['G', [1, 13, 25, 46, 2, 15, 10]],
        ['Heart', [40, 26, 51, 21]],
        ['Solar', [29, 30, 36, 6, 55, 37, 22]],
        ['Spleen', [48, 16, 44, 57, 50, 32, 18, 28]],
        ['Sacral', [5, 14, 29, 34, 57, 59]],
        ['Root', [58, 38, 54, 19, 39, 41, 53]],
    ]);
    constructor() {
        this.activation = new Float32Array(TOTAL_NODES);
        this.activeAddresses = new Uint32Array(TOTAL_NODES); // Max possible, but sparse
    }
    // ==========================================================================
    // ACTIVATION
    // ==========================================================================
    /** Activate a node at the given coordinate */
    activate(coord, intensity = 1.0) {
        const addr = CoordinateEncoder.fullAddress(coord);
        this.activation[addr] = Math.min(1.0, Math.max(0, intensity));
        // Track active address
        if (intensity > 0) {
            const packed = CoordinateEncoder.encode(coord);
            // Keep legacy compact hint, but preserve the complete coordinate separately.
            // The former implementation truncated both 32-bit words to 16 bits and
            // getActiveNodes() therefore could not reconstruct any active node.
            this.activeAddresses[this.activeCount] = packed[0] >>> 0;
            this.activeCoordinates.set(addr, { ...coord, intensity: this.activation[addr], packed: [packed[0] >>> 0, packed[1] >>> 0] });
            this.activeCount = this.activeCoordinates.size;
        } else {
            this.activeCoordinates.delete(addr);
            this.activeCount = this.activeCoordinates.size;
        }
    }
    /** Get activation intensity at coordinate */
    getIntensity(coord) {
        return this.activation[CoordinateEncoder.fullAddress(coord)];
    }
    /** Get all active nodes (sparse) */
    getActiveNodes() {
        return [...this.activeCoordinates.values()].map(x => ({ ...x, packed: [...x.packed] }));
    }
    // ==========================================================================
    // EDGE EMERGENCE
    // ==========================================================================
    /** Compute emergent edges from a node */
    computeEdges(coord) {
        const index = CoordinateEncoder.toIndex(coord);
        // Check cache
        if (this.edgeCache.has(index)) {
            return this.edgeCache.get(index);
        }
        // Compute edges dynamically
        const edges = [];
        // 1. Channel edges (pre-wired)
        for (const [g1, g2] of this.channels) {
            if (coord.gate + 1 === g1 || coord.gate + 1 === g2) {
                const otherGate = coord.gate + 1 === g1 ? g2 - 1 : g1 - 1;
                const otherCoord = { ...coord, gate: otherGate };
                edges.push(CoordinateEncoder.toIndex(otherCoord));
            }
        }
        // 2. Dimensional edges (same gate, adjacent line)
        if (coord.line < CONSTANTS.LINES - 1) {
            edges.push(CoordinateEncoder.toIndex({ ...coord, line: coord.line + 1 }));
        }
        if (coord.line > 0) {
            edges.push(CoordinateEncoder.toIndex({ ...coord, line: coord.line - 1 }));
        }
        // 3. Base edges (same gate/line, adjacent base)
        if (coord.base < CONSTANTS.BASES - 1) {
            edges.push(CoordinateEncoder.toIndex({ ...coord, base: coord.base + 1 }));
        }
        // Cache and return
        this.edgeCache.set(index, edges);
        return edges;
    }
    // ==========================================================================
    // CENTER EMERGENCE
    // ==========================================================================
    /** Check which centers are defined (emergent) for a given state */
    computeCenters(coord) {
        const definedCenters = [];
        for (const [centerName, gates] of this.centerGates) {
            // A center is defined if any of its gates are active
            for (const gate of gates) {
                const testCoord = { ...coord, gate: gate - 1 };
                if (this.getIntensity(testCoord) > 0.3) {
                    definedCenters.push(centerName);
                    break;
                }
            }
        }
        return definedCenters;
    }
    // ==========================================================================
    // CONVERGENCE
    // ==========================================================================
    /** Calculate resonance score between two coordinates */
    resonance(a, b) {
        let score = 0;
        let total = 0;
        // Gate resonance (highest weight)
        if (a.gate === b.gate)
            score += 5;
        total += 5;
        // Line resonance
        if (a.line === b.line)
            score += 3;
        total += 3;
        // Color resonance
        if (a.color === b.color)
            score += 2;
        total += 2;
        // Tone resonance
        if (a.tone === b.tone)
            score += 2;
        total += 2;
        // Base resonance
        if (a.base === b.base)
            score += 1;
        total += 1;
        // Dimensional resonance
        if (a.dimension === b.dimension)
            score += 2;
        total += 2;
        return score / total;
    }
    /** Find nearest active node to a target coordinate */
    nearestActive(target) {
        let nearest = null;
        let minDistance = Infinity;
        // Scan all active nodes (simplified — in production, use spatial index)
        for (let side = 0; side < CONSTANTS.SIDES; side++) {
            for (let gate = 0; gate < CONSTANTS.GATES; gate++) {
                for (let line = 0; line < CONSTANTS.LINES; line++) {
                    for (let color = 0; color < CONSTANTS.COLORS; color++) {
                        for (let tone = 0; tone < CONSTANTS.TONES; tone++) {
                            for (let base = 0; base < CONSTANTS.BASES; base++) {
                                const coord = {
                                    side: side, planet: 0, dimension: 0,
                                    gate, line, color, tone, base,
                                    degree: 0, minute: 0, second: 0, arc: 0,
                                    zodiac: 0, season: 0, houseZodiac: 0, houseSeason: 0,
                                };
                                if (this.getIntensity(coord) > 0) {
                                    const dist = this.computeDistance(target, coord);
                                    if (dist < minDistance) {
                                        minDistance = dist;
                                        nearest = coord;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return nearest ? { coord: nearest, distance: minDistance } : null;
    }
    computeDistance(a, b) {
        // Weighted Euclidean distance in coordinate space
        const dg = (a.gate - b.gate) / CONSTANTS.GATES;
        const dl = (a.line - b.line) / CONSTANTS.LINES;
        const dc = (a.color - b.color) / CONSTANTS.COLORS;
        const dt = (a.tone - b.tone) / CONSTANTS.TONES;
        const db = (a.base - b.base) / CONSTANTS.BASES;
        return Math.sqrt(dg * dg * 5 + dl * dl * 3 + dc * dc * 2 + dt * dt * 2 + db * db);
    }
    // ==========================================================================
    // STATE TRANSITION
    // ==========================================================================
    /** Move from current coordinate to new coordinate (state transition) */
    transition(from, to) {
        // Compute path through intermediate coordinates
        const path = [from];
        // Simple linear interpolation (in production, use geodesic on manifold)
        const steps = 5;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            path.push({
                ...from,
                gate: Math.round(from.gate + (to.gate - from.gate) * t),
                line: Math.round(from.line + (to.line - from.line) * t),
                color: Math.round(from.color + (to.color - from.color) * t),
                tone: Math.round(from.tone + (to.tone - from.tone) * t),
                base: Math.round(from.base + (to.base - from.base) * t),
            });
        }
        path.push(to);
        return {
            path,
            resonance: this.resonance(from, to),
            centers: this.computeCenters(to),
        };
    }
    // ==========================================================================
    // W-H INTERROGATIVE MAPPING
    // ==========================================================================
    /** Map W-H interrogative to coordinate dimension */
    whToDimension(wh) {
        switch (wh) {
            case 'where': return 0; // Movement
            case 'what': return 1; // Evolution
            case 'when': return 2; // Being
            case 'why': return 3; // Design
            case 'who': return 4; // Space
        }
    }
    /** Extract coordinate from W-H input */
    extractFromWH(input) {
        // Default coordinate
        const coord = {
            side: 0, planet: 0, dimension: 0,
            gate: 0, line: 0, color: 0, tone: 0, base: 0,
            degree: 0, minute: 0, second: 0, arc: 0,
            zodiac: 0, season: 0, houseZodiac: 0, houseSeason: 0,
        };
        // Map WHERE → Movement (Base 1)
        if (input.where) {
            coord.dimension = 0;
            coord.base = 0;
            // Extract gate from spatial keywords
            const gates = this.extractGatesFromText(input.where);
            if (gates.length > 0)
                coord.gate = gates[0];
        }
        // Map WHAT → Evolution (Base 2)
        if (input.what) {
            coord.dimension = 1;
            coord.base = 1;
            const gates = this.extractGatesFromText(input.what);
            if (gates.length > 0)
                coord.gate = gates[0];
        }
        // Map WHEN → Being (Base 3)
        if (input.when) {
            coord.dimension = 2;
            coord.base = 2;
        }
        // Map WHY → Design (Base 4)
        if (input.why) {
            coord.dimension = 3;
            coord.base = 3;
        }
        // Map WHO → Space (Base 5)
        if (input.who) {
            coord.dimension = 4;
            coord.base = 4;
        }
        return coord;
    }
    extractGatesFromText(text) {
        // Simple keyword-to-gate mapping
        const keywords = {
            'creative': [0], 'receptive': [1], 'difficulty': [2], 'youthful': [3],
            'waiting': [4], 'conflict': [5], 'army': [6], 'fellowship': [7],
            'small': [8], 'treading': [9], 'peace': [10], 'standstill': [11],
            'great': [13], 'modesty': [14], 'enthusiasm': [15],
            'following': [16], 'work': [17], 'decay': [18], 'approach': [19],
            'contemplation': [20], 'biting': [21], 'grace': [22], 'splitting': [23],
            'return': [24], 'innocence': [25], 'taming': [26], 'nourishing': [27],
            'preponderance': [28], 'abysmal': [28], 'clinging': [29], 'influence': [30],
            'duration': [31], 'retreat': [32], 'power': [34],
            'progress': [35], 'darkening': [36], 'family': [36], 'opposition': [37],
            'obstruction': [38], 'deliverance': [39], 'decrease': [40], 'increase': [41],
            'breakthrough': [42], 'coming': [43], 'gathering': [44], 'pushing': [45],
            'wandering': [47], 'well': [48], 'revolution': [49],
            'cauldron': [49], 'thunder': [50], 'mountain': [51], 'development': [52],
            'marrying': [53], 'abundance': [54], 'wanderer': [55], 'gentle': [56],
            'joyous': [57], 'dispersion': [58], 'limitation': [59], 'inner': [60],
            'truth': [61], 'after': [63], 'before': [62],
        };
        const gates = [];
        const lower = text.toLowerCase();
        for (const [word, gateList] of Object.entries(keywords)) {
            if (lower.includes(word)) {
                gates.push(...gateList);
            }
        }
        return gates;
    }
    // ==========================================================================
    // EXPORT
    // ==========================================================================
    getActivationArray() {
        return this.activation;
    }
    getActiveCount() {
        return this.activeCount;
    }
    getChannels() {
        return this.channels;
    }
}
// ============================================================================
// EXPORT
// ============================================================================
