#!/usr/bin/env python3
"""
MESSY MODERN - Python Backend
Neural Engine + Code Generation + Sandbox Execution
"""

import asyncio
import json
import ast
import types
import math
import random
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from collections import defaultdict

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ============================================================
# CORE DATA STRUCTURES
# ============================================================

@dataclass
class SpatialNode:
    id: str
    position: np.ndarray = field(default_factory=lambda: np.zeros(3))
    velocity: np.ndarray = field(default_factory=lambda: np.zeros(3))
    mass: float = 1.0
    charge: float = 0.0
    extent: float = 0.0
    traits: Dict = field(default_factory=dict)

    def __hash__(self):
        # dataclass auto-generates __eq__ (field-based), which makes instances
        # unhashable by default. Nodes have a unique id, so hash on that.
        return hash(self.id)

@dataclass
class SpatialRelation:
    id: str
    max_distance: float = float('inf')
    min_distance: float = 0.0
    length: float = 1.0
    stiffness: float = 0.1
    transitive: bool = False

@dataclass
class SpatialTriple:
    subject: str
    relation: str
    object: Optional[str] = None
    value: float = 0.0
    rv: float = 1.0
    h: float = 0.0
    created: float = 0.0
    deleted: Optional[float] = None
    position: np.ndarray = field(default_factory=lambda: np.zeros(3))
    secondary: Dict = field(default_factory=dict)

    @property
    def id(self) -> str:
        return f"{self.subject}:{self.relation}:{self.object or ''}"

    def is_active(self, time: float) -> bool:
        return self.created <= time and (self.deleted is None or self.deleted > time)

class UniformGrid:
    def __init__(self, cell_size: float = 10.0):
        self.cell_size = cell_size
        self.cells: Dict[str, set] = {}

    def _key(self, x: float, y: float, z: float) -> str:
        return f"{int(x//self.cell_size)}:{int(y//self.cell_size)}:{int(z//self.cell_size)}"

    def insert(self, node: SpatialNode):
        key = self._key(*node.position)
        if key not in self.cells:
            self.cells[key] = set()
        self.cells[key].add(node)

    def get_nearby(self, center: SpatialNode, radius: float) -> List[SpatialNode]:
        results = []
        r = int(radius // self.cell_size) + 1
        cx, cy, cz = [int(c // self.cell_size) for c in center.position]

        for dx in range(-r, r+1):
            for dy in range(-r, r+1):
                for dz in range(-r, r+1):
                    key = f"{cx+dx}:{cy+dy}:{cz+dz}"
                    if key in self.cells:
                        for node in self.cells[key]:
                            dist = np.linalg.norm(node.position - center.position)
                            if dist <= radius:
                                results.append(node)
        return results

    def clear(self):
        self.cells.clear()

# ============================================================
# CANONICAL MESH
# ============================================================

class CanonicalMesh:
    def __init__(self, dimensions: int = 3, cell_size: float = 10.0):
        self.dimensions = dimensions
        self.cell_size = cell_size
        self.triples: Dict[str, SpatialTriple] = {}
        self.nodes: Dict[str, SpatialNode] = {}
        self.relations: Dict[str, SpatialRelation] = {}
        self.grid = UniformGrid(cell_size)
        self.time = 0.0
        self.callbacks: Dict[str, callable] = {}
        self.meta_triples: set = set()

        # Physics
        self.repulsion = 100.0
        self.attraction = 0.01
        self.damping = 0.9
        self.dt = 0.016

        self._init_meta_triples()

    def _init_meta_triples(self):
        self.assert_triple("MESH", "HAS", "DIMENSIONS", {"value": self.dimensions})
        self.assert_triple("MESH", "HAS", "CELL_SIZE", {"value": self.cell_size})
        self.assert_triple("MESH", "HAS", "TIME", {"value": 0})
        self.assert_triple("MESH", "CAN", "ASSERT")
        self.assert_triple("MESH", "CAN", "NEGATE")
        self.assert_triple("MESH", "CAN", "QUERY")
        self.assert_triple("MESH", "CAN", "GENERATE")
        self.assert_triple("MESH", "CAN", "EXECUTE")
        self.assert_triple("MESH", "CAN", "MODIFY_SELF")

    def assert_triple(self, subject: str, relation: str, object: Optional[str] = None, 
                      meta: Optional[Dict] = None) -> SpatialTriple:
        meta = meta or {}
        triple_id = f"{subject}:{relation}:{object or ''}"

        # Ensure nodes
        for atom in [subject, object]:
            if atom and atom not in self.nodes:
                pos = np.random.randn(3) * 10
                node = SpatialNode(id=atom, position=pos)
                self.nodes[atom] = node
                self.grid.insert(node)

        # Ensure relation
        if relation not in self.relations:
            self.relations[relation] = SpatialRelation(id=relation)

        # Create triple
        triple = SpatialTriple(
            subject=subject,
            relation=relation,
            object=object,
            value=meta.get("value", 0),
            rv=meta.get("rv", 1),
            h=meta.get("h", 0),
            created=self.time
        )

        self.triples[triple_id] = triple
        self._apply_semantic_force(triple)

        if subject in ("MESH", "SYSTEM", "NEURAL"):
            self.meta_triples.add(triple_id)

        self._notify("triple_asserted", triple)
        return triple

    def negate(self, triple_id: str):
        triple = self.triples.get(triple_id)
        if triple:
            triple.deleted = self.time
            self._notify("triple_negated", triple)

    def query(self, pattern: Optional[Dict] = None) -> List[SpatialTriple]:
        pattern = pattern or {}
        results = []
        for triple in self.triples.values():
            if triple.deleted is not None:
                continue
            if pattern.get("subject") and triple.subject != pattern["subject"]:
                continue
            if pattern.get("relation") and triple.relation != pattern["relation"]:
                continue
            if pattern.get("object") and triple.object != pattern["object"]:
                continue
            results.append(triple)
        return results

    def query_radius(self, center_id: str, radius: float) -> List[Tuple[SpatialTriple, float]]:
        center = self.nodes.get(center_id)
        if not center:
            return []

        candidates = self.grid.get_nearby(center, radius)
        results = []

        for node in candidates:
            dist = np.linalg.norm(node.position - center.position)
            if dist <= radius:
                for triple in self.triples.values():
                    if triple.deleted is not None:
                        continue
                    if triple.subject == node.id or triple.object == node.id:
                        results.append((triple, dist))

        return sorted(results, key=lambda x: x[1])

    def _apply_semantic_force(self, triple: SpatialTriple):
        rel = self.relations.get(triple.relation)
        s_node = self.nodes.get(triple.subject)
        o_node = self.nodes.get(triple.object) if triple.object else None

        if not all([rel, s_node, o_node]):
            return

        # Relation-specific physics
        relation_physics = {
            "LOVES": (2.0, 0.5),
            "AFFECTION": (2.0, 0.5),
            "LIKES": (3.0, 0.3),
            "HATES": (-5.0, 0.3),
            "AVOIDS": (-5.0, 0.3),
            "MARRIED": (1.0, 2.0),
            "AT": (0.0, 10.0),
            "WANTS": (3.0, 0.2),
        }

        if triple.relation in relation_physics:
            rel.length, rel.stiffness = relation_physics[triple.relation]
        else:
            rel.length = 4.0
            rel.stiffness = 0.1

        # Apply force
        diff = o_node.position - s_node.position
        dist = np.linalg.norm(diff)

        if dist > 0.1:
            displacement = dist - abs(rel.length)
            force = rel.stiffness * displacement * (1 if rel.length >= 0 else -1)
            direction = diff / dist

            s_node.velocity -= direction * force * self.dt
            o_node.velocity += direction * force * self.dt

    def step(self, dt: Optional[float] = None) -> float:
        dt = dt or self.dt
        self.time += dt

        # Repulsion
        node_list = list(self.nodes.values())
        for i in range(len(node_list)):
            for j in range(i+1, len(node_list)):
                n1, n2 = node_list[i], node_list[j]
                diff = n2.position - n1.position
                dist = np.linalg.norm(diff)
                if 0.1 < dist < 30:
                    force = self.repulsion / (dist ** 2)
                    direction = diff / dist
                    n1.velocity -= direction * force * dt
                    n2.velocity += direction * force * dt

        # Attraction along edges
        for triple in self.triples.values():
            if triple.deleted is not None:
                continue
            self._apply_semantic_force(triple)

        # Update positions
        for node in self.nodes.values():
            node.velocity *= self.damping
            node.position += node.velocity * dt

        # Reindex
        self.grid.clear()
        for node in self.nodes.values():
            self.grid.insert(node)

        self._notify("physics_step", {"time": self.time})
        return self.time

    def _notify(self, event: str, data: Any):
        for name, handler in self.callbacks.items():
            try:
                handler(event, data)
            except Exception as e:
                print(f"Surface {name} failed: {e}")

    def register_surface(self, name: str, handler: callable):
        self.callbacks[name] = handler

    def get_stats(self) -> Dict:
        active = [t for t in self.triples.values() if t.deleted is None]
        return {
            "nodes": len(self.nodes),
            "triples": len(self.triples),
            "active": len(active),
            "time": round(self.time, 2)
        }

    def to_dict(self) -> Dict:
        return {
            "nodes": {k: {"position": v.position.tolist()} for k, v in self.nodes.items()},
            "triples": [
                {
                    "subject": t.subject,
                    "relation": t.relation,
                    "object": t.object,
                    "value": t.value,
                    "created": t.created,
                    "deleted": t.deleted
                }
                for t in self.triples.values()
            ],
            "time": self.time
        }

# ============================================================
# NEURAL CODE GENERATION (Simplified - would use PyTorch in production)
# ============================================================

class NeuralCodeGenerator:
    """Simplified code generator - in production this would use a fine-tuned transformer"""

    def __init__(self, mesh: CanonicalMesh):
        self.mesh = mesh
        self.templates = self._load_templates()

    def _load_templates(self) -> Dict[str, Any]:
        return {
            "javascript": self._generate_js,
            "html5": self._generate_html,
            "threejs": self._generate_threejs,
            "shader": self._generate_shader,
            "python": self._generate_python
        }

    def generate(self, target: str = "javascript") -> str:
        active = self.mesh.query()
        context = self._build_context(active)
        generator = self.templates.get(target, self._generate_js)
        return generator(context)

    def _build_context(self, triples: List[SpatialTriple]) -> Dict:
        entities = set()
        relations = set()
        patterns = []

        for t in triples:
            entities.add(t.subject)
            if t.object:
                entities.add(t.object)
            relations.add(t.relation)
            patterns.append({
                "s": t.subject,
                "r": t.relation,
                "o": t.object,
                "v": t.value
            })

        return {
            "entities": list(entities),
            "relations": list(relations),
            "patterns": patterns
        }

    def _generate_js(self, context: Dict) -> str:
        entities = context["entities"]
        patterns = context["patterns"]

        code = "// Generated by MESSY Modern\n"
        code += f"// Context: {len(entities)} entities, {len(patterns)} patterns\n\n"
        code += "class GeneratedGame {\n"
        code += "  constructor() {\n"
        code += f"    this.entities = {json.dumps(entities)};\n"
        code += "    this.state = new Map();\n"
        code += "  }\n\n"

        for rel in set(p["r"] for p in patterns):
            code += f"  {rel.lower()}(subject, object) {{\n"
            code += f"    console.log(`${{subject}} {rel} ${{object}}`);\n"
            code += "  }\n\n"

        code += "  init() {\n"
        for p in patterns:
            code += f"    this.{p['r'].lower()}('{p['s']}', '{p.get('o', '')}');\n"
        code += "  }\n}\n"

        return code

    def _generate_html(self, context: Dict) -> str:
        html = "<!DOCTYPE html>\n<html>\n<head>\n"
        html += "  <title>Generated App</title>\n"
        html += "</head>\n<body>\n"
        html += "  <h1>Generated from Semantic Network</h1>\n"
        for entity in context["entities"]:
            html += f"  <div>{entity}</div>\n"
        html += "</body>\n</html>"
        return html

    def _generate_threejs(self, context: Dict) -> str:
        code = "// Three.js Scene\n"
        code += "const scene = new THREE.Scene();\n"
        for entity in context["entities"]:
            color = hex(random.randint(0, 0xFFFFFF))
            code += f"const {entity.lower()} = new THREE.Mesh(\n"
            code += "  new THREE.SphereGeometry(0.5),\n"
            code += f"  new THREE.MeshBasicMaterial({{color: 0x{color}}})\n"
            code += ");\n"
            code += f"scene.add({entity.lower()});\n"
        return code

    def _generate_shader(self, context: Dict) -> str:
        shader = "// GLSL Fragment Shader\n"
        shader += "precision highp float;\n"
        shader += "uniform float u_time;\n"
        shader += "uniform vec2 u_resolution;\n\n"
        shader += "void main() {\n"
        shader += "  vec2 uv = gl_FragCoord.xy / u_resolution;\n"
        shader += "  float pattern = sin(uv.x * 10.0 + u_time);\n"
        shader += "  gl_FragColor = vec4(vec3(pattern), 1.0);\n"
        shader += "}\n"
        return shader

    def _generate_python(self, context: Dict) -> str:
        code = "# Generated by MESSY Modern\n"
        code += "class SemanticNetwork:\n"
        code += "    def __init__(self):\n"
        code += "        self.triples = []\n\n"
        code += "    def assert_triple(self, s, r, o):\n"
        code += "        self.triples.append((s, r, o))\n"
        for p in context["patterns"]:
            code += f"network.assert_triple('{p['s']}', '{p['r']}', '{p.get('o', '')}')\n"
        return code

# ============================================================
# SANDBOX EXECUTION
# ============================================================

class TripleSandbox:
    """Restricted execution environment for generated code"""

    ALLOWED_NODES = {
        ast.Expression, ast.Call, ast.Name, ast.Constant, ast.BinOp,
        ast.UnaryOp, ast.BoolOp, ast.Compare, ast.If, ast.For, ast.While,
        ast.FunctionDef, ast.Return, ast.Assign, ast.AugAssign,
        ast.List, ast.Dict, ast.Tuple, ast.Subscript, ast.Attribute,
        ast.Module, ast.Load, ast.Store, ast.Expr
    }

    def __init__(self, mesh: CanonicalMesh, surface: str = "python"):
        self.mesh = mesh
        self.surface = surface
        self.triples = []
        self.log = []

    def execute(self, code: str) -> Dict[str, Any]:
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return {"success": False, "error": str(e)}

        # Validate AST
        for node in ast.walk(tree):
            if type(node) not in self.ALLOWED_NODES:
                return {"success": False, "error": f"Disallowed: {type(node).__name__}"}

        # Prepare environment
        env = {
            "__builtins__": {
                "len": len, "range": range, "enumerate": enumerate,
                "zip": zip, "map": map, "filter": filter,
                "sum": sum, "min": min, "max": max,
                "abs": abs, "round": round, "int": int, "float": float,
                "str": str, "bool": bool, "list": list, "dict": dict,
                "set": set, "tuple": tuple, "print": self._safe_print,
                "math": math, "random": random
            },
            "assert_triple": self._assert_triple,
            "query": self._query,
            "mesh": self.mesh
        }

        try:
            compiled = compile(tree, "<generated>", "exec")
            exec(compiled, env)
            return {
                "success": True,
                "triples": self.triples,
                "log": self.log
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _assert_triple(self, s: str, r: str, o: str = None, **kwargs):
        self.triples.append((s, r, o, kwargs))
        self.mesh.assert_triple(s, r, o, kwargs)

    def _query(self, pattern: Dict) -> List:
        return self.mesh.query(pattern)

    def _safe_print(self, *args):
        self.log.append(" ".join(str(a) for a in args))

# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(title="MESSY Modern API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global mesh instance
mesh = CanonicalMesh()
generator = NeuralCodeGenerator(mesh)

@app.get("/")
async def root():
    return {"status": "MESSY Modern Backend", "version": "1.0"}

@app.get("/stats")
async def get_stats():
    return mesh.get_stats()

@app.get("/triples")
async def get_triples(subject: Optional[str] = None, relation: Optional[str] = None, 
                       object: Optional[str] = None):
    return [{
        "subject": t.subject,
        "relation": t.relation,
        "object": t.object,
        "value": t.value,
        "created": t.created
    } for t in mesh.query({"subject": subject, "relation": relation, "object": object})]

@app.post("/triples")
async def assert_triple(data: Dict):
    triple = mesh.assert_triple(
        data["subject"],
        data["relation"],
        data.get("object"),
        data.get("meta", {})
    )
    return {"id": triple.id, "status": "asserted"}

@app.delete("/triples/{triple_id}")
async def negate_triple(triple_id: str):
    mesh.negate(triple_id)
    return {"status": "negated"}

@app.post("/generate")
async def generate_code(data: Dict):
    target = data.get("target", "javascript")
    code = generator.generate(target)
    return {"code": code, "target": target}

@app.post("/execute")
async def execute_code(data: Dict):
    code = data.get("code", "")
    surface = data.get("surface", "python")
    sandbox = TripleSandbox(mesh, surface)
    result = sandbox.execute(code)
    return result

@app.post("/step")
async def step_simulation():
    mesh.step()
    return mesh.get_stats()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    def handler(event, data):
        asyncio.create_task(websocket.send_json({
            "event": event,
            "data": str(data) if not isinstance(data, dict) else data
        }))

    mesh.register_surface("websocket", handler)

    try:
        while True:
            msg = await websocket.receive_json()
            if msg.get("action") == "assert":
                mesh.assert_triple(
                    msg["subject"], msg["relation"], msg.get("object"), msg.get("meta", {})
                )
            elif msg.get("action") == "step":
                mesh.step()
                await websocket.send_json({"event": "step", "stats": mesh.get_stats()})
            elif msg.get("action") == "generate":
                code = generator.generate(msg.get("target", "javascript"))
                await websocket.send_json({"event": "generated", "code": code})
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
