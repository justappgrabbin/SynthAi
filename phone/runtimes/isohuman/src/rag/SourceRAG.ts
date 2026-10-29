import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface RAGSource {
  id: string;
  kind: "book" | "repository" | "github" | "instruction" | "generated";
  uri: string;
  title: string;
  license?: string;
}

export interface RAGChunk {
  id: string;
  sourceId: string;
  location: string;
  text: string;
  checksum: string;
}

export interface RAGHit extends RAGChunk {
  source: RAGSource;
  score: number;
}

export class SourceRAG {
  private readonly sources = new Map<string, RAGSource>();
  private readonly chunks = new Map<string, RAGChunk>();

  addSource(source: RAGSource): void {
    this.sources.set(source.id, structuredClone(source));
  }

  addText(source: RAGSource, text: string, location = "document"): number {
    this.addSource(source);
    const paragraphs = text
      .replace(/\r/g, "")
      .split(/\n{2,}/)
      .map((value) => value.trim())
      .filter(Boolean);
    let count = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const parts = chunk(paragraphs[i], 1200);
      for (let j = 0; j < parts.length; j++) {
        const value = parts[j];
        const checksum = createHash("sha256").update(value).digest("hex");
        const id = createHash("sha256")
          .update(`${source.id}\0${location}\0${i}\0${j}\0${checksum}`)
          .digest("hex");
        this.chunks.set(id, {
          id,
          sourceId: source.id,
          location: `${location}#${i + 1}.${j + 1}`,
          text: value,
          checksum,
        });
        count += 1;
      }
    }
    return count;
  }

  async addLocalTree(source: RAGSource, root: string): Promise<number> {
    this.addSource(source);
    let count = 0;
    for (const file of await walk(root)) {
      if (!isReadableSource(file)) continue;
      const relative = path.relative(root, file).replace(/\\/g, "/");
      const text = await fs.readFile(file, "utf8");
      count += this.addText(source, text, relative);
    }
    return count;
  }

  async addGitHubRepository(
    owner: string,
    repository: string,
    token = process.env.GITHUB_TOKEN
  ): Promise<number> {
    const source: RAGSource = {
      id: `github:${owner}/${repository}`,
      kind: "github",
      uri: `https://github.com/${owner}/${repository}`,
      title: `${owner}/${repository}`,
    };
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "synthia-source-rag",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const repositoryResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repository}`,
      { headers }
    );
    if (!repositoryResponse.ok) {
      throw new Error(`GitHub repository lookup failed: ${repositoryResponse.status}`);
    }
    const metadata = (await repositoryResponse.json()) as {
      default_branch: string;
      license?: { spdx_id?: string };
    };
    source.license = metadata.license?.spdx_id;
    this.addSource(source);

    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repository}/git/trees/${encodeURIComponent(metadata.default_branch)}?recursive=1`,
      { headers }
    );
    if (!treeResponse.ok) throw new Error(`GitHub tree lookup failed: ${treeResponse.status}`);
    const tree = (await treeResponse.json()) as {
      tree: Array<{ path: string; type: string; size?: number }>;
    };
    let count = 0;
    for (const item of tree.tree) {
      if (
        item.type !== "blob" ||
        !isReadableSource(item.path) ||
        (item.size ?? 0) > 500_000
      ) continue;
      const raw = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repository}/${metadata.default_branch}/${item.path}`
      );
      if (raw.ok) count += this.addText(source, await raw.text(), item.path);
    }
    return count;
  }

  search(query: string, limit = 10): RAGHit[] {
    const terms = query.toLowerCase().split(/\W+/).filter((term) => term.length > 1);
    return [...this.chunks.values()]
      .map((item) => {
        const lower = item.text.toLowerCase();
        const score = terms.reduce((sum, term) => {
          const matches = lower.split(term).length - 1;
          return sum + Math.min(matches, 8);
        }, 0);
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item, score }) => ({
        ...structuredClone(item),
        source: structuredClone(this.sources.get(item.sourceId)!),
        score,
      }));
  }

  snapshot(): { sources: RAGSource[]; chunks: RAGChunk[] } {
    return {
      sources: [...this.sources.values()].map((source) => structuredClone(source)),
      chunks: [...this.chunks.values()].map((item) => structuredClone(item)),
    };
  }
}

function chunk(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const result: string[] = [];
  for (let start = 0; start < text.length; start += size) {
    result.push(text.slice(start, start + size));
  }
  return result;
}

async function walk(root: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "build", "__pycache__"].includes(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(full)));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

function isReadableSource(file: string): boolean {
  return /\.(md|txt|json|jsonl|ya?ml|ts|tsx|js|jsx|py|rb|cs|jl|toml)$/i.test(file);
}
