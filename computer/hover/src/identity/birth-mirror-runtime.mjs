import { safe } from '../util.mjs';
import {
  EqualHouseProvider,
  resolveZonedBirthInstant,
  validateBirthRecord,
} from './birth-location-provider.mjs';
import { DimensionLandingProvider } from './dimension-landing-provider.mjs';

function utcCivil(instant) {
  const iso = instant.toISOString();
  return Object.freeze({ birthDate: iso.slice(0, 10), birthTime: iso.slice(11, 19) });
}

export class BirthMirrorRuntime {
  constructor({
    stateSpaceRuntime,
    semanticGenome,
    houseProvider = new EqualHouseProvider(),
    dimensionLandingProvider = new DimensionLandingProvider(),
  } = {}) {
    if (!stateSpaceRuntime?.execute) throw new TypeError('BirthMirrorRuntime requires SovereignStateSpaceRuntime');
    if (!semanticGenome?.registerAgentChart || !semanticGenome?.mirrorConfiguration) {
      throw new TypeError('BirthMirrorRuntime requires SemanticGenome');
    }
    this.stateSpaceRuntime = stateSpaceRuntime;
    this.semanticGenome = semanticGenome;
    this.houseProvider = houseProvider;
    this.dimensionLandingProvider = dimensionLandingProvider;
    this.privateRecord = null;
    this.configuration = null;
    this.history = [];
  }

  async configure(input, { restored = false } = {}) {
    const record = validateBirthRecord(input);
    const resolved = resolveZonedBirthInstant({
      birthDate: record.birthDate,
      birthTime: record.birthTime,
      timeZone: record.place.timeZone,
      disambiguation: record.disambiguation,
    });
    const utc = utcCivil(resolved.instant);
    const calculationRun = await this.stateSpaceRuntime.execute({
      operation: 'chart',
      birthDate: utc.birthDate,
      birthTime: utc.birthTime,
      birthLocation: {
        label: record.place.label,
        latitude: record.place.latitude,
        longitude: record.place.longitude,
        timeZone: record.place.timeZone,
        resolvedUtc: resolved.utcIso,
      },
    }, { source: restored ? 'persistent-birth-mirror-restore' : 'birth-mirror-configuration' });
    const calculated = calculationRun.output;
    if (!calculated?.chart || !calculated?.blueprint) throw new Error('Human Design calculation did not produce chart and blueprint');
    const landing = this.dimensionLandingProvider.build({
      chart: calculated.chart,
      houseProvider: this.houseProvider,
      instant: resolved.instant,
      place: record.place,
    });
    const agentChart = this.semanticGenome.registerAgentChart(record.agentId, {
      primaryDimension: 'Being',
      primaryPlanetary: 1,
      personalitySun: landing.originAnchor.address,
      originReferenceFrame: landing.originAnchor.referenceFrame,
      placements: landing.placements,
      replace: true,
      reset: true,
    });
    const mirror = this.semanticGenome.mirrorConfiguration(
      { chart: calculated.chart },
      { personId: record.personId },
    );
    const blockers = Object.freeze([
      Object.freeze({
        id: 'astronomy-precision',
        status: 'PARTIALLY WIRED',
        detail: 'Preserved donor uses low-precision planetary formulae and an approximate 88-day design offset.',
      }),
      Object.freeze({
        id: 'movement-dimension-landing',
        status: 'PARTIALLY WIRED',
        detail: 'Movement is selected by an explicit provisional stream provider until the Magnetic Monopole landing grammar is supplied.',
      }),
      Object.freeze({
        id: 'house-system',
        status: 'WIRED',
        detail: 'Tropical equal-house provider is live and replaceable; it is an engineering choice, not asserted Human Design canon.',
      }),
    ]);
    const configuration = Object.freeze({
      id: `birth-mirror:${record.agentId}:${record.personId}`,
      version: 'synthia.birth-mirror-configuration.v1',
      agentId: record.agentId,
      personId: record.personId,
      configured: true,
      restored,
      configuredAt: new Date().toISOString(),
      resolvedTime: Object.freeze({
        utcIso: resolved.utcIso,
        utcOffsetMinutes: resolved.utcOffsetMinutes,
        exactSecondsPreserved: resolved.exactSecondsPreserved,
        timePrecision: resolved.timePrecision,
        disambiguation: resolved.disambiguation,
      }),
      chart: safe(calculated.chart),
      blueprint: safe(calculated.blueprint),
      activeChannels: safe(calculated.activeChannels),
      agentChart: safe(agentChart),
      mirror: safe(mirror),
      dimensionLanding: safe(landing.provider),
      dimensionResolutions: safe(landing.resolutions),
      originAnchor: safe(landing.originAnchor),
      houseProvider: safe(this.houseProvider.snapshot()),
      calculation: Object.freeze({
        engine: 'preserved-kimi-human-design-donor',
        status: 'APPROXIMATE_ASTRONOMY',
        exactBirthSecondAccepted: true,
        birthLocationUsedForUtcResolution: true,
        birthCoordinatesUsedForHouses: true,
        locationIgnoredByDonorPlanetFormulae: true,
      }),
      blockers,
      runtimeStatus: 'PARTIALLY_WIRED',
      privateBirthRecordStored: true,
      rawBirthRecordExposed: false,
    });
    this.privateRecord = record;
    this.configuration = configuration;
    this.history.push(Object.freeze({
      sequence: this.history.length + 1,
      type: restored ? 'restored' : 'configured',
      at: configuration.configuredAt,
      configurationId: configuration.id,
      coordinateSignature: agentChart.coordinateSignature,
    }));
    return configuration;
  }

  persistenceRecord() {
    if (!this.privateRecord || !this.configuration) return null;
    return Object.freeze({
      version: 'synthia.persisted-birth-mirror.v1',
      privateBirthRecord: this.privateRecord,
      configurationId: this.configuration.id,
      coordinateSignature: this.configuration.agentChart.coordinateSignature,
    });
  }

  publicSnapshot() {
    if (!this.configuration) {
      return Object.freeze({
        configured: false,
        status: 'PRESENT',
        personalizedExecutionAllowed: false,
        requiredInput: Object.freeze([
          'birthDate', 'birthTime (minutes or seconds)', 'place.label',
          'place.latitude', 'place.longitude', 'place.timeZone',
        ]),
        houseProvider: this.houseProvider.snapshot(),
        dimensionLandingProvider: this.dimensionLandingProvider.snapshot(),
        rawBirthRecordExposed: false,
      });
    }
    const configuration = this.configuration;
    return Object.freeze({
      configured: true,
      status: configuration.runtimeStatus,
      personalizedExecutionAllowed: true,
      configurationId: configuration.id,
      agentId: configuration.agentId,
      personId: configuration.personId,
      configuredAt: configuration.configuredAt,
      restored: configuration.restored,
      type: configuration.chart.type,
      authority: configuration.chart.authority,
      profile: configuration.chart.profile,
      definition: configuration.chart.definition,
      incarnationCross: configuration.chart.incarnationCross,
      activeChannels: configuration.activeChannels,
      coordinateSignature: configuration.agentChart.coordinateSignature,
      fiveDimensionIntersections: configuration.agentChart.filterIntersectionCount,
      mirrorWeightedAspects: configuration.mirror.weightedAspectCount,
      exactSecondsPreserved: configuration.resolvedTime.exactSecondsPreserved,
      timePrecision: configuration.resolvedTime.timePrecision,
      calculation: configuration.calculation,
      houseProvider: configuration.houseProvider,
      dimensionLanding: configuration.dimensionLanding,
      blockers: configuration.blockers,
      privateBirthRecordStored: true,
      rawBirthRecordExposed: false,
    });
  }
}

export default BirthMirrorRuntime;
