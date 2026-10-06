import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.RESONANCE_PLAYWRIGHT || '/tmp/hover-ui-test/node_modules/playwright/index.mjs'));
import { spawn } from 'node:child_process';
import { mkdtemp,rm } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.cwd()+'/computer/donors/resonance-network',dir=await mkdtemp('/tmp/resonance-entry-');
const child=spawn(process.env.RESONANCE_PYTHON || '/tmp/resonance-test/bin/python',['-m','uvicorn','phone_entry:app','--host','127.0.0.1','--port','17583'],{cwd:root+'/backend',env:{...process.env,RESONANCE_DB_PATH:dir+'/test.db',RESONANCE_FRONTEND:root+'/frontend/dist'}});
child.stderr.on('data',d=>process.stderr.write(d));let browser;
try{
for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:17583/api/health');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});page.on('requestfailed',r=>console.log('REQUEST_FAILED',r.url(),r.failure()));page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
await page.goto('http://127.0.0.1:17583/welcome');await page.locator('button').filter({hasText:'CONNECTED'}).first().waitFor();await page.getByPlaceholder('What should we call you').fill('Phone Entry Test');await page.locator('input[type=email]').fill('entry-test@example.invalid');await page.locator('button[type=submit]').click();await page.waitForURL('**/birth-data');
await page.locator('input[type=date]').fill('1990-01-01');await page.locator('input[type=time]').fill('12:00');await page.locator('input[type=text]').fill('Test place');await page.locator('button[type=submit]').click();await page.waitForURL('**/questionnaire',{timeout:60000});await page.locator('label').filter({hasText:'Neutral & Stable'}).click();await page.locator('textarea').nth(0).fill('Testing entry');await page.locator('textarea').nth(1).fill('A working phone world');await page.locator('button[type=submit]').click();await page.waitForURL('**/home',{timeout:60000});assert.equal(errors.length,0);
await page.reload();await page.waitForURL('**/home');await page.getByText('Phone Entry Test',{exact:false}).first().waitFor();
const second=await browser.newPage({viewport:{width:390,height:844}});await second.goto('http://127.0.0.1:17583/welcome');await second.locator('button').filter({hasText:'CONNECTED'}).first().waitFor();await second.getByPlaceholder('What should we call you').fill('Returning');await second.locator('input[type=email]').fill('entry-test@example.invalid');await second.locator('button[type=submit]').click();await second.waitForURL('**/home',{timeout:30000});
console.log('Real Resonance API: new-user entry, birth calculation, questionnaire, dashboard, reload and returning-profile sign-in passed.');
}catch(e){for(const ctx of browser?.contexts()??[])for(const p of ctx.pages())console.log('FAIL_SCREEN',p.url(),await p.locator('body').innerText());throw e;}finally{await browser?.close();child.kill();await rm(dir,{recursive:true,force:true});}
