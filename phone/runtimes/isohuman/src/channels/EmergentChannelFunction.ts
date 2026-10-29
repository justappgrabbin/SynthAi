import { ChannelRegistry, ChannelSpec } from "./ChannelRegistry";

export interface GateActivation {
  gate: number;
  source: "natal" | "transit" | "contact" | "lcm";
}

export interface EmergentChannel {
  channel: ChannelSpec;
  sources: string[];
  temporary: boolean;
  ability: string;
  edgeFunction: (input: unknown) => {
    channelId: string;
    ability: string;
    input: unknown;
    sources: string[];
    temporary: boolean;
  };
}

export class EmergentChannelResolver {
  constructor(private readonly registry = new ChannelRegistry()) {}

  resolve(
    natalGates: number[],
    contextualActivations: GateActivation[]
  ): EmergentChannel[] {
    const natal = new Set(natalGates);
    const sources = new Map<number, Set<string>>();
    for (const gate of natal) sources.set(gate, new Set(["natal"]));
    for (const activation of contextualActivations) {
      const current = sources.get(activation.gate) ?? new Set<string>();
      current.add(activation.source);
      sources.set(activation.gate, current);
    }

    return this.registry
      .getAll()
      .filter((channel) => sources.has(channel.gateA) && sources.has(channel.gateB))
      .map((channel) => {
        const channelSources = [
          ...(sources.get(channel.gateA) ?? []),
          ...(sources.get(channel.gateB) ?? []),
        ];
        const uniqueSources = [...new Set(channelSources)].sort();
        const temporary = !(natal.has(channel.gateA) && natal.has(channel.gateB));
        return {
          channel,
          sources: uniqueSources,
          temporary,
          ability: channel.nativeBehavior,
          edgeFunction: (input: unknown) => ({
            channelId: channel.id,
            ability: channel.nativeBehavior,
            input,
            sources: uniqueSources,
            temporary,
          }),
        };
      });
  }
}

