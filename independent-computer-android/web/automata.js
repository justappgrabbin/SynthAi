/* Independent main-thread cooperative automata; no workers, eval or backend. */
(function (root) {
  "use strict";
  class Mesh {
    constructor({ quantum = 12, notify = () => {} } = {}) {
      this.quantum = quantum;
      this.notify = notify;
      this.jobs = new Map();
      this.events = [];
      this.cursor = 0;
      this.active = false;
      this.timer = null;
      this.sequence = 0;
    }
    add({ id, kind, depends = [], step, data = {} }) {
      if (!id || this.jobs.has(id) || typeof step !== "function")
        throw Error("Invalid or duplicate job");
      if (depends.includes(id)) throw Error("Self dependency");
      const job = {
        id,
        kind,
        depends: [...depends],
        step,
        data,
        status: "waiting",
        ticks: 0,
        result: null,
        error: null,
      };
      this.jobs.set(id, job);
      this.emit("registered", id);
      return job;
    }
    emit(type, id, detail) {
      const event = { seq: ++this.sequence, type, id, detail: detail ?? null };
      this.events.push(event);
      if (this.events.length > 250) this.events.shift();
      this.notify(event);
    }
    eligible() {
      for (const j of this.jobs.values()) {
        if (j.status !== "waiting") continue;
        const deps = j.depends.map((id) => this.jobs.get(id));
        if (deps.some((d) => !d || ["failed", "cancelled", "blocked"].includes(d.status))) {
          j.status = "blocked";
          j.error = "Missing or failed dependency";
          this.emit("blocked", j.id);
          continue;
        }
        if (deps.every((d) => d.status === "done")) j.status = "ready";
      }
      return [...this.jobs.values()].filter((j) => j.status === "ready");
    }
    tick() {
      let ready = this.eligible();
      if (!ready.length) return false;
      const j = ready[this.cursor++ % ready.length];
      try {
        const r = j.step(j.data, this);
        j.ticks++;
        if (r && typeof r.then === "function")
          throw Error("Steps must be synchronous and bounded; use stateful slices");
        if (r && r.done) {
          j.status = "done";
          j.result = r.result ?? null;
          this.emit("done", j.id, j.result);
        } else {
          this.emit("progress", j.id, { ticks: j.ticks, progress: r?.progress ?? null });
        }
      } catch (e) {
        j.status = "failed";
        j.error = String(e.message || e);
        this.emit("failed", j.id, j.error);
      }
      return true;
    }
    start() {
      if (this.active) return;
      this.active = true;
      this.emit("started", "mesh");
      const run = () => {
        if (!this.active) return;
        const start = performance.now();
        let n = 0;
        while (n < 25 && performance.now() - start < this.quantum && this.tick()) n++;
        if (!this.eligible().length) {
          this.active = false;
          this.emit("idle", "mesh");
          return;
        }
        this.timer = setTimeout(run, 0);
      };
      this.timer = setTimeout(run, 0);
    }
    pause() {
      this.active = false;
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = null;
      this.emit("paused", "mesh");
    }
    cancel(id) {
      const j = this.jobs.get(id);
      if (!j || ["done", "failed", "cancelled"].includes(j.status)) return false;
      j.status = "cancelled";
      this.emit("cancelled", id);
      return true;
    }
    snapshot() {
      return {
        version: 1,
        jobs: [...this.jobs.values()].map(({ step, ...j }) => j),
        events: this.events,
        sequence: this.sequence,
      };
    }
    restore(snapshot, stepFactory) {
      if (this.active) throw Error("Pause before restore");
      if (snapshot?.version !== 1 || !Array.isArray(snapshot.jobs))
        throw Error("Invalid checkpoint");
      this.jobs.clear();
      for (const saved of snapshot.jobs) {
        const step = stepFactory(saved.kind);
        if (typeof step !== "function") throw Error("Unknown job kind: " + saved.kind);
        this.jobs.set(saved.id, {
          ...saved,
          step,
          status: saved.status === "ready" ? "waiting" : saved.status,
        });
      }
      this.events = snapshot.events || [];
      this.sequence = snapshot.sequence || 0;
      this.emit("restored", "mesh");
    }
  }
  const api = { Mesh };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Automata = api;
})(globalThis);
