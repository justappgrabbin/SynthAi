"""One immutable birth configuration shared by all chart-derived features."""
import hashlib
import json

def anchor_geonatal(payload):
    sun = next(p for p in payload['placements'] if p['planetary']=='Sun' and p['frame']=='tropical' and p['orientation']=='personality')
    configuration = {'version':'birth-anchor-v1','birth_utc':payload['timestamp'],'location':payload['location'],'tropical_sun':{k:sun[k] for k in ['longitude','gate','line','color','tone','base']},'methods':payload['methods']}
    fingerprint = hashlib.sha256(json.dumps(configuration,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    return {**configuration,'configuration_id':fingerprint,'reference':'Personality Sun in Tropical','derivation_policy':'chart-derived mechanics are experimental; no psychological validity assumed'}
