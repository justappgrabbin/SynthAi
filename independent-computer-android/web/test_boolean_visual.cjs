const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const c = { Uint8Array, Uint8ClampedArray };
c.globalThis = c;
vm.createContext(c);
vm.runInContext(fs.readFileSync(__dirname + "/boolean-visual.js", "utf8"), c);
const b = c.BooleanVisual;
let n = 0;
function test(f) {
  f();
  n++;
}
const src = new Uint8ClampedArray([
  255, 0, 130, 255, 0, 255, 0, 255, 127, 128, 255, 0, 255, 255, 255, 255,
]);
const a = b.encode(src, 2, 2);
test(() => assert.equal(a.channels[0].length, 1));
test(() =>
  assert.deepEqual(
    Array.from(b.decode(a)),
    [255, 0, 255, 255, 0, 255, 0, 255, 0, 255, 255, 0, 255, 255, 255, 255],
  ),
);
test(() => assert.equal(b.count(a.channels[0], 4), 2));
test(() => assert.equal(b.difference(a, a).pixels, 0));
const src2 = src.slice();
src2[0] = 0;
const z = b.encode(src2, 2, 2);
test(() => assert.equal(b.difference(a, z).pixels, 1));
test(() => assert.equal(b.difference(a, z).channelChanges, 1));
const mask = new Uint8Array([1]);
test(() => assert.deepEqual(Array.from(b.decode(b.overlay(a, z, mask))), Array.from(b.decode(z))));
test(() =>
  assert.deepEqual(Array.from(b.decode(b.deserialize(b.serialize(a)))), Array.from(b.decode(a))),
);
test(() => assert.throws(() => b.encode([], 2, 2), /RGBA/));
test(() => assert.throws(() => b.encode(src, 0, 2), /dimensions/));
test(() => assert.throws(() => b.difference(a, b.encode(src, 1, 4)), /dimensions/));
test(() =>
  assert.throws(() => b.deserialize({ width: 2, height: 2, channels: [], alpha: [] }), /Invalid/),
);
console.log("Boolean visual " + n + "/" + n + " passed");
