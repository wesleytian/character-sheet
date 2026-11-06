import { useState } from 'react';
import { AtlasEntry } from './types';
import { upsertRows, deleteRow, updateAtlas } from './db';
import { RegionMap, MapKind } from './RegionMap';
import { Icon } from './Icon';
import { CONTINENTS, WILD_ANIMALS, EATEN_ANIMALS, TOTAL_COUNTRIES,
         US_STATES, CHINA_PROVINCES, TOTAL_STATES, TOTAL_PROVINCES,
         PARKS_BY_REGION, TOTAL_PARKS } from './catalog';
import { useEscape } from './useEscape';

const MAPPED = ['country', 'state', 'province', 'park'];

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

  useEscape(onClose);


  // Three states, not two: off -> visited -> planning to go -> off.
  // Built by hand rather than with Object.fromEntries, which resolves a
  // repeated name to whichever row happens to come last - so a place recorded
  // as both visited and planned would show as planned half the time. Visited
  // wins, matching how the sheet counts.
  const [marks, setMarks] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const e of existing) {
      const state = e.state || 'visited';
      if (m[e.name] !== 'visited') m[e.name] = state;
    }
    return m;
  });
  const checked = new Set(Object.keys(marks));
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cycle = (name: string) =>
    setMarks((m) => {
      const next = { ...m };
      if (!next[name]) next[name] = 'visited';
      else if (next[name] === 'visited') next[name] = 'planned';
      else delete next[name];
      return next;
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
      const before = new Map(existing.map((e) => [e.name, e]));
      const toAdd = Object.entries(marks).filter(([n]) => !before.has(n));
      const toRemove = existing.filter((e) => !marks[e.name]);
      const toUpdate = existing.filter(
        (e) => marks[e.name] && marks[e.name] !== (e.state || 'visited'),
      );

      if (toAdd.length) {
        // Upsert, not insert: `existing` is a snapshot from when the modal
        // opened, so anything ticked on the map behind it is already there.
        await upsertRows(
          'cs_atlas',
          toAdd.map(([name, state]) => ({
            user_id: userId,
            kind,
            name,
            detail: '',
            state,
            happened_on: null,
            years: null,
            display_order: 0,
            is_public: true,
          })),
          'user_id,kind,name',
        );
      }
      for (const row of toUpdate) await updateAtlas(row.id, { state: marks[row.name] });
      for (const row of toRemove) await deleteRow('cs_atlas', row.id);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };


  const total = kind === 'country' ? TOTAL_COUNTRIES
    : kind === 'state' ? TOTAL_STATES
    : kind === 'province' ? TOTAL_PROVINCES
    : kind === 'park' ? TOTAL_PARKS : null;

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>{cfg.title}</h2>
        <p className="hint">
          {cfg.hint}
          {MAPPED.includes(kind) && ' Click once for visited, twice for planning to go.'}
        </p>

        {MAPPED.includes(kind) && (
          <div className="picker-map">
            <RegionMap kind={kind as MapKind} visited={existing} userId={userId}
                       onChanged={onSaved} editable />
          </div>
        )}

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
                      className={`pick ${marks[i] === 'visited' ? 'on' : marks[i] === 'planned' ? 'planned' : ''}`}
                      onClick={() => cycle(i)}
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
        </div>

        {error && <p className="r">{error}</p>}

        <div className="modal-actions">
          <span className="pick-count">
            {Object.values(marks).filter((v) => v === 'visited').length}
            {total ? ` of ${total}` : ' selected'}
            {Object.values(marks).filter((v) => v === 'planned').length > 0 && (
              <span className="gold">
                {' '}· {Object.values(marks).filter((v) => v === 'planned').length} planned
              </span>
            )}
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
