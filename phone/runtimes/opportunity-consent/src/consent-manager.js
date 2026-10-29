import crypto from 'node:crypto';
import { assert, id, now } from './utils.js';

export class ConsentManager {
  constructor({secret=crypto.randomBytes(32).toString('hex'), ledger}){ this.secret=secret; this.ledger=ledger; this.records=new Map(); }
  grant({opportunityId,subjectId,kind,scope=[],expiresAt=null}){
    assert(['collaboration','installation','endpoint_authorization'].includes(kind),'Unsupported consent kind');
    const record={consentId:id('consent'),opportunityId,subjectId,kind,scope:[...scope],grantedAt:now(),expiresAt,revokedAt:null};
    const payload=Buffer.from(JSON.stringify(record)).toString('base64url');
    const sig=crypto.createHmac('sha256',this.secret).update(payload).digest('base64url');
    const token=`${payload}.${sig}`; this.records.set(record.consentId,record);
    this.ledger?.record(opportunityId,`consent.${kind}.granted`,{consentId:record.consentId,subjectId,scope});
    return {record,token};
  }
  verify(token,{kind,requiredScopes=[]}={}){
    const [payload,sig]=String(token||'').split('.'); if(!payload||!sig) return {valid:false,reason:'malformed'};
    const expected=crypto.createHmac('sha256',this.secret).update(payload).digest('base64url');
    if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return {valid:false,reason:'bad signature'};
    const record=JSON.parse(Buffer.from(payload,'base64url').toString());
    const current=this.records.get(record.consentId); if(!current) return {valid:false,reason:'unknown consent'};
    if(current.revokedAt) return {valid:false,reason:'revoked'};
    if(current.expiresAt && current.expiresAt<now()) return {valid:false,reason:'expired'};
    if(kind && current.kind!==kind) return {valid:false,reason:'wrong consent kind'};
    if(requiredScopes.some(s=>!current.scope.includes(s))) return {valid:false,reason:'missing scope'};
    return {valid:true,record:{...current}};
  }
  revoke(consentId){ const r=this.records.get(consentId); if(!r) return false; r.revokedAt=now(); this.ledger?.record(r.opportunityId,`consent.${r.kind}.revoked`,{consentId}); return true; }
}
