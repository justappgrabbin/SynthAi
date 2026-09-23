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

function observationText(observation = {}) {
  const parts = [
    observation.eventText,
    observation.eventContentDescription,
    observation.screenType,
  ];
  for (const node of observation.ui ?? []) {
    for (const key of ['text','label','contentDescription','hint','role','className']) {
      if (node?.[key]) parts.push(String(node[key]));
    }
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function meaningfulRoute(experience, observation = {}) {
  const text = observationText(observation);
  const eventText = String(observation.eventText ?? '').toLowerCase();
  const eventDescription = String(observation.eventContentDescription ?? '').toLowerCase();
  const eventType = String(observation.eventType ?? '').toLowerCase();
  const clicked = eventType.includes('clicked') || eventType.includes('click');
  const screenType = String(observation.screenType ?? '').toLowerCase();

  if (experience.id === 'chat-space') {
    if (
      screenType === 'new_conversation' ||
      (clicked && /new chat|new conversation/.test(eventText + ' ' + eventDescription))
    ) {
      return {
        routeType: 'new-conversation',
        routeId: observation.routeId ?? observation.metadata?.conversationId ?? 'new-' + (observation.observedAt ?? Date.now()),
        title: observation.metadata?.title ?? 'New conversation',
        significance: 'meaningful',
      };
    }
    if (
      ['conversation','active_conversation'].includes(screenType) ||
      /message chatgpt|ask anything|send message/.test(text)
    ) {
      return {
        routeType: 'conversation',
        routeId: observation.routeId ?? observation.metadata?.conversationId ?? 'active-conversation',
        title: observation.metadata?.title ?? 'Conversation',
        significance: 'meaningful',
      };
    }
  }

  if (experience.id === 'art-studio') {
    if (
      screenType === 'editor' ||
      /brush|layers|effects|edit image|remove background|tools/.test(text)
    ) {
      return {
        routeType: 'project',
        routeId: observation.routeId ?? observation.metadata?.projectId ?? 'active-canvas',
        title: observation.metadata?.title ?? 'Active canvas',
        significance: 'meaningful',
      };
    }
  }

  return null;
}

export class PhoneWorldBridge {
  constructor({ host, mesh, indiverse, state, bus = null, clock = () => Date.now(), id = 'phone:world' } = {}) {
    if (!host?.listApplications || !host?.launchApplication) throw new TypeError('PhoneWorldBridge requires native host listApplications() and launchApplication()');
    if (!mesh?.registerParticipant || !mesh?.request) throw new TypeError('PhoneWorldBridge requires relational mesh');
    if (!indiverse?.registerCanonicalObject) throw new TypeError('PhoneWorldBridge requires IndiVerse runtime');
    if (!state?.get || !state?.set) throw new TypeError('PhoneWorldBridge requires StateStore-like persistence');
    Object.assign(this,{host,mesh,indiverse,state,bus,clock,id});
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
        capabilities:['phone.apps.list','phone.app.launch','phone.app.observe','phone.notification.observe','phone.route.enter','phone.documents.list','phone.contacts.list','phone.settings.list','phone.snapshot'],
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
      metadata:item=>({uri:item.uri??null,mimeType:item.mimeType??null,size:item.size??null}),
      privateByDefault:true,
    });
    await this.#syncOptionalSurface({
      hostMethod:'listContacts', collection:this.contacts, prefix:'phone:contact:', objectPrefix:'contact:',
      kind:'person-presence', functionName:()=> 'contact',
      relation:'known-by', presentation:item=>({label:item.label??item.name??'Contact',symbol:'person',material:'shared-interface'}),
      metadata:item=>({lookupKey:item.lookupKey??null}),
      privateByDefault:true,
    });
    await this.#syncOptionalSurface({
      hostMethod:'listSettings', collection:this.settings, prefix:'phone:setting:', objectPrefix:'setting:',
      kind:'world-law', functionName:item=>item.category??'setting',
      relation:'governs', presentation:item=>({label:item.label??item.name??'Setting',symbol:'control',material:'shared-interface'}),
      metadata:item=>({category:item.category??null,valueType:item.valueType??typeof item.value}),
      privateByDefault:true,
    });
    return this.snapshot();
  }

  async #syncOptionalSurface({hostMethod,collection,prefix,objectPrefix,kind,functionName,relation,presentation,metadata,privateByDefault=false}){
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
        presentation:presentation(item),
        metadata:{...metadata(item),privateByDefault},
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
        activity:raw.activity??raw.metadata?.activity??null,
        launchable:raw.launchable!==false,
        metadata:clone(raw.metadata??{}),
      };
      if(!app.packageName) continue;
      const exp=this.experienceFor(app);
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
        },
        metadata:{packageName:app.packageName,experienceId:exp.id,category:app.category,...clone(app.metadata)},
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

    const result=await this.host.launchApplication(app.packageName,{...clone(context),activity:context?.activity??app.activity??null});
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


  async observeApplication(observation,{residentId='synthia'}={}){
    if(!observation?.packageName) throw new Error('phone app observation requires packageName');
    const packageName=String(observation.packageName);

    if(!this.apps.has(packageName)) await this.syncApplications();
    const app=this.apps.get(packageName);
    if(!app) throw new Error('observed application is not a launchable Phone World place: '+packageName);

    const normalized={
      packageName,
      appLabel:observation.appLabel??app.label,
      activity:observation.activity??app.activity??null,
      eventType:observation.eventType??'application_observation',
      eventText:observation.eventText??null,
      eventContentDescription:observation.eventContentDescription??null,
      screenType:observation.screenType??null,
      observedAt:Number(observation.observedAt??this.clock()),
      source:observation.source??'android-accessibility',
      ui:clone(observation.ui??[]),
      metadata:clone(observation.metadata??{}),
      routeId:observation.routeId??null,
    };

    const exp=this.experienceFor(app);
    const route=meaningfulRoute(exp,normalized);
    const event={
      id:'phone-observation-'+normalized.observedAt+'-'+safe(packageName),
      type:'phone:app-observed',
      source:this.id,
      actor:residentId,
      target:app.participantId,
      summary:residentId+' observed '+app.label,
      payload:{
        packageName,
        experienceId:exp.id,
        significance:route?.significance??'quiet',
        observation:clone(normalized),
      },
      at:new Date(normalized.observedAt).toISOString(),
    };

    await this.state.set('phoneWorld.observations.'+safe(packageName),event,{source:'phone-world'});
    const delivery=await this.#sendResidentEvent(residentId,event);
    this.bus?.emit('phone-world:app-observed',clone(event));

    let routeResult=null;
    if(route){
      const routeKey='phoneWorld.lastRoute.'+safe(packageName);
      const previous=this.state.get(routeKey,null);
      const fingerprint=route.routeType+':'+route.routeId;
      const repeatable=route.routeType==='new-conversation';
      if(repeatable || previous?.fingerprint!==fingerprint){
        routeResult=await this.enterRoute(packageName,{
          routeType:route.routeType,
          routeId:route.routeId,
          title:route.title,
          residentId,
          metadata:{
            observedAt:normalized.observedAt,
            source:normalized.source,
            activity:normalized.activity,
          },
        });
        await this.state.set(routeKey,{fingerprint,at:normalized.observedAt},{source:'phone-world'});
      }
    }

    return {accepted:true,event,delivery,route:routeResult,experienceId:exp.id};
  }

  async observeNotification(notification,{residentId='synthia'}={}){
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
    if(operation==='app.observe') return this.observeApplication(payload.observation??payload,payload);
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
      lastObservedApps:Object.keys(this.state.get('phoneWorld.observations',{})??{}),
      experienceIds:[...new Set(this.apps.values().map(a=>a.experienceId))],
      authority:'canonical-phone-object-map',
    };
  }
}

export default PhoneWorldBridge;
