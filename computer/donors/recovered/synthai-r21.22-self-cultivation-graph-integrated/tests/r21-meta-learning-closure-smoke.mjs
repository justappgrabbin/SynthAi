import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';

const unit=new SynthiaUnit({profile:{id:'r21.4-meta',purpose:'cultivate verified success',micro:{gate:1,line:1,color:1,tone:1,base:1},macro:{planet:0,dimension:4,zodiac:0,house:0}}});
unit.stopLife();

// Repeated pressure for the same gap must not accumulate duplicate open learning goals.
unit.observeHumanFriction({human:'user',capability:'repair-support',friction:'repeated repair task cannot yet be completed',persistence:2,evidence:{kind:'meta-smoke-1'}});
unit.observeHumanFriction({human:'user',capability:'repair-support',friction:'same unresolved repair task remains',persistence:3,evidence:{kind:'meta-smoke-2'}});
const dev=unit.development.resolve({reason:'meta-smoke'});
const coupled=unit.coupledDevelopment.resolve({reason:'meta-smoke'});
const first=unit.emergence.metaLearner.decideFromPressure({development:dev,coupled,openNeeds:unit.living.needs.open()});
const second=unit.emergence.metaLearner.decideFromPressure({development:dev,coupled,openNeeds:unit.living.needs.open()});
assert.ok(first?.goals?.length || second?.goals?.length,'pressure should create at least one learning goal');
const snap1=unit.metaLearningSnapshot();
const openBySubject=new Map();
for(const g of snap1.recentGoals.filter(g=>g.status==='open')) openBySubject.set(g.subject,(openBySubject.get(g.subject)||0)+1);
assert.ok([...openBySubject.values()].every(n=>n===1),'identical pressure must not accumulate duplicate open goals');

// Verified executed capability closes matching learning goals and becomes reusable skill evidence.
const target=snap1.recentGoals.find(g=>g.status==='open' && String(g.subject).includes('repair-support')) || snap1.recentGoals.find(g=>g.status==='open');
assert.ok(target,'an open learning goal should exist');
const cap=String(target.subject).replace(/^complement:/,'');
const closed=unit.emergence.metaLearner.verifyExecutedCapability(cap,{toolId:'tool-meta-smoke',evidence:[{type:'smoke-execution'}]});
assert.ok(closed.length>=1,'successful executed capability must close its learning goal');
const snap2=unit.metaLearningSnapshot();
assert.ok(snap2.verified>=1,'verified learning must be retained');
assert.ok(snap2.skillCount>=1,'verified capability must enter reusable skill library');

// Cultivation continuity remains coupled to evidence rather than one-turn advice.
const cycle=unit.createCultivationCycle({goal:'complete a real repair task successfully',why:'reduce persistent friction'});
assert.ok(cycle?.id,'cultivation cycle must persist');
const t0=unit.emergenceSnapshot().tasks.find(t=>t.title===cycle.goal);
assert.ok(t0,'cultivation goal must create continuity task');

console.log('R21.4 META-LEARNING PASS: pressure -> deduped learning goal -> executed capability -> verified skill; cultivation continuity retained');
unit.stopLife();
