/**
 * ChangingLineEngine — detects changing-line events across all layers
 * and dispatches them to the AutoLing generator.
 *
 * A "changing line" in I Ching = a line that is in motion:
 *   - Old Yang (9): yang line about to become yin
 *   - Old Yin  (6): yin line about to become yang
 *
 * In our phase space: a line is "changing" when its continuous value
 * exceeds the CHANGING_THRESHOLD in either direction.
 *
 * When a changing-line event fires, this engine:
 *   1. Identifies the transformation (from → to hexagram)
 *   2. Records co-activation in the Temporal layer
 *   3. Dispatches to AutoLing to generate a unique tool
 *   4. Emits an event to registered listeners (e.g., WebSocket clients)
 */

import { BY_FUXI } from '../data/hexagrams.js';

export class ChangingLineEngine {
  constructor(model) {
    this.model = model;       // StateSpaceModel
    this.listeners = [];      // event subscribers
    this.eventLog = [];       // history of all changing-line events
    this.MAX_LOG = 200;
    this.tickInterval = null;
    this.running = false;
  }

  /**
   * Start the continuous simulation loop.
   * dt in ms between ticks.
   */
  start(dt = 100) {
    if (this.running) return;
    this.running = true;
    this.tickInterval = setInterval(() => this._tick(dt / 1000), dt);
    console.log('[ChangingLineEngine] started, tick=', dt, 'ms');
  }

  stop() {
    this.running = false;
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  /**
   * One simulation tick across all 5 layers.
   */
  _tick(dt) {
    const allEvents = [];

    this.model.layers.forEach(layer => {
      const events = layer.step(dt);
      events.forEach(ev => {
        this._processEvent(ev, layer);
        allEvents.push(ev);
      });
    });

    if (allEvents.length > 0) {
      this._emit('tick', allEvents);
    }
  }

  /**
   * Process a single changing-line event.
   */
  async _processEvent(event, layer) {
    const fromHex = BY_FUXI[event.fromFuxi];
    const toHex   = BY_FUXI[event.toFuxi];
    if (!fromHex || !toHex) return;

    // Enrich event
    event.fromName = fromHex.name;
    event.toName   = toHex.name;
    event.fromChar = fromHex.char;
    event.toChar   = toHex.char;
    event.layer    = layer.name;

    // Record co-activation in Temporal layer
    const temporalLayer = this.model.getLayer('reverse');
    if (temporalLayer?.recordCoActivation) {
      temporalLayer.recordCoActivation(event.fromFuxi, event.toFuxi);
    }

    // Generate a tool via AutoLing
    if (this.model.autoLing) {
      const tool = await this.model.autoLing.generate(event, this.model);
      if (tool) {
        // Attach to the originating node
        const node = layer.getNode(event.fromFuxi);
        if (node) node.tools.push(tool);
        event.tool = tool;
        this.model.toolRegistry.set(tool.id, tool);
        this._emit('tool_generated', tool);
      }
    }

    // Log and emit
    this.eventLog.push(event);
    if (this.eventLog.length > this.MAX_LOG) this.eventLog.shift();
    this._emit('changing_line', event);
  }

  /**
   * Manually trigger a changing-line event (for testing / user interaction).
   */
  trigger(fuxi, lineIndex, layerId = 'kingwen') {
    const layer = this.model.getLayer(layerId);
    if (!layer) return;
    layer.activate(fuxi, lineIndex, 0.6);
  }

  on(event, fn) { this.listeners.push({ event, fn }); }

  _emit(event, data) {
    this.listeners
      .filter(l => l.event === event || l.event === '*')
      .forEach(l => { try { l.fn(data); } catch(e) {} });
  }

  getLog(limit = 50) {
    return this.eventLog.slice(-limit);
  }
}
