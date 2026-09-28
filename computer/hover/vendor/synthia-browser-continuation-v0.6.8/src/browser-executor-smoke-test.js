import { createSynthiaContactRuntime } from './UPGRADES/bootstrap/createSynthiaContactRuntime.js';
import { ChromeDevToolsBrowserExecutor } from './runtime/ChromeDevToolsBrowserExecutor.js';

async function main() {
  console.log('--- real browser executor smoke ---');
  if (!ChromeDevToolsBrowserExecutor.isAvailable()) {
    console.log('  Chromium unavailable: browser executor contract present but host browser is not mounted');
    return;
  }

  const { contact } = createSynthiaContactRuntime();
  const html = `<!doctype html><title>Application</title><form id="application" action="https://example.test/submit" method="post">
    <label>Full name<input name="name" required></label>
    <label>Email<input name="email" type="email" required></label>
    <label>E-signature<input name="signature" required></label>
    <button type="submit">Submit</button>
  </form>`;
  let id = null;
  try {
    const start = await contact.contact('I need to fill out this application', {
      url: 'https://example.test/apply', pageHtml: html,
      profile: { name: 'Ada Lovelace', email: 'ada@example.test', signature: 'DO-NOT-USE' },
      preapprovedFields: ['name', 'email', 'signature']
    });
    id = start.browser.browserSessionId;
    const fieldMap = Object.fromEntries(start.browser.page.forms[0].fields.map((field) => [field.name, field.value]));
    if (fieldMap.name !== 'Ada Lovelace' || fieldMap.email !== 'ada@example.test' || fieldMap.signature !== '') throw new Error('real DOM autofill boundary failed');
    if (start.browser.status !== 'awaiting-human' || start.browser.unresolved.join(',') !== 'signature') throw new Error('signature pause failed');
    console.log('  real DOM: name/email filled; signature untouched');

    await contact.provideBrowserInput(id, { signature: 'Ada Lovelace' });
    const guarded = await contact.confirmBrowserSubmission(id, { confirmed: false });
    if (guarded.status !== 'awaiting-final-confirmation') throw new Error('final confirmation guard failed');
    console.log('  guard: submission blocked pending explicit final confirmation');

    const live = contact.browserSessions.sessions.get(id);
    await live.executor.evaluate(`document.forms[0].addEventListener('submit', event => { event.preventDefault(); document.body.dataset.submitted = 'yes'; })`);
    const done = await contact.confirmBrowserSubmission(id, { confirmed: true });
    if (done.status !== 'submitted' || await live.executor.evaluate(`document.body.dataset.submitted || ''`) !== 'yes') throw new Error('confirmed submission dispatch failed');
    console.log('  submit: explicit confirmation dispatched actual Chromium form event');
  } finally {
    if (id) await contact.closeBrowserSession(id).catch(() => {});
    await contact.browserSessions?.closeAll().catch(() => {});
  }
  console.log('--- real browser executor smoke complete ---');
}

main().catch((error) => { console.error('BROWSER EXECUTOR SMOKE FAILED:', error); process.exit(1); });
