import { createSynthiaRuntime } from './createSynthiaRuntime.js';
import { ContactRuntime } from '../../runtime/ContactRuntime.js';

export function createSynthiaContactRuntime(options = {}) {
  const base = createSynthiaRuntime(options.runtimeOptions || {});
  const contact = new ContactRuntime({ runtime: base.runtime, stack: base.stack, ...(options.contactOptions || {}) });
  return { ...base, contact };
}

export default createSynthiaContactRuntime;
