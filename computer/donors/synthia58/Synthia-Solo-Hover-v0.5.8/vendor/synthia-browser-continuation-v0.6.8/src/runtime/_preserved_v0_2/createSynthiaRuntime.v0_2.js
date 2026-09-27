import { GraphRuntime } from "../../runtime/GraphRuntime.js";
import { installSynthiaToolStack } from "./SynthiaToolBootstrap";
import BooleanOperatorBank from "../shared/boolean-operator-bank.mjs";
function createSynthiaRuntime() {
  const runtime = new GraphRuntime();
  const stack = installSynthiaToolStack(runtime);
  return { runtime, stack, operators: BooleanOperatorBank };
}
var stdin_default = createSynthiaRuntime;
export {
  createSynthiaRuntime,
  stdin_default as default
};
