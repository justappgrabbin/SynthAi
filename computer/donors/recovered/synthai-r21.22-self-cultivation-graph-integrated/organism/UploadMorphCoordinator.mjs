const clone=x=>x==null?x:structuredClone(x);
const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')};
const CODE=/\.(?:[cm]?[jt]sx?|css|scss|html?|json|mjs|cjs|wasm|py|rs|go|java|kt)$/i;
const DATA=/\.(?:csv|tsv|jsonl|xml|yaml|yml|toml|sql)$/i;
const DOC=/\.(?:txt|md|pdf|docx?|rtf|epub)$/i;
const IMAGE=/\.(?:png|jpe?g|gif|webp|svg|bmp)$/i;
const MEDIA=/\.(?:mp4|webm|mov|m4v|mp3|wav|ogg|m4a)$/i;
const ARCHIVE=/\.(?:zip|tar|tgz|gz|7z|rar|apk)$/i;

function classify(name='',type=''){
  const n=String(name),t=String(type);
  if(CODE.test(n)||/javascript|typescript|json|html|css|wasm/.test(t))return 'code';
  if(DATA.test(n)||/csv|xml|yaml/.test(t))return 'data';
  if(IMAGE.test(n)||t.startsWith('image/'))return 'image';
  if(MEDIA.test(n)||t.startsWith('audio/')||t.startsWith('video/'))return 'media';
  if(DOC.test(n)||/pdf|text\//.test(t)||/word|epub/.test(t))return 'document';
  if(ARCHIVE.test(n)||/zip|archive|android\.package/.test(t))return 'archive';
  return 'artifact';
}
function actionsFor(kind){
  const common=['preserve-local-source','classify','resolve-address','observe-through-5d','store-episode','update-organism-expression'];
  if(kind==='code')return [...common,'ingest-code-dna','inspect-capability-delta','propose-tested-self-change-if-useful'];
  if(kind==='image'||kind==='media')return [...common,'route-media-perception','extract-grounded-features','relate-to-current-work'];
  if(kind==='document'||kind==='data')return [...common,'chunk-local-knowledge','extract-evidence','relate-to-current-work'];
  if(kind==='archive')return [...common,'inventory-container-before-adoption','classify-contained-capabilities','test-before-integration'];
  return [...common,'inspect-unknown-artifact','ask-only-for-missing-context'];
}

/** Uploads are organism events, not a file-picker side feature. */
export class UploadMorphCoordinator{
  constructor({unit,memory}={}){if(!unit)throw new Error('UploadMorphCoordinator requires SynthiaUnit');this.unit=unit;this.memory=memory||unit.memory;this.awaiting=null;this.history=[];this.#load();}
  #load(){try{this.awaiting=this.memory?.get?.('upload-morph','awaiting')?.value||null;this.history=(this.memory?.query?.('upload-morph-history')||[]).map(x=>x.value||x).slice(-64)}catch{}}
  detects(intent=''){return /\b(i\s+(?:have|got|uploaded?)\s+(?:an?\s+)?(?:upload|file|zip|document|image)|(?:here(?:'s| is)|got)\s+(?:an?\s+)?(?:upload|file)|upload(?:ing)?\s+(?:something|a file))\b/i.test(String(intent));}
  declare(intent='I have an upload'){
    const field=this.unit.processField.evaluate(this.unit,{intent:String(intent),cycle:{id:`upload-await:${Date.now()}`,goal:String(intent),stage:'orientation',purpose:'receive and integrate a local artifact without assuming what it is'}});
    const recursive=this.unit.recursiveField.resolve(field);
    const expression=this.unit.morphicExpression.resolve({intent:String(intent),field,recursive,stimulus:{kind:'upload',phase:'awaiting'}});
    const rec={id:`upload-await:${Date.now()}`,at:Date.now(),status:'awaiting-local-artifact',intent:String(intent),next:'receive the artifact, preserve it locally, classify it, address it, then let relevant processes decide what it is useful for',expression,global:this.unit.identityBoundary?.global(field)||null};
    this.awaiting=rec;this.memory?.upsert?.('upload-morph','awaiting',rec);return clone(rec);
  }
  ingest({name='unknown',type='',size=0,text='',sourceId=null,hash:givenHash=null}={}){
    const kind=classify(name,type);const content=String(text||'');const digest=givenHash||hash(`${name}\0${type}\0${size}\0${content.slice(0,131072)}`);
    const intent=`local upload ${name} (${kind})`;
    const address=this.unit.resolveAddress(`${name}\n${content.slice(0,4096)}`).canonical;
    const inquiry=this.unit.cultivationProgram?.interrogatives?.resolve?.({goal:intent,context:`kind=${kind}; size=${size}`,purpose:'understand and integrate the artifact without flattening it',human:this.unit.profile?.name||'user'})||null;
    const field=this.unit.processField.evaluate(this.unit,{intent,cycle:{id:`upload:${digest}`,goal:intent,stage:'cultivation',purpose:'local artifact integration',inquiry}});
    const recursive=this.unit.recursiveField.resolve(field);
    const experience=this.unit.subjectivity.experience({input:intent,field,episode:{unresolved:inquiry?.missing||[]},source:'local-upload'});
    const expression=this.unit.morphicExpression.resolve({intent,field,recursive,stimulus:{kind:'upload',phase:'integrating',artifactKind:kind,digest}});
    const rec={id:`upload:${digest}`,at:Date.now(),status:'integrated-local-observation',artifact:{name,type,size,kind,digest,sourceId},address,actions:actionsFor(kind),inquiry,activeLoci:field.organism?.activeLoci||[],experienceId:experience?.id||null,expression,global:this.unit.identityBoundary?.global(field)||null};
    this.history.push(rec);if(this.history.length>64)this.history.shift();this.awaiting=null;this.memory?.upsert?.('upload-morph','awaiting',null);this.memory?.remember?.('upload-morph-history',rec);this.memory?.remember?.('events',{intent,kind:'upload',artifact:rec.artifact,address,at:rec.at});return clone(rec);
  }
  snapshot(){return {awaiting:clone(this.awaiting),history:this.history.slice(-16).map(clone)};}
}
export {classify as classifyUpload};
export default UploadMorphCoordinator;
