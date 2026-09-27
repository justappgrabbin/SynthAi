import { DIMENSIONS } from '../state-space/agent-address.mjs';
import { PLANETARY_FILTER_SPECS } from '../state-space/planetary-filters.mjs';

const PLANET_INDEX = Object.freeze(Object.fromEntries(
  PLANETARY_FILTER_SPECS.map((planet) => [planet.name, planet.id]),
));
const ZODIAC_INDEX = Object.freeze({
  Aries: 1,
  Taurus: 2,
  Gemini: 3,
  Cancer: 4,
  Leo: 5,
  Virgo: 6,
  Libra: 7,
  Scorpio: 8,
  Sagittarius: 9,
  Capricorn: 10,
  Aquarius: 11,
  Pisces: 12,
});

function arcCoordinates(longitude) {
  const withinSign = ((Number(longitude) % 30) + 30) % 30;
  const totalArcSeconds = withinSign * 3_600;
  const wholeArcSeconds = Math.floor(totalArcSeconds + 1e-9);
  return Object.freeze({
    degree: Math.floor(withinSign),
    minute: Math.floor((wholeArcSeconds % 3_600) / 60),
    second: wholeArcSeconds % 60,
    arc: Math.max(0, Math.min(99, Math.floor((totalArcSeconds - wholeArcSeconds) * 100 + 1e-7))),
  });
}

function byPlanet(placements) {
  return new Map(placements.map((placement) => [placement.planet, placement]));
}

/**
 * Source-aware join between the Personality Crystal, Design Crystal, and the
 * five dimension frames. The unresolved Magnetic Monopole/Movement landing is
 * a provider rule, not a buried constant, and remains flagged until an
 * authoritative grammar is supplied.
 */
export class DimensionLandingProvider {
  constructor({
    streamByDimension = {},
    movementStream = 'personality',
  } = {}) {
    this.streamByDimension = Object.freeze({
      Movement: movementStream,
      Evolution: 'personality',
      Being: 'design',
      Design: 'design',
      Space: 'personality',
      ...streamByDimension,
    });
    for (const dimension of DIMENSIONS) {
      if (!['personality', 'design'].includes(this.streamByDimension[dimension])) {
        throw new RangeError(`dimension landing stream for ${dimension} must be personality or design`);
      }
    }
  }

  build({ chart, houseProvider, instant, place }) {
    const all = chart?.placements ?? [];
    if (all.length < 26) throw new Error('birth chart must retain 13 personality and 13 design placements');
    const personality = all.slice(0, 13).map((entry) => ({ ...entry, stream: 'personality' }));
    const design = all.slice(13, 26).map((entry) => ({ ...entry, stream: 'design' }));
    const streams = { personality: byPlanet(personality), design: byPlanet(design) };
    const personalitySun = streams.personality.get('Sun');
    if (!personalitySun) throw new Error('chart is missing personality Sun placement');
    const originAtomic = arcCoordinates(personalitySun.longitude);
    const originHouse = houseProvider.houseForLongitude(personalitySun.longitude, {
      instant,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    const originAnchor = Object.freeze({
      body: 'Personality Sun',
      dimension: 'Being',
      referenceFrame: 'Tropical',
      fixedOrigin: true,
      address: Object.freeze({
        planetary: PLANET_INDEX.Sun,
        dimension: 'Being',
        gate: Number(personalitySun.gate),
        line: Number(personalitySun.line),
        color: Number(personalitySun.color),
        tone: Number(personalitySun.tone),
        base: Number(personalitySun.base),
        degree: originAtomic.degree,
        minute: originAtomic.minute,
        second: originAtomic.second,
        arc: originAtomic.arc,
        zodiac: ZODIAC_INDEX[personalitySun.zodiac],
        house: originHouse.house,
      }),
      sourcePlacement: Object.freeze({
        planet: personalitySun.planet,
        stream: 'personality',
        longitude: personalitySun.longitude,
        zodiac: personalitySun.zodiac,
      }),
    });
    const resolutions = [];
    const placements = DIMENSIONS.flatMap((dimension) => PLANETARY_FILTER_SPECS.map((filter) => {
      const stream = this.streamByDimension[dimension];
      const source = streams[stream].get(filter.name);
      const alternateStream = stream === 'personality' ? 'design' : 'personality';
      const alternate = streams[alternateStream].get(filter.name);
      if (!source) throw new Error(`chart is missing ${stream} placement for ${filter.name}`);
      const atomic = arcCoordinates(source.longitude);
      const house = houseProvider.houseForLongitude(source.longitude, {
        instant,
        latitude: place.latitude,
        longitude: place.longitude,
      });
      const address = Object.freeze({
        planetary: PLANET_INDEX[filter.name],
        dimension,
        gate: Number(source.gate),
        line: Number(source.line),
        color: Number(source.color),
        tone: Number(source.tone),
        base: Number(source.base),
        degree: atomic.degree,
        minute: atomic.minute,
        second: atomic.second,
        arc: atomic.arc,
        zodiac: ZODIAC_INDEX[source.zodiac],
        house: house.house,
      });
      resolutions.push(Object.freeze({
        dimension,
        planetary: address.planetary,
        planet: filter.name,
        selectedStream: stream,
        selectedLongitude: source.longitude,
        alternateStream,
        alternateGate: alternate?.gate ?? null,
        alternateLine: alternate?.line ?? null,
        house,
        status: dimension === 'Movement'
          ? 'PROVISIONAL_MOVEMENT_STREAM_RULE; MAGNETIC_MONOPOLE_LANDING_GRAMMAR_OPEN'
          : 'SOURCE_DERIVED_CRYSTAL_GROUPING',
      }));
      return address;
    }));
    return Object.freeze({
      placements: Object.freeze(placements),
      resolutions: Object.freeze(resolutions),
      streams: Object.freeze({ personality: Object.freeze(personality), design: Object.freeze(design) }),
      originAnchor,
      provider: this.snapshot(),
    });
  }

  snapshot() {
    return Object.freeze({
      id: 'black-book-crystal-grouping-dimension-landing-v1',
      streamByDimension: this.streamByDimension,
      basis: Object.freeze({
        Evolution: 'Personality Crystal / Mind',
        Space: 'Personality Crystal / Personality',
        Being: 'Design Crystal / Body',
        Design: 'Design Crystal / Ego',
        Movement: 'Magnetic Monopole / Individuality; exact landing grammar unresolved',
      }),
      movementStatus: 'OPEN_QUESTION_WITH_EXPLICIT_PROVISIONAL_PROVIDER_RULE',
      replaceable: true,
      hardcodedAsCanonical: false,
    });
  }
}

export default DimensionLandingProvider;
