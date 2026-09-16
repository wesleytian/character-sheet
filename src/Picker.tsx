import { useMemo, useState } from 'react';
import { AtlasEntry } from './types';
import { insertRows, deleteRow } from './db';
import { Icon } from './Icon';
import { CONTINENTS, WILD_ANIMALS, EATEN_ANIMALS, TOTAL_COUNTRIES,
         US_STATES, CHINA_PROVINCES, TOTAL_STATES, TOTAL_PROVINCES,
         PARKS_BY_REGION, TOTAL_PARKS } from './catalog';
import { useEscape } from './useEscape';

export type PickerKind = 'country' | 'animal_seen' | 'animal_eaten' | 'state' | 'province' | 'park';

const CONFIG: Record<PickerKind, { title: string; hint: string; groups: { name: string; items: string[] }[] }> = {
  country: {
    title: 'Countries visited',
    hint: 'Tick what you have set foot in. Grouped by continent.',
    groups: Object.entries(CONTINENTS).map(([name, items]) => ({ name, items })),
  },
  animal_seen: {
    title: 'Animals seen in the wild',
    hint: 'In the wild only — zoos and aquariums do not count. Grouped by how you would have seen it.',
    groups: Object.entries(WILD_ANIMALS).map(([name, items]) => ({ name, items })),
  },
  animal_eaten: {
    title: 'Animals eaten',
    hint: 'Ordered common first, so you can work down the list quickly.',
    groups: EATEN_ANIMALS.map((g) => ({ name: g.group, items: g.items })),
  },
  state: {
    title: 'US states visited',
    hint: 'All 50 plus DC, grouped by region.',
    groups: Object.entries(US_STATES).map(([name, items]) => ({ name, items })),
  },
  province: {
    title: 'Chinese provinces visited',
    hint: 'Provinces, autonomous regions and municipalities.',
    groups: Object.entries(CHINA_PROVINCES).map(([name, items]) => ({ name, items })),
  },
  park: {
    title: 'US national parks',
    hint: 'All 63, grouped by region.',
    groups: Object.entries(PARKS_BY_REGION).map(([name, items]) => ({ name, items })),
  },
};

export function Picker({
  kind,
  userId,
  existing,
  onClose,
  onSaved,
}: {
  kind: PickerKind;
  userId: string;
  existing: AtlasEntry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const cfg = CONFIG[kind];
  const have = useMemo(() => new Map(existing.map((e) => [e.name.toLowerCase(), e])), [existing]);

  useEscape(onClose);


  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(existing.map((e) => e.name)),
  );
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [custom, setCustom] = useState('');

  const toggle = (name: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  const groups = cfg.groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => i.toLowerCase().includes(filter.toLowerCase())),
    }))
    .filter((g) => g.items.length);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const before = new Set(existing.map((e) => e.name));
      const toAdd = [...checked].filter((n) => !before.has(n));
      const toRemove = existing.filter((e) => !checked.has(e.name));

      if (toAdd.length) {
        await insertRows(
          'cs_atlas',
          toAdd.map((name) => ({
            user_id: userId,
            kind,
            name,
            detail: '',
            happened_on: null,
            years: null,
            display_order: 0,
            is_public: true,
          })),
        );
      }
      for (const row of toRemove) await deleteRow('cs_atlas', row.id);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const addCustom = () => {
    const names = custom.split(',').map((n) => n.trim()).filter(Boolean);
    if (!names.length) return;
    setChecked((s) => new Set([...s, ...names]));
    setCustom('');
  };

  const total = kind === 'country' ? TOTAL_COUNTRIES
    : kind === 'state' ? TOTAL_STATES
    : kind === 'province' ? TOTAL_PROVINCES
    : kind === 'park' ? TOTAL_PARKS : null;

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>{cfg.title}</h2>
        <p className="hint">{cfg.hint}</p>

        <div className="field">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            autoFocus
          />
        </div>

        <div className="pick-scroll">
          {groups.map((g) => {
            const on = g.items.filter((i) => checked.has(i)).length;
            return (
              <div key={g.name} className="pick-group">
                <div className="pick-head">
                  {g.name} <span className="d">{on}/{g.items.length}</span>
                </div>
                <div className="pick-items">
                  {g.items.map((i) => (
                    <button
                      key={i}
                      className={`pick ${checked.has(i) ? 'on' : ''}`}
                      onClick={() => toggle(i)}
                    >
                      {(kind === 'animal_seen' || kind === 'animal_eaten') && (
                        <span className="ic"><Icon name={i} /></span>
                      )}
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {[...checked].filter((c) => !cfg.groups.some((g) => g.items.includes(c))).length > 0 && (
            <div className="pick-group">
              <div className="pick-head">Yours <span className="d">not in the list</span></div>
              <div className="pick-items">
                {[...checked]
                  .filter((c) => !cfg.groups.some((g) => g.items.includes(c)))
                  .map((c) => (
                    <button key={c} className="pick on" onClick={() => toggle(c)}>
                      {c}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Not listed? Add your own</label>
          <div className="two">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="Comma-separated"
            />
            <button className="btn" onClick={addCustom}>Add to list</button>
          </div>
        </div>

        {error && <p className="r">{error}</p>}

        <div className="modal-actions">
          <span className="pick-count">
            {checked.size} selected{total ? ` of ${total}` : ''}
            {have.size !== checked.size && <span className="gold"> · unsaved changes</span>}
          </span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
