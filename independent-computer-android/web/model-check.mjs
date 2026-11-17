import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const page=await browser.newPage();
page.on('console',message=>{if(message.type()==='error')console.log('BROWSER',message.text());});
try{
 await page.goto('http://127.0.0.1:8080/');
 const result=await page.evaluate(async()=>{
  const started=performance.now();
  try{
   const {CreateMLCEngine,prebuiltAppConfig}=await import('./vendor/webllm.mjs');
   const local=(await(await fetch('./models/local-config.json')).json()).map(r=>({...r,model:new URL(r.model,location.href).href,model_lib:new URL(r.model_lib,location.href).href}));
   const model='Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
   const engine=await CreateMLCEngine(model,{appConfig:{...prebuiltAppConfig,model_list:local},initProgressCallback:p=>document.getElementById('status').textContent=p.text},{context_window_size:4096});
   const reply=await engine.chat.completions.create({messages:[{role:'system',content:'Reply with JSON only.'},{role:'user',content:'What is 6 multiplied by 7? Return {"answer": number}.'}],temperature:0,max_tokens:40,response_format:{type:'json_object'}});
   const text=reply.choices[0].message.content;
   await engine.unload();
   return {model,inference:text,elapsedMs:Math.round(performance.now()-started),localWeights:true,externalModelCalls:false};
  }catch(error){return {error:error.stack||String(error),elapsedMs:Math.round(performance.now()-started)};}
 });
 console.log(JSON.stringify(result,null,2));await writeFile('evidence/local-model-receipt.json',JSON.stringify(result,null,2));
}catch(error){console.log('CHECK ERROR',error.message);process.exitCode=1;}
finally{await browser.close();}
