const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

const normalize = (v) => ((v % 360) + 360) % 360;
const sin = (d) => Math.sin(d * DEG);
const cos = (d) => Math.cos(d * DEG);
const atan2 = (y, x) => normalize(Math.atan2(y, x) * RAD);

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const ASPECTS = [
  { name: 'Conjunction', angle: 0, orb: 8 },
  { name: 'Sextile', angle: 60, orb: 5 },
  { name: 'Square', angle: 90, orb: 6 },
  { name: 'Trine', angle: 120, orb: 6 },
  { name: 'Opposition', angle: 180, orb: 8 },
];

function solveEccentricAnomaly(M, e) {
  const Mr = normalize(M) * DEG;
  let E = Mr + e * Math.sin(Mr) * (1 + e * Math.cos(Mr));
  for (let i = 0; i < 6; i += 1) {
    E -= (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
  }
  return E;
}

function orbitalXYZ(elements) {
  const { N, i, w, a, e, M } = elements;
  const E = solveEccentricAnomaly(M, e);
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv) * RAD;
  const r = Math.sqrt(xv * xv + yv * yv);
  const vw = v + w;
  return {
    x: r * (cos(N) * cos(vw) - sin(N) * sin(vw) * cos(i)),
    y: r * (sin(N) * cos(vw) + cos(N) * sin(vw) * cos(i)),
    z: r * sin(vw) * sin(i),
    r,
    v: normalize(v),
  };
}

function elementsFor(planet, d) {
  const e = {
    Mercury: { N: 48.3313 + 3.24587e-5*d, i: 7.0047 + 5e-8*d, w: 29.1241 + 1.01444e-5*d, a: 0.387098, e: 0.205635 + 5.59e-10*d, M: 168.6562 + 4.0923344368*d },
    Venus: { N: 76.6799 + 2.46590e-5*d, i: 3.3946 + 2.75e-8*d, w: 54.8910 + 1.38374e-5*d, a: 0.72333, e: 0.006773 - 1.302e-9*d, M: 48.0052 + 1.6021302244*d },
    Mars: { N: 49.5574 + 2.11081e-5*d, i: 1.8497 - 1.78e-8*d, w: 286.5016 + 2.92961e-5*d, a: 1.523688, e: 0.093405 + 2.516e-9*d, M: 18.6021 + 0.5240207766*d },
    Jupiter: { N: 100.4542 + 2.76854e-5*d, i: 1.303 - 1.557e-7*d, w: 273.8777 + 1.64505e-5*d, a: 5.20256, e: 0.048498 + 4.469e-9*d, M: 19.895 + 0.0830853001*d },
    Saturn: { N: 113.6634 + 2.3898e-5*d, i: 2.4886 - 1.081e-7*d, w: 339.3939 + 2.97661e-5*d, a: 9.55475, e: 0.055546 - 9.499e-9*d, M: 316.967 + 0.0334442282*d },
    Uranus: { N: 74.0005 + 1.3978e-5*d, i: 0.7733 + 1.9e-8*d, w: 96.6612 + 3.0565e-5*d, a: 19.18171 - 1.55e-8*d, e: 0.047318 + 7.45e-9*d, M: 142.5905 + 0.011725806*d },
    Neptune: { N: 131.7806 + 3.0173e-5*d, i: 1.77 - 2.55e-7*d, w: 272.8461 - 6.027e-6*d, a: 30.05826 + 3.313e-8*d, e: 0.008606 + 2.15e-9*d, M: 260.2471 + 0.005995147*d },
    Pluto: { N: 110.30347, i: 17.14175, w: 113.76329, a: 39.48168677, e: 0.24880766, M: 14.53 + 0.003975709*d },
  };
  return e[planet];
}

function sunPosition(d) {
  const w = 282.9404 + 4.70935e-5*d;
  const e = 0.016709 - 1.151e-9*d;
  const M = 356.047 + 0.9856002585*d;
  const E = solveEccentricAnomaly(M, e);
  const xv = Math.cos(E) - e;
  const yv = Math.sqrt(1 - e*e) * Math.sin(E);
  const v = Math.atan2(yv, xv) * RAD;
  const r = Math.sqrt(xv*xv + yv*yv);
  const longitude = normalize(v + w);
  return { longitude, r, xs: r * cos(longitude), ys: r * sin(longitude) };
}

function moonPosition(d) {
  const N = 125.1228 - 0.0529538083*d;
  const i = 5.1454;
  const w = 318.0634 + 0.1643573223*d;
  const a = 60.2666;
  const e = 0.0549;
  const M = 115.3654 + 13.0649929509*d;
  const xyz = orbitalXYZ({ N, i, w, a, e, M });
  let lon = atan2(xyz.y, xyz.x);
  const sun = sunPosition(d);
  const Ms = normalize(356.047 + 0.9856002585*d);
  const Ls = sun.longitude;
  const Lm = normalize(N + w + M);
  const D = normalize(Lm - Ls);
  const F = normalize(Lm - N);
  lon += -1.274 * sin(M - 2*D)
       + 0.658 * sin(2*D)
       - 0.186 * sin(Ms)
       - 0.059 * sin(2*M - 2*D)
       - 0.057 * sin(M - 2*D + Ms)
       + 0.053 * sin(M + 2*D)
       + 0.046 * sin(2*D - Ms)
       + 0.041 * sin(M - Ms)
       - 0.035 * sin(D)
       - 0.031 * sin(M + Ms)
       - 0.015 * sin(2*F - 2*D)
       + 0.011 * sin(M - 4*D);
  return normalize(lon);
}

function planetLongitude(planet, d) {
  if (planet === 'Sun') return sunPosition(d).longitude;
  if (planet === 'Moon') return moonPosition(d);
  const sun = sunPosition(d);
  const xyz = orbitalXYZ(elementsFor(planet, d));
  return atan2(xyz.y + sun.ys, xyz.x + sun.xs);
}

function meanNodeLongitude(d) { return normalize(125.1228 - 0.0529538083*d); }

export class AstrologyEngine {
  constructor() { this.signs = SIGNS; this.planets = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']; }
  parseBirthDate(birthData) {
    if (birthData instanceof Date) return new Date(birthData.getTime());
    if (birthData?.date instanceof Date) return new Date(birthData.date.getTime());
    const date = String(birthData?.date || '2000-01-01');
    const time = String(birthData?.time || '12:00:00');
    const [year, month, day] = date.split('-').map(Number);
    const [hour = 0, minute = 0, second = 0] = time.split(':').map(Number);
    const offset = Number(birthData?.timezoneOffset || 0);
    return new Date(Date.UTC(year, month - 1, day, hour - offset, minute, second));
  }
  julianDay(date) { return date.getTime() / 86400000 + 2440587.5; }
  daysFromEpoch(date) { return this.julianDay(date) - 2451543.5; }
  zodiac(longitude) { const lon=normalize(longitude), signIndex=Math.floor(lon/30); return {longitude:lon,sign:SIGNS[signIndex],signIndex,degree:lon%30}; }
  lahiriAyanamsa(date) { const years=(date.getTime()-Date.UTC(2000,0,1,12))/(365.2425*86400000); return 23.8531+years*0.013968; }
  localSiderealTime(jd, longitude) { const T=(jd-2451545.0)/36525; return normalize(280.46061837+360.98564736629*(jd-2451545.0)+0.000387933*T*T-(T*T*T)/38710000+Number(longitude||0)); }
  ascendant(jd, latitude, longitude) { const theta=this.localSiderealTime(jd,longitude)*DEG,phi=Number(latitude||0)*DEG,T=(jd-2451545.0)/36525,eps=(23.439291-0.0130042*T)*DEG; const lambda=Math.atan2(-Math.cos(theta),Math.sin(theta)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps))*RAD; return normalize(lambda+180); }
  calculateTropical(date, latitude=0, longitude=0) {
    const d=this.daysFromEpoch(date),jd=this.julianDay(date),positions=this.planets.map(planet=>({planet,...this.zodiac(planetLongitude(planet,d))})),node=meanNodeLongitude(d),asc=this.ascendant(jd,latitude,longitude),ascSign=Math.floor(asc/30);
    const withHouses=positions.map(p=>({...p,house:((p.signIndex-ascSign+12)%12)+1}));
    return {system:'Tropical',date:date.toISOString(),julianDay:jd,positions:withHouses,northNode:{...this.zodiac(node),planet:'North Node'},southNode:{...this.zodiac(node+180),planet:'South Node'},ascendant:this.zodiac(asc),houseSystem:'Whole Sign (local calculation)',precision:'Local low-precision ephemeris; suitable for offline exploration, not professional ephemeris replacement.'};
  }
  transformChart(chart,system,transform){const asc=this.zodiac(transform(chart.ascendant.longitude)),ascSign=asc.signIndex;return {...chart,system,positions:chart.positions.map(p=>{const z=this.zodiac(transform(p.longitude));return {...p,...z,house:((z.signIndex-ascSign+12)%12)+1};}),northNode:{...chart.northNode,...this.zodiac(transform(chart.northNode.longitude))},southNode:{...chart.southNode,...this.zodiac(transform(chart.southNode.longitude))},ascendant:asc};}
  calculateForDate(date,latitude=0,longitude=0){const tropical=this.calculateTropical(date,latitude,longitude),ayanamsa=this.lahiriAyanamsa(date),sidereal=this.transformChart(tropical,'Sidereal (Lahiri)',lon=>normalize(lon-ayanamsa)),node=tropical.northNode.longitude,draconic=this.transformChart(tropical,'Draconic',lon=>normalize(lon-node));return {tropical,sidereal,draconic,ayanamsa,aspects:this.calculateAspects(tropical.positions)};}
  calculateTriad(birthData){const date=this.parseBirthDate(birthData);return {...this.calculateForDate(date,Number(birthData?.lat||0),Number(birthData?.lon||0)),inputDate:date.toISOString()};}
  calculateAspects(positions){const aspects=[];for(let i=0;i<positions.length;i++){for(let j=i+1;j<positions.length;j++){const a=positions[i],b=positions[j];let angle=Math.abs(a.longitude-b.longitude);if(angle>180)angle=360-angle;for(const aspect of ASPECTS){const delta=Math.abs(angle-aspect.angle);if(delta<=aspect.orb){aspects.push({a:a.planet,b:b.planet,type:aspect.name,angle,orb:delta});break;}}}}return aspects.sort((a,b)=>a.orb-b.orb);}
  findPlanet(chart,name){if(name==='North Node')return chart.northNode;if(name==='South Node')return chart.southNode;return chart.positions.find(p=>p.planet===name)||null;}
}
export const astrology=new AstrologyEngine();
export { normalize };
