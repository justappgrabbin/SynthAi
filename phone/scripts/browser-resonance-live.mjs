// Run against an isolated test server: creates two real test accounts and records.
import { chromium } from '../web/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const base=process.env.APP_BASE_URL;
if(!base)throw new Error('Set APP_BASE_URL to an isolated test server; this test creates records.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const contexts=[];
try{
 const masters=[],pages=[],members=[],stamp=Date.now();
 for(let i=0;i<2;i++){
  const context=await browser.newContext({viewport:{width:390,height:844}});contexts.push(context);
  async function post(path,data){const r=await context.request.post(base+path,{data});assert.ok(r.ok(),await r.text());return r.json();}
  const account=await post('/api/auth/register',{name:`QA ${stamp} Member ${i+1}`,email:`qa${stamp}-${i}@example.invalid`,password:`qa-only-${stamp}-test`});members.push(account.user);
  const master=await post('/api/charts',{birth_date:i?'1991-02-16':'1988-10-09',birth_time:'12:30',timezone_name:'UTC',latitude:51.5,longitude:-.12});masters.push(master);
  const p=await context.request.put(base+'/api/resonance-network/profile',{data:{chart_id:master.chart_id,discoverable:true,intents:['conversation'],interests:['music']}});assert.ok(p.ok(),await p.text());
  const page=await context.newPage();pages.push(page);
  await page.goto(base);await page.evaluate(m=>localStorage.setItem('synthia.birth.configuration.v1',JSON.stringify({chart_id:m.chart_id,birth_anchor:m.birth_anchor})),master);await page.reload();
  await page.getByText('Restored your master birth chart.',{exact:true}).waitFor();
 }
 const a=pages[0],b=pages[1];await a.reload();
 const denied=await contexts[1].request.get(base+'/api/charts/'+masters[0].chart_id);assert.equal(denied.status(),404);
 const device=await browser.newContext({viewport:{width:390,height:844}});contexts.push(device);
 const login=await device.request.post(base+'/api/auth/login',{data:{email:`qa${stamp}-0@example.invalid`,password:`qa-only-${stamp}-test`}});assert.ok(login.ok());
 const devicePage=await device.newPage();await devicePage.goto(base);
 await devicePage.getByText('Restored your master birth chart.',{exact:true}).waitFor();
 const recovered=await devicePage.evaluate(()=>JSON.parse(localStorage.getItem('synthia.birth.configuration.v1')));
 assert.equal(recovered.chart_id,masters[0].chart_id);

 await a.locator('.connection-card').filter({has:a.getByRole('heading',{name:members[1].name,exact:true})}).getByRole('button',{name:'Invite to connect',exact:true}).click();
 await a.getByText('outgoing · pending',{exact:true}).waitFor();
 await b.reload();await b.getByRole('button',{name:'Accept connection',exact:true}).click();
 await b.getByRole('link',{name:'Open conversation →',exact:true}).waitFor();
 await a.reload();await a.getByRole('link',{name:'Open conversation →',exact:true}).click();
 await a.getByPlaceholder('Write your message…',{exact:true}).fill('A real consented QA conversation.');
 await a.locator('#rs-send-message').getByRole('button',{name:'Send',exact:true}).click();
 await a.getByText('A real consented QA conversation.',{exact:false}).waitFor();
 const response=await contexts[1].request.get(base+'/api/messages?with='+members[0].id);assert.ok(response.ok());assert.equal((await response.json()).messages.at(-1).content,'A real consented QA conversation.');
 await b.getByRole('button',{name:'Leave resonance discovery',exact:true}).click();
 await b.getByText('Discovery is',{exact:false}).first().waitFor();
 const matches=await contexts[0].request.get(base+'/api/resonance-network/matches');assert.ok(!(await matches.json()).matches.some(m=>m.member_id===members[1].id));
 const journeyBase=base+'/api/cultivation/'+masters[0].chart_id;
 const state=await (await contexts[0].request.get(journeyBase)).json();const option=state.practice_options[0];
 async function save(path,data){const r=await contexts[0].request.post(journeyBase+path,{data});assert.ok(r.ok(),await r.text());return r.json();}
 await save('/profile',{answers:{q5:'Make music'},story_path:'explore',expected_revision:null});
 const practice=await save('/practices',{option_id:option.id,prompt:option.selected_prompt,action:'Pause and listen',expected:'Less interruption',counterevidence:'More interruption',deadline:new Date(Date.now()+86400000).toISOString()});
 const observation=await save('/observations',{practice_id:practice.id,situation:'Conversation',action_taken:'Paused',result:'Still interrupted',assessment:'contradicted'});
 await save('/interpretations',{observation_id:observation.id,text:'This practice did not help in this setting.'});
 const saved=await (await contexts[0].request.get(journeyBase)).json();assert.equal(saved.practices[0].expected,'Less interruption');assert.equal(saved.observations[0].result,'Still interrupted');assert.equal(saved.interpretations.length,1);
 const forecast=await contexts[0].request.post(base+'/api/research/predictions',{data:{chart_id:masters[0].chart_id,title:'QA original forecast',criterion:'A recorded event',probability:.7,baseline:.5,deadline:'2099-01-01T00:00:00Z'}});assert.ok(forecast.ok());
 const newerResponse=await contexts[0].request.post(base+'/api/charts',{data:{birth_date:'1988-10-09',birth_time:'12:30',timezone_name:'UTC',latitude:51.5,longitude:-.12}});assert.ok(newerResponse.ok());
 const newer=await newerResponse.json();assert.equal(newer.birth_anchor.configuration_id,masters[0].birth_anchor.configuration_id);
 await a.goto(base);const picker=a.getByRole('combobox',{name:/Your saved charts/});await picker.waitFor();
 await a.locator('#cultivation-journey').getByText('Still interrupted',{exact:false}).waitFor();
 await a.getByText('Prediction log · Commit before the outcome',{exact:true}).click();
 await a.getByRole('heading',{name:'QA original forecast',exact:true}).waitFor();
 await picker.selectOption(newer.chart_id);
 await a.getByRole('heading',{name:'QA original forecast',exact:true}).waitFor({state:'hidden'});
 await picker.selectOption(masters[0].chart_id);
 await a.locator('#cultivation-journey').getByText('Still interrupted',{exact:false}).waitFor();
 await a.getByRole('heading',{name:'QA original forecast',exact:true}).waitFor();
 console.log('PASS: saved-chart selection preserves separate histories, private chart isolation, real sign-in on another device, chart-derived suggestions, recipient consent, saved conversation, opt-out and private journey');
}finally{await browser.close();}
