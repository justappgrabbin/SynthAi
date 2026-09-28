import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPerceptionNavigator } from './BrowserPerceptionNavigator.js';

class FakeExecutor {
  constructor(pages, start = 'home') { this.pages = pages; this.current = start; }
  async inspectPage() { return this.pages[this.current]; }
  async clickAction(id) {
    const action = this.pages[this.current].actions.find((item) => item.id === id);
    if (!action) return { ok: false, reason: 'ACTION_NOT_FOUND' };
    if (action.next) this.current = action.next;
    return { ok: true, actionId: id, text: action.text };
  }
}

test('navigator discovers an application route without supplied selectors', async () => {
  const pages = {
    home: { title: 'Home', text: 'Welcome', headings: ['Home'], forms: [], actions: [
      { id: 'a1', text: 'Company Info', context: 'About our company', href: null },
      { id: 'a2', text: 'Work With Us', context: 'Join the team', href: null, next: 'careers' }
    ]},
    careers: { title: 'Careers', text: 'Benefits and open roles', headings: ['Careers'], forms: [], actions: [
      { id: 'a1', text: 'Benefits', context: 'Employee benefits', href: null },
      { id: 'a2', text: 'Open Roles & Apply', context: 'Current jobs and applications', href: null, next: 'apply' }
    ]},
    apply: { title: 'Application', text: 'Candidate application', headings: ['Application'], actions: [
      { id: 'a1', text: 'Submit Application', context: 'Submit Application', href: null }
    ], forms: [{ id: 'candidate', fields: [{ name: 'name', label: 'Full name', type: 'text', required: true, value: '' }] }] }
  };
  const nav = new BrowserPerceptionNavigator();
  const result = await nav.navigate({ executor: new FakeExecutor(pages), message: 'I need to fill out an application for a job', route: { task: 'form-workflow' } });
  assert.equal(result.status, 'goal-reached');
  assert.equal(result.page.title, 'Application');
  assert.deepEqual(result.trace.map((entry) => entry.actionText), ['Work With Us', 'Open Roles & Apply']);
});

test('navigator refuses binding actions while searching for a safe route', async () => {
  const pages = {
    home: { title: 'Store', text: 'Store', headings: ['Store'], forms: [], actions: [
      { id: 'pay', text: 'Pay Now', context: 'Authorize payment and place order', href: null, next: 'paid' },
      { id: 'shop', text: 'Shop Products', context: 'Browse the product catalog', href: null, next: 'products' }
    ]},
    products: { title: 'Products', text: 'Dog food', headings: ['Products'], forms: [], actions: [
      { id: 'cart', text: 'Add to Cart', context: 'Dog food 20 lb', href: null }
    ]},
    paid: { title: 'Paid', text: 'This must never be reached autonomously', headings: ['Paid'], forms: [], actions: [] }
  };
  const nav = new BrowserPerceptionNavigator();
  const result = await nav.navigate({ executor: new FakeExecutor(pages), message: 'I need to order dog food', route: { task: 'purchase-workflow' } });
  assert.equal(result.status, 'goal-reached');
  assert.equal(result.page.title, 'Products');
  assert.deepEqual(result.trace.map((entry) => entry.actionText), ['Shop Products']);
});
