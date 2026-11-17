import { DIMENSIONS, validateCanonicalAddress } from 'synthia/vendor/spine/src/canonical-address.mjs';
import { colorFor, COLOR_ANCHORS } from 'synthia/vendor/browser/src/state-space/colors.js';
import { soundFor } from 'synthia/vendor/browser/src/state-space/sounds.js';
import { arcSecForAddress } from 'synthia/vendor/browser/src/state-space/addressing.js';

export const ARC_SECOND_NAMES = Object.freeze({Movement:'Axiom',Evolution:'Axon',Being:'Arc Second',Design:'Axis',Space:'Axion'});
export const DIMENSION_ROLES = Object.freeze({Movement:'defining',Evolution:'integrating',Being:'selfish',Design:'exclusive of the fifth dimension',Space:'all of them'});
export function addressPresentation(address,{level=2}={}) {
  validateCanonicalAddress(address);
  const dimension=typeof address.dimension==='number'?DIMENSIONS[address.dimension-1]:address.dimension;
  const visualAddress={...address,planetaryDimension:dimension};
  // The donor's wheel coordinate and the fine Arc Second slot are distinct.
  visualAddress.arcSecond=arcSecForAddress(visualAddress);
  return {
    address:{...address},
    fields:['Planetary','Dimension','Gate','Line','Color','Tone','Base','Degree','Minute','Second',level===2?ARC_SECOND_NAMES[dimension]:'Arc Second','Zodiac','House'],
    role:DIMENSION_ROLES[dimension],
    color:colorFor(visualAddress),colorAnchor:COLOR_ANCHORS[address.color],sound:soundFor(visualAddress),
    provenance:{seenThrough:'Being',comesFrom:'Evolution',mapping:'supplied browser color/sound tables',arcNaming:'user correction; level two only'}
  };
}
