function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function todayLocal() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function explainMessyRoom() {
  return [
    "Visual noise raises baseline stress via constant micro-evaluations your brain has to do.",
    "It eats working memory. Clutter = more context switches = fatigue = irritability.",
    "It violates implicit territory rules: shared space feels 'claimed' by objects, not people.",
    "It blocks restorative cues. Your nervous system can’t find 'done' or 'safe' signals.",
    "So your body flags 'threat/unfinished' all day — hence the itch and the snaps."
  ];
}

function relationshipLevers() {
  return [
    "Define 'sacred surfaces' — two always-clear zones per person. Non‑negotiable reset nightly.",
    "Set a 15‑minute 'closing ritual' together. Pick: tidy, tea, stretch, gratitude, plan‑tomorrow.",
    "Weekly 'Ops Review': money, logistics, energy levels, one ask each, one appreciation each.",
    "Conflict contract: slow start (kind preface), single topic, time‑boxed, decision + next step.",
    "Swap autonomy tokens: each person gets 2 per week to unilaterally green‑light a small thing."
  ];
}

const KB = {
  human_design_overview: [
    "Human Design blends I Ching (64 hexagrams), astrology, Kabbalah tree, and chakral centers.",
    "Nine Centers: Head, Ajna, Throat, G (Identity), Ego/Will, Spleen (instinct), Solar Plexus (emotion), Sacral (life‑force), Root (pressure).",
    "Strategy/Authority: work *with* your type and inner authority instead of mind‑only decisioning."
  ],
  iching_overview: [
    "I Ching is 64 binary patterns (hexagrams). Each encodes a situation dynamic and a way to move through it.",
    "Think 'state machine' for human contexts: tension → choice → transformation."
  ],
  field_resonance: [
    "Mind (electromagnetic perception), Body (gravity/embodiment), Heart (plasma alignment).",
    "Resonance = coherence across these three streams. You feel flow when they agree.",
    "Collapse engine: when choices compete, route to the option with max combined coherence, not popularity."
  ],
  quantum_basics: [
    "Quantum ≈ systems where energy comes in packets and observation changes distributions, not magic.",
    "Superposition: multiple potential states exist until interaction selects an outcome (measurement).",
    "Entanglement: correlated systems act like one math object even when separated."
  ]
};

function planRouteToSuccess() {
  return {
    start_date: todayLocal(),
    pillars: [
      { name: "Focus", moves: [
        "Decide the single flagship outcome for the next 6 weeks.",
        "Create a Do/Defer/Drop list. Ruthlessly cut 40%.",
        "Daily 90‑minute Deep Work block. Phone in airplane mode."
      ]},
      { name: "Money", moves: [
        "Define one offer. One page. One price. One CTA.",
        "Ship a tiny demo this week; collect 3 testimonials.",
        "Open a weekly sales hour: outreach → calls → close → invoice."
      ]},
      { name: "Energy", moves: [
        "Morning sunlight + movement 15 minutes.",
        "Protein‑forward meals; water on desk; caffeine before noon.",
        "Evening shutdown ritual (see relationship levers)."
      ]}
    ],
    cadence: [
      "Daily: deep work + tiny ship + check pipeline.",
      "Weekly: Ops Review + calendar reset + finance snapshot.",
      "Monthly: pick the next 6‑week flagship if done; otherwise continue."
    ]
  };
}

function intentRouter(message) {
  const text = normalize(message);
  const out = [];

  if (includesAny(text, ["human design", "design chart", "nine centers", "authority", "strategy"])) {
    out.push(...KB.human_design_overview);
  }
  if (includesAny(text, ["i ching", "iching", "hexagram"])) {
    out.push(...KB.iching_overview);
  }
  if (includesAny(text, ["resonance", "field", "trinity", "collapse"])) {
    out.push(...KB.field_resonance);
  }
  if (includesAny(text, ["quantum", "wave", "entangle", "superposition"])) {
    out.push(...KB.quantum_basics);
  }
  if (includesAny(text, ["messy room", "room messy", "clutter", "why is his room"])) {
    out.push("Why the messy room bugs you:", ...explainMessyRoom());
  }
  if (includesAny(text, ["relationship", "together", "us best", "utilize"])) {
    out.push("How to utilize the relationship for the best:", ...relationshipLevers());
  }
  if (includesAny(text, ["route to success", "plan to win", "next steps", "what do we do"])) {
    out.push("Your near‑term route to success:", JSON.stringify(planRouteToSuccess(), null, 2));
  }
  if (!out.length) {
    out.push("Ask me about Human Design, I Ching, field resonance, quantum basics, messy‑room dynamics, relationship levers, or your route to success.");
  }
  return out;
}

let input = {};
try {
  input = JSON.parse(process.argv[2] ?? '{}');
} catch {
  process.stderr.write('Invalid Talk JSON input\n');
  process.exit(2);
}

const message = String(input.message ?? '');
const name = String(input.name ?? '');
if (!message.trim()) {
  process.stderr.write('Talk message is required\n');
  process.exit(2);
}
if (message.length > 16000 || name.length > 200) {
  process.stderr.write('Talk input is too long\n');
  process.exit(2);
}

const preface = name ? `${name}, here's the straight shot:` : "Here's the straight shot:";
const reply = preface + "\n- " + intentRouter(message).join("\n- ");
process.stdout.write(JSON.stringify({ reply }) + "\n");
