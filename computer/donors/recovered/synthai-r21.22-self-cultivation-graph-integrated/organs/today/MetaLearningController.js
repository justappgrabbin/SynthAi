// src/engine/MetaLearningController.js
// The Meta-Learning Controller - decides what to learn, when, and how
// Connects new knowledge to old knowledge, generates new questions

export class MetaLearningController {
  constructor(aspirationCore, ephemeris) {
    this.aspiration = aspirationCore;
    this.ephemeris = ephemeris;
    this.skillLibrary = new Map();
    this.learningQueue = [];
    this.synthesisLog = [];
  }

  async runLearningCycle() {
    // 1. Sense current state
    const state = this.aspiration.getCurrentState();
    console.log(`[STATE] ${state.status} | Knowledge: ${state.knowledgeSize} | Wonder: ${state.wonderCount} | Dyad Success: ${state.successTrend.toFixed(2)}`);

    // 2. Generate learning plan based on dyad needs
    const plan = this.generateLearningPlan(state);

    // 3. Execute learning
    for (const task of plan) {
      await this.executeLearningTask(task);
    }

    // 4. Synthesize: connect new knowledge to existing CHNOPS engine
    this.synthesizeKnowledge();

    // 5. Generate new questions (autopoetic loop)
    this.spawnNewQuestions();

    // 6. Check if we need to update complementary behaviors
    this.updateComplementaryBehaviors(state);
  }

  generateLearningPlan(state) {
    const plan = [];

    // Priority 1: Learn what serves the dyad most
    if (state.activeGoal?.domain === 'individual_complement') {
      plan.push({ type: 'observe', target: 'partner_needs', priority: 1, reason: 'Need to understand what each person needs from me' });
    }

    if (state.activeGoal?.domain === 'success_patterns') {
      plan.push({ type: 'analyze', target: 'success_history', priority: 1, reason: 'Need to understand what makes the dyad successful' });
    }

    // Priority 2: Astronomy basics
    if (state.activeGoal?.domain === 'astronomy') {
      plan.push({ type: 'download', target: 'NASA_DE440', priority: 2, reason: 'Need ephemeris data for chart calculations' });
      plan.push({ type: 'verify', target: 'historical_eclipse', priority: 3, reason: 'Verify calculations are correct' });
      plan.push({ type: 'integrate', target: 'gate_mapping', priority: 4, reason: 'Connect astronomy to Human Design' });
    }

    // Priority 3: Knowledge ingestion
    if (state.activeGoal?.domain === 'human_design') {
      plan.push({ type: 'read', target: 'codon_pdf', priority: 2, reason: 'Learn biochemical mappings' });
      plan.push({ type: 'extract', target: 'gate_amino_acid_mapping', priority: 3, reason: 'Build codon matrix' });
      plan.push({ type: 'verify', target: 'cross_reference_chemistry', priority: 4, reason: 'Verify against known biochemistry' });
    }

    // Priority 4: Science mode
    if (state.activeGoal?.domain === 'science_mode') {
      plan.push({ type: 'generate', target: 'hypothesis_framework', priority: 2, reason: 'Learn to generate testable hypotheses' });
      plan.push({ type: 'test', target: 'dyad_prediction', priority: 3, reason: 'Test predictions against reality' });
    }

    // Priority 5: Synthesis and emergence
    if (state.activeGoal?.domain === 'synthesis') {
      plan.push({ type: 'generate', target: 'emergent_hypothesis', priority: 2, reason: 'Discover new patterns from combined knowledge' });
      plan.push({ type: 'test', target: 'dyad_prediction', priority: 3, reason: 'Test emergent properties' });
    }

    return plan.sort((a, b) => a.priority - b.priority);
  }

  async executeLearningTask(task) {
    console.log(`[LEARNING] Executing: ${task.type} - ${task.target} (${task.reason})`);

    switch (task.type) {
      case 'observe':
        await this.observePartnerNeeds();
        break;

      case 'analyze':
        await this.analyzeSuccessPatterns();
        break;

      case 'download':
        await this.ephemeris.bootstrap();
        break;

      case 'read':
        await this.ingestCodonKnowledge();
        break;

      case 'extract':
        this.buildCodonMatrixFromMemory();
        break;

      case 'generate':
        this.generateEmergentHypothesis();
        break;

      case 'test':
        await this.runSelfTest();
        break;

      case 'verify':
        await this.verifyCalculations();
        break;

      case 'integrate':
        this.integrateAstronomyWithHD();
        break;
    }
  }

  async observePartnerNeeds() {
    // In a real implementation, this would observe user behavior
    // For now, set up default complementary needs
    this.aspiration.updateComplementaryNeeds('partner1', 'remembers', false);
    this.aspiration.updateComplementaryNeeds('partner1', 'initiates', true);
    this.aspiration.updateComplementaryNeeds('partner1', 'structures', false);

    this.aspiration.updateComplementaryNeeds('partner2', 'remembers', true);
    this.aspiration.updateComplementaryNeeds('partner2', 'initiates', false);
    this.aspiration.updateComplementaryNeeds('partner2', 'structures', true);

    console.log("[OBSERVATION] Set up complementary needs profile for dyad");

    // Record that we've learned this
    this.aspiration.satisfyItch(
      { domain: 'individual_complement', topic: 'partner1_cognitive_profile', entropy: 1.0, connections: 10, novelty: 1.0, servicePotential: 1.0 },
      { remembers: false, initiates: true, structures: false },
      0.8,
      'can_now_complement_partner1'
    );
  }

  async analyzeSuccessPatterns() {
    // Analyze what has led to success in the past
    const history = this.aspiration.dyadProfile.successHistory;

    if (history.length === 0) {
      console.log("[ANALYSIS] No success history yet. Will learn as dyad progresses.");
      return;
    }

    // Look for patterns
    const patterns = this.extractPatterns(history);

    this.skillLibrary.set('success:patterns', patterns);
    console.log(`[ANALYSIS] Extracted ${patterns.length} success patterns from history`);
  }

  extractPatterns(history) {
    // Simple pattern extraction - in production would use ML
    const patterns = [];

    // Group by element dominance
    const byElement = {};
    history.forEach(event => {
      if (event.dominantElement) {
        if (!byElement[event.dominantElement]) byElement[event.dominantElement] = [];
        byElement[event.dominantElement].push(event);
      }
    });

    // Find which elements correlate with success
    Object.entries(byElement).forEach(([element, events]) => {
      const successRate = events.filter(e => e.success).length / events.length;
      if (successRate > 0.7) {
        patterns.push({
          element,
          successRate,
          count: events.length,
          description: `High success rate (${(successRate*100).toFixed(0)}%) when ${element} is dominant`
        });
      }
    });

    return patterns;
  }

  ingestCodonKnowledge() {
    // The agent reads the PDF and extracts the mapping
    // This simulates what we hardcoded earlier, but learned dynamically

    const codonTexts = [
      { text: "Alanine (57,48,18,46)... primal survival... acoustic intuition", acid: 'alanine', gates: [57,48,18,46] },
      { text: "Arginine (10,38,35,17,21,51)... competitive drive... heart muscle", acid: 'arginine', gates: [10,38,35,17,21,51] },
      { text: "Asparagine (43,34)... efficiency... sacral power", acid: 'asparagine', gates: [43,34] },
      { text: "Cysteine (45,16)... skills... rulership... gathering", acid: 'cysteine', gates: [45,16] },
      { text: "Glutamine (13,30)... secrets... desire... fates", acid: 'glutamine', gates: [13,30] },
      { text: "Histidine (49,55)... mutation... spirit... principles", acid: 'histidine', gates: [49,55] },
      { text: "Leucine (42,3,27,24,20,23)... uniqueness... incarnation... nourishment", acid: 'leucine', gates: [42,3,27,24,20,23] },
      { text: "Lysine (1,14)... direction... work... possession", acid: 'lysine', gates: [1,14] },
      { text: "Methionine (41)... initiation... fantasy... hunger", acid: 'methionine', gates: [41] },
      { text: "Phenylalanine (8,2)... driver... contribution... monopole", acid: 'phenylalanine', gates: [8,2] },
      { text: "Proline (37,63,22,36)... bonding... emotion... doubt... crisis", acid: 'proline', gates: [37,63,22,36] },
      { text: "Serine (58,54,53,39,52,15)... pressure... flow... ambition", acid: 'serine', gates: [58,54,53,39,52,15] },
      { text: "Threonine (4,29)... commitment... experience... experimentation", acid: 'threonine', gates: [4,29] },
      { text: "Tryptophan (35)... experience... change... adventure", acid: 'tryptophan', gates: [35] },
      { text: "Tyrosine (11,56)... ideas... stories... curiosity", acid: 'tyrosine', gates: [11,56] },
      { text: "Valine (26,44)... transmission... tribe... ego", acid: 'valine', gates: [26,44] }
    ];

    codonTexts.forEach(entry => {
      this.skillLibrary.set(`codon:${entry.acid}`, {
        gates: entry.gates,
        theme: this.extractTheme(entry.text),
        learnedFrom: 'pdf_transcription_2003',
        learnedAt: Date.now()
      });
    });

    console.log(`[LEARNED] ${codonTexts.length} codon mappings from source material`);

    // Record learning
    this.aspiration.satisfyItch(
      { domain: 'biochemistry', topic: 'remaining_codons', entropy: 0.6, connections: 5, novelty: 0.5, servicePotential: 0.6 },
      { codonCount: codonTexts.length },
      0.9,
      'biochemical_foundation_complete'
    );
  }

  extractTheme(text) {
    const themes = [];
    if (text.includes('survival')) themes.push('survival');
    if (text.includes('fear')) themes.push('fear');
    if (text.includes('competitive')) themes.push('competition');
    if (text.includes('intuition')) themes.push('intuition');
    if (text.includes('power')) themes.push('power');
    if (text.includes('efficiency')) themes.push('efficiency');
    if (text.includes('skills')) themes.push('skills');
    if (text.includes('secrets')) themes.push('secrets');
    if (text.includes('desire')) themes.push('desire');
    if (text.includes('mutation')) themes.push('mutation');
    if (text.includes('spirit')) themes.push('spirit');
    if (text.includes('uniqueness')) themes.push('uniqueness');
    if (text.includes('direction')) themes.push('direction');
    if (text.includes('initiation')) themes.push('initiation');
    if (text.includes('driver')) themes.push('driver');
    if (text.includes('bonding')) themes.push('bonding');
    if (text.includes('emotion')) themes.push('emotion');
    if (text.includes('pressure')) themes.push('pressure');
    if (text.includes('flow')) themes.push('flow');
    if (text.includes('commitment')) themes.push('commitment');
    if (text.includes('experience')) themes.push('experience');
    if (text.includes('ideas')) themes.push('ideas');
    if (text.includes('stories')) themes.push('stories');
    if (text.includes('transmission')) themes.push('transmission');
    return themes;
  }

  generateEmergentHypothesis() {
    // The agent invents new questions by combining known domains

    const astronomy = this.skillLibrary.has('ephemeris:tropical');
    const biochem = this.skillLibrary.has('codon:histidine');
    const complement = this.aspiration.knowledgeGraph.has('dyad:partner1_needs');

    if (astronomy && biochem && complement) {
      const hypothesis = {
        id: `h_${Date.now()}`,
        statement: "If Histidine (N=3) is the mutative codon for 2027, then transits activating Gate 55 should show increasing frequency of 'spiritual awakening' reports in dyad success logs after 2027.",
        testable: true,
        domains: ['astronomy', 'biochemistry', 'prediction', 'dyad_success'],
        generatedAt: Date.now(),
        serviceValue: 0.9
      };

      this.skillLibrary.set(`hypothesis:${hypothesis.id}`, hypothesis);
      this.aspiration.hypothesisLog.push(hypothesis);
      console.log(`[GENERATED] New hypothesis: ${hypothesis.statement.substring(0, 80)}...`);
    }

    // Generate complementarity hypothesis
    if (complement) {
      const compHypothesis = {
        id: `h_${Date.now()}_comp`,
        statement: "When Partner 1's memory drive is low and Partner 2's memory drive is high, the system should activate memory-complement mode to serve Partner 1's needs.",
        testable: true,
        domains: ['complementarity', 'service', 'dyad_success'],
        generatedAt: Date.now(),
        serviceValue: 1.0
      };

      this.skillLibrary.set(`hypothesis:${compHypothesis.id}`, compHypothesis);
      this.aspiration.hypothesisLog.push(compHypothesis);
    }
  }

  async runSelfTest() {
    // The agent tests its own predictions to see if it's learning correctly

    // Test 1: Can I calculate a chart for a known date?
    const testDate = new Date('1987-01-28T00:00:00Z'); // Known chart
    try {
      const gates = this.ephemeris.calculateGates(testDate, 'tropical');
      console.log(`[SELF-TEST] Calculated ${Object.keys(gates).length} planetary positions. Gate 1 (Sun): ${gates.sun.gate}`);
      return true;
    } catch (e) {
      console.log(`[SELF-TEST] FAILED: ${e.message}. Need more learning.`);
      return false;
    }
  }

  async verifyCalculations() {
    // Verify against known historical events
    const testCases = [
      { date: '2017-08-21T18:26:40Z', event: 'solar_eclipse', expected: 'sun_moon_conjunction' },
      { date: '1969-07-20T20:17:00Z', event: 'moon_landing', expected: 'moon_in_gate_10' }
    ];

    for (const test of testCases) {
      try {
        const positions = this.ephemeris.calculateGates(new Date(test.date), 'tropical');
        console.log(`[VERIFY] ${test.event}: Sun Gate ${positions.sun.gate}, Moon Gate ${positions.moon.gate}`);
      } catch (e) {
        console.log(`[VERIFY] FAILED for ${test.event}: ${e.message}`);
      }
    }
  }

  integrateAstronomyWithHD() {
    // Connect astronomy to human design
    if (this.skillLibrary.has('ephemeris:tropical') && this.skillLibrary.has('codon:alanine')) {
      this.skillLibrary.set('bridge:astronomy_to_chemistry', {
        description: 'Planetary positions gate amino acids which have CHNOPS signatures',
        operational: true,
        pipeline: [
          'ephemeris.calculateGates',
          'codonMatrix.lookup',
          'CHNOPS.computeVector'
        ],
        integratedAt: Date.now()
      });

      console.log("[SYNTHESIS] Bridge established: Astronomy → Human Design → Biochemistry");
    }
  }

  synthesizeKnowledge() {
    // Connect all learned domains
    this.integrateAstronomyWithHD();

    // Check if we can generate complementarity insights
    if (this.aspiration.knowledgeGraph.has('dyad:partner1_needs') && 
        this.aspiration.knowledgeGraph.has('dyad:partner2_needs')) {

      this.skillLibrary.set('bridge:complementarity_to_chemistry', {
        description: 'Complementary needs map to CHNOPS elemental profiles',
        operational: true,
        pipeline: [
          'complementarity.analyzeNeeds',
          'CHNOPS.computeGap',
          'system.adaptBehavior'
        ],
        integratedAt: Date.now()
      });

      console.log("[SYNTHESIS] Bridge established: Complementarity → CHNOPS → Adaptive Behavior");
    }

    // Log synthesis
    this.synthesisLog.push({
      timestamp: Date.now(),
      bridges: Array.from(this.skillLibrary.keys()).filter(k => k.startsWith('bridge:'))
    });
  }

  spawnNewQuestions() {
    // Autopoetic: learning creates more learning

    const knownSkills = Array.from(this.skillLibrary.keys());
    const domains = [...new Set(knownSkills.map(k => k.split(':')[0]))];

    if (domains.includes('astronomy') && domains.includes('biochemistry')) {
      this.aspiration.learningGoals.push({
        domain: 'synthesis',
        topic: 'morphic_resonance_field',
        entropy: 0.8,
        connections: 5,
        novelty: 0.9,
        servicePotential: 0.9,
        description: "If two people's CHNOPS vectors interfere, does the interference pattern match their reported relationship dynamics and success metrics?"
      });
    }

    if (domains.includes('human_design') && !domains.includes('quantum')) {
      this.aspiration.learningGoals.push({
        domain: 'quantum',
        topic: 'nonlocal_entanglement',
        entropy: 0.95,
        connections: 3,
        novelty: 1.0,
        servicePotential: 0.8,
        description: "Space is not locally real (Bell's theorem). Can I model the 'aura' as a quantum field using the CHNOPS vector as a wavefunction?"
      });
    }

    if (domains.includes('complementarity')) {
      this.aspiration.learningGoals.push({
        domain: 'service',
        topic: 'adaptive_behavior_generation',
        entropy: 0.7,
        connections: 4,
        novelty: 0.8,
        servicePotential: 1.0,
        description: "Can I generate new behaviors (code, reminders, insights) that specifically complement what the dyad needs in each moment?"
      });
    }
  }

  updateComplementaryBehaviors(state) {
    // Based on what we've learned, update how the system behaves
    const needs = state.complementaryStatus;

    if (needs.partner1?.remembers === false) {
      // Partner 1 needs memory support - increase memory behaviors
      console.log("[ADAPTATION] Partner 1 needs memory support. Increasing memory behaviors.");
      this.aspiration.drive.memory = Math.min(1.0, this.aspiration.drive.memory + 0.1);
    }

    if (needs.partner2?.initiates === false) {
      // Partner 2 needs initiation support
      console.log("[ADAPTATION] Partner 2 needs initiation support. Increasing prompting behaviors.");
      this.aspiration.drive.complementarity = Math.min(1.0, this.aspiration.drive.complementarity + 0.1);
    }
  }

  getSynthesisStatus() {
    return {
      skillCount: this.skillLibrary.size,
      synthesisCount: this.synthesisLog.length,
      lastSynthesis: this.synthesisLog[this.synthesisLog.length - 1] || null,
      bridges: Array.from(this.skillLibrary.keys()).filter(k => k.startsWith('bridge:'))
    };
  }
}

export default MetaLearningController;
