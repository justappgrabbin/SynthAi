const clone=x=>x==null?x:structuredClone(x);
/** Structural + episodic + learned persistence kept separate on purpose. */
export class PersistenceTriad{
  constructor({memory=null}={}){this.memory=memory;}
  structural(value){return this.memory?.remember?.('structural-persistence',clone(value))||clone(value);}
  episodic(value){return this.memory?.remember?.('episodic-traces',clone(value))||clone(value);}
  learned(value){return this.memory?.remember?.('learned-persistence',clone(value))||clone(value);}
  snapshot(){return {structural:(this.memory?.query?.('structural-persistence')||[]).slice(-32),episodic:(this.memory?.query?.('episodic-traces')||[]).slice(-32),learned:(this.memory?.query?.('learned-persistence')||[]).slice(-32)};}
}
export default PersistenceTriad;
