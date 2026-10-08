/** Exact angular subdivision. One tick is a quarter angular second, never elapsed time. */
export const GATE_TICKS = 81000;
export const SUBDIVISIONS = Object.freeze([['line',6],['color',6],['tone',6],['base',5]]);
const CIRCLE = 360 * 3600 * 4;
const wrap = n => ((n % CIRCLE) + CIRCLE) % CIRCLE;
export function angularTicks({zodiac,degree,minute=0,second=0,quarter=0}) {
  for (const [name,value,min,max] of [['zodiac',zodiac,1,12],['degree',degree,0,29],['minute',minute,0,59],['second',second,0,59],['quarter',quarter,0,3]]) {
    if (!Number.isInteger(value) || value<min || value>max) throw new RangeError(`Invalid angular ${name}`);
  }
  return ((zodiac-1)*30*3600+degree*3600+minute*60+second)*4+quarter;
}
export function measureGate({source,gate,start,position}) {
  if (!source?.id || !source?.revision) throw new TypeError('Angular measurement requires source id and revision');
  if (!Number.isInteger(gate) || gate<1 || gate>64) throw new RangeError('Invalid gate');
  const origin=angularTicks(start), point=angularTicks(position), offset=wrap(point-origin);
  if (offset>=GATE_TICKS) return {source:structuredClone(source),gate,status:'outside',offsetTicks:offset};
  let remaining=offset, width=GATE_TICKS;
  const coordinates={},workup=[];
  for (const [axis,count] of SUBDIVISIONS) {
    width/=count;
    const index=Math.floor(remaining/width);
    coordinates[axis]=index+1;
    workup.push({axis,position:index+1,widthTicks:width,offsetTicks:remaining});
    remaining-=index*width;
  }
  return {source:structuredClone(source),gate,status:'measured',coordinates,workup,offsetTicks:offset,
    residualTicks:remaining,unit:'quarter-angular-second',interval:'start-inclusive/end-exclusive'};
}
export function reconstructGatePosition({start,coordinates,residualTicks=0}) {
  let width=GATE_TICKS,offset=0;
  for (const [axis,count] of SUBDIVISIONS) {
    const value=coordinates[axis];
    if (!Number.isInteger(value)||value<1||value>count) throw new RangeError(`Invalid ${axis}`);
    width/=count; offset+=(value-1)*width;
  }
  if (!Number.isInteger(residualTicks)||residualTicks<0||residualTicks>=width) throw new RangeError('Invalid residual ticks');
  return wrap(angularTicks(start)+offset+residualTicks);
}
