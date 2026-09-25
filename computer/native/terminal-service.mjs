const clone = value => value === undefined ? undefined : structuredClone(value);
const safe = value => String(value ?? 'item').replace(/[^A-Za-z0-9._-]/g,'_');

function fill(value, vars={}) {
  return String(value).replace(/\{([A-Za-z0-9_.-]+)\}/g, (_, key) => {
    if (!(key in vars)) throw new Error('missing action input: ' + key);
    return String(vars[key]);
  });
}
function fillObject(object={}, vars={}) {
  return Object.fromEntries(Object.entries(object).map(([k,v])=>[k,fill(v,vars)]));
}

export class NativeTerminalService {
  constructor({ executor, state, mesh, bus=null, clock=()=>Date.now(), id='system:terminal' }={}) {
    if (typeof executor?.run!=='function') throw new TypeError('NativeTerminalService requires executor.run({argv,cwd,env,timeoutMs})');
    if (!state?.get || !state?.set) throw new TypeError('NativeTerminalService requires StateStore-like persistence');
    if (!mesh?.registerParticipant || !mesh?.bindHandler) throw new TypeError('NativeTerminalService requires relational mesh');
    Object.assign(this,{executor,state,mesh,bus,clock,id});
    this.actions=new Map();
    this.hosts=new Map();
    this.unbind=null;
  }

  async mount(){
    const savedActions=this.state.get('terminal.actions',{});
    for(const [id,action] of Object.entries(savedActions??{})) this.actions.set(id,action);
    const savedHosts=this.state.get('terminal.hosts',{});
    for(const [id,host] of Object.entries(savedHosts??{})) this.hosts.set(id,host);

    if(!this.mesh.participant(this.id)){
      await this.mesh.registerParticipant(this.id,{
        kind:'computer-terminal',residency:'active',
        capabilities:['terminal.run','terminal.action.define','terminal.action.run','terminal.action.manifest','app.host','app.stop','app.hosts.list'],
        publicState:{name:'Computer Terminal',friendlyActions:true,rawTerminal:true},
      });
    } else {
      await this.mesh.setResidency(this.id,'active');
      await this.mesh.publishPresence(this.id,{friendlyActions:true,rawTerminal:true});
    }
    this.unbind?.();
    this.unbind=this.mesh.bindHandler(this.id,envelope=>this.request({operation:envelope.operation,payload:envelope.payload??{}}));
    return this.snapshot();
  }

  async run({argv,cwd=null,env={},timeoutMs=120000,label=null}={}){
    if(!Array.isArray(argv)||!argv.length) throw new Error('terminal.run requires non-empty argv');
    const receipt=await this.executor.run({argv:[...argv].map(String),cwd:cwd?String(cwd):undefined,env:clone(env),timeoutMs});
    const record={
      id:'terminal-'+this.clock()+'-'+Math.random().toString(36).slice(2,7),
      label:label??argv[0],argv:[...argv].map(String),cwd:cwd??null,
      exitCode:Number(receipt?.exitCode??0),ok:receipt?.ok!==false&&Number(receipt?.exitCode??0)===0,
      stdout:receipt?.stdout??'',stderr:receipt?.stderr??'',at:this.clock(),
    };
    await this.state.set('terminal.history.'+safe(record.id),record,{source:'terminal'});
    this.bus?.emit('terminal:complete',clone(record));
    return record;
  }

  async defineAction(action={}){
    if(!action.id||!action.label) throw new Error('terminal action requires id and label');
    if(!['run','host'].includes(String(action.kind??'run'))) throw new Error('terminal action kind must be run or host');
    if(!Array.isArray(action.argv)||!action.argv.length) throw new Error('terminal action requires argv');
    const record={
      id:String(action.id),label:String(action.label),description:String(action.description??''),
      kind:String(action.kind??'run'),argv:clone(action.argv),cwd:action.cwd??null,env:clone(action.env??{}),
      inputKeys:[...(action.inputKeys??[])].map(String),port:action.port??null,url:action.url??null,
      createdAt:this.clock(),
    };
    this.actions.set(record.id,record);
    await this.#persistActions();
    return clone(record);
  }

  async runAction(id,input={}){
    const action=this.actions.get(String(id));
    if(!action) throw new Error('unknown terminal action: '+id);
    const vars={...clone(input),id:action.id};
    const spec={
      argv:action.argv.map(arg=>fill(arg,vars)),
      cwd:action.cwd?fill(action.cwd,vars):undefined,
      env:fillObject(action.env,vars),
      label:action.label,
    };
    if(action.kind==='host') return this.hostApp({...spec,id:action.id,label:action.label,port:input.port??action.port,url:input.url??action.url});
    return this.run(spec);
  }

  async hostApp({id,label=null,argv,cwd=null,env={},port=null,url=null}={}){
    if(typeof this.executor?.start!=='function') throw new Error('terminal host executor does not support persistent processes');
    if(!id||!Array.isArray(argv)||!argv.length) throw new Error('app.host requires id and argv');
    const existing=this.hosts.get(String(id));
    if(existing?.pid && typeof this.executor.isRunning==='function' && await this.executor.isRunning(existing.pid)) {
      return {...clone(existing),reused:true};
    }
    const started=await this.executor.start({argv:[...argv].map(String),cwd:cwd?String(cwd):undefined,env:clone(env),label:label??id});
    const numericPort=port==null?null:Number(port);
    const record={
      id:String(id),label:String(label??id),pid:started.pid??null,
      argv:[...argv].map(String),cwd:cwd??null,port:numericPort,
      url:url??(numericPort?'http://127.0.0.1:'+numericPort:null),
      startedAt:this.clock(),status:'active',
    };
    this.hosts.set(record.id,record);
    await this.#persistHosts();
    const participantId='hosted-app:'+safe(record.id);
    if(!this.mesh.participant(participantId)){
      await this.mesh.registerParticipant(participantId,{
        kind:'hosted-application',residency:'active',
        capabilities:['app.open','app.stop'],
        publicState:{label:record.label,url:record.url,port:record.port},
      });
      await this.mesh.connect(participantId,this.id,{type:'hosted-by'});
    }else{
      await this.mesh.setResidency(participantId,'active');
      await this.mesh.publishPresence(participantId,{label:record.label,url:record.url,port:record.port});
    }
    this.bus?.emit('terminal:app-hosted',clone(record));
    return clone(record);
  }

  async stopApp(id){
    const record=this.hosts.get(String(id));
    if(!record) return {stopped:false,reason:'NOT_HOSTED',id:String(id)};
    if(record.pid&&typeof this.executor?.stop==='function') await this.executor.stop(record.pid);
    record.status='stopped';record.stoppedAt=this.clock();
    await this.#persistHosts();
    const participantId='hosted-app:'+safe(record.id);
    if(this.mesh.participant(participantId)) await this.mesh.setResidency(participantId,'warm');
    return {stopped:true,...clone(record)};
  }

  async installActionManifest(manifest={}){
    if(!manifest.id||!Array.isArray(manifest.actions)) throw new Error('action manifest requires id and actions[]');
    const installed=[];
    for(const action of manifest.actions){
      installed.push(await this.defineAction({...action,id:String(manifest.id)+':'+String(action.id)}));
    }
    return {id:String(manifest.id),label:String(manifest.label??manifest.id),actions:installed};
  }

  async request({operation,payload={}}={}){
    if(operation==='run') return this.run(payload);
    if(operation==='action.define') return this.defineAction(payload.action??payload);
    if(operation==='action.run') return this.runAction(payload.id,payload.input??{});
    if(operation==='action.manifest') return this.installActionManifest(payload.manifest??payload);
    if(operation==='app.host') return this.hostApp(payload);
    if(operation==='app.stop') return this.stopApp(payload.id);
    if(operation==='snapshot') return this.snapshot();
    throw new Error('unsupported terminal operation: '+operation);
  }

  async #persistActions(){
    await this.state.set('terminal.actions',Object.fromEntries([...this.actions.entries()].map(([k,v])=>[k,clone(v)])),{source:'terminal'});
  }
  async #persistHosts(){
    await this.state.set('terminal.hosts',Object.fromEntries([...this.hosts.entries()].map(([k,v])=>[k,clone(v)])),{source:'terminal'});
  }
  snapshot(){
    return {
      id:this.id,
      actions:[...this.actions.values()].map(clone),
      hosts:[...this.hosts.values()].map(clone),
      rawTerminal:true,
      friendlyActions:true,
    };
  }
}

export default NativeTerminalService;
