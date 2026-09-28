import { gatePattern, fuXiDecimalToGate, hexagramName } from '../../../vendor/kimi-state-space/src/merged/kingwen.js';

const requireLines = lines => {
  const set = [...new Set(lines)].sort((a,b)=>a-b);
  if (!set.length || set.some(x=>!Number.isInteger(x)||x<1||x>6)) throw new RangeError('moving lines must be 1..6');
  return set;
};
const decimal = bits => bits.reduce((n,b,i)=>n+(b<<i),0);

export class HexagramStateOrgan {
  transition(gate, movingLines) {
    const moving=requireLines(movingLines), from=gatePattern(gate), to=from.map((bit,i)=>moving.includes(i+1)?1-bit:bit);
    return Object.freeze({ fromGate:gate, toGate:fuXiDecimalToGate(decimal(to)), movingLines:Object.freeze(moving), from, to });
  }
  trajectory(startGate, moves) { let gate=startGate; return moves.map(lines=>{const step=this.transition(gate,lines);gate=step.toGate;return step;}); }
  describe(gate) { const lines=gatePattern(gate); return Object.freeze({gate,name:hexagramName(gate),lines,inner:decimal(lines.slice(0,3)),outer:decimal(lines.slice(3,6)),nuclearInner:decimal(lines.slice(1,4)),nuclearOuter:decimal(lines.slice(2,5))}); }
  shortestPath(a,b) { const x=gatePattern(a),y=gatePattern(b);return Object.freeze(x.flatMap((v,i)=>v===y[i]?[]:[i+1])); }
}

