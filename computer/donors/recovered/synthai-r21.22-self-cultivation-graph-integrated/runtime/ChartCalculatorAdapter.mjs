import * as donor from '../donors/isohuman/GeonatalCalculator.browser.mjs';

const clone = value => value == null ? value : structuredClone(value);
const asFinite = (value, name) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${name} must be finite`);
  return number;
};

function stableHash(value) {
  let hash = 2166136261;
  for (const character of JSON.stringify(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeBirthData(input = {}) {
  const timestamp = input.timestamp || input.birthDateTime || input.birth?.timestamp || input.birth?.dateTime;
  if (!timestamp) throw new TypeError('birth timestamp is required (ISO 8601 with timezone)');
  const date = timestamp instanceof Date ? new Date(timestamp.getTime()) : new Date(String(timestamp));
  if (Number.isNaN(date.getTime())) throw new TypeError('birth timestamp must be a valid ISO 8601 date-time');
  const locationInput = input.location || input.birth?.location || {};
  const location = {
    latitude: asFinite(locationInput.latitude, 'location.latitude'),
    longitude: asFinite(locationInput.longitude, 'location.longitude'),
  };
  if (location.latitude < -90 || location.latitude > 90) throw new RangeError('location.latitude must be between -90 and 90');
  if (location.longitude < -180 || location.longitude > 180) throw new RangeError('location.longitude must be between -180 and 180');
  return {
    timestamp: date,
    location,
    locationLabel: String(locationInput.label || input.locationLabel || '').trim() || null,
    name: String(input.name || input.birth?.name || 'Design').trim() || 'Design',
  };
}

function coordinateFromPlacement(placement) {
  return {
    planetary: placement.planetary,
    orientation: placement.orientation,
    frame: placement.frame,
    dimension: placement.dimension,
    longitude: placement.longitude,
    zodiac: placement.zodiac,
    degree: placement.degree,
    minute: placement.minute,
    second: placement.second,
    arc: placement.arc,
    house: placement.house,
    gate: placement.gate,
    line: placement.line,
    color: placement.color,
    tone: placement.tone,
    base: placement.base,
  };
}

export function calculateChart(input = {}) {
  const birth = normalizeBirthData(input);
  const calculated = donor.calculateGeonatalChart(birth.timestamp, birth.location);
  const placements = calculated.placements.map(coordinateFromPlacement);
  const hdPlacements = placements.filter(p => p.frame === 'tropical');
  const gates = [...new Set(hdPlacements.map(p => Number(p.gate)).filter(Number.isInteger))].sort((a, b) => a - b);
  const personality = hdPlacements.filter(p => p.orientation === 'personality');
  const design = hdPlacements.filter(p => p.orientation === 'design');
  const canonical = {
    kind: 'synthia-chart-address',
    version: 1,
    timestamp: calculated.timestamp,
    designTimestamp: calculated.designTimestamp,
    location: { ...birth.location, label: birth.locationLabel },
    personalityGates: [...new Set(personality.map(p => p.gate))],
    designGates: [...new Set(design.map(p => p.gate))],
    gates,
    coordinates: hdPlacements.map(p => ({
      gate: p.gate,
      line: p.line,
      color: p.color,
      tone: p.tone,
      base: p.base,
      planetary: p.planetary,
      orientation: p.orientation,
      frame: p.frame,
      longitude: p.longitude,
      house: p.house,
    })),
  };
  return {
    chartId: `chart-${stableHash({ timestamp: calculated.timestamp, location: birth.location })}`,
    birth: {
      name: birth.name,
      timestamp: calculated.timestamp,
      location: { ...birth.location, label: birth.locationLabel },
    },
    astrology: {
      houseMethod: calculated.houseMethod,
      trueNodeLongitude: calculated.trueNodeLongitude,
      faganBradleyAyanamsa: calculated.faganBradleyAyanamsa,
      methods: clone(calculated.methods),
      placements,
      perspectives: clone(calculated.perspectives),
    },
    humanDesign: {
      gates,
      personalityGates: canonical.personalityGates,
      designGates: canonical.designGates,
      coordinates: canonical.coordinates,
      channels: [],
      centers: [],
    },
    canonical,
    provenance: {
      source: 'Synthia-r21.19-IsoHuman-Chart-Donor-ONLY',
      module: 'donors/isohuman/GeonatalCalculator.cjs',
      calculator: 'calculateGeonatalChart',
      dependency: 'astronomy-engine@2.1.19',
      transformations: [
        'compiled donor output loaded through clean CommonJS adapter',
        'placements normalized into r21.22 chart/address envelope',
        'tropical personality/design gates projected into HumanDesignNetwork input',
      ],
    },
  };
}

export function donorFunctions() {
  return {
    humanDesignResolution: donor.humanDesignResolution,
    faganBradleyAyanamsa: donor.faganBradleyAyanamsa,
  };
}

export default calculateChart;
