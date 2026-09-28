import assert from "node:assert/strict";
import { EnhancedAutoLing } from "./EnhancedAutoLing.js";
import { EnhancedDiseminer } from "./EnhancedDiseminer.js";
async function main() {
  const al = new EnhancedAutoLing();
  const r = al.induceRule([
    { input: { relations: ["who:a", "what:blocker"], constraints: ["persona:a"] }, output: { relations: ["who:a", "what:insight"], constraints: ["persona:a"] } },
    { input: { relations: ["who:a", "what:blocker"], constraints: ["persona:a"] }, output: { relations: ["who:a", "what:insight"], constraints: ["persona:a"] } }
  ]);
  assert.ok(r);
  assert.equal(al.getRules().length, 1);
  const parse = await al.parseSemantic("I build systems");
  assert.ok(parse);
  const d = new EnhancedDiseminer();
  d.observe("systems learn from repeated context");
  d.observe("systems learn from repeated context");
  const sense = d.observe("systems learn from repeated context");
  assert.equal(sense.familiar, true);
  await d.flush();
  const stats = await d.handleMessage({ type: "stats", payload: {} });
  assert.ok(stats.words >= 1);
  console.log(JSON.stringify({ autolingRules: al.getRules().length, diseminerWords: stats.words, familiar: sense.familiar }));
}
main();
