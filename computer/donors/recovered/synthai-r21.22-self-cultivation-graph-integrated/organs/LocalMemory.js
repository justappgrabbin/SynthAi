export class LocalMemory {
  constructor(key='synthia.memory.v080'){this.key=key;this.state={facts:[],events:[],artifacts:[],patterns:[],morphs:[],_meta:{seq:0}};this.load();if(!this.state._meta)this.state._meta={seq:0};}
  load(){try{const raw=globalThis.localStorage?.getItem(this.key);if(raw)this.state={...this.state,...JSON.parse(raw)}}catch{}return this.state;}
  save(){try{globalThis.localStorage?.setItem(this.key,JSON.stringify(this.state))}catch{}return this.state;}
  remember(kind,value){const list=this.state[kind]||(this.state[kind]=[]);const at=Date.now();const seq=++this.state._meta.seq;list.push({id:`${kind}-${at}-${seq}`,at,value});if(list.length>500)list.splice(0,list.length-500);this.save();return list.at(-1);}
  query(kind,pred=()=>true){return [...(this.state[kind]||[])].filter(x=>pred(x.value,x));}
  upsert(kind,key,value){const list=this.state[kind]||(this.state[kind]=[]);const at=Date.now();const idx=list.findIndex(x=>x?.key===key);const record={id:`${kind}-${String(key)}`,key,at,value};if(idx>=0)list[idx]=record;else list.push(record);if(list.length>500)list.splice(0,list.length-500);this.save();return record;}
  get(kind,key){return (this.state[kind]||[]).find(x=>x?.key===key)||null;}
  snapshot(){return structuredClone(this.state);}
}
export default LocalMemory;
