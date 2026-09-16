import { useEffect, useRef, useState } from 'react';
import type Anthropic from '@anthropic-ai/sdk';
import { Sheet } from './types';
import { askAgent, Attachment } from './agent';
import { uploadDocument } from './db';

interface Entry {
  who: 'me' | 'sheet';
  text: string;
  actions?: string[];
}

export function Chat({
  apiKey,
  userId,
  sheet,
  onChanged,
  onNeedKey,
}: {
  apiKey: string;
  userId: string;
  sheet: Sheet;
  onChanged: () => void;
  onNeedKey: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [raw, setRaw] = useState<File[]>([]);
  const [open, setOpen] = useState(true);
  const history = useRef<Anthropic.MessageParam[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [entries, busy]);

  const readFile = (file: File) =>
    new Promise<Attachment>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () =>
        resolve({
          name: file.name,
          mediaType: file.type || 'application/octet-stream',
          data: String(r.result).split(',')[1],
        });
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const accept = async (list: FileList | null) => {
    if (!list) return;
    setRaw((r) => [...r, ...[...list]]);
    const ok = [...list].filter(
      (f) => f.type === 'application/pdf' || f.type.startsWith('image/'),
    );
    if (ok.length < list.length) {
      setEntries((e) => [...e, { who: 'sheet', text: 'Only PDFs and images can be read.' }]);
    }
    const read = await Promise.all(ok.map(readFile));
    setFiles((f) => [...f, ...read]);
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !files.length) || busy) return;
    if (!apiKey) {
      onNeedKey();
      return;
    }
    const sending = files;
    const sendingRaw = raw;
    setInput('');
    setFiles([]);
    setRaw([]);
    setEntries((e) => [
      ...e,
      { who: 'me', text: text + (sending.length ? `  [${sending.map((f) => f.name).join(', ')}]` : '') },
    ]);
    setBusy(true);
    try {
      const result = await askAgent(
        apiKey,
        userId,
        sheet,
        history.current,
        text || 'Read the attached report and log everything in it.',
        sending,
      );
      const turns: Anthropic.MessageParam[] = [
        { role: 'user', content: text },
        { role: 'assistant', content: result.text || '(done)' },
      ];
      history.current = [...history.current, ...turns].slice(-12);
      setEntries((e) => [...e, { who: 'sheet', text: result.text, actions: result.actions }]);
      // Keep the originals so a reading can always be traced back to its report.
      for (const f of sendingRaw) {
        try { await uploadDocument(userId, f); } catch { /* reading still logged */ }
      }
      if (result.changed || sendingRaw.length) onChanged();
    } catch (err) {
      setEntries((e) => [
        ...e,
        { who: 'sheet', text: err instanceof Error ? err.message : String(err) },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`console ${open ? '' : 'closed'}`}>
      <div className="console-inner">
        <div className="console-bar">
          <button className="console-toggle" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide prompt ▾' : `Prompt ▴${entries.length ? ` · ${entries.length}` : ''}`}
          </button>
        </div>
        {entries.length > 0 && (
          <div className="log" ref={logRef}>
            {entries.map((e, i) => (
              <div className={`log-entry ${e.who}`} key={i}>
                <span className="who">{e.who === 'me' ? '> ' : '  '}</span>
                {e.text}
                {e.actions?.map((a, j) => (
                  <div className="log-action" key={j}>
                    {'  ✓ '}
                    {a}
                  </div>
                ))}
              </div>
            ))}
            {busy && (
              <div className="log-entry d">
                {'  thinking'} <span className="cursor" />
              </div>
            )}
          </div>
        )}
        {dragging && <div className="drop-hint">Drop a DEXA scan, blood panel or photo to read it</div>}
        {files.length > 0 && (
          <div className="files">
            {files.map((f, i) => (
              <span className="file" key={i}>
                {f.name}
                <button className="x" onClick={() => {
                  setFiles((x) => x.filter((_, j) => j !== i));
                  setRaw((x) => x.filter((_, j) => j !== i));
                }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div
          className={`prompt ${dragging ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files); }}
        >
          <span className="sigil">&#10070;</span>
          <label className="clip" title="Attach a PDF or image">
            &#128206;
            <input
              type="file"
              multiple
              accept="application/pdf,image/*"
              style={{ display: 'none' }}
              onChange={(e) => { accept(e.target.files); e.target.value = ''; }}
            />
          </label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder={
              busy
                ? 'working...'
                : 'Drop a DEXA or blood panel here, or type: got my rescue diver cert'
            }
            disabled={busy}
            aria-label="Tell the sheet what changed"
          />
        </div>
      </div>
    </div>
  );
}
