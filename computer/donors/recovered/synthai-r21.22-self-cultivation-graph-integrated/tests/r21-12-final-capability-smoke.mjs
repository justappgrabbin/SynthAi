import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';

const u=new SynthiaUnit({autoStart:false,profile:{name:'LOCAL PERSON',purpose:'private purpose',birth:'private'} });

// 1) "I have an upload" is understood as an organism event, not generic chat.
const dev=u.coDevelop('I have an upload');
assert.equal(dev.upload?.status,'awaiting-local-artifact');
assert.equal(dev.upload.expression?.stimulus?.kind,'upload');
assert.equal(dev.upload.expression?.stimulus?.phase,'awaiting');

// 2) Actual artifact is classified, addressed, learned by the organism path and morphs.
const up=u.ingestUploadArtifact({name:'new-capability.mjs',type:'text/javascript',size:87,text:'export const capability = () => "ok";'});
assert.equal(up.artifact.kind,'code');
assert.ok(up.address?.gate>=1&&up.address?.gate<=64);
assert.ok(up.actions.includes('ingest-code-dna'));
assert.ok(up.actions.includes('propose-tested-self-change-if-useful'));
assert.equal(up.expression?.stimulus?.phase,'integrating');
assert.notDeepEqual(
  {o:dev.upload.expression.habitat.openness,d:dev.upload.expression.habitat.density,c:dev.upload.expression.behavior.change},
  {o:up.expression.habitat.openness,d:up.expression.habitat.density,c:up.expression.behavior.change},
  'upload lifecycle must visibly/morphologically change organism expression'
);

// 3) Local can know the user/full residence; global projection is hexagrams only.
const local=u.localIdentity();
assert.equal(local.profile.name,'LOCAL PERSON');
const global=u.globalHexagramState();
assert.equal(global.kind,'hexagram-field');
assert.ok(global.hexagrams.length>0);
assert.deepEqual(Object.keys(global).sort(),['hexagrams','kind','relations','scope','version'].sort());
assert.equal(/LOCAL PERSON|private purpose|birth|line|color|tone|base|degree|zodiac|house/i.test(JSON.stringify(global)),false);
assert.equal(u.identityBoundary.assertGlobalSafe(global).ok,true);

// 4) Self editing is present but audited/reversible through the local writer contract.
const edit=u.proposeSelfEdit({target:'organs/NewLocalOrgan.mjs',content:'export default class NewLocalOrgan {}',reason:'tested local capability gap',evidence:[{source:'upload',id:up.id}]});
assert.equal(edit.status,'proposed');
assert.equal(edit.proposal.tool,'propose_file_change');
const protectedEdit=u.proposeSelfEdit({target:'ORGANISM_INVARIANTS.md',content:'nope',reason:'should fail'});
assert.equal(protectedEdit.status,'rejected');

// 5) All supplied references are mapped to operational concepts; more than 3 are active.
const refs=u.externalConceptMap();
assert.equal(refs.length,7);
for(const r of refs){assert.ok(r.source.startsWith('https://'));assert.ok(r.concepts.length>=1);assert.ok(r.implementedBy.length>=1);}
const required=['conway-automaton','generative-episodic-memory','self-compile-android','tribler','dollynator','cfrt','bnf'];
assert.deepEqual(refs.map(x=>x.id).sort(),required.sort());

const audit=u.auditCapabilities();
assert.equal(audit.pass,true,JSON.stringify(audit.missing));
assert.equal(audit.checks.uploadAwareMorphing,true);
assert.equal(audit.checks.localGlobalIdentityMembrane,true);
assert.equal(audit.checks.auditedSelfEditing,true);
assert.equal(audit.checks.externalConceptRegistry,true);

console.log(JSON.stringify({ok:true,upload:{awaiting:dev.upload.status,kind:up.artifact.kind,actions:up.actions,morph:{before:dev.upload.expression.mode,after:up.expression.mode,stimulus:up.expression.stimulus}},global,concepts:refs.map(x=>({id:x.id,concepts:x.concepts})),audit},null,2));
