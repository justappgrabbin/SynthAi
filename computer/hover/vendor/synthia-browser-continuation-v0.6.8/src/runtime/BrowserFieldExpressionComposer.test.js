import test from 'node:test';
import assert from 'node:assert/strict';
import { AutoNovelExpressionPlanner } from './AutoNovelExpressionPlanner.js';
import { MessyExpressionRouter } from './MessyExpressionRouter.js';
import { BrowserFieldExpressionComposer } from './BrowserFieldExpressionComposer.js';

test('open-ended browser field uses AutoNovel → MESSY and only supplied evidence', () => {
  const composer = new BrowserFieldExpressionComposer({ autoNovel: new AutoNovelExpressionPlanner(), messy: new MessyExpressionRouter() });
  const result = composer.compose({
    field: { name: 'experience', label: 'Describe your relevant experience', type: 'textarea' },
    message: 'I need to fill out this application',
    route: { task: 'form-workflow', dimension: 'BEING' },
    comprehension: { text: 'I need to fill out this application' },
    profile: { experienceFacts: ['Built a local-first application runtime', 'Tested browser automation against Chromium'] }
  });
  assert.equal(result.status, 'composed');
  assert.equal(result.expressionPlan.role, 'autonovel');
  assert.equal(result.expressionPlan.kind, 'browser-field');
  assert.equal(result.morph.role, 'messy');
  assert.equal(result.morph.materializer, 'BrowserFieldExpressionComposer');
  assert.equal(result.text, 'Built a local-first application runtime. Tested browser automation against Chromium.');
  assert.deepEqual(result.evidenceRefs, ['profile.experienceFacts', 'profile.experienceFacts']);
});

test('open-ended browser field remains unresolved when no grounded evidence exists', () => {
  const composer = new BrowserFieldExpressionComposer({ autoNovel: new AutoNovelExpressionPlanner(), messy: new MessyExpressionRouter() });
  const result = composer.compose({
    field: { name: 'experience', label: 'Describe your relevant experience', type: 'textarea' },
    message: 'I need to fill out this application',
    route: { task: 'form-workflow', dimension: 'BEING' },
    profile: {}
  });
  assert.equal(result.status, 'insufficient-evidence');
  assert.equal(result.text, null);
});
