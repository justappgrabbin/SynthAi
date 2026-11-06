const clone = value => value === undefined ? undefined : structuredClone(value);

export const HUMAN_AGENT_OPERATIONS = Object.freeze({
  'agent.create': ['AutonomousAgentEngine','CreateAgent'],
  'scenario.drop': ['AutonomousAgentEngine','DropAgentIntoScenario'],
  'guidance.provide': ['AutonomousAgentEngine','ProvideGuidance'],
  'scenario.inject': ['AutonomousAgentEngine','InjectScenario'],
  'agents.list': ['AutonomousAgentEngine','GetActiveAgents'],

  'care.create': ['TamagotchiAgentEngine','CreateAgent'],
  'care.apply': ['TamagotchiAgentEngine','CareForAgent'],
  'care.status': ['TamagotchiAgentEngine','GetAgentStatus'],
  'care.tick': ['TamagotchiAgentEngine','ProcessAutonomousTick'],
  'journal.reflect': ['TamagotchiAgentEngine','ApplyNotebookReflection'],
  'resonance.report': ['TamagotchiAgentEngine','GetResonanceReport'],

  'simulation.start': ['SimulationEngine','Start'],
  'simulation.stop': ['SimulationEngine','Stop'],
  'simulation.tick': ['SimulationEngine','Tick'],
  'simulation.object.add': ['SimulationEngine','AddObject'],
  'simulation.action.queue': ['SimulationEngine','QueueAction'],
  'simulation.object.get': ['SimulationEngine','GetGameObject'],
  'simulation.object.info': ['SimulationEngine','GetGameObjectInfo'],
});

export class HumanAgentMechanicsAdapter {
  constructor({ host, state = null, bus = null, clock = () => Date.now(), id = 'mechanics:human-agent' } = {}) {
    if (!host?.invoke) throw new TypeError('HumanAgentMechanicsAdapter requires host.invoke({component,method,args})');
    Object.assign(this,{host,state,bus,clock,id});
    this.calls=0;
  }

  async request({ operation, payload = {} } = {}) {
    const route=HUMAN_AGENT_OPERATIONS[String(operation)];
    if(!route) throw new Error(`unsupported Human Agent mechanics operation: ${operation}`);
    const [component,method]=route;
    const args=this.#args(operation,payload);
    const result=await this.host.invoke({component,method,args:clone(args)});
    const receipt={
      id:`human-agent-${this.clock()}-${++this.calls}`,
      operation:String(operation),component,method,
      args:clone(args),result:clone(result),at:this.clock(),
    };
    if(this.state?.set) await this.state.set(`humanAgent.last.${component}`,receipt,{source:'human-agent-mechanics'});
    this.bus?.emit('human-agent:operation',clone(receipt));
    return clone(result);
  }

  #args(operation,p={}) {
    switch(operation){
      case 'agent.create':
      case 'care.create': return [clone(p.character)];
      case 'scenario.drop': return [String(p.agentId),clone(p.scenario)];
      case 'guidance.provide': return [String(p.agentId),String(p.guidanceText??''),clone(p.type)];
      case 'scenario.inject': return [String(p.agentId),typeof p.scenarioJson==='string'?p.scenarioJson:JSON.stringify(p.scenarioJson??p.scenario??{})];
      case 'agents.list':
      case 'care.tick':
      case 'simulation.start':
      case 'simulation.stop':
      case 'simulation.tick': return [];
      case 'care.apply': return [String(p.agentId),clone(p.action)];
      case 'care.status':
      case 'resonance.report': return [String(p.agentId)];
      case 'journal.reflect': return [String(p.agentId),String(p.journalEntry??'')];
      case 'simulation.object.add': return [clone(p.object)];
      case 'simulation.action.queue': return [clone(p.action)];
      case 'simulation.object.get':
      case 'simulation.object.info': return [String(p.objectId)];
      default: return [];
    }
  }

  snapshot(){
    return {
      id:this.id,
      donor:'humanagent/ModularSimWorld',
      language:'C#',
      hostId:this.host.id??null,
      calls:this.calls,
      operations:Object.keys(HUMAN_AGENT_OPERATIONS),
      authority:'daily-life-mechanics-only',
    };
  }
}

export default HumanAgentMechanicsAdapter;
