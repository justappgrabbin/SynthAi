import { GraphRuntime } from "../../runtime/GraphRuntime.js";
import { installSynthiaToolStack } from "./SynthiaToolBootstrap.js";
import { FactoryToolGenerator } from "../autonomy/FactoryToolGenerator.js";
import BooleanOperatorBank from "../shared/boolean-operator-bank.mjs";
function createSynthiaRuntime() {
  const runtime = new GraphRuntime();
  const stack = installSynthiaToolStack(runtime);
  const autonomy = new FactoryToolGenerator({ mesh: stack.ato.mesh });
  runtime.setMissingToolGenerator(autonomy);
  return { runtime, stack, autonomy, operators: BooleanOperatorBank };
}
var stdin_default = createSynthiaRuntime;
export {
  createSynthiaRuntime,
  stdin_default as default
};
