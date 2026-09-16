import { useEffect, useMemo, useState } from 'react';
import { PersonRow } from './types';
import { loadFriends, refreshFriends, Friend } from './crm';
import { insertRows, deleteRow, updateRow } from './db';

/**
 * Two lists. The top one is yours: hand-curated, ordered how you want, and it
 * does not move when the CRM ranking shifts. The bottom is the CRM's view of
 * who you actually talk to — drag anyone up to keep them.
 */
export function People({
  people, userId, onChanged,
}: { people: PersonRow[]; userId: string; onChanged: () => void }) {
  const [crm, setCrm] = useState<Friend[] | null | 'loading'>('loading');
  const [drag, setDrag] = useState<{ name: string; from: 'top' | 'crm' } | null>(null);
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null);
  const [overTop, setOverTop] = useState(false);
  const [adding, setAdding] = useState('');

  useEffect(() => { loadFriends(200).then(setCrm); }, []);

  const mine = useMemo(
    () => [...people].sort((a, b) => a.display_order - b.display_order),
    [people],
  );
  const mineNames = useMemo(
    () => new Set(mine.map((p) => p.name.toLowerCase())),
    [mine],
  );

  const rest = crm === 'loading' || crm === null
    ? []
    : crm.filter((f) => !mineNames.has(f.name.toLowerCase())).slice(0, 30);

  const add = async (name: string, at = mine.length) => {
    const clean = name.trim();
    if (!clean || mineNames.has(clean.toLowerCase())) return;
    const ids = mine.map((p) => p.id);
    await insertRows('cs_people', [{
      user_id: userId, name: clean, relation: '', note: '',
      display_order: at, is_public: false,
    }]);
    // Push everyone at or below the insertion point down one.
    await Promise.all(
      ids.slice(at).map((id, i) => updateRow('cs_people', id, { display_order: at + i + 1 })),
    );
    onChanged();
  };

  const reorder = async (targetId: string, after: boolean) => {
    const d = drag;
    setDrag(null); setOver(null); setOverTop(false);
    if (!d) return;

    const ids = mine.filter((p) => p.name !== d.name).map((p) => p.id);
    const at = ids.indexOf(targetId);
    const insertAt = at === -1 ? ids.length : after ? at + 1 : at;

    if (d.from === 'crm') { await add(d.name, insertAt); return; }

    const moving = mine.find((p) => p.name === d.name);
    if (!moving) return;
    ids.splice(insertAt, 0, moving.id);
    await Promise.all(ids.map((id, i) => updateRow('cs_people', id, { display_order: i })));
    onChanged();
  };

  return (
    <div className="cols">
      <div>
        <div className="group-head">
          Your people <span className="d">{mine.length} · ordered by you</span>
        </div>

        <div
          className={`people-drop ${overTop && drag?.from === 'crm' ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverTop(true); }}
          onDragLeave={() => setOverTop(false)}
          onDrop={(e) => { e.preventDefault(); if (drag?.from === 'crm') add(drag.name); setDrag(null); setOverTop(false); }}
        >
          {mine.map((p) => (
            <div
              key={p.id}
              className={
                `row person${drag?.name === p.name ? ' dragging' : ''}` +
                (over?.id === p.id ? (over.after ? ' drop-after' : ' drop-before') : '')
              }
              draggable
              onDragStart={(e) => {
                setDrag({ name: p.name, from: 'top' });
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', p.name);
              }}
              onDragEnd={() => { setDrag(null); setOver(null); }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setOver({ id: p.id, after: e.clientY > r.top + r.height / 2 });
              }}
              onDrop={(e) => {
                e.preventDefault();
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                reorder(p.id, e.clientY > r.top + r.height / 2);
              }}
            >
              <span className="pl-grip">⠿</span>
              <input
                className="qedit person-name"
                defaultValue={p.name}
                onBlur={async (e) => {
                  const v = e.target.value.trim();
                  if (v && v !== p.name) { await updateRow('cs_people', p.id, { name: v }); onChanged(); }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              />
              <input
                className="qedit person-rel"
                defaultValue={p.relation}
                placeholder="relation"
                onBlur={async (e) => {
                  const v = e.target.value.trim();
                  if (v !== p.relation) { await updateRow('cs_people', p.id, { relation: v }); onChanged(); }
                }}
              />
              <button className="qdel" title="Remove"
                      onClick={async () => { await deleteRow('cs_people', p.id); onChanged(); }}>×</button>
            </div>
          ))}
          {!mine.length && (
            <p className="d slot-empty">Drag someone up from below, or add them here.</p>
          )}
        </div>

        <div className="row" style={{ marginTop: 8 }}>
          <input
            className="qedit"
            value={adding}
            placeholder="Add someone by name"
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') { await add(adding); setAdding(''); }
            }}
          />
          <button className="btn" onClick={async () => { await add(adding); setAdding(''); }}>Add</button>
        </div>
      </div>

      <div>
        <div className="group-head">
          From your CRM <span className="d">most contact, last 12 months</span>
        </div>
        {crm === 'loading' && <p className="d">Reading the CRM…</p>}
        {crm === null && (
          <p className="offline">
            CRM is not answering on 127.0.0.1:5555. Start it with <code>~/projects/crm/run.sh</code>.
          </p>
        )}
        {rest.map((f) => (
          <div
            key={f.id}
            className={`row person crm ${drag?.name === f.name ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => {
              setDrag({ name: f.name, from: 'crm' });
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', f.name);
            }}
            onDragEnd={() => { setDrag(null); setOver(null); setOverTop(false); }}
            onDoubleClick={() => add(f.name)}
            title="Drag up, or double-click, to keep"
          >
            <span className="pl-grip">⠿</span>
            <span className="v person-name">{f.name}</span>
            <button className="add" onClick={() => add(f.name)}>keep</button>
          </div>
        ))}
        {crm !== 'loading' && crm !== null && (
          <div className="src-line">
            <button className="src-link"
                    onClick={() => { refreshFriends(); setCrm('loading'); loadFriends(200).then(setCrm); }}>
              refresh from CRM
            </button>
            <a href="http://127.0.0.1:5555" target="_blank" rel="noopener" className="src-link">open CRM</a>
          </div>
        )}
      </div>
    </div>
  );
}
