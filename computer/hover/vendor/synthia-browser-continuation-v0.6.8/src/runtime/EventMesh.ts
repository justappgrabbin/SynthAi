export interface MeshMessage {
  messageId: string;
  channel: string;
  source: string;
  payload: any;
  timestamp: number;
}

export interface EmergenceEvent {
  channel: string;
  firstSource: string;
  timestamp: number;
}

type Handler = (message: MeshMessage) => void;
type EmergenceHandler = (event: EmergenceEvent) => void;

/**
 * Small synchronous event mesh required by the original Klein/LCM organs.
 * Channels emerge on first publication and remain available for the life of
 * the runtime. Messages are retained for replay/debugging.
 */
export class EventMesh {
  private subscribers = new Map<string, Set<Handler>>();
  private emerged = new Map<string, EmergenceEvent>();
  private emergenceHandlers = new Set<EmergenceHandler>();
  readonly log: MeshMessage[] = [];
  private counter = 0;

  subscribe(channel: string, handler: Handler): () => void {
    if (!this.subscribers.has(channel)) this.subscribers.set(channel, new Set());
    this.subscribers.get(channel)!.add(handler);
    return () => this.subscribers.get(channel)?.delete(handler);
  }

  publish(channel: string, source: string, payload: any): MeshMessage {
    if (!this.emerged.has(channel)) {
      const event = { channel, firstSource: source, timestamp: Date.now() };
      this.emerged.set(channel, event);
      for (const handler of this.emergenceHandlers) handler(event);
    }
    const message: MeshMessage = {
      messageId: `mesh-${++this.counter}`,
      channel,
      source,
      payload,
      timestamp: Date.now(),
    };
    this.log.push(message);
    for (const handler of this.subscribers.get(channel) || []) handler(message);
    return message;
  }

  onEmergence(handler: EmergenceHandler): () => void {
    this.emergenceHandlers.add(handler);
    return () => this.emergenceHandlers.delete(handler);
  }

  topology(): Array<{ channel: string; firstSource: string; subscribers: number; messages: number }> {
    return [...this.emerged.values()].map(event => ({
      channel: event.channel,
      firstSource: event.firstSource,
      subscribers: this.subscribers.get(event.channel)?.size || 0,
      messages: this.log.filter(m => m.channel === event.channel).length,
    }));
  }
}

export default EventMesh;
