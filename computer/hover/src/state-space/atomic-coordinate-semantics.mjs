import {
  COLOR_TABLE,
  TONE_TABLE,
  BASE_TABLE,
} from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/chains.js';
import {
  UNIFIED_SYNTAX_FIELD,
} from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/primitive-dimensions.js';
import { colorFor } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/colors.js';
import { soundFor } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/sounds.js';
import { CANON_DIMENSION_CHAINS } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/dimension-canon.js';
import { safe } from '../util.mjs';

const markByName = new Map(UNIFIED_SYNTAX_FIELD.marks.map((entry) => [entry.name, entry]));

function tableEntry(table, value) {
  return safe(table.entries.find((entry) => Number(entry.value?.n) === Number(value))?.value ?? null);
}

/**
 * Resolve the qualitative roles already carried by an exact agent address.
 * No digest is created. Degree, minute and second are treated as recursively
 * gate-like units; Color/Tone/Base provide the line-like context that changes
 * how those units express. Arc retains the exact intra-state position.
 */
export function atomicCoordinateSemantics(address, { dimensionRules = {} } = {}) {
  const suppliedDimensionRule = dimensionRules[address.dimension] ?? null;
  const dimensionGrammar = Object.freeze({
    dimension: address.dimension,
    establishedChain: safe(CANON_DIMENSION_CHAINS[address.dimension] ?? null),
    atomicLandingRule: safe(suppliedDimensionRule),
    status: suppliedDimensionRule ? 'PROVIDED_NOT_YET_VALIDATED' : 'OPEN_QUESTION',
    requirement: suppliedDimensionRule
      ? 'validate against the Black Book dimension ordering diagrams before canonical status'
      : 'requires the Black Book dimension ordering diagrams; no universal degree landing rule is assumed',
  });
  const lineContext = Object.freeze({
    role: 'line-context-for-finer-scale-gate-units',
    color: tableEntry(COLOR_TABLE, address.color),
    tone: tableEntry(TONE_TABLE, address.tone),
    base: tableEntry(BASE_TABLE, address.base),
    values: Object.freeze({ color: address.color, tone: address.tone, base: address.base }),
  });
  const coordinate = (field, syntaxName, semanticRole) => {
    const syntax = markByName.get(syntaxName);
    return Object.freeze({
      field,
      value: address[field],
      mark: syntax?.mark ?? null,
      syntaxName,
      gateRole: field === 'arc' ? false : 'finer-scale-gate-role-unit',
      semanticRole,
      ontologicalAction: syntax?.ontologicalAction ?? null,
      coordinateRole: syntax?.coordinateRole ?? null,
      lineContext,
      qualitative: true,
      cryptographicHash: false,
      dimensionGrammar,
    });
  };
  const arcSecond = ((address.zodiac - 1) * 30 + address.degree) * 3600
    + address.minute * 60
    + address.second
    + address.arc / 100;
  const renderingAddress = Object.freeze({
    ...address,
    planetaryDimension: address.dimension,
    arcSecond,
  });
  const visualColor = Object.freeze({
    ...colorFor(renderingAddress),
    kind: 'rendered-visual-color',
    overlays: 'human-design-color/motivation',
  });
  const soundTone = Object.freeze({
    ...soundFor(renderingAddress),
    kind: 'rendered-sound-tone',
    overlays: 'human-design-tone/sense-cognition',
  });
  return Object.freeze({
    model: 'recursive qualitative atomic coordinates',
    lineContext,
    degree: coordinate('degree', 'Collapse', 'orientation/motivational-vector'),
    minute: coordinate('minute', 'Pulse', 'sensory-sub-vector/sensation'),
    second: coordinate('second', 'Flicker', 'environmental-micro-vector'),
    arc: Object.freeze({
      field: 'arc',
      value: address.arc,
      gateRole: false,
      semanticRole: 'finest-intra-state-position',
      lineContext,
      qualitative: true,
      cryptographicHash: false,
      dimensionGrammar,
    }),
    arcBifurcation: Object.freeze({
      source: Object.freeze({ arc: address.arc, exactPosition: arcSecond }),
      visualColor,
      soundTone,
      semanticOverlays: Object.freeze({
        motivation: lineContext.color,
        senseCognition: lineContext.tone,
        foundation: lineContext.base,
      }),
      distinction: 'rendered visual color/sound are perceptual expressions; HD Color/Tone remain motivation and sense/cognition',
    }),
    environmentalShape: Object.freeze({
      meaning: 'shape-of-the-environment',
      zodiac: address.zodiac,
      house: address.house,
      relation: 'joint-reference-geometry-conditioned-by-arc-color-tone-landing',
      exactDifferentiationRule: 'OPEN_QUESTION',
      note: 'The environment shape is confirmed. Whether zodiac, house, or their interaction is primary remains intentionally unresolved.',
    }),
    dimensionGrammar,
    provenance: Object.freeze({
      colorToneBase: 'Kimi state-space chains.js BOC tables',
      degreeMinuteSecond: 'Kimi state-space primitive-dimensions.js unified syntax field',
      visualColorAndSound: 'Kimi state-space colors.js and sounds.js',
      recursiveInterpretation: 'user-confirmed project architecture',
      dimensionOrdering: 'existing five dimension chains plus user-confirmed dimension dependency; exact atomic grammar awaits Black Book diagrams',
    }),
  });
}

export default atomicCoordinateSemantics;
