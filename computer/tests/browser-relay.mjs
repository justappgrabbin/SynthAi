import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const server=http.createServer(async(req,res)=>{const path=req.url==='/'?'/index.html':req.url;try{const data=await readFile(fileURLToPath(new URL('../../public', import.meta.url))+path);res.setHeader('Content-Type',path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(data)}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(8777,'127.0.0.1',resolve));
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
const context = await browser.newContext({viewport:{width:412,height:915}});
const page = await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8777/');
await page.waitForFunction(()=>globalThis.SynthAIComputer);
await page.locator('[data-view="build"]').click();
await page.locator('#projectName').fill('Vegas checklist');
await page.locator('#createProject').click();
await page.waitForFunction(()=>document.querySelector('#builderMessage').textContent.includes('persisted'));
const popupPromise=page.waitForEvent('popup');
await page.locator('#previewFile').click();
const app=await popupPromise;
await app.waitForSelector('#text');
assert.equal(await app.evaluate(()=>window.opener),null);
await app.locator('#text').fill('Pack charger');
await app.locator('form button').click();
assert.equal(await app.locator('#items li').count(),1);
await app.getByRole('button',{name:'Done',exact:true}).click();
assert.equal(await app.locator('.done').textContent(),'Pack charger');
const dataPromise=app.waitForEvent('download');await app.getByRole('button',{name:'Export JSON'}).click();const dataDownload=await dataPromise;const exported=JSON.parse(await readFile(await dataDownload.path(),'utf8'));assert.equal(exported[0].text,'Pack charger');

await app.close();
await page.reload();
await page.waitForFunction(()=>globalThis.SynthAIComputer);
await page.locator('[data-view="build"]').click();
const againPromise=page.waitForEvent('popup');await page.locator('#previewFile').click();const again=await againPromise;
await again.waitForSelector('.done');assert.equal(await again.locator('.done').textContent(),'Pack charger');
await again.getByRole('button',{name:'Delete',exact:true}).click();assert.equal(await again.locator('#items li').count(),0);
await again.close();
await page.locator('#projectName').fill('Trip journal');await page.locator('#projectDescription').fill('notebook');await page.locator('#createProject').click();
await page.waitForFunction(()=>document.querySelector('#editor').value.includes('Trip journal'));
const notePromise=page.waitForEvent('popup');await page.locator('#previewFile').click();const notes=await notePromise;
await notes.waitForSelector('textarea');await notes.locator('#text').fill('Arrived in Vegas');await notes.locator('form button').click();assert.equal(await notes.locator('#items li span').textContent(),'Arrived in Vegas');
await notes.close();
const htmlPromise=page.waitForEvent('download');await page.locator('#exportApp').click();const htmlDownload=await htmlPromise;assert.match(await readFile(await htmlDownload.path(),'utf8'),/Trip journal/);
assert.deepEqual(errors,[]);

const dataDirectory = await mkdtemp(join(tmpdir(), 'relay-front-worker-'));
const apiToken = 'browser-worker-test-token-at-least-32-characters';
const daemon = spawn(process.execPath, [fileURLToPath(new URL('../worker/server.mjs', import.meta.url))], {env:{...process.env,PORT:'0',HOST:'127.0.0.1',RELAY_DATA_DIR:dataDirectory,RELAY_API_TOKEN:apiToken,RELAY_ALLOWED_ORIGINS:'http://127.0.0.1:8777'},stdio:['ignore','pipe','pipe']});
let daemonLogs='';daemon.stdout.on('data',chunk=>{daemonLogs+=chunk});daemon.stderr.on('data',chunk=>{daemonLogs+=chunk});
try {
  const deadline=Date.now()+20000;let port;
  while(!port && Date.now()<deadline){const match=daemonLogs.match(/"event":"relay-server-ready","port":(\d+)/);if(match)port=Number(match[1]);else await new Promise(resolve=>setTimeout(resolve,50))}
  assert.ok(port,daemonLogs);
  await page.locator('#workerUrl').fill(`http://127.0.0.1:${port}`);
  await page.locator('#workerToken').fill(apiToken);
  await page.locator('#connectWorker').click();
  await page.waitForFunction(()=>document.querySelector('#workerMessage').textContent.includes('connected'));
  await page.locator('#projectName').fill('Unattended trip notes');
  await page.locator('#backgroundBuild').click();
  await page.waitForFunction(()=>document.querySelector('#workerJobs').textContent.includes('Unattended trip notes'));
  await page.close();
  // No browser page remains open while the separate worker finishes.
  const waitUntil=Date.now()+65000;let completed=false;
  while(Date.now()<waitUntil){const result=await(await fetch(`http://127.0.0.1:${port}/api/jobs`,{headers:{Authorization:`Bearer ${apiToken}`}})).json();if(result.jobs.some(job=>job.status==='failed'))throw new Error(JSON.stringify(result));if(result.jobs.some(job=>job.status==='verified')){completed=true;break}await new Promise(resolve=>setTimeout(resolve,100))}
  assert.equal(completed,true,daemonLogs);
  const reopened=await context.newPage();
  await reopened.goto('http://127.0.0.1:8777/');
  await reopened.waitForFunction(()=>globalThis.SynthAIComputer);
  await reopened.locator('[data-view="build"]').click();
  await reopened.locator('#workerToken').fill(apiToken);await reopened.locator('#connectWorker').click();
  await reopened.getByRole('button',{name:'Bring into Relay'}).click();
  await reopened.waitForFunction(()=>document.querySelector('#editor').value.includes('Unattended trip notes'));
  const remotePopup=reopened.waitForEvent('popup');await reopened.locator('#previewFile').click();const remoteApp=await remotePopup;
  await remoteApp.waitForSelector('#text');await remoteApp.locator('#text').fill('Built while the client was closed');await remoteApp.locator('form button').click();assert.equal(await remoteApp.locator('#items li span').textContent(),'Built while the client was closed');
  await remoteApp.close();await reopened.close();
  console.log('PASS authenticated worker submission, completion with all app pages closed, import, and usable delivered artifact');
} finally {
  const exited=new Promise(resolve=>daemon.once('exit',resolve));daemon.kill('SIGTERM');await exited;await rm(dataDirectory,{recursive:true,force:true});
}
console.log('PASS browser boot, Klein build, task completion, saved data after restart, deletion, notebook');
await browser.close();

server.close();
