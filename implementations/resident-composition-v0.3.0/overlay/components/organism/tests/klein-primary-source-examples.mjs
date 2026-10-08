import assert from 'node:assert/strict';
import { equivalence, completeAnalogy, retargetPlan, operator, toBitString } from '../vendor/ato-core/src/boolean-ato.mjs';

// Klein, Analogical Foundations (2002 revision), PDF p.2: strong-equivalence example.
assert.equal(toBitString(equivalence('101', '011')), '001');
assert.equal(toBitString(equivalence('011', '001')), '101');
assert.equal(toBitString(equivalence('101', '001')), '011');

// PDF p.3, Fig.2: iconographic analogy based on the I Ching classification.
const icon = completeAnalogy('111110', '010001', '100101', 'equivalence');
assert.equal(toBitString(icon.relation), '010000');
assert.equal(toBitString(icon.result), '001010');

// PDF p.4, Table 4: Boy loves light : Girl hates light :: Woman hates dark : Man loves dark.
const verbal = completeAnalogy('10101010', '01100110', '01010101', 'equivalence');
assert.equal(toBitString(verbal.relation), '00110011');
assert.equal(toBitString(verbal.result), '10011001');

// Analogy and Mysticism and the Structure of Culture (1983), printed p.158,
// PDF p.4: transforming the entire House of the Abysmal into Keeping Still.
// Binary strings are kept in the paper's orientation; no King Wen/canonical address conversion.
const abysmal = ['010010', '010011', '010001', '010101', '011101', '001101', '000101', '000010'];
const keepingStill = ['100100', '100101', '100111', '100011', '101011', '111011', '110011', '110100'];
assert.deepEqual(abysmal.map(state => toBitString(equivalence(state, '001001'))), keepingStill);

// PDF p.18: changing the endpoint preserves the existing transition operators.
// These particular plan states are test data, not an attributed example or canonical address map.
const states = ['001100', '010101', '111000', '100101'];
for (const mode of ['equivalence', 'xor']) {
  const retargeted = retargetPlan(states, '011010', mode);
  assert.equal(toBitString(retargeted.result.at(-1)), '011010');
  for (let i = 1; i < states.length; i++) {
    assert.deepEqual(operator(retargeted.result[i - 1], retargeted.result[i], mode), operator(states[i - 1], states[i], mode));
  }
}
console.log('Klein primary-source examples: published Boolean, iconographic, verbal, and transition-preserving plan checks passed');
