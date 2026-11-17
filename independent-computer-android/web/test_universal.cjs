const test = require("node:test"),
  a = require("node:assert/strict"),
  u = require("./universal.js");
test("signatures", () => {
  for (const [b, f] of [
    [[0, 97, 115, 109], "wasm"],
    [[127, 69, 76, 70], "elf"],
    [[80, 75, 3, 4], "zip"],
    [[255, 0, 42], "binary"],
    [[65, 66], "text"],
  ])
    a.equal(u.identify(Uint8Array.from(b)), f);
});
test("machine arithmetic", () =>
  a.equal(
    u.rv32(Uint8Array.from([0x13, 5, 0x70, 0, 0x13, 5, 0x55, 0, 0x73, 0, 0x10, 0])).result,
    12,
  ));
test("instruction budget", () =>
  a.throws(() => u.rv32(Uint8Array.from([0x6f, 0, 0, 0]), { fuel: 8 }), /budget/));
test("unsupported syscall", () =>
  a.throws(() => u.rv32(Uint8Array.from([0x73, 0, 0, 0])), /System calls/));
test("native wasm", async () => {
  let b = Uint8Array.from([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 127, 3, 2, 1, 0, 7, 8, 1, 4, 109, 97, 105, 110,
    0, 0, 10, 6, 1, 4, 0, 65, 42, 11,
  ]);
  a.equal((await u.wasm(b, "main")).result, 42);
});
