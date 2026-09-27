import { AnticipatoryMeshMemory, InMemoryPrecedentMesh, PrecedentMeshProvider } from './AnticipatoryMeshMemory';
import { ChannelRegistry } from './ChannelRegistry';
import type { ForwardHorizonRequest, PublicMemoryAddress, RuntimeState, SharedPrecedent } from './foundations';
import type { ToolScheduleReport } from './ToolScheduler';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const A61:PublicMemoryAddress={gate:61,line:1,color:2,tone:3,base:4};
const A24:PublicMemoryAddress={gate:24,line:2,color:2,tone:3,base:4};
const precedent:SharedPrecedent={precedentId:'precedent_61_24_demo',triggerAddresses:[A61,A24],channelId:'24-61',circuit:'Knowing',capabilityPath:['24-61'],outcome:'SUCCESS',responseClass:'EXISTING_PATH',confidence:.88,evidenceCount:7};

async function preloadThenDisconnect(){
  const mesh=new InMemoryPrecedentMesh().seed(precedent); const memory=new AnticipatoryMeshMemory(mesh);
  const request:ForwardHorizonRequest={startAt:10000,endAt:10000+86400000,preparedAt:10000,candidates:[{candidateId:'tomorrow-61-24',activatesAt:20000,expiresAt:10000+86400000,activeAddresses:[A61,A24],privateCoordinates:[{degree:123,minute:45,second:12,arc:99,zodiac:'private',house:8}]}]};
  const report=await memory.preload(request); assert(report.meshReachable,'mesh should preload'); assert(report.cachedPrecedents===1,'should cache 61-24');
  mesh.setReachable(false);
  const recalled=memory.recall({triggerId:'local-private-trigger',occurredAt:30000,activeAddresses:[A61,A24],privateCoordinates:[{degree:222,minute:1,second:2,arc:3,zodiac:'still-private',house:11}]});
  assert(recalled.length===1,'offline recall failed');
  const serialized=JSON.stringify(memory.snapshot());
  for(const k of ['degree','minute','second','arc','zodiac','house','privateCoordinates']) assert(!serialized.includes(`\"${k}\"`),`private key ${k} leaked`);
  const expired=memory.recall({triggerId:'after-horizon',occurredAt:10000+86400000+1,activeAddresses:[A61,A24]});
  assert(expired.length===0,'expired forward-horizon precedent should be evicted');
}

class SpyMesh implements PrecedentMeshProvider{
  queryPayload:unknown=null; published:SharedPrecedent[]=[]; reachable=true;
  async isReachable(){return this.reachable;} async queryPrecedents(a:PublicMemoryAddress[]){this.queryPayload=a;return[];} async publishPrecedent(p:SharedPrecedent){this.published.push(p);}
}

async function privacyBoundary(){
  const spy=new SpyMesh(); const memory=new AnticipatoryMeshMemory(spy);
  await memory.preload({startAt:0,endAt:100,preparedAt:0,candidates:[{candidateId:'privacy',activatesAt:1,expiresAt:100,activeAddresses:[A61,A24],privateCoordinates:[{degree:359,minute:59,second:59,arc:123,zodiac:8,house:12}]}]});
  const q=JSON.stringify(spy.queryPayload); for(const k of ['degree','minute','second','arc','zodiac','house','privateCoordinates']) assert(!q.includes(`\"${k}\"`),`query leaked ${k}`);
  const node=(stateId:string,a:PublicMemoryAddress)=>({stateId,address:{side:'FIVE_SIDE' as const,planet:1,dimension:3,gateLine:{gate:a.gate,line:a.line},color:a.color,tone:a.tone,base:a.base},activation:.8,phase:.2,coherence:.9,tension:.1,regime:'STABLE' as const,collapseEventIds:['private-collapse'],outgoingArcIds:[],incomingArcIds:[],createdAt:1,lastUpdated:1});
  const state={session:{sessionId:'PRIVATE-SESSION-ID',intent:{intentId:'PRIVATE-INTENT',description:'PRIVATE RAW SITUATION',side:'FIVE_SIDE',seed:1n},seed:{sessionSeed:1n,eventCounter:1},createdAt:1},surfaces:new Map(),ternaryEmergences:[],activeNodes:new Map([['s61',node('s61',A61)],['s24',node('s24',A24)]]),collapseEvents:new Map([['private-collapse',{degree:111,minute:22,second:33} as any]]),arcs:new Map(),channelActivations:new Map(),hyperchannels:new Map(),expressionGraph:{graphId:'g',sessionId:'PRIVATE-SESSION-ID',nodes:[],edges:[],inputs:[],outputs:[],constraints:[],provenance:[],settled:false},messageBus:[],seed:{sessionSeed:1n,eventCounter:1}} as unknown as RuntimeState;
  const report:ToolScheduleReport={activationsSeen:1,executions:1,generatedTools:[],correctionTools:[],unsatisfiedCapabilities:[],records:[{activationId:'a',definitionId:'24-61',toolId:'PRIVATE-TOOL-ID',generated:false,correctionAttempt:false,success:true,capabilities:['24-61'],sourceStateId:'s61',targetStateId:'s24',result:{success:true,outputValues:{raw:'PRIVATE OUTPUT'},expressionNodes:[],provenance:[]}}]};
  await memory.observeSchedule(state,report,new ChannelRegistry()); assert(spy.published.length===1,'expected publication'); const pub=JSON.stringify(spy.published[0]);
  for(const v of ['PRIVATE-SESSION-ID','PRIVATE-INTENT','PRIVATE RAW SITUATION','PRIVATE-TOOL-ID','PRIVATE OUTPUT']) assert(!pub.includes(v),`private value leaked ${v}`);
  for(const k of ['degree','minute','second','arc','zodiac','house']) assert(!pub.includes(`\"${k}\"`),`publication leaked ${k}`);
  assert(pub.includes('24-61'),'useful structural precedent lost');

  // Learn while isolated: queue only the sanitized precedent, then flush it on
  // the next reachable preload without needing the original private episode.
  spy.reachable=false; spy.published=[];
  const offlineMemory=new AnticipatoryMeshMemory(spy);
  await offlineMemory.observeSchedule(state,report,new ChannelRegistry());
  await offlineMemory.observeSchedule(state,report,new ChannelRegistry());
  assert(offlineMemory.snapshot().pendingPublications.length===1,'duplicate offline structural lesson should aggregate, not duplicate');
  assert(offlineMemory.snapshot().pendingPublications[0].evidenceCount===2,'offline structural evidence should accumulate');
  spy.reachable=true;
  const flush=await offlineMemory.preload({startAt:200,endAt:300,preparedAt:200,candidates:[]});
  assert(flush.pendingPublicationsFlushed===1,'queued precedent should sync when mesh returns');
  assert(spy.published.length===1,'mesh should receive the queued sanitized precedent');
}

(async()=>{await preloadThenDisconnect();await privacyBoundary();console.log(JSON.stringify({pass:true,boundary:'Gate.Line.Color.Tone.Base',offlineRecallAfterPreload:true,privateBelowBaseLeak:false,exampleChannel:'24-61'}));})().catch(e=>{console.error(e);throw e;});
