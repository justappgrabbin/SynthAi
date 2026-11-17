/*
 * computer.mjs — the Klein computer: three existing pieces, one machine.
 *
 *   messy.js               the computer: semantic network, classes, clock, rules (MESSY 1976)
 *   klein_ato.js           the processor: ATO analogy, feature codes, neural nets, tool bus
 *   klein-novel-writer.js  the writer: the 1973 AutoNovel generator (grammar, inflection, style)
 *
 * None of the three files is modified. This file only connects them:
 *   - MESSY's atoms and lexical lists are translated into the writer's lexicon, so the
 *     writer can narrate MESSY's change stack.
 *   - The ATO kernel gets tools that read MESSY's network (analogy over what is true now).
 *   - intake() adds a new word to MESSY and the writer's dictionary at the same time.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { SemanticComputer, FeatureSpace, ATO } from "./klein_ato.js";

const require = createRequire(import.meta.url);
const MESSY = require("./messy.js");
const NW = require("./klein-novel-writer.js");
const { PROGRAM: MYSTERY } = require("./murder-mystery.js");

// the writer's irregular-verb dictionary, reused from the murder-mystery program
const DICT_BLOCK = MYSTERY.slice(MYSTERY.indexOf("$DICTIONARY"), MYSTERY.indexOf("$RELATIONS"));

export class KleinComputer {
  constructor({ seed = 1973 } = {}) {
    this.seed = seed;
    this.cpu = new SemanticComputer({ ato: new ATO("xnor") });
    this.m = null;
    this.writer = null;
    this.registerTools();
  }

  // ---------------------------------------------------------------- boot
  boot(programText) {
    this.m = MESSY.compile(programText);
    this.writer = new NW.NovelWriter({ seed: this.seed });
    NW.compile(DICT_BLOCK + "\n$END;", this.writer);
    for (const a of this.m.atoms.values()) this.teachWriter(a.name);
    return this;
  }

  // translate one MESSY atom into the writer's lexicon
  teachWriter(name) {
    const m = this.m,
      w = this.writer,
      a = m.atoms.get(name);
    if (!a) return;
    const words = (m.state.lex.get(name) || [])
      .map((it) => (it.str != null ? it.str : this.lexTriple(it.trp)))
      .filter(Boolean);
    if (a.type === "N") {
      const kind = a.g1 === 0 ? "P" : a.g1 === 1 ? "N" : "M";
      const nd = w.net.node(name);
      nd.lex = (words.length ? words : [name]).map((t) => ({
        kind,
        text: kind === "P" ? titleCase(t) : t.toLowerCase(),
      }));
      w.dict.learnNode(nd);
    } else {
      const type = a.g1 === 2 ? "A" : a.g1 === 4 ? "P" : a.g1 === 5 ? "S" : "T";
      const lex = a.numLex
        ? []
        : (words.length ? words : []).map((t) => (type === "A" ? "BE " + t : t).toUpperCase());
      const R = { id: w.net.nextId++, name, type, flags: new Set(), lex, scale: [] };
      w.net.relations.set(name, R);
      w.dict.learnRelation(R);
    }
  }
  lexTriple(trp) {
    return trp
      .filter(Boolean)
      .map((x) => {
        const l = (this.m.state.lex.get(x) || [])[0];
        return l && l.str != null ? l.str : x;
      })
      .join(" ");
  }

  // numeric relations: MESSY picks the word band (§5.2); the writer gets that word as a plain relation
  bandRelation(r, value) {
    const word = this.m.word(r, value, 0);
    if (!word) return null;
    const a = this.m.atoms.get(r);
    const key = `${r}#${word.text.toUpperCase().replace(/\s+/g, "_")}`;
    if (!this.writer.net.relations.has(key)) {
      const type = a.g1 === 2 ? "A" : "T";
      const R = {
        id: this.writer.net.nextId++,
        name: key,
        type,
        flags: new Set(),
        lex: [(type === "A" ? "BE " : "") + word.text.toUpperCase()],
        scale: [],
      };
      this.writer.net.relations.set(key, R);
      this.writer.dict.learnRelation(R);
    }
    return key;
  }

  // ---------------------------------------------------------------- run + write
  run() {
    this.result = this.m.run();
    return this;
  }
  // MESSY change stack -> AutoNovel generator, one paragraph per time block
  write() {
    const g = this.writer.gen,
      out = [];
    for (const b of this.m.out) {
      const entries = [];
      for (const e of b.entries) {
        if (e.src !== 0) continue;
        const r = this.m.atoms.get(e.r).numLex ? this.bandRelation(e.r, e.val) : e.r;
        if (!r) continue;
        // secondaries that modify the verb (LOVE WITH PASSION) or the object (LOVER POS JOHN) stay attached;
        // any other secondary is a fact of its own and is narrated as its own sentence after the primary
        const secs = b.entries.filter((x) => x.par === e.seq && x.src === 4);
        const attached = secs.filter(
          (x) => x.s === e.r || (x.s === e.o && (this.m.atoms.get(x.r) || {}).g1 === 5),
        );
        entries.push({
          kind: e.neg ? "del" : "set",
          s: e.s,
          r,
          o: e.o,
          value: null,
          secondary: attached.map((x) => [x.s, x.r, x.o].filter(Boolean)),
        });
        for (const x of secs)
          if (!attached.includes(x))
            entries.push({ kind: "set", s: x.s, r: x.r, o: x.o, value: null, secondary: [] });
      }
      const sents = g.narrate(entries, b.time);
      if (sents.length) out.push({ time: this.m.fmtTime(b.time), text: sents.join(" ") });
    }
    return out;
  }

  // ---------------------------------------------------------------- intake (AUTOLING entry point)
  // A new word enters both MESSY (as an atom it can reason with) and the writer (as vocabulary).
  intake(name, { type = "N", grammar = 1, words = [] } = {}) {
    const m = this.m;
    name = m.norm(name.toUpperCase());
    m.defineAtom(name, type, type === "R" ? { g1: grammar, g2: 0 } : { g1: grammar });
    m.state.lex.set(
      name,
      words.map((w) => ({ str: w.toUpperCase() })),
    );
    this.teachWriter(name);
    return name;
  }
  // assert a fact into the running world, as a rule action would
  tell(s, r, o = null) {
    const rt = this.m.rt;
    return rt.assertPrimary(s, r, o, 0, true);
  }

  // ---------------------------------------------------------------- the processor's view of the world
  // Feature code of a node = which (relation, object) facts it is the subject of right now.
  featureSpace(nodes) {
    const facts = new Set();
    for (const t of this.m.state.net.values())
      if (t.asserted && nodes.includes(t.s)) facts.add(t.r + (t.o ? ":" + t.o : ""));
    const fs = new FeatureSpace([...facts].sort());
    for (const n of nodes) {
      const on = [...this.m.state.net.values()]
        .filter((t) => t.asserted && t.s === n)
        .map((t) => t.r + (t.o ? ":" + t.o : ""));
      fs.define(n, fs.encode(...on));
    }
    return fs;
  }
  // A is to B as C is to ?  — answered by the ATO over the live network
  analogy(a, b, c, pool) {
    const nodes =
      pool || [...this.m.atoms.values()].filter((x) => x.type === "N").map((x) => x.name);
    const fs = this.featureSpace(nodes);
    if (!fs.n) return null;
    const d = this.cpu.ato.solve(fs.concepts[a], fs.concepts[b], fs.concepts[c]);
    const ranked = fs.nearest(d, nodes.length).filter(([n]) => ![a, b, c].includes(n));
    return {
      code: String(d),
      features: fs.decode(d),
      answer: ranked[0],
      ranked: ranked.slice(0, 3),
    };
  }

  registerTools() {
    this.cpu.register("messy.run", (cpu) => {
      this.run();
      return this.result.stopReason;
    });
    this.cpu.register("write", () => this.write());
    this.cpu.register("analogy", (cpu, a, b, c, pool) => this.analogy(a, b, c, pool));
    this.cpu.register("intake", (cpu, name, opts) => this.intake(name, opts));
  }
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s.-])([a-z])/g, (x, p, c) => p + c.toUpperCase());
}

// ---------------------------------------------------------------- start the computer
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2] || new URL("./murder_mystery.msy", import.meta.url).pathname;
  const kc = new KleinComputer().boot(readFileSync(file, "utf8"));
  console.log(
    `booted: ${kc.m.atoms.size} atoms, ${kc.m.groups.size} groups, clock at ${kc.m.fmtTime(kc.m.state.now)}`,
  );
  console.log("run   :", kc.cpu.step("CALL", "messy.run"));
  console.log("\n--- written by the AutoNovel generator from the MESSY change stack ---");
  for (const p of kc.cpu.step("CALL", "write")) console.log(`[${p.time}] ${p.text}\n`);
}
