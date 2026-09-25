import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSynthiaContactRuntime } from './UPGRADES/bootstrap/createSynthiaContactRuntime.js';
import { ChromeDevToolsBrowserExecutor } from './runtime/ChromeDevToolsBrowserExecutor.js';

function applicationPage() {
  return `<!doctype html><title>Application</title><main><h1>Application</h1><form id="application" action="https://outcome.test/submit" method="post" onsubmit="event.preventDefault();document.title='Application Received';document.querySelector('main').innerHTML='<h1>Application Received</h1><p>Thank you. Your application was successfully submitted.</p>'"><label>Full name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>E-signature<input name="signature" required></label><button type="submit">Submit Application</button></form></main>`;
}

async function main() {
  console.log('--- browser outcome verification smoke ---');
  if (!ChromeDevToolsBrowserExecutor.isAvailable()) {
    console.log('  Chromium unavailable: outcome verifier unit tests still cover evidence logic');
    return;
  }
  const dir = await mkdtemp(join(tmpdir(), 'synthia-outcome-'));
  const memoryPath = join(dir, 'browser-memory.json');
  const { contact } = createSynthiaContactRuntime({ contactOptions: { browserMemoryPath: memoryPath } });
  let sessionId = null;
  try {
    const start = await contact.contact('I need to fill out this application', {
      url: 'https://outcome.test/', pageHtml: applicationPage(),
      profile: { name: 'Ada Lovelace', email: 'ada@example.test', signature: 'DO-NOT-USE' },
      preapprovedFields: ['name', 'email', 'signature']
    });
    sessionId = start.browser.browserSessionId;
    const taskId = start.browser.taskId;
    if (start.browser.status !== 'awaiting-human' || start.browser.unresolved.join(',') !== 'signature') throw new Error('signature boundary missing before submit');
    await contact.provideBrowserInput(sessionId, { signature: 'Ada Lovelace' });
    const stillBlocked = await contact.confirmBrowserSubmission(sessionId, { confirmed: false });
    if (stillBlocked.status !== 'awaiting-final-confirmation') throw new Error('final confirmation guard failed');
    const submitted = await contact.confirmBrowserSubmission(sessionId, { confirmed: true });
    if (submitted.status !== 'submitted') throw new Error('submission did not dispatch');
    if (submitted.outcome?.status !== 'verified-success' || !submitted.outcome.achieved) throw new Error(`outcome was not verified: ${submitted.outcome?.status}`);
    const task = await contact.browserSessions.taskMemory.getTask(taskId);
    if (task.status !== 'completed') throw new Error(`task memory was not closed as completed: ${task.status}`);
    console.log('  dispatch confirmed');
    console.log('  success page observed: Application Received');
    console.log('  task memory closed as completed only after success evidence');
  } finally {
    if (sessionId) await contact.closeBrowserSession(sessionId).catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
  console.log('--- outcome verification smoke complete ---');
}

main().catch((error) => { console.error('OUTCOME SMOKE FAILED:', error); process.exit(1); });
