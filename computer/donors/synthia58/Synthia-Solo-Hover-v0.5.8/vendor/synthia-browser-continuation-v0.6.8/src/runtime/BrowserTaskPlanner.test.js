import test from 'node:test';
import assert from 'node:assert/strict';
import { browserFormAutomaton } from '../UPGRADES/vendor/ato-core/src/browser-form.mjs';
import { BrowserTaskPlanner } from './BrowserTaskPlanner.js';

const page = {
  url: 'https://example.test/apply',
  title: 'Application',
  forms: [{
    id: 'application', action: 'https://example.test/apply/submit', method: 'POST', official: true,
    fields: [
      { name: 'name', label: 'Full name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'signature', label: 'E-signature', type: 'signature', required: true }
    ]
  }]
};

test('fills pre-approved profile fields and stops at signature', async () => {
  const planner = new BrowserTaskPlanner();
  const result = await planner.prepareForm(browserFormAutomaton(), {
    page,
    profile: { name: 'Ada Lovelace', email: 'ada@example.test', signature: 'DO-NOT-AUTOFILL' },
    preapprovedFields: ['name', 'email', 'signature']
  });
  assert.equal(result.status, 'awaiting-human');
  assert.deepEqual(result.unresolved, ['signature']);
  assert.deepEqual(result.humanOnly, ['signature']);
  const name = result.draft.entries.find((entry) => entry.name === 'name');
  const email = result.draft.entries.find((entry) => entry.name === 'email');
  const signature = result.draft.entries.find((entry) => entry.name === 'signature');
  assert.equal(name.value, 'Ada Lovelace'); assert.equal(name.approved, true);
  assert.equal(email.value, 'ada@example.test'); assert.equal(email.approved, true);
  assert.equal(signature.value, null);
});
