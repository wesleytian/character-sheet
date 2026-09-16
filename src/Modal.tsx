import { useState } from 'react';
import { Metric } from './types';
import { insertRows, updateProfile, addLanguage, addSkill } from './db';
import { useEscape } from './useEscape';

export type AddKind =
  | 'measurement'
  | 'country'
  | 'animal_seen'
  | 'animal_eaten'
  | 'city_lived'
  | 'quest'
  | 'net_worth'
  | 'medical'
  | 'skill';

const TITLES: Record<AddKind, [string, string]> = {
  measurement: ['Record a measurement', 'One dated reading. Every reading is kept, so trends survive.'],
  country: ['Add countries', 'Comma-separated is fine — "Peru, Kenya, Vietnam".'],
  animal_seen: ['Add animals seen', 'Comma-separated is fine.'],
  animal_eaten: ['Add animals eaten', 'Comma-separated is fine.'],
  city_lived: ['Add a place lived', 'Places are listed in the order you lived them.'],
  quest: ['Add a quest', 'Main quests are life direction. Side quests sit in a track.'],
  net_worth: ['Update net worth', 'Entered by hand — Monarch has no public API.'],
  medical: ['Add to medical history', 'Injuries, conditions, surgeries — the things that shaped the body.'],
  skill: ['Add a skill', 'Say what mastery looks like and it gets a ladder. Languages get the standard one automatically.'],
};

export function AddModal({
  kind,
  userId,
  metrics,
  nextPlaceOrder,
  onClose,
  onSaved,
}: {
  kind: AddKind;
  userId: string;
  metrics: Metric[];
  nextPlaceOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  useEscape(onClose);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const [metricKey, setMetricKey] = useState(metrics[0]?.key ?? '');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(today);
  const [source, setSource] = useState('');
  const [names, setNames] = useState('');
  const [years, setYears] = useState('');
  const [title, setTitle] = useState('');
  const [questKind, setQuestKind] = useState<'main' | 'side'>('side');
  const [track, setTrack] = useState('');
  const [status, setStatus] = useState<'locked' | 'active' | 'done'>('locked');
  const [worth, setWorth] = useState('');
  const [medKind, setMedKind] = useState('injury');
  const [bodyPart, setBodyPart] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [note, setNote] = useState('');
  const [skillCat, setSkillCat] = useState('hobby');
  const [mastery, setMastery] = useState('');

  const [heading, hint] = TITLES[kind];
  const metric = metrics.find((m) => m.key === metricKey);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (kind === 'measurement') {
        if (!metricKey || value === '') throw new Error('Pick a metric and enter a value.');
        await insertRows('cs_measurements', [
          {
            user_id: userId,
            metric_key: metricKey,
            value: Number(value),
            unit: metric?.unit ?? '',
            measured_at: date,
            source,
            note: '',
          },
        ]);
      } else if (kind === 'country' || kind === 'animal_seen' || kind === 'animal_eaten') {
        const list = names.split(',').map((n) => n.trim()).filter(Boolean);
        if (!list.length) throw new Error('Enter at least one name.');
        await insertRows(
          'cs_atlas',
          list.map((name) => ({
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
      } else if (kind === 'city_lived') {
        if (!names.trim()) throw new Error('Enter a place.');
        await insertRows('cs_atlas', [
          {
            user_id: userId,
            kind: 'city_lived',
            name: names.trim(),
            detail: '',
            happened_on: null,
            years: years === '' ? null : Number(years),
            display_order: nextPlaceOrder,
            is_public: true,
          },
        ]);
      } else if (kind === 'quest') {
        if (!title.trim()) throw new Error('Enter a title.');
        await insertRows('cs_quests', [
          {
            user_id: userId,
            title: title.trim(),
            kind: questKind,
            track: questKind === 'side' ? track.trim() : '',
            phase: '',
            status,
            completed_on: status === 'done' ? today : null,
            progress_current: null,
            progress_total: null,
            note: '',
            display_order: 999,
            is_public: true,
          },
        ]);
      } else if (kind === 'medical') {
        if (!names.trim()) throw new Error('Name the injury or condition.');
        await insertRows('cs_medical', [
          {
            user_id: userId,
            kind: medKind,
            name: names.trim(),
            body_part: bodyPart,
            happened_on: date,
            resolved_on: null,
            severity,
            note,
            is_public: false,
          },
        ]);
      } else if (kind === 'skill') {
        if (!names.trim()) throw new Error('Name the skill.');
        if (skillCat === 'language') {
          await addLanguage(userId, names.trim());
        } else {
          if (!mastery.trim()) throw new Error('Say what level 100 means.');
          await addSkill(userId, names.trim(), skillCat, mastery.trim());
        }
      } else if (kind === 'net_worth') {
        if (worth === '') throw new Error('Enter an amount.');
        await updateProfile(userId, {
          gold_value: Number(worth),
          gold_updated_at: new Date().toISOString(),
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{heading}</h2>
        <p className="hint">{hint}</p>

        {kind === 'measurement' && (
          <>
            <div className="field">
              <label>Metric</label>
              <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
                {metrics.map((m) => (
                  <option key={m.id} value={m.key}>
                    {m.label} {m.unit ? `(${m.unit})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <div className="two">
                <div>
                  <label>Value {metric?.unit ? `· ${metric.unit}` : ''}</label>
                  <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" autoFocus />
                </div>
                <div>
                  <label>Measured on</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="field">
              <label>Source</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="DEXA, Function Health, scale…" />
            </div>
          </>
        )}

        {(kind === 'country' || kind === 'animal_seen' || kind === 'animal_eaten') && (
          <div className="field">
            <label>Names</label>
            <textarea rows={3} value={names} onChange={(e) => setNames(e.target.value)} autoFocus />
          </div>
        )}

        {kind === 'city_lived' && (
          <div className="field">
            <div className="two">
              <div>
                <label>Place</label>
                <input value={names} onChange={(e) => setNames(e.target.value)} placeholder="Kyoto, Japan" autoFocus />
              </div>
              <div>
                <label>Years there</label>
                <input value={years} onChange={(e) => setYears(e.target.value)} inputMode="decimal" />
              </div>
            </div>
          </div>
        )}

        {kind === 'quest' && (
          <>
            <div className="field">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <div className="two">
                <div>
                  <label>Kind</label>
                  <select value={questKind} onChange={(e) => setQuestKind(e.target.value as 'main' | 'side')}>
                    <option value="side">Side quest</option>
                    <option value="main">Main quest</option>
                  </select>
                </div>
                <div>
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as 'locked' | 'active' | 'done')}>
                    <option value="locked">Not started</option>
                    <option value="active">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            </div>
            {questKind === 'side' && (
              <div className="field">
                <label>Track</label>
                <input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="Adventuring, Strength, Diving…" />
              </div>
            )}
          </>
        )}

        {kind === 'medical' && (
          <>
            <div className="field">
              <label>What happened</label>
              <input value={names} onChange={(e) => setNames(e.target.value)} placeholder="Torn ACL, hyponatremia…" autoFocus />
            </div>
            <div className="field">
              <div className="two">
                <div>
                  <label>Kind</label>
                  <select value={medKind} onChange={(e) => setMedKind(e.target.value)}>
                    <option value="injury">Injury</option>
                    <option value="condition">Condition</option>
                    <option value="surgery">Surgery</option>
                    <option value="allergy">Allergy</option>
                  </select>
                </div>
                <div>
                  <label>When</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="field">
              <div className="two">
                <div>
                  <label>Body part</label>
                  <input value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} placeholder="Left knee" />
                </div>
                <div>
                  <label>Severity</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="major">Major</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="field">
              <label>Note</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </>
        )}

        {kind === 'skill' && (
          <>
            <div className="field">
              <div className="two">
                <div>
                  <label>Skill</label>
                  <input value={names} onChange={(e) => setNames(e.target.value)} placeholder="Surfing, Chess, Japanese…" autoFocus />
                </div>
                <div>
                  <label>Section</label>
                  <select value={skillCat} onChange={(e) => setSkillCat(e.target.value)}>
                    <option value="body">Body</option>
                    <option value="sport">Sport</option>
                    <option value="mind">Mind</option>
                    <option value="language">Language</option>
                    <option value="craft">Craft</option>
                    <option value="survival">Survival</option>
                    <option value="world">Exploration</option>
                    <option value="hobby">Hobby</option>
                  </select>
                </div>
              </div>
            </div>
            {skillCat === 'language' ? (
              <p className="hint">Languages get the standard ladder automatically: survival phrases → conversation → newspaper → novel → business → native.</p>
            ) : (
              <div className="field">
                <label>What does level 100 mean?</label>
                <input value={mastery} onChange={(e) => setMastery(e.target.value)} placeholder="Surf a double-overhead reef break" />
                <p className="hint" style={{ marginTop: 6 }}>
                  You get a six-rung scaffold. Tell the prompt below to rewrite the rungs once it exists.
                </p>
              </div>
            )}
          </>
        )}

        {kind === 'net_worth' && (
          <div className="field">
            <label>Amount (USD)</label>
            <input value={worth} onChange={(e) => setWorth(e.target.value)} inputMode="decimal" autoFocus />
          </div>
        )}

        {error && <p className="r">{error}</p>}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
