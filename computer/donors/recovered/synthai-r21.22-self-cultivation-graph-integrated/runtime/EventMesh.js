/**
 * Small synchronous event mesh required by the original Klein/LCM organs.
 * Channels emerge on first publication and remain available for the life of
 * the runtime. Messages are retained for replay/debugging.
 */
export class EventMesh {
    subscribers = new Map();
    emerged = new Map();
    emergenceHandlers = new Set();
    log = [];
    counter = 0;
    subscribe(channel, handler) {
        if (!this.subscribers.has(channel))
            this.subscribers.set(channel, new Set());
        this.subscribers.get(channel).add(handler);
        return () => this.subscribers.get(channel)?.delete(handler);
    }
    publish(channel, source, payload) {
        if (!this.emerged.has(channel)) {
            const event = { channel, firstSource: source, timestamp: Date.now() };
            this.emerged.set(channel, event);
            for (const handler of this.emergenceHandlers)
                handler(event);
        }
        const message = {
            messageId: `mesh-${++this.counter}`,
            channel,
            source,
            payload,
            timestamp: Date.now(),
        };
        this.log.push(message);
        for (const handler of this.subscribers.get(channel) || [])
            handler(message);
        return message;
    }
    onEmergence(handler) {
        this.emergenceHandlers.add(handler);
        return () => this.emergenceHandlers.delete(handler);
    }
    topology() {
        return [...this.emerged.values()].map(event => ({
            channel: event.channel,
            firstSource: event.firstSource,
            subscribers: this.subscribers.get(event.channel)?.size || 0,
            messages: this.log.filter(m => m.channel === event.channel).length,
        }));
    }
}
export default EventMesh;
