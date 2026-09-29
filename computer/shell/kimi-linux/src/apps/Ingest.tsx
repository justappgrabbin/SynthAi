import { useEffect, useState } from 'react';
import { FileUp, FolderOpen, Play, RefreshCw } from 'lucide-react';

type Item = {
  path: string; content?: string; addressKey: string; address: { dimension: string; gate: number };
  digest: string; encoding: string; size?: number; dna?: { pieces: number };
};

const readBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

export default function Ingest() {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState('');
  const refresh = async () => {
    const response = await fetch('/api/files');
    if (!response.ok) throw new Error('Could not load computer files.');
    const records = await response.json();
    setItems(records.filter((record: Item) => record.path.startsWith('/home/')).map((record: Item & { meta: Omit<Item, 'path' | 'content'> }) => ({
      ...record.meta, path: record.path,
    })));
  };
  useEffect(() => { refresh().catch((error) => setMessage(String(error))); }, []);

  const ingest = async (selection: FileList | null) => {
    if (!selection?.length) return;
    setBusy(true); setMessage('Reading and addressing files…');
    try {
      let count = 0;
      for (const file of Array.from(selection)) {
        const response = await fetch('/api/ingest', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, base64: await readBase64(file) }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Could not ingest ${file.name}`);
        count += result.items.length;
      }
      await refresh();
      window.dispatchEvent(new Event('synthia-filesystem-refresh'));
      setMessage(`${count} file${count === 1 ? '' : 's'} stored and addressed. Select one to inspect or run.`);
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  };

  const open = async (item: Item) => {
    setOutput(''); setMessage('Activating addressed file…');
    try {
      const response = await fetch(`/api/activate-file?address=${encodeURIComponent(item.addressKey)}&path=${encodeURIComponent(item.path)}`);
      const record = await response.json();
      if (!response.ok) throw new Error(record.error || 'ATO file recall failed.');
      setActive({ ...item, content: record.content });
      setMessage(`Loaded through ${record.activation.automatonId}; exact address and SHA-256 verified.`);
    } catch (error) { setMessage(String(error)); }
  };

  const run = async (item: Item) => {
    setOutput('Executing addressed file…');
    try {
      const response = await fetch('/api/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressKey: item.addressKey, path: item.path }),
      });
      const receipt = await response.json();
      if (!response.ok) throw new Error(receipt.error || 'Execution failed.');
      const result = receipt.result?.result?.result ?? {};
      setOutput([receipt.ok ? 'Execution complete' : 'Execution failed', `Path: ${receipt.path}`, ...(result.stdout || []),
        result.returnValue === undefined ? '' : String(result.returnValue), result.error || ''].filter(Boolean).join('\n'));
    } catch (error) { setOutput(String(error)); }
  };

  return <div className="h-full flex flex-col md:flex-row text-[var(--text-primary)] text-sm">
    <div className="w-full h-2/5 min-h-40 md:h-full md:w-2/5 md:min-w-56 border-b md:border-b-0 md:border-r border-[var(--border-subtle)] flex flex-col">
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <label className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 bg-[var(--accent-primary)] text-white w-fit">
          <FileUp size={18} /> {busy ? 'Importing…' : 'Import files or ZIP'}
          <input type="file" multiple className="hidden" disabled={busy} onChange={(event) => { ingest(event.target.files); event.target.value = ''; }} />
        </label>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">Original bytes are kept. ZIP members receive their own addresses.</p>
      </div>
      <div className="p-2 overflow-auto flex-1">
        {items.map((item) => <button key={item.path} onClick={() => open(item)}
          className="w-full text-left p-2 rounded hover:bg-[var(--bg-hover)] flex gap-2 items-start">
          <FolderOpen size={16} className="shrink-0 mt-0.5" /><span className="truncate" title={item.path}>{item.path.replace('/home/user/', '')}</span>
        </button>)}
        {!items.length && <div className="p-3 text-[var(--text-secondary)]">No files imported yet.</div>}
      </div>
      <button onClick={() => refresh().catch((error) => setMessage(String(error)))} className="p-2 flex gap-2 items-center border-t border-[var(--border-subtle)]"><RefreshCw size={14} /> Refresh</button>
    </div>
    <div className="flex-1 min-w-0 min-h-0 p-3 md:p-5 overflow-auto">
      {message && <p className="mb-4 text-[var(--text-secondary)]">{message}</p>}
      {active ? <>
        <h2 className="font-semibold text-lg break-all">{active.path.split('/').at(-1)}</h2>
        <p className="text-[var(--text-secondary)] break-all mt-2">{active.path}</p>
        <p className="mt-4">{active.address.dimension} · Gate {active.address.gate} · {active.size ?? 0} bytes</p>
        <p className="text-xs text-[var(--text-secondary)] break-all mt-2">SHA-256: {active.digest}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Code DNA pieces: {active.dna?.pieces ?? 0}</p>
        {active.encoding !== 'base64' && <button onClick={() => run(active)} className="flex gap-2 items-center mt-5 px-3 py-2 rounded bg-[var(--accent-primary)] text-white"><Play size={16} /> Run through Synthia</button>}
        {output && <pre className="mt-4 p-3 rounded bg-[var(--bg-titlebar)] whitespace-pre-wrap break-words">{output}</pre>}
        {active.encoding !== 'base64' && <pre className="mt-4 p-3 rounded bg-[var(--bg-titlebar)] whitespace-pre-wrap break-words max-h-72 overflow-auto">{active.content}</pre>}
      </> : <p className="text-[var(--text-secondary)]">Choose a file to inspect its address and content.</p>}
    </div>
  </div>;
}
