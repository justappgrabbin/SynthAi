import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSynthiaContactRuntime } from './UPGRADES/bootstrap/createSynthiaContactRuntime.js';
import { ChromeDevToolsBrowserExecutor } from './runtime/ChromeDevToolsBrowserExecutor.js';

function site() {
  const pages = {
    apply: { title: 'Portfolio Application', html: `<main><h1>Portfolio Application</h1><form id="application" action="https://handoff.test/submit" method="post"><label>Full name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>Portfolio<input name="portfolio" type="file" required></label><label>Short project summary<textarea name="summary" required></textarea></label><label>E-signature<input name="signature" required></label><button type="submit">Submit Application</button></form></main>` }
  };
  const payload = Buffer.from(JSON.stringify(pages)).toString('base64');
  return `<!doctype html><title>Studio Home</title><main><h1>Studio</h1><button onclick="go('apply')">Apply With Portfolio</button><button>News</button></main><script>const pages=JSON.parse(atob('${payload}'));function go(k){const p=pages[k];document.title=p.title;document.querySelector('main').outerHTML=p.html;}</script>`;
}

async function main() {
  console.log('--- browser ↔ AutoNovel/MESSY artifact handoff smoke ---');
  if (!ChromeDevToolsBrowserExecutor.isAvailable()) {
    console.log('  Chromium unavailable: artifact composer unit tests still cover grounded file creation');
    return;
  }
  const dir = await mkdtemp(join(tmpdir(), 'synthia-artifact-handoff-'));
  const memoryPath = join(dir, 'browser-memory.json');
  const { contact } = createSynthiaContactRuntime({ contactOptions: { browserMemoryPath: memoryPath } });
  let sessionId = null;
  try {
    const result = await contact.contact('I need to fill out this application with my portfolio', {
      url: 'https://handoff.test/',
      pageHtml: site(),
      profile: {
        name: 'Ada Lovelace',
        email: 'ada@example.test',
        signature: 'DO-NOT-USE',
        portfolioFacts: ['Built a deterministic scene renderer', 'Implemented autonomous browser navigation'],
        facts: ['The work is local-first and test-driven']
      },
      preapprovedFields: ['name', 'email', 'signature']
    });
    sessionId = result.browser.browserSessionId;
    const trace = result.browser.navigation.trace.map((step) => step.actionText).join(' > ');
    if (trace !== 'Apply With Portfolio') throw new Error(`unexpected navigation: ${trace}`);
    const artifact = result.browser.generatedArtifacts.find((field) => field.name === 'portfolio');
    if (!artifact || artifact.status !== 'composed') throw new Error('portfolio artifact was not generated');
    if (artifact.expressionPlan?.role !== 'autonovel' || artifact.morph?.role !== 'messy') throw new Error('portfolio did not use AutoNovel → MESSY');
    const fields = Object.fromEntries(result.browser.page.forms[0].fields.map((field) => [field.name, field.value]));
    if (!String(fields.portfolio).includes('synthia-portfolio.html')) throw new Error(`real file input was not populated: ${fields.portfolio}`);
    if (!fields.summary.includes('local-first') && !fields.summary.includes('deterministic scene renderer')) throw new Error('summary expression was not filled');
    if (fields.signature !== '') throw new Error('signature boundary violated');
    if (result.browser.status !== 'awaiting-human' || result.browser.unresolved.join(',') !== 'signature') throw new Error(`expected only signature unresolved, got ${result.browser.unresolved}`);
    console.log('  browser discovered application');
    console.log('  AutoNovel → MESSY created portfolio HTML');
    console.log('  CDP uploaded the real file into <input type=file>');
    console.log('  summary filled; signature preserved as human-only');
  } finally {
    if (sessionId) await contact.closeBrowserSession(sessionId).catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
  console.log('--- artifact handoff smoke complete ---');
}

main().catch((error) => { console.error('ARTIFACT HANDOFF SMOKE FAILED:', error); process.exit(1); });
