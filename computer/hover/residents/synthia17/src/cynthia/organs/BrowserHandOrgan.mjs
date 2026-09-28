import { BrowserTaskPlanner } from '../../runtime/BrowserTaskPlanner.js';
import { BrowserPerceptionNavigator } from '../../runtime/BrowserPerceptionNavigator.js';
import { BrowserOutcomeVerifier } from '../../runtime/BrowserOutcomeVerifier.js';

const routeFor = (text) => {
  if (/\b(apply|application|register|sign[ -]?up|form)\b/i.test(text)) return { kind: 'browser', task: 'form-workflow' };
  if (/\b(buy|purchase|shop|order|cart)\b/i.test(text)) return { kind: 'browser', task: 'purchase-workflow' };
  if (/\b(book|booking|reserve|appointment|schedule)\b/i.test(text)) return { kind: 'browser', task: 'booking-workflow' };
  return { kind: 'browser', task: 'navigation-workflow' };
};

export class BrowserHandOrgan {
  constructor() {
    this.planner = new BrowserTaskPlanner();
    this.navigator = new BrowserPerceptionNavigator();
    this.verifier = new BrowserOutcomeVerifier();
  }

  plan(message) {
    const route = routeFor(String(message));
    return Object.freeze({
      status: 'planned-awaiting-residence-hand',
      route: Object.freeze(route),
      plan: this.planner.plan(message, route),
      boundary: Object.freeze({
        executionRequired: true,
        executorAttached: false,
        acceptedExecutors: Object.freeze(['android-webview-hand', 'extension-hand', 'owner-supplied-browser-hand']),
        bindingActionsRequireConfirmation: true,
      }),
    });
  }

  async act({ message, executor, maxSteps } = {}) {
    if (!executor) return this.plan(message);
    const route = routeFor(String(message));
    return this.navigator.navigate({ executor, message, route, maxSteps });
  }

  verify(page, message, dispatched = null) { return this.verifier.verify({ route: routeFor(String(message)), page, dispatched }); }
}
