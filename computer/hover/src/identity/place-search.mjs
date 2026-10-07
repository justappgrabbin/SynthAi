import { gunzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
const cities = JSON.parse(gunzipSync(await readFile(new URL('./data/cities.json.gz', import.meta.url))).toString('utf8'));
const normalize = text => String(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const countries = new Intl.DisplayNames(['en'], { type: 'region' });
const indexed = cities.map(city => ({ city, search: normalize(`${city.name} ${city.aliases} ${city.region} ${city.country} ${countries.of(city.country)} ${city.country === 'US' ? 'USA' : city.country === 'GB' ? 'UK' : ''}`), name: normalize(city.name) }));
export function searchPlaces(query) {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (!terms.length || terms.join('').length < 2) return [];
  return indexed.filter(row => terms.every(term => row.search.includes(term)))
    .sort((a,b) => Number(b.name === normalize(query)) - Number(a.name === normalize(query)) || b.city.population - a.city.population)
    .slice(0,8).map(({city}) => ({ id: city.id, label: [city.name,city.region,city.country].filter(Boolean).join(', '), latitude: city.latitude, longitude: city.longitude, timeZone: city.timeZone, coordinatePrecision: 'city' }));
}
