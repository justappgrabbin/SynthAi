const assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm");
const c = { module: { exports: {} }, globalThis: {}, TextEncoder, TextDecoder, Uint8Array, Blob };
vm.runInNewContext(fs.readFileSync(__dirname + "/project-intake.js", "utf8"), c);
const p = c.module.exports;
assert.equal(p.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
assert.throws(() => p.normalize("../evil"));
assert.equal(
  p.connections([
    { path: "src/a.js", text: "import x from './b.js'" },
    { path: "src/b.js", text: "export default 1" },
  ]).edges.length,
  1,
);
const blob = p.zip([
  { path: "a.txt", text: "hello" },
  { path: "b.bin", bytes: new Uint8Array([0, 255, 3]) },
]);
blob.arrayBuffer().then((b) => {
  fs.writeFileSync("/tmp/independent-project-intake-test.zip", Buffer.from(b));
  console.log("Project intake tests passed");
});
