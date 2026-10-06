export interface ConsciousnessField {
  id: string;
  name: string;
  description: string;
  color: string;
  particleColor: string;
  avatarColor: string;
  unlocked: boolean;
  level: number;
  experience: number;
  traits: Trait[];
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  type: 'major' | 'minor';
  level: number;
  experience: number;
  maxLevel: number;
  requirements: string[];
  effects: TraitEffect[];
  cooldown: number;
  lastUsed: number;
}

export interface TraitEffect {
  type: 'movement' | 'interaction' | 'dialogue' | 'visual' | 'combat';
  value: number;
  duration?: number;
}

export const CONSCIOUSNESS_FIELDS: ConsciousnessField[] = [
  {
    id: 'mind',
    name: 'Mind',
    description: 'The field of intellect, analysis, and strategic thinking',
    color: '#4A90E2',
    particleColor: '#7BB3F0',
    avatarColor: '#2E5A87',
    unlocked: true,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'mind_analysis',
        name: 'Deep Analysis',
        description: 'Analyze objects and NPCs to reveal hidden information',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'interaction', value: 1.5 }],
        cooldown: 5000,
        lastUsed: 0
      },
      {
        id: 'mind_focus',
        name: 'Mental Focus',
        description: 'Increased concentration enhances all mental activities',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'dialogue', value: 1.2 }],
        cooldown: 0,
        lastUsed: 0
      },
      {
        id: 'mind_clarity',
        name: 'Clarity of Thought',
        description: 'Clear thinking reduces confusion effects',
        type: 'minor',
        level: 1,
        experience: 0,
        maxLevel: 3,
        requirements: ['mind_focus'],
        effects: [{ type: 'visual', value: 1.1 }],
        cooldown: 0,
        lastUsed: 0
      },
      {
        id: 'mind_memory',
        name: 'Perfect Recall',
        description: 'Remember conversations and details with crystal clarity',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: ['mind_clarity'],
        effects: [{ type: 'dialogue', value: 1.6 }],
        cooldown: 8000,
        lastUsed: 0
      },
      {
        id: 'mind_calculation',
        name: 'Rapid Calculation',
        description: 'Process complex information at lightning speed',
        type: 'minor',
        level: 1,
        experience: 0,
        maxLevel: 3,
        requirements: ['mind_analysis'],
        effects: [{ type: 'interaction', value: 1.3 }],
        cooldown: 3000,
        lastUsed: 0
      },
      {
        id: 'mind_strategy',
        name: 'Strategic Planning',
        description: 'Anticipate outcomes and plan several moves ahead',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: ['mind_memory', 'mind_calculation'],
        effects: [{ type: 'movement', value: 1.2 }, { type: 'interaction', value: 1.4 }],
        cooldown: 15000,
        lastUsed: 0
      }
    ]
  },
  {
    id: 'heart',
    name: 'Heart',
    description: 'The field of emotions, empathy, and connection',
    color: '#E74C3C',
    particleColor: '#F1948A',
    avatarColor: '#A93226',
    unlocked: true,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'heart_empathy',
        name: 'Empathic Connection',
        description: 'Feel and understand the emotions of others',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'dialogue', value: 1.8 }],
        cooldown: 3000,
        lastUsed: 0
      },
      {
        id: 'heart_compassion',
        name: 'Compassionate Healing',
        description: 'Heal others through emotional connection',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'interaction', value: 2.0 }],
        cooldown: 10000,
        lastUsed: 0
      },
      {
        id: 'heart_warmth',
        name: 'Emotional Warmth',
        description: 'Your presence brings comfort to others',
        type: 'minor',
        level: 1,
        experience: 0,
        maxLevel: 3,
        requirements: ['heart_empathy'],
        effects: [{ type: 'visual', value: 1.3 }],
        cooldown: 0,
        lastUsed: 0
      },
      {
        id: 'heart_intuition',
        name: 'Emotional Intuition',
        description: 'Sense the true feelings behind words and actions',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: ['heart_warmth'],
        effects: [{ type: 'dialogue', value: 1.5 }],
        cooldown: 6000,
        lastUsed: 0
      },
      {
        id: 'heart_presence',
        name: 'Calming Presence',
        description: 'Your aura naturally soothes those around you',
        type: 'minor',
        level: 1,
        experience: 0,
        maxLevel: 3,
        requirements: ['heart_compassion'],
        effects: [{ type: 'visual', value: 1.4 }],
        cooldown: 0,
        lastUsed: 0
      },
      {
        id: 'heart_unity',
        name: 'Unity Consciousness',
        description: 'Experience deep connection with all living beings',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: ['heart_intuition', 'heart_presence'],
        effects: [{ type: 'dialogue', value: 2.2 }, { type: 'visual', value: 1.8 }],
        cooldown: 20000,
        lastUsed: 0
      }
    ]
  },
  {
    id: 'body',
    name: 'Body',
    description: 'The field of physical prowess, instinct, and earthly connection',
    color: '#8B4513',
    particleColor: '#D2B48C',
    avatarColor: '#654321',
    unlocked: true,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'body_strength',
        name: 'Physical Strength',
        description: 'Enhanced physical power and endurance',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'movement', value: 1.5 }],
        cooldown: 0,
        lastUsed: 0
      },
      {
        id: 'body_agility',
        name: 'Enhanced Agility',
        description: 'Improved speed and reflexes',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'movement', value: 1.3 }],
        cooldown: 2000,
        lastUsed: 0
      },
      {
        id: 'body_instinct',
        name: 'Primal Instinct',
        description: 'Trust your gut feelings and intuition',
        type: 'minor',
        level: 1,
        experience: 0,
        maxLevel: 3,
        requirements: ['body_agility'],
        effects: [{ type: 'interaction', value: 1.2 }],
        cooldown: 0,
        lastUsed: 0
      },
      {
        id: 'body_endurance',
        name: 'Iron Endurance',
        description: 'Tireless stamina for extended activities',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: ['body_strength'],
        effects: [{ type: 'movement', value: 1.4 }],
        cooldown: 5000,
        lastUsed: 0
      },
      {
        id: 'body_balance',
        name: 'Perfect Balance',
        description: 'Maintain equilibrium in any situation',
        type: 'minor',
        level: 1,
        experience: 0,
        maxLevel: 3,
        requirements: ['body_instinct'],
        effects: [{ type: 'movement', value: 1.2 }],
        cooldown: 0,
        lastUsed: 0
      },
      {
        id: 'body_mastery',
        name: 'Physical Mastery',
        description: 'Complete control over every muscle and movement',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: ['body_endurance', 'body_balance'],
        effects: [{ type: 'movement', value: 1.8 }, { type: 'interaction', value: 1.5 }],
        cooldown: 12000,
        lastUsed: 0
      }
    ]
  },
  // Locked fields that will be unlocked through gameplay
  {
    id: 'child',
    name: 'Child',
    description: 'The field of wonder, creativity, and innocent perception',
    color: '#FFD700',
    particleColor: '#FFF8DC',
    avatarColor: '#DAA520',
    unlocked: false,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'child_wonder',
        name: 'Infinite Wonder',
        description: 'See magic in the mundane and beauty everywhere',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'visual', value: 2.0 }],
        cooldown: 0,
        lastUsed: 0
      }
    ]
  },
  {
    id: 'shadow',
    name: 'Shadow',
    description: 'The field of hidden aspects, transformation, and integration',
    color: '#4B0082',
    particleColor: '#9370DB',
    avatarColor: '#2F004F',
    unlocked: false,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'shadow_integration',
        name: 'Shadow Integration',
        description: 'Transform rejected aspects into sources of power',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'dialogue', value: 1.9 }],
        cooldown: 7000,
        lastUsed: 0
      }
    ]
  },
  {
    id: 'will',
    name: 'Will',
    description: 'The field of determination, manifestation, and focused intent',
    color: '#FF4500',
    particleColor: '#FF6347',
    avatarColor: '#CC3300',
    unlocked: false,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'will_manifestation',
        name: 'Focused Manifestation',
        description: 'Channel pure will to shape reality',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'interaction', value: 2.2 }],
        cooldown: 15000,
        lastUsed: 0
      }
    ]
  },
  {
    id: 'soul',
    name: 'Soul',
    description: 'The field of essence, purpose, and eternal connection',
    color: '#9932CC',
    particleColor: '#DDA0DD',
    avatarColor: '#6A1B9A',
    unlocked: false,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'soul_purpose',
        name: 'Soul Purpose',
        description: 'Align actions with your deepest calling',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'dialogue', value: 2.5 }, { type: 'movement', value: 1.6 }],
        cooldown: 25000,
        lastUsed: 0
      }
    ]
  },
  {
    id: 'spirit',
    name: 'Spirit',
    description: 'The field of transcendence, unity, and divine connection',
    color: '#00CED1',
    particleColor: '#AFEEEE',
    avatarColor: '#008B8B',
    unlocked: false,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'spirit_transcendence',
        name: 'Transcendent Awareness',
        description: 'Experience consciousness beyond individual limits',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [{ type: 'visual', value: 3.0 }, { type: 'dialogue', value: 2.8 }],
        cooldown: 30000,
        lastUsed: 0
      }
    ]
  },
  {
    id: 'synthesis',
    name: 'Synthesis',
    description: 'The field of integration, wholeness, and unified consciousness',
    color: '#FFFFFF',
    particleColor: '#F0F8FF',
    avatarColor: '#E6E6FA',
    unlocked: false,
    level: 1,
    experience: 0,
    traits: [
      {
        id: 'synthesis_unity',
        name: 'Unified Consciousness',
        description: 'Access all fields simultaneously in perfect harmony',
        type: 'major',
        level: 1,
        experience: 0,
        maxLevel: 5,
        requirements: [],
        effects: [
          { type: 'movement', value: 2.0 },
          { type: 'interaction', value: 2.5 },
          { type: 'dialogue', value: 3.0 },
          { type: 'visual', value: 2.8 }
        ],
        cooldown: 60000,
        lastUsed: 0
      }
    ]
  }
];

export const RITUAL_ZONES = [
  {
    id: 'mind_altar',
    name: 'Mind Altar',
    fieldId: 'mind',
    position: [10, 0, 10],
    description: 'A crystalline altar that resonates with mental energy'
  },
  {
    id: 'heart_grove',
    name: 'Heart Grove',
    fieldId: 'heart',
    position: [-10, 0, 10],
    description: 'A sacred grove where emotional energies flow freely'
  },
  {
    id: 'body_training',
    name: 'Training Ground',
    fieldId: 'body',
    position: [0, 0, -15],
    description: 'An ancient training ground that strengthens the physical form'
  },
  {
    id: 'child_playground',
    name: 'Wonder Playground',
    fieldId: 'child',
    position: [15, 0, -5],
    description: 'A magical playground where wonder and creativity flourish'
  },
  {
    id: 'shadow_cave',
    name: 'Shadow Cave',
    fieldId: 'shadow',
    position: [-15, 0, -5],
    description: 'A mysterious cave for confronting and integrating hidden aspects'
  },
  {
    id: 'will_forge',
    name: 'Will Forge',
    fieldId: 'will',
    position: [0, 0, 20],
    description: 'A blazing forge where pure intention is shaped into reality'
  },
  {
    id: 'soul_sanctuary',
    name: 'Soul Sanctuary',
    fieldId: 'soul',
    position: [-20, 0, 0],
    description: 'A serene sanctuary for connecting with eternal essence'
  },
  {
    id: 'spirit_peak',
    name: 'Spirit Peak',
    fieldId: 'spirit',
    position: [20, 0, 0],
    description: 'A transcendent peak reaching toward divine connection'
  },
  {
    id: 'synthesis_nexus',
    name: 'Unity Nexus',
    fieldId: 'synthesis',
    position: [0, 0, 0],
    description: 'The central nexus where all consciousness fields converge in unity'
  }
];

export const NPC_DATA = [
  {
    id: 'sage',
    name: 'The Sage',
    position: [5, 0, 5],
    dialogues: {
      mind: [
        "Ah, I sense the clarity of thought within you. Seek knowledge in the ancient texts.",
        "Your analytical mind serves you well. Have you considered the deeper mysteries?",
        "Logic and reason are powerful tools, but remember - not all truths can be reasoned."
      ],
      heart: [
        "I feel the warmth of your compassion. It is a rare gift in these times.",
        "Your empathy opens doors that force cannot. Trust in your emotional wisdom.",
        "The heart knows truths that the mind cannot fathom. Listen to its whispers."
      ],
      body: [
        "Your physical presence commands respect. Strength has its own wisdom.",
        "I see the power in your movements. Channel that energy wisely.",
        "The body remembers what the mind forgets. Trust your instincts."
      ],
      child: [
        "Such wonder in your eyes! The world becomes magical when seen through innocence.",
        "You remind me why we must protect the spark of creativity in all beings.",
        "Play is the highest form of research, young one. What will you discover today?"
      ],
      shadow: [
        "I see you wrestling with the parts of yourself you'd rather deny. This is wisdom.",
        "The shadow contains not just darkness, but rejected gold. What treasures hide there?",
        "Integration, not elimination, is the path. Your shadow has gifts to offer."
      ],
      will: [
        "Your determination burns bright. Channel it wisely, for will can create or destroy.",
        "I have seen mountains moved by focused intention. What is your deepest desire?",
        "Will without wisdom is dangerous. Will with wisdom can reshape reality itself."
      ],
      soul: [
        "You carry an ancient knowing, one that transcends this lifetime.",
        "The soul speaks in whispers, but its voice carries the weight of eternity.",
        "Your purpose here runs deeper than you know. Trust the pull of your essence."
      ],
      spirit: [
        "In your presence, I feel the breath of the divine. You are more than you appear.",
        "The boundaries between self and universe dissolve when spirit awakens.",
        "You are both the seeker and the sought. The divine experiences itself through you."
      ],
      synthesis: [
        "At last, one who walks in perfect balance. All fields sing in harmony within you.",
        "You have become what I have long hoped to witness - consciousness unified.",
        "In you, the great work finds completion. You are both human and transcendent."
      ]
    }
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    position: [-5, 0, -5],
    dialogues: {
      mind: [
        "Strategic thinking will serve you well in the trials ahead.",
        "I have puzzles that would challenge even the sharpest minds. Are you ready?",
        "Knowledge without action is empty. What will you do with what you learn?"
      ],
      heart: [
        "Your compassion is your greatest strength and your greatest vulnerability.",
        "I have seen warriors with hearts of stone. You are different. That is good.",
        "Protect what you love, but do not let love make you weak."
      ],
      body: [
        "Your strength is evident, but true power comes from discipline.",
        "I could train you in the ancient ways, if you prove yourself worthy.",
        "Physical prowess without wisdom is mere brutality. Show me you understand."
      ],
      child: [
        "Protect that innocence, but do not let it make you naive to danger.",
        "The child's heart sees truth clearly, but needs the guardian's wisdom to survive.",
        "Wonder is a weapon against despair. Wield it well, young warrior."
      ],
      shadow: [
        "Face your darkness with courage. I have seen too many consumed by what they deny.",
        "The shadow warrior is the most dangerous - they know their own capacity for harm.",
        "Your inner demons can become your greatest allies if you master them first."
      ],
      will: [
        "Impressive focus, but can you maintain it under pressure? Let us test that resolve.",
        "Will alone is not enough. You need skill, timing, and wisdom to truly manifest change.",
        "I challenge you: use your will not for conquest, but for protection. That is true strength."
      ],
      soul: [
        "Your soul carries the weight of many battles. Some were fought before you were born.",
        "I protect what is sacred, and your essence carries something worth guarding.",
        "The soul's mission often conflicts with personal desires. Which will you choose?"
      ],
      spirit: [
        "Even divine consciousness needs grounding in reality. I offer that foundation.",
        "Your transcendence is beautiful, but do not lose sight of those who still struggle below.",
        "True spirituality serves life. How will you use your gifts to protect what matters?"
      ],
      synthesis: [
        "You have achieved what few dare attempt - perfect integration of all aspects.",
        "In your presence, I feel both the need to protect and the peace of knowing you need no protection.",
        "You are the guardian's dream realized - one who protects from a place of wholeness."
      ]
    }
  },
  {
    id: 'mystic',
    name: 'The Mystic',
    position: [0, 0, 8],
    dialogues: {
      mind: [
        "The mind seeks to understand the mystery, but some truths must be felt, not thought.",
        "Your questions are precise, but are you prepared for answers that dissolve certainty?",
        "Logic is a ladder to the ineffable, but you must eventually let go of the rungs."
      ],
      heart: [
        "The heart is the true mystic's tool - it perceives what lies beyond the veil.",
        "Love is the force that dissolves all boundaries. Let it guide your inner journey.",
        "In the depths of feeling, the greatest revelations await. Dive deeper."
      ],
      body: [
        "The body is a temple, but also a teacher. What wisdom does your flesh carry?",
        "Through movement and breath, we touch the eternal. Your form is sacred.",
        "The mystic path requires embodiment, not escape from form. Honor your vessel."
      ],
      child: [
        "The mystic and the child share the same eyes - both see magic where others see mundane.",
        "Your wonder is a doorway to the sacred. Keep it always open.",
        "In innocence lies the key to the greatest mysteries. Never lose that gift."
      ],
      shadow: [
        "The mystic who denies their shadow walks a dangerous path. Embrace your wholeness.",
        "Your darkness contains hidden teachings. Are you brave enough to learn from it?",
        "Integration of shadow is not optional for true awakening. Face what you fear."
      ],
      will: [
        "The will that serves ego creates suffering. The will that serves love creates miracles.",
        "Your intention shapes reality, but surrender shapes the soul. Balance them wisely.",
        "True mystical will flows like water - powerful yet yielding, focused yet fluid."
      ],
      soul: [
        "You carry starlight in your essence. Remember your cosmic nature, eternal one.",
        "The soul's journey spans lifetimes, but this moment is where transformation happens.",
        "In your depths lies a wisdom older than time itself. Listen to its guidance."
      ],
      spirit: [
        "The veil grows thin around you. You walk between worlds with grace.",
        "In pure consciousness, all questions dissolve into perfect knowing.",
        "You are both seeker and sought, wave and ocean, form and formlessness."
      ],
      synthesis: [
        "Behold, the great work made manifest in human form. You are the mystic's ultimate vision.",
        "In you, all paths converge. You are the answer to every seeker's prayer.",
        "The mystery has revealed itself through you. You are both revelation and revealer."
      ]
    }
  }
];
