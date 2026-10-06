"""
AUTOLING -- Parser & Pipeline Engine (Klein Tool #1), ported faithfully
from synthia-os/autoling.ts.

This is the one Klein-tool port that's actually real: a deterministic
regex tokenizer + rule-based domain/intent classifier. No random vectors,
no mocked sources -- unlike DISEMINER and AUTONOVEL in the same codebase,
which were left out of this port because their "semantic" outputs are
literally np.random-equivalent noise dressed up as inference.

Used here for one honest job: turning a free-text daily check-in note into
suggested resonance tags, instead of asking the user to hand-pick from an
unranked list of 15.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List
import re

TOKEN_RE = re.compile(
    r"\s+|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_][a-zA-Z0-9_]*\b|[{}\[\]();,]"
)

# Same domain grammars as autoling.ts, minus the code/command-specific ones
# that don't apply to a journaling note.
INTENT_PATTERNS: Dict[str, re.Pattern] = {
    "reflection": re.compile(r"\b(felt|feeling|realized|noticed|thought|wondered)\b", re.I),
    "action": re.compile(r"\b(did|made|built|started|finished|shipped|launched)\b", re.I),
    "difficulty": re.compile(r"\b(stuck|blocked|struggled|couldn't|hard|difficult|frustrat\w*)\b", re.I),
    "connection": re.compile(r"\b(talked|met|called|connected|shared|together|we\b)\b", re.I),
    "rest": re.compile(r"\b(rest\w*|slept|slow|paused|break|quiet)\b", re.I),
}

# Hand-authored lexicon per existing check-in tag -- real word associations,
# not generated. Matches the 15 tags already in DailyCheckIn.tsx.
TAG_LEXICON: Dict[str, List[str]] = {
    "clarity": ["clear", "clarity", "obvious", "understood", "focused", "sharp"],
    "friction": ["friction", "resist", "resistance", "stuck", "blocked", "clash", "conflict"],
    "creativity": ["creative", "idea", "ideas", "made", "built", "design", "imagine", "art"],
    "connection": ["talked", "met", "connect", "together", "shared", "call", "friend", "we"],
    "renewal": ["rest", "renew", "refresh", "slept", "recharge", "reset", "restore"],
    "transformation": ["changed", "transform", "shift", "different", "new", "growth", "became"],
    "balance": ["balance", "balanced", "steady", "even", "centered", "grounded"],
    "insight": ["realized", "insight", "understood", "learned", "saw", "noticed", "clicked"],
    "flow": ["flow", "smooth", "easy", "effortless", "momentum", "moving"],
    "resistance": ["resist", "avoid", "procrastinate", "put off", "delayed", "stuck"],
    "breakthrough": ["breakthrough", "finally", "solved", "cracked", "unlocked", "figured"],
    "harmony": ["harmony", "peaceful", "aligned", "in sync", "cohesive"],
    "challenge": ["challenge", "hard", "difficult", "tough", "pushed", "struggled"],
    "growth": ["grew", "growth", "improved", "progress", "better", "learning"],
    "peace": ["peace", "calm", "quiet", "still", "settled", "relaxed"],
}


@dataclass
class TagSuggestion:
    tag: str
    score: float
    matched_words: List[str]


@dataclass
class TextAnalysis:
    intent: str
    suggested_tags: List[TagSuggestion]
    word_count: int


def tokenize(text: str) -> List[str]:
    """Real tokenizer -- same token boundaries as autoling.ts's regex,
    filtered down to word tokens for lexicon matching."""
    return [t.lower() for t in TOKEN_RE.findall(text) if re.match(r"^[a-zA-Z_]", t)]


def infer_intent(text: str) -> str:
    for name, pattern in INTENT_PATTERNS.items():
        if pattern.search(text):
            return name
    return "general"


def _stem(word: str) -> str:
    """Minimal suffix stripping -- enough to match 'realized'/'realize',
    'talked'/'talk', 'stuck'/'stuck', without the false positives that
    naive substring containment produces on short words.
    Note: strips only a final 's', not 'es' as a unit -- 'generates' should
    stem to 'generate' (one letter off), not 'generat' (two letters off,
    which then fails to match 'generate' at all). Found via a real test
    failure in the synthesist_engine port; fixed here too since it's the
    same bug."""
    for suffix in ("ing", "edly", "ed"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    if word.endswith("s") and not word.endswith("ss") and len(word) - 1 >= 3:
        return word[:-1]
    return word


def suggest_tags(text: str, max_tags: int = 5) -> List[TagSuggestion]:
    raw_words = [w for w in tokenize(text) if len(w) >= 3]  # drop "i", "a", "to", etc.
    if not raw_words:
        return []
    stems = {_stem(w) for w in raw_words}

    scored: List[TagSuggestion] = []
    for tag, lexicon in TAG_LEXICON.items():
        matched = [lex_word for lex_word in lexicon if _stem(lex_word.split()[0]) in stems]
        if matched:
            score = round(min(1.0, len(matched) / 3.0), 4)
            scored.append(TagSuggestion(tag=tag, score=score, matched_words=matched))

    scored.sort(key=lambda s: s.score, reverse=True)
    return scored[:max_tags]


def analyze(text: str) -> TextAnalysis:
    return TextAnalysis(
        intent=infer_intent(text),
        suggested_tags=suggest_tags(text),
        word_count=len(tokenize(text)),
    )
