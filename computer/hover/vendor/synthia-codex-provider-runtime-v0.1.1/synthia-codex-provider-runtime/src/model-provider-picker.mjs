import { DEFAULT_PROVIDER_CATALOG } from './model-provider-router.mjs';

export class SynthiaModelProviderPicker extends HTMLElement {
  #providers = DEFAULT_PROVIDER_CATALOG;
  #value = {providerId:'synthia', mode:'resident'};
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){ this.render(); }
  set providers(v){ if(!Array.isArray(v)||!v.length) throw new Error('providers must be a non-empty array'); this.#providers=v; this.render(); }
  set value(v){ this.#value={providerId:v?.providerId||'synthia',mode:v?.mode||'resident'}; this.render(); }
  get value(){ return {...this.#value}; }
  render(){
    if(!this.shadowRoot)return;
    const p=this.#value.providerId, m=p==='synthia'?'resident':this.#value.mode;
    this.shadowRoot.innerHTML=`<style>:host{display:block;font-family:system-ui,sans-serif}.wrap{display:grid;gap:8px;padding:12px;border:1px solid #30303a;border-radius:14px;background:#111117;color:#f5f5f7}label{font-size:.72rem;opacity:.7}select{width:100%;padding:10px;border-radius:10px;background:#1b1b23;color:inherit;border:1px solid #3b3b45}.note{font-size:.72rem;opacity:.65;line-height:1.3}</style><div class="wrap"><label>AI / model</label><select id="provider">${this.#providers.map(x=>`<option value="${x.id}" ${x.id===p?'selected':''}>${x.label}</option>`).join('')}</select><label>How Synthia uses it</label><select id="mode" ${p==='synthia'?'disabled':''}><option value="delegate" ${m==='delegate'?'selected':''}>Consult, then Synthia integrates</option><option value="provider_voice" ${m==='provider_voice'?'selected':''}>Use provider as conversation voice</option><option value="resident" ${m==='resident'?'selected':''}>Synthia only</option></select><div class="note">Changing the model does not transfer Synthia memory, tool authority, addressing, or ownership. Provider provenance stays attached to each delegated response.</div></div>`;
    const emit=()=>{ const providerId=this.shadowRoot.getElementById('provider').value; const mode=providerId==='synthia'?'resident':this.shadowRoot.getElementById('mode').value; this.#value={providerId,mode}; this.dispatchEvent(new CustomEvent('synthia-model-selection-change',{detail:this.value,bubbles:true,composed:true})); this.render(); };
    this.shadowRoot.getElementById('provider').addEventListener('change',emit);
    this.shadowRoot.getElementById('mode').addEventListener('change',emit);
  }
}

export function defineSynthiaModelProviderPicker(tag='synthia-model-provider-picker'){
  if(!customElements.get(tag)) customElements.define(tag,SynthiaModelProviderPicker);
  return tag;
}
