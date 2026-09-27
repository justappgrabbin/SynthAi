"""
AION AutoLing Core
Inspired by Sheldon Klein's AutoLing System
Generates hypotheses, code, and knowledge from mesh queries
"""

import json
from typing import Dict, List, Any
from mesh_builder import MeshBuilder
from symbolic_calculator import SymbolicCalculator

class AutoLingCore:
    def __init__(self, mesh_builder: MeshBuilder = None):
        self.mesh = mesh_builder or MeshBuilder()
        self.symbolic = SymbolicCalculator()
        self.question_history = []
        self.hypothesis_history = []

    def ask(self, question: str, dimension: str = None) -> Dict:
        if not dimension:
            dimension = self._infer_dimension(question)
        self.question_history.append({'question': question, 'dimension': dimension, 'timestamp': self._now()})
        findings = self.mesh.query_mesh(question, dimension)
        hypothesis = self.mesh.generate_hypothesis(question, findings)
        self.hypothesis_history.append(hypothesis)
        return {'question': question, 'dimension': dimension, 'findings': findings, 'hypothesis': hypothesis, 'confidence': hypothesis['confidence'], 'suggested_next_questions': self._suggest_followups(question, dimension, findings)}

    def generate_code(self, intent: str, context: Dict = None, language: str = 'typescript') -> Dict:
        intent_analysis = self._analyze_intent(intent)
        relevant_code = self.mesh.query_mesh(intent, 'how')
        if intent_analysis['type'] == 'component':
            code = self._generate_component(intent, relevant_code, language)
        elif intent_analysis['type'] == 'api':
            code = self._generate_api(intent, relevant_code, language)
        elif intent_analysis['type'] == 'utility':
            code = self._generate_utility(intent, relevant_code, language)
        elif intent_analysis['type'] == 'data_model':
            code = self._generate_data_model(intent, relevant_code, language)
        else:
            code = self._generate_generic(intent, relevant_code, language)
        return {'intent': intent, 'generated_code': code, 'language': language, 'type': intent_analysis['type'], 'confidence': intent_analysis['confidence'], 'based_on': [f['node']['name'] for f in relevant_code[:3]]}

    def synthesize_knowledge(self, frameworks: List[str], topic: str) -> Dict:
        findings = {}
        for framework in frameworks:
            if framework == 'i_ching':
                findings['i_ching'] = self.symbolic.cast_i_ching(topic)
            elif framework == 'astrology':
                now = self._now()
                findings['astrology'] = self.symbolic.calculate_astrology(now.split('T')[0], now.split('T')[1][:8], 'Greenwich')
            elif framework == 'human_design':
                findings['human_design'] = self.symbolic.calculate_human_design('2000-01-01', '12:00:00', 'Greenwich')
        correspondences = self._find_correspondences(findings)
        return {'topic': topic, 'frameworks': frameworks, 'findings': findings, 'correspondences': correspondences, 'synthesis': self._generate_synthesis(findings, correspondences), 'confidence': self._calculate_synthesis_confidence(findings)}

    def _infer_dimension(self, question: str) -> str:
        q = question.lower()
        if any(kw in q for kw in ['who', 'author', 'creator', 'agent', 'person']): return 'who'
        if any(kw in q for kw in ['what', 'file', 'code', 'function', 'content']): return 'what'
        if any(kw in q for kw in ['where', 'path', 'location', 'domain', 'folder']): return 'where'
        if any(kw in q for kw in ['when', 'date', 'time', 'created', 'modified']): return 'when'
        if any(kw in q for kw in ['why', 'purpose', 'reason', 'intent', 'goal']): return 'why'
        if any(kw in q for kw in ['how', 'process', 'method', 'algorithm', 'mechanism']): return 'how'
        return 'what'

    def _analyze_intent(self, intent: str) -> Dict:
        i = intent.lower()
        types = {
            'component': ['component', 'react', 'vue', 'ui', 'interface', 'page', 'screen'],
            'api': ['api', 'endpoint', 'route', 'server', 'backend', 'handler'],
            'utility': ['utility', 'helper', 'function', 'tool', 'lib'],
            'data_model': ['model', 'schema', 'type', 'interface', 'entity', 'database']
        }
        for type_name, keywords in types.items():
            if any(kw in i for kw in keywords):
                return {'type': type_name, 'confidence': 0.8}
        return {'type': 'generic', 'confidence': 0.5}

    def _generate_component(self, intent: str, context: List[Dict], language: str) -> str:
        patterns = []
        for finding in context:
            parsed = finding['node']['properties'].get('parsed_data', {})
            if parsed.get('jsx_components'):
                patterns.extend(parsed['jsx_components'])
        return f"""import React from 'react';

export function GeneratedComponent() {{
    return (
        <div className="p-4 bg-aion-matter rounded-lg border border-aion-resonance">
            <h2 className="text-aion-light font-bold">Generated: {intent}</h2>
            <p className="text-aion-light/70 mt-2">Auto-generated component</p>
        </div>
    );
}}
"""

    def _generate_api(self, intent: str, context: List[Dict], language: str) -> str:
        return f"""import {{ NextRequest, NextResponse }} from 'next/server';

export async function GET(request: NextRequest) {{
    return NextResponse.json({{ status: 'generated', intent: '{intent}' }});
}}
"""

    def _generate_utility(self, intent: str, context: List[Dict], language: str) -> str:
        return f"""export function generatedUtility(input: any): any {{
    console.log('Processing:', input);
    return input;
}}
"""

    def _generate_data_model(self, intent: str, context: List[Dict], language: str) -> str:
        return f"""export interface GeneratedModel {{
    id: string;
    createdAt: string;
    updatedAt: string;
}}
"""

    def _generate_generic(self, intent: str, context: List[Dict], language: str) -> str:
        return f"""// Generated code for: {intent}
console.log('Generated code placeholder for:', '{intent}');
"""

    def _find_correspondences(self, findings: Dict) -> List[Dict]:
        correspondences = []
        if 'i_ching' in findings and 'human_design' in findings:
            hex_num = findings['i_ching']['primary_hexagram']['number']
            hd_gates = findings['human_design']['gates']
            if str(hex_num) in hd_gates:
                correspondences.append({'frameworks': ['i_ching', 'human_design'], 'type': 'gate_hexagram_alignment', 'description': f'Hexagram {hex_num} aligns with activated Gate {hex_num}', 'significance': 'high'})
        if 'astrology' in findings and 'human_design' in findings:
            sun_sign = findings['astrology']['planets'].get('Sun', {}).get('sign', '')
            hd_type = findings['human_design']['type']
            correspondences.append({'frameworks': ['astrology', 'human_design'], 'type': 'type_sign_resonance', 'description': f'{sun_sign} Sun resonates with {hd_type} design', 'significance': 'medium'})
        return correspondences

    def _generate_synthesis(self, findings: Dict, correspondences: List[Dict]) -> str:
        parts = []
        for framework, data in findings.items():
            if framework == 'i_ching':
                parts.append(f"The I Ching reveals {data['primary_hexagram']['name']}, suggesting transformation.")
            elif framework == 'astrology':
                parts.append(f"Astrologically, the Sun is in {data['planets']['Sun']['sign']}.")
            elif framework == 'human_design':
                parts.append(f"Human Design indicates a {data['type']} type with {data['authority']} authority.")
        if correspondences:
            parts.append(f"Cross-framework analysis reveals {len(correspondences)} significant correspondences.")
        return ' '.join(parts)

    def _calculate_synthesis_confidence(self, findings: Dict) -> float:
        return min(0.95, len(findings) * 0.3 + 0.1)

    def _suggest_followups(self, question: str, dimension: str, findings: List[Dict]) -> List[str]:
        suggestions = []
        if dimension == 'what':
            suggestions.append(f"Who created these {len(findings)} findings?")
            suggestions.append(f"Where are these files located in the mesh?")
        elif dimension == 'who':
            suggestions.append(f"What did they create?")
            suggestions.append(f"How do their creations relate to others?")
        return suggestions

    def _now(self) -> str:
        from datetime import datetime
        return datetime.now().isoformat()

__all__ = ['AutoLingCore']
