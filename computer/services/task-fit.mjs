const clone = value => value === undefined ? undefined : structuredClone(value);

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const normalizeList = value => Array.isArray(value) ? value.map(String) : [];
const normalizeAxes = task => (task?.required_axes ?? task?.requiredAxes ?? []).map(item => ({
  axis: normalizeList(item?.axis),
  weight: Number(item?.weight ?? 0),
}));

function participantVector(participant = {}) {
  const source = participant.vector ?? participant.copnhfe ?? participant.axes ?? {};
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [String(key), Number(value) || 0])
  );
}

function tierFor(fit) {
  return fit > 85 ? 'S' : fit > 70 ? 'A' : fit > 55 ? 'B' : fit > 40 ? 'C' : 'D';
}

/**
 * Deterministic TaskFit adapter recovered from the LegacyBuild -> SynthUniverse donor.
 *
 * Donor behavior preserved:
 * - weighted axis coverage
 * - ring bias bonus (+0.10)
 * - gate affinity bonus (+0.08)
 * - optional Sun-gate boost (+0.05)
 * - 0..100 fit score + S/A/B/C/D tier
 *
 * Deliberate changes from the historical donor:
 * - no random scoring
 * - no storage side effects
 * - no fabricated participant data
 * - min/max participant and team-level fields are surfaced as eligibility checks
 *   instead of silently changing the donor score formula
 */
export class TaskFitService {
  constructor({ bus = null } = {}) {
    this.bus = bus;
  }

  scoreTask({ task = {}, participants = [], sunGate = 16 } = {}) {
    const team = (participants ?? []).filter(Boolean).map(participant => ({
      id: String(participant.id ?? participant.name ?? 'participant'),
      gate: Number(participant.gate ?? 0),
      ring: participant.ring == null ? null : String(participant.ring),
      level: Number(participant.level ?? 0),
      vector: participantVector(participant),
    }));

    if (!team.length) throw new Error('task-fit requires at least one participant');

    const axes = normalizeAxes(task);
    const teamVector = {};
    for (const participant of team) {
      for (const [key, value] of Object.entries(participant.vector)) {
        teamVector[key] = (teamVector[key] ?? 0) + Number(value || 0);
      }
    }

    const axisContributions = axes.map(spec => {
      const axisSum = spec.axis.reduce((sum, key) => sum + Number(teamVector[key] ?? 0), 0);
      const denominator = team.length * 100 * (spec.axis.length || 1);
      const coverage = axisSum / denominator;
      return {
        axis: [...spec.axis],
        weight: spec.weight,
        coverage,
        contribution: spec.weight * coverage,
      };
    });

    const axisScore = axisContributions.reduce((sum, item) => sum + item.contribution, 0);
    const ringBias = normalizeList(task.ring_bias ?? task.ringBias);
    const gateAffinity = (task.gate_affinity ?? task.gateAffinity ?? []).map(Number);
    const ringBonus = team.some(p => p.ring && ringBias.includes(p.ring)) ? 0.10 : 0;
    const gateBonus = team.some(p => gateAffinity.includes(p.gate)) ? 0.08 : 0;
    const sunBonus = Boolean(task.sun_gate_boost ?? task.sunGateBoost)
      && team.some(p => p.gate === Number(sunGate)) ? 0.05 : 0;

    const raw = clamp01(axisScore + ringBonus + gateBonus + sunBonus);
    const fit = Math.round(raw * 100);

    const minParticipants = Number(task.min_sprites ?? task.minParticipants ?? 0);
    const maxParticipants = Number(task.max_sprites ?? task.maxParticipants ?? 0);
    const minTeamLevel = Number(task.min_team_level ?? task.minTeamLevel ?? 0);
    const averageLevel = team.reduce((sum, p) => sum + p.level, 0) / team.length;
    const eligibilityReasons = [];
    if (minParticipants > 0 && team.length < minParticipants) eligibilityReasons.push(`requires at least ${minParticipants} participants`);
    if (maxParticipants > 0 && team.length > maxParticipants) eligibilityReasons.push(`allows at most ${maxParticipants} participants`);
    if (minTeamLevel > 0 && averageLevel < minTeamLevel) eligibilityReasons.push(`requires average team level ${minTeamLevel}`);

    const result = {
      task: {
        title: task.title ?? null,
        difficulty: task.difficulty ?? null,
      },
      participantIds: team.map(p => p.id),
      fit,
      tier: tierFor(fit),
      eligible: eligibilityReasons.length === 0,
      eligibilityReasons,
      score: {
        axis: axisScore,
        ringBonus,
        gateBonus,
        sunBonus,
        raw,
      },
      axisContributions,
      teamVector: clone(teamVector),
      donor: {
        source: 'LegacyBuild/attached_assets/SynthUniverse/server/services/taskfit.ts',
        formula: 'weighted-axis + ring + gate + sun bonuses',
      },
    };

    this.bus?.emit('task-fit:scored', clone(result));
    return result;
  }

  rankCandidates({ task = {}, candidates = [], sunGate = 16 } = {}) {
    const ranked = (candidates ?? []).map(candidate => {
      const result = this.scoreTask({ task, participants: [candidate], sunGate });
      return {
        candidateId: String(candidate.id ?? candidate.name ?? 'participant'),
        ...result,
      };
    }).sort((a, b) =>
      b.fit - a.fit
      || Number(b.eligible) - Number(a.eligible)
      || a.candidateId.localeCompare(b.candidateId)
    );

    const result = { task: clone(task), count: ranked.length, ranked };
    this.bus?.emit('task-fit:ranked', clone(result));
    return result;
  }
}

export default TaskFitService;
