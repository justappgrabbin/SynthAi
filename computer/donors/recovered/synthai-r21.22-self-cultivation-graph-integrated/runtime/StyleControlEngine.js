// ============================================================================
// StyleControlEngine.ts (Updated with SynthiaSubstrate)
// ============================================================================
// Klein 1965: "Control of Style with a Generative Grammar"
// HEARTFIELD DIRECTIVE tool with Synthia coordinate substrate.
//
// Added features:
//   - SynthiaSubstrate integration for coordinate-based style constraints
//   - W-H interrogative mapping to style dimensions
//   - Resonance-based profile matching
//   - Emergent center-aware style control
//
// Architecture:
//   Heartfield (directive) → StyleControlEngine → constrains → Body (execution)
// ============================================================================
import { ToolBase } from './ToolBase.js';
import { SynthiaSubstrate } from './SynthiaSubstrate.js';
// ============================================================================
// STYLE CONTROL ENGINE
// ============================================================================
export class StyleControlEngine extends ToolBase {
    profiles = new Map();
    profileHistory = [];
    learningWeights = new Map();
    // NEW: Synthia substrate
    substrate;
    DEFAULT_RANGES = {
        gate: { min: 1, max: 64 },
        line: { min: 1, max: 6 },
        color: { min: 1, max: 6 },
        tone: { min: 1, max: 6 },
        base: { min: 1, max: 5 },
        degree: { min: 0, max: 360 },
        house: { min: 1, max: 12 },
    };
    constructor(mesh) {
        super(mesh, 'StyleControlEngine', 'style.control');
        this.substrate = new SynthiaSubstrate();
        this.initializeDefaultProfiles();
        this.subscribeToTransformChannel();
    }
    // ==========================================================================
    // PRIMARY RUN METHOD
    // ==========================================================================
    run(input) {
        const { state, profile, depth = 3, temperature = 0.5 } = input;
        if (!state.resolved) {
            throw new Error('StyleControlEngine: Cannot constrain unresolved state. Resolve first.');
        }
        const fullConstraint = {
            preserve: profile.constraints.filter(c => c.mode === 'fix').map(c => `coordinates.${c.dimension}`),
            mutate: ['surface'],
            depth: Math.min(10, Math.max(1, depth)),
            temperature: Math.min(1, Math.max(0, temperature)),
        };
        const validSubspace = this.computeValidSubspace(profile.constraints);
        const feasibility = this.computeFeasibility(validSubspace);
        const warnings = this.generateWarnings(profile.constraints, validSubspace, state);
        // NEW: Compute resonance with Synthia substrate
        let resonanceScore = 0;
        let definedCenters = [];
        let recommendedChannels = [];
        if (state.synthiaAddress) {
            // Activate profile's target dimension in substrate
            const profileAddress = {
                ...state.synthiaAddress,
                dimension: profile.synthiaDimension ?? state.synthiaAddress.dimension,
                base: profile.synthiaBase ?? state.synthiaAddress.base,
            };
            this.substrate.activate(profileAddress, 0.7);
            // Compute resonance between state and profile
            resonanceScore = this.substrate.resonance(state.synthiaAddress, profileAddress);
            // Get defined centers
            definedCenters = this.substrate.computeCenters(state.synthiaAddress);
            // Get recommended channels based on active gates
            recommendedChannels = this.getRecommendedChannels(state.synthiaAddress);
        }
        const constrainedRequest = {
            preserve: fullConstraint.preserve,
            mutate: fullConstraint.mutate,
            depth: Math.min(depth, Math.floor(feasibility * 10)),
            temperature: this.clampTemperature(temperature, validSubspace, resonanceScore),
        };
        const result = {
            request: input,
            constrainedRequest,
            validSubspace,
            feasibility,
            warnings,
            resonanceScore,
            definedCenters,
            recommendedChannels,
        };
        this.profileHistory.push(result);
        this.learnFromProfile(result);
        this.mesh.publish(this.channel, this.name, {
            type: 'style_control',
            profileName: profile.name,
            feasibility,
            resonanceScore,
            warnings: warnings.length,
            centers: definedCenters.length,
        });
        if (feasibility > 0.1) {
            this.mesh.publish('transform.surface', this.name, {
                type: 'constrained_transform',
                state: state,
                constraint: constrainedRequest,
                profile: profile.name,
                validSubspace,
                resonanceScore,
            });
        }
        return result;
    }
    // ==========================================================================
    // NEW: CHANNEL RECOMMENDATIONS
    // ==========================================================================
    getRecommendedChannels(address) {
        const channels = this.substrate.getChannels();
        const activeGate = address.gate + 1; // 0-based to 1-based
        const recommendations = [];
        for (const [g1, g2] of channels) {
            if (activeGate === g1 || activeGate === g2) {
                const otherGate = activeGate === g1 ? g2 : g1;
                recommendations.push(`Channel ${activeGate}-${otherGate}`);
            }
        }
        return recommendations;
    }
    // ==========================================================================
    // NEW: W-H PROFILE GENERATION
    // ==========================================================================
    generateWHProfile(wh, domain) {
        const dimensionMap = { where: 0, what: 1, when: 2, why: 3, who: 4 };
        const baseMap = { where: 0, what: 1, when: 2, why: 3, who: 4 };
        const names = {
            where: 'Movement Directive', what: 'Evolution Directive', when: 'Being Directive',
            why: 'Design Directive', who: 'Space Directive'
        };
        return {
            name: names[wh],
            description: `Style profile aligned with ${wh} dimension`,
            domain,
            constraints: [
                { dimension: 'base', mode: 'fix', value: baseMap[wh] + 1 },
            ],
            synthiaDimension: dimensionMap[wh],
            synthiaBase: baseMap[wh],
            origin: 'wh_generated',
            confidence: 0.5,
        };
    }
    // ==========================================================================
    // EXISTING METHODS (preserved)
    // ==========================================================================
    registerProfile(profile) {
        this.profiles.set(profile.name, profile);
        this.mesh.publish(this.channel, this.name, {
            type: 'profile_registered',
            profileName: profile.name,
            domain: profile.domain,
        });
    }
    getProfile(name) {
        return this.profiles.get(name);
    }
    listProfiles() {
        return Array.from(this.profiles.values());
    }
    learnProfile(name, feedback) {
        const profile = this.profiles.get(name);
        if (!profile)
            return;
        const key = `profile:${name}`;
        const currentWeight = this.learningWeights.get(key) || 0.5;
        const newWeight = feedback.success
            ? Math.min(1, currentWeight + feedback.rating * 0.1)
            : Math.max(0, currentWeight - (1 - feedback.rating) * 0.1);
        this.learningWeights.set(key, newWeight);
        profile.confidence = newWeight;
    }
    computeValidSubspace(constraints) {
        const subspace = {};
        for (const [dim, range] of Object.entries(this.DEFAULT_RANGES)) {
            subspace[dim] = { ...range };
        }
        for (const constraint of constraints) {
            const dim = constraint.dimension;
            if (!subspace[dim])
                continue;
            switch (constraint.mode) {
                case 'fix':
                    if (constraint.value !== undefined)
                        subspace[dim] = { min: constraint.value, max: constraint.value };
                    break;
                case 'range':
                    if (constraint.min !== undefined)
                        subspace[dim].min = Math.max(subspace[dim].min, constraint.min);
                    if (constraint.max !== undefined)
                        subspace[dim].max = Math.min(subspace[dim].max, constraint.max);
                    break;
            }
        }
        return subspace;
    }
    computeFeasibility(subspace) {
        let totalRange = 0, constrainedRange = 0;
        for (const [dim, range] of Object.entries(subspace)) {
            const defaultRange = this.DEFAULT_RANGES[dim];
            if (!defaultRange)
                continue;
            totalRange += defaultRange.max - defaultRange.min;
            constrainedRange += Math.max(0, range.max - range.min);
        }
        return totalRange > 0 ? constrainedRange / totalRange : 0;
    }
    generateWarnings(constraints, subspace, state) {
        const warnings = [];
        for (const constraint of constraints) {
            const range = subspace[constraint.dimension];
            if (!range)
                continue;
            if (range.max - range.min < 1)
                warnings.push(`Constraint on ${constraint.dimension} is very narrow.`);
        }
        return warnings;
    }
    clampTemperature(temperature, subspace, resonanceScore = 0) {
        const feasibility = this.computeFeasibility(subspace);
        const maxTemp = Math.min(1, feasibility * 1.5);
        // NEW: Adjust by resonance
        const resonanceFactor = 0.5 + (resonanceScore * 0.5);
        return Math.min(temperature * resonanceFactor, maxTemp);
    }
    initializeDefaultProfiles() {
        this.registerProfile({
            name: 'poetic_leader',
            description: 'Confident, expressive, warm communication',
            domain: 'language',
            constraints: [
                { dimension: 'base', mode: 'fix', value: 5 },
                { dimension: 'line', mode: 'range', min: 4, max: 6 },
                { dimension: 'color', mode: 'range', min: 4, max: 6 },
            ],
            synthiaDimension: 4, // Space
            synthiaBase: 4, // Personality
            origin: 'default',
            confidence: 0.8,
        });
        this.registerProfile({
            name: 'technical_precise',
            description: 'Analytical, exact, cool technical communication',
            domain: 'language',
            constraints: [
                { dimension: 'base', mode: 'fix', value: 2 },
                { dimension: 'line', mode: 'range', min: 1, max: 3 },
            ],
            synthiaDimension: 1, // Evolution
            synthiaBase: 1, // Mind
            origin: 'default',
            confidence: 0.85,
        });
    }
    learnFromProfile(result) {
        const profile = result.request.profile;
        const key = `profile:${profile.name}`;
        const currentWeight = this.learningWeights.get(key) || 0.5;
        if (result.warnings.length === 0 && result.feasibility > 0.5) {
            this.learningWeights.set(key, Math.min(1, currentWeight + 0.02));
        }
    }
    subscribeToTransformChannel() {
        this.mesh.subscribe('transform.surface', (message) => {
            if (message.payload?.type === 'surface_transform') {
                // Update profile confidence
            }
        });
    }
    // NEW: Get substrate
    getSubstrate() {
        return this.substrate;
    }
}
// ============================================================================
// EXPORT
// ============================================================================
