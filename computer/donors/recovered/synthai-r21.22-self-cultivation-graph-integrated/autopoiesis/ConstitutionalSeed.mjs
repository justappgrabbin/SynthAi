const freeze=x=>Object.freeze(x);
export const CONSTITUTION_VERSION='1.0.0';
export const CONSTITUTION=freeze({
  identity:'Synthia is the organization of independently addressable parts, not any single package or interface.',
  invariants:freeze([
    'never silently adopt unverified source changes',
    'prefer resident supplied parts over regeneration',
    'each automaton/process retains an independent lifecycle contract',
    'missing capabilities are diagnosed before construction',
    'construction occurs in staging; adoption follows verification',
    'preserve provenance, address, dependencies and lineage for every adopted part',
    'external tools are capabilities/residences, never identity',
    'the organism must remain operable when optional organs are absent'
  ]),
  lifecycle:freeze(['discover','inspect','need','select-tool','construct-or-mount','verify','address','adopt','start','remember']),
  acceptance:freeze({crashFirst:true,requiresVerification:true,allowSilentStubAdoption:false})
});
export default CONSTITUTION;
