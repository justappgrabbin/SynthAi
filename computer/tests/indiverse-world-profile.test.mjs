import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, MemoryPersistence, StateStore } from '../core/kernel.mjs';
import { IndiVerseRuntime } from '../worlds/indiverse.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

test('INDIVERSE PROFILE: same canonical control can become a radically different user-world object', async () => {
  const state=new StateStore({bus:new EventBus(),persistence:new MemoryPersistence(),namespace:'bubblegum-profile'});
  await state.restore();
  const indiverse=new IndiVerseRuntime({state});
  await indiverse.registerCanonicalObject({
    id:'button:send',
    kind:'control-plinth',
    function:'activate',
    affordances:[{id:'activate',nativeAction:'click'}],
    presentation:{label:'Send',symbol:'control'}
  });

  await indiverse.createWorld('bubble-owner',{
    id:'indiverse:bubble',
    name:'Bubblegum Unicorn World',
    grammar:{
      environment:{
        skyTop:'#ff9ee8',
        skyBottom:'#ffd6f6',
        ground:'#ffb3d9',
        horizon:'#caa7ff',
        path:'#fff0fa'
      },
      layout:{topology:'candy-village'},
      colors:{'control-plinth':'#ff5fb7'},
      materials:{'control-plinth':'bubblegum'},
      archetypes:{
        'control-plinth':{form:'gumdrop',accent:'#fff1a8',interactionFantasy:'squish-to-activate'}
      },
      effects:{
        'control-plinth':{glowColor:'#ffffff',sparkles:true}
      },
      embodiment:{
        visitor:{species:'unicorn-person'}
      },
      customWorldPhysics:{
        footsteps:'bouncy',
        gravityMood:'soft'
      }
    }
  });

  const rendered=indiverse.renderInWorld('indiverse:bubble','button:send');
  const profile=indiverse.worldProfile('indiverse:bubble');

  assert.equal(rendered.canonical.function,'activate');
  assert.equal(rendered.expression.material,'bubblegum');
  assert.equal(rendered.expression.archetype.form,'gumdrop');
  assert.equal(rendered.expression.color,'#ff5fb7');
  assert.equal(profile.environment.skyTop,'#ff9ee8');
  assert.equal(profile.layout.topology,'candy-village');
  assert.equal(profile.grammar.customWorldPhysics.footsteps,'bouncy');
});

test('INDIVERSE PROFILE: active world is applied to recognized phone-interface bricks', async () => {
  const runtime=await new NativeSeedRuntime({persistence:new MemoryPersistence(),namespace:'active-bubble-world'}).boot();
  const host={
    async listApplications(){return [{packageName:'com.example.notes',label:'Notes',category:'productivity',launchable:true}];},
    async launchApplication(packageName){return {ok:true,packageName};}
  };
  await runtime.bindPhoneHost(host);
  await runtime.createIndiVerse('bubble-owner',{
    id:'indiverse:bubble',
    name:'Bubblegum Unicorn World',
    grammar:{
      environment:{skyTop:'#ff9ee8',skyBottom:'#ffd6f6'},
      archetypes:{'control-plinth':{form:'gumdrop',accent:'#fff1a8'}},
      colors:{'control-plinth':'#ff5fb7'},
      materials:{'control-plinth':'bubblegum'}
    }
  });
  await runtime.activateIndiVerse('indiverse:bubble');

  const surface=await runtime.phoneRequest('interface.observe',{
    snapshot:{
      packageName:'com.example.notes',
      windowId:2,
      title:'Notes',
      root:{path:'0',className:'android.widget.Button',text:'Save',clickable:true}
    }
  });

  assert.equal(surface.worldId,'indiverse:bubble');
  assert.equal(surface.worldProfile.name,'Bubblegum Unicorn World');
  assert.equal(surface.bricks[0].expression.archetype.form,'gumdrop');
  assert.equal(surface.bricks[0].expression.material,'bubblegum');
  assert.equal(surface.bricks[0].binding.nativeActions.includes('click'),true);
});


test('INDIVERSE PROFILE: mesh can mutate and activate a user world without changing canonical function', async () => {
  const runtime=await new NativeSeedRuntime({persistence:new MemoryPersistence(),namespace:'mesh-world-style'}).boot();

  const created=await runtime.meshKernel.request('system:indiverse',{
    operation:'create',
    payload:{
      ownerId:'owner',
      options:{
        id:'indiverse:owner',
        name:'Starter World',
        grammar:{archetypes:{'door':{form:'stone-arch'}}}
      }
    }
  },{sourceId:'synthia'});
  assert.equal(created.delivered,true);

  const updated=await runtime.meshKernel.request('system:indiverse',{
    operation:'grammar.update',
    payload:{
      worldId:'indiverse:owner',
      patch:{
        environment:{skyTop:'#ffeeff'},
        archetypes:{'door':{form:'cotton-candy-arch'}},
        customLore:{weather:'sprinkles'}
      }
    }
  },{sourceId:'synthia'});
  assert.equal(updated.delivered,true);

  const activated=await runtime.meshKernel.request('system:indiverse',{
    operation:'activate',
    payload:{worldId:'indiverse:owner'}
  },{sourceId:'synthia'});
  assert.equal(activated.delivered,true);
  assert.equal(activated.result.profile.environment.skyTop,'#ffeeff');

  const profile=await runtime.meshKernel.request('system:indiverse',{
    operation:'profile',
    payload:{}
  },{sourceId:'synthia'});
  assert.equal(profile.result.profile.grammar.customLore.weather,'sprinkles');
  assert.equal(profile.result.profile.grammar.archetypes.door.form,'cotton-candy-arch');
});
