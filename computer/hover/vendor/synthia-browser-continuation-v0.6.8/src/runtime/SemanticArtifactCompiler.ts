import { VisualPrimitiveCompiler } from './VisualPrimitiveCompiler.js';
import { SceneGraphCompiler } from './SceneGraphCompiler.js';
import type { ArtifactFile, ArtifactTarget, ExpressionGraph } from './foundations';

interface HarvestedNodeOutput {
  nodeId: string;
  toolIds: string[];
  channelIds: string[];
  capabilities: string[];
  output: any;
}

export interface SemanticBehaviorSpec {
  schemaVersion: 1;
  intent: string;
  artifactKind: string;
  actions: string[];
  inputs: string[];
  persistence: { required: boolean; scope: 'local' | 'none' };
  evidence: { semanticTools: string[]; candidateCount: number };
  confidence: number;
  visual?: any;
}

/** Deterministic behavior compiler. It only emits behavior it can ground in
 * semantic tool outputs; unknown requests retain the generic materializer. */
export class SemanticArtifactCompiler {
  private visualCompiler = new VisualPrimitiveCompiler();
  compile(_graph: ExpressionGraph, target: ArtifactTarget, outputs: HarvestedNodeOutput[]): ArtifactFile[] {
    const spec = this.buildSpec(outputs);
    if (!spec) return [];
    const files: ArtifactFile[] = [{ path: 'synthia/semantic-spec.json', type: 'json', content: JSON.stringify(spec, null, 2) }];
    if ((spec as any).visual) files.push(...this.visualCompiler.compile((spec as any).visual));
    if ((spec as any).visual) return files;
    if (!spec.actions.includes('greet') || !spec.inputs.includes('name')) return files;
    if (target === 'CLI') files.push(...this.greetingCli(spec));
    if (target === 'WEB_APP' || target === 'ANDROID_APP') files.push(...this.greetingWeb(spec));
    return files;
  }

  buildSpec(outputs: HarvestedNodeOutput[]): SemanticBehaviorSpec | null {
    const candidates: Array<{ text: string; priority: number }> = [];
    const semanticTools = new Set<string>();
    for (const entry of outputs) {
      const output = entry.output;
      for (const id of entry.toolIds || []) if (['autoling','diseminer','computational-grammar-coder'].includes(id)) semanticTools.add(id);
      if (entry.toolIds?.includes('diseminer') && Array.isArray(output?.claims)) {
        for (const claim of output.claims) if (typeof claim?.text === 'string') candidates.push({ text: claim.text, priority: 5 });
      }
      if (entry.toolIds?.includes('computational-grammar-coder') && typeof output?.sentence === 'string') candidates.push({ text: output.sentence, priority: 4 });
      if (entry.toolIds?.includes('autoling') && Array.isArray(output?.pipeline?.grammar?.[0]?.rhs)) candidates.push({ text: output.pipeline.grammar[0].rhs.join(' '), priority: 3 });
      if (typeof output?.signal?.intent === 'string') candidates.push({ text: output.signal.intent, priority: 1 });
    }
    if (!candidates.length) return null;
    candidates.sort((a,b)=>b.priority-a.priority || b.text.length-a.text.length);
    const intent=candidates[0].text.trim(), lower=intent.toLowerCase(), actions:string[]=[], inputs:string[]=[];
    if (/\b(greet|greets|greeting|hello|welcome)\b/.test(lower)) actions.push('greet');
    if (/\b(remember|remembers|store|stores|save|saves|persist|persists|retain|retains)\b/.test(lower)) actions.push('remember');
    if (/\bname\b/.test(lower)) inputs.push('name');
    const visual=this.visualCompiler.parse(intent);
    if (visual?.medium==='image') actions.push('render-image');
    if (visual?.medium==='video') actions.push('render-video');
    const artifactKind=/\b(cli|command[- ]line)\b/.test(lower)?'cli':/\b(web ?app|website)\b/.test(lower)?'web-app':/\b(app|application)\b/.test(lower)?'app':/\btool\b/.test(lower)?'tool':'artifact';
    return { schemaVersion:1, intent, artifactKind, actions, inputs, visual, persistence:{required:actions.includes('remember'),scope:actions.includes('remember')?'local':'none'}, evidence:{semanticTools:[...semanticTools].sort(),candidateCount:candidates.length}, confidence:Math.min(1,0.4+semanticTools.size*0.1+(actions.length?0.1:0)+(inputs.length?0.1:0)) };
  }

  private greetingCli(spec: SemanticBehaviorSpec): ArtifactFile[] {
    const remember=spec.persistence.required;
    const source=`#!/usr/bin/env node\nimport fs from 'node:fs';\nimport path from 'node:path';\n\n// Deterministically compiled by Synthia from semantic-spec.json.\nconst remember=${remember?'true':'false'};\nconst memoryPath=process.env.SYNTHIA_MEMORY_FILE || path.join(process.cwd(), '.synthia-greeting-memory.json');\nfunction freshMemory(){ return { sequence:0, lastName:null, lastGreeting:null, history:[] }; }\nfunction loadMemory(){ if(!remember || !fs.existsSync(memoryPath)) return freshMemory(); try { return { ...freshMemory(), ...JSON.parse(fs.readFileSync(memoryPath,'utf8')) }; } catch { return freshMemory(); } }\nfunction saveMemory(memory){ if(!remember)return; fs.mkdirSync(path.dirname(memoryPath),{recursive:true}); const tmp=memoryPath+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(memory,null,2)); fs.renameSync(tmp,memoryPath); }\nconst args=process.argv.slice(2), memory=loadMemory();\nif(args.includes('--history')){process.stdout.write(JSON.stringify(memory.history,null,2)+'\\n');process.exit(0);}\nconst suppliedName=args.filter(arg=>!arg.startsWith('--')).join(' ').trim(); const name=suppliedName||memory.lastName;\nif(!name){process.stderr.write('Usage: node cli.mjs <name> [--history]\\n');process.exit(1);}\nconst greeting=\`Hello, \${name}!\`;\nif(remember){const sequence=Number(memory.sequence||0)+1;memory.sequence=sequence;memory.lastName=name;memory.lastGreeting=greeting;memory.history=[...(Array.isArray(memory.history)?memory.history:[]),{sequence,name,greeting}].slice(-100);saveMemory(memory);}\nprocess.stdout.write(greeting+'\\n');\n`;
    const test=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport os from 'node:os';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nimport { spawnSync } from 'node:child_process';\nconst here=path.dirname(fileURLToPath(import.meta.url));const cli=path.resolve(here,'..','cli.mjs');\ntest('greets by name and remembers across invocations',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-greeting-'));const memory=path.join(dir,'memory.json');const env={...process.env,SYNTHIA_MEMORY_FILE:memory};const first=spawnSync(process.execPath,[cli,'Ada'],{encoding:'utf8',env});assert.equal(first.status,0,first.stderr);assert.equal(first.stdout.trim(),'Hello, Ada!');const second=spawnSync(process.execPath,[cli],{encoding:'utf8',env});assert.equal(second.status,0,second.stderr);assert.equal(second.stdout.trim(),'Hello, Ada!');const saved=JSON.parse(fs.readFileSync(memory,'utf8'));assert.equal(saved.lastName,'Ada');assert.equal(saved.lastGreeting,'Hello, Ada!');assert.equal(saved.history.length,2);});\n`;
    return [{path:'cli.mjs',type:'javascript',content:source},{path:'tests/semantic-cli.test.mjs',type:'javascript',content:test}];
  }

  private greetingWeb(spec: SemanticBehaviorSpec): ArtifactFile[] {
    const remember=spec.persistence.required;
    const html='<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Greeting Tool</title></head>\n<body><main><h1>Greeting Tool</h1><form id="form"><label>Name <input id="name" name="name" autocomplete="name" required></label><button>Greet</button></form><p id="greeting" aria-live="polite"></p><pre id="history"></pre></main><script src="app.js"><\\/script></body></html>';
    const js=`const remember=${remember?'true':'false'};\nconst key='synthia.greeting.memory.v1';\nconst fresh=()=>({sequence:0,lastName:null,lastGreeting:null,history:[]});\nconst load=()=>{if(!remember)return fresh();try{return{...fresh(),...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return fresh()}};\nconst save=m=>{if(remember)localStorage.setItem(key,JSON.stringify(m))};\nconst form=document.getElementById('form'),input=document.getElementById('name'),output=document.getElementById('greeting'),history=document.getElementById('history');let memory=load();if(memory.lastName)input.value=memory.lastName;const render=()=>{history.textContent=remember?JSON.stringify(memory.history,null,2):''};render();form.addEventListener('submit',event=>{event.preventDefault();const name=input.value.trim();if(!name)return;const greeting=\`Hello, \${name}!\`;output.textContent=greeting;if(remember){const sequence=Number(memory.sequence||0)+1;memory={...memory,sequence,lastName:name,lastGreeting:greeting,history:[...(memory.history||[]),{sequence,name,greeting}].slice(-100)};save(memory);render();}});\n`;
    return [{path:'index.html',type:'html',content:html},{path:'app.js',type:'javascript',content:js}];
  }
}
export default SemanticArtifactCompiler;
