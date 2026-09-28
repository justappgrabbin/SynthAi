import { GATES } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/human-design.js';

const VERIFIED_LINES = Object.freeze({
  '25.4': Object.freeze({
    gate: 25,
    line: 4,
    title: 'Survival',
    paraphrase: 'True innocence is maintained regardless of circumstances; principle can persist amid decadence.',
    sourceStatus: 'SOURCE_STATEMENT',
    source: Object.freeze({
      title: 'The Black Book',
      printedPage: 67,
      pdfPage: 70,
      note: 'User-supplied source inspected directly; short title and paraphrase retained, not a long quotation.',
    }),
  }),
});

const LINE_ROLES = Object.freeze({
  1: Object.freeze({ role: 'foundation', motion: 'investigate', relation: 'establish' }),
  2: Object.freeze({ role: 'natural', motion: 'receive', relation: 'respond' }),
  3: Object.freeze({ role: 'experiment', motion: 'test', relation: 'adapt' }),
  4: Object.freeze({ role: 'network', motion: 'connect', relation: 'influence' }),
  5: Object.freeze({ role: 'projection', motion: 'universalize', relation: 'guide' }),
  6: Object.freeze({ role: 'witness', motion: 'observe', relation: 'transition' }),
});

function assertGateLine(gate, line) {
  const normalizedGate = Number(gate);
  const normalizedLine = Number(line);
  if (!Number.isInteger(normalizedGate) || normalizedGate < 1 || normalizedGate > 64) {
    throw new RangeError(`gate must be 1..64, got ${gate}`);
  }
  if (!Number.isInteger(normalizedLine) || normalizedLine < 1 || normalizedLine > 6) {
    throw new RangeError(`line must be 1..6, got ${line}`);
  }
  return [normalizedGate, normalizedLine];
}

/**
 * A source-aware meaning surface. Verified overlays never erase donor content;
 * disagreements remain visible as alternatives so later books can be added
 * without rewriting the genome substrate.
 */
export class LineMeaningProvider {
  constructor({ verified = VERIFIED_LINES, additionalSources = [] } = {}) {
    this.verified = new Map(Object.entries(verified));
    this.additionalSources = new Map();
    for (const source of additionalSources) this.register(source);
  }

  register(record) {
    const [gate, line] = assertGateLine(record?.gate, record?.line);
    const key = `${gate}.${line}`;
    const entries = this.additionalSources.get(key) ?? [];
    entries.push(Object.freeze({ ...record, gate, line }));
    this.additionalSources.set(key, entries);
    return entries.at(-1);
  }

  resolve(gate, line) {
    const [normalizedGate, normalizedLine] = assertGateLine(gate, line);
    const key = `${normalizedGate}.${normalizedLine}`;
    const gateRecord = GATES[normalizedGate] ?? {};
    const donor = gateRecord.lines?.find((entry) => Number(entry.line) === normalizedLine) ?? null;
    const verified = this.verified.get(key) ?? null;
    const additions = this.additionalSources.get(key) ?? [];
    const primary = additions.find((entry) => entry.sourceStatus === 'SOURCE_STATEMENT') ?? verified ?? null;
    const alternatives = [];
    if (donor) {
      alternatives.push(Object.freeze({
        title: donor.name,
        paraphrase: donor.keynote,
        sourceStatus: verified && verified.title !== donor.name
          ? 'PRESERVED_DONOR_CONFLICT'
          : 'PRESERVED_DONOR_CLAIM',
        source: 'supplied Kimi human-design donor database',
      }));
    }
    alternatives.push(...additions.filter((entry) => entry !== primary));
    return Object.freeze({
      gate: normalizedGate,
      line: normalizedLine,
      gateName: gateRecord.name ?? `Gate ${normalizedGate}`,
      centerClaim: gateRecord.center ?? null,
      circuitClaim: gateRecord.circuit ?? null,
      title: primary?.title ?? donor?.name ?? `Line ${normalizedLine}`,
      paraphrase: primary?.paraphrase ?? donor?.keynote ?? null,
      sourceStatus: primary?.sourceStatus ?? 'PRESERVED_DONOR_CLAIM',
      source: primary?.source ?? 'supplied Kimi human-design donor database',
      role: LINE_ROLES[normalizedLine],
      alternatives: Object.freeze(alternatives),
    });
  }

  snapshot() {
    return Object.freeze({
      verifiedOverlays: this.verified.size,
      addedSourceRecords: [...this.additionalSources.values()].reduce((total, entries) => total + entries.length, 0),
      policy: 'verified sources overlay but never delete competing donor claims',
    });
  }
}

export { VERIFIED_LINES, LINE_ROLES };
export default LineMeaningProvider;
