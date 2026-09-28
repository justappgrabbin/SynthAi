import { validateCanonicalAddress } from '../../core/ResidenceContext.mjs';
import { canonicalKey } from '../../core/address-adapter.mjs';

export const EXACT_ADDRESS_FIELDS = Object.freeze([
  'planetary','dimension','gate','line','color','tone','base',
  'degree','minute','second','arc','zodiac','house'
]);

export function requireExactAddress(address) {
  const validation = validateCanonicalAddress(address, { allowPartial: false });
  const missing = EXACT_ADDRESS_FIELDS.filter(k => address?.[k] == null || address?.[k] === '');
  if (!validation.ok || missing.length) {
    const problems = [...validation.errors, ...(missing.length ? [`full exact address missing: ${missing.join(',')}`] : [])];
    throw new TypeError(problems.join('; '));
  }
  const normalized = Object.freeze(Object.fromEntries(EXACT_ADDRESS_FIELDS.map(k => [k, address[k]])));
  return normalized;
}

export function commitmentKey(kind, address) {
  if (kind !== 'tool' && kind !== 'app') throw new TypeError('commitment kind must be tool or app');
  return `${kind}|${canonicalKey(requireExactAddress(address))}`;
}

export function makeCommitment(spec = {}) {
  const kind = spec.kind;
  const address = requireExactAddress(spec.address);
  const expectedSha256 = String(spec.expectedSha256 || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) throw new TypeError('expectedSha256 must be a 64-character SHA-256');
  if (!spec.materializer || !['ato','foundry','exact-bytes'].includes(spec.materializer)) {
    throw new TypeError('materializer must be ato, foundry, or exact-bytes');
  }
  return Object.freeze({
    schema: 'synthia.exact-artifact-commitment.v1',
    key: commitmentKey(kind, address),
    kind,
    address,
    addressKey: canonicalKey(address),
    expectedSha256,
    materializer: spec.materializer,
    recipe: spec.recipe ? structuredClone(spec.recipe) : null,
    provenance: Object.freeze([...(spec.provenance || [])].map(x => Object.freeze(structuredClone(x)))),
    lineage: spec.lineage ? Object.freeze(structuredClone(spec.lineage)) : null,
    createdAt: Number(spec.createdAt || Date.now())
  });
}
