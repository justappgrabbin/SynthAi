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
    events:[],messages:[],randomBirthCalls:0,
    time:{day:1,hour:6,minute:0,totalMinutes:1800},
    generateBirthChart(){this.randomBirthCalls++;return {type:'random',source:'realm-placeholder'};},
    createAgent(human){
      const chart=this.generateBirthChart(human);
      const a={
        id:'realm-agent',humanId:human.id,name:'realm-placeholder',birthChart:chart,
        location:{placeId:'home',x:0,y:0},relationships:[],memories:[],
        needs:{energy:80,connection:50,growth:60,purpose:40,rest:70},
        state:{mood:{valence:0,arousal:0,dominance:0},focus:null,seeking:true,available:true},
        traits:{curiosity:50,sociability:50,creativity:50,discipline:50,empathy:50,resilience:50},
        skills:{},consciousness:{level:10,stage:'dormant',insights:[]},
        dailySchedule:[],currentActivity:null
      };
      this.agents.set(a.id,a);return a;
    },
    getAgentForHuman(id){return [...this.agents.values()].find(a=>a.humanId===id);},
    determineElement(){return 'air';},
    determineArchetype(){return 'Explorer';},
    generateSchedule(chart){return [{time:'09:00',activity:'working',placeId:'studio',profileType:chart.type}];},
    tick(){
      this.time.minute+=10;
      if(this.time.minute>=60){this.time.minute-=60;this.time.hour++;}
      if(this.time.hour>=24){this.time.hour-=24;this.time.day++;}
      this.time.totalMinutes=this.time.day*1440+this.time.hour*60+this.time.minute;
      for(const cb of callbacks)cb(this);
    },
    onUpdate(cb){callbacks.push(cb);},
    startActivity(agent,type,placeId){
      agent.location={placeId,x:this.places.get(placeId).position.x,y:this.places.get(placeId).position.y};
      agent.currentActivity={type,placeId,duration:60,startTime:Date.now()};
    }
  };
}

test('CONSCIOUSNESS REALM: canonical chart is injected before donor creates Synthia projection', async()=>{
  const engine=fakeRealm();
  const realm=new ConsciousnessRealmAdapter({engine});
  const projection=realm.bindProjection('synthia',{
    humanProfile:{id:'user-1',name:'User'},
    canonicalIdentity:{name:'Synthia',birthChart:{type:'Generator',profile:'6/4',source:'canonical-mirror'}}
  });
  assert.equal(projection.name,'Synthia');
  assert.equal(engine.randomBirthCalls,0,'Realm random/simple chart generator must not run for Synthia');
  assert.equal(engine.getAgentForHuman('user-1').birthChart.source,'canonical-mirror');
  assert.equal(projection.authority,'projection-only');

  const result=await realm.applyAction({actor:'synthia',type:'work'});
  assert.equal(result.accepted,true);
  assert.equal(result.projection.location.placeId,'studio');
  assert.equal(result.projection.currentActivity.type,'working');
  assert.equal(engine.getAgentForHuman('user-1').currentActivity.startTime,engine.time.totalMinutes*60000,'activity uses Realm world-time basis');
});

test('CONSCIOUSNESS REALM: dormant catchup follows real elapsed minutes with bounded replay',()=>{
  const engine=fakeRealm();
  const realm=new ConsciousnessRealmAdapter({engine,maxCatchUpTicks:3});
  const catchup=realm.advanceElapsed(50*60*1000);
  assert.equal(catchup.worldMinutes,50);
  assert.equal(catchup.requestedTicks,5);
  assert.equal(catchup.executedTicks,3);
  assert.equal(catchup.pendingTicks,2);
  assert.equal(catchup.complete,false);
  assert.equal(engine.time.totalMinutes,1830);
});

test('CONSCIOUSNESS REALM: checkpoint restores full world state, not only public projection',()=>{
  const engine=fakeRealm();
  const realm=new ConsciousnessRealmAdapter({engine});
  realm.bindProjection('synthia',{
    humanProfile:{id:'user-1',name:'User'},
    canonicalIdentity:{name:'Synthia',birthChart:{type:'Generator',profile:'6/4'}}
  });
  engine.events.push({id:'evt-1',agentId:'realm-agent',type:'work'});
  engine.messages.push({id:'msg-1',toHuman:'user-1',content:'done'});
  const saved=realm.snapshot();

  engine.agents.clear();engine.events=[];engine.messages=[];engine.time={day:99,hour:0,minute:0,totalMinutes:142560};
  realm.hydrate(saved);

  assert.equal(engine.agents.get('realm-agent').name,'Synthia');
  assert.equal(engine.events[0].id,'evt-1');
  assert.equal(engine.messages[0].id,'msg-1');
  assert.equal(engine.time.day,1);
  assert.equal(realm.projection('synthia').id,'realm-agent');
});
