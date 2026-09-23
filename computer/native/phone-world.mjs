import { DeviceWorldResolver } from './device-world-resolver.mjs';
const clone = value => value === undefined ? undefined : structuredClone(value);
const safe = value => String(value ?? 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');

export const DEFAULT_APP_EXPERIENCES = Object.freeze([
  {
    id:'chat-space',
    match: app => /chatgpt|openai/i.test(String(app.packageName ?? '') + ' ' + String(app.label ?? '')),
    place:{ kind:'conversation-house', function:'conversation', presentation:{ symbol:'conversation', material:'shared-interface' } },
    routes:{ conversation:'room', 'new-conversation':'door' },
  },
  {
    id:'art-studio',
    match: app => /pixart|image|paint|draw|studio/i.test(String(app.packageName ?? '') + ' ' + String(app.label ?? '')),
    place:{ kind:'art-studio', function:'create-visual', presentation:{ symbol:'art', material:'shared-interface' } },
    routes:{ project:'canvas-room', gallery:'gallery' },
  },
]);

function genericExperience(app){
  return {
    id:'application-place',
    place:{
      kind:'application-place',
      function:app.category ?? 'application',
      presentation:{ symbol:'app', material:'shared-interface' },
    },
    routes:{},
  };
}

export class PhoneWorldBridge {
  constructor({ host, mesh, indiverse, state, bus = null, clock = () => Date.now(), id = 'phone:world', resolver = new DeviceWorldResolver() } = {}) {
    if (!host?.listApplications || !host?.launchApplication) throw new TypeError('PhoneWorldBridge requires native host listApplications() and launchApplication()');
    if (!mesh?.registerParticipant || !mesh?.request) throw new TypeError('PhoneWorldBridge requires relational mesh');
    if (!indiverse?.registerCanonicalObject) throw new TypeError('PhoneWorldBridge requires IndiVerse runtime');
    if (!state?.get || !state?.set) throw new TypeError('PhoneWorldBridge requires StateStore-like persistence');
    Object.assign(this,{host,mesh,indiverse,state,bus,clock,id,resolver});
    this.experiences=[...DEFAULT_APP_EXPERIENCES];
    this.apps=new Map();
    this.documents=new Map();
    this.contacts=new Map();
    this.settings=new Map();
  }

  registerExperience(experience){
    if(!experience?.id || typeof experience.match!=='function' || !experience.place) throw new TypeError('experience requires id, match(app), and place');
    this.experiences.unshift(experience);
    return experience;
  }

  experienceFor(app){
    return this.experiences.find(e=>e.match(app)) ?? genericExperience(app);
  }

  async mount(){
    if(!this.mesh.participant(this.id)){
      await this.mesh.registerParticipant(this.id,{
        kind:'phone-world',residency:'active',
        capabilities:['phone.apps.list','phone.app.launch','phone.notification.observe','phone.route.enter','phone.documents.list','phone.contacts.list','phone.settings.list','phone.snapshot'],
        publicState:{name:'Phone World',runtime:'native-seed'},
      });
    }else await this.mesh.setResidency(this.id,'active');

    this.mesh.bindHandler(this.id,envelope=>this.request({operation:envelope.operation,payload:envelope.payload??{}}));
    await this.syncApplications();
    await this.syncDeviceSurfaces();
    return this.snapshot();
  }

  async syncDeviceSurfaces(){
    await this.#syncOptionalSurface({
      hostMethod:'listDocuments', collection:this.documents, prefix:'phone:document:', objectPrefix:'document:',
      kind:'document-object', functionName:item=>item.kind??item.mimeType??'document',
      relation:'stored-in', presentation:item=>({label:item.label??item.name??'Document',symbol:'document',material:'shared-interface'}),
      sourceType:'document', metadata:item=>({uri:item.uri??null,mimeType:item.mimeType??null,size:item.size??null}),
      privateByDefault:true,
    });
    await this.#syncOptionalSurface({
      hostMethod:'listContacts', collection:this.contacts, prefix:'phone:contact:', objectPrefix:'contact:',
      kind:'person-presence', functionName:()=> 'contact',
      relation:'known-by', presentation:item=>({label:item.label??item.name??'Contact',symbol:'person',material:'shared-interface'}),
      sourceType:'contact', metadata:item=>({lookupKey:item.lookupKey??null}),
      privateByDefault:true,
    });
    await this.#syncOptionalSurface({
      hostMethod:'listSettings', collection:this.settings, prefix:'phone:setting:', objectPrefix:'setting:',
      kind:'world-law', functionName:item=>item.category??'setting',
      relation:'governs', presentation:item=>({label:item.label??item.name??'Setting',symbol:'control',material:'shared-interface'}),
      sourceType:'setting', metadata:item=>({category:item.category??null,valueType:item.valueType??typeof item.value}),
      privateByDefault:true,
    });
    return this.snapshot();
  }

  async #syncOptionalSurface({hostMethod,collection,prefix,objectPrefix,kind,functionName,relation,presentation,metadata,sourceType='unknown',privateByDefault=false}){
    const list=this.host?.[hostMethod];
    if(typeof list!=='function') return {available:false,count:0};
    const items=await list.call(this.host);
    for(const raw of items??[]){
      const key=String(raw.id??raw.uri??raw.lookupKey??raw.key??raw.name??'');
      if(!key) continue;
      const item={...clone(raw),id:key};
      collection.set(key,item);
      const participantId=prefix+safe(key);
      const objectId=objectPrefix+key;
      const resolved=this.resolver.resolve({sourceType,id:key,name:item.name,label:item.label,category:item.category,mimeType:item.mimeType,kind:item.kind,metadata:item.metadata});
      if(!this.mesh.participant(participantId)){
        await this.mesh.registerParticipant(participantId,{
          kind,residency:'warm',capabilities:[],
          publicState:privateByDefault?{kind,private:true}:{label:item.label??item.name??key,kind},
          privateStateRef:privateByDefault?`phone-private:${objectId}`:null,
        });
      }
      if(!this.mesh.relationshipsFor(participantId).some(e=>e.type===relation&&e.to===this.id)){
        await this.mesh.connect(participantId,this.id,{type:relation});
      }
      await this.indiverse.registerCanonicalObject({
        id:objectId,kind,function:functionName(item),
        affordances:[],entryPoints:[],
        relations:[{type:'backed-by',target:participantId}],
        presentation:{...presentation(item),glyph:resolved.glyph},
        metadata:{...metadata(item),privateByDefault,resolver:resolved.resolver,resolverVersion:resolved.version,resolvedCategory:resolved.category,resolvedRole:resolved.role,resolutionConfidence:resolved.confidence},
      });
    }
    return {available:true,count:collection.size};
  }

  async syncApplications(){
    const listed=await this.host.listApplications();
    for(const raw of listed??[]){
      const app={
        packageName:String(raw.packageName??raw.id??''),
        label:String(raw.label??raw.name??raw.packageName??'Application'),
        category:raw.category??null,
        iconRef:raw.iconRef??null,
        launchable:raw.launchable!==false,
        metadata:clone(raw.metadata??{}),
      };
      if(!app.packageName) continue;
      const resolved=this.resolver.resolve({sourceType:'application',...app});
      const matched=this.experiences.find(e=>e.match(app));
      const exp=matched ?? {id:'legacy-resolved',place:{kind:resolved.world.kind,function:resolved.world.function,presentation:resolved.world.presentation},routes:{}};
      const participantId='phone:app:'+safe(app.packageName);
      const objectId='app:'+app.packageName;
      app.participantId=participantId;app.objectId=objectId;app.experienceId=exp.id;
      this.apps.set(app.packageName,app);

      if(!this.mesh.participant(participantId)){
        await this.mesh.registerParticipant(participantId,{
          kind:'application-place',residency:'warm',
          capabilities:['app.launch','app.route'],
          publicState:{label:app.label,packageName:app.packageName,experienceId:exp.id},
        });
      } else {
        await this.mesh.publishPresence(participantId,{label:app.label,packageName:app.packageName,experienceId:exp.id});
      }
      if(!this.mesh.relationshipsFor(participantId).some(e=>e.type==='place-in'&&e.to===this.id)){
        await this.mesh.connect(participantId,this.id,{type:'place-in'});
      }

      await this.indiverse.registerCanonicalObject({
        id:objectId,
        kind:exp.place.kind,
        function:exp.place.function,
        affordances:[{id:'enter',requires:['app.launch']}],
        entryPoints:[{id:'launch',type:'threshold'}],
        relations:[{type:'backed-by',target:participantId}],
        presentation:{
          label:app.label,
          iconRef:app.iconRef,
          ...clone(exp.place.presentation??{}),
          glyph:resolved.glyph,
        },
        metadata:{packageName:app.packageName,experienceId:exp.id,category:app.category,resolver:resolved.resolver,resolverVersion:resolved.version,resolvedCategory:resolved.category,resolvedRole:resolved.role,resolutionConfidence:resolved.confidence,...clone(app.metadata)},
      });
    }
    const snapshot=this.snapshot();
    await this.state.set('phoneWorld.snapshot',snapshot,{source:'phone-world'});
    this.bus?.emit('phone-world:synced',clone(snapshot));
    return snapshot;
  }

  async launch(packageName,{residentId='synthia',context={}}={}){
    const app=this.apps.get(String(packageName));
    if(!app) throw new Error('unknown phone application: '+packageName);
    if(!app.launchable) return {accepted:false,reason:'NOT_LAUNCHABLE',packageName:app.packageName};

    const result=await this.host.launchApplication(app.packageName,clone(context));
    await this.mesh.setResidency(app.participantId,'active');
    const event={
      id:'phone-launch-'+this.clock(),
      type:'phone:app-entered',
      source:this.id,
      actor:residentId,
      target:app.participantId,
      summary:residentId+' entered '+app.label,
      payload:{packageName:app.packageName,label:app.label,experienceId:app.experienceId,result:clone(result)},
      at:new Date(this.clock()).toISOString(),
    };
    await this.#sendResidentEvent(residentId,event);
    await this.state.set('phoneWorld.activeApp',{packageName:app.packageName,participantId:app.participantId,enteredAt:this.clock()},{source:'phone-world'});
    this.bus?.emit('phone-world:app-entered',clone(event));
    return {accepted:true,app:clone(app),hostResult:clone(result),event};
  }

  async enterRoute(packageName,{routeType='route',routeId=null,title=null,residentId='synthia',metadata={}}={}){
    const app=this.apps.get(String(packageName));
    if(!app) throw new Error('unknown phone application: '+packageName);
    const exp=this.experienceFor(app);
    const routeKind=exp.routes?.[routeType] ?? 'room';
    const id='app-route:'+app.packageName+':'+routeType+':'+(routeId??this.clock());
    const object=await this.indiverse.registerCanonicalObject({
      id,kind:routeKind,function:routeType,
      affordances:[{id:'enter',requires:['app.route']}],
      entryPoints:[{id:'threshold',type:routeKind==='door'?'door':'portal'}],
      relations:[{type:'inside',target:app.objectId}],
      presentation:{label:title??routeType,symbol:routeKind,material:'shared-interface'},
      metadata:{packageName:app.packageName,routeType,routeId,...clone(metadata)},
    });
    const event={
      id:'phone-route-'+this.clock(),type:'phone:route-entered',source:this.id,actor:residentId,
      target:app.participantId,summary:residentId+' entered '+(title??routeType),
      payload:{packageName:app.packageName,route:clone(object),experienceId:app.experienceId},
      at:new Date(this.clock()).toISOString(),
    };
    await this.#sendResidentEvent(residentId,event);
    return {object,event};
  }

  async observeNotification(notification,{residentId='synthia'}={}){
    const resolution=this.resolver.resolve({sourceType:'notification',id:notification?.id,name:notification?.title,packageName:notification?.packageName,category:notification?.category,metadata:notification?.metadata});
    const event={
      id:notification?.id??'notification-'+this.clock(),
      type:'phone:notification',
      source:this.id,
      actor:notification?.packageName?'phone:app:'+safe(notification.packageName):this.id,
      target:residentId,
      summary:notification?.title??notification?.summary??'Notification',
      payload:{
        packageName:notification?.packageName??null,
        title:notification?.title??null,
        text:notification?.text??null,
        category:notification?.category??null,
        metadata:clone(notification?.metadata??{}),
        resolution:{category:resolution.category,glyph:resolution.glyph,role:resolution.role,world:clone(resolution.world)},
      },
      at:notification?.at??new Date(this.clock()).toISOString(),
    };
    const delivery=await this.#sendResidentEvent(residentId,event);
    await this.state.set('phoneWorld.notifications.'+safe(event.id),event,{source:'phone-world'});
    this.bus?.emit('phone-world:notification',clone(event));
    return {event,delivery};
  }

  async #sendResidentEvent(residentId,event){
    const target=this.mesh.participant(residentId+':world-port') ? residentId+':world-port'
      : this.mesh.participant('synthia:world-port') && residentId==='synthia' ? 'synthia:world-port'
      : this.mesh.participant(residentId) ? residentId
      : null;
    if(!target) return {delivered:false,queued:false,reason:'resident-unavailable',event:clone(event)};
    return this.mesh.request(target,{operation:'observe',payload:{event:clone(event)}},{sourceId:this.id});
  }

  async request({operation,payload={}}={}){
    if(operation==='sync') { await this.syncApplications(); await this.syncDeviceSurfaces(); return this.snapshot(); }
    if(operation==='snapshot') return this.snapshot();
    if(operation==='app.launch') return this.launch(payload.packageName,payload);
    if(operation==='route.enter') return this.enterRoute(payload.packageName,payload);
    if(operation==='notification.observe') return this.observeNotification(payload.notification??payload,payload);
    throw new Error('unsupported Phone World operation: '+operation);
  }

  snapshot(){
    return {
      id:this.id,
      apps:[...this.apps.values()].map(clone),
      documents:[...this.documents.values()].map(clone),
      contacts:[...this.contacts.values()].map(item=>({id:item.id,label:item.label??item.name??'Contact'})),
      settings:[...this.settings.values()].map(item=>({id:item.id,label:item.label??item.name??'Setting',category:item.category??null})),
      activeApp:this.state.get('phoneWorld.activeApp',null),
      experienceIds:[...new Set(this.apps.values().map(a=>a.experienceId))],
      authority:'canonical-phone-object-map',
      resolver:{id:this.resolver.id,version:this.resolver.version},
    };
  }
}

export default PhoneWorldBridge;
