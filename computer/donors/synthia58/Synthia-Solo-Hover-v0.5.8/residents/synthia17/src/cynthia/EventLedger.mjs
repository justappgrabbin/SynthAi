export class EventLedger {
  constructor({maxEvents=4096}={}) { this.maxEvents=maxEvents; this.events=[]; this.sequence=0; }
  append(type,payload={}) { const event=Object.freeze({sequence:++this.sequence,type,payload:structuredClone(payload),previous:this.events.at(-1)?.sequence??null});this.events.push(event);if(this.events.length>this.maxEvents)this.events.shift();return event; }
  replay(){return Object.freeze(this.events.map(x=>structuredClone(x)));}
  snapshot(){return Object.freeze({sequence:this.sequence,events:this.replay()});}
  restore(snapshot){this.sequence=snapshot.sequence??0;this.events=(snapshot.events??[]).map(event=>Object.freeze(structuredClone(event)));return this;}
}
