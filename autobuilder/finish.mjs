import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root=process.cwd();
const out=path.join(root,'dist','product-index');
const run=(cmd,args,opts={})=>new Promise((resolve)=>{
  const p=spawn(cmd,args,{cwd:opts.cwd||root,stdio:'inherit',shell:false,env:process.env});
  p.on('close',code=>resolve(code===0));
  p.on('error',()=>resolve(false));
});
const exists=async p=>!!(await fs.stat(p).catch(()=>null));
const readJson=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const manifest=await readJson(path.join(root,'autobuilder','manifest.json'));
await fs.mkdir(out,{recursive:true});

const candidates=[
  {id:'computer',dir:root,test:['npm',['test']],web:['npm',['run','build:computer']],apk:['npm',['run','android:debug']]},
  {id:'resonance-network',dir:path.join(root,'ResonanceNetwork')},
  {id:'agentic-reality',dir:path.join(root,'agentic_reality')},
  {id:'stellar-proximology-science-lab',dir:path.join(root,'Stellarproximology-lab')},
  {id:'foundry-paper',dir:path.join(root,'paper')}
];
const report={schema:manifest.schema,startedAt:new Date().toISOString(),products:[],rules:manifest.rules};
for(const c of candidates){
  const present=await exists(c.dir);
  const r={id:c.id,present,status:present?'discovered':'external-source-needed',tests:[],artifacts:[]};
  if(present&&c.test){const ok=await run(...c.test,{cwd:c.dir});r.tests.push({name:'native-test',ok});}
  if(present&&c.web){const ok=await run(...c.web,{cwd:c.dir});r.artifacts.push({type:'web',ok});}
  if(present&&c.apk){const ok=await run(...c.apk,{cwd:c.dir});r.artifacts.push({type:'apk',ok,path:'android/app/build/outputs/apk/debug/app-debug.apk'});}
  report.products.push(r);
}
report.finishedAt=new Date().toISOString();
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
const cards=report.products.map(p=>`<article><h2>${p.id}</h2><p>${p.status}</p><pre>${JSON.stringify(p,null,2)}</pre></article>`).join('');
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta name="viewport" content="width=device-width"><title>SynthAI Product Foundry</title><style>body{font:16px system-ui;background:#0c0714;color:#eee;margin:auto;max-width:1100px;padding:24px}h1{color:#c9a7ff}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}article{background:#171022;border:1px solid #493269;border-radius:18px;padding:16px}pre{white-space:pre-wrap;font-size:12px}</style><h1>SynthAI Product Foundry</h1><p>Autonomous additive build report. Origins preserved.</p><main>${cards}</main>`);
console.log(JSON.stringify(report,null,2));
