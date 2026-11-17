import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const page=await browser.newPage();
page.on('console',m=>{if(m.type()==='log')console.log(m.text());});
try{
 await page.goto('http://127.0.0.1:8080/');
 const result=await page.evaluate(async()=>{
  const {CreateMLCEngine,prebuiltAppConfig}=await import('./vendor/webllm.mjs');
  const {openBrowserComputer}=await import('./foundation-browser.mjs');
  const {Workspace,IndexedWorkspaceStorage}=await import('./workspace.mjs');
  const {LocalAgent,WebLLMModel}=await import('./local-agent.mjs');
  const {KleinLocalHat}=await import('./klein-local-hat.mjs');const K=await import('./klein_ato.js');
  const computer=openBrowserComputer(),workspace=new Workspace(new IndexedWorkspaceStorage());
  await computer.acquire({name:'double',description:'Double a number',entry:'double.mjs',files:{'double.mjs':'export const main=x=>x*2;'},cases:[{args:[2],expected:4}],holdouts:[{args:[7],expected:14}]});
  const local=(await(await fetch('./models/local-config.json')).json()).map(r=>({...r,model:new URL(r.model,location.href).href,model_lib:new URL(r.model_lib,location.href).href}));
  const start=performance.now();
  const engine=await CreateMLCEngine('Qwen2.5-0.5B-Instruct-q4f32_1-MLC',{appConfig:{...prebuiltAppConfig,model_list:local},initProgressCallback:p=>{if(p.progress===1)console.log('Local model loaded');}},{context_window_size:4096});
  const model=new WebLLMModel(engine,{maxTokens:96}),hat=new KleinLocalHat(K,workspace);
  const agent=new LocalAgent({computer,workspace,model,hat});
  hat.bind({execute:args=>agent.tool('execute',args)});
  // Real model output chooses the action; this is not a scripted model response.
  const command=await model.next([{role:'system',content:'You operate a JavaScript computer. Return one JSON object with cmd and args. Available command: execute {name,inputs:{arg0:number}}. arg0 is required. Use the numeric value requested by the user.'},{role:'user',content:'Run the saved capability named double with input arg0 equal to 21. Return only the execute command JSON.'}]);
  console.log('Local model command: '+JSON.stringify(command));
  if(command.cmd!=='execute')throw Error('Model did not select the execute command: '+JSON.stringify(command));
  let actual=null,error=null;try{actual=await hat.execute(command.cmd,command.args);}catch(e){error=e.message;}
  await workspace.saveRun({id:crypto.randomUUID(),goal:'Use local Qwen to execute double(21) through Klein',status:error?'failed':'finished',events:[{cmd:command.cmd,args:command.args,ok:!error,result:actual,error}]});
  await engine.unload();
  return {model:'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',command,actual,error,success:actual===42&&!error,kleinInstruction:hat.cpu.trace.at(-1)[0],elapsedMs:Math.round(performance.now()-start),localWeights:true,externalModelCalls:false};
 });
 console.log(JSON.stringify(result,null,2));await writeFile('evidence/local-model-action-receipt.json',JSON.stringify(result,null,2));
 if(result.actual!==42)process.exitCode=1;
}finally{await browser.close();}
