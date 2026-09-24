import test from 'node:test';
import assert from 'node:assert/strict';
import { InterfaceBrickRecognizer } from '../native/interface-brick-recognizer.mjs';

test('INTERFACE BRICKS: common Android controls become semantic world objects with native bindings', () => {
  const recognizer = new InterfaceBrickRecognizer();
  const result = recognizer.recognize({
    packageName:'com.example.shop',
    windowId:7,
    title:'Shop',
    root:{
      path:'0', className:'android.widget.ScrollView', scrollable:true, children:[
        { path:'0.0', className:'android.widget.TextView', text:'Featured' },
        { path:'0.1', className:'android.widget.EditText', hintText:'Search', editable:true, focusable:true },
        { path:'0.2', className:'android.widget.Button', text:'Buy', clickable:true },
        { path:'0.3', className:'android.widget.Switch', text:'Notifications', checkable:true, clickable:true, checked:true },
        { path:'0.4', className:'android.widget.ImageView', contentDescription:'Product photo' },
      ]
    }
  });

  assert.equal(result.composition.kind,'interface-building');
  assert.equal(result.bricks[0].world.kind,'corridor');

  const input=result.bricks.find(b=>b.role==='input');
  const button=result.bricks.find(b=>b.label==='Buy');
  const toggle=result.bricks.find(b=>b.role==='switch');
  const image=result.bricks.find(b=>b.role==='image');

  assert.equal(input.world.kind,'writing-desk');
  assert.ok(input.affordances.some(a=>a.nativeAction==='set-text'));
  assert.equal(button.world.kind,'control-plinth');
  assert.ok(button.affordances.some(a=>a.nativeAction==='click'));
  assert.equal(toggle.world.kind,'lever');
  assert.equal(toggle.state.checked,true);
  assert.equal(image.world.kind,'mural');
  assert.equal(button.binding.packageName,'com.example.shop');
  assert.equal(button.binding.path,'0.2');
});

test('INTERFACE BRICKS: recognition is deterministic for the same semantic tree', () => {
  const recognizer = new InterfaceBrickRecognizer();
  const tree={packageName:'com.example',windowId:1,root:{path:'0',className:'android.widget.Button',text:'Continue',clickable:true}};
  assert.deepEqual(recognizer.recognize(tree),recognizer.recognize(tree));
});
