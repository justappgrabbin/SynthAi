import { FoundationComputer } from 'synthia/src/computer-adapter.mjs';
import { SoloHoverRuntime } from 'synthia/src/hover-runtime.mjs';
import { AndroidHandBridge } from 'synthia/src/android-hand.mjs';
import { bindYNIToSwarm } from 'synthia/vendor/swarm-body/host/yniSwarmHands.mjs';
import { ResidentLanguageRealizer } from 'synthia/src/resident-language.mjs';

export const DESKTOP_APPS = [
 {id:'resonance',name:'Resonance',icon:'◎',color:'cyan',description:'Profile, isohuman, network, and live Cynthia contact'},
 {id:'chat',name:'Synthia',icon:'✦',color:'violet',description:'Local assistant with action tools'},
 {id:'files',name:'Files',icon:'▱',color:'gold',description:'Import, edit, save, and launch your files'},
 {id:'realm',name:'Agentic Reality',icon:'◈',color:'pink',description:'Live resident Morph view + preserved House world'},
 {id:'tools',name:'Tools',icon:'⚒',color:'cyan',description:'Launch the mounted Synthia tools'},
 {id:'todo',name:'To Do',icon:'✓',color:'green',description:'Keep tasks and run them with Synthia'},
 {id:'build',name:'Build',icon:'⌘',color:'blue',description:'Edit and run local HTML apps'},
 {id:'browser',name:'Browser',icon:'◎',color:'cyan',description:'Open web pages and use device hands'},
 {id:'settings',name:'Settings',icon:'⚙',color:'silver',description:'Appearance, device hands, and backups'}
];
export function expressionIR(text){
 const tokens=String(text).match(/\d+(?:\.\d+)?(?:e[+-]?\d+)?|[()+*/%-]/ig)??[];
 if(tokens.join('').toLowerCase()!==String(text).replace(/\s/g,'').toLowerCase()||tokens.length>128)throw Error('Use numbers, parentheses, and + − * / %.');
 let i=0;
 function atom(){const t=tokens[i++];if(t==='-')return {op:'mul',args:[-1,atom()]};if(t==='+')return atom();if(t==='('){const a=parse(0);if(tokens[i++]!==')')throw Error('Close the parentheses.');return a;}if(t===undefined||!/^\d/.test(t))throw Error('A number is missing.');const n=Number(t);if(!Number.isFinite(n))throw Error('Number is too large.');return n;}
 const prec={'+':1,'-':1,'*':2,'/':2,'%':2},ops={'+':'add','-':'sub','*':'mul','/':'div','%':'mod'};
 function parse(min){let a=atom();while(prec[tokens[i]]>=min){const t=tokens[i++];const b=parse(prec[t]+1);a=['sub','div','mod'].includes(ops[t])?{op:ops[t],left:a,right:b}:{op:ops[t],args:[a,b]};}return a;}
 const result=parse(0);if(i!==tokens.length)throw Error('Check the expression.');return result;
}
export function receiptValue(receipt){return receipt?.record?.execution?.result?.returnValue??receipt?.outcome?.result?.returnValue;}
export function summarize(value,depth=0){
 if(value==null)return 'Completed.';if(typeof value==='string')return value;if(typeof value!=='object')return String(value);
 if(depth>2)return Array.isArray(value)?`${value.length} items`:'Details recorded';
 if(Array.isArray(value))return value.slice(0,12).map(v=>summarize(v,depth+1)).join('\n');
 if(value.utterance)return String(value.utterance);
 return Object.entries(value).filter(([k,v])=>!['address','canonicalAddress','manifest','packet','provenance','trace'].includes(k)&&typeof v!=='function').slice(0,10).map(([k,v])=>`${k.replace(/([A-Z])/g,' $1').replace(/[_-]/g,' ')}: ${summarize(v,depth+1)}`).join('\n')||'Completed; details saved in Activity.';
}
export class DesktopRuntime {
 constructor({computer=new FoundationComputer(),navigate=()=>{},document=globalThis.document}={}){this.computer=computer;this.navigate=navigate;this.document=document;this.android=new AndroidHandBridge();this.androidReady=false;this.lastReceipt=null;this.taskQueue=Promise.resolve();this.permissions={allowExecution:true,allowFiles:true,allowNetwork:true};this.language=new ResidentLanguageRealizer();}
 async boot(){await this.computer.boot();this.store=this.computer.foundation.store;this.tasks=await this.store.get('desktop:tasks')??[];this.installed=await this.store.get('desktop:apps')??[];this.messages=await this.store.get('desktop:messages')??[];
 for(const t of this.tasks)if(t.status==='running'){t.status='interrupted';t.result='Interrupted by restart; run explicitly to retry.';}
 await this.store.put('desktop:tasks',this.tasks);
 this.handBinding=bindYNIToSwarm(this.computer.foundation.swarm,{document:this.document,permissions:this.permissions,host:{
  inspect:()=>({title:this.document?.title??'Synthia Computer',screen:this.currentScreen??'home'}),
  save:async(name,data)=>{const p=await this.workspace();await this.computer.projects.writeFile(p.id,name,String(data),{type:'text/plain'});return {saved:name};},
  read:async name=>{const p=await this.workspace();const f=this.computer.projects.readFile(p.id,name);if(!f)throw Error('File not found: '+name);return f.content;},
  open:url=>{const tab=globalThis.open?.(url,'_blank','noopener');if(!tab)throw Error('Browser blocked the new tab. Use the Open page button.');return {opened:url};}
 }});
 for(const app of DESKTOP_APPS)this.computer.apps.register(app.id,{...app,execute:()=>this.open(app.id)},{replace:true});
 this.hover=new SoloHoverRuntime({organism:{
  wiringAudit:()=>this.computer.foundation.system.wiringAudit(),
  canonicalMorph:this.computer.foundation.sources.morph,
  identityStatus:()=>({configured:true,personId:'desktop-owner',agentId:'synthia'}),
  chat:async(text)=>({ok:true,utterance:(await this.respond(text)).text}),
  flushPersistence:async()=>this.store.put('desktop:tasks',this.tasks)
 },tasks:{list:async()=>structuredClone(this.tasks),update:async(id,patch)=>{const t=this.tasks.find(x=>x.id===id);if(!t)throw Error('Task not found');Object.assign(t,patch);await this.store.put('desktop:tasks',this.tasks);return structuredClone(t);}},
 browser:{status:()=>({available:true,scope:'current desktop; external pages open in browser'}),close:async()=>{}},android:this.android});
 return this;
 }
 open(id){if(!['home',...DESKTOP_APPS.map(x=>x.id)].includes(id))throw Error('Unknown screen: '+id);this.currentScreen=id;this.hover?.setSurface(({realm:'world',files:'build',tools:'build',settings:'chat',home:'chat'})[id]??id);this.navigate(id);return {opened:id};}
 async workspace(){const key='desktop:workspace';let id=await this.store.get(key);let p=id?this.computer.projects.get(id):null;if(!p){p=await this.computer.projects.create({name:'My Files',description:'Desktop files and installed apps'});await this.store.put(key,p.id);}return p;}
 async saveFile(name,content,type='text/plain'){if(!name?.trim())throw Error('Give the file a name.');if(name.includes('..')||/^[\\/]/.test(name))throw Error('Use a relative file name.');const p=await this.workspace();await this.computer.projects.writeFile(p.id,name,content,{type});return {saved:name};}
 async files(){return this.computer.projects.list().flatMap(p=>this.computer.projects.listFiles(p.id).map(f=>({...f,projectId:p.id,projectName:p.name})));}
 async installFile(file){
  const text=await file.text();if(file.size>12000000)throw Error('Import files smaller than 12 MB.');
  const ext=file.name.split('.').at(-1).toLowerCase();if(!['html','htm','js','json','txt','md','css','mjs'].includes(ext))throw Error('Import HTML apps, JavaScript, executable JSON, or text files. ZIP archives need extraction first.');
  const type=ext==='html'||ext==='htm'?'text/html':ext==='json'?'application/json':ext==='js'||ext==='mjs'?'text/javascript':'text/plain';
  await this.saveFile(file.name,text,type);
  let kind=type==='text/html'?'html':null;
  if(ext==='js')kind='javascript';
  if(ext==='json'){try{if(JSON.parse(text).realizer)kind='realizer';}catch{throw Error('Saved as a file, but the JSON syntax is invalid.');}}
  if(kind){const app={id:'import:'+file.name,name:file.name.replace(/\.[^.]+$/,''),path:file.name,kind};this.installed=this.installed.filter(x=>x.id!==app.id);this.installed.push(app);await this.store.put('desktop:apps',this.installed);return {installed:app.name,kind};}
  return {saved:file.name};
 }
 async runInstalled(id){const app=this.installed.find(x=>x.id===id);if(!app)throw Error('App not installed.');const p=app.projectId?this.computer.projects.get(app.projectId):await this.workspace();const file=this.computer.projects.readFile(p.id,app.path);if(!file)throw Error('App file missing.');if(app.kind==='html')return {html:file.content,name:app.name};return this.executeFile(file);}
 async executeFile(file){let input=file.content;if(file.type==='application/json'){input=JSON.parse(input);if(!input.realizer)throw Error('This is data, not an executable app.');}const r=await this.computer.execute(input,{name:file.path,mime:file.type});this.lastReceipt=r;if(!r.ok)throw Error(r.outcome?.error??r.record?.execution?.error??'Execution failed');return {text:summarize(receiptValue(r)),receipt:r};}
 async calculate(expression){const r=await this.computer.execute({realizer:'expression-ir',expression:expressionIR(expression)},{name:'calculator.json'});this.lastReceipt=r;if(!r.ok)throw Error(r.outcome.error??'Calculation failed');return receiptValue(r);}
 executableTools(){return [...this.computer.foundation.tools(),
 {id:'source-synthesis',name:'Tool Factory',description:'Create an executable tool from a purpose'},
 {id:'source-swarm',name:'Swarm',description:'Route a tool-creation task to the local synthesis organ'},
 {id:'source-morph',name:'Morph State',description:'Inspect the mounted morph runtime'},
 {id:'source-qualities',name:'Address Qualities',description:'Resolve qualities for the last execution address'},
 ...this.computer.foundation.sources.synthesis.list().map(t=>({id:'synthesized:'+t.id,name:t.name??t.id,description:t.purpose??'Run generated tool'}))];}
 async runTool(id,input){
 let r;
 if(id.startsWith('synthesized:'))r=await this.computer.execute({realizer:'source-system',system:'synthesis',op:'run',id:id.slice(12),input});
 else if(id==='source-synthesis')r=await this.computer.tools.get(id).execute({op:'create',request:{purpose:input,input}});
 else if(id==='source-swarm')r=await this.computer.tools.get(id).execute({op:'submit',tasks:[{capability:'source.synthesis',input:{op:'create',request:{purpose:input,input}}}]});
 else if(id==='source-morph')r=await this.computer.tools.get(id).execute({op:'snapshot'});
 else if(id==='source-qualities'){const address=this.lastReceipt?.outcome?.canonicalAddress??this.computer.foundation.system.addressResolver.resolve({artifact:{content:input}}).address;r=await this.computer.tools.get(id).execute({address,level:2});}
 else {if(!this.computer.foundation.tools().some(x=>x.id===id))throw Error('Unknown tool.');r=await this.computer.chat(`${id} ${JSON.stringify(String(input))}`);}
 this.lastReceipt=r;if(!r.ok)throw Error(r.outcome.error??'Tool failed');return {text:summarize(r.outcome.learned?.output??receiptValue(r)),receipt:r};
 }
 async hand(capability,input){const r=await this.computer.foundation.swarm.submit([{capability,input}]);const e=r.executions[0];if(!e||e.status!=='complete')throw Error(e?.error??'No hand can execute that action.');return e.output;}
 async addTask(text){if(!text?.trim())throw Error('Write a task first.');const t={id:crypto.randomUUID(),text:text.trim(),done:false,status:'ready',createdAt:Date.now()};this.tasks.unshift(t);await this.store.put('desktop:tasks',this.tasks);return t;}
 async toggleTask(id){const t=this.tasks.find(x=>x.id===id);if(!t)throw Error('Task not found');t.done=!t.done;await this.store.put('desktop:tasks',this.tasks);return t;}
 runTask(id){const job=this.taskQueue.then(async()=>{const t=this.tasks.find(x=>x.id===id);if(!t)throw Error('Task not found');t.status='running';await this.store.put('desktop:tasks',this.tasks);try{const result=await this.respond(t.text);t.status=result.acted?'complete':'review';t.result=result.text;}catch(e){t.status='blocked';t.result=e.message;}await this.store.put('desktop:tasks',this.tasks);return t;});this.taskQueue=job.catch(()=>{});return job;}
 async checkAndroid(baseUrl){if(baseUrl)this.android=new AndroidHandBridge({baseUrl});const r=await this.android.status();this.androidReady=r.available===true;if(this.hover)this.hover.android=this.android;return r;}
 async androidCommand(text){if(!this.androidReady)throw Error('Connect the Hover Android accessibility bridge in Settings first.');const r=await this.android.command(text);if(r.ok===false)throw Error(r.error??'Device action failed');if(!r.action)throw Error('Use inspect screen, tap x y, click text, type text, scroll down, or open app package.name.');return r;}
 async respond(text){
  const raw=String(text).trim();let m;
  if(/^(hi|hello|hey)[!. ]*$/i.test(raw)) {await this.computer.chat(raw,{surface:'desktop-chat'});return {text:'Hi. I’m here. What would you like to do?',acted:false};}
  if((m=raw.match(/^(?:please\s+)?(?:open|show|go to)\s+(?:my\s+|the\s+)?(.+?)\s*[.!]?$/i))){const aliases={home:'home',desktop:'home',resonance:'resonance',network:'resonance',profile:'resonance',files:'files',tools:'tools',apps:'tools',tasks:'todo','to do':'todo',todo:'todo',build:'build',builder:'build',browser:'browser',world:'realm',realm:'realm','agentic reality':'realm',settings:'settings',chat:'chat',synthia:'chat'};const id=aliases[m[1].toLowerCase()];if(id){await this.hand('device.dom.inspect',{op:'inspect'});this.open(id);return {text:`Opened ${id==='realm'?'Agentic Reality':id==='todo'?'To Do':id[0].toUpperCase()+id.slice(1)}.`,acted:true};}}
  if((m=raw.match(/^(?:calculate|calc|what is|what's)\s+([\d\s()+*/%.^e-]+)\??$/i))||/^[\d\s()+*/%.^e-]+$/i.test(raw)){const result=await this.calculate(m?m[1]:raw);return {text:String(result),acted:true};}
  if((m=raw.match(/^(?:add task|todo|to do)\s*:?\s+(.+)$/i))){await this.addTask(m[1]);return {text:'Added to To Do: '+m[1],acted:true};}
  if((m=raw.match(/^(?:write|save)\s+(?:a\s+)?note\s*:?\s+(.+)$/i))){const name=`note-${Date.now()}.txt`;await this.hand('file.write',{op:'write',name,data:m[1]});return {text:`Saved ${name} in Files.`,acted:true};}
  if((m=raw.match(/^device\s+(.+)$/i))){return {text:summarize(await this.androidCommand(m[1])),acted:true};}
  if(/^(?:help|what can you do)[?!]?$/i.test(raw))return {text:'I can open screens, calculate, save notes, add tasks, and run the local Synthia tools. Try “open Files”, “calculate 6 * 7”, “save note: my idea”, or “add task: calculate 25 * 4”. Device commands work when the Hover accessibility bridge is connected.',acted:false};
  const result=await this.computer.chat(raw,{surface:'desktop-chat'});this.lastReceipt=result;if(!result.ok)throw Error(result.outcome?.error??'Synthia could not complete this request.');const realized=this.language.realize({text:raw,receipt:result,history:this.messages});return {text:realized.text,acted:Boolean(realized.acted),receipt:result,language:realized.meta};
 }
 async send(text){const user={role:'user',text:String(text),at:Date.now()};this.messages.push(user);let result;try{result=await this.respond(text);}catch(e){result={text:e.message,error:true};}this.messages.push({role:'synthia',text:result.text,at:Date.now(),error:result.error??false});this.messages=this.messages.slice(-100);await this.store.put('desktop:messages',this.messages);return result;}
}
