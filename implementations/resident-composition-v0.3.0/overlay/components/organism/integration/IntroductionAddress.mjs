import { validateFullOrganismAddress } from '../../../src/address-interop.mjs';
const clone = value => structuredClone(value);

/** Introduction requires a full address, or an explicitly declared inheritance from an addressed parent. */
export function resolveIntroductionAddress(declaration = {}, parent = null, identity = null) {
  const supplied = declaration.address;
  const inherited = supplied == null && declaration.inheritAddress === true && parent?.complete === true;
  const source = inherited ? parent.address : supplied ?? {};
  const validation = validateFullOrganismAddress(source, { calculation:'address-before-interaction', originatingInput:identity });
  return {
    identity, complete:validation.complete, status:validation.complete ? 'addressed' : 'held',
    address:validation.complete ? clone(validation.address) : null,
    inherited, parentIdentity:inherited ? parent.identity : null,
    sourceAddress:clone(source), missing:[...validation.missing], errors:[...validation.errors], diagnostics:clone(validation.diagnostics)
  };
}
export function requireIntroductionAddress(declaration, parent = null, identity = null) {
  const resolution = resolveIntroductionAddress(declaration, parent, identity);
  if (!resolution.complete) {
    const error = new TypeError(`Complete address required before interaction: ${identity ?? 'introduction'}`);
    error.code = 'INTRODUCTION_ADDRESS_REQUIRED'; error.resolution = resolution;
    throw error;
  }
  return resolution;
}
