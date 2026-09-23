import { InterfaceBrickRecognizer } from './interface-brick-recognizer.mjs';

const clone=v=>v===undefined?undefined:structuredClone(v);
const safe=v=>String(v??'unknown').replace(/[^A-Za-z0-9._:-]/g,'_');

export class InterfaceWorldBridge {
  constructor({indiverse,state,bus=null,clock=()=>Date.now(),sendResidentEvent=null,recognizer=new InterfaceBrickRecognizer()}={}){
    if(!indiverse?.registerCanonicalObject) throw new TypeError('InterfaceWorldBridge requires IndiVerse runtime');
    if(!state?.get||!state?.set) throw new TypeError('InterfaceWorldBridge requires StateStore-like persistence');
    Object.assign(this,{indiverse,state,bus,clock,sendResidentEvent,recognizer});
    this.current=null;
  }

  async observe(snapshot={}, {residentId='synthia'}={}){
    const resolved=this.recognizer.recognize(snapshot);
    this.current=clone(resolved);
    const appObjectId=resolved.packageName?'app:'+resolved.packageName:null;
    const surfaceObjectId='interface:'+safe(resolved.surfaceId);

    await this.indiverse.registerCanonicalObject({
      id:surfaceObjectId,
      kind:'interface-building',
      function:'interactive-surface',
      affordances:[],
      entryPoints:[{id:'enter',type:'threshold'}],
      relations:appObjectId?[{type:'inside',target:appObjectId}]:[],
      presentation:{label:resolved.title,symbol:'building',material:'resolved-interface'},
      metadata:{packageName:resolved.packageName,windowId:resolved.windowId,privateByDefault:true,recognizer:resolved.recognizer,recognizerVersion:resolved.version,brickCount:resolved.bricks.length},
    });

    for(const brick of resolved.bricks){
      const id='interface-brick:'+safe(brick.id);
      const parent=brick.parentId?'interface-brick:'+safe(brick.parentId):surfaceObjectId;
      await this.indiverse.registerCanonicalObject({
        id,
        kind:brick.world.kind,
        function:brick.world.function,
        affordances:clone(brick.affordances),
        entryPoints:brick.world.kind==='door'?[{id:'enter',type:'door'}]:[],
        relations:[{type:'inside',target:parent}],
        presentation:{label:brick.label,...clone(brick.world.presentation),material:'resolved-interface'},
        metadata:{privateByDefault:true,surfaceId:resolved.surfaceId,sourceBrickId:brick.id,binding:clone(brick.binding),geometry:clone(brick.geometry),state:clone(brick.state)},
      });
    }

    await this.state.set('phoneWorld.interface.current',resolved,{source:'interface-world'});
    const event={id:'phone-interface-'+this.clock(),type:'phone:interface-resolved',source:'phone:world',actor:residentId,target:resolved.packageName?'phone:app:'+safe(resolved.packageName):'phone:world',summary:'Resolved '+resolved.bricks.length+' interface bricks in '+resolved.title,payload:{surfaceId:resolved.surfaceId,packageName:resolved.packageName,brickCount:resolved.bricks.length,composition:clone(resolved.composition)},at:new Date(this.clock()).toISOString()};
    if(this.sendResidentEvent) await this.sendResidentEvent(residentId,event);
    this.bus?.emit('phone-world:interface-resolved',clone(event));
    return resolved;
  }

  async queueAction({brickId,action,value=null,residentId='synthia'}={}){
    const surface=this.state.get('phoneWorld.interface.current',this.current);
    if(!surface) throw new Error('no resolved interface surface');
    const brick=(surface.bricks??[]).find(b=>b.id===brickId||('interface-brick:'+safe(b.id))===brickId);
    if(!brick) throw new Error('unknown interface brick: '+brickId);
    const affordance=(brick.affordances??[]).find(a=>a.id===action||a.nativeAction===action);
    if(!affordance) throw new Error('unsupported interface action '+action+' for '+brick.id);
    const queue=this.state.get('phoneWorld.interfaceActions',[]);
    const record={id:'interface-action-'+this.clock()+'-'+queue.length,status:'queued',residentId,brickId:brick.id,surfaceId:surface.surfaceId,packageName:surface.packageName,action:affordance.nativeAction,affordance:affordance.id,value:affordance.acceptsValue?value:null,binding:clone(brick.binding),requestedAt:this.clock()};
    queue.push(record);
    await this.state.set('phoneWorld.interfaceActions',queue,{source:'interface-action'});
    this.bus?.emit('phone-world:interface-action-queued',clone(record));
    return clone(record);
  }

  pending({limit=20}={}){
    return this.state.get('phoneWorld.interfaceActions',[]).filter(x=>x.status==='queued').slice(0,Math.max(1,Number(limit)||20)).map(clone);
  }

  async receipt(receipt={}){
    const queue=this.state.get('phoneWorld.interfaceActions',[]);
    const i=queue.findIndex(x=>x.id===receipt.actionId);
    if(i<0) throw new Error('unknown interface action receipt: '+receipt.actionId);
    const prior=queue[i];
    const complete={...prior,status:receipt.success?'completed':'failed',completedAt:this.clock(),receipt:{success:Boolean(receipt.success),reason:receipt.reason??null,packageName:receipt.packageName??null,windowId:receipt.windowId??null}};
    queue[i]=complete;
    await this.state.set('phoneWorld.interfaceActions',queue,{source:'interface-action-receipt'});
    await this.state.set('phoneWorld.interfaceActionReceipts.'+safe(prior.id),complete,{source:'interface-action-receipt'});
    const event={id:'phone-interface-receipt-'+this.clock(),type:'phone:interface-action-receipt',source:'phone:world',actor:prior.residentId,target:prior.packageName?'phone:app:'+safe(prior.packageName):'phone:world',summary:(receipt.success?'Succeeded: ':'Failed: ')+prior.affordance,payload:clone(complete),at:new Date(this.clock()).toISOString()};
    if(this.sendResidentEvent) await this.sendResidentEvent(prior.residentId,event);
    this.bus?.emit('phone-world:interface-action-receipt',clone(event));
    return clone(complete);
  }

  snapshot(){
    return {recognizer:{id:this.recognizer.id,version:this.recognizer.version},current:this.state.get('phoneWorld.interface.current',this.current),pending:this.pending({limit:100}).length};
  }
}

export default InterfaceWorldBridge;
