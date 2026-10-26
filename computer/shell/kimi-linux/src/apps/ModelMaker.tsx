import { useEffect, useState } from 'react';

type ModelStatus = {
  id: string; type: string; pretrained: boolean; llm: boolean;
  examples: number; revisions: number; retainedRecords: number;
  distinctContexts: number; semanticTools: string[];
};
type Data = Record<string, unknown>;

async function request(path: string, value?: Data, token?: string) {
  const response = await fetch('/api/synthia/model' + path, {
    method: value ? 'POST' : 'GET',
    headers: {
      ...(value ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'X-Synthia-Owner-Token': token } : {}),
    },
    ...(value ? { body: JSON.stringify(value) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Computer model request failed');
  return data;
}

export default function ModelMaker() {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [mode, setMode] = useState<'meaning' | 'language'>('meaning');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [ownerToken, setOwnerToken] = useState('');
  const [analysis, setAnalysis] = useState<Data | null>(null);
  const [generated, setGenerated] = useState<Data | null>(null);
  const [memory, setMemory] = useState<Data | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => request('').then(setStatus).catch(e => setNotice(String(e)));
  useEffect(() => { void refresh(); }, []);
  async function execute(action: 'meaning' | 'generate' | 'approve' | 'reject') {
    setBusy(true);
    setNotice('');
    try {
      if (!prompt.trim()) throw new Error('Enter the text to examine first.');
      if (action === 'meaning') {
        setAnalysis(await request('/semantic', { text: prompt }));
      } else if (action === 'generate') {
        setGenerated(await request('/generate', { text: prompt }));
      } else {
        if (!answer.trim()) throw new Error('Enter the actual example response to teach.');
        const saved = await request('/teach', {
          prompt, response: answer, accepted: action === 'approve', capability: 'language-response',
        }, ownerToken);
        setNotice(action === 'approve'
          ? 'Approved example stored and learning weights updated.'
          : 'Rejected example recorded. Its response text was not taught to the decoder.');
        setGenerated(null);
        if (saved.model) setStatus(saved.model);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function recall() {
    setBusy(true);
    setNotice('');
    try {
      setMemory(await request('/remember?q=' + encodeURIComponent(prompt), undefined, ownerToken));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const btn: React.CSSProperties = {
    borderRadius: 10, border: '1px solid var(--border-default)', padding: '10px 13px',
    color: 'var(--text-primary)', background: 'var(--bg-titlebar)', cursor: 'pointer',
  };
  const field: React.CSSProperties = {
    background: 'var(--bg-input)', color: 'var(--text-primary)',
    border: '1px solid var(--border-default)', borderRadius: 10,
    width: '100%', padding: '12px', outline: 'none', resize: 'vertical',
  };
  return (
    <div className="h-full overflow-y-auto p-4" style={{ background: 'var(--bg-window)', color: 'var(--text-primary)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Model Maker</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            The real local semantic + learned language interfaces
          </p>
        </div>
        <button style={btn} onClick={() => void refresh()} disabled={busy}>Refresh state</button>
      </div>
      <div className="grid grid-cols-2 gap-3 my-4" style={{ fontSize: 13 }}>
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-titlebar)' }}>
          <strong>Klein meaning</strong>
          <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>AutoLing + DISEMINER (actual tools)</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-titlebar)' }}>
          <strong>Neural + language</strong>
          <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {status ? status.examples + ' approved examples · ' + status.distinctContexts + ' learned contexts' : 'Loading'}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <button style={{ ...btn, background: mode === 'meaning' ? 'var(--accent-primary)' : undefined, color: mode === 'meaning' ? 'white' : undefined }}
          onClick={() => setMode('meaning')}>Understand</button>
        <button style={{ ...btn, background: mode === 'language' ? 'var(--accent-primary)' : undefined, color: mode === 'language' ? 'white' : undefined }}
          onClick={() => setMode('language')}>Speak & learn</button>
      </div>
      <label className="block mb-1" style={{ fontSize: 13 }}>Input / situated utterance</label>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} style={field}
        placeholder="Enter a real question, statement, or correction" />
      {mode === 'meaning' ? (
        <section className="mt-3">
          <button style={{ ...btn, background: 'var(--accent-primary)', color: 'white' }}
            disabled={busy || !prompt.trim()} onClick={() => void execute('meaning')}>Run Klein analysis</button>
          {analysis && <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--bg-titlebar)' }}>
            <strong>Actual analysis and provenance</strong>
            <pre className="mt-2 whitespace-pre-wrap break-words" style={{ fontSize: 11 }}>
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </div>}
        </section>
      ) : (
        <section className="mt-3">
          <button style={{ ...btn, background: 'var(--accent-primary)', color: 'white' }}
            disabled={busy || !prompt.trim()} onClick={() => void execute('generate')}>Generate with learned model</button>
          {generated && <div className="rounded-xl p-3 mt-3" style={{ background: 'var(--bg-titlebar)' }}>
            <strong>{generated.ready ? 'Learned model output' : 'Model is not ready for this question'}</strong>
            <p className="mt-2 whitespace-pre-wrap" style={{ fontSize: 14 }}>
              {generated.ready ? String(generated.text ?? '') : String(generated.reason ?? 'Not trained')}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {generated.ready ? 'From approved language examples, not a pretrained LLM.' : 'No fabricated fallback response.'}
            </p>
          </div>}
          <div className="rounded-xl p-3 mt-4" style={{ border: '1px solid var(--border-default)' }}>
            <strong style={{ fontSize: 14 }}>Teach or correct the model</strong>
            <p className="my-2" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Only you can approve training. Accepted examples adjust the neural intent head
              and word decoder; rejected examples remain recorded, not learned as replies.
            </p>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={3}
              placeholder="Your approved reply or a response to reject" style={field} />
            <input value={ownerToken} onChange={e => setOwnerToken(e.target.value)}
              type="password" autoComplete="off" placeholder="Local owner training token"
              className="mt-2" style={field} />
            <p className="my-2" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Teaching is disabled unless SYNTHIA_OWNER_TOKEN is configured on the Computer host.
              This token is kept only in this open screen, not in browser storage.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button style={{ ...btn, background: 'var(--accent-primary)', color: 'white' }}
                disabled={busy || !answer.trim() || !ownerToken} onClick={() => void execute('approve')}>Approve & learn</button>
              <button style={btn} disabled={busy || !answer.trim() || !ownerToken}
                onClick={() => void execute('reject')}>Reject example</button>
              <button style={btn} disabled={busy || !ownerToken}
                onClick={() => void recall()}>Recall saved memory</button>
            </div>
            {memory && <div className="rounded-xl p-3 mt-3" style={{ background: 'var(--bg-titlebar)' }}>
              <strong style={{ fontSize: 13 }}>Persistent source-attributed memory</strong>
              <pre className="whitespace-pre-wrap break-words mt-2" style={{ fontSize: 11 }}>
                {JSON.stringify(memory, null, 2)}
              </pre>
            </div>
          </div>
        </section>
      )}
      {notice && <p className="my-3" role="status" style={{ fontSize: 12 }}>{notice}</p>}
      <p className="my-4" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        {status ? 'Model revision ' + status.revisions + '. ' + status.retainedRecords +
          ' feedback records preserved. No hosted model or auto-execution.' :
          'Checking model state on this Computer.'}
      </p>
    </div>
  );
}
