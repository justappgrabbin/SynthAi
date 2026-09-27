import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSynthiaContactRuntime } from './UPGRADES/bootstrap/createSynthiaContactRuntime.js';
import { ChromeDevToolsBrowserExecutor } from './runtime/ChromeDevToolsBrowserExecutor.js';

function makeSite() {
  const pages = {
    careers: { title: 'Careers', html: `<main><h1>Careers</h1><p>Explore opportunities.</p><button onclick="go('benefits')">Benefits</button><button onclick="go('apply')">Open Roles & Apply</button></main>` },
    benefits: { title: 'Benefits', html: `<main><h1>Benefits</h1><p>Benefits information.</p></main>` },
    apply: { title: 'Candidate Application', html: `<main><h1>Candidate Application</h1><form id="candidate" action="https://resume.test/submit" method="post"><label>Full name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>Describe your relevant experience<textarea name="experience" required></textarea></label><label>E-signature<input name="signature" required></label><button type="submit">Submit Application</button></form></main>` }
  };
  const payload = Buffer.from(JSON.stringify(pages)).toString('base64');
  return `<!doctype html><title>Acme Home</title><main><h1>Acme</h1><button onclick="go('careers')">Work With Us</button><button onclick="go('about')">Company Info</button></main><script>const pages=JSON.parse(atob('${payload}'));function go(k){if(k==='about'){document.title='About';document.querySelector('main').innerHTML='<h1>About</h1>';return;}const p=pages[k];document.title=p.title;document.querySelector('main').outerHTML=p.html;}</script>`;
}

async function main() {
  console.log('--- browser memory + continuation + mid-workflow expression smoke ---');
  if (!ChromeDevToolsBrowserExecutor.isAvailable()) {
    console.log('  Chromium unavailable: unit tests still cover memory and grounded field expression');
    return;
  }
  const dir = await mkdtemp(join(tmpdir(), 'synthia-browser-continuation-'));
  const memoryPath = join(dir, 'browser-memory.json');
  const profile = {
    name: 'Ada Lovelace',
    email: 'ada@example.test',
    signature: 'DO-NOT-PERSIST-OR-AUTOFILL',
    experienceFacts: ['Built a local-first application runtime', 'Tested browser automation against Chromium']
  };
  let firstId = null;
  let secondId = null;
  let secondRuntime = null;
  try {
    const firstRuntime = createSynthiaContactRuntime({ contactOptions: { browserMemoryPath: memoryPath } }).contact;
    const first = await firstRuntime.contact('I need to fill out an application for a job', {
      url: 'https://resume.test/', pageHtml: makeSite(), profile, preapprovedFields: ['name', 'email', 'signature']
    });
    firstId = first.browser.browserSessionId;
    const taskId = first.browser.taskId;
    if (!taskId) throw new Error('browser task checkpoint was not created');
    const form1 = first.browser.page.forms[0];
    const values1 = Object.fromEntries(form1.fields.map((field) => [field.name, field.value]));
    if (values1.name !== profile.name || values1.email !== profile.email) throw new Error('safe profile autofill failed');
    if (!values1.experience.includes('local-first application runtime') || !values1.experience.includes('Chromium')) throw new Error('AutoNovel/MESSY browser-field expression was not inserted');
    if (values1.signature !== '') throw new Error('signature boundary was violated');
    const generated = first.browser.generatedFields.find((field) => field.name === 'experience');
    if (generated?.expressionPlan?.role !== 'autonovel' || generated?.morph?.role !== 'messy') throw new Error('mid-workflow expression did not use AutoNovel → MESSY');
    console.log('  first pass: learned site + filled grounded experience + stopped at signature');

    await firstRuntime.closeBrowserSession(firstId); firstId = null;
    const saved = await firstRuntime.browserSessions.taskMemory.getTask(taskId);
    if (saved.status !== 'interrupted') throw new Error(`task did not checkpoint interruption: ${saved.status}`);

    secondRuntime = createSynthiaContactRuntime({ contactOptions: { browserMemoryPath: memoryPath } }).contact;
    const resumed = await secondRuntime.resumeBrowserTask(taskId, {
      pageHtml: makeSite(), profile, preapprovedFields: ['name', 'email', 'signature']
    });
    secondId = resumed.browserSessionId;
    const trace = resumed.navigation.trace;
    if (trace.map((step) => step.actionText).join(' > ') !== 'Work With Us > Open Roles & Apply') throw new Error('resumed route was incorrect');
    if (!trace.every((step) => step.memoryMatched === true)) throw new Error('resumed navigation did not use learned site memory');
    if (resumed.status !== 'awaiting-human' || resumed.unresolved.join(',') !== 'signature') throw new Error('resumed task did not return to human-only boundary');
    const values2 = Object.fromEntries(resumed.page.forms[0].fields.map((field) => [field.name, field.value]));
    if (values2.signature !== '') throw new Error('signature was restored from memory, which is forbidden');
    console.log('  resume: both navigation choices came from learned memory and page was re-inspected');

    await secondRuntime.provideBrowserInput(secondId, { signature: 'Ada Lovelace' });
    const blocked = await secondRuntime.confirmBrowserSubmission(secondId, { confirmed: false });
    if (blocked.status !== 'awaiting-final-confirmation') throw new Error('final confirmation boundary disappeared after resume');
    console.log('  final boundary: signature accepted, submission still requires explicit confirmation');
  } finally {
    if (firstId) {
      try { const rt = createSynthiaContactRuntime({ contactOptions: { browserMemoryPath: memoryPath } }).contact; await rt.closeBrowserSession(firstId); } catch {}
    }
    if (secondId && secondRuntime) { try { await secondRuntime.closeBrowserSession(secondId); } catch {} }
    await rm(dir, { recursive: true, force: true });
  }
  console.log('--- browser continuation smoke complete ---');
}

main().catch((error) => { console.error('BROWSER CONTINUATION SMOKE FAILED:', error); process.exit(1); });
