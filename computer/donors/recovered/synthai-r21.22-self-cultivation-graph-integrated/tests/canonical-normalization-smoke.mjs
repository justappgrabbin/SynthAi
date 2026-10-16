import assert from 'node:assert/strict';
import {SynthiaBridge} from '../canonical-address-runtime/synthia-bridge.js';
import {bridgeToCanonical} from '../core/address-adapter.mjs';
import {validateCanonicalAddress} from '../core/ResidenceContext.mjs';

const bridge = new SynthiaBridge();
const raw = bridge.process({gate:100,line:10,color:8,tone:20,base:9},{planet:99,dimension:9,zodiac:20,house:40});
const address = bridgeToCanonical(raw);

assert.deepEqual(raw.micro,{gate:63,line:5,color:5,tone:5,base:4});
assert.deepEqual(raw.macro,{planet:12,dimension:4,zodiac:11,house:11});
assert.ok(address.gate >= 1 && address.gate <= 64);
assert.ok(address.line >= 1 && address.line <= 6);
assert.ok(address.color >= 1 && address.color <= 6);
assert.ok(address.tone >= 1 && address.tone <= 6);
assert.ok(address.base >= 1 && address.base <= 5);
assert.ok(address.degree >= 0 && address.degree <= 29);
assert.ok(address.minute >= 0 && address.minute <= 59);
assert.ok(address.second >= 0 && address.second <= 59);
assert.ok(address.arc >= 0 && address.arc <= 99);
assert.equal(validateCanonicalAddress(address,{allowPartial:false}).ok,true);
assert.equal(validateCanonicalAddress({...address,degree:30},{allowPartial:false}).ok,false);
console.log('CANONICAL NORMALIZATION PASS:', JSON.stringify(address));
