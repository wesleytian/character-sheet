import { useState } from 'react';
import { AtlasEntry } from './types';
import { insertRows, deleteRow, updateAtlas } from './db';
import { useEscape } from './useEscape';

/**
 * A counted list you add to one entry at a time - far easier to keep honest
 * than a single number you have to recount. Always private.
 */
export function PrivateList({
  kind, title, hint, entries, userId, onClose, onChanged,
}: {
  kind: string; title: string; hint: string; entries: AtlasEntry[];
  userId: string; onClose: () => void; onChanged: () => void;
}) {
  useEscape(onClose);
  const [name, setName] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null);

  const add = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await insertRows('cs_atlas', [{
        user_id: userId, kind, name: name.trim(), detail: '',
        happened_on: when || null, years: null, display_order: entries.length, is_public: false,
      }]);
      setName(''); setWhen('');
      onChanged();
    } finally { setBusy(false); }
  };

  const remove = async (e: AtlasEntry) => {
    await deleteRow('cs_atlas', e.id);
    onChanged();
  };

  const sorted = [...entries].sort((a, b) => {
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return (b.happened_on ?? '').localeCompare(a.happened_on ?? '');
  });

  const drop = async (targetId: string, after: boolean) => {
    const from = drag;
    setDrag(null); setOver(null);
    if (!from || from === targetId) return;
    const ids = sorted.map((e) => e.id).filter((i) => i !== from);
    const at = ids.indexOf(targetId);
    ids.splice(after ? at + 1 : at, 0, from);
    // Renumber the whole list so the order is stable whatever it was before.
    await Promise.all(ids.map((id, i) => updateAtlas(id, { display_order: i })));
    onChanged();
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="hint">{hint} Private — never shown on a shared sheet.</p>

        <div className="field">
          <div className="two">
            <div>
              <label>Name or initial</label>
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
                     onKeyDown={(e) => e.key === 'Enter' && add()} />
            </div>
            <div>
              <label>When (optional)</label>
              <input type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
          </div>
          <button className="btn primary" onClick={add} disabled={busy}
                  style={{ marginTop: 10 }}>Add</button>
        </div>

        <div className="labs-scroll">
          <div className="panel-head">{entries.length} recorded</div>
          {sorted.map((e) => (
            <div
              className={
                `row pl-row${drag === e.id ? ' dragging' : ''}` +
                (over?.id === e.id ? (over.after ? ' drop-after' : ' drop-before') : '')
              }
              key={e.id}
              draggable
              onDragStart={(ev) => {
                setDrag(e.id);
                ev.dataTransfer.effectAllowed = 'move';
                ev.dataTransfer.setData('text/plain', e.id);
              }}
              onDragEnd={() => { setDrag(null); setOver(null); }}
              onDragOver={(ev) => {
                ev.preventDefault();
                ev.dataTransfer.dropEffect = 'move';
                const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                setOver({ id: e.id, after: ev.clientY > r.top + r.height / 2 });
              }}
              onDrop={(ev) => {
                ev.preventDefault();
                const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                drop(e.id, ev.clientY > r.top + r.height / 2);
              }}
            >
              <span className="pl-grip" title="Drag to reorder">⠿</span>
              <input
                className="qedit pl-when"
                type="date"
                defaultValue={e.happened_on ?? ''}
                onChange={async (ev) => {
                  await updateAtlas(e.id, { happened_on: ev.target.value || null });
                  onChanged();
                }}
              />
              <input
                className="qedit pl-name"
                defaultValue={e.name}
                onBlur={async (ev) => {
                  const v = ev.target.value.trim();
                  if (v && v !== e.name) { await updateAtlas(e.id, { name: v }); onChanged(); }
                }}
                onKeyDown={(ev) => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); }}
              />
              <button className="qdel" onClick={() => remove(e)} title="Remove">×</button>
            </div>
          ))}
          {!entries.length && <p className="d">Nothing yet.</p>}
        </div>

        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
