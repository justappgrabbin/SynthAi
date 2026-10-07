import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
const source = new URL('../integrations/synthaipro/', import.meta.url);
for (const args of [['ci'], ['test'], ['run','build']]) {
  const result=spawnSync('npm',args,{cwd:source,stdio:'inherit',shell:process.platform==='win32'});
  if(result.status!==0) throw new Error(`SynthAIPro ${args.join(' ')} failed`);
}
const target=new URL('../computer/hover/ui/deploy/',import.meta.url);
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
await cp(new URL('dist/',source),target,{recursive:true});
console.log('SynthAIPro staged in the active Hover UI at /deploy/index.html');
