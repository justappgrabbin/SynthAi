import {
  SynthiaStateSpace,
  DIMENSION_ORDER,
  DIMENSIONS,
  GateMath,
  AXES,
  Coordinate,
} from '../state-space/state-space-foundation.mjs';

const PLANETS=['Sun','Earth','Moon','North Node','South Node','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const clone=x=>globalThis.structuredClone?structuredClone(x):JSON.parse(JSON.stringify(x));
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,Number(n)||0));

export function canonicalToFoundationAddress(canonical={}){
  const resolved={},unresolved=[];
  for(const [field,min,max] of AXES){
    const supplied=canonical[field];
    if(supplied===undefined||supplied===null||supplied===''){
      unresolved.push({field,reason:'missing'});continue;
    }
    let value=supplied;
    if(field==='planetary'&&typeof value==='string'&&PLANETS.includes(value))value=PLANETS.indexOf(value)+1;
    if(field==='dimension'&&typeof value==='string'&&DIMENSION_ORDER.includes(value))value=DIMENSION_ORDER.indexOf(value)+1;
    const numeric=typeof value==='number'||typeof value==='string'?Number(value):NaN;
    if(!Number.isInteger(numeric)||numeric<min||numeric>max){
      unresolved.push({field,reason:'invalid',value:clone(supplied),range:[min,max]});continue;
    }
    resolved[field]=numeric;
  }
  if(!unresolved.length)return new Coordinate(resolved);
  return {status:'partial',resolved,unresolved,sourceAddress:clone(canonical)};
}

export class StateOrganismBridge{
  constructor({unit=null,stateSpace=null}={}){
    this.unit=unit;
    this.stateSpace=stateSpace||new SynthiaStateSpace();
    this.events=[];
    this.unresolvedRecords=clone(unit?.memory?.get?.('address-bridge','unresolved')?.value?.records||[]);
  }

  holdUnresolved(address,request){
    const record={id:`unresolved:${globalThis.crypto.randomUUID()}`,status:'partial',address:clone(address),request:clone(request),executable:false,timestamp:Date.now()};
    this.unresolvedRecords.push(record);
    this.unit?.memory?.upsert?.('address-bridge','unresolved',{records:clone(this.unresolvedRecords)});
    this.events.push({type:'unresolved-address',eventId:record.id,at:record.timestamp});
    return clone(record);
  }

  ingestIntent(intent,canonical,{mode='complement',source='organism:intent'}={}){
    const address=canonicalToFoundationAddress(canonical);
    if(address.status==='partial')return this.holdUnresolved(address,{kind:'intent',intent,mode,source});
    const dimension=address.dimensionName;
    const event=this.stateSpace.recordEvent({
      address,dimension,scale:'discourse',source,kind:'intent',activation:.58,
      payload:{intent:String(intent||''),mode},
    });
    this.events.push({type:'intent',eventId:event.id,at:event.timestamp});
    return event;
  }

  ingestResult(result,canonical,{causedBy=null,source='organism:collective'}={}){
    const address=canonicalToFoundationAddress(canonical);
    if(address.status==='partial')return this.holdUnresolved(address,{kind:'collective-result',result,causedBy,source});
    const event=this.stateSpace.recordEvent({
      address,dimension:address.dimensionName,scale:'discourse',source,kind:'collective-result',
      activation:result?.ok===false?.28:.62,
      pressure:result?.ok===false?.62:null,
      causedBy,
      payload:{
        ok:result?.ok!==false,
        route:[...(result?.route||[])],
        contributors:[...(result?.collective?.contributors||[])],
        cycle:result?.cycle??null,
      },
    });
    this.events.push({type:'result',eventId:event.id,at:event.timestamp});
    return event;
  }

  ingestProcessField(field){
    if(!field?.gates)return [];
    const emitted=[];
    const active=new Set(field.activeLoci||field.organism?.activeLoci||[]);
    for(const gateView of field.gates){
      if(!active.has(gateView.gate))continue;
      for(const dimension of DIMENSION_ORDER){
        const decision=gateView.decisions?.[dimension];
        if(!decision)continue;
        emitted.push(this.stateSpace.recordEvent({
          gate:gateView.gate,dimension,scale:'automaton',source:'organism:gate-process-field',
          kind:'local-dimension-state',activation:clamp(decision.activation),
          payload:{choice:decision.choice,concern:decision.concern,evidence:clone(decision.evidence),observations:gateView.observations},
        }));
      }
    }
    this.events.push({type:'process-field',count:emitted.length,at:Date.now()});
    return emitted;
  }

  ingestPulse(pulse,{gate=null,source='organism:living-loop'}={}){
    const activeGate=Number(gate||this.unit?.processField?.snapshot?.()?.activeGate||1)||1;
    const success=this.unit?.metabolism?.snapshot?.()||{};
    const event=this.stateSpace.recordEvent({
      gate:activeGate,dimension:'Evolution',scale:'automaton',source,kind:'life-pulse',
      activation:clamp(.25+Number(success.adaptationBudget||0)*.08),
      pressure:clamp(Number(success.repairPressure||0)),
      payload:{pulse:clone(pulse),vitality:Number(success.vitality??.68),adaptationBudget:Number(success.adaptationBudget||0)},
    });
    this.events.push({type:'pulse',eventId:event.id,at:event.timestamp});
    return event;
  }

  ingestToolExecution({toolId,capabilities=[],request=null,output=null}={}){
    const canonical=request?.address||this.unit?.residence?.address||{};
    const address=canonicalToFoundationAddress(canonical);
    if(address.status==='partial')return this.holdUnresolved(address,{kind:'tool-executed',toolId,capabilities,request,output});
    const event=this.stateSpace.recordEvent({
      address,dimension:'Design',scale:'automaton',source:'organism:tool-factory',kind:'tool-executed',activation:.72,
      payload:{toolId,capabilities:[...capabilities],request:clone(request),output:clone(output)},
    });
    this.events.push({type:'tool-executed',eventId:event.id,toolId,at:event.timestamp});
    return event;
  }

  ingestPerception(perception,options={}){
    const events=this.stateSpace.sensing.ingest(perception,options);
    this.events.push({type:'perception',count:events.length,at:Date.now()});
    return events;
  }

  sentence(canonical,extra={}){
    const address=canonicalToFoundationAddress(canonical);
    if(address.status==='partial')return this.holdUnresolved(address,{kind:'sentence',extra});
    return this.stateSpace.sentence.generate(address,extra);
  }

  patternForGate(gate){
    const locus=this.stateSpace.codon(gate);
    return {
      gate:locus.gate,
      binary:[...locus.binary],
      transforms:{
        mirror:GateMath.reverse(gate),
        shadow:GateMath.inverse(gate),
        rotation:GateMath.converse(gate),
        core:GateMath.nuclear(gate),
      },
      dimensions:Object.fromEntries(DIMENSION_ORDER.map(d=>[d,this.stateSpace.cell(gate,d)])),
      sharedLedger:[...locus.sharedLedger],
    };
  }

  snapshot(){
    return {
      version:'state-organism-bridge.v1',
      dimensions:Object.fromEntries(DIMENSION_ORDER.map(d=>[d,DIMENSIONS[d]])),
      coordinateStates:this.stateSpace.coordinates.size(),
      codons:this.stateSpace.codons.size,
      dimensionalCells:this.stateSpace.codons.size*DIMENSION_ORDER.length,
      recent:this.events.slice(-128).map(clone),
      unresolvedRecords:clone(this.unresolvedRecords),
    };
  }
}

export default StateOrganismBridge;
