"""
AION Mesh Builder
Constructs and maintains the knowledge graph from ingested files
"""

import json
from typing import Dict, List, Any
from file_parser import FileParser, classify_domain, find_relationships

class MeshBuilder:
    def __init__(self):
        self.parser = FileParser()
        self.nodes = []
        self.edges = []

    def ingest_file(self, file_id: str, filename: str, content: str, metadata: Dict = None) -> Dict:
        parsed = self.parser.parse_file(content, filename)
        domains = classify_domain(filename, content, parsed)
        node = {
            'id': file_id,
            'type': 'file_node',
            'subtype': parsed.get('language', 'unknown'),
            'name': filename,
            'properties': {
                'filename': filename,
                'parsed_data': parsed,
                'domain_tags': domains,
                'size': len(content),
                'line_count': content.count('\n') + 1,
                'metadata': metadata or {}
            }
        }
        self.nodes.append(node)
        relationships = find_relationships(file_id, parsed, self.nodes)
        for rel in relationships:
            self.edges.append(rel)
        return {'node': node, 'relationships': relationships, 'domains': domains}

    def build_mesh(self, files: List[Dict]) -> Dict:
        for file_data in files:
            self.ingest_file(file_data['id'], file_data['filename'], file_data['content'], file_data.get('metadata'))
        self._calculate_resonance()
        return {
            'nodes': self.nodes,
            'edges': self.edges,
            'stats': {
                'total_nodes': len(self.nodes),
                'total_edges': len(self.edges),
                'domains': self._get_domain_distribution(),
                'languages': self._get_language_distribution()
            }
        }

    def _calculate_resonance(self):
        for edge in self.edges:
            source = next((n for n in self.nodes if n['id'] == edge['source_id']), None)
            target = next((n for n in self.nodes if n['id'] == edge['target_id']), None)
            if source and target:
                resonance = 0.0
                source_domains = set(source['properties'].get('domain_tags', []))
                target_domains = set(target['properties'].get('domain_tags', []))
                shared_domains = source_domains & target_domains
                if source_domains:
                    resonance += len(shared_domains) / len(source_domains) * 0.4
                source_parsed = source['properties'].get('parsed_data', {})
                target_parsed = target['properties'].get('parsed_data', {})
                source_imports = set(str(i) for i in source_parsed.get('imports', []))
                target_imports = set(str(i) for i in target_parsed.get('imports', []))
                shared_imports = source_imports & target_imports
                if source_imports:
                    resonance += len(shared_imports) / len(source_imports) * 0.3
                if source['subtype'] == target['subtype']:
                    resonance += 0.2
                source_size = source['properties'].get('size', 0)
                target_size = target['properties'].get('size', 0)
                if source_size > 0 and target_size > 0:
                    resonance += min(source_size, target_size) / max(source_size, target_size) * 0.1
                edge['resonance'] = min(resonance, 1.0)

    def _get_domain_distribution(self) -> Dict[str, int]:
        distribution = {}
        for node in self.nodes:
            for domain in node['properties'].get('domain_tags', []):
                distribution[domain] = distribution.get(domain, 0) + 1
        return distribution

    def _get_language_distribution(self) -> Dict[str, int]:
        distribution = {}
        for node in self.nodes:
            lang = node['subtype']
            distribution[lang] = distribution.get(lang, 0) + 1
        return distribution

    def query_mesh(self, query: str, dimension: str = 'what') -> List[Dict]:
        results = []
        query_lower = query.lower()
        for node in self.nodes:
            score = 0.0
            match = False
            if dimension == 'who':
                if any(kw in query_lower for kw in ['author', 'creator', 'agent', 'person', 'who']):
                    if node['properties'].get('metadata', {}).get('owner'):
                        score = 0.8; match = True
            elif dimension == 'what':
                if any(kw in query_lower for kw in ['file', 'code', 'function', 'class', 'content']):
                    if node['name'].lower() and any(kw in node['name'].lower() for kw in query_lower.split()):
                        score = 0.9; match = True
                    content = json.dumps(node['properties'].get('parsed_data', {})).lower()
                    if any(kw in content for kw in query_lower.split()):
                        score = 0.7; match = True
            elif dimension == 'where':
                if any(kw in query_lower for kw in ['path', 'location', 'domain', 'folder']):
                    if node['properties'].get('metadata', {}).get('path'):
                        score = 0.8; match = True
            elif dimension == 'when':
                if any(kw in query_lower for kw in ['when', 'date', 'time', 'created', 'modified']):
                    if node['properties'].get('metadata', {}).get('created_at'):
                        score = 0.6; match = True
            elif dimension == 'why':
                if any(kw in query_lower for kw in ['purpose', 'why', 'intent', 'reason', 'goal']):
                    if node['properties'].get('domain_tags'):
                        score = 0.7; match = True
            elif dimension == 'how':
                if any(kw in query_lower for kw in ['how', 'process', 'method', 'algorithm', 'mechanism']):
                    if node['properties'].get('parsed_data'):
                        score = 0.7; match = True
            if match:
                results.append({'node': node, 'score': score, 'dimension': dimension})
        results.sort(key=lambda x: x['score'], reverse=True)
        return results

    def generate_hypothesis(self, query: str, findings: List[Dict]) -> Dict:
        if not findings:
            return {'statement': f"No significant findings for query: {query}", 'confidence': 0.0, 'evidence': [], 'test_proposal': 'Collect more data or refine query', 'expected_outcome': 'Better targeted results'}
        domains = {}
        types = {}
        for finding in findings:
            node = finding['node']
            for domain in node['properties'].get('domain_tags', []):
                domains[domain] = domains.get(domain, 0) + 1
            subtype = node['subtype']
            types[subtype] = types.get(subtype, 0) + 1
        dominant_domain = max(domains, key=domains.get) if domains else 'unknown'
        dominant_type = max(types, key=types.get) if types else 'unknown'
        avg_score = sum(f['score'] for f in findings) / len(findings)
        return {
            'statement': f"The query '{query}' predominantly relates to {dominant_domain} implemented in {dominant_type}. There are {len(findings)} relevant nodes with average relevance of {avg_score:.2f}.",
            'confidence': avg_score,
            'evidence': [f['node']['name'] for f in findings[:5]],
            'test_proposal': f"Cross-reference {dominant_domain} findings with other dimensions to validate",
            'expected_outcome': f"Discovery of hidden relationships in {dominant_domain} domain"
        }

__all__ = ['MeshBuilder']
