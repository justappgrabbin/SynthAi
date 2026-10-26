import { useEffect } from 'react';

/** The only active game entrypoint: a full viewport, not an iframe or a faux window. */
export default function LivingWorld() {
  useEffect(() => { window.location.assign('/living-world.html'); }, []);
  return <div className="flex flex-col gap-4 p-5 text-white">
    <h2 className="text-xl font-bold">Synthia — The Living World</h2>
    <p>Opening the saved, playable world in the same Computer.</p>
    <a className="underline" href="/living-world.html">Enter Living World</a>
  </div>;
}
