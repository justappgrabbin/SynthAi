import { useEffect, useState } from 'react';
import { LocalRuntime } from './runtime/local-runtime.mjs';

export default function App() {
  const [runtime, setRuntime] = useState(null);
  const [apps, setApps] = useState([]);
  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('My first app');
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('Starting local JavaScript runtime…');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    new LocalRuntime().boot().then(instance => {
      if (active) { setRuntime(instance); setApps(instance.list()); setMessage('Local runtime ready. Apps are saved on this device.'); }
    }).catch(error => { if (active) setMessage(`Startup failed: ${error.message}`); });
    return () => { active = false; };
  }, []);
  function select(app) { setSelected(app); setSource(app.source); setPreview(null); }
  async function action(work) {
    setBusy(true);
    try { await work(); setApps(runtime.list()); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/html' }));
    const link = document.createElement('a'); link.href = url; link.download = `${selected.name.replace(/[^a-z0-9_-]/gi, '_')}.html`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main className="studio">
    <header><span className="eyebrow">SynthAIPro · JavaScript</span><h1>Build. Change. Run.</h1><p>A local workspace for apps you can edit and grow.</p></header>
    <p role="status">{message}</p>
    <section className="module-card"><label htmlFor="title">New app name</label><div className="inline-control">
      <input id="title" value={title} onChange={e => setTitle(e.target.value)} />
      <button disabled={!runtime || busy} onClick={() => action(async () => { const app = await runtime.build(title); select(app); setMessage('Starter app built locally. Edit its source below.'); })}>Build starter</button>
    </div><p>This builder creates an editable template. It does not yet turn arbitrary requests into programs.</p>
      <label>Import HTML or JavaScript<input type="file" accept=".html,.htm,.js,.mjs" multiple disabled={!runtime || busy} onChange={e => { const files = [...e.target.files]; e.target.value = ''; action(async () => { for (const file of files) { select(await runtime.ingest(file)); } setMessage(`Imported ${files.length} app(s).`); }); }} /></label>
    </section>
    <section className="module-card"><h2>Your apps</h2><div className="inline-control">{apps.map(app => <button key={app.id} disabled={busy} onClick={() => select(app)}>{app.name}</button>)}</div>{!apps.length && <p>Build a starter or import a file to begin.</p>}</section>
    {selected && <section className="module-card"><h2>{selected.name}</h2><label htmlFor="source">App source</label>
      <textarea id="source" className="source-editor" spellCheck="false" value={source} onChange={e => { setSource(e.target.value); setPreview(null); }} />
      <div className="inline-control"><button disabled={busy} onClick={() => action(async () => { const app = await runtime.save({ ...selected, source }); setSelected(app); setMessage('Changes saved on this device.'); })}>Save</button><button onClick={() => setPreview({ source, key: Date.now() })}>Run</button><button onClick={() => setPreview(null)}>Stop</button><button onClick={download}>Export HTML</button></div>
      {preview && <iframe key={preview.key} title={`${selected.name} preview`} sandbox="allow-scripts" srcDoc={preview.source} className="app-preview" />}
    </section>}
  </main>;
}
