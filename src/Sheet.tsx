import { useEffect, useRef, useState } from 'react';
import { Sheet as SheetData, Quest, Metric, AtlasEntry } from './types';
import { deriveSkill, rankOf, DerivedSkill } from './skills';
import { toggleMilestone, setQuestStatus, deleteRow, renameQuest, setPinned, setSkillHidden, insertRows } from './db';
import { AddKind } from './Modal';
import { PickerKind } from './Picker';
import { Timeline } from './Timeline';
import { MetricChart } from './MetricChart';
import { Portrait } from './Portrait';
import { LifeBars } from './LifeBars';
import { Documents } from './Documents';
import { SportsPicker } from './SportsPicker';
import { QuestEdit } from './QuestEdit';
import { MedicalModal } from './MedicalModal';
import { Icon } from './Icon';
import { Counters } from './Counters';
import { Tip } from './Tip';
import { InboxButton } from './Inbox';
import { TabBar } from './TabBar';
import { People } from './People';
import { DueTests } from './DueTests';
import { Toast, ToastMsg } from './Toast';
import { HealthScoreCard } from './HealthScore';
import { Vault } from './Vault';
import { VaultLock, isUnlocked } from './VaultLock';
import { RegionMap, MapModal, MapKind } from './RegionMap';
import { LabsModal } from './LabsModal';
import { CONTINENTS, CONTINENT_OF, TOTAL_COUNTRIES, TOTAL_STATES, TOTAL_PROVINCES, TOTAL_PARKS } from './catalog';

/** Epithets for the auto-generated title under the name. */
const SKILL_GROUPS: [string, string][] = [
  ['body', 'Body'],
  ['sport', 'Sports'],
  ['mind', 'Mind'],
  ['language', 'Languages'],
  ['craft', 'Craft'],
  ['survival', 'Survival'],
  ['world', 'Exploration'],
  ['hobby', 'Hobbies'],
];

const EPITHET: Record<string, string> = {
  Climbing: 'Mountaineer',
  Cardio: 'Ironman',
  Mobility: 'Contortionist',
  Learning: 'Scholar',
  'Jiu-jitsu': 'Grappler',
  Strength: 'Athlete',
  Diving: 'Diver',
  Mandarin: 'Linguist',
  Company: 'Founder',
  Writing: 'Writer',
  Cooking: 'Cook',
  Exploring: 'Explorer',
};

function Meter({ pct, tone, label, hidePct }: { pct: number; tone: string; label?: string; hidePct?: boolean }) {
  return (
    <div className="meter">
      <div className="track" role="img" aria-label={label ?? `${pct.toFixed(0)} percent`}>
        <div className={`fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      {!hidePct && <span className="pct num">{pct.toFixed(0)}%</span>}
    </div>
  );
}

/** Closes whatever is open when you click anywhere outside it. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLSpanElement & HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open, close]);
  return ref;
}

/**
 * Where a reading sits on a population scale, with the 50th, 75th and 90th
 * percentiles marked and the goal shown as a separate caret. A bar that only
 * says in-range or out-of-range cannot show how far you have left to go.
 */
function RangeMeter({ metric, value, showLabels = false }:
  { metric: Metric; value: number; showLabels?: boolean }) {
  const { p50, p75, p90 } = metric;
  const lowerIsBetter = metric.direction === 'lower';
  const goal = lowerIsBetter ? metric.target_high : metric.target_low;

  // Build the scale from whatever anchors exist, padded so nothing sits on an edge.
  const anchors = [p50, p75, p90, goal, value].filter((n): n is number => n != null);
  if (anchors.length < 2) return null;
  let lo = Math.min(...anchors);
  let hi = Math.max(...anchors);
  const pad = (hi - lo) * 0.18 || Math.abs(hi * 0.1) || 1;
  lo -= pad; hi += pad;

  // Always draw worse-to-better left-to-right, whichever way the metric runs.
  const pos = (v: number) => {
    const raw = ((v - lo) / (hi - lo)) * 100;
    return Math.max(0, Math.min(100, lowerIsBetter ? 100 - raw : raw));
  };

  const ticks: [string, number][] = [];
  if (p50 != null) ticks.push(['50', p50]);
  if (p75 != null) ticks.push(['75', p75]);
  if (p90 != null) ticks.push(['90', p90]);

  const reached = goal != null && (lowerIsBetter ? value <= goal : value >= goal);

  return (
    <span className={`pct-meter ${showLabels ? 'labelled' : ''}`}>
      <span className="track">
        {p50 != null && <span className="band" style={{ left: `${pos(p50)}%`, right: 0 }} />}
        {ticks.map(([l, v]) => (
          <span className="tick" key={l} style={{ left: `${pos(v)}%` }}>
            {showLabels && <i>{l}</i>}
          </span>
        ))}
        {goal != null && (
          <span className={`goalpin ${reached ? 'met' : ''}`} style={{ left: `${pos(goal)}%` }}
                title={`Goal ${goal}`} />
        )}
        <span className={`you ${reached ? 'met' : ''}`} style={{ left: `${pos(value)}%` }}
              title={`You: ${value}`} />
      </span>
    </span>
  );
}

/** Roughly where a value falls, for a one-word read. */
function percentileOf(metric: Metric, value: number): number | null {
  const { p50, p75, p90 } = metric;
  if (p50 == null || p75 == null || p90 == null) return null;
  const better = (a: number, b: number) =>
    metric.direction === 'lower' ? a <= b : a >= b;
  if (better(value, p90)) return 90;
  if (better(value, p75)) return 75;
  if (better(value, p50)) return 50;
  return 25;
}

/** The goal in words, rendered in its own column so rows stay aligned. */
function targetText(m: Metric) {
  if (m.direction === 'lower' && m.target_high != null) return `under ${m.target_high}`;
  if (m.direction === 'higher' && m.target_low != null) return `over ${m.target_low}`;
  if (m.target_low != null && m.target_high != null) return `${m.target_low}-${m.target_high}`;
  return '';
}

/** A focus metric: latest reading, which way it moved, and the goal on hover. */
function FocusRow({ metric, sheet, onOpen }:
  { metric: Metric; sheet: SheetData; onOpen: (m: Metric) => void }) {
  const hist = sheet.measurements
    .filter((x) => x.metric_key === metric.key && x.value != null)
    .sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  const latest = hist[0];
  const target = metric.direction === 'lower' && metric.target_high != null
    ? `under ${metric.target_high}`
    : metric.direction === 'higher' && metric.target_low != null
      ? `over ${metric.target_low}`
      : metric.target_low != null && metric.target_high != null
        ? `${metric.target_low}\u2013${metric.target_high}`
        : '';

  const short = metric.label
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/^Bone mineral density$/, 'Bone density')
    .replace(/^Total Testosterone$/, 'Testosterone');

  return (
    <button className="focus-item" onClick={() => onOpen(metric)}
            title={metric.focus_goal ? `${metric.label} \u2014 ${metric.focus_goal}` : metric.label}>
      <span className="fl">{short}</span>
      {latest ? (
        <>
          <span className="num fv">{latest.value}</span>
          <span className="fu">{metric.unit}</span>
          <span className="ftarget d">{target}</span>
        </>
      ) : (
        <span className="d fv">—</span>
      )}
    </button>
  );
}

/** A permanently blank row at the end of a list: type, press Enter, done. */
function NewQuest({ kind, status, track, userId, nextOrder, onAdded }:
  { kind: string; status: string; track: string; userId: string;
    nextOrder: number; onAdded: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await insertRows('cs_quests', [{
        user_id: userId, title, kind, track, phase: '', status,
        completed_on: status === 'done' ? new Date().toISOString().slice(0, 10) : null,
        progress_current: null, progress_total: null, note: '',
        display_order: nextOrder, is_public: true, pinned: false,
      }]);
      setText('');
      onAdded();
    } finally { setBusy(false); }
  };

  return (
    <div className="quest newquest">
      <span className="bx ghost" />
      <input
        className="t"
        value={text}
        placeholder="Add one…"
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add();
          if (e.key === 'Escape') setText('');
        }}
      />
    </div>
  );
}

function toneFor(level: number) {
  if (level >= 65) return 'jade';
  if (level >= 35) return 'gold';
  return 'ember';
}

const yearOf = (d: string | null) => (d ? `'${d.slice(2, 4)}` : '');

function lifeMath(birthday: string | null, span: number) {
  if (!birthday) return null;
  const born = new Date(birthday + 'T00:00:00');
  const days = (Date.now() - born.getTime()) / 86_400_000;
  const years = days / 365.2425;
  return {
    years: Math.floor(years),
    months: Math.floor((years - Math.floor(years)) * 12),
    weeksLived: Math.floor(days / 7),
    weeksTotal: Math.round(span * 52.1775),
    pct: Math.min(100, (years / span) * 100),
  };
}

function SkillRow({ d, onToggle, onHide, onPinRung }:
  { d: DerivedSkill; onToggle: (id: string, v: boolean) => void;
    onHide: (id: string, v: boolean) => void; onPinRung: (id: string, v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const { skill, level, current, next, ladder } = d;
  // Sports and hobbies share one ladder, so naming the next rung adds nothing.
  const generic = skill.category === 'sport' || skill.category === 'hobby';
  return (
    <div className="skill" ref={ref}>
      <div className={`skill-top ${skill.pursuing === false || skill.hidden ? 'dormant' : ''}`}>
        <button className="skill-name" onClick={() => setOpen((v) => !v)}
                title="Click to update level">
          <span className="ic"><Icon name={skill.name} /></span>{skill.name}
        </button>
        <Meter pct={level} tone={toneFor(level)} label={`${skill.name} level ${level}`} hidePct />
        <span className="skill-lvl">{level}</span>
        <span className="skill-rung">
          {current ? <span className="h">{current.label}</span> : <span className="d">Untrained</span>}
          {next && !generic && (
            <>
              <span className="arrow"> → </span>
              <span className="d">{next.label}</span>
            </>
          )}
        </span>
        <button className="help" aria-expanded={open} onClick={() => setOpen((v) => !v)} aria-label={`Levels for ${skill.name}`}>
          ?
        </button>
      </div>
      {open && (
        <div className="ladder">
          <div className="ladder-def">100 = {skill.mastery_def}</div>
          <div className="ladder-src">
            {rankOf(level)} at {level}. Your level is the highest rung ticked; if the next rung
            tracks partial progress, it slides toward it.
          </div>
          {[...ladder].reverse().map((m) => (
            <div key={m.id} className={`rung ${m.achieved ? 'on' : ''} ${m.level === 100 ? 'cap' : ''}`}>
            <button className="rung-hit" onClick={() => onToggle(m.id, !m.achieved)}>
              <span className="box"><span className="bxm">{m.achieved ? '✓' : ''}</span></span>
              <span className="lv">{m.level}</span>
              <span className="lb">
                {m.label}
                {m.achieved_on && <span className="d"> {yearOf(m.achieved_on)}</span>}
                {m.note && <span className="d"> · {m.note}</span>}
              </span>
            </button>
            {m.achieved && (
              <button className={`pin ${m.pinned ? 'on' : ''}`}
                      title={m.pinned ? 'On the card' : 'Add to Biggest accomplishments'}
                      onClick={() => onPinRung(m.id, !m.pinned)}>★</button>
            )}
            </div>
          ))}
          <div className="ladder-pinhint">
            Tick a rung, then use ★ to put it on the card.
          </div>
          <div className="ladder-foot">
            <span className="ladder-hint">Click any rung to tick or untick it — the level follows.</span>
            <button className="archive-btn"
                    onClick={async () => { await onHide(skill.id, !skill.hidden); }}>
              {skill.hidden ? 'unarchive' : 'archive'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Parentheticals and long clinical names wrap; the row must stay on one line. */
const SHORT: Record<string, string> = {
  lean_mass: 'Lean mass',
  bmd_total: 'Bone density',
  waist_circumference: 'Waist',
  blood_pressure_systolic: 'Blood pressure',
  blood_pressure_diastolic: 'Diastolic',
  grip_strength_left: 'Grip, left',
  grip_strength_right: 'Grip, right',
  resting_heart_rate: 'Resting HR',
  vitamin_d_25_oh: 'Vitamin D',
  total_testosterone: 'Testosterone',
  free_testosterone: 'Free testosterone',
  ldl_cholesterol_calculated: 'LDL',
  hdl_cholesterol: 'HDL',
  total_cholesterol: 'Total cholesterol',
  glucose_fasting: 'Glucose',
  insulin_fasting: 'Insulin',
};
const shortLabel = (m: Metric) =>
  SHORT[m.key] ?? m.label.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

function MetricRows({ metrics, sheet, onOpen, why }:
  { metrics: Metric[]; sheet: SheetData; onOpen: (m: Metric) => void; why?: boolean }) {
  if (!metrics.length) return null;
  return (
    <>
      {metrics.map((m) => {
        const latest = sheet.measurements.find((x) => x.metric_key === m.key);
        // Off-target shows as colour on the value, not as extra words.
        let off = false;
        if (latest?.value != null) {
          const v = latest.value;
          off = (m.target_low != null && v < m.target_low)
             || (m.target_high != null && v > m.target_high);
        }
        return (
          <button className="row metric-row" key={m.id} onClick={() => onOpen(m)}
                  title={latest ? `Last ${latest.measured_at}${latest.source ? ` · ${latest.source}` : ''}` : 'No readings'}>
            <span className="k" title={m.label}>{shortLabel(m)}</span>
            <span className="v">
              {latest?.value != null
                ? <b className={`num ${off ? 'y' : ''}`}>{latest.value}</b>
                : <span className="d">—</span>}
            </span>
            <span className="u">{latest?.value != null ? m.unit : 'not recorded'}</span>
            <span className="mcell">
              {latest?.value != null && (m.target_low != null || m.target_high != null) && (
                <RangeMeter metric={m} value={Number(latest.value)} />
              )}
            </span>
            <span className="goal">
              {latest?.value != null && m.percentile_useful
                && percentileOf(m, Number(latest.value)) != null
                ? `${percentileOf(m, Number(latest.value))}th`
                : targetText(m)}
            </span>
            <span className="whycell" onClick={(e) => e.stopPropagation()}>
              {why && m.why ? <Tip body={m.why} /> : null}
            </span>
          </button>
        );
      })}
    </>
  );
}

function ChipList({ items, onRemove, icons }:
  { items: AtlasEntry[]; onRemove: (a: AtlasEntry) => void; icons?: boolean }) {
  if (!items.length) return <p className="d">Nothing recorded yet.</p>;
  // Visited first, then planned - a place you mean to go is not a place you
  // have been, and mixing them makes the list read as more than it is.
  const visited = items.filter((a) => a.state !== 'planned');
  const planned = items.filter((a) => a.state === 'planned');
  const chip = (a: AtlasEntry) => (
    <button className={`chip ${a.state === 'planned' ? 'planned' : ''}`} key={a.id}
            onClick={() => onRemove(a)}
            title={a.state === 'planned' ? 'Planning to go — click to remove' : 'Click to remove'}>
      {icons && <span className="ic"><Icon name={a.name} /></span>}
      {a.name}
      <span className="x">×</span>
    </button>
  );
  return (
    <>
      <div className="chips">{visited.map(chip)}</div>
      {planned.length > 0 && (
        <>
          <div className="planned-head">Planning to go <span className="d">{planned.length}</span></div>
          <div className="chips">{planned.map(chip)}</div>
        </>
      )}
    </>
  );
}

export function Sheet({
  sheet,
  onChanged,
  onAdd,
  onPick,
  userId,
}: {
  sheet: SheetData;
  onChanged: () => void;
  onAdd: (k: AddKind) => void;
  onPick: (k: PickerKind) => void;
  userId: string;
}) {
  const [view, setView] = useState<'character' | 'skills' | 'main' | 'side' | 'world' | 'people' | 'tally' | 'vault' | 'chronicle'>('character');
  const [chart, setChart] = useState<Metric | null>(null);
  const [span, setSpan] = useState(false);
  const [allOpen, setAllOpen] = useState<{ cat: string; title: string } | null>(null);
  const [medOpen, setMedOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState<{ kind: MapKind; title: string } | null>(null);
  // Clicking the map writes immediately, but the chip list below it waits on a
  // full sheet reload. This overlay keeps the two in step.
  const [atlasPending, setAtlasPending] = useState<Record<string, boolean>>({});
  const markPending = (kind: string) => (name: string, on: boolean) =>
    setAtlasPending((v) => ({ ...v, [`${kind}:${name}`]: on }));
  const [sportsOpen, setSportsOpen] = useState<'sport' | 'hobby' | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [editQuest, setEditQuest] = useState<Quest | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [popped, setPopped] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [cardEdit, setCardEdit] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(isUnlocked());

  // The main view carries only what you would actually glance at. Everything
  // else lives one click away rather than in a wall of rows.
  const PRIMARY_BODY = ['weight', 'body_fat', 'lean_mass', 'bmd_total', 'waist_circumference'];
  const PRIMARY_PERF = ['vo2max', 'resting_heart_rate', 'blood_pressure_systolic',
                        'grip_strength_left', 'grip_strength_right'];
  const HEADLINE_LABS = ['apob', 'hba1c', 'hs_crp', 'vitamin_d_25_oh'];
  const pick = (keys: string[]) =>
    keys.map((k) => sheet.metrics.find((m) => m.key === k)).filter(Boolean) as Metric[];
  const p = sheet.profile;
  const allDerived = sheet.skills.map((s) => deriveSkill(s, sheet.milestones)).sort((a, b) => b.level - a.level);
  const derived = showHidden ? allDerived : allDerived.filter((d) => !d.skill.hidden);
  const hiddenCount = allDerived.filter((d) => d.skill.hidden).length;
  const totalLevel = derived.reduce((n, d) => n + d.level, 0);
  const ceiling = derived.length * 100;

  // The title under the name is not typed in - it is the three strongest skills.
  const autoTitle = derived
    .slice(0, 3)
    .map((d) => EPITHET[d.skill.name] ?? d.skill.name)
    .join(' · ');

  const life = lifeMath(p?.birthday ?? null, p?.life_expectancy_years ?? 100);
  const health = lifeMath(p?.birthday ?? null, p?.healthspan_years ?? 80);

  const toggle = async (id: string, v: boolean) => { await toggleMilestone(id, v); onChanged(); };
  const hideSkill = async (id: string, v: boolean) => { await setSkillHidden(id, v); onChanged(); };
  const pinRung = async (id: string, v: boolean) => { await setPinned('cs_skill_milestones', id, v); onChanged(); };
  const celebrate = (q: Quest) => {
    setPopped(q.id);
    window.setTimeout(() => setPopped((p) => (p === q.id ? null : p)), 700);
    setToast({
      id: Date.now(),
      kind: q.kind === 'bucket' ? 'Bucket list complete' : q.kind === 'main' ? 'Main quest complete' : 'Side quest complete',
      title: q.title,
    });
  };

  const cycle = async (q: Quest) => {
    // Bucket list is binary - one click, no in-between state to step through.
    const next = q.kind === 'bucket'
      ? (q.status === 'done' ? 'locked' : 'done')
      : ['locked', 'active', 'done'][(['locked', 'active', 'done'].indexOf(q.status) + 1) % 3];
    if (next === 'done') celebrate(q);
    await setQuestStatus(q.id, next);
    onChanged();
  };
  const removeAtlas = async (a: AtlasEntry) => {
    await deleteRow('cs_atlas', a.id);
    onChanged();
  };

  const active = sheet.quests.filter((q) => q.pinned);
  const accomplishments = sheet.milestones
    .filter((m) => m.achieved && m.pinned)
    .map((m) => ({ m, skill: sheet.skills.find((k) => k.id === m.skill_id) }))
    .filter((x) => x.skill)
    .sort((a, b) => b.m.level - a.m.level);

  // Everything earned but not on the card, hardest first, so the edit view can
  // suggest rather than make you hunt through every ladder.
  const candidates = sheet.milestones
    .filter((m) => m.achieved && !m.pinned)
    .map((m) => ({ m, skill: sheet.skills.find((k) => k.id === m.skill_id) }))
    .filter((x) => x.skill)
    .sort((a, b) => b.m.level - a.m.level)
    .slice(0, 12);

  const focusMetrics = sheet.metrics
    .filter((m) => m.is_focus)
    .sort((a, b) => a.focus_order - b.focus_order);
  const main = sheet.quests.filter((q) => q.kind === 'main');
  const side = sheet.quests.filter((q) => q.kind === 'side');
  const bucket = sheet.quests.filter((q) => q.kind === 'bucket');
  const bucketTracks = [...new Set(bucket.map((q) => q.track))];
  const tracks = [...new Set(side.map((q) => q.track))];
  const sideActive = side.filter((q) => q.status === 'active');
  const sideRest = side.filter((q) => q.status !== 'active');
  const at = (kind: string) => {
    const rows = sheet.atlas.filter((a) => a.kind === kind);
    const have = new Set(rows.map((r) => r.name));
    const added = Object.entries(atlasPending)
      .filter(([k, on]) => on && k.startsWith(`${kind}:`) && !have.has(k.slice(kind.length + 1)))
      .map(([k]) => ({
        id: `pending-${k}`, kind, name: k.slice(kind.length + 1), detail: '',
        state: 'visited', happened_on: null, years: null,
        display_order: 0, is_public: true,
      } as AtlasEntry));
    return [...rows.filter((r) => atlasPending[`${kind}:${r.name}`] !== false), ...added]
      .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
  };
  const lived = at('city_lived');

  const rename = async (q: Quest, title: string) => {
    if (!title.trim() || title === q.title) return;
    await renameQuest(q.id, title.trim());
    onChanged();
  };
  const drop = async (q: Quest) => {
    await deleteRow('cs_quests', q.id);
    onChanged();
  };

  const questRow = (q: Quest) => (
    <div className={`quest ${q.status} ${editMode ? 'editing' : ''} ${dragId === q.id ? 'dragging' : ''}`}
         key={q.id}
         draggable={!editMode}
         onDragStart={(e) => { setDragId(q.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', q.id); }}
         onDragEnd={() => { setDragId(null); setOverStatus(null); }}>
      <button className={`bx ${q.status} ${popped === q.id ? 'pop' : ''}`}
              onClick={() => cycle(q)} aria-label={`Mark ${q.title}`}
              title={q.kind === 'bucket'
                ? (q.status === 'done' ? 'Done — click to undo' : 'Click when you have done it')
                : q.status === 'done' ? 'Done — click to reset'
                : q.status === 'active' ? 'In progress — click to complete'
                : 'Not started — click to begin'}>
        <span className="bxm">{q.status === 'done' ? '✓' : q.status === 'active' ? '◈' : ''}</span>
      </button>
      {editMode ? (
        <>
          <input
            className="t qedit"
            defaultValue={q.title}
            onBlur={(e) => rename(q, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') (e.target as HTMLInputElement).value = q.title;
            }}
          />
          <button className="qmore" onClick={() => setEditQuest(q)} title="More options">…</button>
          <button className="qdel" onClick={() => drop(q)} title="Delete">×</button>
        </>
      ) : (
        <>
          <button className={`pin ${q.pinned ? 'on' : ''}`} title={q.pinned ? 'On the card' : 'Pin to card'}
              onClick={async () => { await setPinned('cs_quests', q.id, !q.pinned); onChanged(); }}>★</button>
      <button className="t" onClick={() => setEditQuest(q)} title="Click to edit">
            {q.title}
            {q.progress_total ? <span className="y num"> {q.progress_current ?? 0}/{q.progress_total}</span> : null}
            {q.note && <span className="d"> · {q.note}</span>}
          </button>
          <span className="yr">{yearOf(q.completed_on)}</span>
        </>
      )}
    </div>
  );

  const dropTo = async (status: string) => {
    const id = dragId;
    setDragId(null);
    setOverStatus(null);
    if (!id) return;
    const q = sheet.quests.find((x) => x.id === id);
    if (!q || q.status === status) return;
    if (status === 'done') celebrate(q);
    await setQuestStatus(id, status);
    onChanged();
  };

  const dropProps = (st: string) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverStatus(st); },
    onDragLeave: () => setOverStatus((v) => (v === st ? null : v)),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); dropTo(st); },
  });

  const kindFor = (list: Quest[]) => list[0]?.kind ?? 'main';
  // One past the highest order in view, so a new quest lands at the bottom
  // rather than tying with everything else on a shared default.
  const nextOrderFor = (list: Quest[]) =>
    (list.length ? Math.max(...list.map((q) => q.display_order)) : 0) + 1;

  const questGroups = (list: Quest[], only?: string[]) => (
    <>
      {([['active', 'In progress'], ['locked', 'Not started'], ['done', 'Done']] as const)
        .filter(([st]) => !only || only.includes(st))
        .map(([st, label]) => {
          const rows = list.filter((q) => q.status === st)
            .sort((a, b) => a.display_order - b.display_order);
          // Finished quests read as a history, so newest first; undated last.
          if (st === 'done') {
            rows.sort((a, b) => {
              if (!a.completed_on && !b.completed_on) return 0;
              if (!a.completed_on) return 1;
              if (!b.completed_on) return -1;
              return b.completed_on.localeCompare(a.completed_on);
            });
          }
          return (
            <div key={st}
                 className={`qgroup ${st} ${overStatus === st ? 'over' : ''} ${dragId ? 'targetable' : ''}`}
                 {...dropProps(st)}>
              <div className="qgroup-head">
                {label} <span className="num">{rows.length}</span>
              </div>
              {rows.map(questRow)}
              {rows.length === 0 && dragId && <div className="qempty">Drop here</div>}
              {editMode && (
                <NewQuest kind={kindFor(list)} status={st} track=""
                          nextOrder={nextOrderFor(list)} onAdded={onChanged} userId={userId} />
              )}
            </div>
          );
        })}
    </>
  );

  const countries = at('country');
  const been = (list: AtlasEntry[]) => list.filter((a) => a.state !== 'planned');
  const byContinent = Object.keys(CONTINENTS).map((c) => ({
    name: c,
    have: countries.filter((x) => CONTINENT_OF[x.name] === c).length,
    total: CONTINENTS[c].length,
  }));

  const TABS = [
    ['character', 'Health', ''],
    ['skills', 'Skills', String(derived.length)],
    ['main', 'Main Quests', `${main.filter((q) => q.status === 'done').length}/${main.length}`],
    ['side', 'Side Quests', `${side.filter((q) => q.status === 'done').length}/${side.length}`],
    ['world', 'Explore', String(been(countries).length)],
    ['people', 'People', ''],
    ['tally', 'Lifetime Stats', String(sheet.counters.filter((c) => c.value != null).length)],
    ['vault', 'Vault', ''],
    ['chronicle', 'Chronicle', ''],
  ] as const;

  return (
    <div className="page">
      {/* ---------------- character card, always shown ---------------- */}
      <div className="card">
        <div className="card-head">
          <Portrait userId={userId} avatarPath={p?.avatar_url ?? null} onChanged={onChanged} />
          <div>
            <div className="card-name">{p?.display_name || '—'}</div>
            <div className="card-title">
              <span className="title-text">{autoTitle || '—'}</span>
              <Tip body={<>Generated from your three highest skills, not typed in:
                {derived.slice(0, 3).map((d) => (
                  <span key={d.skill.id}> <b>{d.skill.name} {d.level}</b> &rarr; {EPITHET[d.skill.name] ?? d.skill.name}.</span>
                ))} It changes as the levels do.</>}>
                <span />
              </Tip>
            </div>
          </div>

        </div>
        <dl className="card-grid">
          <div><dt>Born</dt><dd>{p?.birthday || '—'}{life && <span className="d"> · {life.years}</span>}</dd></div>
          <div><dt>Birthplace</dt><dd>{p?.birthplace || '—'}</dd></div>
          <div>
            <dt>Species</dt>
            <dd>
              {p?.species || '—'} <span className="d">· {p?.ethnicity}</span>
              {p?.other_name && <span className="hanzi">{p.other_name}</span>}
            </dd>
          </div>
          <div><dt>Strongest</dt><dd>{derived.slice(0, 2).map((d) => `${d.skill.name} ${d.level}`).join(', ') || '—'}</dd></div>
        </dl>

        {accomplishments.length > 0 && (
          <div className="card-now">
            <div className="card-now-label">
              Biggest accomplishments
              <button className="card-edit" onClick={() => setCardEdit((v) => !v)}>
                {cardEdit ? 'done' : 'edit'}
              </button>
            </div>
            <div className="accs">
              {accomplishments.map(({ m, skill }) => (
                <span className="acc" key={m.id} title={`${skill!.name} · level ${m.level}`}>
                  <Icon name={skill!.name} />
                  {m.label}
                  {m.achieved_on && <span className="d"> {yearOf(m.achieved_on)}</span>}
                  {cardEdit && (
                    <button className="unpin" title="Remove from card"
                            onClick={async () => { await setPinned('cs_skill_milestones', m.id, false); onChanged(); }}>×</button>
                  )}
                </span>
              ))}
            </div>
            {cardEdit && candidates.length > 0 && (
              <div className="acc-suggest">
                <div className="d">Suggestions, hardest first — click to add</div>
                <div className="accs">
                  {candidates.map(({ m, skill }) => (
                    <button className="acc ghost" key={m.id}
                            title={`${skill!.name} · level ${m.level}`}
                            onClick={async () => { await setPinned('cs_skill_milestones', m.id, true); onChanged(); }}>
                      <Icon name={skill!.name} />
                      {m.label}
                      {m.achieved_on && <span className="d"> {yearOf(m.achieved_on)}</span>}
                      <span className="plus">+</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(active.length > 0 || focusMetrics.length > 0) && (
          <div className="card-now">
            <div className="card-now-label">Currently working on</div>
            <div className="card-now-cols">
              <div>
                {active.map((q) => (
                  <div className="card-now-item" key={q.id}>
                    <span className="gold">◆</span> {q.title}
                    {cardEdit && (
                      <button className="unpin" title="Remove from card"
                              onClick={async () => { await setPinned('cs_quests', q.id, false); onChanged(); }}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="focus-list">
                {focusMetrics.map((m) => (
                  <FocusRow key={m.id} metric={m} sheet={sheet} onOpen={setChart} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <LifeBars />

      <TabBar
        tabs={TABS.map(([id, label, n]) => ({ id, label, count: n }))}
        view={view}
        setView={(v) => setView(v as typeof view)}
        order={p?.tab_order ?? []}
        muted={p?.tab_muted ?? []}
        userId={userId}
        onChanged={onChanged}
      >
        <InboxButton notes={sheet.notes} onChanged={onChanged} />
      </TabBar>

      {/* ---------------- CHARACTER ---------------- */}
      {view === 'character' && (
        <div className="cols">
          <div>
            <HealthScoreCard sheet={sheet} />

            <div className="sec">Vitals</div>
            {life && health && (
              <>
                <div className="row">
                  <span className="k">Age</span>
                  <span className="v"><b className="num">{life.years}</b> <span className="d">yr {life.months} mo</span></span>
                </div>
                <button className="row metric-row" onClick={() => setSpan((v) => !v)}>
                  <span className="k">Healthspan</span>
                  <span className="v grow"><Meter pct={health.pct} tone="jade" label="healthspan elapsed" /></span>
                </button>
                {span && (
                  <>
                    <div className="row">
                      <span className="k d">left</span>
                      <span className="v d">
                        {Math.max(0, (p?.healthspan_years ?? 80) - life.years)} good years of {p?.healthspan_years ?? 80}
                      </span>
                    </div>
                    <div className="row">
                      <span className="k">Lifespan</span>
                      <span className="v grow"><Meter pct={life.pct} tone="arcane" label="lifespan elapsed" /></span>
                    </div>
                    <div className="row">
                      <span className="k d">left</span>
                      <span className="v d">
                        {Math.max(0, (p?.life_expectancy_years ?? 100) - life.years)} years of {p?.life_expectancy_years ?? 100}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="sec">
              <button className="sec-open" onClick={() => setAllOpen({ cat: 'body', title: 'Body' })}>
                Body <span className="more">see all</span>
              </button>
              <span className="count"><button className="add" onClick={() => onAdd('measurement')}>+ record</button></span>
            </div>
            <MetricRows metrics={pick(PRIMARY_BODY)} sheet={sheet} onOpen={setChart} why />

            <div className="sec">
              <button className="sec-open" onClick={() => setAllOpen({ cat: 'performance', title: 'Performance' })}>
                Performance <span className="more">see all</span>
              </button>
            </div>
            <MetricRows metrics={pick(PRIMARY_PERF)} sheet={sheet} onOpen={setChart} why />
          </div>

          <div>
            <DueTests sheet={sheet} />

            <div className="sec">
              Source documents <span className="count">{sheet.documents.length}</span>
            </div>
            <Documents docs={sheet.documents} />

            <div className="sec">
              <button className="sec-open" onClick={() => setAllOpen({ cat: 'labs', title: 'Bloodwork' })}>
                Bloodwork <span className="more">see all 135</span>
              </button>
            </div>
            <MetricRows metrics={pick(HEADLINE_LABS)} sheet={sheet} onOpen={setChart} why />

            <button className="med-line" onClick={() => setMedOpen(true)}>
              <span className="ml-label">Medical history</span>
              <span className="d">
                {sheet.medical.filter((m) => m.kind === 'surgery').length} surgeries ·{' '}
                {sheet.medical.filter((m) => m.kind === 'injury').length} injuries ·{' '}
                {sheet.medical.filter((m) => m.kind === 'allergy').length} allergies
              </span>
              <span className="more">see all</span>
            </button>

          </div>
        </div>
      )}

      {/* ---------------- SKILLS ---------------- */}
      {view === 'skills' && (
        <>
          <div className="sec">
            Skills <span className="count">{totalLevel} of {ceiling}
              <button className="add" style={{ marginLeft: 8 }} onClick={() => setSportsOpen('sport')}>sports</button>
              <button className="add" style={{ marginLeft: 6 }} onClick={() => setSportsOpen('hobby')}>hobbies</button>
              <button className="add" style={{ marginLeft: 6 }} onClick={() => onAdd('skill')}>+ skill</button>
              {hiddenCount > 0 && (
                <button className={`add ${showHidden ? 'on' : ''}`} style={{ marginLeft: 6 }}
                        onClick={() => setShowHidden((v) => !v)}>
                  {showHidden ? 'hide archived' : `${hiddenCount} archived`}
                </button>
              )}
            </span>
          </div>
          {(() => {
            const known = SKILL_GROUPS.map(([c]) => c);
            const blocks = [...SKILL_GROUPS, ['__other', 'Uncategorised'] as [string, string]]
              .map(([cat, label]) => {
                const group = (
                  cat === '__other'
                    ? derived.filter((d) => !known.includes(d.skill.category))
                    : derived.filter((d) => d.skill.category === cat)
                ).filter((d) =>
                  // "Tried it" is level 10 - real, but not worth a row of its own.
                  !((d.skill.category === 'sport' || d.skill.category === 'hobby') && d.level <= 10),
                );
                return { cat, label, group };
              })
              .filter((b) => b.group.length);

            // Balance the two columns by running total height, not by index -
            // Sports is far longer than Mind and alternating looks lopsided.
            const cols: (typeof blocks)[] = [[], []];
            const weight = [0, 0];
            for (const b of blocks) {
              const i = weight[0] <= weight[1] ? 0 : 1;
              cols[i].push(b);
              weight[i] += b.group.length + 2;
            }

            return (
              <div className="cols">
                {cols.map((col, i) => (
                  <div key={i}>
                    {col.map(({ cat, label, group }) => (
                      <div key={cat}>
                        <div className="group-head">
                          {label} <span className="d">{group.length} · {group.reduce((n, d) => n + d.level, 0)} pts</span>
                        </div>
                        {group.map((d) => <SkillRow key={d.skill.id} d={d} onToggle={toggle} onHide={hideSkill} onPinRung={pinRung} />)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* ---------------- QUESTS ---------------- */}
      {view === 'main' && (
        <>
          <div className="subtabs">
            <button className={`add ${editMode ? 'on' : ''}`} style={{ marginLeft: 'auto' }}
                    onClick={() => setEditMode((v) => !v)}>
              {editMode ? 'done editing' : 'edit'}
            </button>
          </div>
          <div className="cols">
            <div>{questGroups(main, ['active', 'locked'])}</div>
            <div>{questGroups(main, ['done'])}</div>
          </div>
        </>
      )}

      {view === 'side' && (
        <>
          <div className="subtabs">
            <button className={`add ${editMode ? 'on' : ''}`} style={{ marginLeft: 'auto' }}
                    onClick={() => setEditMode((v) => !v)}>
              {editMode ? 'done editing' : 'edit'}
            </button>
          </div>
          {sideActive.length > 0 && (
            <div className="qgroup active">
              <div className="qgroup-head">In progress <span className="num">{sideActive.length}</span></div>
              <div className="cols">
                <div>{sideActive.filter((_, i) => i % 2 === 0).map(questRow)}</div>
                <div>{sideActive.filter((_, i) => i % 2 === 1).map(questRow)}</div>
              </div>
            </div>
          )}
          <div className="cols">
            {[0, 1].map((col) => (
              <div key={col}>
                {tracks.filter((_, i) => i % 2 === col).map((t) => {
                  const rows = sideRest.filter((q) => q.track === t);
                  if (!rows.length) return null;
                  const doneN = rows.filter((q) => q.status === 'done').length;
                  return (
                    <div key={t}>
                      <div className="track-name">
                        {t || 'Other'} <span className="d">{doneN}/{rows.length}</span>
                      </div>
                      {rows.filter((q) => q.status !== 'done').map(questRow)}
                      {rows.filter((q) => q.status === 'done').map(questRow)}
                      {editMode && (
                        <NewQuest kind="side" status="locked" track={t}
                                  nextOrder={nextOrderFor(rows)} onAdded={onChanged} userId={userId} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="sec">
            Bucket List
            <span className="count">
              {bucket.filter((q) => q.status === 'done').length}/{bucket.length} · someday, no deadline
            </span>
          </div>
          <div className="cols">
            {[0, 1].map((col) => (
              <div key={col}>
                {bucketTracks.filter((_, i) => i % 2 === col).map((t) => {
                  const rows = bucket.filter((q) => q.track === t);
                  if (!rows.length) return null;
                  return (
                    <div key={t}>
                      <div className="track-name">
                        {t || 'Someday'}{' '}
                        <span className="d">{rows.filter((q) => q.status === 'done').length}/{rows.length}</span>
                      </div>
                      {rows.filter((q) => q.status !== 'done').map(questRow)}
                      {rows.filter((q) => q.status === 'done').map(questRow)}
                      {editMode && (
                        <NewQuest kind="bucket" status="locked" track={t}
                                  nextOrder={nextOrderFor(rows)} onAdded={onChanged} userId={userId} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'world' && (
        <div className="cols">
          <div>
            <div className="sec">
              Places Lived <span className="count"><button className="add" onClick={() => onAdd('city_lived')}>+ place</button></span>
            </div>
            {lived.map((a) => (
              <div className="row" key={a.id}>
                <span className="k num">{a.years ? `${a.years} ${Number(a.years) === 1 ? 'yr' : 'yrs'}` : a.detail || '—'}</span>
                <span className="v">
                  {a.name}
                  {/\bcurrent|returned\b/i.test(a.detail) && <span className="now-tag">here now</span>}
                </span>
              </div>
            ))}

            <div className="sec">
              Countries <span className="count">{been(countries).length} of {TOTAL_COUNTRIES}
                {countries.length - been(countries).length > 0 && (
                  <span className="plannedn"> · {countries.length - been(countries).length} planned</span>
                )}
                <button className="add" style={{ marginLeft: 8 }} onClick={() => setMapOpen({ kind: 'country', title: 'Countries visited' })}>map</button>
                <button className="add" style={{ marginLeft: 6 }} onClick={() => onPick('country')}>list</button>
              </span>
            </div>
            <RegionMap kind="country" visited={countries} userId={userId} onChanged={onChanged}
                       onOptimistic={markPending('country')} />
            {byContinent.map((c) => (
              <div className="row" key={c.name}>
                <span className="k">{c.name}</span>
                <span className="v grow"><Meter pct={(c.have / c.total) * 100} tone={c.have ? 'gold' : 'ember'} label={c.name} />
                </span>
                <span className="num d">{c.have}/{c.total}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="sec">
              US States <span className="count">{been(at('state')).length} of {TOTAL_STATES}
                {at('state').length - been(at('state')).length > 0 && (
                  <span className="plannedn"> · {at('state').length - been(at('state')).length} planned</span>
                )}
                <button className="add" style={{ marginLeft: 8 }} onClick={() => setMapOpen({ kind: 'state', title: 'US states visited' })}>map</button>
                <button className="add" style={{ marginLeft: 6 }} onClick={() => onPick('state')}>list</button>
              </span>
            </div>
            <RegionMap kind="state" visited={at('state')} userId={userId} onChanged={onChanged}
                       onOptimistic={markPending('state')} />
            <ChipList items={at('state')} onRemove={removeAtlas} />

            <div className="sec">
              Chinese Provinces <span className="count">{been(at('province')).length} of {TOTAL_PROVINCES}
                {at('province').length - been(at('province')).length > 0 && (
                  <span className="plannedn"> · {at('province').length - been(at('province')).length} planned</span>
                )}
                <button className="add" style={{ marginLeft: 8 }} onClick={() => setMapOpen({ kind: 'province', title: 'Chinese provinces visited' })}>map</button>
                <button className="add" style={{ marginLeft: 6 }} onClick={() => onPick('province')}>list</button>
              </span>
            </div>
            <RegionMap kind="province" visited={at('province')} userId={userId} onChanged={onChanged}
                       onOptimistic={markPending('province')} />
            <ChipList items={at('province')} onRemove={removeAtlas} />

            <div className="sec">
              National Parks <span className="count">{been(at('park')).length} of {TOTAL_PARKS}
                {at('park').length - been(at('park')).length > 0 && (
                  <span className="plannedn"> · {at('park').length - been(at('park')).length} planned</span>
                )}
                <button className="add" style={{ marginLeft: 8 }} onClick={() => setMapOpen({ kind: 'park', title: 'US national parks' })}>map</button>
                <button className="add" style={{ marginLeft: 6 }} onClick={() => onPick('park')}>list</button>
              </span>
            </div>
            <RegionMap kind="park" visited={at('park')} userId={userId} onChanged={onChanged}
                       onOptimistic={markPending('park')} />
            <ChipList items={at('park')} onRemove={removeAtlas} />

            <div className="sec">
              Animals Seen <span className="count">{at('animal_seen').length} in the wild
                <button className="add" style={{ marginLeft: 8 }} onClick={() => onPick('animal_seen')}>edit</button>
              </span>
            </div>
            <p className="d" style={{ fontSize: 14 }}>In the wild only.</p>
            <ChipList items={at('animal_seen')} onRemove={removeAtlas} icons />

            <div className="sec">
              Animals Eaten <span className="count">{at('animal_eaten').length}
                <button className="add" style={{ marginLeft: 8 }} onClick={() => onPick('animal_eaten')}>edit</button>
              </span>
            </div>
            <ChipList items={at('animal_eaten')} onRemove={removeAtlas} icons />
          </div>
        </div>
      )}

      {/* ---------------- CHRONICLE ---------------- */}
      {view === 'people' && (
        <>
          <div className="sec">People</div>
          <People people={sheet.people} userId={userId} onChanged={onChanged} />
        </>
      )}

      {view === 'tally' && (
        <>
          <div className="sec">Lifetime Stats</div>
          <Counters counters={sheet.counters} atlas={sheet.atlas} userId={userId} onChanged={onChanged} />
        </>
      )}

      {view === 'vault' && (
        <>
          <div className="sec">
            Vault <span className="count">money and belongings</span>
            {vaultOpen && (
              <button className="add" style={{ marginLeft: 'auto' }}
                      onClick={() => { sessionStorage.removeItem('cs-vault-unlocked'); setVaultOpen(false); }}>
                lock
              </button>
            )}
          </div>
          <Vault rows={sheet.money} items={sheet.items} userId={userId}
                 onChanged={onChanged} locked={!vaultOpen}
                 lock={<VaultLock userId={userId} pinHash={p?.vault_pin_hash ?? null}
                                  onUnlock={() => setVaultOpen(true)} compact />} />
        </>
      )}

      {view === 'chronicle' && (
        <>
          <div className="sec">Chronicle <span className="count">still being written</span></div>
          <div className="tl-now">
            <span className="tl-now-dot" />
            <span>{new Date().getFullYear()} — in progress</span>
            <span className="d">{sheet.quests.filter((q) => q.status === 'active').length} quests active</span>
          </div>
          <Timeline sheet={sheet} />

        </>
      )}

      {chart && (
        <MetricChart metric={chart} measurements={sheet.measurements}
                     onClose={() => setChart(null)} onChanged={onChanged} />
      )}
      <Toast msg={toast} onDone={() => setToast(null)} />
      {mapOpen && (
        <MapModal kind={mapOpen.kind} title={mapOpen.title} visited={at(mapOpen.kind)}
                  userId={userId} onChanged={onChanged}
                  onOptimistic={markPending(mapOpen.kind)}
                  onClose={() => setMapOpen(null)} />
      )}
      {medOpen && <MedicalModal sheet={sheet} onClose={() => setMedOpen(false)} />}
      {editQuest && (
        <QuestEdit quest={editQuest} onClose={() => setEditQuest(null)} onSaved={onChanged} />
      )}
      {sportsOpen && (
        <SportsPicker
          userId={userId} skills={sheet.skills} milestones={sheet.milestones}
          mode={sportsOpen} onClose={() => setSportsOpen(null)} onSaved={onChanged}
        />
      )}
      {allOpen && (
        <LabsModal
          sheet={sheet} category={allOpen.cat} title={allOpen.title}
          onClose={() => setAllOpen(null)}
          onOpen={(m) => { setAllOpen(null); setChart(m); }}
        />
      )}
    </div>
  );
}
