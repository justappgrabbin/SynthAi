import { GraphRuntime } from '../../runtime/GraphRuntime';
import { installSynthiaToolStack } from './SynthiaToolBootstrap';
// @ts-ignore - shared ESM utility
import BooleanOperatorBank from '../shared/boolean-operator-bank.mjs';

export function createSynthiaRuntime() {
  const runtime = new GraphRuntime();
  const stack = installSynthiaToolStack(runtime);
  return { runtime, stack, operators: BooleanOperatorBank };
}

export default createSynthiaRuntime;
