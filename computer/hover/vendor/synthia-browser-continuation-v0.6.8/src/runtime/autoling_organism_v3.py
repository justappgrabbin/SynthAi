# AutoLing Organism v3.0 — The Orchestrator
# A self-directed system that ingests, understands, repairs, and deploys

import json
import hashlib
import time
import uuid
import os
import re
import ast
import zipfile
import tarfile
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Callable, Set
from collections import deque, defaultdict
from pathlib import Path
import math

# ============================================================
# VECTOR (Pure Python, no numpy)
# ============================================================

class Vector:
    def __init__(self, data):
        self.data = data
        self.dim = len(data)

    def dot(self, other):
        return sum(a * b for a, b in zip(self.data, other.data))

    def norm(self):
        return math.sqrt(sum(x * x for x in self.data))

    def normalize(self):
        n = self.norm()
        if n > 0:
            return Vector([x / n for x in self.data])
        return Vector([0.0] * self.dim)

    def scale(self, s):
        return Vector([x * s for x in self.data])

    def add(self, other):
        return Vector([a + b for a, b in zip(self.data, other.data)])

    @staticmethod
    def zeros(dim):
        return Vector([0.0] * dim)

    @staticmethod
    def random(dim, seed=None):
        import random
        if seed is not None:
            random.seed(seed)
        return Vector([random.gauss(0, 0.3) for _ in range(dim)])


# ============================================================
# EMBEDDING BACKENDS
# ============================================================

class EmbeddingBackend:
    def embed(self, text):
        raise NotImplementedError


class KeywordEmbedder(EmbeddingBackend):
    CONCEPTS = {
        'creation': [0.9, 0.8, 0.1, 0.2, 0.7, 0.3],
        'destruction': [0.1, 0.2, 0.9, 0.8, 0.1, 0.7],
        'connection': [0.5, 0.9, 0.3, 0.1, 0.8, 0.4],
        'growth': [0.8, 0.6, 0.2, 0.1, 0.9, 0.5],
        'light': [0.9, 0.7, 0.1, 0.0, 0.8, 0.2],
        'dark': [0.1, 0.1, 0.9, 0.9, 0.1, 0.9],
        'code': [0.8, 0.3, 0.7, 0.4, 0.5, 0.2],
        'image': [0.3, 0.5, 0.6, 0.9, 0.2, 0.4],
        'html': [0.3, 0.4, 0.5, 0.8, 0.3, 0.6],
        'game': [0.6, 0.5, 0.8, 0.4, 0.7, 0.3],
        'conversation': [0.7, 0.9, 0.2, 0.1, 0.6, 0.4],
        'pdf': [0.4, 0.6, 0.3, 0.7, 0.5, 0.3],
        'zip': [0.5, 0.4, 0.7, 0.6, 0.3, 0.5],
        'broken': [0.1, 0.1, 0.9, 0.9, 0.1, 0.9],
        'repair': [0.3, 0.2, 0.8, 0.7, 0.4, 0.6],
        'merge': [0.5, 0.7, 0.3, 0.2, 0.6, 0.4],
        'deploy': [0.6, 0.4, 0.5, 0.3, 0.8, 0.3],
    }

    def __init__(self, dim=64):
        self.dim = dim
        self.concept_space = {}
        for key, vec in self.CONCEPTS.items():
            padded = vec + [0.0] * (dim - len(vec))
            self.concept_space[key] = Vector(padded).normalize()

    def embed(self, text):
        text_lower = text.lower()
        embedding = Vector.zeros(self.dim)
        total_weight = 0.0
        for concept, vector in self.concept_space.items():
            weight = text_lower.count(concept) * 0.5 + 0.05
            if concept in text_lower:
                embedding = embedding.add(vector.scale(weight))
                total_weight += weight
        if total_weight > 0:
            embedding = embedding.scale(1.0 / total_weight)
        else:
            hash_val = int(hashlib.md5(text.encode()).hexdigest(), 16)
            embedding = Vector.random(self.dim, hash_val % (2**32))
        return embedding.normalize()


# ============================================================
# I CHING ADDRESS
# ============================================================

@dataclass
class IChingAddress:
    hexagram: int
    line: int
    color: int
    tone: int
    base: int
    x: float = field(default=0.0)
    y: float = field(default=0.0)
    z: float = field(default=0.0)
    dimension: str = field(default="semantic")

    def __post_init__(self):
        angle = (self.hexagram / 64) * 2 * math.pi
        elevation = (self.line / 7) * math.pi - math.pi / 2
        radius = 10 + (self.color * 2) + (self.tone * 0.5)
        self.x = radius * math.cos(angle) * math.cos(elevation)
        self.y = radius * math.sin(elevation) * 5
        self.z = radius * math.sin(angle) * math.cos(elevation)

    def to_string(self):
        return f"H{self.hexagram}.L{self.line}.C{self.color}.T{self.tone}.B{self.base}"


# ============================================================
# SEMANTIC GRAPH DATABASE
# ============================================================

class SemanticGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = {}
        self.index_by_trait = defaultdict(set)
        self.index_by_capability = defaultdict(set)
        self.index_by_type = defaultdict(set)
        self.embeddings = {}

    def add_node(self, address, content_type, traits, capabilities, embedding, content=None, metadata=None):
        self.nodes[address] = {
            'address': address,
            'content_type': content_type,
            'traits': traits,
            'capabilities': capabilities,
            'content': content,
            'metadata': metadata or {},
            'created_at': time.time(),
            'access_count': 0,
            'last_accessed': time.time()
        }
        self.embeddings[address] = embedding
        for trait in traits:
            self.index_by_trait[trait].add(address)
        for cap in capabilities:
            self.index_by_capability[cap].add(address)
        self.index_by_type[content_type].add(address)

    def add_edge(self, source, target, edge_type, weight=1.0):
        if source not in self.edges:
            self.edges[source] = []
        self.edges[source].append((target, edge_type, weight))

    def find_similar(self, address, top_k=5):
        if address not in self.embeddings:
            return []
        target_emb = self.embeddings[address]
        similarities = []
        for addr, emb in self.embeddings.items():
            if addr != address:
                sim = target_emb.dot(emb)
                similarities.append((addr, sim))
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

    def find_by_type(self, content_type):
        return list(self.index_by_type.get(content_type, set()))

    def query(self, address):
        if address in self.nodes:
            self.nodes[address]['access_count'] += 1
            self.nodes[address]['last_accessed'] = time.time()
        return self.nodes.get(address, {})

    def merge_nodes(self, addr1, addr2):
        n1 = self.nodes.get(addr1)
        n2 = self.nodes.get(addr2)
        if not n1 or not n2:
            return addr1 if n1 else addr2
        score1 = n1['access_count'] + len(self.edges.get(addr1, []))
        score2 = n2['access_count'] + len(self.edges.get(addr2, []))
        keeper = addr1 if score1 >= score2 else addr2
        discard = addr2 if keeper == addr1 else addr1
        self.nodes[keeper]['traits'] = list(set(n1['traits'] + n2['traits']))
        self.nodes[keeper]['capabilities'] = list(set(n1['capabilities'] + n2['capabilities']))
        if discard in self.edges:
            for target, etype, weight in self.edges[discard]:
                self.add_edge(keeper, target, etype, weight)
            del self.edges[discard]
        del self.nodes[discard]
        if discard in self.embeddings:
            del self.embeddings[discard]
        return keeper

    def detect_duplicates(self, threshold=0.85):
        duplicates = []
        addresses = list(self.embeddings.keys())
        for i, addr1 in enumerate(addresses):
            for addr2 in addresses[i+1:]:
                sim = self.embeddings[addr1].dot(self.embeddings[addr2])
                if sim >= threshold:
                    duplicates.append((addr1, addr2, sim))
        return duplicates

    def get_stats(self):
        return {
            'nodes': len(self.nodes),
            'edges': sum(len(e) for e in self.edges.values()),
            'traits': len(self.index_by_trait),
            'capabilities': len(self.index_by_capability),
            'types': len(self.index_by_type)
        }

    def save(self, filepath):
        data = {
            'nodes': {k: {**v, 'content': str(v['content'])[:500]} for k, v in self.nodes.items()},
            'edges': self.edges,
            'embeddings': {k: v.data for k, v in self.embeddings.items()}
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

    def load(self, filepath):
        with open(filepath, 'r') as f:
            data = json.load(f)
        for addr, node in data.get('nodes', {}).items():
            self.add_node(
                address=addr,
                content_type=node.get('content_type', 'unknown'),
                traits=node.get('traits', []),
                capabilities=node.get('capabilities', []),
                embedding=Vector(data.get('embeddings', {}).get(addr, [0.0] * 64)),
                content=node.get('content'),
                metadata=node.get('metadata', {})
            )
        for source, edges in data.get('edges', {}).items():
            for target, etype, weight in edges:
                self.add_edge(source, target, etype, weight)


# ============================================================
# MESSAGE SYSTEM
# ============================================================

@dataclass
class Message:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    sender: str = ""
    recipient: str = ""
    content: Any = None
    content_type: str = "text"
    intent: str = "inform"
    priority: int = 5
    semantic_vector: Optional[Vector] = None
    timestamp: float = field(default_factory=time.time)
    ttl: int = 10
    trace: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def mutate(self, transformation, new_content):
        return Message(
            sender=self.recipient or self.sender,
            recipient="",
            content=new_content,
            content_type=self.content_type,
            intent="mutate",
            priority=self.priority,
            semantic_vector=self.semantic_vector,
            ttl=self.ttl - 1,
            trace=self.trace + [transformation],
            metadata=self.metadata
        )

    def reply(self, content, intent="inform"):
        return Message(
            sender=self.recipient,
            recipient=self.sender,
            content=content,
            intent=intent,
            priority=self.priority
        )


# ============================================================
# ACTOR BASE
# ============================================================

class Actor:
    def __init__(self, actor_id, address, capabilities):
        self.actor_id = actor_id
        self.address = address
        self.capabilities = set(capabilities)
        self.mailbox = deque()
        self.state = {}
        self.active = True
        self.processed_count = 0
        self.failure_count = 0
        self.max_failures = 3

    def receive(self, msg):
        self.mailbox.append(msg)

    def process(self):
        outputs = []
        while self.mailbox and self.active:
            msg = self.mailbox.popleft()
            try:
                result = self.handle(msg)
                if isinstance(result, list):
                    outputs.extend(result)
                elif result:
                    outputs.append(result)
                self.processed_count += 1
            except Exception as e:
                self.failure_count += 1
                outputs.append(msg.reply(
                    {'error': str(e), 'actor': self.actor_id, 'failures': self.failure_count},
                    intent='error'
                ))
                if self.failure_count >= self.max_failures:
                    self.active = False
        return outputs

    def handle(self, msg):
        return None

    def _transform_content(self, content):
        dimension = self.address.dimension
        if dimension == 'semantic':
            return {'type': 'semantic_core', 'data': content, 'extracted': self._extract_semantics(content)}
        elif dimension == 'relational':
            return {'type': 'relational_web', 'connections': self._find_relations(content), 'source': content}
        elif dimension == 'operational':
            return {'type': 'operational_seq', 'steps': ['parse', 'analyze', 'transform', 'emit'], 'input': content}
        elif dimension == 'visual':
            return {'type': 'visual_scaffold', 'geometry': {'vertices': 100, 'faces': 50}, 'source': content}
        elif dimension == 'temporal':
            return {'type': 'temporal_flow', 'timeline': ['t0', 't1', 't2', 't3'], 'source': content}
        elif dimension == 'metaphysical':
            return {'type': 'meta_pattern', 'iching': {'hexagram': self.address.hexagram}, 'source': content}
        return content

    def _extract_semantics(self, content):
        if isinstance(content, str):
            return {'concepts': [w for w in content.lower().split() if len(w) > 3], 'length': len(content)}
        return {'type': type(content).__name__}

    def _find_relations(self, content):
        return ['link_' + str(hash(str(content)) % 1000) for _ in range(3)]


# ============================================================
# SPECIALIZED WORKERS
# ============================================================

class CodeWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['code', 'parse', 'repair', 'ast'])
        self.state['parsed_files'] = {}
        self.state['dependency_graph'] = {}

    def handle(self, msg):
        if msg.intent == 'mutate':
            content = msg.content
            if isinstance(content, str):
                try:
                    tree = ast.parse(content)
                    functions = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
                    classes = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
                    imports = []
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            imports.extend([alias.name for alias in node.names])
                        elif isinstance(node, ast.ImportFrom):
                            imports.append(node.module)
                    parsed = {
                        'type': 'code_ast',
                        'language': 'python',
                        'functions': functions,
                        'classes': classes,
                        'imports': imports,
                        'complexity': len(list(ast.walk(tree))),
                        'source': content[:200]
                    }
                    self.state['parsed_files'][msg.id] = parsed
                    return msg.mutate(f"code_worker_{self.actor_id}", parsed)
                except SyntaxError:
                    return msg.mutate(f"code_worker_{self.actor_id}", {
                        'type': 'code_raw',
                        'language': 'unknown',
                        'source': content[:200]
                    })
            return msg.mutate(f"code_worker_{self.actor_id}", self._transform_content(content))
        elif msg.intent == 'repair':
            broken_code = msg.content
            repaired = self._attempt_repair(broken_code)
            return msg.reply({'status': 'repaired', 'code': repaired}, intent='inform')
        return None

    def _attempt_repair(self, code):
        if isinstance(code, dict):
            code = code.get('code', '')
        if not isinstance(code, str):
            return str(code)
        repairs = []
        lines = code.split('\n')
        fixed = []
        for line in lines:
            stripped = line.strip()
            if any(stripped.startswith(kw) for kw in ['def ', 'class ', 'if ', 'for ', 'while ']):
                if not stripped.endswith(':'):
                    line += ':'
                    repairs.append("Added colon")
            if stripped.startswith('print ') and not stripped.startswith('print('):
                line = line.replace('print ', 'print(', 1) + ')'
                repairs.append("Fixed print")
            line = line.replace('improt', 'import').replace('form', 'from')
            fixed.append(line)
        result = '\n'.join(fixed)
        if repairs:
            result = f"# REPAIRS: {', '.join(repairs)}\n" + result
        return result


class ImageWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['image', 'visual', 'describe', 'mesh'])

    def handle(self, msg):
        if msg.intent == 'mutate':
            content = msg.content
            if isinstance(content, str):
                visual_params = {
                    'type': 'image_description',
                    'description': content,
                    'suggested_geometry': 'plane' if 'texture' in content.lower() else 'mesh',
                    'colors': self._extract_colors(content),
                    'mesh_params': self._generate_mesh_params(content)
                }
                return msg.mutate(f"image_worker_{self.actor_id}", visual_params)
        return None

    def _extract_colors(self, text):
        color_words = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'black', 'white', 
                        'rainbow', 'gold', 'silver', 'brown', 'pink', 'cyan', 'magenta']
        found = [c for c in color_words if c in text.lower()]
        return found if found else ['neutral']

    def _generate_mesh_params(self, text):
        return {
            'vertices': 100 + len(text) * 2,
            'faces': 50 + len(text),
            'material': 'standard' if 'simple' in text.lower() else 'complex'
        }


class ZIPWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['zip', 'unpack', 'catalog', 'recursive'])
        self.state['extracted'] = {}

    def handle(self, msg):
        if msg.intent == 'mutate':
            content = msg.content
            if isinstance(content, str) and (content.endswith('.zip') or content.endswith('.tar')):
                catalog = self._extract_archive(content)
                return msg.mutate(f"zip_worker_{self.actor_id}", catalog)
            elif isinstance(content, bytes):
                return msg.mutate(f"zip_worker_{self.actor_id}", {
                    'type': 'zip_bytes',
                    'size': len(content),
                    'note': 'Raw archive bytes received'
                })
        return None

    def _extract_archive(self, filepath):
        catalog = {'files': [], 'directories': [], 'total_size': 0}
        try:
            if filepath.endswith('.zip'):
                with zipfile.ZipFile(filepath, 'r') as zf:
                    for info in zf.infolist():
                        if info.is_dir():
                            catalog['directories'].append(info.filename)
                        else:
                            catalog['files'].append({
                                'name': info.filename,
                                'size': info.file_size,
                                'compressed': info.compress_size
                            })
                            catalog['total_size'] += info.file_size
            elif filepath.endswith('.tar'):
                with tarfile.open(filepath, 'r') as tf:
                    for member in tf.getmembers():
                        if member.isdir():
                            catalog['directories'].append(member.name)
                        else:
                            catalog['files'].append({
                                'name': member.name,
                                'size': member.size
                            })
                            catalog['total_size'] += member.size
        except Exception as e:
            catalog['error'] = str(e)
        return catalog


class PDFWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['pdf', 'extract', 'text', 'document'])

    def handle(self, msg):
        if msg.intent == 'mutate':
            content = msg.content
            if isinstance(content, str) and content.endswith('.pdf'):
                return msg.mutate(f"pdf_worker_{self.actor_id}", {
                    'type': 'pdf_document',
                    'filepath': content,
                    'pages': 'unknown',
                    'note': 'PDF extraction requires PyPDF2 or pdfplumber'
                })
            elif isinstance(content, str):
                return msg.mutate(f"pdf_worker_{self.actor_id}", {
                    'type': 'document_text',
                    'text': content[:500],
                    'word_count': len(content.split()),
                    'paragraphs': content.count('\n\n') + 1
                })
        return None


class GameWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['game', 'level', 'entity', 'asset', 'mechanic'])

    def handle(self, msg):
        if msg.intent == 'mutate':
            content = msg.content
            if isinstance(content, str):
                game_analysis = {
                    'type': 'game_content',
                    'entities': self._extract_entities(content),
                    'mechanics': self._extract_mechanics(content),
                    'levels': self._extract_levels(content),
                    'dialogue': self._extract_dialogue(content),
                    'source': content[:200]
                }
                return msg.mutate(f"game_worker_{self.actor_id}", game_analysis)
        return None

    def _extract_entities(self, text):
        entity_markers = ['player', 'enemy', 'npc', 'boss', 'item', 'weapon', 'character', 'avatar']
        return [e for e in entity_markers if e in text.lower()]

    def _extract_mechanics(self, text):
        mechanic_markers = ['jump', 'shoot', 'collect', 'fight', 'craft', 'build', 'quest', 'level up', 'skill']
        return [m for m in mechanic_markers if m in text.lower()]

    def _extract_levels(self, text):
        level_markers = ['level', 'stage', 'world', 'map', 'area', 'zone', 'dungeon']
        return [l for l in level_markers if l in text.lower()]

    def _extract_dialogue(self, text):
        lines = [l.strip() for l in text.split('\n') if '"' in l or ':' in l]
        return lines[:5]


class ConversationWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['conversation', 'dialogue', 'intent', 'nlp'])

    def handle(self, msg):
        if msg.intent == 'mutate':
            content = msg.content
            if isinstance(content, str):
                dialogue = {
                    'type': 'conversation',
                    'turns': self._split_turns(content),
                    'participants': self._extract_participants(content),
                    'intents': self._extract_intents(content),
                    'topics': self._extract_topics(content),
                    'source': content[:300]
                }
                return msg.mutate(f"conversation_worker_{self.actor_id}", dialogue)
        return None

    def _split_turns(self, text):
        turns = []
        lines = text.split('\n')
        for line in lines:
            if ':' in line:
                speaker, utterance = line.split(':', 1)
                turns.append({'speaker': speaker.strip(), 'text': utterance.strip()})
        return turns

    def _extract_participants(self, text):
        participants = set()
        for line in text.split('\n'):
            if ':' in line:
                participants.add(line.split(':')[0].strip())
        return list(participants)

    def _extract_intents(self, text):
        intent_markers = ['ask', 'tell', 'request', 'command', 'suggest', 'agree', 'refuse', 'greet']
        return [i for i in intent_markers if i in text.lower()]

    def _extract_topics(self, text):
        words = text.split()
        topics = []
        for word in words:
            if word[0].isupper() and len(word) > 3:
                topics.append(word.strip('.,!?;:'))
        return list(set(topics))[:10]


class HTMLWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['html', 'css', 'javascript', 'web', 'dom'])

    def handle(self, msg):
        if msg.intent == 'mutate':
            content = msg.content
            if isinstance(content, str):
                if '<html' in content or '<!' in content:
                    return msg.mutate(f"html_worker_{self.actor_id}", self._parse_html(content))
                elif '{' in content and ':' in content and not content.startswith('def'):
                    return msg.mutate(f"html_worker_{self.actor_id}", self._parse_css(content))
                elif 'function' in content or '=>' in content:
                    return msg.mutate(f"html_worker_{self.actor_id}", self._parse_js(content))
        return None

    def _parse_html(self, html):
        tags = re.findall(r'<(\w+)', html)
        return {
            'type': 'html_document',
            'tags': list(set(tags)),
            'tag_count': len(tags),
            'has_css': '<style' in html or '.css' in html,
            'has_js': '<script' in html or '.js' in html,
            'source': html[:200]
        }

    def _parse_css(self, css):
        selectors = re.findall(r'([.#]?[\w-]+)\s*\{', css)
        return {
            'type': 'css_stylesheet',
            'selectors': selectors[:20],
            'selector_count': len(selectors),
            'source': css[:200]
        }

    def _parse_js(self, js):
        functions = re.findall(r'function\s+(\w+)', js)
        return {
            'type': 'javascript',
            'functions': functions[:20],
            'function_count': len(functions),
            'source': js[:200]
        }


class RepairWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['repair', 'fix', 'heal', 'correct'])
        self.state['repair_log'] = []

    def handle(self, msg):
        if msg.intent == 'repair':
            broken = msg.content
            if isinstance(broken, dict) and 'code' in broken:
                repaired = self._repair_code(broken['code'])
                self.state['repair_log'].append({
                    'original': broken['code'][:100],
                    'repaired': repaired[:100],
                    'timestamp': time.time()
                })
                return msg.reply({'status': 'repaired', 'code': repaired}, intent='inform')
            elif isinstance(broken, str):
                repaired = self._repair_code(broken)
                return msg.reply({'status': 'repaired', 'code': repaired}, intent='inform')
        return None

    def _repair_code(self, code):
        if not isinstance(code, str):
            return str(code)
        repairs = []
        lines = code.split('\n')
        fixed = []
        for line in lines:
            stripped = line.strip()
            if any(stripped.startswith(kw) for kw in ['def ', 'class ', 'if ', 'for ', 'while ']):
                if not stripped.endswith(':'):
                    line += ':'
                    repairs.append("Added colon")
            if stripped.startswith('print ') and not stripped.startswith('print('):
                line = line.replace('print ', 'print(', 1) + ')'
                repairs.append("Fixed print")
            line = line.replace('improt', 'import').replace('form', 'from')
            fixed.append(line)
        result = '\n'.join(fixed)
        if repairs:
            result = f"# REPAIRS: {', '.join(repairs)}\n" + result
        return result


class MergeWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['merge', 'deduplicate', 'resolve', 'unify'])
        self.state['merged_pairs'] = []

    def handle(self, msg):
        if msg.intent == 'merge':
            if isinstance(msg.content, dict) and 'duplicates' in msg.content:
                merged = self._merge_duplicates(msg.content['duplicates'])
                return msg.reply({'status': 'merged', 'count': len(merged)}, intent='inform')
        return None

    def _merge_duplicates(self, duplicates):
        merged = []
        for addr1, addr2, sim in duplicates:
            merged.append({
                'source': addr1,
                'target': addr2,
                'similarity': sim,
                'action': 'merged_into_single_node',
                'preserved_traits': 'both'
            })
        return merged


class BuildWorker(Actor):
    def __init__(self, actor_id, address):
        super().__init__(actor_id, address, ['build', 'generate', 'compile', 'export'])
        self.state['builds'] = []

    def handle(self, msg):
        if msg.intent == 'command':
            if isinstance(msg.content, dict):
                action = msg.content.get('action')
                if action == 'build_app':
                    components = msg.content.get('components', [])
                    app = self._build_app(components)
                    self.state['builds'].append(app)
                    return msg.reply({'status': 'built', 'app': app}, intent='inform')
                elif action == 'export_apk':
                    return msg.reply({'status': 'exported', 'format': 'apk'}, intent='inform')
                elif action == 'export_web':
                    return msg.reply({'status': 'exported', 'format': 'web'}, intent='inform')
        return None

    def _build_app(self, components):
        return {
            'name': f"AutoLingApp_{int(time.time())}",
            'components': components,
            'entry_point': 'main.py',
            'structure': {
                'src': components,
                'assets': [],
                'config': 'config.json'
            },
            'build_time': time.time()
        }


# ============================================================
# THE ORCHESTRATOR
# ============================================================

class Orchestrator:
    FILE_TYPE_MAP = {
        '.py': 'code', '.js': 'code', '.html': 'html', '.css': 'html',
        '.zip': 'zip', '.tar': 'zip', '.gz': 'zip',
        '.pdf': 'pdf', '.txt': 'text', '.md': 'text',
        '.json': 'data', '.yaml': 'data', '.yml': 'data',
        '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image',
        '.mp3': 'sound', '.wav': 'sound', '.ogg': 'sound',
    }

    def __init__(self, embedder=None, watch_dirs=None):
        self.embedder = embedder or KeywordEmbedder()
        self.graph = SemanticGraph()
        self.watch_dirs = watch_dirs or ['./incoming']
        self.workers = {}
        self.dimensional_actors = {}
        self.running = False
        self.scan_interval = 5.0
        self._init_workers()
        self._init_dimensional_pipeline()

    def _init_workers(self):
        worker_classes = {
            'code': CodeWorker, 'image': ImageWorker, 'zip': ZIPWorker,
            'pdf': PDFWorker, 'game': GameWorker, 'conversation': ConversationWorker,
            'html': HTMLWorker, 'repair': RepairWorker, 'merge': MergeWorker,
            'build': BuildWorker,
        }
        for worker_type, WorkerClass in worker_classes.items():
            addr = IChingAddress(1, 1, 1, 1, 1)
            addr.dimension = 'semantic'
            actor_id = f"worker_{worker_type}"
            worker = WorkerClass(actor_id, addr)
            self.workers[worker_type] = worker

    def _init_dimensional_pipeline(self):
        dimensions = ['semantic', 'relational', 'operational', 'visual', 'temporal', 'metaphysical']
        dimension_hexagrams = {
            'semantic': [1, 2, 11, 12, 13, 14],
            'relational': [31, 32, 37, 38, 53, 54],
            'operational': [3, 4, 5, 6, 21, 22],
            'visual': [22, 30, 56, 20, 10, 23],
            'temporal': [24, 25, 49, 50, 63, 64],
            'metaphysical': [41, 42, 47, 48, 61, 62]
        }
        for dim in dimensions:
            for hex_num in dimension_hexagrams[dim]:
                addr = IChingAddress(hex_num, 1, 1, 1, 1)
                addr.dimension = dim
                actor_id = f"{dim}_gate_{hex_num}"
                actor = Actor(actor_id, addr, [dim, 'route', 'transform'])
                self.dimensional_actors[actor_id] = actor

    def classify_file(self, filepath):
        ext = Path(filepath).suffix.lower()
        if ext in self.FILE_TYPE_MAP:
            return self.FILE_TYPE_MAP[ext]
        try:
            with open(filepath, 'rb') as f:
                header = f.read(1024)
                if header.startswith(b'PK'):
                    return 'zip'
                elif header.startswith(b'%PDF'):
                    return 'pdf'
                elif b'<html' in header or b'<!DOCTYPE' in header:
                    return 'html'
                elif b'{' in header and b':' in header:
                    return 'data'
        except:
            pass
        return 'text'

    def scan_directories(self):
        discovered = []
        for watch_dir in self.watch_dirs:
            if not os.path.exists(watch_dir):
                os.makedirs(watch_dir)
                continue
            for root, dirs, files in os.walk(watch_dir):
                for filename in files:
                    filepath = os.path.join(root, filename)
                    content_type = self.classify_file(filepath)
                    discovered.append({
                        'path': filepath,
                        'type': content_type,
                        'size': os.path.getsize(filepath),
                        'modified': os.path.getmtime(filepath)
                    })
        return discovered

    def ingest_file(self, filepath, content_type=None):
        if content_type is None:
            content_type = self.classify_file(filepath)
        try:
            if content_type in ['image', 'zip', 'sound']:
                with open(filepath, 'rb') as f:
                    content = f.read()
            else:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
        except Exception as e:
            return {'error': str(e), 'path': filepath}

        text_content = content if isinstance(content, str) else f"Binary file: {filepath}"
        embedding = self.embedder.embed(text_content)

        dimensions = ['semantic', 'relational', 'operational', 'visual', 'temporal', 'metaphysical']
        results = []
        current_msg = Message(
            sender="orchestrator",
            recipient="semantic_gate_1",
            content=content,
            content_type=content_type,
            intent='mutate',
            semantic_vector=embedding,
            metadata={'filepath': filepath, 'size': len(content) if isinstance(content, bytes) else len(content)}
        )

        for i, dim in enumerate(dimensions):
            hex_num = self.embedder.route_to_hexagram(embedding, dim)
            actor_id = f"{dim}_gate_{hex_num}"
            if actor_id not in self.dimensional_actors:
                break
            actor = self.dimensional_actors[actor_id]
            current_msg.recipient = actor_id
            actor.receive(current_msg)
            outputs = actor.process()

            mutated = None
            for out in outputs:
                if out.intent == 'mutate' and out.ttl > 0:
                    mutated = out
                    results.append({
                        'dimension': dim,
                        'actor': actor_id,
                        'hexagram': hex_num,
                        'transformation': out.content
                    })

            if mutated:
                current_msg = mutated
                if i + 1 < len(dimensions):
                    next_dim = dimensions[i + 1]
                    next_hex = self.embedder.route_to_hexagram(embedding, next_dim)
                    current_msg.recipient = f"{next_dim}_gate_{next_hex}"
            else:
                break

        worker_result = self._route_to_worker(content, content_type, filepath, results)

        final_address = f"{filepath}#{hashlib.md5(text_content.encode()).hexdigest()[:8]}"
        self.graph.add_node(
            address=final_address,
            content_type=content_type,
            traits=[content_type, 'ingested'] + [r['dimension'] for r in results],
            capabilities=self._infer_capabilities(content, content_type),
            embedding=embedding,
            content=text_content[:500],
            metadata={'filepath': filepath, 'pipeline_results': results}
        )

        return {
            'path': filepath,
            'type': content_type,
            'dimensions': len(results),
            'address': final_address,
            'worker_result': worker_result,
            'status': 'ingested'
        }

    def _route_to_worker(self, content, content_type, filepath, pipeline_results):
        worker_type = content_type
        if worker_type not in self.workers:
            worker_type = 'code'
        worker = self.workers.get(worker_type)
        if not worker:
            return {'status': 'no_worker'}
        msg = Message(
            sender="orchestrator",
            recipient=worker.actor_id,
            content=content,
            content_type=content_type,
            intent='mutate',
            metadata={'filepath': filepath, 'pipeline': pipeline_results}
        )
        worker.receive(msg)
        outputs = worker.process()
        return {
            'status': 'processed',
            'worker': worker_type,
            'outputs': len(outputs)
        }

    def _infer_capabilities(self, content, content_type):
        capabilities = [content_type]
        if content_type == 'code':
            text = content if isinstance(content, str) else ''
            if 'def ' in text: capabilities.append('executable')
            if 'class ' in text: capabilities.append('object_oriented')
            if 'import ' in text: capabilities.append('modular')
            if 'return ' in text: capabilities.append('functional')
        elif content_type == 'html':
            capabilities.extend(['render', 'display', 'web'])
        elif content_type == 'image':
            capabilities.extend(['render', 'visual', 'texture'])
        elif content_type == 'zip':
            capabilities.extend(['unpack', 'container', 'archive'])
        return capabilities

    def run_repair_cycle(self):
        repairs = []
        code_nodes = self.graph.find_by_type('code')
        for addr in code_nodes:
            node = self.graph.query(addr)
            content = node.get('content', '')
            try:
                ast.parse(content)
            except SyntaxError:
                repair_msg = Message(
                    sender="orchestrator",
                    recipient="worker_repair",
                    content={'code': content, 'address': addr},
                    intent='repair'
                )
                self.workers['repair'].receive(repair_msg)
                outputs = self.workers['repair'].process()
                for out in outputs:
                    if out.intent == 'inform' and isinstance(out.content, dict):
                        if out.content.get('status') == 'repaired':
                            repairs.append({
                                'address': addr,
                                'repaired_code': out.content.get('code', '')[:100]
                            })
        return repairs

    def run_merge_cycle(self):
        duplicates = self.graph.detect_duplicates(threshold=0.85)
        merged = []
        for addr1, addr2, sim in duplicates:
            keeper = self.graph.merge_nodes(addr1, addr2)
            merged.append({
                'merged': addr1 if keeper == addr2 else addr2,
                'into': keeper,
                'similarity': sim
            })
        return merged

    def run_build_cycle(self, components=None):
        if components is None:
            components = list(self.graph.nodes.keys())[:10]
        build_msg = Message(
            sender="orchestrator",
            recipient="worker_build",
            content={'action': 'build_app', 'components': components},
            intent='command'
        )
        self.workers['build'].receive(build_msg)
        outputs = self.workers['build'].process()
        for out in outputs:
            if out.intent == 'inform' and isinstance(out.content, dict):
                if out.content.get('status') == 'built':
                    return out.content.get('app', {})
        return {'status': 'build_failed'}

    def run_full_cycle(self):
        print("[Orchestrator] Starting full cycle...")
        discovered = self.scan_directories()
        print(f"[Orchestrator] Discovered {len(discovered)} files")

        ingested = []
        for file_info in discovered:
            result = self.ingest_file(file_info['path'], file_info['type'])
            ingested.append(result)
        print(f"[Orchestrator] Ingested {len(ingested)} files")

        repairs = self.run_repair_cycle()
        print(f"[Orchestrator] Repaired {len(repairs)} broken files")

        merged = self.run_merge_cycle()
        print(f"[Orchestrator] Merged {len(merged)} duplicates")

        app = self.run_build_cycle()

        return {
            'cycle': int(time.time()),
            'discovered': len(discovered),
            'ingested': len(ingested),
            'repairs': len(repairs),
            'merged': len(merged),
            'graph_stats': self.graph.get_stats(),
            'app': app
        }

    def start(self, cycles=None):
        self.running = True
        cycle_count = 0
        while self.running:
            result = self.run_full_cycle()
            cycle_count += 1
            print(f"\n{'='*60}")
            print(f"CYCLE {cycle_count} COMPLETE")
            print(f"{'='*60}")
            print(json.dumps(result, indent=2, default=str))
            if cycles and cycle_count >= cycles:
                self.running = False
                break
            time.sleep(self.scan_interval)

    def stop(self):
        self.running = False

    def save_state(self, filepath):
        self.graph.save(filepath)

    def load_state(self, filepath):
        self.graph.load(filepath)


# ============================================================
# DEMO
# ============================================================

def demo():
    print("=" * 80)
    print("AUTOLING ORGANISM v3.0 — THE ORCHESTRATOR")
    print("=" * 80)

    os.makedirs('./incoming', exist_ok=True)

    with open('./incoming/test_app.py', 'w') as f:
        f.write("def calculate(x, y)\n")
        f.write("    return x + y\n\n")
        f.write("class GameEngine:\n")
        f.write("    def __init__(self)\n")
        f.write("        self.entities = []\n\n")
        f.write("    def add_entity(self, entity)\n")
        f.write("        self.entities.append(entity)\n\n")
        f.write('print("Hello World")\n')

    with open('./incoming/index.html', 'w') as f:
        f.write("<html>\n")
        f.write("<head><title>AutoLing App</title></head>\n")
        f.write("<body>\n")
        f.write("<h1>Welcome</h1>\n")
        f.write('<script src="app.js"></script>\n')
        f.write("</body>\n")
        f.write("</html>\n")

    with open('./incoming/dialogue.txt', 'w') as f:
        f.write("Player: Hello, shopkeeper.\n")
        f.write("Shopkeeper: Greetings! What can I get for you today?\n")
        f.write("Player: I need a sword.\n")
        f.write("Shopkeeper: That will be 50 gold.\n")
        f.write("Player: Here you go.\n")
        f.write("Shopkeeper: Pleasure doing business with you!\n")

    with open('./incoming/game_design.md', 'w') as f:
        f.write("# Dungeon Crawler RPG\n\n")
        f.write("## Entities\n")
        f.write("- Player: The hero character\n")
        f.write("- Goblin: Basic enemy\n")
        f.write("- Dragon: Boss enemy\n\n")
        f.write("## Mechanics\n")
        f.write("- Jump over obstacles\n")
        f.write("- Collect treasure\n")
        f.write("- Fight enemies\n")
        f.write("- Level up skills\n\n")
        f.write("## Levels\n")
        f.write("- Forest: Tutorial area\n")
        f.write("- Cave: First dungeon\n")
        f.write("- Castle: Final level\n")

    orchestrator = Orchestrator(
        embedder=KeywordEmbedder(dim=64),
        watch_dirs=['./incoming']
    )

    print(f"\n[Setup] Created test files in ./incoming")
    print(f"[Setup] Workers: {list(orchestrator.workers.keys())}")
    print(f"[Setup] Dimensional actors: {len(orchestrator.dimensional_actors)}")

    print(f"\n{'='*80}")
    print("RUNNING FULL CYCLE")
    print(f"{'='*80}\n")

    result = orchestrator.run_full_cycle()

    print(f"\n{'='*80}")
    print("FINAL GRAPH STATE")
    print(f"{'='*80}")
    print(json.dumps(result['graph_stats'], indent=2))

    print(f"\n{'='*80}")
    print("SAMPLE NODES")
    print(f"{'='*80}")

    for addr in list(orchestrator.graph.nodes.keys())[:3]:
        node = orchestrator.graph.query(addr)
        print(f"\nAddress: {addr}")
        print(f"  Type: {node.get('content_type')}")
        print(f"  Traits: {node.get('traits')}")
        print(f"  Capabilities: {node.get('capabilities')}")
        print(f"  Content: {str(node.get('content', ''))[:100]}...")

    print(f"\n{'='*80}")
    print("REPAIR RESULTS")
    print(f"{'='*80}")

    repairs = orchestrator.run_repair_cycle()
    for repair in repairs:
        print(f"\nRepaired: {repair['address']}")
        print(f"  Code: {repair['repaired_code'][:200]}...")

    orchestrator.save_state('./autoling_state.json')
    print(f"\n[Save] State saved to ./autoling_state.json")

    print(f"\n{'='*80}")
    print("DEMO COMPLETE")
    print(f"{'='*80}")

if __name__ == "__main__":
    demo()
