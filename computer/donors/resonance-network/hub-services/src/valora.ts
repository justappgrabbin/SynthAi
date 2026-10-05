// ============================================================
// HUB 7: VALORA - Monetization & Value Flow Engine
// Passive income stream architecture, value exchange modeling
// Sustainable economics for living systems
// ============================================================

export interface ValueStream {
  id: string;
  name: string;
  type: 'passive_income' | 'service' | 'product' | 'subscription' | 'donation' | 'exchange';
  source: string;
  sink: string;
  flowRate: number;  // Value per unit time
  currency: string;
  volatility: number;  // 0-1 stability measure
  growthRate: number;  // Annual growth rate
  sustainability: number;  // 0-1 long-term viability
  dependencies: string[];  // Other streams this depends on
  metadata: Record<string, any>;
}

export interface ValueExchange {
  id: string;
  from: string;
  to: string;
  valueType: 'currency' | 'time' | 'knowledge' | 'attention' | 'reputation' | 'access';
  amount: number;
  timestamp: number;
  context: string;
  reciprocity: number;  // 0-1 how reciprocal the exchange is
  fairness: number;  // 0-1 perceived fairness
}

export interface IncomeModel {
  id: string;
  name: string;
  streams: ValueStream[];
  totalFlow: number;
  diversification: number;  // 0-1 how diversified
  resilience: number;  // 0-1 ability to withstand shocks
  projections: Projection[];
  sustainability: number;
}

export interface Projection {
  timeHorizon: number;  // months
  expectedValue: number;
  confidenceInterval: [number, number];
  probability: number;
  assumptions: string[];
}

export interface EconomicAgent {
  id: string;
  name: string;
  type: 'individual' | 'organization' | 'system' | 'community';
  resources: Map<string, number>;  // resource -> amount
  capabilities: string[];
  needs: string[];
  offers: string[];
  reputation: number;
  trustScore: number;
  transactionHistory: ValueExchange[];
}

export interface MarketSimulation {
  agents: EconomicAgent[];
  exchanges: ValueExchange[];
  equilibrium: boolean;
  priceDiscovery: Map<string, number>;  // good -> price
  surplus: Map<string, number>;  // agent -> surplus
  efficiency: number;  // 0-1 Pareto efficiency
}

// ============================================================
// VALORA ENGINE - Value Flow Modeling
// ============================================================

export class ValoraEngine {
  private streams: Map<string, ValueStream> = new Map();
  private exchanges: Map<string, ValueExchange> = new Map();
  private models: Map<string, IncomeModel> = new Map();
  private agents: Map<string, EconomicAgent> = new Map();
  private simulations: MarketSimulation[] = [];

  constructor() {
    console.log('[VALORA] Initialized - Monetization & Value Flow Engine');
  }

  // ============================================================
  // VALUE STREAM ARCHITECTURE
  // ============================================================

  async createValueStream(config: Omit<ValueStream, 'id'>): Promise<ValueStream> {
    const stream: ValueStream = {
      ...config,
      id: `stream_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };

    this.streams.set(stream.id, stream);
    console.log(`[VALORA] Value stream created: ${stream.name} (${stream.type})`);

    return stream;
  }

  async modelIncomeStreams(config: {
    name: string;
    streams: Omit<ValueStream, 'id'>[];
  }): Promise<IncomeModel> {
    console.log(`[VALORA] Modeling income: ${config.name}`);

    const createdStreams: ValueStream[] = [];
    for (const streamConfig of config.streams) {
      const stream = await this.createValueStream(streamConfig);
      createdStreams.push(stream);
    }

    // Calculate total flow
    const totalFlow = createdStreams.reduce((sum, s) => sum + s.flowRate, 0);

    // Calculate diversification
    const types = new Set(createdStreams.map(s => s.type));
    const diversification = types.size / createdStreams.length;

    // Calculate resilience (inverse of dependency concentration)
    const dependencyCount = createdStreams.reduce((sum, s) => sum + s.dependencies.length, 0);
    const resilience = createdStreams.length > 0 ? 1 - (dependencyCount / (createdStreams.length * createdStreams.length)) : 0;

    // Calculate sustainability
    const sustainability = createdStreams.reduce((sum, s) => sum + s.sustainability, 0) / createdStreams.length;

    // Generate projections
    const projections = this.generateProjections(createdStreams);

    const model: IncomeModel = {
      id: `model_${Date.now()}`,
      name: config.name,
      streams: createdStreams,
      totalFlow,
      diversification,
      resilience,
      projections,
      sustainability
    };

    this.models.set(model.id, model);

    console.log(`[VALORA] Income model created: ${model.name}`);
    console.log(`  Total flow: ${totalFlow.toFixed(2)}/month`);
    console.log(`  Diversification: ${(diversification * 100).toFixed(1)}%`);
    console.log(`  Resilience: ${(resilience * 100).toFixed(1)}%`);
    console.log(`  Sustainability: ${(sustainability * 100).toFixed(1)}%`);

    return model;
  }

  private generateProjections(streams: ValueStream[]): Projection[] {
    const projections: Projection[] = [];
    const horizons = [3, 6, 12, 24, 36]; // months

    for (const horizon of horizons) {
      const currentFlow = streams.reduce((sum, s) => sum + s.flowRate, 0);
      const avgGrowth = streams.reduce((sum, s) => sum + s.growthRate, 0) / streams.length;
      const avgVolatility = streams.reduce((sum, s) => sum + s.volatility, 0) / streams.length;

      const expectedValue = currentFlow * Math.pow(1 + avgGrowth, horizon / 12);
      const stdDev = expectedValue * avgVolatility * Math.sqrt(horizon / 12);

      projections.push({
        timeHorizon: horizon,
        expectedValue,
        confidenceInterval: [expectedValue - 1.96 * stdDev, expectedValue + 1.96 * stdDev],
        probability: 0.95,
        assumptions: [
          `Average growth rate: ${(avgGrowth * 100).toFixed(1)}%`,
          `Average volatility: ${(avgVolatility * 100).toFixed(1)}%`,
          `No catastrophic events`
        ]
      });
    }

    return projections;
  }

  // ============================================================
  // VALUE EXCHANGE MODELING
  // ============================================================

  async recordExchange(exchange: Omit<ValueExchange, 'id'>): Promise<ValueExchange> {
    const recorded: ValueExchange = {
      ...exchange,
      id: `exchange_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };

    this.exchanges.set(recorded.id, recorded);

    // Update agent transaction histories
    const fromAgent = this.agents.get(exchange.from);
    const toAgent = this.agents.get(exchange.to);

    if (fromAgent) {
      fromAgent.transactionHistory.push(recorded);
      fromAgent.resources.set(exchange.valueType, (fromAgent.resources.get(exchange.valueType) || 0) - exchange.amount);
    }

    if (toAgent) {
      toAgent.transactionHistory.push(recorded);
      toAgent.resources.set(exchange.valueType, (toAgent.resources.get(exchange.valueType) || 0) + exchange.amount);
    }

    console.log(`[VALORA] Exchange recorded: ${exchange.from} -> ${exchange.to} (${exchange.amount} ${exchange.valueType})`);

    return recorded;
  }

  async createAgent(config: Omit<EconomicAgent, 'id' | 'transactionHistory'>): Promise<EconomicAgent> {
    const agent: EconomicAgent = {
      ...config,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      transactionHistory: []
    };

    this.agents.set(agent.id, agent);
    console.log(`[VALORA] Economic agent created: ${agent.name} (${agent.type})`);

    return agent;
  }

  // ============================================================
  // MARKET SIMULATION
  // ============================================================

  async simulateMarket(config: {
    agents: string[];  // agent IDs
    goods: string[];
    rounds: number;
  }): Promise<MarketSimulation> {
    console.log(`[VALORA] Simulating market with ${config.agents.length} agents, ${config.goods.length} goods, ${config.rounds} rounds`);

    const agents = config.agents.map(id => this.agents.get(id)).filter(Boolean) as EconomicAgent[];
    const exchanges: ValueExchange[] = [];
    const priceDiscovery = new Map<string, number>();

    // Initialize prices
    for (const good of config.goods) {
      priceDiscovery.set(good, 1.0);
    }

    // Run simulation rounds
    for (let round = 0; round < config.rounds; round++) {
      // Random matching of agents
      const shuffled = [...agents].sort(() => Math.random() - 0.5);

      for (let i = 0; i < shuffled.length - 1; i += 2) {
        const buyer = shuffled[i];
        const seller = shuffled[i + 1];

        // Find mutually beneficial trade
        const trade = this.findTrade(buyer, seller, config.goods, priceDiscovery);

        if (trade) {
          const exchange = await this.recordExchange({
            from: buyer.id,
            to: seller.id,
            valueType: trade.good as any,
            amount: trade.quantity,
            timestamp: Date.now(),
            context: `market_simulation_round_${round}`,
            reciprocity: 0.5,
            fairness: trade.fairness
          });

          exchanges.push(exchange);

          // Update price
          const currentPrice = priceDiscovery.get(trade.good) || 1;
          priceDiscovery.set(trade.good, currentPrice * (1 + (Math.random() - 0.5) * 0.1));
        }
      }
    }

    // Calculate surplus
    const surplus = new Map<string, number>();
    for (const agent of agents) {
      const totalValue = Array.from(agent.resources.values()).reduce((sum, v) => sum + v, 0);
      surplus.set(agent.id, totalValue);
    }

    // Calculate efficiency (simplified)
    const totalSurplus = Array.from(surplus.values()).reduce((sum, v) => sum + v, 0);
    const efficiency = totalSurplus / (agents.length * config.goods.length);

    const simulation: MarketSimulation = {
      agents,
      exchanges,
      equilibrium: exchanges.length > agents.length * config.goods.length * 0.5,
      priceDiscovery,
      surplus,
      efficiency: Math.min(efficiency, 1.0)
    };

    this.simulations.push(simulation);

    console.log(`[VALORA] Market simulation complete: ${exchanges.length} exchanges, efficiency: ${(efficiency * 100).toFixed(1)}%`);

    return simulation;
  }

  private findTrade(buyer: EconomicAgent, seller: EconomicAgent, goods: string[], prices: Map<string, number>): {good: string; quantity: number; fairness: number} | null {
    for (const good of goods) {
      const buyerHas = buyer.resources.get(good) || 0;
      const sellerHas = seller.resources.get(good) || 0;
      const price = prices.get(good) || 1;

      // Buyer wants what seller has
      if (sellerHas > 0 && buyerHas < 10) {
        const quantity = Math.min(sellerHas, 10 - buyerHas);
        const fairness = 0.5 + (buyer.reputation + seller.reputation) / 4;

        return { good, quantity, fairness };
      }
    }

    return null;
  }

  // ============================================================
  // SUSTAINABILITY ANALYSIS
  // ============================================================

  async analyzeSustainability(modelId: string): Promise<any> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    console.log(`[VALORA] Analyzing sustainability: ${model.name}`);

    const analysis = {
      modelId,
      name: model.name,
      currentHealth: {
        totalFlow: model.totalFlow,
        diversification: model.diversification,
        resilience: model.resilience,
        sustainability: model.sustainability
      },
      risks: this.identifyRisks(model),
      opportunities: this.identifyOpportunities(model),
      recommendations: this.generateRecommendations(model),
      projections: model.projections
    };

    return analysis;
  }

  private identifyRisks(model: IncomeModel): string[] {
    const risks: string[] = [];

    if (model.diversification < 0.3) {
      risks.push('High concentration risk - over-reliance on few income sources');
    }

    if (model.resilience < 0.5) {
      risks.push('Low resilience - vulnerable to external shocks');
    }

    const volatileStreams = model.streams.filter(s => s.volatility > 0.5);
    if (volatileStreams.length > 0) {
      risks.push(`${volatileStreams.length} streams have high volatility`);
    }

    const unsustainableStreams = model.streams.filter(s => s.sustainability < 0.3);
    if (unsustainableStreams.length > 0) {
      risks.push(`${unsustainableStreams.length} streams may not be sustainable long-term`);
    }

    return risks;
  }

  private identifyOpportunities(model: IncomeModel): string[] {
    const opportunities: string[] = [];

    const highGrowth = model.streams.filter(s => s.growthRate > 0.2);
    if (highGrowth.length > 0) {
      opportunities.push(`${highGrowth.length} streams show strong growth potential`);
    }

    const missingTypes = ['passive_income', 'subscription', 'service', 'product'].filter(
      t => !model.streams.some(s => s.type === t)
    );
    if (missingTypes.length > 0) {
      opportunities.push(`Consider adding: ${missingTypes.join(', ')}`);
    }

    return opportunities;
  }

  private generateRecommendations(model: IncomeModel): string[] {
    const recommendations: string[] = [];

    if (model.diversification < 0.5) {
      recommendations.push('Diversify income streams across different types and sources');
    }

    if (model.resilience < 0.7) {
      recommendations.push('Reduce dependencies between streams to increase resilience');
    }

    const lowSustainability = model.streams.filter(s => s.sustainability < 0.5);
    if (lowSustainability.length > 0) {
      recommendations.push(`Improve sustainability of: ${lowSustainability.map(s => s.name).join(', ')}`);
    }

    recommendations.push('Regularly review and adjust projections based on actual performance');
    recommendations.push('Build emergency reserves equivalent to 3-6 months of total flow');

    return recommendations;
  }

  // ============================================================
  // API INTERFACE
  // ============================================================

  async handleMessage(message: any): Promise<any> {
    const { type, payload } = message;

    switch (type) {
      case 'create_stream':
        return await this.createValueStream(payload);

      case 'model_income':
        return await this.modelIncomeStreams(payload);

      case 'record_exchange':
        return await this.recordExchange(payload);

      case 'create_agent':
        return await this.createAgent(payload);

      case 'simulate_market':
        return await this.simulateMarket(payload);

      case 'analyze_sustainability':
        return await this.analyzeSustainability(payload.modelId);

      case 'get_model':
        return this.models.get(payload.modelId);

      case 'get_stream':
        return this.streams.get(payload.streamId);

      case 'get_agent':
        return this.agents.get(payload.agentId);

      case 'stats':
        return {
          streams: this.streams.size,
          models: this.models.size,
          agents: this.agents.size,
          exchanges: this.exchanges.size,
          simulations: this.simulations.length
        };

      default:
        return { error: `Unknown message type: ${type}` };
    }
  }
}

export default ValoraEngine;
