import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { usePhone } from './PhoneBridge';
import { createSpriteMorphPlayer, drawInterpolated } from './SpriteRuntime.mjs';
import { createPhotoMorphPlayer, CORE_STATES } from '@computer/photo-avatar.mjs';

async function coreSpritePlayer(blob: Blob, canvas: HTMLCanvasElement, frameCount: number) {
  const runtime = await createSpriteMorphPlayer(blob, canvas, { frameCount });
  const frames = runtime.frames;
  let from = frames[0], to = frames[0], started = 0;
  runtime.setState = (state: string) => {
    if (runtime.state === state) return;
    runtime.state = state; from = to; started = runtime.time;
    const index = CORE_STATES.indexOf(state === 'talk' ? 'scan' : state);
    to = frames[Math.min(frames.length - 1, Math.max(0, index))];
  };
  runtime.render = () => {
    runtime.ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawInterpolated(runtime.ctx, runtime.bitmap, from, to, Math.max(0, Math.min(1, (runtime.time - started) / .45)), 0, 0, {
      time: runtime.time, walk: runtime.state === 'walk' ? 1 : 0, talk: runtime.state === 'talk' ? 1 : 0,
    });
  };
  return runtime;
}

export function AvatarSkin() {
  const avatar = usePhone((state: any) => state.session?.avatar);
  const motion = usePhone((state: any) => state.motion);
  const color = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.color ?? '#b8ffd8');
  const appearance = usePhone((state: any) => state.session?.world?.contract?.hostExpression);
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<any>(null);
  useEffect(() => {
    let disposed = false;
    const source = avatar?.spriteSheet || avatar?.photo;
    if (!source || !canvas.current) return;
    const load = avatar?.spriteSheet ? fetch(source).then(response => response.blob()).then(blob => disposed ? null : coreSpritePlayer(blob, canvas.current!, avatar.frameCount ?? 1))
      : createPhotoMorphPlayer(source, canvas.current!, { ...appearance?.atmosphere, material: appearance?.material });
    load
      .then(runtime => {
        if (!runtime) return;
        if (disposed) { runtime.bitmap.close(); return; }
        player.current = runtime; runtime.setState(usePhone.getState().motion); runtime.start();
      }).catch(error => console.error('Avatar image could not load:', error.message));
    return () => { disposed = true; player.current?.stop(); player.current?.bitmap.close(); player.current = null; };
  }, [avatar?.spriteSheet, avatar?.photo, avatar?.frameCount, appearance?.material, appearance?.atmosphere?.theme]);
  useEffect(() => { player.current?.setState(motion); }, [motion]);
  if (!avatar?.photo && !avatar?.spriteSheet) return null;
  return <Html position={[0, 0.8, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
    <div className="avatar-morph" style={{ '--host-color': color } as any}><canvas aria-label="Your avatar, morphed for this world" className="avatar-skin" ref={canvas} /></div>
  </Html>;
}
