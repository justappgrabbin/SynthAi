const MODES = new Set(['resident','delegate','provider_voice']);

export class SynthiaModelRouter {
  #providers = new Map();
  #selection = { providerId:'synthia', mode:'resident' };
  constructor({ synthia, transport, ledger = async()=>{} }) {
    if (!synthia?.respond) throw new Error('synthia.respond is required');
    if (!transport?.invoke) throw new Error('transport.invoke is required');
    this.synthia = synthia;
    this.transport = transport;
    this.ledger = ledger;
    this.registerProvider({id:'synthia', label:'Synthia', external:false, capabilities:['chat','reasoning','tools']});
  }
  registerProvider(provider) {
    if (!provider?.id || !provider?.label) throw new Error('provider id and label required');
    this.#providers.set(provider.id, Object.freeze({...provider}));
  }
  listProviders() { return [...this.#providers.values()]; }
  select({providerId='synthia', mode='resident'}) {
    if (!this.#providers.has(providerId)) throw new Error(`Unknown provider ${providerId}`);
    if (!MODES.has(mode)) throw new Error(`Unknown mode ${mode}`);
    if (providerId === 'synthia' && mode !== 'resident') mode = 'resident';
    this.#selection = {providerId, mode};
    return {...this.#selection};
  }
  get selection() { return {...this.#selection}; }

  async respond(input, context={}) {
    const selected = this.#providers.get(this.#selection.providerId);
    const envelope = {
      systemOwner:'synthia',
      provider:selected.id,
      providerLabel:selected.label,
      mode:this.#selection.mode,
      delegated:selected.id !== 'synthia',
      contextOwner:'synthia',
      toolAuthority:'synthia',
      credentialPolicy:'local-or-secure-reference-only',
      createdAt:new Date().toISOString(),
    };
    let result;
    if (selected.id === 'synthia') {
      result = await this.synthia.respond(input, context);
    } else if (this.#selection.mode === 'delegate') {
      const external = await this.transport.invoke(selected, {input, context, owner:'synthia'});
      result = await this.synthia.respond(input, {...context, externalConsult:{provider:selected.id, output:external}});
    } else {
      result = await this.transport.invoke(selected, {input, context, owner:'synthia'});
    }
    const output = {...envelope, result};
    await this.ledger({type:'model.response', ...output});
    return output;
  }
}

export const DEFAULT_PROVIDER_CATALOG = Object.freeze([
  {id:'synthia', label:'Synthia', external:false, capabilities:['chat','reasoning','tools']},
  {id:'openai', label:'OpenAI / GPT', external:true, capabilities:['chat','reasoning']},
  {id:'anthropic', label:'Anthropic / Claude', external:true, capabilities:['chat','reasoning']},
  {id:'xai', label:'xAI / Grok', external:true, capabilities:['chat','reasoning']},
  {id:'custom', label:'Custom compatible model', external:true, capabilities:['chat']},
]);
