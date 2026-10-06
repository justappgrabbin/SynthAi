import { useEffect } from 'react';
import { create } from 'zustand';
import { useConsciousness } from '../lib/stores/useConsciousness';
export const EMPTY_THEME = Object.freeze({});

export const usePhone = create<any>((set) => ({
  session: null, encoding: 'binary', motion: 'idle', controls: {}, position: [0, 1, 0],
  setPosition: (position: number[]) => set({ position }),
  contextualMotion: null, seat: null, interactObject: null,
  setSession: (session: any, encoding: string) => set({ session, encoding }),
  setControl: (name: string, value: boolean) => set((state: any) => ({ controls: { ...state.controls, [name]: value } })),
  setMotion: (motion: string) => set({ motion }),
  reset: () => set({ controls: {} }),
}));

export function publishRealmEvent(event: any) {
  if (window.parent !== window) window.parent.postMessage({ type: 'realm:event', event }, location.origin);
}

export function PhoneBridge() {
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'phone:session') return;
      usePhone.getState().setSession(event.data.session, event.data.encoding);
      const addresses = event.data.session?.profile?.addresses ?? [];
      useConsciousness.setState({ energeticSignature: addresses.map((item: any) => item.expression.source) });
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'realm:ready' }, location.origin);
    const unsubscribe = useConsciousness.subscribe((state, previous) => {
      if (state.activeField !== previous.activeField) publishRealmEvent({ type: 'field-change', field: state.activeField });
    });
    return () => { window.removeEventListener('message', receive); unsubscribe(); };
  }, []);
  return null;
}

export function TouchControls() {
  const setControl = usePhone((state: any) => state.setControl);
  useEffect(() => {
    const reset = () => usePhone.getState().reset();
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    return () => { window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', reset); };
  }, []);
  const button = (name: string, label: string) => <button key={name} aria-label={name}
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setControl(name, true); }}
    onPointerUp={() => setControl(name, false)} onPointerCancel={() => setControl(name, false)}
    onLostPointerCapture={() => setControl(name, false)}>{label}</button>;
  return <div className="phone-controls">
    <div className="phone-dpad">{button('forward', '↑')}{button('leftward', '←')}{button('backward', '↓')}{button('rightward', '→')}</div>
    <div className="phone-actions"><button onClick={() => window.dispatchEvent(new Event('realm-interact'))}>Interact</button>{button('jump', 'Jump')}</div>
  </div>;
}
