import { useMemo, useState } from 'react';
import { Skill, SkillMilestone } from './types';
import { SPORTS, HOBBIES, SPORT_LADDER } from './catalog';
import { Icon } from './Icon';
import { setSportLevel } from './db';
import { SPORT_CRITERIA, SPORT_CRITERIA_DEFAULT } from './catalog';
import { useEscape } from './useEscape';

/**
 * Two steps on purpose: choosing which sports you do is a different decision
 * from rating yourself at each, and mixing them makes both slower.
 */
export function SportsPicker({
  userId, skills, milestones, onClose, onSaved, mode = 'sport',
}: {
  userId: string; skills: Skill[]; milestones: SkillMilestone[];
  onClose: () => void; onSaved: () => void; mode?: 'sport' | 'hobby';
}) {
  const CATALOG = mode === 'sport' ? SPORTS : HOBBIES;
  const heading = mode === 'sport' ? 'Sports' : 'Hobbies';
  const current = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of skills.filter((x) => x.category === mode)) {
      map[s.name] = milestones
        .filter((m) => m.skill_id === s.id && m.achieved)
        .reduce((n, m) => Math.max(n, m.level), 0);
    }
    return map;
  }, [skills, milestones, mode]);

  useEscape(onClose);


  const [step, setStep] = useState<1 | 2>(1);
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(Object.keys(current).filter((k) => current[k] > 0)),
  );
  const [levels, setLevels] = useState<Record<string, number>>(current);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDoneCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (sport: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(sport)) n.delete(sport);
      else {
        n.add(sport);
        setLevels((l) => ({ ...l, [sport]: l[sport] || 25 }));
      }
      return n;
    });

  const chosen = [...picked].sort();

  const save = async () => {
    setBusy(true); setError('');
    try {
      const target: Record<string, number> = {};
      for (const s of chosen) target[s] = levels[s] || 25;
      for (const s of Object.keys(current)) if (!picked.has(s)) target[s] = 0;

      const work = Object.entries(target).filter(([k, v]) => (current[k] ?? 0) !== v);
      setTotal(work.length);
      setDoneCount(0);
      // Each sport is several round-trips, so run them in parallel batches -
      // one at a time made 20 sports look like a hang.
      const SIZE = 5;
      for (let i = 0; i < work.length; i += SIZE) {
        await Promise.all(
          work.slice(i, i + SIZE).map(([sport, level]) => setSportLevel(userId, sport, level, mode)),
        );
        setDoneCount(Math.min(work.length, i + SIZE));
      }
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>{heading}</h2>

        <div className="steps">
          <button className={`step ${step === 1 ? 'on' : ''}`} onClick={() => setStep(1)}>
            1 · Which do you play <span className="n">{picked.size}</span>
          </button>
          <button className={`step ${step === 2 ? 'on' : ''}`} onClick={() => setStep(2)}
                  disabled={!picked.size}>
            2 · How good are you
          </button>
        </div>

        {step === 1 ? (
          <>
            <p className="hint">Tick everything you do. Levels come next.</p>
            <div className="field">
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" autoFocus />
            </div>
            <div className="pick-scroll">
              {Object.entries(CATALOG).map(([group, items]) => {
                const rows = items.filter((i) => i.toLowerCase().includes(filter.toLowerCase()));
                if (!rows.length) return null;
                return (
                  <div className="pick-group" key={group}>
                    <div className="pick-head">
                      {group} <span className="d">{rows.filter((r) => picked.has(r)).length}/{rows.length}</span>
                    </div>
                    <div className="pick-items">
                      {rows.map((sport) => (
                        <button key={sport} className={`pick ${picked.has(sport) ? 'on' : ''}`}
                                onClick={() => toggle(sport)}>
                          <span className="ic"><Icon name={sport} /></span>{sport}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="hint">One shared scale, so Advanced means the same in every sport.</p>
            <div className="pick-scroll lvgrid">
              {chosen.map((sport) => (
                <div className={`lvrow ${open === sport ? 'open' : ''}`} key={sport}>
                  <span className="lvname">
                    <span className="ic"><Icon name={sport} /></span>{sport}
                    <button className="help" aria-label={`What the levels mean for ${sport}`}
                            onClick={() => setOpen(open === sport ? null : sport)}>?</button>
                  </span>
                  <span className="lvseg">
                    {SPORT_LADDER.map(([label, lv]) => (
                      <button key={lv}
                              className={`seg ${(levels[sport] || 25) === lv ? 'on' : ''}`}
                              onClick={() => setLevels((l) => ({ ...l, [sport]: lv }))}>
                        {label}
                      </button>
                    ))}
                  </span>
                  {open === sport && (
                    <div className="crit">
                      {SPORT_LADDER.filter(([, lv]) => lv > 10).map(([label], i) => (
                        <div className="crit-row" key={label}>
                          <span className="cl">{label}</span>
                          <span className="cv">
                            {(SPORT_CRITERIA[sport] ?? SPORT_CRITERIA_DEFAULT)[i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {error && <p className="r">{error}</p>}

        <div className="modal-actions">
          <span className="pick-count">{picked.size} {mode === 'sport' ? 'sports' : 'hobbies'}</span>
          <button className="btn" onClick={onClose}>Cancel</button>
          {step === 1 ? (
            <button className="btn primary" onClick={() => setStep(2)} disabled={!picked.size}>
              Next: levels
            </button>
          ) : (
            <button className="btn primary" onClick={save} disabled={busy}>
              {busy ? (total ? `Saving ${done}/${total}…` : 'Saving…') : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
