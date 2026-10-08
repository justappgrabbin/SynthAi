import test from 'node:test';
import assert from 'node:assert/strict';
import {HumanOutcomeLedger} from '../components/organism/organism/HumanOutcomeLedger.mjs';
import {ScienceMode} from '../components/organism/organism/ScienceMode.mjs';

test('expectations and successive results retain independent history across restart',()=>{
 const saved=new Map();
 const memory={query:()=>[...saved.values()].map(value=>({value:structuredClone(value)})),upsert:(_,id,value)=>saved.set(id,structuredClone(value))};
 const ledger=new HumanOutcomeLedger({memory,purpose:'Finish a chosen project'});
 const science=new ScienceMode({ledger});
 const h=science.createHypothesis({statement:'A reminder helps me keep my chosen appointment',predictions:['Appointment kept'],nullHypothesis:'The reminder makes no difference'});
 const before=structuredClone(h);
 const evidence={reportedBy:'user',appointmentKept:true};
 const first=science.recordResult(h.id,{actualOutcome:'Appointment kept',evidence});
 evidence.appointmentKept=false;
 const second=science.recordResult(h.id,{actualOutcome:'Correction: appointment missed',evidence:{reportedBy:'user'}});
 assert.deepEqual(ledger.records.find(r=>r.id===h.id),before);
 assert.equal(first.evidence.appointmentKept,true);
 assert.notEqual(first.id,second.id);
 const restored=new HumanOutcomeLedger({memory});
 assert.equal(restored.records.length,3);
 assert.deepEqual(restored.records.find(r=>r.id===h.id),before);
 const paper=new ScienceMode({ledger:restored}).paper();
 assert.deepEqual(paper.sections.hypotheses[0].resultIds,[first.id,second.id]);
 assert.equal(paper.sections.observations[1].hypothesisId,h.id);
 assert.throws(()=>restored.observeResult('missing',{actualOutcome:'No'}),/unknown outcome/);
 assert.equal(restored.records.length,3);
});
