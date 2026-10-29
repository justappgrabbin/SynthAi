import { promises as fs } from "node:fs";
import path from "node:path";
import { KleinMeshRuntime } from "../mesh/KleinMeshRuntime";
import { SourceRAG, RAGSource } from "../rag/SourceRAG";
import { SynthiaAssignment, SynthiaMeshBuilder } from "../synthia/SynthiaMeshBuilder";

async function main(): Promise<void> {
  const projectRoot = path.resolve(__dirname, "../../../..");
  const workspaceRoot = path.resolve(projectRoot, "../..");
  const assignmentFile = path.join(projectRoot, "data", "synthia", "mesh-assignment.json");
  const assignment = JSON.parse(
    await fs.readFile(assignmentFile, "utf8")
  ) as SynthiaAssignment;
  assignment.outputDirectory = path.resolve(projectRoot, assignment.outputDirectory);

  const rag = new SourceRAG();
  rag.addText(
    {
      id: `instruction:${assignment.id}`,
      kind: "instruction",
      uri: assignmentFile,
      title: assignment.title,
    },
    [assignment.objective, ...assignment.instructions].join("\n\n")
  );

  await addTreeIfPresent(rag, {
    id: "books:source-reading",
    kind: "book",
    uri: path.join(workspaceRoot, "work", "source-reading"),
    title: "Supplied source books",
  });
  await addTreeIfPresent(rag, {
    id: "repository:human-design-llm",
    kind: "repository",
    uri: path.join(workspaceRoot, "work", "human-design-llm"),
    title: "Human Design LLM repository",
  });
  await addTreeIfPresent(rag, {
    id: "repository:isohuman",
    kind: "repository",
    uri: path.join(projectRoot, "runtimes", "isohuman", "src"),
    title: "IsoHuman runtime",
  });

  // Local checkouts are indexed with their canonical GitHub identity so the
  // first learning run does not require an API key or paid service.
  const githubMirrors: Array<[string, string]> = [
    ["The-Biverse-Foundation/rave-cosmology-research", "rave-cosmology-research"],
    ["joyozhang333-lgtm/human-design-llm", "human-design-llm"],
    ["RoxyAPI/astrology-ai-chatbot", "astrology-ai-chatbot"],
    ["CReizner/SharpAstrology.HumanDesign", "sharpastrology-human-design"],
    ["PashaKharambura/HumanDesign", "pasha-human-design"],
  ];
  for (const [identity, directory] of githubMirrors) {
    await addTreeIfPresent(rag, {
      id: `github:${identity}`,
      kind: "github",
      uri: `https://github.com/${identity}`,
      title: identity,
    }, path.join(workspaceRoot, "work", directory));
  }

  await fs.mkdir(assignment.outputDirectory, { recursive: true });
  await fs.writeFile(
    path.join(assignment.outputDirectory, "rag-index.json"),
    JSON.stringify(rag.snapshot(), null, 2),
    "utf8"
  );
  const proposal = await new SynthiaMeshBuilder(
    new KleinMeshRuntime(),
    rag
  ).acceptAssignment(assignment);
  process.stdout.write(`${JSON.stringify(proposal, null, 2)}\n`);

  async function addTreeIfPresent(
    index: SourceRAG,
    source: RAGSource,
    explicitRoot = source.uri
  ): Promise<void> {
    try {
      await fs.access(explicitRoot);
      await index.addLocalTree(source, explicitRoot);
    } catch {
      // Missing optional material is reported by required-evidence checks.
    }
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
