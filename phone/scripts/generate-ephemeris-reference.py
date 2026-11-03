"""Regenerate a small independent reference dataset; not a production calculator.
Install pyswisseph==2.10.3.2 separately. Uses built-in Moshier, no external ephemeris files.
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import swisseph as swe

swe.set_sid_mode(swe.SIDM_FAGAN_BRADLEY)
BODIES = {'Sun':swe.SUN,'Moon':swe.MOON,'Mercury':swe.MERCURY,'Venus':swe.VENUS,'Mars':swe.MARS,'Jupiter':swe.JUPITER,'Saturn':swe.SATURN,'Uranus':swe.URANUS,'Neptune':swe.NEPTUNE,'Pluto':swe.PLUTO,'North Node':swe.TRUE_NODE}

def julian(date):
    return swe.julday(date.year,date.month,date.day,date.hour+date.minute/60+date.second/3600+date.microsecond/3600000000)

def longitude(date, body):
    return swe.calc_ut(julian(date), body, swe.FLG_MOSEPH)[0][0]

def reference(date,latitude,longitude_degrees):
    jd=julian(date)
    tropical={name:longitude(date, body) for name,body in BODIES.items()}
    tropical['Earth']=(tropical['Sun']+180)%360
    tropical['South Node']=(tropical['North Node']+180)%360
    true_node=tropical['North Node']; mean_node=longitude(date,swe.MEAN_NODE)
    # Derive apparent Fagan offset from independent tropical and sidereal Sun calls.
    sidereal_sun=swe.calc_ut(jd,swe.SUN,swe.FLG_MOSEPH|swe.FLG_SIDEREAL)[0][0]
    sidereal_offset=(tropical['Sun']-sidereal_sun)%360
    ascendant=swe.houses_ex(jd,latitude,longitude_degrees,b'E')[1][0]
    before=swe.houses_ex(jd-1/86400,latitude,longitude_degrees,b'E')[1][0]
    after=swe.houses_ex(jd+1/86400,latitude,longitude_degrees,b'E')[1][0]
    ascendant_rate=((after-before+180)%360-180)/2
    frames={}
    for frame,offset in [('tropical',0),('draconic_tropical_true',true_node),('draconic_tropical_mean',mean_node),('sidereal_fagan_bradley',sidereal_offset)]:
        source=dict(tropical)
        if frame=='draconic_tropical_mean':
            source['North Node']=mean_node;source['South Node']=(mean_node+180)%360
        frames[frame]={'positions':{name:round((value-offset)%360,9) for name,value in source.items()},'ascendant':round((ascendant-offset)%360,9),'ascendant_rate_deg_per_second':round(ascendant_rate,10)}
    return frames

cases=[]
for stamp,latitude,lon in [('1950-01-01T12:00:00Z',51.5,-.12),('1988-10-09T12:30:00Z',31.2304,121.4737),('2000-01-01T12:00:00Z',-33.8688,151.2093),('2026-10-29T12:00:00Z',34.0522,-118.2437),('2050-01-01T12:00:00Z',51.5,-.12)]:
    birth=datetime.fromisoformat(stamp.replace('Z','+00:00'))
    sun=longitude(birth,swe.SUN);low,high=70.,110.
    for _ in range(50):
        days=(low+high)/2
        if (sun-longitude(birth-timedelta(days=days),swe.SUN))%360<88:low=days
        else:high=days
    design=birth-timedelta(days=(low+high)/2)
    cases.append({'timestamp':stamp,'latitude':latitude,'longitude':lon,'design_timestamp':design.isoformat(),'personality':reference(birth,latitude,lon),'design':reference(design,latitude,lon)})
payload={'reference':'Swiss Ephemeris '+swe.version,'binding':'pyswisseph 2.10.3.2','ephemeris':'built-in Moshier (FLG_MOSEPH), apparent geocentric ecliptic of date','sidereal':'SIDM_FAGAN_BRADLEY','houses':'equal (E), eastern ascendant','scope':'Five fixed timestamps and locations, plus independently solved prior 88-degree solar design times. Numerical checks do not validate personality or resonance claims.','cases':cases}
path=Path(__file__).resolve().parents[1]/'tests/fixtures/ephemeris-reference.json'
path.write_text(json.dumps(payload,indent=2)+'\n')
print(path)
