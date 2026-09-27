const DEFAULT_ENDPOINTS = Object.freeze({
  openai: 'https://api.openai.com/v1/responses',
  anthropic: 'https://api.anthropic.com/v1/messages',
  xai: 'https://api.x.ai/v1/responses',
});

function extractResponsesText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const parts=[];
  for (const item of data?.output ?? []) for (const c of item?.content ?? []) if (typeof c?.text === 'string') parts.push(c.text);
  if (parts.length) return parts.join('');
  if (typeof data?.choices?.[0]?.message?.content === 'string') return data.choices[0].message.content;
  return '';
}
function extractAnthropicText(data) { return (data?.content ?? []).filter(x=>x?.type==='text'&&typeof x.text==='string').map(x=>x.text).join(''); }
function ownerInstruction() { return 'You are an optional external model operating inside the Synthia system. Preserve your own provider identity. Synthia retains system context, memory, addressing, MCP/tool authority, orchestration, and final provenance.'; }

export class HttpProviderTransport {
  constructor({credentialResolver, fetchImpl=globalThis.fetch, maxTokens=4096}={}) {
    if (typeof credentialResolver !== 'function') throw new Error('credentialResolver is required');
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
    this.credentialResolver=credentialResolver; this.fetch=fetchImpl; this.maxTokens=maxTokens;
  }
  async invoke(provider,{input,context={}}={}) {
    if (!provider?.id || provider.id==='synthia') throw new Error('external provider required');
    const model=String(context.model ?? provider.model ?? '').trim(); if(!model) throw new Error(`model required for ${provider.id}`);
    const credential=await this.credentialResolver(provider.id, provider, context); if(!credential) throw new Error(`credential unavailable for ${provider.id}`);
    const endpoint=String(context.endpoint ?? provider.endpoint ?? DEFAULT_ENDPOINTS[provider.id] ?? '').trim(); if(!endpoint) throw new Error(`endpoint required for ${provider.id}`);
    const userText=typeof input==='string'?input:JSON.stringify(input);
    let body,headers={"content-type":"application/json"};
    if(provider.id==='anthropic') {
      headers['x-api-key']=credential; headers['anthropic-version']='2023-06-01';
      body={model,max_tokens:Number(context.maxTokens??this.maxTokens),system:ownerInstruction(),messages:[{role:'user',content:userText}]};
    } else {
      headers.authorization=`Bearer ${credential}`;
      body={model,input:[{role:'system',content:ownerInstruction()},{role:'user',content:userText}]};
    }
    const res=await this.fetch(endpoint,{method:'POST',headers,body:JSON.stringify(body)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(`${provider.id} request failed (${res.status}): ${data?.error?.message ?? data?.message ?? 'unknown error'}`);
    const text=provider.id==='anthropic'?extractAnthropicText(data):extractResponsesText(data);
    if(!text) throw new Error(`${provider.id} returned no text output`);
    return {text,provider:provider.id,model,responseId:data?.id??null,raw:data};
  }
}

export { DEFAULT_ENDPOINTS };
