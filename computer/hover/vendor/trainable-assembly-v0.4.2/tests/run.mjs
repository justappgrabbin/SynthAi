import assert from 'node:assert/strict';
import { PureSynthiaLearningCore } from '../src/pure-synthia-learning-core.mjs';
import { addressKey } from '../src/address.mjs';

const s=new PureSynthiaLearningCore({extractors:{autoling:t=>({tokens:t.split(/\s+/).length}),diseminer:t=>({chars:t.length})}});
const a=s.registry.register({entityId:'a',nativeAddress:{planetary:1,dimension:'Evolution',gate:3,line:2,color:1,tone:4,base:2,degree:5,minute:30,second:10,arc:22,zodiac:4,house:7},sayings:{Evolution:'I Remember'},state:{x:1}});
assert.equal(a.currentAddressKey,addressKey(a.currentAddress));
assert.equal(Object.keys(a.currentAddress).length,13);
const e=s.registry.transition('a',{toAddress:{...a.currentAddress,gate:4},cause:'test'});
assert.equal(e.after.address.gate,4);
assert.equal(s.registry.get('a').nativeAddress.gate,3);

const frags=s.books.ingest({sourceId:'book1',title:'Book',dimension:'Movement',text:'I Create motion.\n\nI Create form.',addressResolver:({index})=>({dimension:'Movement',gate:index+1})});
assert.equal(frags.length,2);
assert.equal(s.registry.get(frags[0].fragmentId).source.sourceId,'book1');
assert.equal(s.registry.get(frags[0].fragmentId).sayings.Movement,'I Create motion.');

const sentence=s.sentences.compose({records:[s.registry.get('a'),s.registry.get(frags[0].fragmentId)]});
assert.match(sentence.sentence,/I Remember/);
assert.match(sentence.sentence,/I Create motion/);

const q=s.scientist.question('Will route A work?',{hypothesis:'yes'});
s.scientist.evidence(q.id,{source:'test',relevance:.9});
const exp=s.scientist.experiment(q.id,{action:'route A',predicted:'success',actual:'success',toolPath:['Parser','Validator']});
assert.ok(exp.score>.7);
assert.equal(s.scientist.dashboard().validated,1);

s.training.record({task:'x',stateBefore:{},toolPath:['Parser','Validator'],interaction:{},stateAfter:{},observedExpression:'done',success:true});
assert.equal(s.training.rankRoutes()[0].successRate,1);
console.log('PASS registration');
console.log('PASS canonical 13-field live address');
console.log('PASS provenance-preserving book ingestion');
console.log('PASS sentence mesh');
console.log('PASS scientist loop');
console.log('PASS training journal');
console.log('6/6 PASS');
