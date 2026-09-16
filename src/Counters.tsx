import { useState } from 'react';
import { CounterRow } from './types';
import { setCounter } from './db';
import { AtlasEntry } from './types';
import { PrivateList } from './PrivateList';
import { Tip } from './Tip';

const GROUPS: [string, string][] = [
  ['life', 'Life'],
  ['relationships', 'Relationships'],
  ['work', 'Work'],
  ['things', 'Things'],
];

/** Plain tallies. Click a number, type a new one, it saves on blur. */
export function Counters({ counters, atlas, userId, onChanged }:
  { counters: CounterRow[]; atlas: AtlasEntry[]; userId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const intimate = atlas.filter((a) => a.kind === 'intimate');

  const commit = async (c: CounterRow, raw: string) => {
    const v = raw.trim() === '' ? null : Number(raw);
    if (v === c.value || (v !== null && Number.isNaN(v))) return;
    setBusy(c.id);
    try { await setCounter(c.id, v); onChanged(); } finally { setBusy(null); }
  };

  return (
    <div className="cols">
      {listOpen && (
        <PrivateList
          kind="intimate" title="People slept with"
          hint="Add one at a time as you remember them — easier than recounting."
          entries={intimate} userId={userId}
          onClose={() => setListOpen(false)} onChanged={onChanged}
        />
      )}
      {GROUPS.map(([key, label]) => {
        const rows = counters.filter((c) => c.category === key)
          .sort((a, b) => a.display_order - b.display_order);
        if (!rows.length) return null;
        return (
          <div key={key}>
            <div className="group-head">{label}</div>
            {key === 'relationships' && (
              <button className="row counter metric-row" onClick={() => setListOpen(true)}>
                <span className="k">People slept with</span>
                <span className="cnum-static num">{intimate.length || '—'}</span>
                <span className="more">open list</span>
              </button>
            )}
            {rows.map((c) => (
              <div className="row counter" key={c.id}>
                <span className="k">{c.label}</span>
                <input
                  className="cnum num"
                  defaultValue={c.value ?? ''}
                  placeholder="—"
                  inputMode="decimal"
                  disabled={busy === c.id}
                  onBlur={(e) => commit(c, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />
                <span className="d">{c.unit}</span>
                {c.note && <Tip body={c.note} />}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
