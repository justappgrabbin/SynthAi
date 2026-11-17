import assert from "node:assert/strict";
import fs from "node:fs";
import { makeRelationalMemory } from "./relational-memory.mjs";
const K = await import(
  "data:text/javascript;base64," +
    Buffer.from(fs.readFileSync(new URL("./klein_ato.js", import.meta.url))).toString("base64")
);
const M = makeRelationalMemory(K);
let n = 0;
function ok(f) {
  f();
  n++;
}
const e = (a, b, y) => ({
  subject: "a",
  relation: "KNOWS",
  object: "b",
  negated: !!a,
  source: b,
  value: y ? 1 : -1,
  active: y,
});
const good = [e(0, 0, 1), e(0, 1, 0), e(1, 0, 0), e(1, 1, 1)];
ok(() => assert.equal(M.addRun(good, "first").events, 4));
ok(() => assert.equal(M.graph().edges[0].observations, 4));
ok(() => assert.equal(M.graph().nodes.length, 2));
ok(() => assert.deepEqual(M.project().truth, [1, 0, 0, 1]));
ok(() => assert.equal(M.train("negated", "derived", { epochs: 2500 }).training.status, "trained"));
ok(() => assert.throws(() => M.addRun(good, "first"), /Duplicate/));
ok(() => assert.throws(() => M.project("negated", "negated"), /distinct/));
const cp = M.checkpoint();
ok(() => assert.equal(M.restore(cp).runs, 1));
ok(() => assert.equal(M.addRun([e(0, 0, 0)], "second").total, 5));
ok(() => assert.equal(M.project().status, "conflicting-evidence"));
ok(() => assert.equal(M.train("negated", "derived").reason.includes("No weights updated"), true));
ok(() =>
  assert.throws(() => M.restore({ version: 1, runs: [{ id: "bad", events: [{}] }] }), /Invalid/),
);
console.log(`${n}/${n} relational memory tests passed`);
