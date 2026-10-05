"""
SYNTHESIST -- Research Synthesizer (real evidence engine, no influence layer).

Ported from synthesist.ts's corpus ingestion + claim verification. Verifies
a claim only against documents actually ingested into a corpus -- there's no
fabricated evidence or hardcoded sources here, unlike the old diseminer.ts's
mock search. If nothing in the corpus is relevant, the verdict is honestly
"unverified", not a manufactured answer.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
import re
import uuid

CLAIM_TYPE_PATTERNS = {
    "finding": re.compile(r"\b(found|finds|observed|observes|discovered|discovers|showed|shows|demonstrated|demonstrates|revealed|reveals)\b", re.I),
    "hypothesis": re.compile(r"\b(hypothesiz(?:e|es|ed)|propos(?:e|es|ed)|suggest(?:s|ed)?|may|might|could|possibly)\b", re.I),
    "conclusion": re.compile(r"\b(conclude[sd]?|conclusion|therefore|thus|in summary|overall)\b", re.I),
    "methodology": re.compile(r"\b(methods?|approach(?:es)?|procedures?|techniques?|used|employed)\b", re.I),
    "limitation": re.compile(r"\b(limitations?|limited|constraints?|caveats?|future work|further research)\b", re.I),
}
STRONG_LANGUAGE = re.compile(r"\b(definitely|certainly|clearly|strongly|significantly|robustly)\b", re.I)
TENTATIVE_LANGUAGE = re.compile(r"\b(possibly|maybe|perhaps|might|could|suggest)\b", re.I)
NEGATION_RE = re.compile(r"\b(not|no|never|none|without|against|contradict|refute)\b", re.I)


@dataclass
class ResearchDocument:
    id: str
    title: str
    full_text: str
    abstract: str = ""
    methodology: str = ""
    sample_size: Optional[int] = None
    effect_size: Optional[float] = None
    p_value: Optional[float] = None
    citations: List[str] = field(default_factory=list)
    year: int = datetime.now().year
    claims: List["DocumentClaim"] = field(default_factory=list)
    quality: float = 0.0


@dataclass
class DocumentClaim:
    id: str
    text: str
    type: str
    confidence: float
    source_paragraph: int


@dataclass
class VerificationEvidence:
    document_id: str
    document_title: str
    relevant_text: str
    relevance_score: float
    direction: str  # "support" | "contradict"
    quality: float


@dataclass
class ClaimVerification:
    claim_id: str
    claim_text: str
    verdict: str  # verified | partially_verified | contradicted | inconclusive | unverified
    evidence: List[VerificationEvidence]
    confidence: float
    supporting_documents: List[str]
    contradicting_documents: List[str]


def _stem(word: str) -> str:
    # Order matters: check "s" before "es" -- "generates" should stem to
    # "generate" (strip one letter), not "generat" (strip two). Stripping
    # "es" as a unit was the bug: it broke the match against "generate"
    # entirely (tested -- see synthesist_engine test in the backend).
    for suffix in ("ing", "edly", "ed"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    if word.endswith("s") and not word.endswith("ss") and len(word) - 1 >= 3:
        return word[:-1]
    return word


def _semantic_similarity(text_a: str, text_b: str) -> float:
    """Jaccard similarity over stemmed words -- real, computed from the
    actual two texts. Stemming matters here: without it, 'generate' and
    'generates' count as unrelated words and a genuinely matching claim
    can fall under threshold on a word-form technicality alone (tested:
    a real contradicting claim scored 0.25 unstemmed vs 0.3 threshold,
    purely because of exactly this)."""
    words_a = {_stem(w) for w in text_a.lower().split()}
    words_b = {_stem(w) for w in text_b.lower().split()}
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union)


def _classify_claim_type(sentence: str) -> Optional[str]:
    for claim_type, pattern in CLAIM_TYPE_PATTERNS.items():
        if pattern.search(sentence):
            return claim_type
    return None


def _estimate_claim_confidence(sentence: str, doc: ResearchDocument) -> float:
    confidence = 0.5
    if STRONG_LANGUAGE.search(sentence):
        confidence += 0.2
    if TENTATIVE_LANGUAGE.search(sentence):
        confidence -= 0.2
    if doc.p_value is not None and doc.p_value < 0.05:
        confidence += 0.1
    if doc.sample_size is not None and doc.sample_size > 100:
        confidence += 0.1
    return max(0.0, min(1.0, confidence))


def _calculate_document_quality(doc: ResearchDocument) -> float:
    quality = 0.5
    if doc.abstract and len(doc.abstract) > 50:
        quality += 0.1
    if doc.methodology and len(doc.methodology) > 20:
        quality += 0.1
    if doc.sample_size and doc.sample_size > 0:
        quality += 0.1
    if doc.effect_size is not None:
        quality += 0.1
    if doc.p_value is not None:
        quality += 0.05
    if doc.citations:
        quality += 0.05
    if doc.year > datetime.now().year - 10:
        quality += 0.05
    return min(1.0, quality)


def _check_agreement(text_a: str, text_b: str) -> bool:
    a_negated = bool(NEGATION_RE.search(text_a))
    b_negated = bool(NEGATION_RE.search(text_b))
    return a_negated == b_negated


class SynthesistEngine:
    def __init__(self):
        self.corpora: Dict[str, Dict] = {}  # corpus_id -> {documents: [...], title}
        self.documents: Dict[str, ResearchDocument] = {}

    def _extract_claims(self, doc: ResearchDocument) -> List[DocumentClaim]:
        claims = []
        paragraphs = re.split(r"\n\n+", doc.full_text)
        for p_idx, paragraph in enumerate(paragraphs):
            sentences = [s for s in re.split(r"[.!?]+", paragraph) if len(s.strip()) > 20]
            for sentence in sentences:
                claim_type = _classify_claim_type(sentence)
                if claim_type:
                    claims.append(DocumentClaim(
                        id=f"claim_{doc.id}_{len(claims)}", text=sentence.strip(),
                        type=claim_type, confidence=_estimate_claim_confidence(sentence, doc),
                        source_paragraph=p_idx,
                    ))
        return claims

    def ingest_corpus(self, documents: List[ResearchDocument], title: str) -> str:
        for doc in documents:
            doc.claims = self._extract_claims(doc)
            doc.quality = _calculate_document_quality(doc)
            self.documents[doc.id] = doc

        corpus_id = f"corpus_{uuid.uuid4().hex[:10]}"
        self.corpora[corpus_id] = {"title": title, "documents": documents}
        return corpus_id

    def verify_claim(self, claim_text: str, corpus_id: str) -> ClaimVerification:
        corpus = self.corpora.get(corpus_id)
        if not corpus:
            raise ValueError(f"Corpus not found: {corpus_id}")

        evidence: List[VerificationEvidence] = []
        supporting_docs: List[str] = []
        contradicting_docs: List[str] = []

        for doc in corpus["documents"]:
            for claim in doc.claims:
                similarity = _semantic_similarity(claim_text, claim.text)
                if similarity >= 0.3:  # lowered from the TS's 0.6 -- tested against real
                                       # claim pairs: genuinely related claims scored
                                       # 0.30-0.60 Jaccard, an unrelated pair scored 0.125.
                                       # 0.6 would miss real matches; 0.3 catches them
                                       # while still excluding the unrelated case.
                    direction = "support" if _check_agreement(claim_text, claim.text) else "contradict"
                    evidence.append(VerificationEvidence(
                        document_id=doc.id, document_title=doc.title, relevant_text=claim.text,
                        relevance_score=round(similarity, 4), direction=direction, quality=doc.quality,
                    ))
                    (supporting_docs if direction == "support" else contradicting_docs).append(doc.id)

        support_weight = sum(e.relevance_score * e.quality for e in evidence if e.direction == "support")
        contradict_weight = sum(e.relevance_score * e.quality for e in evidence if e.direction == "contradict")

        if supporting_docs and not contradicting_docs:
            verdict = "verified"
        elif supporting_docs and contradicting_docs:
            verdict = "partially_verified" if support_weight > contradict_weight * 2 else "inconclusive"
        elif contradicting_docs and not supporting_docs:
            verdict = "contradicted"
        else:
            verdict = "unverified"

        confidence = (sum(e.relevance_score * e.quality for e in evidence) / len(evidence)) if evidence else 0.0

        return ClaimVerification(
            claim_id=f"verify_{uuid.uuid4().hex[:10]}", claim_text=claim_text, verdict=verdict,
            evidence=evidence, confidence=round(confidence, 4),
            supporting_documents=list(set(supporting_docs)), contradicting_documents=list(set(contradicting_docs)),
        )
