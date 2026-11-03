import json
from datetime import datetime
from pathlib import Path
import pytest
from human_design.geonatal import calculate_geonatal

REFERENCE=json.loads((Path(__file__).parent/'fixtures/ephemeris-reference.json').read_text())

def separation(a,b):
    return abs((a-b+180)%360-180)

@pytest.mark.parametrize('case',REFERENCE['cases'],ids=lambda case:case['timestamp'])
def test_chart_frames_and_design_time_against_independent_ephemeris(case):
    actual=calculate_geonatal(case['timestamp'],latitude=case['latitude'],longitude=case['longitude'])
    date=lambda text:datetime.fromisoformat(text.replace('Z','+00:00'))
    design_time_difference=(date(actual['designTimestamp'])-date(case['design_timestamp'])).total_seconds()
    assert abs(design_time_difference)<60
    for side in ['personality','design']:
        for frame,reference in case[side].items():
            chart=actual['charts'][frame]
            # Model-comparison tolerances, not a guarantee over all dates or coordinates.
            tolerance=.02 if frame=='draconic_tropical_true' else .01
            for point in chart[side]:
                error=separation(point['longitude'],reference['positions'][point['planetary']])
                assert error<tolerance,(side,frame,point['planetary'],error)
                if side=='personality' and point['planetary']=='Sun':
                    assert error<(.01 if frame=='draconic_tropical_true' else .001)
            # A small solar-design time difference rotates the horizon much faster
            # than the planets. Compare at the model epoch with the independently
            # sampled local ascendant rate; the time error is checked separately.
            clock_shift=design_time_difference if side=='design' else 0
            expected_asc=reference['ascendant']+reference['ascendant_rate_deg_per_second']*clock_shift
            asc_error=separation(chart[side+'AscendantLongitude'],expected_asc)
            assert asc_error<(.02 if frame=='draconic_tropical_true' else .003),(side,frame,'ascendant',asc_error)
    assert actual['methods']['revision']=='anchored-ephemeris-v2'
