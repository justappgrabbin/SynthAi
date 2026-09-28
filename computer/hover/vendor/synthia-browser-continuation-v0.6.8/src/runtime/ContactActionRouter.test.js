import test from 'node:test';
import assert from 'node:assert/strict';
import { ContactActionRouter } from './ContactActionRouter.js';

const router = new ContactActionRouter();
test('routes application/order/basic/strong-expression contacts', () => {
  assert.equal(router.route('I need to fill out this application').task, 'form-workflow');
  assert.equal(router.route('I need to order dog food').task, 'purchase-workflow');
  assert.equal(router.route('Create a five-second video of a red circle').task, 'video');
  assert.equal(router.route('Hey, what are you doing?').kind, 'chat');
});
