import { chromium } from '../web/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000');
 for(const[label,value]of[['Birth date','1988-10-09'],['Birth time','12:30'],['Timezone','UTC'],['Region','England'],['City','London'],['Latitude','51.5074'],['Longitude','-0.1278']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('button',{name:'Generate My Human Design',exact:true}).click();
 await page.getByText('One birth configuration · Tropical Sun anchor',{exact:true}).waitFor();
 await page.getByText('Self-discovery · Cultivation playground',{exact:true}).click();
 await page.getByRole('button',{name:'Explore identity',exact:true}).click();
 await page.reload();
 await page.getByText('Restored your master birth chart.',{exact:true}).waitFor();
 await page.getByText('Self-discovery · Cultivation playground',{exact:true}).click();
 await page.getByText('Level 1 · 1/13 fragments ready · 0 Gene Gnomes',{exact:true}).waitFor();
 const selected=await page.evaluate(()=>JSON.parse(localStorage.getItem('synthia.birth.configuration.v1')));
 await page.getByRole('link',{name:'Computer & Network →'}).click();
 await page.waitForFunction(()=>window.SynthiaDesktop?.birthConfigurationReady===true);
 const state=await page.evaluate(async()=>{const runtime=window.SynthiaDesktop;const pair=await runtime.store.get('resonance:pair');const calculated=await runtime.store.get('resonance:calculated-profile');return {hash:pair.configurationHash,sun:calculated.astrology.tropical.positions.find(p=>p.planet==='Sun').longitude,sidereal:calculated.astrology.sidereal.system,frames:Object.keys(calculated.astrology),fields:Object.keys(calculated.fields)};});
 assert.equal(state.hash,selected.birth_anchor.configuration_id);
 assert.equal(state.sun,selected.birth_anchor.tropical_sun.longitude);
 assert.equal(state.sidereal,'Sidereal · Fagan–Bradley');
 assert.ok(state.frames.includes('draconicMean'));
 assert.equal(state.fields.length,9);
 assert.deepEqual(errors,[]);
 console.log('PASS: master birth chart, persisted progress, original computer pair, four frames, nine chart-derived fields');
 await page.screenshot({path:'/workspace/scratch/anchored-computer.png',fullPage:false});
} finally {await browser.close();}
