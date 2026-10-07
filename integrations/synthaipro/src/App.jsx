import { useEffect, useMemo, useState } from 'react';
import AppStudio from './AppStudio.jsx';
import { LocalRuntime } from './runtime/local-runtime.mjs';

const API_BASE = import.meta.env.VITE_SYNTHAI_API_BASE || '';

const modules = [
  { id: 'ingest', icon: '⬢', label: 'Ingest', detail: 'Upload files, zips, code, and app fragments.' },
  { id: 'morph', icon: '✦', label: 'Morph', detail: 'Analyze intent, structure, and executable surface.' },
  { id: 'mount', icon: '▣', label: 'Mount', detail: 'Stage artifacts for the app tray.' },
  { id: 'run', icon: '▶', label: 'Run', detail: 'Open generated apps or backend-backed runners.' }
];

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function App() {
  const [view, setView] = useState('console');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('booting');
  const [files, setFiles] = useState([]);
  const [log, setLog] = useState(['SynthAIPro mobile shell loaded.', 'APK-safe frontend is online.']);
  const [intent, setIntent] = useState('Upload, analyze, regenerate, mount, execute.');

  const fileStats = useMemo(() => {
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    return { count: files.length, totalBytes };
  }, [files]);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const response = await fetch(`${API_BASE}/api/status`);
        if (!response.ok) throw new Error(`health ${response.status}`);
        const data = await response.json();
        if (!cancelled) {
          setStatus(data.structurallyReady ? 'runtime connected' : 'starting');
          setLog((old) => [`Backend connected: ${data.identity?.configured ? 'birth setup complete' : 'birth setup needed'}`, ...old].slice(0, 12));
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('offline shell');
          setLog((old) => [`Backend not reachable in APK shell yet: ${error.message}`, ...old].slice(0, 12));
        }
      }
    }

    checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFiles(event) {
    const selected = Array.from(event.target.files || []);
    setFiles(selected);
    setLog((old) => [`Selected ${selected.length} file(s).`, ...old].slice(0,12));
    try {
      const local = await new LocalRuntime().boot();
      for (const file of selected) {
        try { await local.ingest(file); setLog(old => [`Imported ${file.name}. Open App studio to run it.`, ...old].slice(0,20)); }
        catch (error) { setLog(old => [`${file.name}: ${error.message}`, ...old].slice(0,20)); }
      }
    } catch (error) { setLog(old => [error.message,...old].slice(0,20)); }

  }

  async function sendIntent() {
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: intent, context: { source: 'synthaipro', surface: 'chat' } })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chat failed');
      setLog(old => [result.utterance || result.output || 'Processed',
        ...(result.pipelineTrace ? ['Tools: ' + result.pipelineTrace.map(stage => stage.stage).join(' → ')] : []), ...old].slice(0,20));
    } catch (error) { setLog(old => [error.message + ' · Birth setup is available in Hover.', ...old].slice(0,20)); }
    finally { setBusy(false); }
  }

  if (view === 'studio') return <><nav className="merge-nav"><button onClick={() => setView('console')}>Deploy console</button><a href="/" target="_top">Hover</a></nav><AppStudio /></>;
  if (view === 'morph' || view === 'nexus') return <><nav className="merge-nav"><button onClick={() => setView('console')}>Deploy console</button><a href="/">Hover</a></nav><iframe title={view} className="original-interface" src={view === 'morph' ? './interfaces/morph-system.html' : './interfaces/stellar-nexus-v5.html'} /></>;

  return (
    <main className="os-shell">
      <div className="grid-glow" />
      <section className="status-bar">
        <span className={`pulse ${status.includes('offline') ? 'dormant' : 'active'}`} />
        <strong>SynthAIPro</strong>
        <span className="phase">CONNECTED WORKSPACE</span>
        <span className="spacer" />
        <code>{status}</code>
      </section>

      <section className="desktop">
        <div className="wallpaper">
          <div className="glyph">SYNTH</div>
          <h1>Deploy Core</h1>
          <p>Phone-first upload → analyze → regenerate → mount pipeline.</p>
        </div>

        <article className="window">
          <header className="window-header">
            <strong>Mobile Build Console</strong>
            <span>same local runtime</span>
          </header>

          <div className="window-body">
            <p className="eyebrow">Runtime stack</p>
            <h2>SynthAIPro + Hover</h2>
            <p>
              Chat runs through the same local Synthia tools as Hover. Open the app studio to import, edit, save, and run HTML or JavaScript apps.
            </p>

            <div className="stat-grid">
              <div><strong>{fileStats.count}</strong><span>files staged</span></div>
              <div><strong>{formatBytes(fileStats.totalBytes)}</strong><span>selected size</span></div>
              <div><strong>4</strong><span>core modules</span></div>
              <div><strong>APK</strong><span>target</span></div>
            </div>

            <label className="upload-zone">
              <input type="file" multiple onChange={handleFiles} />
              <strong>Drop or pick files for staging</strong>
              <span>Code, HTML, JSON, docs, and ZIPs can be selected here. Executable regeneration stays controlled by the runtime.</span>
            </label>

            <section className="module-card">
              <span>Intent</span>
              <div className="inline-control">
                <input value={intent} onChange={(event) => setIntent(event.target.value)} />
                <button type="button" disabled={busy} onClick={sendIntent}>{busy ? 'Processing…' : 'Send'}</button>
              </div>
            </section>

            <nav className="inline-control"><a href="/">Open Hover / birth setup</a><button onClick={() => setView('studio')}>App studio</button><button onClick={() => setView('morph')}>Morph interface</button><button onClick={() => setView('nexus')}>Stellar Nexus</button></nav>
            <section className="result-list">
              {modules.map((module) => (
                <div key={module.id}>
                  <strong>{module.icon} {module.label}</strong>
                  <br />
                  <span>{module.detail}</span>
                </div>
              ))}
            </section>

            <section className="terminal">
              <div className="terminal-output">
                {log.map((line, index) => <div key={`${line}-${index}`}>$ {line}</div>)}
              </div>
            </section>
          </div>
        </article>
      </section>

      <nav className="dock">
        {modules.map((module) => (
          <button key={module.id} type="button" onClick={() => module.id === 'morph' ? setView('morph') : setView('studio')}>
            <span>{module.icon}</span>
            <small>{module.label}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}
