import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8080/');await page.waitForFunction(()=>document.querySelectorAll('#files option').length>=6);
 await page.locator('#upload').setInputFiles([{name:'double.mjs',mimeType:'text/javascript',buffer:Buffer.from('export const main=x=>x*2;')},{name:'original.bin',mimeType:'application/octet-stream',buffer:Buffer.from([0,255,128,1])}]);
 await page.waitForFunction(()=>[...document.querySelectorAll('#files option')].some(o=>o.value==='double.mjs'));
 await page.fill('#spec',JSON.stringify({name:'double',description:'Double the input',entry:'double.mjs',cases:[{args:[2],expected:4}],holdouts:[{args:[7],expected:14}]}));
 await page.click('#acquire');await page.waitForFunction(()=>document.getElementById('result').textContent.includes('verified-on-recorded-examples'));
 await page.selectOption('#capabilities','double');await page.fill('#args','[8]');await page.click('#execute');await page.waitForFunction(()=>document.getElementById('result').textContent==='16');
 await page.reload();await page.waitForFunction(()=>[...document.querySelectorAll('#capabilities option')].some(o=>o.value==='double'));
 const binary=await page.evaluate(async()=>{const {Workspace,IndexedWorkspaceStorage}=await import('./workspace.mjs');return (await new Workspace(new IndexedWorkspaceStorage()).assets())['original.bin'].bytes;});
 const [download]=await Promise.all([page.waitForEvent('download'),page.click('#backup')]);
 await download.saveAs('evidence/browser-workspace-backup.json');
 await page.selectOption('#capabilities','double');await page.click('#verify');await page.waitForFunction(()=>document.getElementById('result').textContent.includes('"pass": true'));
 const result={ownSourceSeeded:true,fullSourceAcquired:true,executed:16,survivedReload:true,originalBinaryBytes:binary,backupDownloaded:true,replay:JSON.parse(await page.locator('#result').textContent()),errors};
 console.log(JSON.stringify(result,null,2));await writeFile('evidence/browser-workflow-receipt.json',JSON.stringify(result,null,2));
 if(JSON.stringify(binary)!=='[0,255,128,1]'||errors.length)process.exitCode=1;
}finally{await browser.close();}
