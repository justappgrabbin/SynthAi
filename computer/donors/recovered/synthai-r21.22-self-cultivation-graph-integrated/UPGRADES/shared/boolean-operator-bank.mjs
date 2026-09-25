/**
 * Shared Boolean operator bank for Synthia.
 *
 * No operator is globally privileged or banned. The caller chooses the
 * operation required by the relation being computed. `equivalence` and
 * `biconditional` are aliases of XNOR.
 */
export class BooleanOperatorError extends TypeError {
}
function normalizeBit(bit) {
    if (bit === true || bit === 1 || bit === '1')
        return 1;
    if (bit === false || bit === 0 || bit === '0')
        return 0;
    throw new BooleanOperatorError(`Expected Boolean/bit, received ${String(bit)}`);
}
export function normalizeVector(value, width) {
    let bits;
    if (typeof value === 'string')
        bits = [...value].map(normalizeBit);
    else if (Array.isArray(value) || ArrayBuffer.isView(value))
        bits = [...value].map(normalizeBit);
    else if (typeof value === 'boolean' || value === 0 || value === 1)
        bits = [normalizeBit(value)];
    else
        throw new BooleanOperatorError('Expected bit, bit string, bit array, or typed array');
    if (width !== undefined && bits.length !== width)
        throw new BooleanOperatorError(`Expected ${width} bits, received ${bits.length}`);
    return Object.freeze(bits);
}
export const toBitString = value => normalizeVector(value).join('');
const binaryScalar = Object.freeze({
    false: () => 0,
    and: (a, b) => a & b,
    a_and_not_b: (a, b) => a & (b ^ 1),
    a: a => a,
    not_a_and_b: (a, b) => (a ^ 1) & b,
    b: (_a, b) => b,
    xor: (a, b) => a ^ b,
    or: (a, b) => a | b,
    nor: (a, b) => (a | b) ^ 1,
    xnor: (a, b) => (a ^ b) ^ 1,
    not_b: (_a, b) => b ^ 1,
    b_implies_a: (a, b) => a | (b ^ 1),
    not_a: a => a ^ 1,
    a_implies_b: (a, b) => (a ^ 1) | b,
    nand: (a, b) => (a & b) ^ 1,
    true: () => 1,
});
export const BINARY_BOOLEAN_FUNCTIONS = Object.freeze(Object.keys(binaryScalar));
export const ALIASES = Object.freeze({
    equivalence: 'xnor',
    biconditional: 'xnor',
    eq: 'xnor',
    iff: 'xnor',
    implication: 'a_implies_b',
    imply: 'a_implies_b',
    reverse_implication: 'b_implies_a',
    contradiction: 'false',
    tautology: 'true',
});
export function canonicalOperator(name) {
    const key = String(name).toLowerCase().trim();
    return ALIASES[key] || key;
}
export function applyBinary(name, left, right) {
    const op = canonicalOperator(name);
    const fn = binaryScalar[op];
    if (!fn)
        throw new BooleanOperatorError(`Unknown Boolean operator: ${name}`);
    const a = normalizeVector(left);
    const b = normalizeVector(right, a.length);
    return Object.freeze(a.map((bit, i) => fn(bit, b[i])));
}
export function not(value) {
    return Object.freeze(normalizeVector(value).map(bit => bit ^ 1));
}
export function truthTable(name) {
    const op = canonicalOperator(name);
    const fn = binaryScalar[op];
    if (!fn)
        throw new BooleanOperatorError(`Unknown Boolean operator: ${name}`);
    return Object.freeze([
        Object.freeze({ a: 0, b: 0, out: fn(0, 0) }),
        Object.freeze({ a: 0, b: 1, out: fn(0, 1) }),
        Object.freeze({ a: 1, b: 0, out: fn(1, 0) }),
        Object.freeze({ a: 1, b: 1, out: fn(1, 1) }),
    ]);
}
export function completeAnalogy(a, b, c, mode = 'xnor') {
    const relation = applyBinary(mode, a, b);
    const result = applyBinary(mode, c, relation);
    return Object.freeze({ relation, result, mode: canonicalOperator(mode) });
}
export const BooleanOperatorBank = Object.freeze({
    names: BINARY_BOOLEAN_FUNCTIONS,
    aliases: ALIASES,
    canonicalOperator,
    applyBinary,
    not,
    truthTable,
    completeAnalogy,
    toBitString,
});
export default BooleanOperatorBank;
