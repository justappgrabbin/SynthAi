/**
 * Computer Event Emitter — shared event grammar v1 (computer/contracts/event-grammar-v1.yaml).
 *
 * emitEvent(partial) fills required fields (event_id, timestamp, trajectory_id,
 * result_status 'unknown' default), keeps unknown fields null (never fabricated),
 * and appends the complete event to computer/runtime/data/events.jsonl
 * (append-only, one JSON object per line). A new runtime instance reading the
 * same file sees the full history (simulated-restart survival).
 *
 * The event is also mirrored onto the kernel EventBus as 'event:emitted' and
 * 'event:<event_type>' so the rest of the Computer can observe it.
 */

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DEFAULT_LOG = fileURLToPath(new URL('../runtime/data/events.jsonl', import.meta.url));

import { buildComputerEvent } from './event-grammar.mjs';

export class EventEmitter {
  constructor({ bus = null, logPath = DEFAULT_LOG } = {}) {
    this.bus = bus;
    this.logPath = logPath;
  }

  /** Normalize using the shared Computer event grammar-v1 contract. */
  buildEvent(partial = {}) {
    return buildComputerEvent(partial, { uuid: randomUUID });
  }

  /** Contract: emitEvent(event) -> persisted grammar-v1 event. Append-only. */
  async emitEvent(partial = {}) {
    const event = this.buildEvent(partial);
    try {
      await mkdir(dirname(this.logPath), { recursive: true });
      await appendFile(this.logPath, JSON.stringify(event) + '\n', 'utf8');
    } catch (error) {
      // Persistence failures surface as events too — never swallowed.
      this.bus?.emit('event:persistence-failure', { event_id: event.event_id, error: String(error?.message ?? error) });
      throw error;
    }
    this.bus?.emit('event:emitted', event);
    this.bus?.emit(`event:${event.event_type}`, event);
    return event;
  }

  /** Read back the append-only log (restart survival check). */
  async readAll() {
    let text;
    try {
      text = await readFile(this.logPath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
    return text.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
  }

  async history(trajectory_id) {
    return (await this.readAll()).filter((e) => e.trajectory_id === trajectory_id);
  }

  async forEntity(id) {
    return (await this.readAll()).filter((e) => e.actor_id === id || e.target_id === id);
  }
}

export default EventEmitter;
