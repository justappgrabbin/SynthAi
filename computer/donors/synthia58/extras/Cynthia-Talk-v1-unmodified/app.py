from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json, os, re, math, datetime as dt

app = Flask(__name__, static_url_path='', static_folder='static')
CORS(app)

# --- Tiny "reasoner" ---
def normalize(s): return re.sub(r"\s+", " ", s.strip().lower())

def explain_messy_room():
    return [
        "Visual noise raises baseline stress via constant micro-evaluations your brain has to do.",
        "It eats working memory. Clutter = more context switches = fatigue = irritability.",
        "It violates implicit territory rules: shared space feels 'claimed' by objects, not people.",
        "It blocks restorative cues. Your nervous system can’t find 'done' or 'safe' signals.",
        "So your body flags 'threat/unfinished' all day — hence the itch and the snaps."
    ]

def relationship_levers():
    return [
        "Define 'sacred surfaces' — two always-clear zones per person. Non‑negotiable reset nightly.",
        "Set a 15‑minute 'closing ritual' together. Pick: tidy, tea, stretch, gratitude, plan‑tomorrow.",
        "Weekly 'Ops Review': money, logistics, energy levels, one ask each, one appreciation each.",
        "Conflict contract: slow start (kind preface), single topic, time‑boxed, decision + next step.",
        "Swap autonomy tokens: each person gets 2 per week to unilaterally green‑light a small thing."
    ]

KB = {
  "human_design_overview": [
    "Human Design blends I Ching (64 hexagrams), astrology, Kabbalah tree, and chakral centers.",
    "Nine Centers: Head, Ajna, Throat, G (Identity), Ego/Will, Spleen (instinct), Solar Plexus (emotion), Sacral (life‑force), Root (pressure).",
    "Strategy/Authority: work *with* your type and inner authority instead of mind‑only decisioning."
  ],
  "iching_overview": [
    "I Ching is 64 binary patterns (hexagrams). Each encodes a situation dynamic and a way to move through it.",
    "Think 'state machine' for human contexts: tension → choice → transformation."
  ],
  "field_resonance": [
    "Mind (electromagnetic perception), Body (gravity/embodiment), Heart (plasma alignment).",
    "Resonance = coherence across these three streams. You feel flow when they agree.",
    "Collapse engine: when choices compete, route to the option with max combined coherence, not popularity."
  ],
  "quantum_basics": [
    "Quantum ≈ systems where energy comes in packets and observation changes distributions, not magic.",
    "Superposition: multiple potential states exist until interaction selects an outcome (measurement).",
    "Entanglement: correlated systems act like one math object even when separated."
  ]
}

def plan_route_to_success(context):
    # Simple structured plan generator
    today = dt.date.today().isoformat()
    return {
        "start_date": today,
        "pillars": [
            {"name":"Focus", "moves":[
                "Decide the single flagship outcome for the next 6 weeks.",
                "Create a Do/Defer/Drop list. Ruthlessly cut 40%.",
                "Daily 90‑minute Deep Work block. Phone in airplane mode."
            ]},
            {"name":"Money", "moves":[
                "Define one offer. One page. One price. One CTA.",
                "Ship a tiny demo this week; collect 3 testimonials.",
                "Open a weekly sales hour: outreach → calls → close → invoice."
            ]},
            {"name":"Energy", "moves":[
                "Morning sunlight + movement 15 minutes.",
                "Protein‑forward meals; water on desk; caffeine before noon.",
                "Evening shutdown ritual (see relationship levers)."
            ]}
        ],
        "cadence":[
            "Daily: deep work + tiny ship + check pipeline.",
            "Weekly: Ops Review + calendar reset + finance snapshot.",
            "Monthly: pick the next 6‑week flagship if done; otherwise continue."
        ]
    }

def intent_router(msg:str):
    s = normalize(msg)
    out = []
    if any(k in s for k in ["human design","design chart","nine centers","authority","strategy"]):
        out += KB["human_design_overview"]
    if any(k in s for k in ["i ching","iching","hexagram"]):
        out += KB["iching_overview"]
    if any(k in s for k in ["resonance","field","trinity","collapse"]):
        out += KB["field_resonance"]
    if any(k in s for k in ["quantum","wave","entangle","superposition"]):
        out += KB["quantum_basics"]
    if any(k in s for k in ["messy room","room messy","clutter","why is his room"]):
        out += ["Why the messy room bugs you:"] + explain_messy_room()
    if any(k in s for k in ["relationship","together","us best","utilize"]):
        out += ["How to utilize the relationship for the best:"] + relationship_levers()
    if any(k in s for k in ["route to success","plan to win","next steps", "what do we do"]):
        out += ["Your near‑term route to success:", json.dumps(plan_route_to_success(s), indent=2)]
    if not out:
        out = ["Ask me about Human Design, I Ching, field resonance, quantum basics, messy‑room dynamics, relationship levers, or your route to success."]
    return out

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True) or {}
    msg = data.get("message","")
    name = data.get("name","")
    # Very simple contextual flourish
    preface = f"{name}, here's the straight shot:" if name else "Here's the straight shot:"
    chunks = intent_router(msg)
    return jsonify({"reply": preface + "\n- " + "\n- ".join(chunks)})

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory("static", path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860)
