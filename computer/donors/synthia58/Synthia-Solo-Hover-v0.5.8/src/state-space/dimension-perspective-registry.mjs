import {
  DIMENSION_CHAINS,
  ORDINAL_PERSPECTIVES,
  THREE_CONDITIONS,
  CRYSTALS_AND_MONOPOLE,
} from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/chains.js';
import { SPACE_ROLE_MODELS } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/dimension-canon.js';
import { safe } from '../util.mjs';

export const DIMENSION_IMAGE_PROVENANCE = Object.freeze({
  Movement: 'authorities/black-book-dimension-perspectives/01-movement.png',
  Evolution: 'authorities/black-book-dimension-perspectives/02-evolution.png',
  Being: 'authorities/black-book-dimension-perspectives/03-being.png',
  Design: 'authorities/black-book-dimension-perspectives/04-design.png',
  Space: 'authorities/black-book-dimension-perspectives/05-space.png',
});

const DIMENSIONS = Object.freeze(['Movement', 'Evolution', 'Being', 'Design', 'Space']);

export const DIMENSION_OPERATION_ROLES = Object.freeze({
  Movement: Object.freeze({ substrate: 'shared', axis: 'vertical', role: 'scale-traversal / visible naming / seeing' }),
  Evolution: Object.freeze({ substrate: 'shared', axis: 'temporal-associative', role: 'reconstructive memory / felt sequence' }),
  Being: Object.freeze({ substrate: 'shared', axis: 'horizontal', role: 'occupied state / across-relation' }),
  Design: Object.freeze({ substrate: 'shared', axis: 'causal-structural', role: 'dependency / construction / manifestation' }),
  Space: Object.freeze({ substrate: 'shared', axis: 'emergent-interface', role: 'rendered condition produced by the interplay of Movement, Evolution, Being, and Design' }),
});

function claimValue(record) {
  return safe(record?.value ?? null);
}

function chainFor(dimension) {
  const record = DIMENSION_CHAINS[dimension];
  return Object.freeze({
    dimension,
    trajectory: Object.freeze(record.macroChain.map((entry) => entry.value)),
    micro: claimValue(record.micro),
    symbol: claimValue(record.symbol),
    components: safe(record.basicComponents),
  });
}

const movementTopology = Object.freeze({
  viewKind: 'embodied-origin-topology',
  observerOrder: Object.freeze(['Space', 'Evolution', 'Being', 'Design', 'Movement']),
  self: Object.freeze({ dimension: 'Movement', component: 'Magnetic Monopole', role: 'Attractor', location: 'G Center' }),
  groupings: Object.freeze([
    Object.freeze({ component: 'Personality Crystal', dimensions: Object.freeze(['Space', 'Evolution']), location: 'Head Center', role: 'Witness' }),
    Object.freeze({ component: 'Design Crystal', dimensions: Object.freeze(['Being', 'Design']), location: 'Ajna Center', role: 'Vehicle' }),
    Object.freeze({ component: 'Magnetic Monopole', dimensions: Object.freeze(['Movement']), location: 'G Center', role: 'Attractor' }),
  ]),
  operation: 'locate-and-attract-the-other-fields-through-an-embodied-geometry',
  sourceStructure: safe(CRYSTALS_AND_MONOPOLE),
});

const evolutionTranslation = Object.freeze({
  viewKind: 'macrocosm-to-microcosm-translation',
  observerOrder: Object.freeze(['Movement', 'Evolution', 'Being', 'Design', 'Space']),
  self: Object.freeze({ dimension: 'Evolution', humanExpression: 'The Mind', keynote: 'I Remember' }),
  displayOrder: DIMENSIONS,
  translations: Object.freeze(DIMENSIONS.map(chainFor)),
  operation: 'translate-each-universal-chain-into-its-human-nature-and-keynote',
});

const beingOrdinal = Object.freeze({
  viewKind: 'ordinal-trajectory',
  self: Object.freeze({ dimension: 'Being', humanExpression: 'The Body', keynote: 'I Am' }),
  order: Object.freeze([...(ORDINAL_PERSPECTIVES.Being?.value ?? [])]),
  observerOrder: Object.freeze([...(ORDINAL_PERSPECTIVES.Being?.value ?? [])]),
  printedRows: Object.freeze([...(ORDINAL_PERSPECTIVES.Being?.printedRows ?? [])]),
  operation: 'punctuate-and-order-the-five-fields-from-being',
  sourceStatus: 'SOURCE_STATEMENT',
});

const designComponents = Object.freeze({
  viewKind: 'component-and-construction-map',
  observerOrder: Object.freeze(['Movement', 'Evolution', 'Being', 'Design', 'Space']),
  self: Object.freeze({ dimension: 'Design', component: 'Design Crystal', role: 'Structure/Progress' }),
  contributors: Object.freeze(['Movement', 'Evolution', 'Being', 'Design'].map((dimension) => Object.freeze({
    dimension,
    symbol: claimValue(DIMENSION_CHAINS[dimension].symbol),
    component: claimValue(DIMENSION_CHAINS[dimension].basicComponents.fourDimensionChart),
    trajectory: Object.freeze(DIMENSION_CHAINS[dimension].macroChain.map((entry) => entry.value)),
  }))),
  appendedCondition: Object.freeze({
    dimension: 'Space',
    symbol: null,
    component: claimValue(DIMENSION_CHAINS.Space.basicComponents.fourDimensionChart),
    sourceStatus: 'APPENDED_WITHOUT_FOUR-DIMENSION_SYMBOL',
  }),
  operation: 'construct-through-four-components-then-express-the-relational-condition',
});

const spaceRelation = Object.freeze({
  viewKind: 'emergent-relational-condition',
  observerOrder: Object.freeze(['Movement', 'Being', 'Evolution', 'Design', 'Space']),
  self: Object.freeze({ dimension: 'Space', humanExpression: 'Personality', keynote: 'I Think' }),
  stages: Object.freeze(['preBigBang', 'singularity', 'postBigBang'].map((id) => Object.freeze({
    id,
    condition: claimValue(THREE_CONDITIONS[id]),
    dimensionalCount: THREE_CONDITIONS.dimensionalCount.value[
      id === 'preBigBang' ? 'pre' : id === 'singularity' ? 'singularity' : 'post'
    ],
  }))),
  contributingFields: Object.freeze(['Movement', 'Being', 'Evolution', 'Design']),
  result: 'Space',
  roleModels: safe(SPACE_ROLE_MODELS),
  operation: 'relate-four-dimensional-fields-so-the-fifth-condition-can-emerge',
  sourceConflictPreserved: true,
});

const BUILTIN_PERSPECTIVES = Object.freeze({
  Movement: movementTopology,
  Evolution: evolutionTranslation,
  Being: beingOrdinal,
  Design: designComponents,
  Space: spaceRelation,
});

/**
 * Five observer-relative views of the same field. The views intentionally do
 * not share one schema: topology, translation, ordinal order, construction,
 * and emergent relation are different operations.
 */
export class DimensionPerspectiveRegistry {
  constructor({ dimensionRules = {} } = {}) {
    this.rules = new Map();
    for (const [dimension, rule] of Object.entries(dimensionRules)) this.registerRule(dimension, rule);
  }

  registerRule(dimension, rule) {
    if (!DIMENSIONS.includes(dimension)) throw new RangeError(`unknown dimension: ${dimension}`);
    if (!rule || typeof rule !== 'object') throw new TypeError('dimension rule must be an object');
    const record = Object.freeze({
      dimension,
      rule: safe(rule),
      status: 'PROVIDED_NOT_YET_VALIDATED',
      canonical: false,
    });
    this.rules.set(dimension, record);
    return record;
  }

  perspective(dimension) {
    if (!DIMENSIONS.includes(dimension)) throw new RangeError(`unknown dimension: ${dimension}`);
    return Object.freeze({
      dimension,
      sourceImage: DIMENSION_IMAGE_PROVENANCE[dimension],
      chain: chainFor(dimension),
      view: BUILTIN_PERSPECTIVES[dimension],
      suppliedAtomicGrammar: this.rules.get(dimension) ?? null,
      observerRelative: true,
      symmetricRecognitionAssumed: false,
    });
  }

  project(observerDimension, subjectDimension) {
    const observer = this.perspective(observerDimension);
    if (!DIMENSIONS.includes(subjectDimension)) throw new RangeError(`unknown subject dimension: ${subjectDimension}`);
    const view = observer.view;
    let relation;
    if (view.viewKind === 'embodied-origin-topology') {
      relation = view.groupings.find((group) => group.dimensions.includes(subjectDimension)) ?? null;
    } else if (view.viewKind === 'macrocosm-to-microcosm-translation') {
      relation = view.translations.find((entry) => entry.dimension === subjectDimension) ?? null;
    } else if (view.viewKind === 'ordinal-trajectory') {
      const index = view.order.indexOf(subjectDimension);
      relation = index < 0 ? null : Object.freeze({ ordinal: index + 1, previous: view.order[index - 1] ?? null, next: view.order[index + 1] ?? null });
    } else if (view.viewKind === 'component-and-construction-map') {
      relation = view.contributors.find((entry) => entry.dimension === subjectDimension)
        ?? (subjectDimension === 'Space' ? view.appendedCondition : null);
    } else {
      relation = subjectDimension === 'Space'
        ? Object.freeze({ role: 'emergent-condition/result', contributors: view.contributingFields })
        : Object.freeze({ role: 'contributing-field', result: 'Space' });
    }
    return Object.freeze({
      observer: observerDimension,
      subject: subjectDimension,
      selfObservation: observerDimension === subjectDimension,
      viewKind: view.viewKind,
      relation: safe(relation),
      reciprocalRelationAssumed: false,
    });
  }

  readFrom(observerDimension, {
    referencePoint = observerDimension,
    scale = 'macro',
  } = {}) {
    if (!['macro', 'micro'].includes(scale)) throw new RangeError('scale must be macro or micro');
    if (!DIMENSIONS.includes(referencePoint)) throw new RangeError(`unknown reference dimension: ${referencePoint}`);
    const perspective = this.perspective(observerDimension);
    const order = perspective.view.observerOrder;
    const position = order.indexOf(referencePoint);
    const sourceChain = chainFor(referencePoint);
    const expression = scale === 'macro' ? sourceChain.trajectory : sourceChain.micro;
    const movementPositionQuality = referencePoint !== 'Movement' ? null
      : position === 0 ? 'defined/reference-facing'
        : position === order.length - 1 ? 'creative/creation-facing'
          : 'relational/transitional';
    return Object.freeze({
      observerDimension,
      observerQuality: 'I-Am/reference-frame',
      referencePoint,
      scale,
      observerOrder: order,
      position: position + 1,
      previous: order[position - 1] ?? null,
      next: order[position + 1] ?? null,
      expression: safe(expression),
      movementPositionQuality,
      rule: 'meaning is resolved from observer + scale + reference position; positions are not globally interchangeable',
      provenance: Object.freeze({
        order: observerDimension === 'Being' ? 'Black Book printed ordinal list' : 'creator-directed interpretation of the five uploaded perspective pages',
        positionalSemantics: 'creator clarification during integration',
      }),
    });
  }

  evaluateExpression(condition) {
    if (!['preBigBang', 'singularity', 'postBigBang'].includes(condition)) {
      throw new RangeError(`unknown dimensional condition: ${condition}`);
    }
    const stage = spaceRelation.stages.find((entry) => entry.id === condition);
    return Object.freeze({
      condition,
      formula: stage.condition.formula,
      heading: stage.condition.heading,
      terms: safe(stage.condition.rows),
      dimensionalCount: stage.dimensionalCount,
      evaluation: 'symbolic-structural',
      numericValue: null,
      numericValueStatus: 'NOT_SUPPLIED_BY_SOURCE',
      output: condition === 'postBigBang' ? 'Space-as-relational-condition' : condition === 'singularity' ? 'four-contributing-fields' : 'two-poles',
    });
  }

  dimensionRules() {
    return Object.freeze(Object.fromEntries([...this.rules].map(([dimension, record]) => [dimension, record.rule])));
  }

  snapshot() {
    return Object.freeze({
      dimensions: DIMENSIONS,
      perspectives: Object.freeze(DIMENSIONS.map((dimension) => this.perspective(dimension))),
      recognitionMatrix: Object.freeze(DIMENSIONS.flatMap((observer) => DIMENSIONS.map((subject) => this.project(observer, subject)))),
      referenceReadings: Object.freeze(DIMENSIONS.flatMap((observer) => DIMENSIONS.map((referencePoint) => (
        this.readFrom(observer, { referencePoint, scale: 'macro' })
      )))),
      expressions: Object.freeze(['preBigBang', 'singularity', 'postBigBang'].map((condition) => this.evaluateExpression(condition))),
      suppliedAtomicGrammars: this.rules.size,
      allFiveViewsShareOneOrder: false,
      sharedSubstrate: true,
      operations: DIMENSION_OPERATION_ROLES,
      spaceIsIndependentPeer: false,
      reciprocalRecognitionAssumed: false,
    });
  }
}

export default DimensionPerspectiveRegistry;
