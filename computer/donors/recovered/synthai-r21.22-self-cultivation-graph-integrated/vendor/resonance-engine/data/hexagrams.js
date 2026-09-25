/**
 * All 64 hexagrams with canonical data.
 * lines: [line1(bottom), line2, line3, line4, line5, line6(top)]
 *   1 = yang (solid), 0 = yin (broken)
 * lower trigram = lines[0..2], upper trigram = lines[3..5]
 *
 * Binary (Fu Xi) value = Σ lines[i] × 2^i  (line1 = LSB)
 * Complement = XOR with 63 (flip all lines)
 * Reverse Fu Xi = 63 - fuxi
 */

// Trigram binary values (lower 3 bits, line1=LSB)
const TRIGRAMS = {
  Qian: { name: 'Qian', symbol: '☰', meaning: 'Heaven', lines: [1,1,1], binary: 7 },
  Kun:  { name: 'Kun',  symbol: '☷', meaning: 'Earth',   lines: [0,0,0], binary: 0 },
  Zhen: { name: 'Zhen', symbol: '☳', meaning: 'Thunder', lines: [1,0,0], binary: 1 },
  Xun:  { name: 'Xun',  symbol: '☴', meaning: 'Wind',    lines: [0,1,1], binary: 6 },
  Kan:  { name: 'Kan',  symbol: '☵', meaning: 'Water',   lines: [0,1,0], binary: 2 },
  Li:   { name: 'Li',   symbol: '☲', meaning: 'Fire',    lines: [1,0,1], binary: 5 },
  Gen:  { name: 'Gen',  symbol: '☶', meaning: 'Mountain',lines: [0,0,1], binary: 4 },
  Dui:  { name: 'Dui',  symbol: '☱', meaning: 'Lake',    lines: [1,1,0], binary: 3 },
};

// King Wen sequence: [lower trigram, upper trigram, name, character, keyword]
const KW_DATA = [
  // kw, lower,  upper,   name,          char, keyword
  [1,  'Qian','Qian','Qian',         '乾', 'The Creative'],
  [2,  'Kun', 'Kun', 'Kun',          '坤', 'The Receptive'],
  [3,  'Zhen','Kan', 'Zhun',         '屯', 'Difficulty at the Beginning'],
  [4,  'Kan', 'Gen', 'Meng',         '蒙', 'Youthful Folly'],
  [5,  'Qian','Kan', 'Xu',           '需', 'Waiting'],
  [6,  'Kan', 'Qian','Song',         '訟', 'Conflict'],
  [7,  'Kun', 'Kan', 'Shi',          '師', 'The Army'],
  [8,  'Kan', 'Kun', 'Bi',           '比', 'Holding Together'],
  [9,  'Qian','Xun', 'Xiao Xu',      '小畜','Small Taming'],
  [10, 'Dui', 'Qian','Lu',           '履', 'Treading'],
  [11, 'Qian','Kun', 'Tai',          '泰', 'Peace'],
  [12, 'Kun', 'Qian','Pi',           '否', 'Standstill'],
  [13, 'Li',  'Qian','Tong Ren',     '同人','Fellowship'],
  [14, 'Qian','Li',  'Da You',       '大有','Great Possession'],
  [15, 'Gen', 'Kun', 'Qian',         '謙', 'Modesty'],
  [16, 'Kun', 'Zhen','Yu',           '豫', 'Enthusiasm'],
  [17, 'Zhen','Dui', 'Sui',          '隨', 'Following'],
  [18, 'Xun', 'Gen', 'Gu',           '蠱', 'Work on the Decayed'],
  [19, 'Dui', 'Kun', 'Lin',          '臨', 'Approach'],
  [20, 'Kun', 'Xun', 'Guan',         '觀', 'Contemplation'],
  [21, 'Zhen','Li',  'Shi He',       '噬嗑','Biting Through'],
  [22, 'Li',  'Gen', 'Bi',           '賁', 'Grace'],
  [23, 'Kun', 'Gen', 'Bo',           '剝', 'Splitting Apart'],
  [24, 'Zhen','Kun', 'Fu',           '復', 'Return'],
  [25, 'Zhen','Qian','Wu Wang',      '無妄','Innocence'],
  [26, 'Qian','Gen', 'Da Xu',        '大畜','Great Taming'],
  [27, 'Zhen','Gen', 'Yi',           '頤', 'Nourishment'],
  [28, 'Xun', 'Dui', 'Da Guo',       '大過','Great Exceeding'],
  [29, 'Kan', 'Kan', 'Kan',          '坎', 'The Abysmal'],
  [30, 'Li',  'Li',  'Li',           '離', 'The Clinging'],
  [31, 'Gen', 'Dui', 'Xian',         '咸', 'Influence'],
  [32, 'Xun', 'Zhen','Heng',         '恆', 'Duration'],
  [33, 'Gen', 'Qian','Dun',          '遯', 'Retreat'],
  [34, 'Qian','Zhen','Da Zhuang',    '大壯','Great Power'],
  [35, 'Kun', 'Li',  'Jin',          '晉', 'Progress'],
  [36, 'Li',  'Kun', 'Ming Yi',      '明夷','Darkening of the Light'],
  [37, 'Li',  'Xun', 'Jia Ren',      '家人','The Family'],
  [38, 'Dui', 'Li',  'Kui',          '睽', 'Opposition'],
  [39, 'Gen', 'Kan', 'Jian',         '蹇', 'Obstruction'],
  [40, 'Kan', 'Zhen','Jie',          '解', 'Deliverance'],
  [41, 'Dui', 'Gen', 'Sun',          '損', 'Decrease'],
  [42, 'Zhen','Xun', 'Yi',           '益', 'Increase'],
  [43, 'Qian','Dui', 'Guai',         '夬', 'Breakthrough'],
  [44, 'Xun', 'Qian','Gou',          '姤', 'Coming to Meet'],
  [45, 'Kun', 'Dui', 'Cui',          '萃', 'Gathering'],
  [46, 'Xun', 'Kun', 'Sheng',        '升', 'Pushing Upward'],
  [47, 'Kan', 'Dui', 'Kun',          '困', 'Oppression'],
  [48, 'Xun', 'Kan', 'Jing',         '井', 'The Well'],
  [49, 'Li',  'Dui', 'Ge',           '革', 'Revolution'],
  [50, 'Xun', 'Li',  'Ding',         '鼎', 'The Cauldron'],
  [51, 'Zhen','Zhen','Zhen',         '震', 'The Arousing'],
  [52, 'Gen', 'Gen', 'Gen',          '艮', 'Keeping Still'],
  [53, 'Gen', 'Xun', 'Jian',         '漸', 'Gradual Progress'],
  [54, 'Dui', 'Zhen','Gui Mei',      '歸妹','The Marrying Maiden'],
  [55, 'Li',  'Zhen','Feng',         '豐', 'Abundance'],
  [56, 'Gen', 'Li',  'Lu',           '旅', 'The Wanderer'],
  [57, 'Xun', 'Xun', 'Xun',         '巽', 'The Gentle'],
  [58, 'Dui', 'Dui', 'Dui',         '兌', 'The Joyous'],
  [59, 'Kan', 'Xun', 'Huan',        '渙', 'Dispersion'],
  [60, 'Dui', 'Kan', 'Jie',          '節', 'Limitation'],
  [61, 'Dui', 'Xun', 'Zhong Fu',    '中孚','Inner Truth'],
  [62, 'Gen', 'Zhen','Xiao Guo',    '小過','Small Exceeding'],
  [63, 'Li',  'Kan', 'Ji Ji',        '既濟','After Completion'],
  [64, 'Kan', 'Li',  'Wei Ji',       '未濟','Before Completion'],
];

// Build the full hexagram table
function buildHexagrams() {
  return KW_DATA.map(([kw, lowerName, upperName, name, char, keyword]) => {
    const lower = TRIGRAMS[lowerName];
    const upper = TRIGRAMS[upperName];
    const lines = [...lower.lines, ...upper.lines]; // [l1..l6]
    // Fu Xi binary: line1=bit0, ..., line6=bit5
    const fuxi = lines.reduce((acc, l, i) => acc + l * (1 << i), 0);
    const complement = fuxi ^ 63; // flip all 6 lines
    const reverseFuxi = 63 - fuxi;

    // Pair: King Wen pairs hexagrams by inversion or complement
    // Nuclear hexagram: lines 2-5 form lower (l2,l3,l4) and upper (l3,l4,l5) trigrams
    const nuclearLower = [lines[1], lines[2], lines[3]];
    const nuclearUpper = [lines[2], lines[3], lines[4]];
    const nuclearLowerVal = nuclearLower.reduce((a, l, i) => a + l * (1 << i), 0);
    const nuclearUpperVal = nuclearUpper.reduce((a, l, i) => a + l * (1 << i), 0);
    const nuclearFuxi = nuclearLowerVal + (nuclearUpperVal << 3);

    return {
      kw,          // King Wen number 1-64
      name,        // Romanized name
      char,        // Chinese character
      keyword,     // English meaning
      lower: lowerName,
      upper: upperName,
      lines,       // [l1..l6] bottom to top
      fuxi,        // binary ordering value 0-63
      complement,  // complementary hexagram fuxi value
      reverseFuxi, // reverse Fu Xi value
      nuclearFuxi, // nuclear hexagram fuxi value
      // Phase space axes = the 6 lines as continuous values (0.0 yin, 1.0 yang)
      // Initially at rest at their classical values
      phaseState: lines.map(l => ({ value: l, velocity: 0, tension: 0 })),
    };
  });
}

export const HEXAGRAMS = buildHexagrams();

// Index by fuxi value for fast lookup
export const BY_FUXI = new Array(64);
HEXAGRAMS.forEach(h => { BY_FUXI[h.fuxi] = h; });

// Index by King Wen number
export const BY_KW = new Array(65);
HEXAGRAMS.forEach(h => { BY_KW[h.kw] = h; });

export { TRIGRAMS };
