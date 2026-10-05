"""
DISEMINER -- Distributional-Semantics Inference Maker (Klein Tool #2), real half.

Ported from the fixed diseminer.ts up through crossReferenceClaims. This is
genuine count-based distributional semantics: real co-occurrence matrices
built from real ingested text, real cosine similarity, real hypernym/meronym
heuristics from context-subset asymmetry and "X of Y" collocation patterns,
and real SVO claim extraction with contradiction/support cross-referencing.

Deliberately NOT ported from diseminer.ts:
  - "Monte Carlo simulation": despite the name, there's no randomness in the
    sampling loop -- every iteration recomputes the same deterministic value,
    so "convergence" is guaranteed trivially. Theater, not a simulation.
  - Narrative generation / influence scoring: computes urgency, emotional
    resonance, social proof, authority, and a "doubtBypassed" flag to
    determine when a generated narrative has gotten a user past their
    skepticism, independent of whether the underlying claim is actually
    supported. That's a persuasion engine, not inference. Not built here,
    on the same grounds Claude won't build dark-pattern engagement loops.

Real use in this app: surfacing which concepts actually co-occur in a
user's own check-in notes / mission reflections over time -- self-insight
grounded in their own words, not a mystical reading.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import re
import math
import time
import uuid

WORD_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9_]*")
# The original TS tokenizer had no stopword filtering at all, which meant
# high-frequency function words ("the", "a", "of") trivially satisfied the
# hypernym context-subset heuristic against everything -- confirmed by
# actually running it. Filtering these out is required for the distributional
# hypothesis to say anything meaningful.
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
    "been", "being", "to", "of", "in", "on", "at", "for", "with", "by",
    "from", "as", "that", "this", "these", "those", "it", "its", "into",
    "then", "than", "so", "such", "not", "no", "do", "does", "did", "has",
    "have", "had", "will", "would", "shall", "should", "can", "could",
    "may", "might", "must", "if", "when", "while", "about",
}
VERB_INDICATORS = {
    "is", "are", "was", "were", "has", "have", "had", "does", "do", "did",
    "can", "could", "will", "would", "shall", "should", "may", "might", "must",
}
NEGATION_WORDS = {"not", "no", "never", "none", "without", "against"}
TEMPORAL_RE = re.compile(
    r"\b(yesterday|today|tomorrow|now|then|soon|recently|lately|already|yet|"
    r"still|before|after|during|while|when|since|until|ago|later|earlier)\b",
    re.I,
)


@dataclass
class Context:
    left: List[str]
    right: List[str]
    document: str


@dataclass
class InferredRelation:
    target: str
    relation: str
    confidence: float
    evidence: List[str]


@dataclass
class DistributionalVector:
    word: str
    contexts: List[Context] = field(default_factory=list)
    cooccurrence: Dict[str, int] = field(default_factory=dict)
    inferred_relations: List[InferredRelation] = field(default_factory=list)


@dataclass
class ExtractedClaim:
    id: str
    text: str
    source: str
    subject: str
    predicate: str
    object: str
    confidence: float
    evidence: List[Dict]
    contradictions: List[str]
    supports: List[str]
    temporal_context: str
    modality: str


def tokenize(text: str, drop_stopwords: bool = True) -> List[str]:
    words = [w.lower() for w in WORD_RE.findall(text) if len(w) > 2]
    if drop_stopwords:
        words = [w for w in words if w not in STOPWORDS]
    return words


class DiseminerEngine:
    def __init__(self):
        self.space: Dict[str, DistributionalVector] = {}
        self.claims: Dict[str, ExtractedClaim] = {}

    # -- Real distributional semantics -----------------------------------

    def build_distributional_space(self, documents: List[str]) -> None:
        for doc in documents:
            tokens = tokenize(doc)
            for i, word in enumerate(tokens):
                vec = self.space.setdefault(word, DistributionalVector(word=word))
                left = tokens[max(0, i - 5):i]
                right = tokens[i + 1:i + 6]
                vec.contexts.append(Context(left=left, right=right, document=doc[:50]))
                for cw in left + right:
                    vec.cooccurrence[cw] = vec.cooccurrence.get(cw, 0) + 1

        self._infer_semantic_relations()

    def _cosine(self, a: Dict[str, int], b: Dict[str, int]) -> float:
        keys = set(a.keys()) | set(b.keys())
        dot = sum(a.get(k, 0) * b.get(k, 0) for k in keys)
        norm_a = math.sqrt(sum(v * v for v in a.values()))
        norm_b = math.sqrt(sum(v * v for v in b.values()))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def _find_similar_words(self, word: str, vec: DistributionalVector) -> Dict[str, float]:
        sims: Dict[str, float] = {}
        for other_word, other_vec in self.space.items():
            if other_word == word:
                continue
            sim = self._cosine(vec.cooccurrence, other_vec.cooccurrence)
            if sim > 0.3:
                sims[other_word] = sim
        return sims

    def _infer_hypernyms(self, word: str, vec: DistributionalVector) -> List[InferredRelation]:
        """A appears only in contexts B also appears in, but not vice versa
        -> B is plausibly a broader term than A (real context-subset asymmetry,
        not a lookup table)."""
        out = []
        a_docs = {c.document for c in vec.contexts}
        if not a_docs:
            return out
        for other_word, other_vec in self.space.items():
            if other_word == word:
                continue
            b_docs = {c.document for c in other_vec.contexts}
            if not b_docs:
                continue
            intersection = a_docs & b_docs
            a_subset_b = len(intersection) / len(a_docs)
            b_subset_a = len(intersection) / len(b_docs)
            if a_subset_b > 0.8 and b_subset_a < 0.5:
                out.append(InferredRelation(
                    target=other_word, relation="hypernymy", confidence=a_subset_b,
                    evidence=[f"Context subset: {a_subset_b:.3f}"],
                ))
        return out

    def _infer_meronyms(self, word: str, vec: DistributionalVector) -> List[InferredRelation]:
        out = []
        for ctx in vec.contexts:
            if "part" in ctx.left or "of" in ctx.right:
                candidate = next((w for w in ctx.right if w != "of"), None)
                if candidate:
                    out.append(InferredRelation(
                        target=candidate, relation="meronymy", confidence=0.5,
                        evidence=[f'Part-of pattern: "{word} of {candidate}"'],
                    ))
        return out

    def _infer_semantic_relations(self) -> None:
        for word, vec in self.space.items():
            for similar_word, sim in self._find_similar_words(word, vec).items():
                if sim > 0.7:
                    vec.inferred_relations.append(InferredRelation(
                        target=similar_word, relation="synonymy", confidence=sim,
                        evidence=[f"Similar context distributions: {sim:.3f}"],
                    ))
                elif sim > 0.4:
                    vec.inferred_relations.append(InferredRelation(
                        target=similar_word, relation="semantic_association", confidence=sim,
                        evidence=[f"Context overlap: {sim:.3f}"],
                    ))
            vec.inferred_relations.extend(self._infer_hypernyms(word, vec))
            vec.inferred_relations.extend(self._infer_meronyms(word, vec))

    # -- Real claim extraction --------------------------------------------

    def extract_claims(self, text: str, source: str) -> List[ExtractedClaim]:
        sentences = [s.strip() for s in re.split(r"[.!?]+", text) if len(s.strip()) > 10]
        extracted = []
        for sentence in sentences:
            claim = self._extract_claim_from_sentence(sentence, source)
            if claim:
                extracted.append(claim)
                self.claims[claim.id] = claim
        self._cross_reference(extracted)
        return extracted

    def _is_verb(self, word: str) -> bool:
        return word.lower() in VERB_INDICATORS or bool(re.search(r"(ing|ed|en|s)$", word))

    def _infer_modality(self, sentence: str) -> str:
        lower = sentence.lower()
        if re.search(r"\b(must|certainly|definitely|always|never|all)\b", lower):
            return "certain"
        if re.search(r"\b(probably|likely|most|generally|usually)\b", lower):
            return "probable"
        if re.search(r"\b(might|could|possibly|maybe|some)\b", lower):
            return "possible"
        if re.search(r"\b(think|believe|suggest|hypothesize|speculate)\b", lower):
            return "speculative"
        return "probable"

    def _find_evidence(self, subject: str, predicate: str, obj: str) -> List[Dict]:
        evidence = []
        for word, vec in self.space.items():
            if word == subject or word == obj:
                for ctx in vec.contexts:
                    context_text = " ".join(ctx.left + [word] + ctx.right)
                    if predicate in context_text or obj in context_text:
                        evidence.append({
                            "text": context_text, "source": ctx.document,
                            "strength": min(1.0, vec.cooccurrence.get(word, 1) / 10),
                        })
        return evidence[:5]

    def _extract_claim_from_sentence(self, sentence: str, source: str) -> Optional[ExtractedClaim]:
        tokens = tokenize(sentence)
        if len(tokens) < 3:
            return None

        subject = tokens[0]
        predicate = next((t for i, t in enumerate(tokens) if i > 0 and self._is_verb(t)), tokens[1])
        pred_idx = tokens.index(predicate)
        obj = " ".join(tokens[pred_idx + 1:]) or tokens[-1]

        evidence = self._find_evidence(subject, predicate, obj)
        confidence = (sum(e["strength"] for e in evidence) / len(evidence)) if evidence else 0.0

        claim = ExtractedClaim(
            id=f"claim_{uuid.uuid4().hex[:10]}", text=sentence, source=source,
            subject=subject, predicate=predicate, object=obj, confidence=round(confidence, 4),
            evidence=evidence, contradictions=[], supports=[],
            temporal_context=(TEMPORAL_RE.search(sentence).group(0) if TEMPORAL_RE.search(sentence) else "present"),
            modality=self._infer_modality(sentence),
        )
        return claim

    def _are_contradictory(self, a: ExtractedClaim, b: ExtractedClaim) -> bool:
        if a.subject == b.subject and a.predicate != b.predicate:
            a_neg = any(w in a.text.lower() for w in NEGATION_WORDS)
            b_neg = any(w in b.text.lower() for w in NEGATION_WORDS)
            return a_neg != b_neg
        return False

    def _are_supporting(self, a: ExtractedClaim, b: ExtractedClaim) -> bool:
        return a.subject == b.subject and a.predicate == b.predicate

    def _cross_reference(self, claims: List[ExtractedClaim]) -> None:
        for i in range(len(claims)):
            for j in range(i + 1, len(claims)):
                a, b = claims[i], claims[j]
                if self._are_contradictory(a, b):
                    a.contradictions.append(b.id)
                    b.contradictions.append(a.id)
                if self._are_supporting(a, b):
                    a.supports.append(b.id)
                    b.supports.append(a.id)

    # -- Query surface -----------------------------------------------------

    def top_relations(self, limit: int = 20) -> List[Dict]:
        """All inferred relations across the space, sorted by confidence --
        the honest, queryable output of the real half of this engine."""
        out = []
        for word, vec in self.space.items():
            for rel in vec.inferred_relations:
                out.append({
                    "word": word, "target": rel.target, "relation": rel.relation,
                    "confidence": round(rel.confidence, 4), "evidence": rel.evidence,
                })
        out.sort(key=lambda r: r["confidence"], reverse=True)
        return out[:limit]
