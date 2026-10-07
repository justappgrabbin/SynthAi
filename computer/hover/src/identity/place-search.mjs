import { gunzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
const cities = JSON.parse(gunzipSync(await readFile(new URL('./data/cities.json.gz', import.meta.url))).toString('utf8'));
const normalize = text => String(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const countries = new Intl.DisplayNames(['en'], { type: 'region' });
const indexed = cities.map(city => ({
  city,
  search: normalize(`${city.name} ${city.aliases} ${city.region} ${city.country} ${countries.of(city.country)} ${city.country === 'US' ? 'USA' : city.country === 'GB' ? 'UK' : ''}`),
  name: normalize(city.name),
}));
const distance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = next;
  }
  return prev[b.length];
};
const fuzzyTerm = (term, words) => {
  if (words.some(word => word.includes(term))) return 0;
  const allowance = term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0;
  let best = Infinity;
  for (const word of words) best = Math.min(best, distance(term, word));
  return best <= allowance ? best : Infinity;
};
export function searchPlaces(query) {
  const normalized = normalize(query);
  const terms = normalized.split(' ').filter(Boolean);
  if (!terms.length || terms.join('').length < 2) return [];
  return indexed.map(row => {
    const words = row.search.split(' ');
    const penalties = terms.map(term => fuzzyTerm(term, words));
    if (penalties.some(value => !Number.isFinite(value))) return null;
    return { ...row, typoPenalty: penalties.reduce((sum, value) => sum + value, 0) };
  }).filter(Boolean)
    .sort((a,b) => a.typoPenalty - b.typoPenalty || Number(b.name === normalized) - Number(a.name === normalized) || b.city.population - a.city.population)
    .slice(0,8).map(({city}) => ({ id: city.id, label: [city.name,city.region,city.country].filter(Boolean).join(', '), latitude: city.latitude, longitude: city.longitude, timeZone: city.timeZone, coordinatePrecision: 'city' }));
}
