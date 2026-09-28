import test from 'node:test';
import assert from 'node:assert/strict';
import { ChromeDevToolsBrowserExecutor } from './ChromeDevToolsBrowserExecutor.js';
import { createSynthiaContactRuntime } from '../UPGRADES/bootstrap/createSynthiaContactRuntime.js';

test('real Chromium browser hand fills approved fields, pauses at signature, and requires final confirmation', { skip: !ChromeDevToolsBrowserExecutor.isAvailable() }, async () => {
  const { contact } = createSynthiaContactRuntime();
  const html = `<!doctype html><html><head><title>Application</title></head><body>
    <form id="application" action="https://example.test/submit" method="post">
      <label>Full name <input name="name" required></label>
      <label>Email <input name="email" type="email" required></label>
      <label>E-signature <input name="signature" required></label>
      <button type="submit">Submit</button>
    </form>
  </body></html>`;

  let sessionId = null;
  try {
    const result = await contact.contact('I need to fill out this application', {
      url: 'https://example.test/apply',
      pageHtml: html,
      profile: { name: 'Ada Lovelace', email: 'ada@example.test', signature: 'SHOULD-NOT-AUTOFILL' },
      preapprovedFields: ['name', 'email', 'signature']
    });

    assert.equal(result.route.kind, 'browser');
    assert.equal(result.browser.status, 'awaiting-human');
    assert.deepEqual(result.browser.unresolved, ['signature']);
    sessionId = result.browser.browserSessionId;
    assert.ok(sessionId);

    const fields = Object.fromEntries(result.browser.page.forms[0].fields.map((field) => [field.name, field.value]));
    assert.equal(fields.name, 'Ada Lovelace');
    assert.equal(fields.email, 'ada@example.test');
    assert.equal(fields.signature, '');

    const beforeHuman = await contact.reviewBrowserSession(sessionId);
    assert.deepEqual(beforeHuman.missing, ['signature']);

    await contact.provideBrowserInput(sessionId, { signature: 'Ada Lovelace' });
    const beforeConfirmation = await contact.confirmBrowserSubmission(sessionId, { confirmed: false });
    assert.equal(beforeConfirmation.status, 'awaiting-final-confirmation');

    const live = contact.browserSessions.sessions.get(sessionId);
    await live.executor.evaluate(`document.forms[0].addEventListener('submit', event => { event.preventDefault(); document.body.dataset.submitted = 'yes'; })`);

    const submitted = await contact.confirmBrowserSubmission(sessionId, { confirmed: true });
    assert.equal(submitted.status, 'submitted');
    assert.equal(submitted.dispatched.ok, true);
    assert.equal(await live.executor.evaluate(`document.body.dataset.submitted || ''`), 'yes');
  } finally {
    if (sessionId) await contact.closeBrowserSession(sessionId).catch(() => {});
    await contact.browserSessions?.closeAll().catch(() => {});
  }
});
