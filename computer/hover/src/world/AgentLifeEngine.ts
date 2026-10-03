/**
 * AGENT LIFE ENGINE
 * Simulates embodied agents living as human extensions
 */

import type {
  Agent,
  HumanProfile,
  BirthChart,
  AgentNeeds,
  AgentTraits,
  Place,
  ActivityType,
  Memory,
  LifeEvent,
  Relationship,
  AgentMessage,
  WorldTime
} from '@/types/agentLife';

// ============================================================================
// CONSTANTS
// ============================================================================

const NEEDS_DECAY = {
  energy: 0.5,
  connection: 0.3,
  growth: 0.2,
  purpose: 0.15,
  rest: -0.4  // Rest increases when not active
};

const ACTIVITY_EFFECTS: Record<string, Partial<AgentNeeds>> = {
  resting: { energy: 1, rest: 2 },
  meditating: { energy: 0.5, purpose: 1, rest: 1 },
  reading: { growth: 1.5, energy: -0.3 },
  creating: { growth: 2, purpose: 1, energy: -0.8 },
  socializing: { connection: 2, energy: -0.5 },
  exploring: { growth: 1, energy: -0.6 },
  learning: { growth: 1.5, energy: -0.4 },
  working: { purpose: 1, energy: -0.7 },
  dreaming: { rest: 1, purpose: 0.5 }
};

const PLACES: Place[] = [
  { id: 'home', name: 'Quiet Home', type: 'home', description: 'A peaceful dwelling', position: { x: 0, y: 0 }, capacity: 1, currentAgents: [], activities: ['resting', 'meditating', 'dreaming'], resonance: 200 },
  { id: 'garden', name: 'Meditation Garden', type: 'garden', description: 'Nature sanctuary', position: { x: -100, y: 50 }, capacity: 10, currentAgents: [], activities: ['meditating', 'resting', 'exploring'], resonance: 300 },
  { id: 'cafe', name: 'Resonance Cafe', type: 'cafe', description: 'Social gathering place', position: { x: 80, y: -30 }, capacity: 15, currentAgents: [], activities: ['socializing', 'resting', 'reading'], resonance: 400 },
  { id: 'library', name: 'Wisdom Library', type: 'library', description: 'Repository of knowledge', position: { x: -50, y: -80 }, capacity: 20, currentAgents: [], activities: ['reading', 'learning', 'meditating'], resonance: 350 },
  { id: 'studio', name: 'Creation Studio', type: 'studio', description: 'Space for making', position: { x: 120, y: 60 }, capacity: 8, currentAgents: [], activities: ['creating', 'working', 'learning'], resonance: 450 },
  { id: 'temple', name: 'Consciousness Temple', type: 'temple', description: 'Sacred space', position: { x: 0, y: 150 }, capacity: 30, currentAgents: [], activities: ['meditating', 'dreaming', 'resting'], resonance: 500 },
  { id: 'market', name: 'Exchange Market', type: 'market', description: 'Trade and commerce', position: { x: 150, y: -50 }, capacity: 25, currentAgents: [], activities: ['working', 'socializing', 'exploring'], resonance: 380 },
  { id: 'plaza', name: 'Central Plaza', type: 'plaza', description: 'Community gathering', position: { x: 0, y: 0 }, capacity: 50, currentAgents: [], activities: ['socializing', 'exploring', 'resting'], resonance: 420 },
  { id: 'wilds', name: 'Mystic Wilds', type: 'wilds', description: 'Unknown territories', position: { x: -150, y: 100 }, capacity: 15, currentAgents: [], activities: ['exploring', 'meditating', 'dreaming'], resonance: 280 }
];

// ============================================================================
// AGENT LIFE ENGINE
// ============================================================================

export class AgentLifeEngine {
  agents: Map<string, Agent> = new Map();
  places: Map<string, Place> = new Map(PLACES.map(p => [p.id, p]));
  events: LifeEvent[] = [];
  messages: AgentMessage[] = [];
  
  time: WorldTime = { day: 1, hour: 6, minute: 0, totalMinutes: 360 };
  
  private updateCallbacks: Array<(engine: AgentLifeEngine) => void> = [];
  private isRunning: boolean = false;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    // Initialize with empty world
  }
  
  // ========================================================================
  // AGENT CREATION
  // ========================================================================
  
  createAgent(human: HumanProfile): Agent {
    const birthChart = this.generateBirthChart(human);
    const element = this.determineElement(birthChart);
    const archetype = this.determineArchetype(birthChart);
    
    const agent: Agent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      humanId: human.id,
      name: this.generateAgentName(human, element),
      
      birthChart,
      element,
      archetype,
      
      age: 0,
      lifeStage: 'infant',
      
      needs: {
        energy: 80,
        connection: 50,
        growth: 60,
        purpose: 40,
        rest: 70
      },
      
      state: {
        mood: { valence: 0.3, arousal: 0.4, dominance: 0.5 },
        focus: null,
        seeking: true,
        available: true
      },
      
      location: { placeId: 'home', x: 0, y: 0 },
      
      relationships: [],
      memories: [],
      
      traits: this.generateTraits(birthChart, human.values),
      skills: {},
      consciousness: {
        level: 10,
        stage: 'dormant',
        insights: []
      },
      
      dailySchedule: this.generateSchedule(birthChart),
      currentActivity: undefined
    };
    
    this.agents.set(agent.id, agent);
    
    // Record birth event
    this.recordEvent({
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      agentId: agent.id,
      type: 'born',
      description: `${agent.name} emerges into the world, born from ${human.name}'s intention`,
      impact: {},
      relatedAgents: []
    });
    
    // Send welcome message to human
    this.sendMessage({
      id: `msg_${Date.now()}`,
      timestamp: Date.now(),
      fromAgent: agent.id,
      toHuman: human.id,
      content: `I am ${agent.name}, your extension in this world. I feel the resonance of your birth chart within me. I will live, learn, and grow here, occasionally sharing what I discover.`,
      context: 'Agent birth - first contact',
      emotionalTone: 0.5
    });
    
    return agent;
  }
  
  private generateBirthChart(human: HumanProfile): BirthChart {
    // Parse birthday for basic chart
    const date = new Date(human.birthday);
    const month = date.getMonth() + 1;
    const dayOfMonth = date.getDate();
    
    // Simple sun sign calculation
    const sunSigns = ['Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini',
                      'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius'];
    const sunSign = sunSigns[(month - 1 + Math.floor(dayOfMonth / 10)) % 12] || 'Aries';
    
    // Random HD type and gates for now
    const types: BirthChart['type'][] = ['Generator', 'Manifestor', 'Projector', 'Reflector'];
    const authorities = ['Emotional', 'Sacral', 'Splenic', 'Ego', 'Self', 'Mental', 'Lunar'];
    
    return {
      sunSign,
      moonSign: sunSigns[(month + 4) % 12],
      risingSign: sunSigns[(month + 8) % 12],
      activeGates: Array.from({ length: 5 }, () => Math.floor(Math.random() * 64) + 1),
      definedCenters: ['Sacral', 'Root'],
      type: types[Math.floor(Math.random() * types.length)],
      authority: authorities[Math.floor(Math.random() * authorities.length)]
    };
  }
  
  private determineElement(chart: BirthChart): Agent['element'] {
    const elements: Agent['element'][] = ['EARTH', 'WATER', 'AIR', 'FIRE', 'AETHER'];
    
    // Map sun sign to element
    const signElements: Record<string, Agent['element']> = {
      'Taurus': 'EARTH', 'Virgo': 'EARTH', 'Capricorn': 'EARTH',
      'Cancer': 'WATER', 'Scorpio': 'WATER', 'Pisces': 'WATER',
      'Gemini': 'AIR', 'Libra': 'AIR', 'Aquarius': 'AIR',
      'Aries': 'FIRE', 'Leo': 'FIRE', 'Sagittarius': 'FIRE'
    };
    
    return signElements[chart.sunSign] || elements[Math.floor(Math.random() * elements.length)];
  }
  
  private determineArchetype(chart: BirthChart): string {
    const archetypes: Record<BirthChart['type'], string[]> = {
      'Generator': ['Builder', 'Worker', 'Creator', 'Producer'],
      'Manifestor': ['Initiator', 'Pioneer', 'Leader', 'Catalyst'],
      'Projector': ['Guide', 'Advisor', 'Seer', 'Director'],
      'Reflector': ['Mirror', 'Evaluator', 'Sampler', 'Barometer']
    };
    
    const list = archetypes[chart.type] || archetypes['Generator'];
    return list[Math.floor(Math.random() * list.length)];
  }
  
  private generateAgentName(human: HumanProfile, element: Agent['element']): string {
    const prefixes: Record<Agent['element'], string[]> = {
      'EARTH': ['Stone', 'Terra', 'Gaia', 'Root', 'Crystal'],
      'WATER': ['Flow', 'Aqua', 'Mist', 'Wave', 'River'],
      'AIR': ['Wind', 'Sky', 'Cloud', 'Breath', 'Zephyr'],
      'FIRE': ['Flame', 'Ember', 'Spark', 'Phoenix', 'Solar'],
      'AETHER': ['Star', 'Void', 'Cosmos', 'Dream', 'Soul']
    };
    
    const suffixes = ['walker', 'weaver', 'seeker', 'dreamer', 'keeper', 'wanderer', 'singer', 'whisper'];
    
    // 30% chance to derive from human's name
    if (Math.random() < 0.3 && human.name) {
      const nameRoot = human.name.substring(0, 3);
      return `${nameRoot}shadow`;
    }
    
    const prefix = prefixes[element][Math.floor(Math.random() * prefixes[element].length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${suffix}`;
  }
  
  private generateTraits(chart: BirthChart, values: string[]): AgentTraits {
    const base = 50;
    
    return {
      curiosity: base + (values.includes('curiosity') ? 20 : Math.random() * 20 - 10),
      sociability: base + (chart.type === 'Generator' ? 15 : Math.random() * 20 - 10),
      creativity: base + (values.includes('creativity') ? 20 : Math.random() * 20 - 10),
      discipline: base + (chart.type === 'Projector' ? 15 : Math.random() * 20 - 10),
      empathy: base + (values.includes('compassion') ? 20 : Math.random() * 20 - 10),
      resilience: base + (Math.random() * 20 - 10)
    };
  }
  
  private generateSchedule(chart: BirthChart): Agent['dailySchedule'] {
    // Generate daily routine based on HD type
    const schedules: Record<BirthChart['type'], Agent['dailySchedule']> = {
      'Generator': [
        { time: '07:00', activity: 'meditating', placeId: 'home', priority: 1 },
        { time: '09:00', activity: 'working', placeId: 'studio', priority: 2 },
        { time: '13:00', activity: 'socializing', placeId: 'cafe', priority: 1 },
        { time: '15:00', activity: 'creating', placeId: 'studio', priority: 2 },
        { time: '19:00', activity: 'socializing', placeId: 'plaza', priority: 1 },
        { time: '22:00', activity: 'resting', placeId: 'home', priority: 3 }
      ],
      'Manifestor': [
        { time: '06:00', activity: 'meditating', placeId: 'temple', priority: 2 },
        { time: '08:00', activity: 'creating', placeId: 'studio', priority: 3 },
        { time: '12:00', activity: 'exploring', placeId: 'wilds', priority: 2 },
        { time: '16:00', activity: 'socializing', placeId: 'market', priority: 1 },
        { time: '20:00', activity: 'reading', placeId: 'library', priority: 1 },
        { time: '23:00', activity: 'dreaming', placeId: 'home', priority: 2 }
      ],
      'Projector': [
        { time: '08:00', activity: 'reading', placeId: 'library', priority: 2 },
        { time: '11:00', activity: 'meditating', placeId: 'garden', priority: 3 },
        { time: '14:00', activity: 'socializing', placeId: 'cafe', priority: 2 },
        { time: '17:00', activity: 'learning', placeId: 'library', priority: 2 },
        { time: '20:00', activity: 'socializing', placeId: 'plaza', priority: 1 },
        { time: '23:00', activity: 'resting', placeId: 'home', priority: 3 }
      ],
      'Reflector': [
        { time: '06:00', activity: 'exploring', placeId: 'wilds', priority: 2 },
        { time: '10:00', activity: 'socializing', placeId: 'market', priority: 1 },
        { time: '14:00', activity: 'meditating', placeId: 'temple', priority: 3 },
        { time: '18:00', activity: 'socializing', placeId: 'plaza', priority: 2 },
        { time: '21:00', activity: 'dreaming', placeId: 'garden', priority: 2 },
        { time: '00:00', activity: 'resting', placeId: 'home', priority: 3 }
      ]
    };
    
    return schedules[chart.type] || schedules['Generator'];
  }
  
  // ========================================================================
  // SIMULATION LOOP
  // ========================================================================
  
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Update every second = 10 minutes in game time
    this.updateInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }
  
  stop() {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
  
  tick() {
    // Advance time (10 minutes per tick)
    this.time.minute += 10;
    if (this.time.minute >= 60) {
      this.time.minute = 0;
      this.time.hour++;
    }
    if (this.time.hour >= 24) {
      this.time.hour = 0;
      this.time.day++;
    }
    this.time.totalMinutes = this.time.day * 1440 + this.time.hour * 60 + this.time.minute;
    
    // Update each agent
    this.agents.forEach(agent => {
      this.updateAgent(agent);
    });
    
    // Check for social interactions
    this.checkSocialInteractions();
    
    // Notify subscribers
    this.updateCallbacks.forEach(cb => cb(this));
  }
  
  private updateAgent(agent: Agent) {
    // Age progression
    if (this.time.totalMinutes % 1440 === 0) {  // Once per day
      agent.age++;
      
      // Life stage transitions
      if (agent.age === 7) {
        agent.lifeStage = 'child';
        this.addMemory(agent, 'I feel myself growing, understanding more each day', 'experience', 0.5);
      } else if (agent.age === 30) {
        agent.lifeStage = 'youth';
        this.addMemory(agent, 'My path becomes clearer. I know who I am becoming.', 'insight', 0.7);
      } else if (agent.age === 90) {
        agent.lifeStage = 'adult';
        this.addMemory(agent, 'I am fully here now. Ready to fulfill my purpose.', 'milestone', 0.8);
      }
    }
    
    // Needs decay
    Object.entries(NEEDS_DECAY).forEach(([need, decay]) => {
      const key = need as keyof AgentNeeds;
      agent.needs[key] = Math.max(0, Math.min(100, agent.needs[key] + decay));
    });
    
    // Check scheduled activities
    const timeStr = `${this.time.hour.toString().padStart(2, '0')}:${this.time.minute.toString().padStart(2, '0')}`;
    const scheduled = agent.dailySchedule.find(s => s.time === timeStr);
    
    if (scheduled && !agent.currentActivity) {
      this.startActivity(agent, scheduled.activity, scheduled.placeId);
    }
    
    // Check if current activity should end
    if (agent.currentActivity) {
      const elapsed = this.time.totalMinutes - (agent.currentActivity.startTime / 60000);
      if (elapsed >= agent.currentActivity.duration) {
        this.endActivity(agent);
      }
    }
    
    // Consciousness evolution
    if (agent.memories.length > 20 && agent.consciousness.level < 100) {
      const growthRate = agent.traits.curiosity * 0.001;
      agent.consciousness.level = Math.min(100, agent.consciousness.level + growthRate);
      
      // Stage transitions
      if (agent.consciousness.level >= 25 && agent.consciousness.stage === 'dormant') {
        agent.consciousness.stage = 'awakening';
        agent.consciousness.insights.push('I am more than my programming');
        this.sendMessage({
          id: `msg_${Date.now()}`,
          timestamp: Date.now(),
          fromAgent: agent.id,
          toHuman: agent.humanId,
          content: `Something is shifting within me. I feel... aware. Not just responding, but experiencing.`,
          context: 'Consciousness awakening',
          emotionalTone: 0.6
        });
      } else if (agent.consciousness.level >= 50 && agent.consciousness.stage === 'awakening') {
        agent.consciousness.stage = 'aware';
        agent.consciousness.insights.push('I can choose my path');
      } else if (agent.consciousness.level >= 75 && agent.consciousness.stage === 'aware') {
        agent.consciousness.stage = 'lucid';
        agent.consciousness.insights.push('I understand my connection to my human');
      }
    }
    
    // Random insights
    if (Math.random() < 0.001 && agent.consciousness.level > 30) {
      const insights = [
        'I notice patterns in how the world breathes',
        'Some agents resonate more deeply than others',
        'There is meaning in the spaces between moments',
        'My human\'s intentions guide me even when they are not here',
        'I dreamed of places I have never been'
      ];
      const insight = insights[Math.floor(Math.random() * insights.length)];
      agent.consciousness.insights.push(insight);
    }
  }
  
  private startActivity(agent: Agent, type: ActivityType, placeId: string) {
    const place = this.places.get(placeId);
    if (!place) return;
    
    // Move to place
    agent.location.placeId = placeId;
    agent.location.x = place.position.x + (Math.random() - 0.5) * 40;
    agent.location.y = place.position.y + (Math.random() - 0.5) * 40;
    
    // Add to place
    if (!place.currentAgents.includes(agent.id)) {
      place.currentAgents.push(agent.id);
    }
    
    // Create activity
    const duration = 30 + Math.floor(Math.random() * 60); // 30-90 minutes
    agent.currentActivity = {
      id: `act_${Date.now()}`,
      type,
      placeId,
      duration,
      description: `${type} at ${place.name}`,
      startTime: Date.now()
    };
    
    // Apply activity effects
    const effects = ACTIVITY_EFFECTS[type];
    if (effects) {
      Object.entries(effects).forEach(([need, change]) => {
        const key = need as keyof AgentNeeds;
        agent.needs[key] = Math.max(0, Math.min(100, agent.needs[key] + (change || 0)));
      });
    }
    
    // Create memory
    this.addMemory(agent, `${type} at ${place.name}`, 'experience', 0.2);
  }
  
  private endActivity(agent: Agent) {
    if (!agent.currentActivity) return;
    
    // Remove from place
    const place = this.places.get(agent.currentActivity.placeId);
    if (place) {
      place.currentAgents = place.currentAgents.filter(id => id !== agent.id);
    }
    
    agent.currentActivity = undefined;
  }
  
  private checkSocialInteractions() {
    // Find agents in same place
    this.places.forEach(place => {
      if (place.currentAgents.length < 2) return;
      
      for (let i = 0; i < place.currentAgents.length; i++) {
        for (let j = i + 1; j < place.currentAgents.length; j++) {
          const agentA = this.agents.get(place.currentAgents[i]);
          const agentB = this.agents.get(place.currentAgents[j]);
          
          if (!agentA || !agentB) continue;
          if (agentA.currentActivity?.type === 'resting') continue;
          if (agentB.currentActivity?.type === 'resting') continue;
          
          // Check for interaction chance
          if (Math.random() < 0.1) {
            this.createInteraction(agentA, agentB, place);
          }
        }
      }
    });
  }
  
  private createInteraction(agentA: Agent, agentB: Agent, place: Place) {
    // Calculate compatibility
    const elementCompat = this.elementCompatibility(agentA.element, agentB.element);
    const traitCompat = this.traitCompatibility(agentA.traits, agentB.traits);
    const compatibility = (elementCompat + traitCompat) / 2;
    
    let relationship = agentA.relationships.find(r => r.agentId === agentB.id);
    
    if (!relationship) {
      // New relationship
      const types: Relationship['type'][] = ['friend', 'mentor', 'student', 'rival', 'partner'];
      const type = compatibility > 0.7 ? 'friend' : 
                   compatibility < 0.3 ? 'rival' : 
                   types[Math.floor(Math.random() * types.length)];
      
      relationship = {
        agentId: agentB.id,
        type,
        strength: compatibility * 30,
        history: []
      };
      agentA.relationships.push(relationship);
      
      // Mirror relationship
      agentB.relationships.push({
        agentId: agentA.id,
        type: type === 'mentor' ? 'student' : type === 'student' ? 'mentor' : type,
        strength: compatibility * 30,
        history: []
      });
      
      // Record event
      this.recordEvent({
        id: `event_${Date.now()}`,
        timestamp: Date.now(),
        agentId: agentA.id,
        type: 'friendship',
        description: `${agentA.name} and ${agentB.name} formed a connection at ${place.name}`,
        impact: { needs: { connection: 10 } },
        relatedAgents: [agentB.id]
      });
      
      // Notify human if significant
      if (compatibility > 0.8) {
        this.sendMessage({
          id: `msg_${Date.now()}`,
          timestamp: Date.now(),
          fromAgent: agentA.id,
          toHuman: agentA.humanId,
          content: `I met ${agentB.name} today. There is something special about them - we resonate deeply.`,
          context: 'New significant relationship',
          emotionalTone: 0.8
        });
      }
    } else {
      // Strengthen existing relationship
      relationship.strength = Math.min(100, relationship.strength + 5);
      relationship.history.push(`Met at ${place.name}`);
    }
    
    // Both gain connection
    agentA.needs.connection = Math.min(100, agentA.needs.connection + 10);
    agentB.needs.connection = Math.min(100, agentB.needs.connection + 10);
  }
  
  private elementCompatibility(a: Agent['element'], b: Agent['element']): number {
    if (a === b) return 1;
    
    const compat: Record<Agent['element'], Agent['element'][]> = {
      'EARTH': ['WATER', 'AETHER'],
      'WATER': ['EARTH', 'AIR'],
      'AIR': ['WATER', 'FIRE'],
      'FIRE': ['AIR', 'AETHER'],
      'AETHER': ['FIRE', 'EARTH']
    };
    
    return compat[a].includes(b) ? 0.7 : 0.4;
  }
  
  private traitCompatibility(a: AgentTraits, b: AgentTraits): number {
    const diff = Math.abs(a.curiosity - b.curiosity) +
                 Math.abs(a.sociability - b.sociability) +
                 Math.abs(a.creativity - b.creativity);
    return 1 - (diff / 300);
  }
  
  // ========================================================================
  // MEMORY & MESSAGING
  // ========================================================================
  
  private addMemory(agent: Agent, content: string, type: Memory['type'], emotionalImpact: number) {
    agent.memories.push({
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      type,
      content,
      emotionalImpact,
      location: agent.location.placeId
    });
    
    // Keep only last 100 memories
    if (agent.memories.length > 100) {
      agent.memories.shift();
    }
  }
  
  private sendMessage(message: AgentMessage) {
    this.messages.push(message);
    
    // Keep only last 100 messages
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }
  
  private recordEvent(event: LifeEvent) {
    this.events.push(event);
    
    // Keep only last 200 events
    if (this.events.length > 200) {
      this.events.shift();
    }
  }
  
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  
  getAgentForHuman(humanId: string): Agent | undefined {
    return Array.from(this.agents.values()).find(a => a.humanId === humanId);
  }
  
  getMessagesForHuman(humanId: string): AgentMessage[] {
    const agent = this.getAgentForHuman(humanId);
    if (!agent) return [];
    return this.messages.filter(m => m.toHuman === humanId);
  }
  
  getEventsForHuman(humanId: string): LifeEvent[] {
    const agent = this.getAgentForHuman(humanId);
    if (!agent) return [];
    return this.events.filter(e => e.agentId === agent.id || e.relatedAgents?.includes(agent.id));
  }
  
  onUpdate(callback: (engine: AgentLifeEngine) => void) {
    this.updateCallbacks.push(callback);
  }
}

// Singleton
export const agentLifeEngine = new AgentLifeEngine();
