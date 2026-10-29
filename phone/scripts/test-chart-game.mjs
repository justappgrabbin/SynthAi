import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from '../web/node_modules/typescript/lib/typescript.js';
const compile = file => ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const types = 'data:text/javascript;base64,'+Buffer.from(compile('web/src/cultivation/types.ts')).toString('base64');
const code = compile('web/src/cultivation/storage.ts').replaceAll('"./types"',JSON.stringify(types));
const {MemStorage} = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const anchor = {configuration_id:'same-birth',tropical_sun:{longitude:125.1234,gate:33,line:3,color:1,tone:2,base:4}};
async function play(a){const storage=new MemStorage(a);const game=await storage.createGame('Test');const fragments=[];for(let i=0;i<13;i++)fragments.push((await storage.collectDatababy(game.playerId,'identity')).datababy.fragment);const result=await storage.fuseGeneGnome(game.playerId);return {fragments,archetype:result.geneGnome.archetype};}
assert.deepEqual(await play(anchor),await play(anchor),'Same birth configuration and choices must reproduce game content');
const changed={...anchor,tropical_sun:{...anchor.tropical_sun,longitude:225.1234}};
assert.notDeepEqual((await play(anchor)).fragments,(await play(changed)).fragments,'Tropical Sun must influence game content');
console.log('PASS: chart-derived content is reproducible and responds to the tropical Sun');
