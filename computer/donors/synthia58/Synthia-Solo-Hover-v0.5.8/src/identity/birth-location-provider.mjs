const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function integer(value, name, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new RangeError(`${name} must be an integer ${minimum}..${maximum}`);
  }
  return number;
}

function numberInRange(value, name, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new RangeError(`${name} must be a finite number ${minimum}..${maximum}`);
  }
  return number;
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  if (!match) throw new TypeError('birthDate must use YYYY-MM-DD');
  const year = Number(match[1]);
  const month = integer(match[2], 'birth month', 1, 12);
  const day = integer(match[3], 'birth day', 1, 31);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new RangeError('birthDate is not a real calendar date');
  }
  return { year, month, day };
}

function parseTime(value) {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(String(value ?? ''));
  if (!match) throw new TypeError('birthTime must include exact seconds as HH:MM:SS');
  return {
    hour: integer(match[1], 'birth hour', 0, 23),
    minute: integer(match[2], 'birth minute', 0, 59),
    second: integer(match[3], 'birth second', 0, 59),
  };
}

function formatterFor(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  } catch (error) {
    throw new RangeError(`timeZone must be a valid IANA zone: ${timeZone}`, { cause: error });
  }
}

function zonedParts(formatter, timestamp) {
  const values = Object.fromEntries(formatter.formatToParts(timestamp)
    .filter((entry) => entry.type !== 'literal')
    .map((entry) => [entry.type, Number(entry.value)]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function sameCivil(left, right) {
  return ['year', 'month', 'day', 'hour', 'minute', 'second']
    .every((field) => left[field] === right[field]);
}

function offsetAt(formatter, timestamp) {
  const wholeSecond = Math.floor(timestamp / 1000) * 1000;
  const parts = zonedParts(formatter, wholeSecond);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - wholeSecond;
}

/**
 * Resolve an exact local civil time without trusting the host machine zone.
 * Ambiguous fall-back times and nonexistent spring-forward times are surfaced;
 * they are never silently guessed.
 */
export function resolveZonedBirthInstant({ birthDate, birthTime, timeZone, disambiguation = 'reject' } = {}) {
  const desired = { ...parseDate(birthDate), ...parseTime(birthTime) };
  const formatter = formatterFor(String(timeZone ?? ''));
  const civilAsUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    desired.second,
  );
  const offsets = new Set();
  for (let hours = -48; hours <= 48; hours += 6) {
    offsets.add(offsetAt(formatter, civilAsUtc + hours * 3_600_000));
  }
  const candidates = [...offsets]
    .map((offset) => civilAsUtc - offset)
    .filter((timestamp) => sameCivil(zonedParts(formatter, timestamp), desired))
    .sort((left, right) => left - right);
  const unique = [...new Set(candidates)];
  if (!unique.length) {
    const error = new RangeError('birth local time does not exist in the supplied timezone (daylight-saving transition)');
    error.code = 'BIRTH_TIME_NONEXISTENT';
    throw error;
  }
  if (unique.length > 1 && !['earlier', 'later'].includes(disambiguation)) {
    const error = new RangeError('birth local time is ambiguous in the supplied timezone; choose earlier or later');
    error.code = 'BIRTH_TIME_AMBIGUOUS';
    error.candidates = unique.map((timestamp) => new Date(timestamp).toISOString());
    throw error;
  }
  const timestamp = disambiguation === 'later' ? unique.at(-1) : unique[0];
  return Object.freeze({
    instant: new Date(timestamp),
    utcIso: new Date(timestamp).toISOString(),
    utcOffsetMinutes: offsetAt(formatter, timestamp) / 60_000,
    timeZone: String(timeZone),
    disambiguation: unique.length > 1 ? disambiguation : 'unambiguous',
    candidateCount: unique.length,
    exactSecondsPreserved: true,
  });
}

export function julianDayForInstant(instant) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) throw new TypeError('instant must be a valid date');
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

/**
 * Replaceable engineering provider for the missing house calculation.
 * It uses a tropical ascendant and equal 30-degree houses. This is not claimed
 * as a canonical Human Design rule and is always returned with provenance.
 */
export class EqualHouseProvider {
  constructor({ id = 'tropical-equal-house-v1' } = {}) {
    this.id = id;
  }

  ascendant({ instant, latitude, longitude }) {
    const lat = numberInRange(latitude, 'latitude', -90, 90);
    const lon = numberInRange(longitude, 'longitude', -180, 180);
    const jd = julianDayForInstant(instant);
    const centuries = (jd - 2_451_545.0) / 36_525;
    const gmst = mod(
      280.46061837
        + 360.98564736629 * (jd - 2_451_545.0)
        + 0.000387933 * centuries ** 2
        - centuries ** 3 / 38_710_000,
      360,
    );
    const localSidereal = mod(gmst + lon, 360) * DEG;
    const obliquity = (23.439291 - 0.0130042 * centuries) * DEG;
    const ascendant = mod(Math.atan2(
      -Math.cos(localSidereal),
      Math.sin(localSidereal) * Math.cos(obliquity) + Math.tan(lat * DEG) * Math.sin(obliquity),
    ) * RAD, 360);
    return ascendant;
  }

  houseForLongitude(longitude, context) {
    const ascendant = this.ascendant(context);
    const house = Math.floor(mod(Number(longitude) - ascendant, 360) / 30) + 1;
    return Object.freeze({
      house,
      ascendant: Number(ascendant.toFixed(9)),
      provider: this.id,
      system: 'equal-house',
      zodiac: 'tropical',
      status: 'ENGINEERING_IMPLEMENTATION_CHOICE',
      replaceable: true,
      scientificValidationClaim: false,
    });
  }

  snapshot() {
    return Object.freeze({
      id: this.id,
      system: 'equal-house',
      zodiac: 'tropical',
      status: 'ENGINEERING_IMPLEMENTATION_CHOICE',
      replaceable: true,
    });
  }
}

export function validateBirthRecord(input = {}) {
  const personId = String(input.personId ?? 'front-screen').trim();
  const agentId = String(input.agentId ?? 'synthia').trim();
  if (!personId || !agentId) throw new TypeError('personId and agentId are required');
  const birthDate = String(input.birthDate ?? '');
  const birthTime = String(input.birthTime ?? '');
  parseDate(birthDate);
  parseTime(birthTime);
  const place = input.place ?? input.birthPlace ?? input.birthLocation ?? {};
  if (!place || typeof place !== 'object') throw new TypeError('birth place must include label, latitude, longitude, and timeZone');
  const label = String(place.label ?? '').trim();
  if (!label) throw new TypeError('birth place label is required');
  const latitude = numberInRange(place.latitude, 'latitude', -90, 90);
  const longitude = numberInRange(place.longitude, 'longitude', -180, 180);
  const timeZone = String(place.timeZone ?? '').trim();
  formatterFor(timeZone);
  const disambiguation = input.disambiguation ?? 'reject';
  if (!['reject', 'earlier', 'later'].includes(disambiguation)) throw new RangeError('disambiguation must be reject, earlier, or later');
  return Object.freeze({
    version: 'synthia.private-birth-record.v1',
    personId,
    agentId,
    birthDate,
    birthTime,
    place: Object.freeze({ label, latitude, longitude, timeZone }),
    disambiguation,
  });
}

export default EqualHouseProvider;
