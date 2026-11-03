export interface ToolContext {
  trace: string[];
  values: Record<string, unknown>;
}

export interface ToolOrgan<Input = unknown, Output = unknown> {
  id: string;
  role: "input" | "transform" | "output";
  execute(input: Input, context: ToolContext): Output | Promise<Output>;
}

export interface ToolTriplet<Input = unknown, Intermediate = unknown, Output = unknown> {
  id: string;
  input: ToolOrgan<Input, Intermediate>;
  transform: ToolOrgan<Intermediate, Intermediate>;
  output: ToolOrgan<Intermediate, Output>;
}

export interface ToolExecution<Output> {
  toolId: string;
  output: Output;
  trace: string[];
}

export class TripletToolComposer {
  async execute<Input, Intermediate, Output>(
    tool: ToolTriplet<Input, Intermediate, Output>,
    input: Input,
    initialValues: Record<string, unknown> = {}
  ): Promise<ToolExecution<Output>> {
    const context: ToolContext = { trace: [], values: { ...initialValues } };

    context.trace.push(tool.input.id);
    const acquired = await tool.input.execute(input, context);
    context.trace.push(tool.transform.id);
    const transformed = await tool.transform.execute(acquired, context);
    context.trace.push(tool.output.id);
    const output = await tool.output.execute(transformed, context);

    return { toolId: tool.id, output, trace: [...context.trace] };
  }

  asOrgan<Input, Intermediate, Output>(
    tool: ToolTriplet<Input, Intermediate, Output>,
    role: ToolOrgan<Input, Output>["role"]
  ): ToolOrgan<Input, Output> {
    return {
      id: tool.id,
      role,
      execute: async (input, context) => {
        const result = await this.execute(tool, input, context.values);
        context.trace.push(...result.trace);
        return result.output;
      },
    };
  }
}

