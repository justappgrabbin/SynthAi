import test from 'node:test';
import assert from 'node:assert/strict';
import { ConsciousnessRealmAdapter } from '../worlds/adapters/consciousness-realm.mjs';

function fakeRealm() {
  const callbacks=[];
  return {
    agents:new Map(),
    places:new Map([
      ['home',{id:'home',name:'Home',type:'home',position:{x:0,y:0},activities:['resting'],currentAgents:[]}],
      ['studio',{id:'studio',name:'Studio',type:'studio',position:{x:10,y:5},activities:['working'],currentAgents:[]}],
      ['plaza',{id:'plaza',name:'Plaza',type:'plaza',position:{x:2,y:2},activities:['socializing'],currentAgents:[]}],
    ]),
    events:[],
    time:{day:1,hour:6,minute:0,totalMinutes:360},
    createAgent(human){const a={id:'realm-agent',humanId:human.id,name:'random-placeholder',birthChart:{type:'random'},location:{placeId:'home',x:0,y:0},relationships:[],needs:{energy:80},dailySchedule:[],currentActivity:null};this.agents.set(a.id,a);return a;},
    getAgentForHuman(id){return [...this.agents.values()].find(a=>a.humanId===id);},
    generateSchedule(chart){return [{time:'09:00',activity:'working',placeId:'studio',profileType:chart.type}];},
    tick(){this.time.minute+=10;if(this.time.minute>=60){this.time.minute=0;this.time.hour++;}for(const cb of callbacks)cb(this);},
    onUpdate(cb){callbacks.push(cb);},
    startActivity(agent,type,placeId){agent.location={placeId,x:this.places.get(placeId).position.x,y:this.places.get(placeId).position.y};agent.currentActivity={type,placeId,duration:60,startTime:Date.now()};}
  };
}

test('CONSCIOUSNESS REALM: Synthia is a world projection and canonical identity overwrites placeholder chart', async()=>{
  const engine=fakeRealm();
  const realm=new ConsciousnessRealmAdapter({engine});
  const projection=realm.bindProjection('synthia',{
    humanProfile:{id:'user-1',name:'User'},
    canonicalIdentity:{name:'Synthia',birthChart:{type:'Generator',source:'canonical-mirror'}}
  });
  assert.equal(projection.name,'Synthia');
  assert.equal(engine.getAgentForHuman('user-1').birthChart.source,'canonical-mirror');
  assert.equal(projection.authority,'projection-only');
  const result=await realm.applyAction({actor:'synthia',type:'work'});
  assert.equal(result.accepted,true);
  assert.equal(result.projection.location.placeId,'studio');
  assert.equal(result.projection.currentActivity.type,'working');
});

test('CONSCIOUSNESS REALM: elapsed-time catchup advances world without claiming endless background execution',()=>{
  const engine=fakeRealm();
  const realm=new ConsciousnessRealmAdapter({engine,maxCatchUpTicks:3});
  const catchup=realm.advanceElapsed(5000);
  assert.equal(catchup.requestedTicks,5);
  assert.equal(catchup.executedTicks,3);
  assert.equal(catchup.pendingTicks,2);
  assert.equal(catchup.complete,false);
});
