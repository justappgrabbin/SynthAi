export class EventBus {
  constructor(){ this.handlers = new Map(); }
  on(type, fn){ const s=this.handlers.get(type)||new Set(); s.add(fn); this.handlers.set(type,s); return ()=>s.delete(fn); }
  async emit(type, payload){ for(const fn of this.handlers.get(type)||[]) await fn(payload); }
}
