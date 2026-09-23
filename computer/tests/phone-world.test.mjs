import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

function fakePhoneHost(){
  const launches=[];
  return {
    id:'android-native-host',
    launches,
    async listApplications(){
      return [
        {packageName:'com.openai.chatgpt',label:'ChatGPT',category:'communication',launchable:true},
        {packageName:'com.example.pixart',label:'PixArt',category:'creative',launchable:true},
        {packageName:'com.example.notes',label:'Notes',category:'productivity',launchable:true},
      ];
    },
    async listDocuments(){return [{id:'doc-1',name:'Project Notes',mimeType:'text/plain',uri:'content://docs/1'}];},
    async listContacts(){return [{id:'person-1',name:'Joe',lookupKey:'lookup-1'}];},
    async listSettings(){return [{id:'theme',name:'Appearance',category:'display',valueType:'enum'}];},
    async launchApplication(packageName,context){
      launches.push({packageName,context});
      return {ok:true,packageName};
    },
  };
}

async function rig(namespace){
  const runtime=await new NativeSeedRuntime({persistence:new MemoryPersistence(),namespace}).boot();
  const observed=[];
  await runtime.meshKernel.registerParticipant('synthia:world-port',{
    kind:'synthia-organ',residency:'active',capabilities:['world.port.observe']
  });
  runtime.meshKernel.bindHandler('synthia:world-port',async envelope=>{
    if(envelope.operation!=='observe') throw new Error('unexpected operation');
    observed.push(envelope.payload.event);
    return {accepted:true};
  });
  return {runtime,observed};
}

test('PHONE WORLD: installed apps become canonical mesh-backed places',async()=>{
  const {runtime}=await rig('phone-world-apps');
  const host=fakePhoneHost();
  const snapshot=await runtime.bindPhoneHost(host);

  assert.equal(snapshot.apps.length,3);
  assert.equal(runtime.meshKernel.participant('phone:world').residency,'active');

  const chat=runtime.indiverse.canonicalObject('app:com.openai.chatgpt');
  const art=runtime.indiverse.canonicalObject('app:com.example.pixart');
  const notes=runtime.indiverse.canonicalObject('app:com.example.notes');

  assert.equal(chat.kind,'conversation-house');
  assert.equal(chat.function,'conversation');
  assert.equal(art.kind,'art-studio');
  assert.equal(notes.kind,'workshop-place');
  assert.equal(notes.metadata.resolvedCategory,'INTERFACE');
  assert.equal(notes.presentation.glyph,'◯');
  assert.ok(runtime.meshKernel.relationshipsFor('phone:app:com.openai.chatgpt').some(e=>e.type==='place-in'&&e.to==='phone:world'));
});

test('PHONE WORLD: opening an app is world travel observed by Synthia',async()=>{
  const {runtime,observed}=await rig('phone-world-launch');
  const host=fakePhoneHost();
  await runtime.bindPhoneHost(host);

  const result=await runtime.phoneRequest('app.launch',{
    packageName:'com.openai.chatgpt',
    residentId:'synthia',
    context:{reason:'conversation'}
  });

  assert.equal(result.accepted,true);
  assert.equal(host.launches.length,1);
  assert.equal(host.launches[0].packageName,'com.openai.chatgpt');
  assert.equal(observed.length,1);
  assert.equal(observed[0].type,'phone:app-entered');
  assert.equal(observed[0].payload.experienceId,'chat-space');
});

test('PHONE WORLD: a new ChatGPT conversation becomes a door inside the same canonical app place',async()=>{
  const {runtime,observed}=await rig('phone-world-route');
  await runtime.bindPhoneHost(fakePhoneHost());

  const route=await runtime.phoneRequest('route.enter',{
    packageName:'com.openai.chatgpt',
    routeType:'new-conversation',
    routeId:'thread-42',
    title:'New conversation',
    residentId:'synthia'
  });

  assert.equal(route.object.kind,'door');
  assert.equal(route.object.relations[0].target,'app:com.openai.chatgpt');
  assert.equal(observed.at(-1).type,'phone:route-entered');
});

test('PHONE WORLD: host IndiVerse changes expression without changing app identity',async()=>{
  const {runtime}=await rig('phone-world-indiverse');
  await runtime.bindPhoneHost(fakePhoneHost());
  await runtime.createIndiVerse('adaya',{
    grammar:{
      colors:{'conversation-house':'violet'},
      materials:{'conversation-house':'bubble-glass'},
      orientation:{'conversation-house':{roof:'floor'}},
    }
  });

  const shared=runtime.viewSharedWorldObject('app:com.openai.chatgpt');
  const personal=runtime.viewIndiVerseObject('indiverse:adaya','app:com.openai.chatgpt');

  assert.equal(shared.canonical.id,personal.canonical.id);
  assert.equal(personal.expression.color,'violet');
  assert.equal(personal.expression.material,'bubble-glass');
  assert.equal(personal.expression.orientation.roof,'floor');
});

test('PHONE WORLD: notifications travel through mesh and persist as world events',async()=>{
  const {runtime,observed}=await rig('phone-world-notification');
  await runtime.bindPhoneHost(fakePhoneHost());

  const result=await runtime.phoneRequest('notification.observe',{
    residentId:'synthia',
    notification:{
      id:'notif-1',
      packageName:'com.openai.chatgpt',
      title:'New reply',
      text:'Your conversation has a reply'
    }
  });

  assert.equal(result.delivery.delivered,true);
  assert.equal(observed.at(-1).type,'phone:notification');
  assert.equal(runtime.state.get('phoneWorld.notifications.notif-1').payload.title,'New reply');
});

test('PHONE WORLD: files contacts and settings become private-by-default world objects when native host exposes them',async()=>{
  const {runtime}=await rig('phone-world-device-surfaces');
  const snapshot=await runtime.bindPhoneHost(fakePhoneHost());

  assert.equal(snapshot.documents.length,1);
  assert.equal(snapshot.contacts.length,1);
  assert.equal(snapshot.settings.length,1);

  const document=runtime.indiverse.canonicalObject('document:doc-1');
  const contact=runtime.indiverse.canonicalObject('contact:person-1');
  const setting=runtime.indiverse.canonicalObject('setting:theme');

  assert.equal(document.kind,'document-object');
  assert.equal(document.metadata.resolvedCategory,'KNOWLEDGE');
  assert.equal(document.presentation.glyph,'◉');
  assert.equal(contact.kind,'person-presence');
  assert.equal(contact.metadata.resolvedCategory,'AGENT');
  assert.equal(contact.presentation.glyph,'◆');
  assert.equal(setting.kind,'world-law');
  assert.equal(setting.metadata.resolvedCategory,'ENGINE');
  assert.equal(setting.presentation.glyph,'◈');
  assert.equal(document.metadata.privateByDefault,true);
  assert.equal(contact.metadata.privateByDefault,true);
  assert.equal(setting.metadata.privateByDefault,true);

  assert.equal(runtime.meshKernel.participant('phone:contact:person-1').publicState.private,true);
  assert.ok(runtime.meshKernel.participant('phone:contact:person-1').privateStateRef);
});
