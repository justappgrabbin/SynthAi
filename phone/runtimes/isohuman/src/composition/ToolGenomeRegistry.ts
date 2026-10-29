import { operatorBetween } from "../ato/KleinStrongEquivalence";
import {
  ToolOrgan,
  ToolTriplet,
  TripletToolComposer,
} from "./TripletToolComposer";
import { DimensionPerspective } from "../state/FiveSpaceState";

export interface StructuralGenome {
  id: string;
  binaryRoot: string;
  binaryResultant: string;
  atoOperator: string;
  perspective: DimensionPerspective;
  gate?: number;
  line?: number;
  color?: number;
  tone?: number;
  base?: number;
  provenanceIds: string[];
}

export interface RegisteredOrgan {
  id: string;
  capabilities: string[];
  accepts: string;
  returns: string;
  genome: StructuralGenome;
  organ: ToolOrgan<unknown, unknown>;
}

export interface ComposedTool {
  id: string;
  capabilities: string[];
  genome: StructuralGenome;
  triplet: ToolTriplet<unknown, unknown, unknown>;
  componentIds: [string, string, string];
}

export class ToolGenomeRegistry {
  private readonly organs = new Map<string, RegisteredOrgan>();
  private readonly tools = new Map<string, ComposedTool>();
  private readonly composer = new TripletToolComposer();

  registerOrgan(organ: RegisteredOrgan): void {
    if (this.organs.has(organ.id)) throw new Error(`Duplicate organ ${organ.id}`);
    this.organs.set(organ.id, structuredCloneExceptFunction(organ));
  }

  compose(
    id: string,
    inputId: string,
    transformId: string,
    outputId: string,
    genome: Omit<StructuralGenome, "atoOperator">
  ): ComposedTool {
    const input = this.requireOrgan(inputId);
    const transform = this.requireOrgan(transformId);
    const output = this.requireOrgan(outputId);
    if (input.returns !== transform.accepts) {
      throw new Error(`${input.id} returns ${input.returns}; ${transform.id} accepts ${transform.accepts}`);
    }
    if (transform.returns !== output.accepts) {
      throw new Error(`${transform.id} returns ${transform.returns}; ${output.id} accepts ${output.accepts}`);
    }
    const tool: ComposedTool = {
      id,
      capabilities: [...new Set([
        ...input.capabilities,
        ...transform.capabilities,
        ...output.capabilities,
      ])],
      genome: {
        ...genome,
        atoOperator: operatorBetween(
          genome.binaryRoot,
          genome.binaryResultant
        ).code,
      },
      triplet: {
        id,
        input: input.organ,
        transform: transform.organ,
        output: output.organ,
      },
      componentIds: [inputId, transformId, outputId],
    };
    this.tools.set(id, tool);
    return tool;
  }

  async execute(id: string, input: unknown): Promise<unknown> {
    const tool = this.tools.get(id);
    if (!tool) throw new Error(`Unknown composed tool ${id}`);
    return (await this.composer.execute(tool.triplet, input)).output;
  }

  match(requiredCapabilities: string[]): ComposedTool[] {
    return [...this.tools.values()].filter((tool) =>
      requiredCapabilities.every((capability) =>
        tool.capabilities.includes(capability)
      )
    );
  }

  getTool(id: string): ComposedTool | undefined {
    return this.tools.get(id);
  }

  private requireOrgan(id: string): RegisteredOrgan {
    const organ = this.organs.get(id);
    if (!organ) throw new Error(`Unknown organ ${id}`);
    return organ;
  }
}

function structuredCloneExceptFunction(organ: RegisteredOrgan): RegisteredOrgan {
  return {
    ...organ,
    capabilities: [...organ.capabilities],
    genome: structuredClone(organ.genome),
    organ: organ.organ,
  };
}

