import test from 'node:test';
import assert from 'node:assert/strict';
import {angularTicks,measureGate,reconstructGatePosition,GATE_TICKS} from '../components/organism/processes/MandalaMeasure.mjs';
test('gate 3 angular work-up crosses the zodiac boundary and reconstructs exactly',()=>{
 const start={zodiac:1,degree:26,minute:22,second:30};
 const source={id:'user-gate-3-line-table',revision:'1'};
 for(let offset=0;offset<GATE_TICKS;offset+=73){
   const ticks=angularTicks(start)+offset;
   const position={zodiac:Math.floor(ticks/(30*3600*4))+1,degree:Math.floor(ticks/(3600*4))%30,minute:Math.floor(ticks/(60*4))%60,second:Math.floor(ticks/4)%60,quarter:ticks%4};
   const result=measureGate({source,gate:3,start,position});
   assert.equal(reconstructGatePosition({...result,start}),ticks);
 }
 const line4=measureGate({source,gate:3,start,position:{zodiac:1,degree:29,minute:11,second:15}});
 assert.equal(line4.coordinates.line,4);
 assert.deepEqual(line4.workup.map(x=>x.widthTicks),[13500,2250,375,75]);
 assert.equal(measureGate({source,gate:3,start,position:{zodiac:2,degree:2}}).status,'outside');
 assert.throws(()=>measureGate({gate:3,start,position:start}),/source/);
});
