/**
 * SupabaseResolutionPoster
 *
 * Resolution persistence adapter. It never decides meaning/addressing; it only
 * persists the already-ingested/analyzed/addressed artifact and returns receipts.
 * No key is bundled. Configure at runtime with project URL + publishable/service key.
 */
export class SupabaseResolutionPoster {
  constructor({url,key,fetchImpl=globalThis.fetch}={}){
    if(!url) throw new TypeError('SupabaseResolutionPoster requires url');
    if(!key) throw new TypeError('SupabaseResolutionPoster requires key');
    if(typeof fetchImpl!=='function') throw new TypeError('fetch implementation required');
    this.url=String(url).replace(/\/$/,'');
    this.key=key;
    this.fetch=fetchImpl;
  }

  async insert(schema,table,row){
    return this.#request({method:'POST',schema,table,body:row,prefer:'return=representation'});
  }

  async update(schema,table,query,patch){
    return this.#request({method:'PATCH',schema,table,query,body:patch,prefer:'return=representation'});
  }

  async postResolution({artifact,analysis,address,extraPosts=[]}={}){
    this.#assertResolvedAddress(address);
    const receipts=[];
    // 1. Persist ingest record first. This is still NOT resolved.
    const ingestRows=await this.insert('public','ingested_files',{
      filename:artifact.filename||artifact.name||'artifact',
      file_type:artifact.fileType||artifact.type||null,
      file_size:Number.isFinite(artifact.fileSize)?artifact.fileSize:null,
      storage_path:artifact.storagePath||null,
      content_summary:analysis.summary||null,
      content_vector:analysis.contentVector||{},
      detected_gates:analysis.detectedGates||[],
      detected_dimension:analysis.dimension||address.dimension||null,
      can_morph:analysis.canMorph!==false,
      morph_intensity:Number.isFinite(analysis.morphIntensity)?analysis.morphIntensity:0.5,
      ingestion_status:'pending'
    });
    const ingest=ingestRows?.[0];
    if(!ingest?.id) throw new Error('Supabase ingest post returned no id');
    receipts.push({stage:'ingest',schema:'public',table:'ingested_files',id:ingest.id});

    // 2. Persist analysis as analyzed. Still NOT resolved.
    const analysisRows=await this.insert('private','intake_analyses',{
      ingested_file_id:ingest.id,
      entity_type:analysis.entityType||'artifact',
      entity_id:analysis.entityId||artifact.id||artifact.contentHash||null,
      five_w:analysis.fiveW||{},
      semantic_triples:analysis.semanticTriples||[],
      behavior_profile:analysis.behaviorProfile||{},
      intended_purpose:analysis.purpose||null,
      dependency_graph:analysis.dependencyGraph||{},
      resolver_status:'analyzed',
      analysis_version:analysis.version||'synthia-native-resolution-v1',
      provenance:analysis.provenance||{}
    });
    const analysisRow=analysisRows?.[0];
    if(!analysisRow?.id) throw new Error('Supabase analysis post returned no id');
    receipts.push({stage:'analyze',schema:'private',table:'intake_analyses',id:analysisRow.id});

    // 3. Persist canonical mesh/address. Still NOT resolved until finalization succeeds.
    const addressRows=await this.insert('public','morph_addresses',{
      entity_type:analysis.entityType||'artifact',
      entity_id:analysis.entityId||artifact.id||artifact.contentHash||String(ingest.id),
      gate:address.gate??null,
      line:address.line??null,
      color:address.color??null,
      tone:address.tone??null,
      base:address.base??null,
      degree:address.degree??null,
      minute:address.minute??null,
      second:address.second??null,
      arc:address.arc??null,
      zodiac:address.zodiac??null,
      house:address.house??null,
      planetary:typeof address.planetary==='number'?address.planetary:(address.planetaryIndex??null),
      dimension:address.dimension??null,
      expression_state:address.expressionState||'dormant',
      source:artifact.source||analysis.source||'synthia-resolution-pipeline',
      raw_data:{artifact:{name:artifact.filename||artifact.name||null,contentHash:artifact.contentHash||null},analysisVersion:analysis.version||null}
    });
    const addressRow=addressRows?.[0];
    if(!addressRow?.id) throw new Error('Supabase address post returned no id');
    receipts.push({stage:'address',schema:'public',table:'morph_addresses',id:addressRow.id});

    // 4. Optional routed/derived posts. Any failure prevents RESOLVED.
    for(const post of extraPosts){
      if(!post?.table) throw new TypeError('extra post requires table');
      const rows=await this.insert(post.schema||'public',post.table,post.row||{});
      const first=rows?.[0]||null;
      receipts.push({stage:post.stage||'derived-post',schema:post.schema||'public',table:post.table,id:first?.id??first?.node_id??null});
    }

    // 5. Commit links/status last. Only after every required post succeeded.
    const finalizedAnalysis=await this.update('private','intake_analyses',`id=eq.${analysisRow.id}`,{
      resolved_address_id:addressRow.id,
      resolver_status:'resolved',
      updated_at:new Date().toISOString()
    });
    if(!finalizedAnalysis?.length) throw new Error('Supabase analysis finalization failed');
    receipts.push({stage:'finalize-analysis',schema:'private',table:'intake_analyses',id:analysisRow.id});

    const finalizedIngest=await this.update('public','ingested_files',`id=eq.${ingest.id}`,{
      address_id:addressRow.id,
      ingestion_status:'addressed',
      addressed_at:new Date().toISOString()
    });
    if(!finalizedIngest?.length) throw new Error('Supabase ingest finalization failed');
    receipts.push({stage:'finalize-ingest',schema:'public',table:'ingested_files',id:ingest.id});

    return {ok:true,ingestedFileId:ingest.id,analysisId:analysisRow.id,addressId:addressRow.id,receipts};
  }


  #assertResolvedAddress(a){
    const dims=['Movement','Evolution','Being','Design','Space'];
    const ok=!!a&&Number.isInteger(a.gate)&&a.gate>=1&&a.gate<=64&&Number.isInteger(a.line)&&a.line>=1&&a.line<=6&&Number.isInteger(a.color)&&a.color>=1&&a.color<=6&&Number.isInteger(a.tone)&&a.tone>=1&&a.tone<=6&&Number.isInteger(a.base)&&a.base>=1&&a.base<=5&&dims.includes(a.dimension);
    if(!ok)throw new Error('refusing Supabase RESOLVED post: canonical address incomplete');
  }

  async #request({method,schema,table,query='',body,prefer}){
    const url=`${this.url}/rest/v1/${encodeURIComponent(table)}${query?`?${query}`:''}`;
    const headers={
      apikey:this.key,
      Authorization:`Bearer ${this.key}`,
      'Content-Type':'application/json',
      'Accept-Profile':schema,
      'Content-Profile':schema
    };
    if(prefer) headers.Prefer=prefer;
    const response=await this.fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const text=await response.text();
    let data=null; if(text){ try{data=JSON.parse(text);}catch{data=text;} }
    if(!response.ok) throw new Error(`Supabase ${schema}.${table} ${method} failed ${response.status}: ${typeof data==='string'?data:JSON.stringify(data)}`);
    return data||[];
  }
}
export default SupabaseResolutionPoster;
