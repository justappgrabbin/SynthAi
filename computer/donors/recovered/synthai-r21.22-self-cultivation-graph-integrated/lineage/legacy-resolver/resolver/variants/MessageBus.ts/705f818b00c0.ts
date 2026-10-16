import { RuntimeState, RuntimeMessage } from './foundations';

export class MessageBus {
  private messages: RuntimeMessage[] = [];

  enqueue(message: RuntimeMessage): void {
    this.messages.push(message);
  }

  async process(state: RuntimeState): Promise<number> {
    const processed = this.messages.length;

    for (const message of this.messages) {
      // Route message to target state or capability
      if (message.targetStateId) {
        const target = state.activeNodes.get(message.targetStateId);
        if (target) {
          // Message delivered to state
          message.trace.push(`delivered_to_${target.stateId}`);
        }
      }

      // Decrement TTL
      message.ttl--;
    }

    // Remove expired messages
    this.messages = this.messages.filter(m => m.ttl > 0);
    state.messageBus = this.messages;

    return processed;
  }

  getMessages(): RuntimeMessage[] {
    return [...this.messages];
  }
}

export default MessageBus;
