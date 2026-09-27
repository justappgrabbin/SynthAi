import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import {
  transformHouse,
  HOUSES,
  HEXAGRAMS,
  TRIGRAMS
} from "./ato-engine.js";
import {
  KleinToolSystem
} from "./klein-tool-engine.js";
import {
  MonteCarloSampler,
  deriveWProfileFromChart,
  buildSentence,
  hexagramToSentenceType,
  DEFAULT_W_PROFILE
} from "./monte-carlo-sampler.js";
const kleinSystem = new KleinToolSystem();
const sampler = new MonteCarloSampler(kleinSystem, 20, 0.85);
const TOOLS = [
  {
    name: "query_gate",
    description: "Query a Human Design gate and return its full semantic, physical, and biological mapping",
    inputSchema: {
      type: "object",
      properties: {
        gate: { type: "integer", minimum: 1, maximum: 64, description: "Gate number (1-64)" },
        line: { type: "integer", minimum: 1, maximum: 6, description: "Line number (1-6)" },
        color: { type: "integer", minimum: 1, maximum: 6, description: "Color (1-6)" },
        tone: { type: "integer", minimum: 1, maximum: 6, description: "Tone (1-6)" },
        base: { type: "integer", minimum: 1, maximum: 6, description: "Base (1-6)" },
        degree: { type: "integer", minimum: 0, maximum: 29, description: "Degree within gate (0-29)" },
        minute: { type: "integer", minimum: 0, maximum: 59, description: "Arc-minute" },
        second: { type: "integer", minimum: 0, maximum: 59, description: "Arc-second" }
      },
      required: ["gate", "line", "color", "tone", "base"]
    }
  },
  {
    name: "build_sentence",
    description: "Build a five-sentence-type sentence from gate placement data",
    inputSchema: {
      type: "object",
      properties: {
        gate: { type: "integer", minimum: 1, maximum: 64 },
        line: { type: "integer", minimum: 1, maximum: 6 },
        color: { type: "integer", minimum: 1, maximum: 6 },
        tone: { type: "integer", minimum: 1, maximum: 6 },
        base: { type: "integer", minimum: 1, maximum: 6 },
        sentenceType: {
          type: "string",
          enum: ["SPACE", "MIND", "SOUL", "BODY", "HEART"],
          description: "Override auto-detected sentence type"
        }
      },
      required: ["gate", "line", "color", "tone", "base"]
    }
  },
  {
    name: "transform_house",
    description: "Apply ATO (XNOR) transformation to an I Ching house",
    inputSchema: {
      type: "object",
      properties: {
        houseId: { type: "integer", minimum: 1, maximum: 8, description: "House to transform (1-8)" },
        atoOperator: { type: "string", pattern: "^[01]{3}$", description: "3-bit trigram ATO operator" }
      },
      required: ["houseId", "atoOperator"]
    }
  },
  {
    name: "simulate_narrative",
    description: "Run Monte Carlo narrative simulation from a user query",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "User query or situation description" },
        wProfile: {
          type: "object",
          properties: {
            w1: { type: "number", minimum: 0, maximum: 1 },
            w2: { type: "number", minimum: 0, maximum: 1 },
            w3: { type: "number", minimum: 0, maximum: 1 },
            w4: { type: "number", minimum: 0, maximum: 1 },
            w5: { type: "number", minimum: 0, maximum: 1 }
          },
          description: "User W-dimension profile (optional, defaults to balanced)"
        },
        chartData: {
          type: "object",
          properties: {
            sunGate: { type: "integer" },
            sunLine: { type: "integer" },
            sunColor: { type: "integer" },
            sunTone: { type: "integer" },
            sunBase: { type: "integer" },
            earthGate: { type: "integer" },
            earthLine: { type: "integer" }
          },
          description: "HD chart data to derive W-profile from (alternative to wProfile)"
        },
        nSamples: { type: "integer", minimum: 10, maximum: 1e4, default: 1e3 },
        maxSteps: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        seed: { type: "integer", default: 42 }
      },
      required: ["query"]
    }
  },
  {
    name: "compute_resonance",
    description: "Compute harmonic resonance between two sentences or placements",
    inputSchema: {
      type: "object",
      properties: {
        sentenceA: { type: "string" },
        sentenceB: { type: "string" },
        gateA: { type: "integer" },
        gateB: { type: "integer" }
      },
      required: ["sentenceA", "sentenceB"]
    }
  },
  {
    name: "get_codon_mapping",
    description: "Get DNA codon, amino acid, and mineral analog for a gate",
    inputSchema: {
      type: "object",
      properties: {
        gateNumber: { type: "integer", minimum: 1, maximum: 64 }
      },
      required: ["gateNumber"]
    }
  },
  {
    name: "evaluate_klein_tools",
    description: "Evaluate Klein Tools at a node (context-dependent emergent behavior)",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "Node identifier" },
        activeToolIds: { type: "array", items: { type: "string" }, description: "Active Klein Tool IDs" },
        decompose: { type: "boolean", default: false, description: "Decompose tools before evaluation" },
        decomposeDepth: { type: "integer", minimum: 0, maximum: 5, default: 1 }
      },
      required: ["nodeId", "activeToolIds"]
    }
  },
  {
    name: "lookup_hexagram",
    description: "Look up hexagram by number or binary code",
    inputSchema: {
      type: "object",
      properties: {
        number: { type: "integer", minimum: 1, maximum: 64 },
        binary: { type: "string", pattern: "^[01]{6}$" }
      }
    }
  },
  {
    name: "list_houses",
    description: "List all 8 I Ching houses with their hexagrams",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "list_trigrams",
    description: "List all 8 trigrams with their correspondences",
    inputSchema: { type: "object", properties: {} }
  }
];
const RESOURCES = [
  {
    uri: "diseminer://gates/all",
    name: "All 64 Gates",
    description: "Complete mapping of 64 Human Design gates",
    mimeType: "application/json"
  },
  {
    uri: "diseminer://houses/all",
    name: "All 8 Houses",
    description: "Complete I Ching house structure with trigram mappings",
    mimeType: "application/json"
  },
  {
    uri: "diseminer://trigrams/all",
    name: "All 8 Trigrams",
    description: "Trigram correspondences (elements, directions, seasons, etc.)",
    mimeType: "application/json"
  },
  {
    uri: "diseminer://codons/all",
    name: "Codon Mapping",
    description: "64 codons mapped to gates, amino acids, and minerals",
    mimeType: "application/json"
  },
  {
    uri: "diseminer://ledger/recent",
    name: "Recent Evaluations",
    description: "Most recent Klein Tool evaluations from the append-only ledger",
    mimeType: "application/json"
  }
];
async function handleQueryGate(args) {
  const { gate, line, color, tone, base, degree = 0, minute = 0, second = 0 } = args;
  const hex = HEXAGRAMS[gate];
  if (!hex) {
    return { content: [{ type: "text", text: JSON.stringify({ error: `Gate ${gate} not found` }) }] };
  }
  const wProfile = {
    w1: gate / 64,
    w2: line / 6,
    w3: color / 6,
    w4: tone / 6,
    w5: base / 6
  };
  const sentence = buildSentence(hex, wProfile);
  const sentenceType = hexagramToSentenceType(hex);
  const upperTri = TRIGRAMS[hex.upperTrigram];
  const lowerTri = TRIGRAMS[hex.lowerTrigram];
  const codonData = getCodonForGate(gate);
  const result = {
    gate,
    line,
    color,
    tone,
    base,
    degree,
    minute,
    second,
    hexagram: {
      number: hex.number,
      name: hex.name,
      binary: hex.binary,
      upperTrigram: { binary: hex.upperTrigram, ...upperTri },
      lowerTrigram: { binary: hex.lowerTrigram, ...lowerTri }
    },
    sentence,
    sentenceType,
    centerVoice: getCenterVoice(gate),
    physicsMetaphor: getPhysicsMetaphor(gate, line),
    codon: codonData,
    nestedStructure: {
      gate: "Subject (What)",
      line: "Verb/Action (How)",
      color: "Pressure Gradient (Why direction)",
      tone: "Waveform Frequency (How it feels)",
      base: "Atomic Core (What never changes)",
      degreeMinuteSecond: "Punctuation (Micro-nuance)"
    }
  };
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}
async function handleBuildSentence(args) {
  const { gate, line, color, tone, base, sentenceType: overrideType } = args;
  const hex = HEXAGRAMS[gate];
  if (!hex) {
    return { content: [{ type: "text", text: JSON.stringify({ error: `Gate ${gate} not found` }) }] };
  }
  const wProfile = {
    w1: gate / 64,
    w2: line / 6,
    w3: color / 6,
    w4: tone / 6,
    w5: base / 6
  };
  const sentence = buildSentence(hex, wProfile);
  const detectedType = hexagramToSentenceType(hex);
  const type = overrideType || detectedType;
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        gate,
        line,
        color,
        tone,
        base,
        sentence,
        detectedType,
        overrideType: overrideType || null,
        finalType: type,
        mysticalPhrasing: sentence,
        physicsPhrasing: getPhysicsMetaphor(gate, line)
      }, null, 2)
    }]
  };
}
async function handleTransformHouse(args) {
  const { houseId, atoOperator } = args;
  const house = HOUSES[houseId];
  if (!house) {
    return { content: [{ type: "text", text: JSON.stringify({ error: `House ${houseId} not found` }) }] };
  }
  const original = house.map((h) => ({
    number: h.number,
    name: h.name,
    binary: h.binary,
    upperTrigram: h.upperTrigram,
    lowerTrigram: h.lowerTrigram
  }));
  const transformed = transformHouse(house, atoOperator);
  const transformedData = transformed.map((h) => ({
    number: h.number,
    name: h.name,
    binary: h.binary,
    upperTrigram: h.upperTrigram,
    lowerTrigram: h.lowerTrigram
  }));
  const analogyMapping = original.map((orig, i) => ({
    original: `${orig.name} (${orig.binary})`,
    transformed: `${transformedData[i].name} (${transformedData[i].binary})`,
    atoOperator
  }));
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        houseId,
        atoOperator,
        original,
        transformed: transformedData,
        analogyMapping,
        verbalAnalogy: `House ${houseId} transformed by ATO ${atoOperator}: ${analogyMapping[0].original} \u2192 ${analogyMapping[0].transformed}`
      }, null, 2)
    }]
  };
}
async function handleSimulateNarrative(args) {
  const { query, wProfile, chartData, nSamples = 1e3, maxSteps = 20, seed = 42 } = args;
  let profile;
  if (wProfile) {
    profile = wProfile;
  } else if (chartData) {
    profile = deriveWProfileFromChart(chartData);
  } else {
    profile = DEFAULT_W_PROFILE;
  }
  const customSampler = new MonteCarloSampler(kleinSystem, maxSteps, 0.85);
  const result = customSampler.simulate(query, profile, nSamples, seed);
  const formatted = {
    query,
    userWProfile: profile,
    simulationParams: { nSamples, maxSteps, seed },
    bestPath: {
      pathId: result.bestPath.pathId,
      finalScore: result.bestPath.finalScore,
      convergencePoint: result.bestPath.convergencePoint,
      convergenceDepth: result.bestPath.convergenceDepth,
      trajectory: result.bestPath.trajectory,
      stepCount: result.bestPath.steps.length,
      keySteps: result.bestPath.steps.map((s) => ({
        step: s.stepNumber,
        house: s.houseId,
        hexagram: s.hexagram.name,
        sentence: s.sentence,
        w5: s.wState.w5
      }))
    },
    top5Summary: result.top5Paths.map((p, i) => ({
      rank: i + 1,
      pathId: p.pathId,
      score: p.finalScore,
      trajectory: p.trajectory,
      steps: p.steps.length,
      convergence: p.convergencePoint.substring(0, 80) + "..."
    })),
    statistics: {
      meanScore: result.distribution.meanScore,
      stdDev: result.distribution.stdDev,
      convergenceRates: result.distribution.convergenceRates
    }
  };
  return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
}
async function handleComputeResonance(args) {
  const { sentenceA, sentenceB, gateA, gateB } = args;
  const wordsA = new Set(sentenceA.toLowerCase().split(/\s+/));
  const wordsB = new Set(sentenceB.toLowerCase().split(/\s+/));
  const shared = [...wordsA].filter((w) => wordsB.has(w));
  const overlap = shared.length / Math.max(wordsA.size, wordsB.size);
  let gateProximity = 0;
  if (gateA && gateB) {
    const diff = Math.abs(gateA - gateB);
    gateProximity = 1 - diff / 64;
  }
  const score = gateA && gateB ? overlap * 0.6 + gateProximity * 0.4 : overlap;
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        sentenceA,
        sentenceB,
        gateA,
        gateB,
        resonanceScore: Math.round(score * 1e3) / 1e3,
        sharedWords: shared,
        wordOverlap: Math.round(overlap * 1e3) / 1e3,
        gateProximity: gateA && gateB ? Math.round(gateProximity * 1e3) / 1e3 : null,
        interpretation: score > 0.7 ? "Strong resonance" : score > 0.4 ? "Moderate resonance" : "Weak resonance"
      }, null, 2)
    }]
  };
}
async function handleGetCodonMapping(args) {
  const { gateNumber } = args;
  const codonData = getCodonForGate(gateNumber);
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        gate: gateNumber,
        ...codonData
      }, null, 2)
    }]
  };
}
async function handleEvaluateKleinTools(args) {
  const { nodeId, activeToolIds, decompose = false, decomposeDepth = 1 } = args;
  let finalToolIds = [...activeToolIds];
  if (decompose) {
    for (const toolId of activeToolIds) {
      const subTools = kleinSystem.decomposeAndRegister(toolId, decomposeDepth);
      finalToolIds.push(...subTools.map((t) => t.toolId));
    }
    finalToolIds = [...new Set(finalToolIds)];
  }
  const result = kleinSystem.evaluateNode(nodeId, finalToolIds);
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        evaluationId: result.evaluationId,
        nodeId: result.context.nodeId,
        activeTools: result.context.activeToolIds,
        decomposed: decompose,
        decomposeDepth: decompose ? decomposeDepth : 0,
        result: result.result,
        classification: result.classification,
        evaluatedAt: result.evaluatedAt,
        contributingTools: result.contributingTools,
        ledgerSize: kleinSystem.ledger.getAllEntries().length
      }, null, 2)
    }]
  };
}
async function handleLookupHexagram(args) {
  const { number, binary } = args;
  let hex;
  if (number) {
    hex = HEXAGRAMS[number];
  } else if (binary) {
    hex = Object.values(HEXAGRAMS).find((h) => h.binary === binary);
  }
  if (!hex) {
    return { content: [{ type: "text", text: JSON.stringify({ error: "Hexagram not found" }) }] };
  }
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        number: hex.number,
        name: hex.name,
        binary: hex.binary,
        upperTrigram: { binary: hex.upperTrigram, ...TRIGRAMS[hex.upperTrigram] },
        lowerTrigram: { binary: hex.lowerTrigram, ...TRIGRAMS[hex.lowerTrigram] },
        houseId: hex.houseId,
        housePosition: hex.housePosition,
        sentenceType: hexagramToSentenceType(hex)
      }, null, 2)
    }]
  };
}
async function handleListHouses() {
  const houses = Object.entries(HOUSES).map(([id, hexagrams]) => ({
    houseId: parseInt(id),
    name: TRIGRAMS[hexagrams[0].lowerTrigram]?.name || "Unknown",
    trigram: hexagrams[0].lowerTrigram,
    hexagramCount: hexagrams.length,
    hexagrams: hexagrams.map((h) => ({
      number: h.number,
      name: h.name,
      binary: h.binary
    }))
  }));
  return { content: [{ type: "text", text: JSON.stringify({ houses }, null, 2) }] };
}
async function handleListTrigrams() {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ trigrams: TRIGRAMS }, null, 2)
    }]
  };
}
function getCenterVoice(gate) {
  const centerMap = {
    1: "G",
    2: "Sacral",
    3: "Solar Plexus",
    4: "Ajna",
    5: "Sacral",
    6: "Solar Plexus",
    7: "G",
    8: "Throat",
    9: "Sacral",
    10: "G",
    11: "Ajna",
    12: "Throat",
    13: "G",
    14: "Sacral",
    15: "G",
    16: "Throat",
    17: "Ajna",
    18: "Spleen",
    19: "Root",
    20: "Throat",
    21: "Heart",
    22: "Solar Plexus",
    23: "Throat",
    24: "Ajna",
    25: "G",
    26: "Heart",
    27: "Sacral",
    28: "Spleen",
    29: "Sacral",
    30: "Solar Plexus",
    31: "Throat",
    32: "Spleen",
    33: "Throat",
    34: "Sacral",
    35: "Throat",
    36: "Solar Plexus",
    37: "Solar Plexus",
    38: "Heart",
    39: "Root",
    40: "Root",
    41: "Root",
    42: "Sacral",
    43: "Throat",
    44: "Spleen",
    45: "Throat",
    46: "G",
    47: "Ajna",
    48: "Spleen",
    49: "Solar Plexus",
    50: "Sacral",
    51: "Root",
    52: "Root",
    53: "Root",
    54: "Root",
    55: "Solar Plexus",
    56: "Throat",
    57: "Spleen",
    58: "Root",
    59: "Sacral",
    60: "Root",
    61: "Throat",
    62: "Throat",
    63: "Throat",
    64: "Head"
  };
  return centerMap[gate] || "Unknown";
}
function getPhysicsMetaphor(gate, line) {
  const metaphors = {
    1: "photon interference \u2014 perception as wave collapse",
    2: "spacetime curvature \u2014 memory as gravitational lensing",
    3: "crystalline symmetry \u2014 structure encoding function",
    4: "chemical bonding \u2014 sensory membrane selectivity",
    5: "spin/monopole \u2014 cycle initiation through uniqueness",
    6: "electromagnetic field \u2014 polarity tension resolution"
  };
  return metaphors[gate] || "quantum superposition \u2014 potential before collapse";
}
function getCodonForGate(gate) {
  const codons = {
    1: { codon: "TAT", aminoAcid: "Tyrosine", aminoAcidLetter: "Y", mineralClass: "Silicates", atomicNumber: 14 },
    2: { codon: "TAC", aminoAcid: "Tyrosine", aminoAcidLetter: "Y", mineralClass: "Silicates", atomicNumber: 14 },
    3: { codon: "CAT", aminoAcid: "Histidine", aminoAcidLetter: "H", mineralClass: "Carbonates", atomicNumber: 6 },
    4: { codon: "CAC", aminoAcid: "Histidine", aminoAcidLetter: "H", mineralClass: "Carbonates", atomicNumber: 6 },
    5: { codon: "CAA", aminoAcid: "Glutamine", aminoAcidLetter: "Q", mineralClass: "Sulfates", atomicNumber: 16 },
    6: { codon: "CAG", aminoAcid: "Glutamine", aminoAcidLetter: "Q", mineralClass: "Sulfates", atomicNumber: 16 }
  };
  return codons[gate] || {
    codon: "NNN",
    aminoAcid: "Unknown",
    aminoAcidLetter: "?",
    mineralClass: "Unknown",
    atomicNumber: 0,
    note: "Populate with full Castro-Chavez mapping"
  };
}
async function handleReadResource(uri) {
  switch (uri) {
    case "diseminer://gates/all":
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ gates: Object.values(HEXAGRAMS).map((h) => ({
            number: h.number,
            name: h.name,
            binary: h.binary,
            center: getCenterVoice(h.number)
          })) })
        }]
      };
    case "diseminer://houses/all":
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ houses: HOUSES })
        }]
      };
    case "diseminer://trigrams/all":
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ trigrams: TRIGRAMS })
        }]
      };
    case "diseminer://codons/all":
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ note: "Populate with full Castro-Chavez codon mapping" })
        }]
      };
    case "diseminer://ledger/recent":
      const entries = kleinSystem.ledger.getAllEntries().slice(-20);
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ entries, totalCount: kleinSystem.ledger.getAllEntries().length })
        }]
      };
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
const server = new Server(
  {
    name: "diseminer-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RESOURCES }));
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return handleReadResource(request.params.uri);
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case "query_gate":
      return handleQueryGate(args);
    case "build_sentence":
      return handleBuildSentence(args);
    case "transform_house":
      return handleTransformHouse(args);
    case "simulate_narrative":
      return handleSimulateNarrative(args);
    case "compute_resonance":
      return handleComputeResonance(args);
    case "get_codon_mapping":
      return handleGetCodonMapping(args);
    case "evaluate_klein_tools":
      return handleEvaluateKleinTools(args);
    case "lookup_hexagram":
      return handleLookupHexagram(args);
    case "list_houses":
      return handleListHouses();
    case "list_trigrams":
      return handleListTrigrams();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DISEMINER MCP Server running on stdio");
}
main().catch(console.error);
