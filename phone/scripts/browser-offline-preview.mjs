import {chromium} from '../web/node_modules/playwright-core/index.mjs';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../android/app/preview-assets/',import.meta.url).pathname);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://appassets.androidplatform.net/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Connect an HTTPS server from the Android Server settings menu to use this feature.'})});
  const file=resolve(root,path.replace(/^\/assets\//,''));if(!file.startsWith(root+sep))return route.fulfill({status:404});
  const type=file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html';
  try{await route.fulfill({body:await readFile(file),contentType:type});}catch{await route.fulfill({status:404});}
 });
 await page.goto('https://appassets.androidplatform.net/assets/index.html');
 await page.getByRole('link',{name:'Explore the interface and research pages offline →',exact:true}).click();
 await page.getByText('Offline interface preview',{exact:true}).waitFor();
 await page.getByRole('button',{name:/Research lab · Six ways/}).click();
 assert.equal(await page.getByRole('navigation',{name:'Test types'}).getByRole('button').count(),6);
 for(const button of await page.getByRole('navigation',{name:'Test types'}).getByRole('button').all()){
  await button.click();await page.getByRole('heading',{name:'What would contradict it',exact:true}).waitFor();
 }
 for(const[label,value]of[['Birth date','1988-10-09'],['Birth time','12:30'],['Timezone','UTC'],['City','London'],['Latitude','51.5'],['Longitude','-0.12']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('button',{name:'Generate My Human Design',exact:true}).click();
 await page.getByText('Connect an HTTPS server from the Android Server settings menu to use this feature.',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: actual bundled interface, six readable offline protocols, clear server requirement and no fabricated chart');
}finally{await browser.close();}
