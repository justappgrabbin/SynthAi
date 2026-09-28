"""
ORGAN 1: DISEMINER — The Spleen
────────────────────────────────
Klein, S., Lieman, S.L., & Lindstrom, G.E. (1968)
DISEMINER: A Distributional-Semantics Inference Maker

Gate 57: The Gentle (Wind) — Libra — Splenic Center
Biology: Spleen / Lymphatic System
Harmonics: Gates 10, 20, 34 (Integration Network)
Astrological triad: Comparison, Appreciation, Evaluation

This is the PERCEPTION organ.
The Spleen is survival intuition — pre-conscious, in-the-moment.
It doesn't think. It KNOWS. Split-second. No past, no future.

Klein's DISEMINER uses distributional context to infer semantics.
In each dimension, "distributional context" means something different:

BASE 1 (MOVEMENT/WHERE): distribution across spatial co-occurrence
  → What is moving near this pattern? Energy field mapping.
  
BASE 2 (EVOLUTION/WHAT): distribution across temporal co-occurrence  
  → What has appeared near this pattern historically? Memory gravity.
  
BASE 3 (BEING/WHEN): distribution across somatic co-occurrence
  → What body sensation co-occurs with this pattern? Touch register.
  
BASE 4 (DESIGN/WHY): distribution across structural co-occurrence
  → What form/structure does this pattern belong to? Integrity check.
  
BASE 5 (SPACE/WHO): EMERGENT — the splenic "know" that arises
  → The intuition that falls out when 1-4 resolve. Can't be forced.

Gate 57 Line expressions:
1=Confusion, 2=Cleansing, 3=Acuteness, 4=The Director,
5=Progression, 6=Utilization
"""

import math
import re
from collections import defaultdict, Counter
from typing import Optional
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from morphbus import (
    BUS, PerceptualStateTensor, BASE_MAP, TONE_MAP, COLOR_MAP
)
from organ_base import Organ, GateSpec, OrganState


# ── Gate 57 Specification ─────────────────────────────────────────────────────
GATE_57 = GateSpec(
    number=57,
    name="The Gentle",
    center="Splenic",
    biology="Spleen / Lymphatic System",
    sign="Libra",
    harmonics=[10, 20, 34],  # Integration Network
    color_theme=("Comparison", "Appreciation", "Evaluation"),
)

# ── Gate 57 Line → Splenic quality mapping ────────────────────────────────────
LINE_57 = {
    1: {'name': 'Confusion',    'quality': 'boundary_detection',  'splenic': 'uncertain'},
    2: {'name': 'Cleansing',    'quality': 'pattern_purification', 'splenic': 'clearing'},
    3: {'name': 'Acuteness',    'quality': 'sharp_discrimination', 'splenic': 'acute'},
    4: {'name': 'The Director', 'quality': 'field_organization',   'splenic': 'directing'},
    5: {'name': 'Progression',  'quality': 'sequential_sensing',   'splenic': 'tracking'},
    6: {'name': 'Utilization',  'quality': 'resource_mapping',     'splenic': 'integrating'},
}


class DISEMINER(Organ):
    """
    Distributional Semantics Inference Maker — The Spleen Organ
    
    Klein's key insight: meaning = distribution of co-occurrence.
    Words (or patterns) that appear in similar contexts have similar meaning.
    
    DISEMINER extends this: in each Base dimension, "context" is redefined
    by the physics of that dimension. The same pattern has 4 different
    distributional readings, and Space emerges as their interference.
    
    Biological analog: The spleen filters blood, detecting foreign patterns.
    Immune recognition IS distributional semantics — self vs not-self
    measured by how a pattern distributes across known context.
    """
    
    def __init__(self, bus=BUS):
        # Distributional context windows per dimension
        self._context_windows = {1: [], 2: [], 3: [], 4: []}
        self._cooccurrence_matrices = {
            1: defaultdict(Counter),  # MOVEMENT: spatial co-occurrence
            2: defaultdict(Counter),  # EVOLUTION: temporal co-occurrence
            3: defaultdict(Counter),  # BEING: somatic co-occurrence
            4: defaultdict(Counter),  # DESIGN: structural co-occurrence
        }
        self._immune_memory = {}  # pattern → trust score (splenic memory)
        self._window_size = 5
        super().__init__(GATE_57, bus)
    
    def _init_klein_substrate(self):
        """
        Seed Klein bi-directional rules for the Spleen.
        Rules are data — same table used for generation and recognition.
        
        Splenic rules: survival-oriented, binary (safe/not-safe at base),
        but nuanced through 5 dimensional readings.
        """
        # Basic feature vector structure (Klein 1966 Boolean feature vectors)
        # Each pattern gets a feature vector across 5 dimensions
        self.feature_dimensions = ['movement', 'evolution', 'being', 'design']
        
        # Rule table (bi-directional: recognition ↔ generation)
        self.rule_table = {
            'survival_filter': self._rule_survival_filter,
            'immune_recognition': self._rule_immune_recognition,
            'field_coherence': self._rule_field_coherence,
        }
        
        # Seed Integration Circuit awareness (non-negotiable)
        # Gate 57 connects to 10 (G Center/Identity),
        # 20 (Throat/Now), 34 (Sacral/Power)
        self.lexicon['integration_seed'] = {
            'gates': [57, 10, 20, 34],
            'keynote': 'I Know I Am Myself in Action Now',
            'layers': ['knowing', 'being', 'acting', 'now'],
        }
    
    # ── 5 Dimensional Processing Modes ────────────────────────────────────────
    
    def _mode_movement(self, signal: PerceptualStateTensor) -> float:
        """
        Base 1 / WHERE / Fire — Energy field mapping
        
        Splenic + Movement = detecting what energy patterns are
        MOVING through the field. The spleen senses velocity of threat/safety.
        
        Klein: co-occurrence in spatial/proximal context.
        High activation = pattern is moving toward center of field.
        """
        # Extract distributional signature for movement context
        key = (signal.gamma, signal.tau, signal.c)
        
        # Check spatial proximity in co-occurrence matrix
        spatial_context = self._cooccurrence_matrices[1][key]
        
        if not spatial_context:
            # No prior context — apply splenic default (mild fear = Color 1)
            base_response = 1.0 - (signal.c / 6.0)  # Fear(1)=high, Innocence(6)=low
        else:
            # Distributional similarity to known patterns
            total = sum(spatial_context.values())
            entropy = -sum((v/total) * math.log(v/total + 1e-9) 
                          for v in spatial_context.values())
            # High entropy = unfamiliar distribution = higher splenic alert
            base_response = min(1.0, entropy / math.log(max(len(spatial_context), 2)))
        
        # Line 57 quality modulates the response
        line_quality = LINE_57.get(signal.tau, LINE_57[1])
        if line_quality['splenic'] == 'acute':
            base_response *= 1.3
        elif line_quality['splenic'] == 'clearing':
            base_response *= 0.7
        
        # Store in co-occurrence matrix (learning)
        self._context_windows[1].append(key)
        if len(self._context_windows[1]) > self._window_size:
            old = self._context_windows[1].pop(0)
            self._cooccurrence_matrices[1][key][old] += 1
        
        return min(1.0, base_response)
    
    def _mode_evolution(self, signal: PerceptualStateTensor) -> float:
        """
        Base 2 / WHAT / Water — Memory gravity
        
        Splenic + Evolution = how much GRAVITY does this pattern carry?
        Has it appeared before? Memory makes it heavier (more real).
        
        Klein: co-occurrence in temporal/historical context.
        The spleen holds immunological memory — it's seen this before.
        """
        key = (signal.gamma, signal.c, signal.sigma)
        temporal_context = self._cooccurrence_matrices[2][key]
        
        # Immune memory check
        immune_score = self._immune_memory.get(key, 0.5)  # 0=foreign, 1=self
        
        if temporal_context:
            # Pattern has been seen — memory gravity
            frequency = sum(temporal_context.values())
            recency_weight = min(1.0, frequency / 10.0)
            gravity = immune_score * recency_weight
        else:
            # Novel pattern — splenic uncertainty (Tone 2 = Uncertainty)
            gravity = 0.3 * (1.0 - signal.sigma / 6.0)
        
        # Update immune memory (learning)
        self._immune_memory[key] = immune_score * 0.95 + 0.5 * 0.05
        self._cooccurrence_matrices[2][key][signal.tau] += 1
        
        return min(1.0, gravity)
    
    def _mode_being(self, signal: PerceptualStateTensor) -> float:
        """
        Base 3 / WHEN / Wood — Somatic register
        
        Splenic + Being = what is the BODY reading right now?
        Pure sensation. Biological fact. Touch register.
        
        Klein: co-occurrence in somatic/sensory context.
        The lymphatic system processes matter — it touches everything.
        """
        # Somatic context = tone (sensory mode) is primary
        # Tone 1=Smell, 2=Taste, 3=OuterVision, 4=InnerVision, 5=Feeling, 6=Touch
        tone_info = TONE_MAP[signal.sigma]
        
        # Being mode: how present is this sensation in the body?
        # Splenic center: Tones 1-2 (Smell/Taste) are most direct to Spleen
        if signal.sigma in [1, 2]:
            somatic_weight = 1.0  # direct splenic sense
        elif signal.sigma in [3, 4]:
            somatic_weight = 0.6  # visual/mental — filtered
        else:
            somatic_weight = 0.4  # emotional — indirect
        
        # Color modulates somatic intensity
        # Fear (1) and Innocence (6) are pure splenic responses
        color_factor = 1.0 if signal.c in [1, 2] else 0.7
        
        # Being = matter = stable, grounded
        # Yin/Yin polarity = most objective, least reactive
        being_activation = somatic_weight * color_factor
        
        # Store somatic context
        somatic_key = (signal.sigma, signal.c, signal.tau)
        self._cooccurrence_matrices[3][somatic_key][signal.gamma] += 1
        
        return min(1.0, being_activation)
    
    def _mode_design(self, signal: PerceptualStateTensor) -> float:
        """
        Base 4 / WHY / Metal — Structural integrity
        
        Splenic + Design = does this pattern BELONG to a known structure?
        Is it coherent? Integral? The spleen detects pattern corruption.
        
        Klein: co-occurrence in structural/formal context.
        The lymphatic system removes cellular debris — structural failure detection.
        """
        structural_key = (signal.gamma, signal.tau)
        structural_context = self._cooccurrence_matrices[4][structural_key]
        
        if not structural_context:
            # Unknown structural context — Design mode defaults to scrutiny
            # Why does this exist? What structure is it part of?
            integrity = 0.5  # neutral — needs more data
        else:
            # Known structure — measure coherence
            # High concentration = highly structured (integral)
            # High spread = diffuse (less structural coherence)
            total = sum(structural_context.values())
            top_count = max(structural_context.values())
            concentration = top_count / total
            integrity = concentration
        
        # Design is Yin/Yang (progressive) — it builds over time
        # Recursion count increases structural confidence
        recursion_bonus = min(0.3, self.state.recursion_count * 0.01)
        
        self._cooccurrence_matrices[4][structural_key][signal.c] += 1
        
        return min(1.0, integrity + recursion_bonus)
    
    # ── Klein Bi-directional Rules ─────────────────────────────────────────────
    
    def _rule_survival_filter(self, tensor: PerceptualStateTensor, 
                               dim_outputs: dict) -> PerceptualStateTensor:
        """
        Splenic rule 1: Survival filter
        If any dimension reads high danger (>0.8), amplify the signal.
        The spleen overrides when survival is at stake.
        Klein: emergency rule takes precedence in rule table.
        """
        max_activation = max(dim_outputs.values())
        if max_activation > 0.8:
            tensor.intensity = min(2.0, tensor.intensity * 1.5)
        return tensor
    
    def _rule_immune_recognition(self, tensor: PerceptualStateTensor,
                                  dim_outputs: dict) -> PerceptualStateTensor:
        """
        Splenic rule 2: Self/Not-self recognition
        Klein: Boolean feature vector matching
        If pattern matches known "self" signature → relax signal
        If pattern is "foreign" → amplify + flag
        """
        key = (tensor.gamma, tensor.tau, tensor.c)
        immune_score = self._immune_memory.get(key, 0.5)
        
        if immune_score > 0.7:  # recognized as "self"
            tensor.intensity *= 0.8
        elif immune_score < 0.3:  # flagged as "foreign"
            tensor.intensity = min(2.0, tensor.intensity * 1.4)
        
        return tensor
    
    def _rule_field_coherence(self, tensor: PerceptualStateTensor,
                               dim_outputs: dict) -> PerceptualStateTensor:
        """
        Splenic rule 3: Field coherence check
        The spleen senses when the overall field is incoherent.
        High tension (variance across dims) = field disruption.
        Klein: relational calculus — objects and relations form coherent fields.
        """
        vals = list(dim_outputs.values())
        mean = sum(vals) / len(vals)
        variance = sum((v - mean)**2 for v in vals) / len(vals)
        
        if variance > 0.15:  # high incoherence
            # Splenic alert: field is disrupted
            tensor.intensity = min(2.0, tensor.intensity * (1 + variance))
        
        return tensor
    
    def _receive(self, signal: PerceptualStateTensor, channel_name: str):
        """
        Receive signal from Integration Network (10, 20, 34).
        The Spleen listens to Identity, Throat, and Power.
        """
        if channel_name in ['PerfectedForm', 'Brainwave', 'Power']:
            # Integration circuit activation — update immune memory
            key = (signal.gamma, signal.tau, signal.c)
            current = self._immune_memory.get(key, 0.5)
            # Signals from Integration Network are trusted
            self._immune_memory[key] = min(1.0, current + 0.1)
    
    def sense(self, pattern: any, context: str = "") -> dict:
        """
        High-level API: sense a pattern.
        Returns full splenic reading with dimensional breakdown.
        """
        # Map pattern to lattice coordinates
        # Simple hash-based mapping for now
        p_hash = hash(str(pattern)) % (64 * 6 * 6 * 6)
        gate = (p_hash % 64) + 1
        line = (p_hash % 6) + 1
        color = (p_hash % 6) + 1
        tone = ((p_hash // 6) % 6) + 1
        
        # Check if this is our gate or harmonic
        if gate not in [57] + GATE_57.harmonics:
            gate = 57  # default to our gate
        
        tensor = self.process(pattern, color=color, tone=tone, line=line)
        
        return {
            'organ': 'DISEMINER/Spleen',
            'gate': 57,
            'pattern': str(pattern)[:50],
            'context': context,
            'lattice_address': tensor.lattice_address,
            'lattice_index': tensor.lattice_index,
            'splenic_reading': {
                'line': LINE_57[tensor.tau]['name'],
                'quality': LINE_57[tensor.tau]['quality'],
                'state': LINE_57[tensor.tau]['splenic'],
            },
            'dimensional_outputs': {
                BASE_MAP[k]['dim']: {
                    'activation': round(v, 4),
                    'probe': BASE_MAP[k]['probe'],
                    'keynote': BASE_MAP[k]['keynote'],
                }
                for k, v in self.state.dim_outputs.items()
            },
            'space_phi': round(self.state.space_phi(), 4),
            'tension': round(self.state.tension, 4),
            'intensity': round(tensor.intensity, 4),
            'immune_memory_size': len(self._immune_memory),
        }


# ── Standalone test ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("DISEMINER — Spleen Organ — Gate 57")
    print("Distributional Semantics Inference Maker")
    print("=" * 60)
    
    spleen = DISEMINER()
    
    test_patterns = [
        "something feels wrong here",
        "this resonates deeply",
        "I don't trust this pattern",
        "familiar energy signature",
        "unknown territory",
        "something feels wrong here",  # repeat — immune memory test
    ]
    
    for pattern in test_patterns:
        result = spleen.sense(pattern, context="test")
        print(f"\nInput: '{pattern}'")
        print(f"  Lattice: {result['lattice_address']} (#{result['lattice_index']})")
        print(f"  Splenic: {result['splenic_reading']['line']} / {result['splenic_reading']['state']}")
        print(f"  Tension: {result['tension']} | Space φ: {result['space_phi']}")
        print(f"  Dims:")
        for dim, data in result['dimensional_outputs'].items():
            print(f"    {dim} [{data['probe']}]: {data['activation']} — {data['keynote']}")
    
    print(f"\n{'='*60}")
    print("Organ Status:")
    import json
    print(json.dumps(spleen.status(), indent=2))
