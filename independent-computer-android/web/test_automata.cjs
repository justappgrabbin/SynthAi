const assert = require("node:assert/strict");
const { Mesh } = require("./automata");
let n = 0;
function t(f) {
  f();
  n++;
}
t(() => {
  const m = new Mesh();
  m.add({
    id: "a",
    kind: "count",
    step: (d) => {
      d.x = (d.x || 0) + 1;
      return { done: d.x === 3, result: d.x };
    },
  });
  m.add({ id: "b", kind: "count", depends: ["a"], step: () => ({ done: true, result: 7 }) });
  assert.equal(m.tick(), true);
  assert.equal(m.jobs.get("b").status, "waiting");
  m.tick();
  m.tick();
  m.tick();
  assert.equal(m.jobs.get("b").result, 7);
});
t(() => {
  const m = new Mesh();
  m.add({ id: "a", kind: "x", depends: ["missing"], step: () => ({ done: true }) });
  assert.equal(m.tick(), false);
  assert.equal(m.jobs.get("a").status, "blocked");
});
t(() => {
  const m = new Mesh();
  m.add({
    id: "a",
    kind: "x",
    step: () => {
      throw Error("bad");
    },
  });
  m.add({ id: "b", kind: "x", depends: ["a"], step: () => ({ done: true }) });
  m.tick();
  m.tick();
  assert.equal(m.jobs.get("a").status, "failed");
  assert.equal(m.jobs.get("b").status, "blocked");
});
t(() => {
  const m = new Mesh();
  m.add({
    id: "a",
    kind: "count",
    data: { x: 0 },
    step: (d) => {
      d.x++;
      return { done: d.x === 2, result: d.x };
    },
  });
  m.tick();
  const snap = JSON.parse(JSON.stringify(m.snapshot()));
  const next = new Mesh();
  next.restore(snap, () => (d) => {
    d.x++;
    return { done: d.x === 2, result: d.x };
  });
  next.tick();
  assert.equal(next.jobs.get("a").result, 2);
});
t(() => {
  const m = new Mesh();
  m.add({ id: "a", kind: "x", step: () => ({ done: true }) });
  assert.equal(m.cancel("a"), true);
  assert.equal(m.tick(), false);
});
t(() => {
  const m = new Mesh();
  m.add({ id: "a", kind: "x", step: () => ({ done: true }) });
  m.tick();
  assert.equal(m.events.at(-1).type, "done");
});
console.log(`Automata ${n}/${n} tests passed`);
