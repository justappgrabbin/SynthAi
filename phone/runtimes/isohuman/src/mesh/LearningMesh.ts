import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type KleinToolId =
  | "autoling"
  | "control-of-grammar"
  | "diseminer"
  | "paraphraser"
  | "autonovel"
  | "symbolic-validator";

export interface MeshEvidence {
  sourceId: string;
  location: string;
  checksum: string;
  text: string;
}

export interface MeshLearning {
  id: string;
  toolId: KleinToolId;
  kind: "observation" | "rule" | "relation" | "language" | "revision" | "generation";
  value: string;
  confidence: number;
  evidence: MeshEvidence[];
  learnedAt: string;
  revision: number;
}

export interface MeshEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  weight: number;
  traversals: number;
  evidenceIds: string[];
}

export interface ToolGrowth {
  toolId: KleinToolId;
  observations: number;
  acceptedLearnings: number;
  receivedLearnings: number;
  languages: string[];
  version: number;
  lastLearnedAt?: string;
}

export interface LearningMeshSnapshot {
  learnings: MeshLearning[];
  edges: MeshEdge[];
  tools: ToolGrowth[];
}

export interface MeshOrgan {
  id: KleinToolId;
  learn(input: MeshLearning, mesh: LearningMesh): void | Promise<void>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class LearningMesh {
  private readonly learnings = new Map<string, MeshLearning>();
  private readonly edges = new Map<string, MeshEdge>();
  private readonly organs = new Map<KleinToolId, MeshOrgan>();
  private readonly growth = new Map<KleinToolId, ToolGrowth>();

  register(organ: MeshOrgan): void {
    this.organs.set(organ.id, organ);
    if (!this.growth.has(organ.id)) {
      this.growth.set(organ.id, {
        toolId: organ.id,
        observations: 0,
        acceptedLearnings: 0,
        receivedLearnings: 0,
        languages: [],
        version: 1,
      });
    }
  }

  async publish(
    learning: Omit<MeshLearning, "id" | "learnedAt" | "revision">
  ): Promise<MeshLearning> {
    const id = createHash("sha256")
      .update(JSON.stringify(learning))
      .digest("hex");
    const existing = this.learnings.get(id);
    if (existing) return clone(existing);

    const stored: MeshLearning = {
      ...clone(learning),
      id,
      learnedAt: new Date().toISOString(),
      revision: 1,
    };
    this.learnings.set(id, stored);
    const owner = this.requireGrowth(stored.toolId);
    owner.observations += 1;
    owner.acceptedLearnings += stored.confidence >= 0.5 ? 1 : 0;
    owner.version += 1;
    owner.lastLearnedAt = stored.learnedAt;

    // Every organ receives accepted mesh learning. This is the shared-growth
    // boundary: tools retain their distinct jobs while learning from one field.
    if (stored.confidence >= 0.5) {
      for (const organ of this.organs.values()) {
        await organ.learn(clone(stored), this);
        const receiver = this.requireGrowth(organ.id);
        receiver.receivedLearnings += 1;
        receiver.version += 1;
        receiver.lastLearnedAt = stored.learnedAt;
      }
    }
    return clone(stored);
  }

  connect(
    from: string,
    to: string,
    relation: string,
    evidenceIds: string[] = []
  ): MeshEdge {
    const id = createHash("sha256")
      .update(`${from}\0${relation}\0${to}`)
      .digest("hex");
    const existing = this.edges.get(id);
    if (existing) {
      existing.traversals += 1;
      existing.weight = Math.min(1, existing.weight + 0.02);
      existing.evidenceIds = [...new Set([...existing.evidenceIds, ...evidenceIds])];
      return clone(existing);
    }
    const edge: MeshEdge = {
      id,
      from,
      to,
      relation,
      weight: 0.5,
      traversals: 1,
      evidenceIds: [...new Set(evidenceIds)],
    };
    this.edges.set(id, edge);
    return clone(edge);
  }

  recordLanguage(toolId: KleinToolId, language: string): void {
    const state = this.requireGrowth(toolId);
    if (!state.languages.includes(language)) {
      state.languages.push(language);
      state.version += 1;
    }
  }

  search(query: string, limit = 12): MeshLearning[] {
    const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
    return [...this.learnings.values()]
      .map((item) => ({
        item,
        score: terms.reduce(
          (score, term) =>
            score +
            (item.value.toLowerCase().includes(term) ? 2 : 0) +
            item.evidence.filter((e) => e.text.toLowerCase().includes(term)).length,
          0
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || b.item.confidence - a.item.confidence)
      .slice(0, limit)
      .map(({ item }) => clone(item));
  }

  snapshot(): LearningMeshSnapshot {
    return {
      learnings: [...this.learnings.values()].map(clone),
      edges: [...this.edges.values()].map(clone),
      tools: [...this.growth.values()].map(clone),
    };
  }

  restore(snapshot: LearningMeshSnapshot): void {
    this.learnings.clear();
    this.edges.clear();
    this.growth.clear();
    for (const learning of snapshot.learnings) this.learnings.set(learning.id, clone(learning));
    for (const edge of snapshot.edges) this.edges.set(edge.id, clone(edge));
    for (const tool of snapshot.tools) {
      this.growth.set(tool.toolId, {
        ...clone(tool),
        receivedLearnings: tool.receivedLearnings ?? 0,
      });
    }
  }

  async save(file: string): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(this.snapshot(), null, 2), "utf8");
    await fs.rename(temporary, file);
  }

  async load(file: string): Promise<boolean> {
    try {
      this.restore(JSON.parse(await fs.readFile(file, "utf8")) as LearningMeshSnapshot);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  private requireGrowth(toolId: KleinToolId): ToolGrowth {
    const state = this.growth.get(toolId);
    if (!state) throw new Error(`Klein tool ${toolId} is not registered on the mesh`);
    return state;
  }
}
