import { GraphRuntime } from '../../runtime/GraphRuntime.js';
import { installSynthiaToolStack } from './SynthiaToolBootstrap.js';
import { FactoryToolGenerator } from '../autonomy/FactoryToolGenerator.js';
// @ts-ignore - shared ESM utility
import BooleanOperatorBank from '../shared/boolean-operator-bank.mjs';
/**
 * Headless Synthia runtime.
 *
 * Existing organs are installed first. The missing-capability generator is
 * attached afterward and only runs when the registry has no tool capable of
 * satisfying a channel expression.
 */
export function createSynthiaRuntime() {
    const runtime = new GraphRuntime();
    const stack = installSynthiaToolStack(runtime);
    const autonomy = new FactoryToolGenerator({ mesh: stack.ato.mesh });
    runtime.setMissingToolGenerator(autonomy);
    return { runtime, stack, autonomy, operators: BooleanOperatorBank };
}
export default createSynthiaRuntime;
