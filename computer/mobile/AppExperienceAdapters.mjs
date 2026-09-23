function hasAny(text, needles = []) {
  return needles.some(value => text.includes(value));
}

export const ChatGPTExperienceAdapter = Object.freeze({
  id: 'chatgpt-conversation-house',
  packages: ['com.openai.chatgpt'],
  labels: ['ChatGPT'],
  compile(observation, helpers) {
    const text = helpers.uiText();
    const isNewChat = observation.screenType === 'new_conversation' ||
      hasAny(text, ['new chat', 'new conversation']);
    const isConversation = observation.screenType === 'conversation' ||
      observation.screenType === 'active_conversation' ||
      hasAny(text, ['send message', 'message chatgpt', 'ask anything']);

    const scene = isConversation
      ? { type: 'conversation_room', state: 'seated-conversation' }
      : { type: 'conversation_hall', state: isNewChat ? 'new-door-available' : 'browsing-doors' };

    const transitions = [];
    if (isNewChat) {
      transitions.push({
        trigger: 'new_conversation',
        worldAction: ['materialize-door', 'walk-to-door', 'open-door', 'enter-room', 'sit'],
      });
    }
    if (isConversation) {
      transitions.push({
        trigger: 'conversation_active',
        worldAction: ['enter-room', 'approach-table', 'sit'],
      });
    }

    return {
      environment: {
        type: 'conversation_house',
        name: 'ChatGPT Conversation House',
        district: 'communication',
      },
      scene,
      entities: helpers.genericEntities(),
      affordances: ['enter-conversation', 'start-conversation', 'speak', 'listen', 'attach-artifact'],
      transitions,
    };
  },
});

export const PicsartExperienceAdapter = Object.freeze({
  id: 'picsart-art-studio',
  packages: ['com.picsart.studio'],
  labels: ['Picsart', 'PicsArt'],
  compile(observation, helpers) {
    const text = helpers.uiText();
    const editing = observation.screenType === 'editor' ||
      hasAny(text, ['effects', 'tools', 'brush', 'layers', 'remove background', 'edit image']);

    return {
      environment: {
        type: 'art_studio',
        name: 'Picsart Art Studio',
        district: 'creation',
      },
      scene: {
        type: editing ? 'working_studio' : 'studio_lobby',
        state: editing ? 'canvas-active' : 'choosing-work',
      },
      entities: helpers.genericEntities(),
      affordances: ['choose-canvas', 'edit-artifact', 'use-tool', 'save-artifact', 'export-artifact'],
      transitions: editing ? [{ trigger: 'editor_active', worldAction: ['walk-to-easel', 'face-canvas'] }] : [],
    };
  },
});

export const GenericApplicationAdapter = Object.freeze({
  id: 'generic-application-place',
  matches: () => true,
  compile(observation, helpers) {
    return {
      environment: {
        type: 'application_place',
        name: observation.appLabel,
        district: 'applications',
      },
      scene: { type: 'adaptive_room', state: observation.screenType ?? 'observed' },
      entities: helpers.genericEntities(),
      affordances: helpers.unique(
        (observation.ui ?? []).flatMap(node => [
          node.clickable ? 'interact' : null,
          node.editable ? 'write' : null,
        ])
      ),
    };
  },
});

export function registerDefaultExperienceAdapters(compiler) {
  compiler.register(ChatGPTExperienceAdapter);
  compiler.register(PicsartExperienceAdapter);
  compiler.register(GenericApplicationAdapter);
  return compiler;
}
