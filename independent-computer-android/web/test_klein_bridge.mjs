import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { makeBridge } from "./klein-bridge.mjs";
const source = fs.readFileSync(new URL("./klein_ato.js", import.meta.url), "utf8");
const K = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const B = makeBridge(K);
let count = 0;
const check = (f) => {
  f();
  count++;
};
check(() =>
  assert.equal(B.analogize("101", "011", "110"), new K.ATO().solve("101", "011", "110").toString()),
);
check(() => assert.throws(() => B.analogize("10", "101", "10"), /width/));
check(() => assert.throws(() => B.analogize("10x", "101", "100"), /binary/));
const n = B.create(17);
const start = B.snapshot(n);
check(() => assert.equal(start.W1.length, 2));
const result = B.train(n, [1, 0, 0, 1], 2500, 0.5);
check(() => assert.ok(result.after >= 0.75, JSON.stringify(result)));
check(() => assert.notDeepEqual(B.snapshot(n).W1, start.W1));
const restored = B.restore(B.snapshot(n));
check(() => assert.deepEqual(B.snapshot(restored), B.snapshot(n)));
check(() => assert.deepEqual(restored.forward([1, 1]), n.forward([1, 1])));
check(() =>
  assert.throws(() => B.restore({ version: 1, H: 2, W1: [], b1: [], W2: [], b2: 0 }), /checkpoint/),
);
check(() => assert.throws(() => B.train(n, [1, 0], 20), /labels/));
console.log(`${count}/${count} Klein bridge tests passed`);
