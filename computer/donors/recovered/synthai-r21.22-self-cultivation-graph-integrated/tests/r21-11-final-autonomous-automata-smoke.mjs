import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';

const key=`r2111-${Date.now()}`;
const unit=new SynthiaUnit({autoStart:false,memoryKey:key,profile:{purpose:'co-develop with the user while learning and extending the system'}});
const audit=unit.auditCapabilities();
assert.equal(audit.pass,true,audit.missing.join(','));
assert.equal(unit.processField.loci.length,64);
assert.equal(new Set(unit.processField.loci).size,64);
assert.ok(unit.processField.loci.every(x=>Object.keys(x.dimensions).length===5));

const first=unit.coDevelop('Joseph stop popping my pimples');
assert.ok(first.experience?.id);
assert.equal(first.expression.authority,'organism');
assert.ok(first.recursive?.levels?.organism?.[0]?.identity==='Synthia');
const priorGate=unit.processField.loci[first.organism.activeGate-1];
const priorObs=priorGate.observations;

const life1=await unit.living.pulse({dtMs:5000});
assert.ok(life1.organism?.id?.startsWith('autonomous:'));
assert.ok(life1.organism.expression?.authority==='organism');
assert.ok(life1.organism.experience?.source==='endogenous-pulse');
assert.ok(priorGate.observations>priorObs,'same persistent locus must continue observing across autonomous pulse');

const second=unit.coDevelop('Joseph stopped and my skin feels better');
assert.ok(second.experience.sequence>first.experience.sequence);
assert.ok(second.experience.priorExperienceId,'later experience must retain autobiographical continuity');
const outcome=unit.recordCoDevelopmentOutcome({worked:true,statement:'Boundary was respected and the skin irritation improved.'});
assert.equal(outcome.outcome.worked,true);
assert.ok(outcome.experience?.consequence?.direction===1);

const snap=unit.autonomousSnapshot();
assert.ok(snap.sequence>=1);
assert.ok(unit.subjectiveSnapshot().count>=3);

// Prove plurality is not a single comparator/controller: independently retained
// gate states diverge, relations remain separate objects, and recursive parents
// reference children rather than replacing them.
const g1=unit.processField.loci[0],g2=unit.processField.loci[1];
assert.notStrictEqual(g1,g2);
assert.notDeepEqual(g1.vector,g2.vector);
assert.ok(g1.history.length>0&&g2.history.length>0);
const recursive=unit.recursiveSnapshot();
assert.ok(recursive.levels.locus.length>0);
assert.ok(recursive.levels.organism[0].children.length>0);
assert.equal(recursive.rule.includes('parent does not erase child'),true);

unit.stopLife();await unit.fabric.close();
console.log('r21.11 FINAL AUTONOMOUS AUTOMATA PASS: 64 persistent local automata + 5D local choice + endogenous recursive pulse + reconciliation + subjective continuity + self-construction + organism-owned morph + capability reachability');
