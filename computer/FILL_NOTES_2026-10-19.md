# Fill notes, 2026-10-19 (branch fill/synthai-20261019, local only, not pushed)

Additions only: services/verified-wheel-provider.mjs, tests/verified-wheel-provider.test.mjs, this file.
No existing file, donor or submodule was edited; address-service routing is unchanged.

## Added
- `resolveFromLongitude(lon, {planet, ayanamsaDeg})`: 13-field contract address from a tropical longitude on the verified wheel (gate 41 at 302.0; research/hd-math-verification.md s.1; Black Book 1991 p.16). dimension/arc/house stay null per the contract.
- `compareWithDonor(lon)`: read-only side-by-side with donor `longitudeToHD`.
- `VERIFIED_WHEEL_ANCHOR`: a 4th anchor variant next to the donor's three CONFLICT claims.

## Test evidence
`npm test` (with python3 + ephem on PATH and the Back-up- submodule initialised): 28/28 pass (23 existing + 5 new), build:computer OK.
Without `git submodule update --init` 13 existing tests fail (donor files missing); without `ephem`, 2 fail (penta runner).

## Flags (not fixed, Alexis decides)
- Donor human-design.js longitudeToHD anchors gate 41 at 58.0 deg; differs from 302.0 at 64/64 gate midpoints. The test fixture "1990-01-01 12:00 UTC" Sun (11 deg 19' Capricorn) reads gate 64 via the donor; the verified wheel gives 38.2.
- SynthAi.HumanDesign/MandalaGeometry.cs derives a 46.75 deg start (recorded by the donor as a CONFLICT variant).
- Penta position formula in donors/recovered/synthai2-ephemeris/ephemeris.py calc_penta is a placeholder hash ((body+mind+heart)%5+1); no rule for it was found in her Drive (searched "Penta" + "Transmitter"; Trinity framework doc has none). investigating.

## investigating
- dimension (the donor's planetaryDimension = DIMENSIONS[index % 5] is labeled PROJECT_HYPOTHESIS H3), arc zero point, house, tropical vs Fagan-Bradley.
- Morph renderer: acceptance-4 reports "renderer NOT FOUND"; not filled (no source for a visual rule).
