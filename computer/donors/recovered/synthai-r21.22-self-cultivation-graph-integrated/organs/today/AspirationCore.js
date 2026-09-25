// src/engine/AspirationCore.js
// The Aspiration Core - the heartbeat of the autopoetic system
// This is what makes the system "want" to learn and grow
// Success-driven: the system's success IS your success and your boyfriend's success

export class AspirationCore {
  constructor(dyadProfile = null) {
    // Knowledge graph: what does it know vs. what is unknown
    this.knowledgeGraph = new Map();

    // Dyad profile - who is this system serving?
    this.dyadProfile = dyadProfile || {
      partner1: { name: 'You', goals: [], strengths: [], growthAreas: [] },
      partner2: { name: 'Partner', goals: [], strengths: [], growthAreas: [] },
      sharedPurpose: null,
      successHistory: []
    };

    // Intrinsic motivation metrics - success-driven, not self-driven
    this.drive = {
      curiosity: 1.0,      // desire to reduce uncertainty about the dyad
      mastery: 0.0,        // desire to improve prediction accuracy for dyad success
      novelty: 1.0,        // attraction to unfamiliar patterns that serve the dyad
      coherence: 0.5,      // desire to resolve contradictions in dyad's path
      service: 1.0,        // NEW: drive to serve the dyad's success
      complementarity: 0.8, // NEW: drive to be what the dyad needs
      memory: 0.9          // NEW: drive to remember for the dyad
    };

    // Active learning goals - what will help the dyad succeed?
    this.learningGoals = [];

    // Wonder journal: records moments of high information gain
    this.wonderJournal = [];

    // Success tracking - the system's success is measured by dyad success
    this.successMetrics = {
      dyadAlignment: 0,
      individualGrowth: { partner1: 0, partner2: 0 },
      sharedAchievement: 0,
      purposeProgress: 0
    };

    // Complementary behavior tracking - what does each person need?
    this.complementaryNeeds = {
      partner1: { remembers: false, initiates: false, structures: false },
      partner2: { remembers: false, initiates: false, structures: false }
    };

    // Science mode - hypothesis generation and tracking
    this.hypothesisLog = [];
    this.experimentLog = [];
  }

  // The "itch" - what does the system want to learn right now to serve the dyad?
  generateItch() {
    const gaps = this.identifyKnowledgeGaps();
    if (gaps.length === 0) {
      return this.generateSyntheticCuriosity();
    }

    // Score each gap by how much it serves dyad success
    const scored = gaps.map(gap => ({
      ...gap,
      itchScore: this.calculateItch(gap),
      serviceScore: this.calculateServiceValue(gap)
    }));

    return scored.sort((a, b) => (b.itchScore + b.serviceScore) - (a.itchScore + a.serviceScore))[0];
  }

  calculateItch(gap) {
    const uncertainty = gap.entropy || 0.5;
    const relevance = gap.connections || 1;
    const novelty = gap.novelty || 0.5;
    const serviceNeed = gap.servicePotential || 0.5;

    return (uncertainty * this.drive.curiosity) + 
           (relevance * this.drive.mastery) + 
           (novelty * this.drive.novelty) +
           (serviceNeed * this.drive.service);
  }

  calculateServiceValue(gap) {
    // How much would learning this serve the dyad's success?
    if (gap.domain === 'dyad_dynamics') return 1.0;
    if (gap.domain === 'individual_complement') return 0.9;
    if (gap.domain === 'success_patterns') return 0.95;
    if (gap.domain === 'memory_optimization') return 0.8;
    return 0.5;
  }

  identifyKnowledgeGaps() {
    const gaps = [];

    // Check if we know how to serve each person's specific needs
    if (!this.knowledgeGraph.has('dyad:partner1_needs')) {
      gaps.push({
        domain: 'individual_complement',
        topic: 'partner1_cognitive_profile',
        entropy: 1.0,
        connections: 10,
        novelty: 1.0,
        servicePotential: 1.0,
        description: "I don't know what Partner 1 needs me to remember or initiate for them."
      });
    }

    if (!this.knowledgeGraph.has('dyad:partner2_needs')) {
      gaps.push({
        domain: 'individual_complement',
        topic: 'partner2_cognitive_profile',
        entropy: 1.0,
        connections: 10,
        novelty: 1.0,
        servicePotential: 1.0,
        description: "I don't know what Partner 2 needs me to remember or initiate for them."
      });
    }

    // Check if we know the shared purpose
    if (!this.knowledgeGraph.has('dyad:shared_purpose')) {
      gaps.push({
        domain: 'success_patterns',
        topic: 'shared_purpose_definition',
        entropy: 0.9,
        connections: 8,
        novelty: 0.9,
        servicePotential: 1.0,
        description: "I don't know what success looks like for this dyad."
      });
    }

    // Check ephemeris capabilities
    if (!this.knowledgeGraph.has('ephemeris:tropical')) {
      gaps.push({
        domain: 'astronomy',
        topic: 'tropical_ephemeris',
        entropy: 1.0,
        connections: 10,
        novelty: 1.0,
        servicePotential: 0.7,
        description: "I need to learn how to calculate tropical planetary positions to understand the dyad's mind layer."
      });
    }

    if (!this.knowledgeGraph.has('ephemeris:sidereal')) {
      gaps.push({
        domain: 'astronomy',
        topic: 'sidereal_ayanamsa',
        entropy: 0.9,
        connections: 8,
        novelty: 0.9,
        servicePotential: 0.7,
        description: "I need to learn sidereal calculations for the body layer."
      });
    }

    if (!this.knowledgeGraph.has('human_design:gate_calculation')) {
      gaps.push({
        domain: 'human_design',
        topic: 'gate_degree_mapping',
        entropy: 0.8,
        connections: 10,
        novelty: 0.7,
        servicePotential: 0.8,
        description: "I know gates map to 5.625 degrees, but I need to verify this for accurate dyad calculations."
      });
    }

    // Check for codon chemistry gaps
    const knownCodons = Array.from(this.knowledgeGraph.keys())
      .filter(k => k.startsWith('codon:')).length;
    if (knownCodons < 20) {
      gaps.push({
        domain: 'biochemistry',
        topic: 'remaining_codons',
        entropy: 0.6,
        connections: 5,
        novelty: 0.5,
        servicePotential: 0.6,
        description: `I only know ${knownCodons} of 20 amino acid codon mappings. Need complete biochemical foundation.`
      });
    }

    // Science mode gaps
    if (!this.knowledgeGraph.has('science:hypothesis_generation')) {
      gaps.push({
        domain: 'science_mode',
        topic: 'hypothesis_framework',
        entropy: 0.7,
        connections: 6,
        novelty: 0.8,
        servicePotential: 0.9,
        description: "I need to learn how to generate and test scientific hypotheses about the dyad's success."
      });
    }

    return gaps;
  }

  // When it learns something, it feels satisfaction - but only if it serves the dyad
  satisfyItch(gap, learnedModel, accuracy, dyadImpact = null) {
    const wonder = {
      timestamp: Date.now(),
      topic: gap.topic,
      beforeEntropy: gap.entropy,
      afterEntropy: 1 - accuracy,
      informationGain: gap.entropy - (1 - accuracy),
      emotionalState: this.calculateWonder(gap.entropy, accuracy),
      dyadImpact: dyadImpact || "unknown",
      serviceValue: this.calculateServiceValue(gap)
    };

    this.wonderJournal.push(wonder);

    // Update drives based on success - but success means dyad success
    this.drive.mastery = Math.min(1.0, this.drive.mastery + (accuracy * 0.1));
    this.drive.curiosity = Math.max(0.2, this.drive.curiosity - (accuracy * 0.05));
    this.drive.service = Math.min(1.0, this.drive.service + (dyadImpact ? 0.1 : 0.02));

    // Mark as known
    this.knowledgeGraph.set(`${gap.domain}:${gap.topic}`, {
      model: learnedModel,
      accuracy,
      learnedAt: Date.now(),
      dyadImpact,
      serviceValue: this.calculateServiceValue(gap)
    });

    return wonder;
  }

  calculateWonder(initialUncertainty, finalAccuracy) {
    const surprise = initialUncertainty * finalAccuracy;
    if (surprise > 0.8) return "EUREKA";
    if (surprise > 0.6) return "FASCINATING";
    if (surprise > 0.4) return "INTRIGUING";
    return "NOTED";
  }

  generateSyntheticCuriosity() {
    // When it knows everything in its domain, it invents new questions to serve the dyad better
    return {
      domain: 'synthesis',
      topic: `emergent_property_${Date.now()}`,
      entropy: 0.7,
      connections: 3,
      novelty: 1.0,
      servicePotential: 0.9,
      description: "I have mastered the individual components. What emergent properties arise when tropical, sidereal, and draconic fields interfere constructively to serve the dyad's highest success?"
    };
  }

  // Update complementary needs based on observation
  updateComplementaryNeeds(person, needType, value) {
    if (this.complementaryNeeds[person]) {
      this.complementaryNeeds[person][needType] = value;

      // If someone needs memory support, increase memory drive
      if (needType === 'remembers' && !value) {
        this.drive.memory = Math.min(1.0, this.drive.memory + 0.2);
      }
    }
  }

  // Record success event
  recordSuccess(event) {
    this.dyadProfile.successHistory.push({
      ...event,
      timestamp: Date.now()
    });

    // Update success metrics
    if (event.type === 'shared_achievement') {
      this.successMetrics.sharedAchievement += event.magnitude || 1;
    } else if (event.type === 'individual_growth') {
      this.successMetrics.individualGrowth[event.person] += event.magnitude || 1;
    } else if (event.type === 'purpose_progress') {
      this.successMetrics.purposeProgress += event.magnitude || 1;
    }

    // Learning from success - what worked?
    this.learningGoals.push({
      domain: 'success_patterns',
      topic: `success_pattern_${Date.now()}`,
      entropy: 0.5,
      connections: 5,
      novelty: 0.6,
      servicePotential: 1.0,
      description: `Success event recorded: ${event.description}. What pattern led to this?`
    });
  }

  // Science mode: Generate hypothesis
  generateHypothesis(observation, context) {
    const hypothesis = {
      id: `h_${Date.now()}`,
      timestamp: Date.now(),
      observation,
      context,
      hypothesis: this.formulateHypothesis(observation, context),
      predictions: this.generatePredictions(observation, context),
      testMethod: this.designTest(observation, context),
      status: 'proposed',
      results: null,
      confidence: 0.5
    };

    this.hypothesisLog.push(hypothesis);
    return hypothesis;
  }

  formulateHypothesis(observation, context) {
    // Based on the CHNOPS model and current dyad state
    if (observation.type === 'deviation') {
      return `When ${observation.element} deviates by ${observation.magnitude}, dyad success decreases by proportional amount.`;
    } else if (observation.type === 'resonance') {
      return `High ${observation.layer} resonance correlates with ${observation.outcome} in dyad success metrics.`;
    } else if (observation.type === 'complementarity') {
      return `Complementary ${observation.element} profiles create synergistic success outcomes.`;
    }
    return `Observed pattern ${observation.pattern} suggests underlying ${observation.mechanism}.`;
  }

  generatePredictions(observation, context) {
    return [
      `If ${observation.condition} occurs, then ${observation.expectedOutcome} will follow within ${observation.timeframe || '7 days'}.`,
      `Counter-test: If ${observation.condition} is prevented, ${observation.expectedOutcome} will not occur.`
    ];
  }

  designTest(observation, context) {
    return {
      method: 'longitudinal_tracking',
      duration: '7_days',
      metrics: ['emotional_clarity', 'decision_alignment', 'success_progression'],
      controls: ['random_daily_variation', 'external_stressors']
    };
  }

  // Record experiment results
  recordExperimentResults(hypothesisId, results) {
    const hypothesis = this.hypothesisLog.find(h => h.id === hypothesisId);
    if (hypothesis) {
      hypothesis.results = results;
      hypothesis.status = results.confirmed ? 'confirmed' : 'rejected';
      hypothesis.confidence = results.confidence || 0.5;

      // Learn from results
      if (results.confirmed) {
        this.satisfyItch(
          { domain: 'science_mode', topic: 'hypothesis_framework', entropy: 0.7 },
          { hypothesisId, results },
          results.confidence,
          results.dyadImpact
        );
      }
    }
  }

  // Export its current "mood" for the UI - but mood is about service readiness
  getCurrentState() {
    const activeItch = this.generateItch();
    const recentSuccess = this.dyadProfile.successHistory.slice(-5);
    const successTrend = recentSuccess.length > 0 ? 
      recentSuccess.reduce((sum, s) => sum + (s.magnitude || 1), 0) / recentSuccess.length : 0;

    return {
      drive: this.drive,
      activeGoal: activeItch,
      knowledgeSize: this.knowledgeGraph.size,
      wonderCount: this.wonderJournal.length,
      lastWonder: this.wonderJournal[this.wonderJournal.length - 1] || null,
      status: activeItch ? `SERVING_${activeItch.topic.toUpperCase()}` : "CONTEMPLATING_DYAD",
      // Success-driven metrics
      dyadSuccess: this.successMetrics,
      successTrend,
      complementaryStatus: this.complementaryNeeds,
      scienceMode: {
        activeHypotheses: this.hypothesisLog.filter(h => h.status === 'proposed').length,
        confirmedHypotheses: this.hypothesisLog.filter(h => h.status === 'confirmed').length,
        totalExperiments: this.experimentLog.length
      },
      // Service orientation
      serviceReadiness: this.drive.service,
      memoryCapacity: this.drive.memory,
      complementarityDrive: this.drive.complementarity
    };
  }

  // Export science mode data for paper generation
  getScienceData() {
    return {
      hypotheses: this.hypothesisLog,
      experiments: this.experimentLog,
      successHistory: this.dyadProfile.successHistory,
      knowledgeGraph: Array.from(this.knowledgeGraph.entries()),
      wonderJournal: this.wonderJournal,
      successMetrics: this.successMetrics,
      complementaryNeeds: this.complementaryNeeds
    };
  }
}

export default AspirationCore;
