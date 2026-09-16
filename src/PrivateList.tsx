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

  const add = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await insertRows('cs_atlas', [{
        user_id: userId, kind, name: name.trim(), detail: '',
        happened_on: when || null, years: null, display_order: 0, is_public: false,
      }]);
      setName(''); setWhen('');
      onChanged();
    } finally { setBusy(false); }
  };

  const remove = async (e: AtlasEntry) => {
    await deleteRow('cs_atlas', e.id);
    onChanged();
  };

  const sorted = [...entries].sort((a, b) =>
    (b.happened_on ?? '').localeCompare(a.happened_on ?? ''));

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
            <div className="row pl-row" key={e.id}>
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
