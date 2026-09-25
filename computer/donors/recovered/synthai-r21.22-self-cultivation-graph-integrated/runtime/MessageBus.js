export class MessageBus {
    messages = [];
    enqueue(message) {
        if (!this.messages.some(existing => existing.messageId === message.messageId)) {
            this.messages.push(message);
        }
    }
    /**
     * Process both explicitly enqueued messages and messages written directly by
     * runtime organs (for example ArcRuntime). The previous split queue meant
     * state.messageBus messages were never actually processed by this class.
     */
    async process(state) {
        const merged = new Map();
        for (const message of [...this.messages, ...state.messageBus])
            merged.set(message.messageId, message);
        this.messages = [];
        const queue = [...merged.values()];
        const processed = queue.length;
        const survivors = [];
        for (const message of queue) {
            if (message.targetStateId) {
                const target = state.activeNodes.get(message.targetStateId);
                if (target && !message.trace.includes(`delivered_to_${target.stateId}`)) {
                    message.trace.push(`delivered_to_${target.stateId}`);
                }
            }
            message.ttl--;
            if (message.ttl > 0)
                survivors.push(message);
        }
        state.messageBus = survivors;
        return processed;
    }
    getMessages() {
        return [...this.messages];
    }
}
export default MessageBus;
