import { promises as fs } from "node:fs";
import path from "node:path";
import {
  LearningSnapshot,
  SharedLearningMemory,
} from "../memory/SharedLearningMemory";

export class JsonSnapshotRepository {
  constructor(private readonly filePath: string) {}

  async save(memory: SharedLearningMemory): Promise<void> {
    const directory = path.dirname(this.filePath);
    const temporaryPath = `${this.filePath}.tmp`;
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      temporaryPath,
      JSON.stringify(memory.snapshot(), null, 2),
      "utf8"
    );
    await fs.rename(temporaryPath, this.filePath);
  }

  async load(memory: SharedLearningMemory): Promise<boolean> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      memory.restore(JSON.parse(raw) as LearningSnapshot);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }
}

