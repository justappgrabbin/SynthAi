"""
Resonance Mission Advisor (RMA) -- the "Kim Possible" layer.

Ported from the gamification design doc's RMA framework:
  - Go/No-Go Resonance Check: don't hand out a mission if overall coherence
    is too low; recommend a recalibration mission instead.
  - Optimal Vector Action Prescriber: instead of naming a person's HD type,
    prescribe the *action* that works for their currently strongest field.
  - Friction Signature Diagnostic: name the *pattern* of resistance tied to
    their currently weakest field, framed as calibration, not failure.

Everything here is deterministic given (user_id, date, field_state) so the
same user gets the same mission all day, and a new one tomorrow -- no LLM
call, no randomness that can't be explained.
"""

from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Optional, Callable, Tuple
import hashlib

GO_NO_GO_THRESHOLD = 0.45

# Field -> Optimal Vector prescriptions (action-focused, not identity-focused).
# Multiple variants per field so the daily pick can rotate.
OPTIMAL_VECTORS: Dict[str, List[str]] = {
    "Mind": [
        "Write down the question before you look for the answer. Your Mind field is running hot enough to sharpen it alone.",
        "Teach what you know to one person today. Explaining it will finish the thought your Mind field already started.",
    ],
    "Heart": [
        "Say the thing you'd normally soften. Your Heart field has the charge to carry it honestly today.",
        "Make the ask you've been circling. This is a strong day for direct requests.",
    ],
    "Body": [
        "Start the physical task before you feel ready. Your Body field will catch up once you're moving.",
        "Do the thing with your hands today, not your head. Build, cook, move -- let the Body field lead.",
    ],
    "Will": [
        "Commit out loud to one thing you'll finish today. Your Will field holds follow-through well right now.",
        "Say no to one request that isn't yours to carry. Today's Will field supports a clean boundary.",
    ],
    "Shadow": [
        "Notice what you're avoiding without acting on it yet. Your Shadow field is showing you something real -- just observe it today.",
        "Write down the worst-case story you're telling yourself. Getting it out of your head lowers its charge.",
    ],
    "Child": [
        "Try the thing you haven't done before, badly, on purpose. Your Child field wants novelty more than mastery today.",
        "Ask a question you're embarrassed not to already know the answer to. Curiosity is well-supported today.",
    ],
    "Soul": [
        "Spend ten minutes on the project that has no deadline. Your Soul field is asking for something unmeasured.",
        "Revisit an old idea you shelved. Today's Soul field has range to reconsider it.",
    ],
    "Spirit": [
        "Do less today, on purpose. Your Spirit field moves slowly -- rushing it costs more than it saves.",
        "Sit with a question instead of resolving it. Not every open loop needs closing today.",
    ],
    "Synthesis": [
        "Connect two things you've been treating as separate. Your Synthesis field is primed to see the link.",
        "Explain your week to someone outside it. Saying it out loud will show you the pattern.",
    ],
}

# Field -> Friction Signature diagnostics (pattern-level, not failure-level).
FRICTION_SIGNATURES: Dict[str, List[str]] = {
    "Mind": [
        "Signature of Mental Overreach -- you're trying to think your way through something that needs to be felt or tested first.",
        "Signature of Analysis Loop -- the same question is circling without new input. More thinking won't resolve it; more data will.",
    ],
    "Heart": [
        "Signature of Withheld Ask -- something isn't being said directly, and it's costing more energy to hold than to voice.",
        "Signature of Borrowed Urgency -- someone else's timeline is running through your Heart field today. Check whose deadline this actually is.",
    ],
    "Body": [
        "Signature of Forced Motion -- pushing a task before the body's actually ready produces friction, not progress, today.",
        "Signature of Restlessness Without Direction -- the energy is real but unaimed. Pick one small physical task before it dissipates.",
    ],
    "Will": [
        "Signature of Overcommitment -- more has been agreed to than can be carried cleanly today.",
        "Signature of Forced Willpower -- pushing through by sheer force instead of finding the smaller next step.",
    ],
    "Shadow": [
        "Signature of Suppressed Pattern -- something uncomfortable is being managed instead of examined. Naming it costs less than carrying it.",
    ],
    "Child": [
        "Signature of Premature Seriousness -- treating a low-stakes moment like a high-stakes one. Some room to play would relieve this.",
    ],
    "Soul": [
        "Signature of Identity Pressure -- trying to prove something about who you are instead of just doing the next real thing.",
    ],
    "Spirit": [
        "Signature of Rushed Stillness -- trying to force calm on a schedule instead of letting it arrive.",
    ],
    "Synthesis": [
        "Signature of Scattered Threads -- too many open loops at once, none of them getting the attention that would close them.",
    ],
}

RECALIBRATION_MISSIONS = [
    "Recalibration mission: do nothing goal-directed for 20 minutes. No podcast, no scrolling -- just let the field settle.",
    "Recalibration mission: name three things that are actually fine right now. Coherence often drops from an inflated sense of what's wrong.",
    "Recalibration mission: move your body for 10 minutes with no productivity goal attached. Let it discharge, not perform.",
]


@dataclass
class MissionBrief:
    date: str
    go: bool
    coherence: float
    strongest_field: str
    weakest_field: str
    optimal_vector: str
    optimal_vector_index: int  # which variant was shown -- needed to attribute
                                # tomorrow's outcome back to THIS specific text,
                                # not just "the Mind field in general"
    friction_signature: str
    mission_text: str
    recalibration: str | None


def _daily_pick(options: List[str], seed_key: str) -> Tuple[str, int]:
    """Deterministic per-day, per-user pick -- same mission all day, new one
    tomorrow. Returns (text, index) so the caller can track which variant
    was shown."""
    h = int(hashlib.sha256(seed_key.encode()).hexdigest(), 16)
    idx = h % len(options)
    return options[idx], idx


# A pattern_lookup is (field_type, action_type) -> object with .mean_delta
# and .n, or None if there's not enough evidence yet. Duck-typed on purpose
# so this module never has to import outcome_learning.py directly -- same
# dependency-injection shape as hub_sync.py/mesh_broadcast.py use elsewhere
# this session.
PatternLookup = Callable[[str, str], Optional[object]]


def _evidence_weighted_pick(options: List[str], seed_key: str, field_type: str,
                             pattern_lookup: Optional[PatternLookup]) -> Tuple[str, int]:
    """The post-deterministic / pre-probabilistic pick.

    Pre-evidence: falls back to the pure hash pick -- every variant equally
    likely, nothing learned yet. That's ordinary determinism.

    Post-evidence: once at least two variants have enough recorded outcomes
    (checked via pattern_lookup, which enforces its own floor -- this
    function has no opinion on what that floor should be), deterministically
    picks whichever variant has the best real mean_delta. Ties fall back to
    the hash pick among the tied variants, so it stays reproducible.

    This NEVER samples from a distribution and NEVER expresses a
    probability -- the output is always one specific, deterministic choice.
    That's the actual line between "informed by real outcomes" and "acting
    probabilistic": no randomness ever touches the final decision, only the
    facts that inform it change over time.
    """
    if pattern_lookup is None:
        return _daily_pick(options, seed_key)

    scored: List[Tuple[int, float]] = []
    for i in range(len(options)):
        stats = pattern_lookup(field_type, f"optimal_vector_variant_{i}")
        if stats is not None:
            scored.append((i, stats.mean_delta))

    if len(scored) < 2:
        # Not enough variants have evidence yet to meaningfully compare --
        # stay in pure-deterministic mode rather than acting on a single
        # data point as if it settled anything.
        return _daily_pick(options, seed_key)

    best_delta = max(s[1] for s in scored)
    tied = [i for i, d in scored if d == best_delta]
    if len(tied) == 1:
        idx = tied[0]
    else:
        # Genuine tie in the evidence -- break it the same deterministic
        # way as the no-evidence case, restricted to the tied options.
        h = int(hashlib.sha256(seed_key.encode()).hexdigest(), 16)
        idx = tied[h % len(tied)]

    return options[idx], idx


def generate_mission(user_id: str, field_state: Dict[str, "FieldState"], coherence: float,
                      for_date: date | None = None,
                      pattern_lookup: Optional[PatternLookup] = None) -> MissionBrief:
    d = (for_date or date.today()).isoformat()
    seed_base = f"{user_id}:{d}"

    ranked = sorted(field_state.items(), key=lambda kv: kv[1].coherence, reverse=True)
    strongest_field, _ = ranked[0]
    weakest_field, _ = ranked[-1]

    ov_options = OPTIMAL_VECTORS.get(strongest_field, ["Trust what's already working today."])
    optimal_vector, ov_index = _evidence_weighted_pick(ov_options, seed_base + ":ov", strongest_field, pattern_lookup)

    friction_signature, _ = _daily_pick(
        FRICTION_SIGNATURES.get(weakest_field, ["Signature of General Friction -- something is off but not yet named."]),
        seed_base + ":fs",
    )

    go = coherence >= GO_NO_GO_THRESHOLD

    if go:
        mission_text = f"{optimal_vector}"
        recalibration = None
    else:
        mission_text, _ = _daily_pick(RECALIBRATION_MISSIONS, seed_base + ":recal")
        recalibration = mission_text

    return MissionBrief(
        date=d, go=go, coherence=coherence,
        strongest_field=strongest_field, weakest_field=weakest_field,
        optimal_vector=optimal_vector, optimal_vector_index=ov_index,
        friction_signature=friction_signature,
        mission_text=mission_text, recalibration=recalibration,
    )
