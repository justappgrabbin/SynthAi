import { readFileSync } from "node:fs";
import { KleinComputer } from "./computer.mjs";
let ok = 0,
  bad = 0;
const t = (n, c, extra = "") => {
  c ? ok++ : bad++;
  console.log((c ? "  ok   " : "  FAIL ") + n + (extra ? "  -> " + extra : ""));
};

console.log("boot + run + write");
const kc = new KleinComputer().boot(readFileSync("./murder_mystery.msy", "utf8"));
kc.cpu.step("CALL", "messy.run");
const story = kc.cpu.step("CALL", "write", "->story");
const words = story
  .map((p) => p.text)
  .join(" ")
  .split(/\s+/).length;
t(
  "MESSY ran and the AutoNovel generator wrote paragraphs",
  story.length >= 3,
  `${story.length} paragraphs, ${words} words`,
);
t(
  'possessive rule from the writer: "John\'s lover"-style phrase',
  /\w+'s lover/.test(story.map((p) => p.text).join(" ")),
);
t(
  "the ATO kernel recorded the calls on its trace",
  kc.cpu.trace.length === 2 && kc.cpu.mem.story === story,
);

console.log("intake: a new word becomes something the computer can reason with and say");
kc.intake("SAILBOAT", { type: "N", grammar: 1, words: ["sailboat"] });
kc.intake("ADMIRE", { type: "R", grammar: 3, words: ["admire"] });
kc.intake("GLEAMING", { type: "R", grammar: 2, words: ["gleaming"] });
kc.tell("MARION", "ADMIRE", "SAILBOAT");
kc.tell("SAILBOAT", "GLEAMING");
const last = kc.write().at(-1).text;
t(
  "new verb is inflected by the writer's rules (admire -> admired)",
  /Marion admired (a|the) sailboat\./.test(last),
  last.slice(-80),
);
t("new adjective becomes a copula sentence", /sailboat was gleaming\./.test(last));
t(
  "MESSY can test the new fact in a subrule",
  kc.m.rt.found("MARION", "ADMIRE", "SAILBOAT", 0, true).ok,
);

console.log("the ATO reasons by analogy over the live network");
const k2 = new KleinComputer()
  .boot(`$NODES; KING 1 = 'KING'; QUEEN 1 = 'QUEEN'; MAN 1 = 'MAN'; WOMAN 1 = 'WOMAN';
$RELATIONS; MALE 2 0 = 'MALE'; FEMALE 2 0 = 'FEMALE'; RULES 3 0 = 'RULE';
$NETWORK; (KING MALE), (KING RULES), (QUEEN FEMALE), (QUEEN RULES), (MAN MALE), (WOMAN FEMALE);
$END;`);
const r = k2.cpu.step("CALL", "analogy", "KING", "QUEEN", "MAN");
t(
  "KING : QUEEN :: MAN : ?  =  WOMAN",
  r.answer[0] === "WOMAN" && r.answer[1] === 0,
  JSON.stringify(r.features) + " " + r.code,
);
k2.tell("MAN", "RULES");
const r2 = k2.analogy("MAN", "WOMAN", "KING");
t(
  "after (MAN RULES) is asserted the world changed: MAN : WOMAN :: KING : QUEEN",
  r2.answer[0] === "QUEEN",
  JSON.stringify(r2.ranked),
);

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
