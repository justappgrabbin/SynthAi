import { AutolingEngine } from "../klein/AutolingEngine";
import { DiseminerEngine } from "../klein/DiseminerEngine";
import { GrammarInducer } from "../klein/GrammarInducer";
import { NarrativeGenerator } from "../klein/NarrativeGenerator";
import { Paraphraser } from "../klein/Paraphraser";
import { SymbolicValidator } from "../klein/SymbolicValidator";
import { KleinToolId, LearningMesh, MeshLearning, MeshOrgan } from "./LearningMesh";

class LearningOrgan implements MeshOrgan {
  readonly seen = new Set<string>();

  constructor(
    readonly id: KleinToolId,
    private readonly onLearn: (learning: MeshLearning, mesh: LearningMesh) => void
  ) {}

  learn(learning: MeshLearning, mesh: LearningMesh): void {
    if (this.seen.has(learning.id)) return;
    this.seen.add(learning.id);
    this.onLearn(learning, mesh);
  }
}

export class KleinMeshRuntime {
  readonly mesh = new LearningMesh();
  readonly autoling = new AutolingEngine();
  readonly grammar = new GrammarInducer();
  readonly diseminer = new DiseminerEngine();
  readonly paraphraser = new Paraphraser();
  readonly autonovel = new NarrativeGenerator();
  readonly validator = new SymbolicValidator();

  constructor() {
    this.mesh.register(new LearningOrgan("autoling", (learning, mesh) => {
      const language =
        learning.kind === "language"
          ? learning.value.split(":")[0].trim().toLowerCase()
          : "english";
      mesh.recordLanguage("autoling", language);
    }));
    this.mesh.register(new LearningOrgan("control-of-grammar", (learning) => {
      const sequence = learning.value.toLowerCase().match(/[a-z]+/g) ?? [];
      if (sequence.length > 1) this.grammar.learn([{ sequence, valid: true }]);
    }));
    this.mesh.register(new LearningOrgan("diseminer", (learning, mesh) => {
      const match = learning.value.match(/^\s*(.+?)\s+(is|has|becomes|causes|contains)\s+(.+?)\s*$/i);
      if (match) mesh.connect(match[1], match[3], match[2].toLowerCase(), [learning.id]);
    }));
    this.mesh.register(new LearningOrgan("paraphraser", () => undefined));
    this.mesh.register(new LearningOrgan("autonovel", () => undefined));
    this.mesh.register(new LearningOrgan("symbolic-validator", () => undefined));
  }

  async learn(
    toolId: KleinToolId,
    kind: MeshLearning["kind"],
    value: string,
    confidence: number,
    evidence: MeshLearning["evidence"] = []
  ): Promise<MeshLearning> {
    return this.mesh.publish({ toolId, kind, value, confidence, evidence });
  }
}
