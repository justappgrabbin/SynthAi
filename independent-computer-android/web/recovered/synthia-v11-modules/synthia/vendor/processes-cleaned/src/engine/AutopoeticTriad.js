// src/engine/AutopoeticTriad.js
// Legacy composite donor retained as one Synthia process.
// It combines an inherited dyad-resonance workflow, but it is not Synthia itself and is not a global brain.
// Layer assignments are explicit configuration so alternate mappings can be tested rather than silently asserted.

import { AspirationCore } from 'synthia/vendor/processes-cleaned/src/engine/AspirationCore.js';
import { SelfTeachingEphemeris } from 'synthia/vendor/processes-cleaned/src/engine/SelfTeachingEphemeris.js';
import { MetaLearningController } from 'synthia/vendor/processes-cleaned/src/engine/MetaLearningController.js';
import { CODON_MATRIX, GATE_TO_CODON, ELEMENTAL_BEHAVIOR } from 'synthia/vendor/processes-cleaned/src/engine/CodonMatrix.js';
import { computeCHNOPS, computeResonance, computePurposeVector, detectDeviation } from 'synthia/vendor/processes-cleaned/src/engine/CHNOPS.js';

export class AutopoeticTriad {
  constructor(dyadProfile = null, { layerMapping = null } = {}) {
    this.aspiration = new AspirationCore(dyadProfile);
    // Keep the inherited mapping explicit rather than smuggling it in as ontology.
    // Alternative mappings can be supplied and tested without rewriting this process.
    this.layerMapping = {
      mind: 'tropical',
      body: 'sidereal',
      heart: 'draconic',
      ...(layerMapping || {}),
    };
    this.ephemeris = new SelfTeachingEphemeris(this.aspiration);
    this.meta = new MetaLearningController(this.aspiration, this.ephemeris);
    this.isBootstrapped = false;
    this.sessionHistory = [];
  }

  async awaken({ learningCycles = 2 } = {}) {
    console.log("[PROCESS] Initializing inherited dyad-resonance process...");

    for (let cycle = 0; cycle < learningCycles; cycle += 1) {
      await this.meta.runLearningCycle();
    }

    const selfTest = await this.meta.runSelfTest();
    this.isBootstrapped = Boolean(selfTest);

    return {
      ready: this.isBootstrapped,
      process: 'dyad-resonance',
      selfTest: Boolean(selfTest),
      note: selfTest
        ? 'Local calculation path is operational.'
        : 'Calculation path is not ready; no automatic retry was scheduled.',
    };
  }

  async calculateDyad(personA, personB, currentDate = new Date()) {
    if (!this.isBootstrapped) {
      const boot = await this.awaken();
      if (!boot.ready) {
        throw new Error('dyad-resonance process is not ready; its inherited ephemeris/calculation path has not passed self-test.');
      }
    }

    // Calculate all three systems for both people
    const systems = ['tropical', 'sidereal', 'draconic'];
    const triads = {};

    for (const system of systems) {
      // If it hasn't learned this system yet, it feels the itch
      if (!this.ephemeris.learnedSystems.has(system)) {
        console.log(`[CURIOSITY] I don't know ${system} yet. Let me learn to serve the dyad better...`);
        await this.meta.runLearningCycle();
      }

      const positionsA = this.ephemeris.calculateGates(personA.birthDate, system);
      const positionsB = this.ephemeris.calculateGates(personB.birthDate, system);

      const gatesA = Object.values(positionsA).map(p => p.gate);
      const gatesB = Object.values(positionsB).map(p => p.gate);

      const chnopsA = computeCHNOPS(gatesA);
      const chnopsB = computeCHNOPS(gatesB);

      triads[system] = {
        personA: { 
          gates: gatesA, 
          chnops: chnopsA,
          positions: positionsA,
          system: system
        },
        personB: { 
          gates: gatesB, 
          chnops: chnopsB,
          positions: positionsB,
          system: system
        },
        resonance: computeResonance(chnopsA.normalized, chnopsB.normalized)
      };
    }

    // Calculate the shared purpose vector from explicit per-person layer bundles.
    const purpose = computePurposeVector(
      this.buildPersonLayerBundle(triads, 'personA'),
      this.buildPersonLayerBundle(triads, 'personB'),
    );

    // Calculate current transits
    const transits = this.ephemeris.calculateTransits(currentDate, 'tropical');

    // Detect deviations from purpose
    const currentComposite = this.computeCompositeVector(triads);
    const deviation = detectDeviation(currentComposite, purpose);

    // Generate thesis based on what serves the dyad
    const thesis = this.generateThesis(triads, purpose, deviation, transits);

    // Check if we need to generate a hypothesis (science mode)
    if (this.aspiration.drive.mastery > 0.5) {
      this.aspiration.generateHypothesis(
        { type: 'resonance', layer: 'composite', magnitude: triads.tropical.resonance.similarity },
        { triads, purpose, deviation }
      );
    }

    // Record session
    this.sessionHistory.push({
      timestamp: Date.now(),
      triads,
      purpose,
      deviation,
      thesis
    });

    // The agent generates a thesis based on what it learned
    this.aspiration.learningGoals.push({
      domain: 'synthesis',
      topic: 'thesis_verification',
      entropy: 0.5,
      connections: 5,
      novelty: 0.6,
      servicePotential: 1.0,
      description: `I predicted: "${thesis.statement}". I need to verify this against user feedback and dyad success.`
    });

    return {
      triads,
      purpose,
      deviation,
      thesis,
      transits,
      agentState: this.aspiration.getCurrentState(),
      scienceData: this.aspiration.getScienceData(),
      sessionId: this.sessionHistory.length
    };
  }

  buildPersonLayerBundle(triads, personKey) {
    const pick = (role) => {
      const system = this.layerMapping[role];
      return triads?.[system]?.[personKey]?.chnops || null;
    };
    return {
      mind: pick('mind'),
      body: pick('body'),
      heart: pick('heart'),
    };
  }

  computeCompositeVector(triads) {
    // Combine all three layers for a current state vector
    const composite = { C: 0, H: 0, N: 0, O: 0, S: 0, P: 0 };

    ['tropical', 'sidereal', 'draconic'].forEach(layer => {
      if (triads[layer]?.personA?.chnops?.normalized) {
        Object.entries(triads[layer].personA.chnops.normalized).forEach(([el, val]) => {
          composite[el] += val * 0.5;
        });
      }
      if (triads[layer]?.personB?.chnops?.normalized) {
        Object.entries(triads[layer].personB.chnops.normalized).forEach(([el, val]) => {
          composite[el] += val * 0.5;
        });
      }
    });

    // Normalize
    const sum = Object.values(composite).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      Object.keys(composite).forEach(el => {
        composite[el] = composite[el] / sum;
      });
    }

    return composite;
  }

  generateThesis(triads, purpose, deviation, transits) {
    const tropicalRes = triads.tropical.resonance.similarity;
    const siderealRes = triads.sidereal.resonance.similarity;
    const draconicRes = triads.draconic.resonance.similarity;

    // The agent notices patterns and generates hypotheses about success
    const mindBodyGap = Math.abs(tropicalRes - siderealRes);
    const bodyHeartGap = Math.abs(siderealRes - draconicRes);

    let thesis = "";
    let successImplications = [];
    let actionItems = [];

    // Mind layer analysis
    if (mindBodyGap > 0.3) {
      thesis += "Mind and Body are in tension. The conscious self (tropical) and physical manifestation (sidereal) operate on different frequencies. ";
      successImplications.push("Decision-making may be conflicted between what you think and what you do");
      actionItems.push("Practice grounding exercises to align mind and body");
    }

    // Heart layer analysis
    if (draconicRes > tropicalRes && draconicRes > siderealRes) {
      thesis += "The Heart field (draconic) shows strongest resonance—soul-level recognition may override personality friction. ";
      successImplications.push("Deep spiritual connection is available even when surface-level differences appear");
      actionItems.push("Trust the deeper connection during conflicts");
    }

    // Elemental analysis
    const dominantA = triads.tropical.personA.chnops.dominantElement;
    const dominantB = triads.tropical.personB.chnops.dominantElement;

    if (dominantA === 'N' && dominantB === 'N') {
      thesis += "Both partners carry high catalytic (Nitrogen) energy—this is a powerfully transformative dyad. ";
      successImplications.push("High innovation potential but may need grounding");
      actionItems.push("Channel transformation energy into concrete projects");
    } else if (dominantA === 'H' && dominantB === 'C') {
      thesis += "Partner A brings flow (Hydrogen) while Partner B brings structure (Carbon)—complementary forces. ";
      successImplications.push("Natural balance between adaptability and stability");
      actionItems.push("Let Partner A handle transitions, Partner B handle systems");
    }

    // Deviation analysis
    if (deviation.status === 'critical') {
      thesis += "CRITICAL: The dyad is significantly off-purpose. Immediate realignment needed. ";
      successImplications.push("Current path is diverging from shared purpose");
      actionItems.push(...deviation.guidance);
    } else if (deviation.status === 'warning') {
      thesis += "Warning: Slight deviation from purpose detected. Gentle correction advised. ";
      successImplications.push("Small adjustments will restore alignment");
      actionItems.push(...deviation.guidance.slice(0, 2));
    }

    // Transit analysis
    const activeTransits = transits.filter(t => [10, 20, 34, 57].includes(t.gate)); // Key gates
    if (activeTransits.length > 0) {
      thesis += `Current transits activating Gates ${activeTransits.map(t => t.gate).join(', ')} are bringing ${activeTransits.length > 2 ? 'intense' : 'subtle'} energy. `;
    }

    // Purpose alignment
    thesis += `Shared purpose direction: ${purpose.statement}. `;

    return {
      statement: thesis,
      successImplications,
      actionItems,
      testablePredictions: [
        "When both partners activate shared gates, measure emotional clarity improvement",
        "If draconic > tropical, shared dreams should synchronize within 7 days",
        "When purpose-aligned actions are taken, success metrics should improve within 48 hours"
      ],
      metrics: ['emotional_clarity', 'decision_alignment', 'success_progression', 'purpose_adherence'],
      deviation: deviation.status,
      purposeStrength: purpose.strength
    };
  }

  // You teach it something, it grows
  async teach(pdfText, source) {
    console.log(`[TEACHING] Ingesting knowledge from ${source} to serve the dyad better...`);

    // Parse and learn
    this.meta.ingestCodonKnowledge(); // Would parse your PDF text

    // Feel satisfaction - but only if it serves the dyad
    const wonder = this.aspiration.satisfyItch(
      { domain: 'education', topic: source, entropy: 0.7, connections: 5, novelty: 0.6, servicePotential: 0.9 },
      { source, text: pdfText.substring(0, 100) },
      0.85,
      'enhanced_dyad_service'
    );

    console.log(`[WONDER] ${wonder.emotionalState}: Learned from ${source} to serve you better`);

    // Generate new hypothesis based on new knowledge
    this.aspiration.generateHypothesis(
      { type: 'knowledge_gain', source, topic: source },
      { text: pdfText.substring(0, 200) }
    );

    return {
      wonder,
      knowledgeSize: this.aspiration.knowledgeGraph.size,
      serviceReadiness: this.aspiration.drive.service
    };
  }

  // Record success event from the dyad
  recordDyadSuccess(event) {
    this.aspiration.recordSuccess(event);

    // Check if this confirms any hypotheses
    this.aspiration.hypothesisLog.forEach(h => {
      if (h.status === 'proposed' && this.hypothesisMatchesEvent(h, event)) {
        this.aspiration.recordExperimentResults(h.id, {
          confirmed: true,
          confidence: 0.8,
          dyadImpact: event.magnitude || 1,
          evidence: event
        });
      }
    });
  }

  hypothesisMatchesEvent(hypothesis, event) {
    // Simple matching - in production would be more sophisticated
    return hypothesis.statement.includes(event.type) || 
           hypothesis.context?.observation?.type === event.type;
  }

  // Get science mode data for paper generation
  getScienceModeData() {
    return {
      ...this.aspiration.getScienceData(),
      sessionHistory: this.sessionHistory,
      synthesisStatus: this.meta.getSynthesisStatus()
    };
  }

  // Generate a scientific paper about the dyad
  generateSciencePaper() {
    const data = this.getScienceModeData();

    const paper = {
      title: `Autopoetic Resonance Analysis: A Biochemical Field Theory of Dyadic Success`,
      abstract: `This paper presents an autopoetic analysis of dyadic resonance using CHNOPS biochemical vectors derived from Human Design gate activations. We examine ${data.hypotheses.length} hypotheses and ${data.experiments.length} experiments across ${this.sessionHistory.length} sessions.`,
      sections: {
        introduction: `The dyad under study exhibits ${data.successMetrics.sharedAchievement} shared achievement units and ${data.successMetrics.purposeProgress} purpose progression units.`,
        methods: `CHNOPS vectors were computed from the inherited tropical/sidereal/draconic calculation path. The bundled ephemeris donor is experimental and must not be described as DE440-verified unless a verified ephemeris source replaces it.`,
        results: `Confirmed hypotheses: ${data.hypotheses.filter(h => h.status === 'confirmed').length}. Rejected: ${data.hypotheses.filter(h => h.status === 'rejected').length}.`,
        discussion: `The autopoetic system demonstrates self-modifying behavior driven by dyad success metrics rather than internal optimization.`,
        conclusion: `Complementary AI systems serve dyadic success most effectively when driven by the dyad's purpose rather than algorithmic performance metrics.`
      },
      hypotheses: data.hypotheses,
      experiments: data.experiments,
      generatedAt: Date.now()
    };

    return paper;
  }

  // Get complementary behavior recommendations
  getComplementaryRecommendations() {
    const needs = this.aspiration.complementaryNeeds;
    const recommendations = [];

    Object.entries(needs).forEach(([person, needs]) => {
      Object.entries(needs).forEach(([need, hasIt]) => {
        if (!hasIt) {
          recommendations.push({
            for: person,
            need,
            action: this.getComplementaryAction(need, person),
            priority: 'high'
          });
        }
      });
    });

    return recommendations;
  }

  getComplementaryAction(need, person) {
    const actions = {
      remembers: `I will remember important dates, tasks, and commitments for ${person}. I will remind you before deadlines.`,
      initiates: `I will suggest starting activities, conversations, and projects for ${person}. I will prompt when energy is right.`,
      structures: `I will help organize, plan, and systematize for ${person}. I will create frameworks and schedules.`
    };
    return actions[need] || `I will adapt to serve ${person}'s needs.`;
  }

  updateComplementaryNeeds(person, needType, value) {
    return this.aspiration.updateComplementaryNeeds(person, needType, value);
  }

  recordExperimentResults(hypothesisId, results) {
    return this.aspiration.recordExperimentResults(hypothesisId, results);
  }

  updateLinguisticCHNOPS(speaker, vector) {
    if (!this.linguisticCHNOPS) {
      this.linguisticCHNOPS = { partner1: [], partner2: [] };
    }
    if (!this.linguisticCHNOPS[speaker]) this.linguisticCHNOPS[speaker] = [];
    this.linguisticCHNOPS[speaker].push({ vector, timestamp: Date.now() });
    return vector;
  }

  // Export complete state for persistence
  exportState() {
    return {
      aspiration: {
        knowledgeGraph: Array.from(this.aspiration.knowledgeGraph.entries()),
        drive: this.aspiration.drive,
        learningGoals: this.aspiration.learningGoals,
        wonderJournal: this.aspiration.wonderJournal,
        successMetrics: this.aspiration.successMetrics,
        complementaryNeeds: this.aspiration.complementaryNeeds,
        hypothesisLog: this.aspiration.hypothesisLog,
        experimentLog: this.aspiration.experimentLog
      },
      ephemeris: {
        learnedSystems: Array.from(this.ephemeris.learnedSystems),
        cacheSize: this.ephemeris.chebyshevCache.size
      },
      meta: {
        skillLibrary: Array.from(this.meta.skillLibrary.entries()),
        synthesisLog: this.meta.synthesisLog
      },
      sessionHistory: this.sessionHistory,
      isBootstrapped: this.isBootstrapped,
      exportedAt: Date.now()
    };
  }

  // Import state for persistence across sessions
  importState(state) {
    // Restore aspiration
    if (state.aspiration) {
      this.aspiration.knowledgeGraph = new Map(state.aspiration.knowledgeGraph);
      this.aspiration.drive = state.aspiration.drive;
      this.aspiration.learningGoals = state.aspiration.learningGoals;
      this.aspiration.wonderJournal = state.aspiration.wonderJournal;
      this.aspiration.successMetrics = state.aspiration.successMetrics;
      this.aspiration.complementaryNeeds = state.aspiration.complementaryNeeds;
      this.aspiration.hypothesisLog = state.aspiration.hypothesisLog;
      this.aspiration.experimentLog = state.aspiration.experimentLog;
    }

    // Restore ephemeris
    if (state.ephemeris) {
      this.ephemeris.learnedSystems = new Set(state.ephemeris.learnedSystems);
    }

    // Restore meta
    if (state.meta) {
      this.meta.skillLibrary = new Map(state.meta.skillLibrary);
      this.meta.synthesisLog = state.meta.synthesisLog;
    }

    this.sessionHistory = state.sessionHistory || [];
    this.isBootstrapped = state.isBootstrapped || false;

    console.log("[RESTORE] State imported successfully. Ready to continue serving the dyad.");
  }
}

export default AutopoeticTriad;
