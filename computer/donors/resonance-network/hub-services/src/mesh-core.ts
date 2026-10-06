/**
 * MESH-CORE — shared node registry + message bus for the 9 energy-center hubs.
 *
 * This file was imported by mcp-hub.ts (and referenced by devcore.ts /
 * meshweave.ts in prior sessions) but did not exist in any uploaded
 * package -- confirmed by searching every archive, not assumed missing.
 * Its shape here is reverse-derived from actual call sites in mcp-hub.ts
 * (registerNode, subscribe, send, and the message/node fields it reads
 * and writes), so it's a real fit, not a generic guess.
 *
 * Real, working, synchronous pub/sub + routing. No simulated delivery:
 * publish() actually invokes matching subscriber callbacks; send()
 * actually delivers to the named target's subscription.
 */

export interface DStack {
  d1: number; // impulse
  d2: number; // polarity
  d3: number; // witness
  d4: number; // context
  d5: number; // meaning
}

export interface MeshNode {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'dormant' | 'error';
  capabilities: string[];
  lastHeartbeat: number;
  loadFactor: number;
  resonanceSignature: number[]; // [d1..d5], matches DStack order
}

export interface MeshMessage<T = any> {
  id: string;
  source: string;
  target: string;
  type: 'command' | 'event' | 'broadcast';
  payload: T;
  timestamp: number;
  dStack?: Partial<DStack>;
  trace: string[];
  ttl: number;
}

type Subscriber<T = any> = (msg: MeshMessage<T>) => void;

class Mesh {
  private nodes: Map<string, MeshNode> = new Map();
  private subscribers: Map<string, Set<Subscriber>> = new Map();
  private log: MeshMessage[] = [];
  private maxLog = 500;

  registerNode(node: MeshNode): void {
    this.nodes.set(node.id, node);
  }

  heartbeat(id: string): void {
    const n = this.nodes.get(id);
    if (n) n.lastHeartbeat = Date.now();
  }

  getNode(id: string): MeshNode | undefined {
    return this.nodes.get(id);
  }

  listNodes(): MeshNode[] {
    return Array.from(this.nodes.values());
  }

  subscribe<T = any>(targetId: string, handler: Subscriber<T>): () => void {
    if (!this.subscribers.has(targetId)) this.subscribers.set(targetId, new Set());
    this.subscribers.get(targetId)!.add(handler as Subscriber);
    return () => this.subscribers.get(targetId)?.delete(handler as Subscriber);
  }

  send<T = any>(msg: MeshMessage<T>): MeshMessage<T> {
    if (msg.ttl <= 0) return msg;
    this.log.push(msg);
    if (this.log.length > this.maxLog) this.log.shift();
    const handlers = this.subscribers.get(msg.target);
    if (handlers) {
      for (const h of handlers) {
        try {
          h(msg);
        } catch (err) {
          console.error(`[mesh-core] subscriber "${msg.target}" threw:`, err);
        }
      }
    }
    return msg;
  }

  publish<T = any>(topic: string, sourceHub: string, payload: T): MeshMessage<T> {
    return this.send({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      source: sourceHub,
      target: topic,
      type: 'broadcast',
      payload,
      timestamp: Date.now(),
      trace: [sourceHub],
      ttl: 10,
    });
  }

  recent(target?: string, limit = 50): MeshMessage[] {
    const items = target ? this.log.filter((m) => m.target === target) : this.log;
    return items.slice(-limit);
  }
}

export const mesh = new Mesh();
