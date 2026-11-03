import {
  createFiveSpaceState,
  GeonatalAddress,
  PerspectivePlacement,
  validateGeonatalAddress,
} from "../src/state/FiveSpaceState";
import {
  activateEmergence,
  possibilityFromPlacement,
} from "../src/emergence/GateEmergence";
import { ATOEngine, ATOOperation } from "../src/ato/ATOEngine";
import {
  applyStrongEquivalence,
  operatorBetween,
  strongEquivalenceCode,
  validateBinaryCatalog,
} from "../src/ato/KleinStrongEquivalence";
import {
  ToolOrgan,
  ToolTriplet,
  TripletToolComposer,
} from "../src/composition/TripletToolComposer";
import {
  KnowledgeCandidate,
  SharedLearningMemory,
} from "../src/memory/SharedLearningMemory";
import { ReversibleCorrection } from "../src/correction/ReversibleCorrection";
import { JsonSnapshotRepository } from "../src/persistence/JsonSnapshotRepository";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  calculateGeonatalChart,
  humanDesignResolution,
} from "../src/astrology/GeonatalCalculator";
import { ToolGenomeRegistry } from "../src/composition/ToolGenomeRegistry";
import { EmergentChannelResolver } from "../src/channels/EmergentChannelFunction";

function address(overrides: Partial<GeonatalAddress> = {}): GeonatalAddress {
  return {
    planetary: "Sun",
    dimension: "being",
    gate: 1,
    line: 2,
    color: 3,
    tone: 4,
    base: 5,
    degree: 12,
    minute: 34,
    second: 56,
    arc: 78,
    zodiac: 9,
    house: 10,
    orientation: "personality",
    ascendingSide: 3,
    ...overrides,
  };
}

function placement(
  id: string,
  overrides: Partial<GeonatalAddress> = {}
): PerspectivePlacement {
  return {
    id,
    address: address(overrides),
    sourceIds: ["fixture"],
    confidence: 1,
  };
}

describe("five-space foundation", () => {
  test("validates all thirteen address levels and orientation metadata", () => {
    expect(validateGeonatalAddress(address())).toEqual([]);
    expect(validateGeonatalAddress(address({ gate: 65 }))).toContain(
      "gate must be an integer from 1 through 64"
    );
    expect(validateGeonatalAddress(address({ minute: 60 }))).toContain(
      "minute must be an integer from 0 through 59"
    );
  });

  test("places Being in the center and the other complete views at corners", () => {
    const state = createFiveSpaceState(
      "state-1",
      "user-1",
      [
        placement("being-1"),
        placement("movement-1", { dimension: "movement" }),
        placement("space-1", { dimension: "space" }),
      ],
      ["movement"]
    );

    expect(state.being.position).toBe("center");
    expect(state.movement.position).toBe("corner");
    expect(state.evolution.position).toBe("corner");
    expect(state.design.position).toBe("corner");
    expect(state.space.position).toBe("corner");
    expect(state.movement.layers.map((layer) => layer.scale)).toEqual([
      "micro",
      "macro",
    ]);
    expect(state.movement.layers[0].placements[0].id).toBe("movement-1");
  });

  test("a gate creates an LCTB emergence possibility without auto-activating it", () => {
    const source = placement("gate-possibility", {
      gate: 28,
      line: 3,
      color: 2,
      tone: 6,
      base: 1,
    });
    const possibility = possibilityFromPlacement(source);

    expect(possibility.status).toBe("possible");
    expect(possibility.lctb).toEqual({ line: 3, color: 2, tone: 6, base: 1 });
    expect(activateEmergence(possibility, "transit:complement").status).toBe(
      "active"
    );
  });
});

describe("ATO engine", () => {
  test("changes directed lines and can return through its reciprocal", () => {
    const operation: ATOOperation = {
      id: "ato-1",
      triple: {
        id: "triple-1",
        subject: {
          id: "subject",
          value: "source",
          perspective: "being",
          statePattern: "000000",
        },
        relation: "changes through",
        object: {
          id: "object",
          value: "result",
          perspective: "movement",
          statePattern: "100001",
        },
      },
      rootPattern: "000000",
      changedLines: [1, 6],
      preservedDimensions: ["gate"],
      provenanceIds: ["fixture"],
    };
    const engine = new ATOEngine();
    const result = engine.transform(operation);

    expect(result.resultantPattern).toBe("100001");
    expect(result.operatorPattern).toBe("011110");
    expect(engine.reverse(result).resultantPattern).toBe("000000");
    expect(result.reciprocal.triple.subject.id).toBe("object");
  });

  test("uses Klein strong equivalence as a recoverable binary operator", () => {
    const root = "001101";
    const resultant = "101001";
    const operator = operatorBetween(root, resultant);

    expect(operator.code).toBe(strongEquivalenceCode(root, resultant));
    expect(applyStrongEquivalence(root, operator.code).code).toBe(resultant);
    expect(applyStrongEquivalence(resultant, operator.code).code).toBe(root);
  });

  test("rejects a catalog shape containing duplicate and missing states", () => {
    const validation = validateBinaryCatalog(
      [
        { code: "000", number: 1, name: "first" },
        { code: "000", number: 2, name: "duplicate" },
        { code: "001", number: 2, name: "duplicate number" },
      ],
      3
    );

    expect(validation.valid).toBe(false);
    expect(validation.duplicateCodes).toEqual(["000"]);
    expect(validation.duplicateNumbers).toEqual([2]);
    expect(validation.missingCodes).toContain("111");
  });
});

describe("recursive triplet tools", () => {
  test("executes input, transformation, and output organs in order", async () => {
    const input: ToolOrgan<string, string> = {
      id: "read",
      role: "input",
      execute: (value) => value.trim(),
    };
    const transform: ToolOrgan<string, string> = {
      id: "understand",
      role: "transform",
      execute: (value) => value.toUpperCase(),
    };
    const output: ToolOrgan<string, string> = {
      id: "express",
      role: "output",
      execute: (value) => `Report: ${value}`,
    };
    const tool: ToolTriplet<string, string, string> = {
      id: "reader-report",
      input,
      transform,
      output,
    };

    const result = await new TripletToolComposer().execute(tool, "  evidence  ");
    expect(result.output).toBe("Report: EVIDENCE");
    expect(result.trace).toEqual(["read", "understand", "express"]);
  });

  test("allows a complete triplet to become one organ in another triplet", async () => {
    const composer = new TripletToolComposer();
    const inner: ToolTriplet<string, string, string> = {
      id: "inner",
      input: { id: "take", role: "input", execute: (value) => value },
      transform: {
        id: "shape",
        role: "transform",
        execute: (value) => `${value}!`,
      },
      output: { id: "give", role: "output", execute: (value) => value },
    };
    const outer: ToolTriplet<string, string, string> = {
      id: "outer",
      input: composer.asOrgan(inner, "input"),
      transform: {
        id: "reflect",
        role: "transform",
        execute: (value) => `[${value}]`,
      },
      output: { id: "deliver", role: "output", execute: (value) => value },
    };

    const result = await composer.execute(outer, "meaning");
    expect(result.output).toBe("[meaning!]");
    expect(result.trace).toEqual([
      "inner",
      "take",
      "shape",
      "give",
      "reflect",
      "deliver",
    ]);
  });
});

function learningCandidate(): KnowledgeCandidate {
  return {
    id: "candidate-1",
    triple: {
      id: "triple-learning",
      subject: {
        id: "book",
        value: "book",
        perspective: "being",
        statePattern: "000000",
      },
      relation: "describes",
      object: {
        id: "movement",
        value: "movement",
        perspective: "movement",
        statePattern: "000001",
      },
    },
    observationIds: ["observation-1"],
    normalizationIds: [],
    confidence: 0.8,
    status: "candidate",
    revision: 0,
  };
}

describe("shared learning and correction", () => {
  test("keeps evidence immutable and separates candidates from approved knowledge", () => {
    const memory = new SharedLearningMemory();
    const observation = {
      id: "observation-1",
      sourceId: "book-1",
      sourceLocation: "page 1",
      originalText: "Movement is Energy",
      checksum: "checksum-1",
      observedAt: "2026-07-23T00:00:00.000Z",
    };
    memory.recordObservation(observation);
    memory.addCandidate(learningCandidate());

    expect(memory.approvedKnowledge()).toEqual([]);
    expect(() =>
      memory.recordObservation({ ...observation, originalText: "changed" })
    ).toThrow("immutable");
  });

  test("approves and rolls back knowledge without deleting revision history", () => {
    const memory = new SharedLearningMemory();
    memory.recordObservation({
      id: "observation-1",
      sourceId: "book-1",
      sourceLocation: "page 1",
      originalText: "Movement is Energy",
      checksum: "checksum-1",
      observedAt: "2026-07-23T00:00:00.000Z",
    });
    memory.addCandidate(learningCandidate());
    const correction = new ReversibleCorrection(memory);

    const approval = correction.apply({
      candidateId: "candidate-1",
      decision: "approve",
      reason: "supported by source",
    });
    expect(memory.approvedKnowledge()).toHaveLength(1);

    const rollback = correction.rollback(approval.id, "review requested");
    expect(memory.approvedKnowledge()).toHaveLength(0);
    expect(rollback.reversedRevisionId).toBe(approval.id);
    expect(memory.snapshot().revisions).toHaveLength(2);
  });

  test("survives save and reload through the local persistence boundary", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "isohuman-"));
    try {
      const file = path.join(directory, "learning.json");
      const original = new SharedLearningMemory();
      original.recordObservation({
        id: "observation-1",
        sourceId: "book-1",
        sourceLocation: "page 1",
        originalText: "Movement is Energy",
        checksum: "checksum-1",
        observedAt: "2026-07-23T00:00:00.000Z",
      });
      original.addCandidate(learningCandidate());
      new ReversibleCorrection(original).apply({
        candidateId: "candidate-1",
        decision: "approve",
        reason: "verified",
      });

      const repository = new JsonSnapshotRepository(file);
      await repository.save(original);
      const restored = new SharedLearningMemory();
      expect(await repository.load(restored)).toBe(true);
      expect(restored.approvedKnowledge()[0].triple.relation).toBe("describes");
      expect(restored.snapshot().revisions).toHaveLength(1);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});

describe("local geonatal calculations", () => {
  test("resolves the beginning of Gate 41 through all LCTB levels", () => {
    expect(humanDesignResolution(302)).toEqual({
      gate: 41,
      line: 1,
      color: 1,
      tone: 1,
      base: 1,
    });
  });

  test("calculates three frames, two imprint sides, thirteen bodies, and five views", () => {
    const chart = calculateGeonatalChart(
      new Date("1988-10-09T12:30:00.000Z"),
      { latitude: 31.2304, longitude: 121.4737 }
    );

    expect(chart.placements).toHaveLength(13 * 3 * 2);
    expect(chart.perspectives.being).toHaveLength(13 * 3 * 2);
    expect(chart.perspectives.movement.every((item) => item.dimension === "movement")).toBe(true);
    expect(new Date(chart.designTimestamp).getTime()).toBeLessThan(
      new Date(chart.timestamp).getTime()
    );
    expect(chart.placements.every((item) => item.gate >= 1 && item.gate <= 64)).toBe(true);
    expect(chart.placements.every((item) => item.house >= 1 && item.house <= 12)).toBe(true);
    expect(
      chart.placements.some((item) => item.frame === "sidereal_fagan_bradley")
    ).toBe(true);
    expect(
      chart.placements.some((item) => item.frame === "draconic_tropical_true")
    ).toBe(true);
  });
});

describe("structural tool genomes and emergent channel functions", () => {
  test("composes three compatible organs and matches the resulting capability", async () => {
    const registry = new ToolGenomeRegistry();
    const genome = (id: string, root: string, result: string) => ({
      id,
      binaryRoot: root,
      binaryResultant: result,
      atoOperator: "111111",
      perspective: "being" as const,
      provenanceIds: ["test"],
    });
    registry.registerOrgan({
      id: "reader",
      capabilities: ["read"],
      accepts: "text",
      returns: "tokens",
      genome: genome("reader-g", "000000", "000001"),
      organ: { id: "reader", role: "input", execute: (value) => String(value).split(" ") },
    });
    registry.registerOrgan({
      id: "reasoner",
      capabilities: ["infer"],
      accepts: "tokens",
      returns: "tokens",
      genome: genome("reasoner-g", "000001", "000011"),
      organ: { id: "reasoner", role: "transform", execute: (value) => value },
    });
    registry.registerOrgan({
      id: "writer",
      capabilities: ["report"],
      accepts: "tokens",
      returns: "text",
      genome: genome("writer-g", "000011", "000111"),
      organ: { id: "writer", role: "output", execute: (value) => (value as string[]).join("-") },
    });
    const tool = registry.compose("research-report", "reader", "reasoner", "writer", {
      id: "tool-g",
      binaryRoot: "000000",
      binaryResultant: "000111",
      perspective: "being",
      gate: 11,
      line: 1,
      color: 1,
      tone: 1,
      base: 1,
      provenanceIds: ["test"],
    });

    expect(tool.componentIds).toEqual(["reader", "reasoner", "writer"]);
    expect(tool.genome.atoOperator).toBe("111000");
    expect(registry.match(["read", "report"])[0].id).toBe("research-report");
    expect(await registry.execute("research-report", "source evidence")).toBe("source-evidence");
  });

  test("a complementary contextual gate creates a temporary executable edge", () => {
    const resolver = new EmergentChannelResolver();
    const channels = resolver.resolve(
      [43],
      [{ gate: 23, source: "contact" }]
    );
    const structuring = channels.find((item) => item.channel.id === "43-23");

    expect(structuring).toBeDefined();
    expect(structuring!.temporary).toBe(true);
    expect(structuring!.edgeFunction("compressed").channelId).toBe("43-23");
    expect(structuring!.edgeFunction("compressed").input).toBe("compressed");
  });
});
