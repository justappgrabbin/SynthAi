import test from 'node:test';
import assert from 'node:assert/strict';
import { DeviceWorldResolver } from '../native/device-world-resolver.mjs';

test('DEVICE WORLD RESOLVER: Legacy categories deterministically resolve device surfaces', () => {
  const resolver = new DeviceWorldResolver();

  const app = resolver.resolve({ sourceType:'application', packageName:'com.example.notes', label:'Notes', category:'productivity' });
  const file = resolver.resolve({ sourceType:'document', id:'doc-1', name:'Project Notes', mimeType:'text/plain' });
  const person = resolver.resolve({ sourceType:'contact', id:'person-1', name:'Joe' });
  const setting = resolver.resolve({ sourceType:'setting', id:'theme', name:'Appearance', category:'display' });
  const process = resolver.resolve({ sourceType:'process', id:'sync', name:'Sync Manager' });

  assert.equal(app.category, 'INTERFACE');
  assert.equal(app.glyph, '◯');
  assert.equal(app.world.kind, 'workshop-place');

  assert.equal(file.category, 'KNOWLEDGE');
  assert.equal(file.glyph, '◉');
  assert.equal(file.world.kind, 'document-object');
  assert.equal(file.privacy.privateByDefault, true);

  assert.equal(person.category, 'AGENT');
  assert.equal(person.glyph, '◆');
  assert.equal(person.world.kind, 'person-presence');

  assert.equal(setting.category, 'ENGINE');
  assert.equal(setting.glyph, '◈');
  assert.equal(setting.world.kind, 'world-law');

  assert.equal(process.category, 'ENGINE');
  assert.equal(process.world.kind, 'machine-process');
});

test('DEVICE WORLD RESOLVER: same device input produces the same canonical resolution', () => {
  const resolver = new DeviceWorldResolver();
  const input = { sourceType:'application', packageName:'com.example.maps', label:'Maps', category:'navigation' };
  assert.deepEqual(resolver.resolve(input), resolver.resolve(input));
});
