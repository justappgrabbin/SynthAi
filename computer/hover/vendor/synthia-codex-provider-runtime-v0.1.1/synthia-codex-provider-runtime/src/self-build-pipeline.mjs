async function hashText(value) {
  const buf = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export class SynthiaBuildPipeline {
  constructor({validator, tester, store, ledger=async()=>{}}) {
    for (const [k,v] of Object.entries({validator,tester,store})) if (!v) throw new Error(`${k} adapter required`);
    this.validator=validator; this.tester=tester; this.store=store; this.ledger=ledger;
  }
  async stage({title, files, source='synthia', metadata={}}) {
    if (!title || !files || typeof files !== 'object') throw new Error('title and files required');
    const manifest=[];
    for (const [path,content] of Object.entries(files)) manifest.push({path,sha256:await hashText(content),bytes:new TextEncoder().encode(String(content)).byteLength});
    const staged={id:crypto.randomUUID(),title,source,files,manifest,metadata,status:'staged',createdAt:new Date().toISOString()};
    await this.store.stage(staged); await this.ledger({type:'build.staged',id:staged.id,manifest}); return staged;
  }
  async verify(staged) {
    const validation=await this.validator(staged.files);
    if (!validation.ok) return {...staged,status:'invalid',validation,tests:null};
    const tests=await this.tester(staged.files);
    const status=tests.ok?'verified':'failed';
    const verified={...staged,status,validation,tests};
    await this.store.update(verified); await this.ledger({type:`build.${status}`,id:staged.id,validation,tests}); return verified;
  }
  async apply(verified,{approved=false}={}) {
    if (verified.status!=='verified') throw new Error('Only verified builds may be applied');
    if (!approved) throw new Error('Explicit approval required before live integration');
    const snapshot=await this.store.snapshotLive();
    try { await this.store.apply(verified); await this.ledger({type:'build.applied',id:verified.id,snapshot}); return {...verified,status:'applied',snapshot}; }
    catch(error){ await this.store.restore(snapshot); await this.ledger({type:'build.rolled_back',id:verified.id,error:String(error),snapshot}); throw error; }
  }
}
