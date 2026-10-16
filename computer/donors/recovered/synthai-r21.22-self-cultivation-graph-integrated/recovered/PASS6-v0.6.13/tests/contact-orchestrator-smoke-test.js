import { createSynthiaContactRuntime } from './UPGRADES/bootstrap/createSynthiaContactRuntime.js';

async function main() {
  console.log('--- contact → understand → act smoke ---');
  const { contact } = createSynthiaContactRuntime();

  const chat = await contact.contact('Hello there');
  if (chat.route.kind !== 'chat' || !chat.response?.text) throw new Error('basic LCM route failed');
  console.log('  basic contact:', chat.route.kind, '→', chat.response.text);

  const page = {
    url: 'https://example.test/apply', title: 'Application',
    forms: [{ id: 'application', action: 'https://example.test/apply/submit', official: true, fields: [
      { name: 'name', label: 'Full name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'signature', label: 'E-signature', type: 'signature', required: true }
    ] }]
  };
  const application = await contact.contact('I need to fill out this application', {
    page,
    profile: { name: 'Ada Lovelace', email: 'ada@example.test' },
    preapprovedFields: ['name', 'email']
  });
  if (application.route.kind !== 'browser' || application.route.task !== 'form-workflow') throw new Error('application did not route to browser');
  if (application.browser.status !== 'awaiting-human') throw new Error('application did not stop at human-only boundary');
  if (application.browser.unresolved.join(',') !== 'signature') throw new Error('signature was not the sole unresolved field');
  console.log('  application:', application.browser.status, 'unresolved:', application.browser.unresolved.join(', '));

  const order = await contact.contact('I need to order dog food', { materialize: false });
  if (order.route.kind !== 'browser' || order.plan.finalConfirmation !== 'purchase') throw new Error('purchase route failed');
  console.log('  purchase:', order.plan.steps.join(' → '), '→ confirmation:', order.plan.finalConfirmation);

  const expression = await contact.contact('Create a five-second video of a red circle moving left to right', { materialize: false });
  if (expression.route.kind !== 'expression' || expression.expressionPlan.role !== 'autonovel' || expression.morph.role !== 'messy') throw new Error('strong-expression route failed');
  console.log('  strong expression:', expression.expressionPlan.role, '→', expression.morph.role, '→', expression.morph.materializer);

  console.log('--- contact smoke complete ---');
}
main().catch((err) => { console.error('CONTACT SMOKE FAILED:', err); process.exit(1); });
