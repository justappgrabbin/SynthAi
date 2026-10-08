import {readFileSync} from 'node:fs';
import {CODON_MATRIX, GATE_TO_CODON} from '../../../computer/donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/organs/today/CodonMatrix.js';
import {computeCHNOPS} from '../../../computer/donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/organs/today/CHNOPS.js';

// Report discrepancies without choosing or modifying either donor mapping.
const assigned = new Map();
for (const [name, row] of Object.entries(CODON_MATRIX)) {
  for (const gate of row.gates) {
    const names = assigned.get(gate) || [];
    names.push(name);
    assigned.set(gate, names);
  }
}
const dictionary = JSON.parse(readFileSync(new URL('../../../computer/donors/recovered/you-n-i-verse-corrected/gate_codon_dictionary.json', import.meta.url), 'utf8'));
const empty = computeCHNOPS([], 'unit');
console.log(JSON.stringify({
  duplicateAssignments: [...assigned].filter(([, names]) => names.length > 1),
  unassignedGates: Array.from({length:64}, (_, i) => i + 1).filter(gate => !assigned.has(gate)),
  selectedByReverseLookup: {35:GATE_TO_CODON[35], 44:GATE_TO_CODON[44]},
  gate1SourceConflict: {matrix:GATE_TO_CODON[1], correctedDictionary:dictionary['1'].amino_acid},
  emptyUnitNormalizationNonfinite: Object.values(empty.normalized).some(value => !Number.isFinite(value)),
}, null, 2));
