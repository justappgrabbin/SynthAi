/**
 * Bounded client for the user's ORIGINAL Synthia Generative Address System.
 * That system remains sovereign and unchanged in its own checkout/process.
 * Communication mode stays on the existing Computer chat route.
 * Klein/Morph errors do not silently fall back to other chat modes.
 */
export class GenerativeAddressGateway {
  constructor({endpoint=process.env.SYNTHIA_GENERATIVE_CORE_URL||'http://127.0.0.1:8787',
                timeoutMs=12000,state=null,bus=null}={}){
    const url=new URL(endpoint);
    if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname) ||
       url.username||url.password||url.search||url.hash||url.pathname!=='/')
      throw new TypeError('Generative Address must use an explicit loopback HTTP origin');
    this.origin=url.origin;
    this.timeoutMs=timeoutMs;this.state=state;this.bus=bus;
  }
  async request(path,{method='GET',body=null}={}){
    const response=await fetch(this.origin+path,{
      method,signal:AbortSignal.timeout(this.timeoutMs),
      headers:{'accept':'application/json',...(body===null?{}:{'content-type':'application/json'})},
      ...(body===null?{}:{body:JSON.stringify(body)}),
      redirect:'error'
    });
    const raw=await response.text();
    if(raw.length>10000000)throw new Error('Generative Address result exceeds 10 MB response limit');
    let json;
    try{json=JSON.parse(raw)}catch{throw new Error('Generative Address returned non-JSON output')}
    if(!response.ok)throw new Error('Generative Address '+response.status+': '+(json.error||'request failed'));
    return json;
  }
  async status(){
    try{
      const audit=await this.request('/api/audit');
      return {connected:true,provider:'original-generative-address-system',
        endpoint:this.origin,verifiedBy:'original-engine-api-audit',
        audit};
    }catch(error){return {connected:false,provider:'original-generative-address-system',
       endpoint:this.origin,error:error.message}}
  }
  async chat({text,mode='klein',context={},addresses=null}={}){
    if(!['klein','morph'].includes(mode))throw new TypeError('Use the original Computer for Communication mode');
    if(typeof text!=='string'||!text.trim()||text.length>4000)
      throw new TypeError('Invalid chat message');
    if(!context || typeof context!=='object'||Array.isArray(context))throw new TypeError('Invalid context');
    const body={mode,message:text,context};
    if(addresses!==null){
      if(!Array.isArray(addresses)||addresses.length>128)throw new TypeError('Explicit addresses required');
      body.addresses=addresses;
    }
    const result=await this.request('/api/chat',{method:'POST',body});
    // The original engine returns deeply nested audit/mesh data (often >500KB).
    // Consume its real result but keep only the observed public chat contract,
    // preserving local state size and not implying we cloned its graph.
    const output={
      processingMode:result.processingMode,
      utterance:typeof result.utterance==='string'?result.utterance.slice(0,12000):null,
      recordId:result.recordId??null,
      morphologyApplied:mode==='morph'&&!!result.morphology,
      morphologyPolicy:result.morphology?.policy??null,
    };
    if(output.processingMode!==mode || !output.utterance)
      throw new Error('Original engine did not confirm a complete '+mode+' chat result');
    const receipt={provider:'original-generative-address-system',
      mode,from:this.origin,output,at:new Date().toISOString(),
      addressedInput:addresses!==null,externalEngineConsumed:true};
    if(this.state){
      const history=this.state.get('models.generativeAddressReceipts',[]);
      await this.state.set('models.generativeAddressReceipts',[...history,receipt].slice(-30),
          {source:'generative-address-integration'});
    }
    this.bus?.emit('generative-address:chat-completed',{mode,at:receipt.at});
    return receipt;
  }
}
