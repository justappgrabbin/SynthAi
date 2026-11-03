import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { KleinMeshRuntime } from "../src/mesh/KleinMeshRuntime";
import { SourceRAG } from "../src/rag/SourceRAG";
import { SynthiaMeshBuilder } from "../src/synthia/SynthiaMeshBuilder";

describe("shared Klein learning mesh", () => {
  test("all Klein organs receive shared learning and grow from it", async () => {
    const runtime = new KleinMeshRuntime();
    await runtime.learn(
      "autoling",
      "language",
      "english: movement is energy",
      0.9,
      [{
        sourceId: "book",
        location: "page 1",
        checksum: "one",
        text: "Movement is Energy",
      }]
    );

    const snapshot = runtime.mesh.snapshot();
    expect(snapshot.tools.map((tool) => tool.toolId).sort()).toEqual([
      "autoling",
      "autonovel",
      "control-of-grammar",
      "diseminer",
      "paraphraser",
      "symbolic-validator",
    ]);
    expect(snapshot.tools.every((tool) => tool.receivedLearnings === 1)).toBe(true);
    expect(snapshot.tools.every((tool) => tool.version > 1)).toBe(true);
    expect(runtime.grammar.getRules().length).toBeGreaterThan(0);
    expect(snapshot.edges.some((edge) => edge.relation === "is")).toBe(true);
  });

  test("persists mesh learning and tool growth", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "learning-mesh-"));
    try {
      const file = path.join(directory, "mesh.json");
      const first = new KleinMeshRuntime();
      await first.learn("diseminer", "relation", "Being is Matter", 0.9);
      await first.mesh.save(file);

      const second = new KleinMeshRuntime();
      expect(await second.mesh.load(file)).toBe(true);
      expect(second.mesh.search("Matter")).toHaveLength(1);
      expect(second.mesh.snapshot().edges).toHaveLength(1);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});

describe("source-grounded Synthia assignment", () => {
  test("retrieves evidence and writes a reversible build proposal", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "synthia-build-"));
    try {
      const rag = new SourceRAG();
      rag.addText(
        {
          id: "instruction:mesh",
          kind: "instruction",
          uri: "memory://mesh",
          title: "Mesh instruction",
        },
        "Build a generative mesh from semantic triples. Every relation keeps provenance."
      );
      rag.addText(
        {
          id: "github:example/mesh",
          kind: "github",
          uri: "https://github.com/example/mesh",
          title: "Mesh source",
        },
        "ATO composes binary operators and tools grow through shared learning."
      );
      const runtime = new KleinMeshRuntime();
      const proposal = await new SynthiaMeshBuilder(runtime, rag).acceptAssignment({
        id: "mesh-1",
        title: "Build the mesh",
        objective: "Build a generative mesh from semantic triples and ATO",
        instructions: ["Keep evidence immutable."],
        requiredEvidenceKinds: ["instruction", "github"],
        acceptanceTests: ["All Klein organs receive learning."],
        outputDirectory: directory,
      });

      expect(proposal.retrievedEvidence.length).toBeGreaterThan(0);
      expect(proposal.findings).toContain("Every required evidence kind is represented.");
      expect(await fs.stat(path.join(directory, "build-proposal.json"))).toBeDefined();
      expect(await fs.stat(path.join(directory, "learning-mesh.json"))).toBeDefined();
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
