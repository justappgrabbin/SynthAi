# Independent numerical reference checks

The `anchored-ephemeris-v2` calculator is still the supplied IsoHuman/Astronomy Engine pipeline. It is checked against a small independent Swiss Ephemeris 2.10.03 reference dataset generated with pyswisseph 2.10.3.2 and built-in Moshier calculations. That reference library and its build files are not bundled into the phone app.

Five fixed UTC birth timestamps between 1950 and 2050, with northern and southern locations, produce 520 planetary/node comparisons across personality/design and the four distinct frames. Eastern Ascendants and independently solved prior 88-degree solar design times are checked too. These samples are not a complete date/latitude validation.

The comparison exposed three source-calculator issues: interpolation between lunar crossings was an insufficient instantaneous true node; the Fagan–Bradley J2000 reference/equinox convention needed correction; the Ascendant formula selected the western intersection. Version 2 uses the library's instantaneous lunar position/velocity and true ecliptic rotation, the corrected Fagan reference with nutation, Terrestrial Time for the mean-node polynomial, and the eastern horizon with true obliquity. No empirical calibration to personalities or reported outcomes was applied.

Across the five sampled personality timestamps, the old true-node discrepancy reached 0.2351 degrees. The corrected discrepancy was below 0.006 degrees. Personality Sun discrepancies across Tropical, Mean Draconic and Sidereal samples are tested below 0.001 degrees; True Draconic Sun below 0.01 degrees. General point tolerances are 0.01 degrees, or 0.02 for True Draconic. Ascendant tolerances are 0.003 degrees, or 0.02 for True Draconic. These are stated comparison tolerances, not guaranteed error bounds.

Design timestamps must agree within 60 seconds. Because a small timing difference moves the horizon faster than the planets, design Ascendants are compared at the model epoch using a separately sampled reference angular rate. This separates solar-design timing error from selecting the wrong horizon intersection. The independently solved reference time remains in the fixture.

Fine gate subdivisions can differ near boundaries. For example, one base spans about 0.00521 degrees, smaller than some allowed/reference true-node errors. The app discloses this numerical limit. These checks do not establish Human Design, personality, relationship, or resonance claims.

Saved chart snapshots and observations are not rewritten. New charts carry method revision `anchored-ephemeris-v2`, which changes their configuration fingerprint. The app identifies earlier saved calculations and asks for a new chart using the same birth inputs if the corrected method is wanted. The saved-chart selector lets the owner reopen earlier snapshots and their separate observation/prediction histories.

Run the fixture checks with:

```sh
python -m pytest tests/test_ephemeris_reference.py -q
```

To independently regenerate the small JSON fixture, install `pyswisseph==2.10.3.2` in a separate verification environment and run `python scripts/generate-ephemeris-reference.py`. Normal application/CI checks consume the committed reference numbers without installing that library. Regenerating must not silently change tolerances to accommodate regressions.
