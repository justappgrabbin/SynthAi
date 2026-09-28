class MessageBus {
  messages = [];
  enqueue(message) {
    this.messages.push(message);
  }
  async process(state) {
    const processed = this.messages.length;
    for (const message of this.messages) {
      if (message.targetStateId) {
        const target = state.activeNodes.get(message.targetStateId);
        if (target) {
          message.trace.push(`delivered_to_${target.stateId}`);
        }
      }
      message.ttl--;
    }
    this.messages = this.messages.filter((m) => m.ttl > 0);
    state.messageBus = this.messages;
    return processed;
  }
  getMessages() {
    return [...this.messages];
  }
}
var stdin_default = MessageBus;
export {
  MessageBus,
  stdin_default as default
};
