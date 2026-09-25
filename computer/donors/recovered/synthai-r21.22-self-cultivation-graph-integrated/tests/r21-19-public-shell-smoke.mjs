import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
for(const forbidden of ['WebRTC integration placeholder','mcpe://play','Minecraft PE demo','All systems nominal','morph-engine.js','Voice message transcribed']) assert.equal(html.includes(forbidden),false,`public shell contains forbidden simulated content: ${forbidden}`);
for(const required of ['id="universeWidget"','id="synthia-orb"','id="aw-acode"','synthia:snapshot','Native Acode bridge']) assert.equal(html.includes(required)||app.includes(required),true,`missing runtime-backed surface: ${required}`);
assert.match(app,/unit\.snapshot\(\)/);
console.log('r21.19 public shell smoke passed');
