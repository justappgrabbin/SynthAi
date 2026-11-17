import {executionContracts,executionSchema,invocationArgs} from './tool-contracts.mjs';
/* Local inference drives the same persistent, verified execution tools as the UI. */
export const COMMANDS = ['inventory','inspect','read_file','write_file','acquire','construct','execute','verify','finish'];

const string={type:'string'},array={type:'array',items:{}},stringArray={type:'array',items:string};
const verification={type:'array',items:{type:'object',properties:{args:array,expected:{},invocation:{type:'object'}},required:['expected']}};
const buildFields={importMap:{type:'object',additionalProperties:{type:'string'}},name:string,description:string,entry:string,exportName:string,cases:verification,holdouts:verification};
const commandFields={
 inventory:[{},[]],inspect:[{paths:stringArray},['paths']],
 read_file:[{path:string,start:{type:'integer'},end:{type:'integer'}},['path']],
 write_file:[{path:string,source:string},['path','source']],
 acquire:[buildFields,['name','description','entry','cases']],construct:[buildFields,['name','description','entry','cases']],
 execute:[{name:string,args:array},['name','args']],verify:[{name:string},['name']],
 finish:[{message:string,capabilities:stringArray},['message','capabilities']]
};
export const COMMAND_SCHEMA={anyOf:Object.entries(commandFields).map(([cmd,[properties,required]])=>({type:'object',properties:{cmd:{const:cmd},args:{type:'object',properties,required,additionalProperties:false}},required:['cmd','args'],additionalProperties:false}))};

export function commandSchema(contracts){return {anyOf:[...COMMAND_SCHEMA.anyOf.filter(s=>s.properties.cmd.const!=='execute'),...executionSchema(contracts)]};}

export const SYSTEM = `You operate a real local JavaScript computer. Reply with exactly one JSON object: {"cmd":"command","args":{...}}.
Commands:
inventory {} lists source files and verified capabilities.
inspect {paths:["file.js"]} returns real syntax, imports, declarations and calls.
read_file {path,start?,end?} reads exact source; start/end are character offsets. Read relevant source before acquiring it.
write_file {path,source} writes a complete new source version. Never replace an implementation with a smaller imitation.
acquire {name,description,entry,exportName,cases,holdouts?,importMap?} captures the complete entry module and local dependencies from the project, executes examples, and only saves if all pass.
construct has the same arguments; its JavaScript may import stored capabilities using '@cap/NAME'. ES module exports are native; for CommonJS use the default exports object. Every artifact can be imported in future constructions.
Examples have {args:[...],expected:value}. For a class use {invocation:{construct:true,args:[],calls:[{method:"name",args:[]}]},expected:[returnedValues]}.
execute {name,inputs:{arg0:value,arg1:value,...}} runs a saved artifact. Inventory lists its required named inputs and verified examples. Supply values from the current task; never omit a required field or copy an example instead of the requested value.
verify {name} replays its contract and holdout examples from storage.
finish {message,capabilities:[names]} lists ALL capabilities acquired or constructed during this task and independently replays them before ending.
Do not invent output or claim a tool ran before its result. Inspect unfamiliar source, read its actual implementation, acquire a useful mechanism with meaningful cases, construct using it, execute the construction and verify it. Use subsequent constructions to reuse newly acquired capabilities. For an app, main may return {html:"complete HTML"} for the preview. Work locally; there is no external model service. Missing packages and unsupported runtime environments produce errors that require an explicit adapter. Preserve unknowns rather than fabricating semantic rules.`;
function contextEvent(event) {
  const copy=structuredClone(event);
  if(copy.cmd==='write_file'&&typeof copy.args.source==='string')copy.args={path:copy.args.path,characters:copy.args.source.length,sourceLocation:'Complete version retained in workspace; use read_file to inspect it.'};
  if(copy.cmd==='inspect'&&Array.isArray(copy.result))copy.result=copy.result.map(r=>({path:r.path,format:r.format,bytes:r.bytes,exports:r.exports,imports:r.imports,declarations:r.declarations,calls:r.calls.length,interpretation:r.interpretation}));
  return copy;
}
export class LocalAgent {
  constructor({computer,workspace,model,onEvent=()=>{},hat=null}) {Object.assign(this,{computer,workspace,model,onEvent,hat});this.stopped=false;this.model.setContracts?.(()=>this.contracts());}
  async contracts(){const listed=await this.computer.store.list();return executionContracts(await Promise.all(listed.map(c=>this.computer.store.get(c.name))));}
  stop(){this.stopped=true;this.model.interrupt?.();}
  async tool(cmd,args={}) {
    const files=await this.workspace.files();
    switch(cmd) {
      case 'inventory':return {binaryAssets:Object.entries(await this.workspace.assets()).map(([path,a])=>({path,bytes:a.bytes.length,type:a.type})),files:Object.entries(files).map(([path,source])=>({path,characters:source.length})),capabilities:await this.computer.store.list(),executionContracts:await this.contracts()};
      case 'inspect':return this.computer.inspect(Object.fromEntries((args.paths||Object.keys(files).filter(p=>/\.(?:m?js|cjs)$/.test(p))).map(path=>{if(!Object.hasOwn(files,path))throw Error('File not found: '+path);return [path,files[path]];})));
      case 'read_file':{
        if(!Object.hasOwn(files,args.path))throw Error('File not found: '+args.path);
        const text=files[args.path],start=args.start??0,end=args.end??text.length;
        if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>text.length)throw Error('Invalid source range');
        if(end-start>16000)throw Error('Source is preserved in full; request explicit start/end ranges of at most 16000 characters to fit the small model context. Total characters: '+text.length);
        return {path:args.path,start,end,total:text.length,complete:start===0&&end===text.length,source:text.slice(start,end)};
      }
      case 'write_file':await this.workspace.write(args.path,args.source);return {written:args.path,characters:args.source.length,previousVersionsPreserved:true};
      case 'acquire':case 'construct':{
        const artifact=await this.computer[cmd]({...args,files});
        return {name:artifact.name,digest:artifact.digest,parents:artifact.parents,evidence:artifact.evidence};
      }
      case 'execute':{
        const artifact=await this.computer.store.get(args.name);
        try{return await this.computer.run(args.name,invocationArgs(args,await this.contracts()));}
        catch(error){throw Error(error.message+'; verified argument example: '+JSON.stringify(artifact.cases[0].args||artifact.cases[0].invocation?.args||[]));}
      }
      case 'verify':return this.computer.reverify(args.name);
      case 'finish':{
        const published=this.runState?.events.filter(e=>e.ok&&['acquire','construct'].includes(e.cmd)).map(e=>e.result.name)||[];
        if(this.runState?.events.some(e=>e.ok&&e.cmd==='write_file')&&!published.length)throw Error('Source was written but no deliverable has passed verification yet');
        if(published.some(name=>!(args.capabilities||[]).includes(name)))throw Error('Finish must include the newly published capabilities for independent replay');
        const evidence=[];
        for(const name of args.capabilities||[])evidence.push({name,results:await this.computer.reverify(name)});
        return {finished:true,message:String(args.message||''),evidence};
      }
      default:throw Error('Unknown command: '+cmd);
    }
  }
  async run(goal,{limit=24}={}) {
    this.stopped=false;
    const run={id:crypto.randomUUID(),goal,events:[],status:'running'};
    this.runState=run;
    const past=await this.workspace.history();
    let context={goal,inventory:await this.tool('inventory'),priorRunCount:past.length,priorRuns:past.slice(-20).map(r=>({goal:r.goal,status:r.status,artifacts:r.events?.filter(e=>e.ok&&['acquire','construct'].includes(e.cmd)).map(e=>e.result.name)}))};
    for(let step=0;step<limit&&!this.stopped;step++) {
      let command;
      try {
        command=await this.model.next([{role:'system',content:SYSTEM},{role:'user',content:JSON.stringify({...context,recentEvents:run.events.slice(-5).map(contextEvent),klein:await this.hat?.context?.(run)})}]);
        if(this.stopped)break;
        if(!command||!COMMANDS.includes(command.cmd)||!command.args||typeof command.args!=='object')throw Error('Model must emit a valid command and argument object');
        const result=await (this.hat?.execute ? this.hat.execute(command.cmd,command.args) : this.tool(command.cmd,command.args));
        const event={step,cmd:command.cmd,args:command.args,ok:true,result};run.events.push(event);this.onEvent(event);
        await this.hat?.observe?.(event);
        if(command.cmd==='finish'){run.status='finished';break;}
      } catch(error) {
        const event={step,cmd:command?.cmd||'inference',args:command?.args||{},ok:false,error:String(error.message||error)};
        run.events.push(event);this.onEvent(event);
        if(!command&&run.events.filter(e=>e.cmd==='inference'&&!e.ok).length>=3){run.status='model-error';break;}
      }
      await this.workspace.saveRun(run);
    }
    if(run.status==='running')run.status=this.stopped?'stopped':'step-limit';
    await this.workspace.saveRun(run);
    return run;
  }
}
export class WebLLMModel {
  constructor(engine,{maxTokens=2048}={}){this.engine=engine;this.maxTokens=maxTokens;}
  setContracts(provider){this.contractProvider=provider;}
  async next(messages) {
    const contracts=await this.contractProvider?.();
    const schema=contracts?commandSchema(contracts):COMMAND_SCHEMA;
    const stream=await this.engine.chat.completions.create({messages,temperature:0,max_tokens:this.maxTokens,stream:true,response_format:{type:'json_object',schema:JSON.stringify(schema)}});
    let content='',command=null;
    for await(const chunk of stream){
      content+=chunk.choices?.[0]?.delta?.content||'';
      if(!command&&content.trimEnd().endsWith('}')){
        try{const parsed=JSON.parse(content);if(parsed&&COMMANDS.includes(parsed.cmd)&&parsed.args&&typeof parsed.args==='object'){command=parsed;this.engine.interruptGenerate();}}catch(error){if(!(error instanceof SyntaxError))throw error;}
      }
    }
    if(!command)throw Error('Local model did not complete a valid command: '+content);
    return command;
  }
  interrupt(){this.engine.interruptGenerate();}
}
