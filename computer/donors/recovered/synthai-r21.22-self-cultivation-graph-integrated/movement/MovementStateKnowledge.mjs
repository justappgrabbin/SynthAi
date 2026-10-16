import {StateSpaceKernel} from '../vendor/ato-core/src/state-space-kernel.mjs';
import {resolveGate} from '../vendor/ato-core/src/gate-address.mjs';
const clone=x=>x==null?x:structuredClone(x);

/**
 * Movement-layer state recognition + knowledge retrieval.
 * Deliberately NOT a reasoning engine and NOT a generative-language engine.
 */
export class MovementStateKnowledge{
  constructor({kernel=new StateSpaceKernel({featureWidth:24}),memory=null}={}){this.kernel=kernel;this.memory=memory;this.meanings=new Map();}
  key(address){const s=this.kernel.get(address);return s.addressKey;}
  register(address,{forms={},provenance=null}={}){const addressKey=this.key(address);const rec={addressKey,address:clone(this.kernel.get(address).address),forms:clone(forms),provenance:clone(provenance)};this.meanings.set(addressKey,rec);this.memory?.upsert?.('movement-state-knowledge',addressKey,rec);return clone(rec);}
  recognize(input,{topK=8}={}){const r=this.kernel.describe(input);return {input:r.input,candidates:r.candidates.slice(0,topK).map(({state,distance})=>({addressKey:state.addressKey,address:clone(state.address),distance,known:this.meanings.has(state.addressKey)}))};}
  lookup(address){const state=this.kernel.get(address),known=this.meanings.get(state.addressKey)||null;let gate=null;try{gate=resolveGate(state.address.gate);}catch{}return {addressKey:state.addressKey,address:clone(state.address),vector:[...state.value.vector],gate:gate?{kingWenGate:gate.kingWenGate,binaryValue:gate.binaryValue,bits:gate.bits,content:gate.content}:null,meaning:known?clone(known):null,role:'state-recognition-reference',generatesLanguage:false,decidesConclusions:false};}
  snapshot(){return {entries:[...this.meanings.values()].map(clone),count:this.meanings.size};}
}
export default MovementStateKnowledge;
