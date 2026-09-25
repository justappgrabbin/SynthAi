import { createSynthiaContactRuntime } from './UPGRADES/bootstrap/createSynthiaContactRuntime.js';
import { ChromeDevToolsBrowserExecutor } from './runtime/ChromeDevToolsBrowserExecutor.js';

function makeUnknownApplicationSite() {
  const pages = {
    careers: { title: 'Careers', html: `<main><h1>Careers</h1><p>Explore life here.</p><button onclick="go('benefits')">Benefits</button><button onclick="go('apply')">Open Roles & Apply</button></main>` },
    benefits: { title: 'Benefits', html: `<main><h1>Benefits</h1><p>Health and retirement details.</p></main>` },
    apply: { title: 'Candidate Application', html: `<main><h1>Candidate Application</h1><p>Complete the application below.</p><form id="candidate" action="https://unknown.test/submit" method="post"><label>Full name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>E-signature<input name="signature" required></label><button type="submit">Submit Application</button></form></main>` },
    about: { title: 'About', html: `<main><h1>About Us</h1><p>History.</p></main>` },
    contact: { title: 'Contact', html: `<main><h1>Contact</h1><p>Email us.</p></main>` }
  };
  const payload = Buffer.from(JSON.stringify(pages)).toString('base64');
  return `<!doctype html><title>Acme Home</title><main><h1>Acme</h1><p>Welcome to our company.</p><button onclick="go('about')">Company Info</button><button onclick="go('careers')">Work With Us</button><button onclick="go('contact')">Contact</button></main><script>const pages=JSON.parse(atob('${payload}'));function go(k){const p=pages[k];document.title=p.title;document.querySelector('main').outerHTML=p.html;}</script>`;
}

async function main() {
  console.log('--- autonomous browser navigation smoke ---');
  if (!ChromeDevToolsBrowserExecutor.isAvailable()) {
    console.log('  Chromium unavailable: navigation planner unit tests still cover deterministic routing');
    return;
  }
  const { contact } = createSynthiaContactRuntime();
  let id = null;
  try {
    const result = await contact.contact('I need to fill out an application for a job', {
      url: 'https://unknown.test/',
      pageHtml: makeUnknownApplicationSite(),
      profile: { name: 'Ada Lovelace', email: 'ada@example.test', signature: 'DO-NOT-USE' },
      preapprovedFields: ['name', 'email', 'signature']
    });
    id = result.browser.browserSessionId;
    const trace = result.browser.navigation?.trace?.map((step) => step.actionText) || [];
    if (trace.join(' > ') !== 'Work With Us > Open Roles & Apply') throw new Error(`unexpected navigation trace: ${trace.join(' > ')}`);
    if (result.browser.page.title !== 'Candidate Application') throw new Error('did not reach application page');
    const fields = Object.fromEntries(result.browser.page.forms[0].fields.map((field) => [field.name, field.value]));
    if (fields.name !== 'Ada Lovelace' || fields.email !== 'ada@example.test' || fields.signature !== '') throw new Error('autofill/human-only boundary failed after autonomous navigation');
    if (result.browser.status !== 'awaiting-human' || result.browser.unresolved.join(',') !== 'signature') throw new Error('did not stop at signature boundary');
    console.log('  discovered: Work With Us -> Open Roles & Apply');
    console.log('  reached: Candidate Application');
    console.log('  filled: name/email; preserved human-only signature boundary');
  } finally {
    if (id) await contact.closeBrowserSession(id).catch(() => {});
    await contact.browserSessions?.closeAll().catch(() => {});
  }
  console.log('--- autonomous browser navigation smoke complete ---');
}

main().catch((error) => { console.error('BROWSER NAVIGATION SMOKE FAILED:', error); process.exit(1); });
