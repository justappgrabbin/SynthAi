import assert from "node:assert/strict";
import fs from "node:fs";
import { makeSemanticLearner } from "./semantic-neural.mjs";
const src = fs.readFileSync(new URL("./klein_ato.js", import.meta.url), "utf8");
const K = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
const L = makeSemanticLearner(K);
let n = 0;
const ok = (f) => {
  f();
  n++;
};
const make = (a, b, y) => ({ negated: !!a, source: b, active: y });
const good = [make(0, 0, 1), make(0, 1, 0), make(1, 0, 0), make(1, 1, 1)];
ok(() => assert.deepEqual(L.dataset(good).truth, [1, 0, 0, 1]));
ok(() => assert.equal(L.train(good, { epochs: 2500 }).status, "trained"));
const trained = L.train(good, { epochs: 2500 });
ok(() => assert.ok(trained.after >= 0.75));
ok(() => assert.deepEqual(L.restore(trained.checkpoint).W1, trained.checkpoint.W1));
ok(() => assert.equal(L.train(good.slice(0, 3)).status, "insufficient-evidence"));
ok(() => assert.equal(L.train([...good, make(0, 0, 0)]).status, "conflicting-evidence"));
ok(() => assert.throws(() => L.extract({}), /MESSY/));
ok(() =>
  assert.equal(
    L.extract({
      machine: { out: [{ time: 1, entries: [{ s: "A", r: "KNOWS", o: "B", src: 0, val: 1 }] }] },
    })[0].active,
    1,
  ),
);
console.log(`${n}/${n} semantic-neural tests passed`);
