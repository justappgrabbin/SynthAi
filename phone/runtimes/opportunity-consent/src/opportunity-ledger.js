import { deepClone, id, now, stableHash } from './utils.js';

export class OpportunityLedger {
  constructor(){ this.entries=[]; this.byId=new Map(); }
  _append(opportunityId, type, payload){
    const previous=this.entries.at(-1)?.hash || 'GENESIS';
    const event={eventId:id('evt'), opportunityId, type, at:now(), payload:deepClone(payload), previous};
    event.hash=stableHash(event);
    Object.freeze(event.payload); Object.freeze(event);
    this.entries.push(event);
    const arr=this.byId.get(opportunityId)||[]; arr.push(event); this.byId.set(opportunityId,arr);
    return event;
  }
  record(opportunityId, type, payload={}){ return this._append(opportunityId,type,payload); }
  history(opportunityId){ return [...(this.byId.get(opportunityId)||[])]; }
  has(opportunityId,type){ return this.history(opportunityId).some(e=>e.type===type); }
  latest(opportunityId,type){ return this.history(opportunityId).filter(e=>!type||e.type===type).at(-1)||null; }
  verify(){
    let previous='GENESIS';
    for(const e of this.entries){
      const copy={eventId:e.eventId, opportunityId:e.opportunityId, type:e.type, at:e.at, payload:e.payload, previous:e.previous};
      if(e.previous!==previous || stableHash(copy)!==e.hash) return false;
      previous=e.hash;
    }
    return true;
  }
}
