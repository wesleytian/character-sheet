import { useEffect, useRef, useState } from 'react';
import { Sheet as SheetData, Quest, Metric, AtlasEntry } from './types';
import { deriveSkill, rankOf, DerivedSkill } from './skills';
import { toggleMilestone, setQuestStatus, deleteRow, renameQuest, setPinned, setSkillHidden, insertRows, updateRow } from './db';
import { AddKind } from './Modal';
import { PickerKind } from './Picker';
import { Timeline } from './Timeline';
import { MetricChart } from './MetricChart';
import { Portrait } from './Portrait';
import { LifeBars } from './LifeBars';
import { SportsPicker } from './SportsPicker';
import { MedicalModal } from './MedicalModal';
import { DocsModal } from './DocsModal';
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
import {
  rarityOf, netWorthRarity, tierOf, levelOf, hardness, score, yearsLabel, oneIn, headCount, band,
  dedupe, sameThing, LEVELS, GATE_SAYS, Rarity,
} from './rarity';
import { generateLadders, applyLadder, isGeneric } from './ladder';
import { RegionMap } from './RegionMap';
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
function NewQuest({ kind, status, track, userId, nextOrder, onAdded, parentId = null, phase = '' }:
  { kind: string; status: string; track: string; userId: string;
    nextOrder: number; onAdded: () => void; parentId?: string | null; phase?: string }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await insertRows('cs_quests', [{
        user_id: userId, title, kind, track, phase, status,
        completed_on: status === 'done' ? new Date().toISOString().slice(0, 10) : null,
        progress_current: null, progress_total: null, note: '',
        display_order: nextOrder, is_public: true, pinned: false, parent_id: parentId,
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
        spellCheck
        autoCapitalize="sentences"
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

function SkillRow({ d, onToggle, onHide, onPinRung, onRegen, regenning }:
  { d: DerivedSkill; onToggle: (id: string, v: boolean) => void;
    onHide: (id: string, v: boolean) => void; onPinRung: (id: string, v: boolean) => void;
    onRegen: (id: string) => void; regenning: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const { skill, level, selfRated, current, next, ladder } = d;
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
          {current ? <span className="h">{current.label}</span>
            : selfRated ? <span className="d" title="Carried over when this ladder was rewritten — tick a real rung to replace it">self-rated</span>
            : <span className="d">Untrained</span>}
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
          {selfRated && (
            <div className="ladder-src r">
              This level is your own earlier rating, not a rung you ticked. Tick whatever is
              actually true below and it will take over.
            </div>
          )}
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
            <button className="archive-btn" disabled={regenning}
                    title="Rewrite these rungs in the language the discipline actually uses"
                    onClick={() => onRegen(skill.id)}>
              {regenning ? 'writing…' : 'regenerate'}
            </button>
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
  apiKey,
  demo = false,
}: {
  sheet: SheetData;
  onChanged: () => void;
  onAdd: (k: AddKind) => void;
  onPick: (k: PickerKind) => void;
  userId: string;
  apiKey: string;
  demo?: boolean;
}) {
  const [view, setView] = useState<'character' | 'skills' | 'main' | 'side' | 'ranked' | 'world' | 'people' | 'tally' | 'vault' | 'chronicle'>('character');
  const [chart, setChart] = useState<Metric | null>(null);
  const [span, setSpan] = useState(false);
  const [allOpen, setAllOpen] = useState<{ cat: string; title: string } | null>(null);
  const [medOpen, setMedOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  // Clicking the map writes immediately, but the chip list below it waits on a
  // full sheet reload. This overlay keeps the two in step.
  const [atlasPending, setAtlasPending] = useState<Record<string, boolean>>({});
  const markPending = (kind: string) => (name: string, on: boolean) =>
    setAtlasPending((v) => ({ ...v, [`${kind}:${name}`]: on }));
  const [sportsOpen, setSportsOpen] = useState<'sport' | 'hobby' | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  // Which row is open for typing, and which one should take the caret next.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  // Most quests have no note, so it lives behind an icon rather than taking
  // room from the title on every row.
  const [noteFor, setNoteFor] = useState<Quest | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  /**
   * Which blurred quests are showing right now. Deliberately not persisted and
   * not tied to the vault: a private line should start hidden every time the
   * page loads, and unlocking your money should not also uncover it.
   */
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const isHidden = (q: Quest) => q.is_private && !revealed[q.id];
  const reveal = (q: Quest, on: boolean) => setRevealed((m) => ({ ...m, [q.id]: on }));
  // Collapsed categories, remembered per browser: with 200 quests the tab is
  // unusable if every track is always open.
  const [shut, setShut] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cs-collapsed') ?? '[]'); } catch { return []; }
  });
  const toggleShut = (key: string) => setShut((v) => {
    const next = v.includes(key) ? v.filter((k) => k !== key) : [...v, key];
    try { localStorage.setItem('cs-collapsed', JSON.stringify(next)); } catch { /* full */ }
    return next;
  });
  const [editMode, setEditMode] = useState(false);
  const [popped, setPopped] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overQuest, setOverQuest] = useState<{ id: string; after: boolean } | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [cardEdit, setCardEdit] = useState(false);
  const [newAcc, setNewAcc] = useState('');
  const [vaultOpen, setVaultOpen] = useState(isUnlocked());
  const [unlockOpen, setUnlockOpen] = useState(false);
  const seededCard = useRef(false);
  // Pinning writes to the database and reloads the whole sheet; without this
  // overlay the chip does not move for a beat after the click.
  const [pinNow, setPinNow] = useState<Record<string, boolean>>({});
  // Skill ids whose ladder is being rewritten.
  const [regen, setRegen] = useState<string[]>([]);
  // Status writes reload the whole sheet, so hold the new one meanwhile.
  const [statusNow, setStatusNow] = useState<Record<string, string>>({});
  /** A quest's status, preferring one we have just set over the loaded row. */
  const stOf = (q: Quest) => statusNow[q.id] ?? q.status;
  const questRarity = (q: Quest) => rarityOf(q.title, q.track);

  /** Every quest that can be scored, hardest first. */
  const ranked = (list: Quest[]) => list
    .map((q) => ({ q, r: questRarity(q) }))
    .filter((x): x is { q: Quest; r: Rarity } => !!x.r && x.r.years != null)
    .sort((a, b) => score(b.r) - score(a.r));
  const [ladderNote, setLadderNote] = useState('');
  const autoLadders = useRef(false);

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
    // Straight toggle, not a cycle. Ticking things off is the common action by
    // a wide margin, and stepping through "in progress" on the way to done
    // meant two clicks for every single one. In progress, paused and failed
    // are set deliberately in edit mode.
    const next = stOf(q) === 'done' ? 'locked' : 'done';
    if (next === 'done') celebrate(q);
    setStatusNow((m) => ({ ...m, [q.id]: next }));
    await setQuestStatus(q.id, next);
    onChanged();
  };

  /** Paused: wanted it once, not now. Failed: went for it and it did not work. */
  const setStatus = async (q: Quest, status: string) => {
    setStatusNow((m) => ({ ...m, [q.id]: status }));
    await setQuestStatus(q.id, status);
    onChanged();
  };

  /**
   * Adds a line under this one, the way a document does. display_order is
   * numeric precisely so this needs one write rather than renumbering
   * everything below it.
   */
  const addBelow = async (q: Quest, title = '') => {
    const siblings = sheet.quests
      .filter((x) => x.kind === q.kind && x.parent_id === q.parent_id
        && x.track === q.track && x.phase === q.phase)
      .sort((a, b) => a.display_order - b.display_order);
    const at = siblings.findIndex((x) => x.id === q.id);
    const after = siblings[at + 1];
    const order = after
      ? (Number(q.display_order) + Number(after.display_order)) / 2
      : Number(q.display_order) + 1;

    // The id is generated here rather than by the database, so the row can be
    // drawn and focused this instant. Waiting on the insert put a visible beat
    // between pressing Enter and having somewhere to type.
    const id = crypto.randomUUID();
    setEditingId(id);
    setFocusId(id);
    insertRows('cs_quests', [{
      id, user_id: userId, title, kind: q.kind, track: q.track, phase: q.phase,
      status: 'locked', completed_on: null, progress_current: null, progress_total: null,
      note: '', display_order: order, is_public: true, pinned: false, parent_id: q.parent_id,
      is_private: false,
    }]);
  };

  /**
   * Deletes an emptied line and moves the caret to the one above it. A parent
   * is left alone: deleting it cascades to its children in the database, and
   * losing seven summits to one backspace is not a recoverable mistake.
   */
  const removeEmpty = (q: Quest) => {
    if (sheet.quests.some((k) => k.parent_id === q.id)) {
      setToast({ id: Date.now(), kind: 'Has steps under it', title: 'Delete those first' });
      return;
    }
    const sibs = siblingsOf(q);
    const prev = sibs[sibs.findIndex((x) => x.id === q.id) - 1]
      ?? sheet.quests.find((x) => x.id === q.parent_id);
    setEditingId(prev ? prev.id : null);
    if (prev) setFocusId(prev.id);
    drop(q);
  };

  const depthOf = (q: Quest): number => {
    let n = 0;
    let cur: Quest | undefined = q;
    while (cur?.parent_id) {
      cur = sheet.quests.find((x) => x.id === cur!.parent_id);
      n += 1;
      if (n > 6) break;
    }
    return n;
  };

  const siblingsOf = (q: Quest) => sheet.quests
    .filter((x) => x.kind === q.kind && x.parent_id === q.parent_id
      && x.track === q.track && x.phase === q.phase)
    .sort((a, b) => Number(a.display_order) - Number(b.display_order));

  /** Tab: become a child of the row above, the way an outliner behaves. */
  const indent = (q: Quest) => {
    const sibs = siblingsOf(q);
    const prev = sibs[sibs.findIndex((x) => x.id === q.id) - 1];
    if (!prev) return;
    // Three levels is as deep as the layout reads; past that it is a list of
    // indents rather than a list of quests.
    if (depthOf(prev) + 1 > 2) return;
    const kids = sheet.quests.filter((x) => x.parent_id === prev.id);
    const order = kids.length
      ? Math.max(...kids.map((k) => Number(k.display_order))) + 1
      : Number(prev.display_order) + 0.5;
    setFocusId(q.id);
    updateRow('cs_quests', q.id, { parent_id: prev.id, display_order: order });
  };

  /** Shift-Tab: leave the parent and stand on its own, just after it. */
  const outdent = (q: Quest) => {
    const parent = sheet.quests.find((x) => x.id === q.parent_id);
    if (!parent) return;
    const uncles = siblingsOf(parent);
    const next = uncles[uncles.findIndex((x) => x.id === parent.id) + 1];
    const order = next
      ? (Number(parent.display_order) + Number(next.display_order)) / 2
      : Number(parent.display_order) + 1;
    setFocusId(q.id);
    updateRow('cs_quests', q.id, { parent_id: parent.parent_id, display_order: order });
  };

  const setNote = async (q: Quest, note: string) => {
    if (note === q.note) return;
    await updateRow('cs_quests', q.id, { note });
    onChanged();
  };
  const removeAtlas = async (a: AtlasEntry) => {
    await deleteRow('cs_atlas', a.id);
    onChanged();
  };

  /** Hardest first, with rarity breaking ties among equally long slogs. */
  const byHard = (a: { rarity: Rarity | null }, b: { rarity: Rarity | null }) =>
    (b.rarity ? hardness(b.rarity) : -1) - (a.rarity ? hardness(a.rarity) : -1)
    || (a.rarity?.share ?? 1) - (b.rarity?.share ?? 1);

  const netWorthRow = sheet.money.find((m) => m.key === 'net_worth');
  const netWorth = netWorthRow?.value ?? null;
  const netWorthOn = netWorthRow?.recorded_on ?? null;

  /**
   * What you are working on is a status, not a pin. It used to read `pinned`,
   * which is also how a finished quest gets onto the card as an accomplishment
   * - so a quest finished years ago sat under "Currently working
   * on" and in the accomplishment chips at the same time.
   */
  const active = sheet.quests.filter((q) => stOf(q) === 'active');
  const accomplishments: {
    id: string; label: string; icon: string; on: string | null; kind: 'rung' | 'quest';
    rarity: Rarity | null;
  }[] = [
    ...sheet.milestones
      .filter((m) => m.achieved && m.pinned)
      .map((m) => {
        const skill = sheet.skills.find((k) => k.id === m.skill_id);
        return skill
          ? { id: m.id, label: m.label, icon: skill.name, on: m.achieved_on, kind: 'rung' as const,
              rarity: rarityOf(skill.name, m.label) }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    ...sheet.quests
      .filter((q) => q.pinned && q.status === 'done')
      .map((q) => ({
        id: q.id, label: q.title, icon: q.track || 'Exploring',
        on: q.completed_on, kind: 'quest' as const,
        rarity: q.title.startsWith('Net worth')
          ? (netWorth != null ? netWorthRarity(netWorth, life?.years ?? null) : null)
          : rarityOf(q.title, q.track),
      })),
  ]
    .sort(byHard);

  // A quest and a skill rung can describe the same climb - "Climb Kilimanjaro"
  // and "Kilimanjaro" - so the card showed it twice. Rarest wins the slot.
  const stillPinned = accomplishments.filter((a) => pinNow[a.id] !== false);

  // Everything earned but not on the card, rarest first, so the edit view can
  // suggest rather than make you hunt through every ladder. Rarity is a
  // population estimate, not a score I invented per item - see rarity.ts.
  const candidates: {
    id: string; label: string; icon: string; on: string | null; table: string;
    rarity: Rarity | null; make?: () => Promise<void>;
  }[] = [
    ...sheet.milestones
      .filter((m) => m.achieved && !m.pinned)
      .map((m) => {
        const skill = sheet.skills.find((k) => k.id === m.skill_id);
        return skill
          ? { id: m.id, label: m.label, icon: skill.name, on: m.achieved_on,
              table: 'cs_skill_milestones', rarity: rarityOf(skill.name, m.label) }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    ...sheet.quests
      .filter((q) => q.status === 'done' && !q.pinned)
      .map((q) => ({
        id: q.id, label: q.title, icon: q.track || 'Exploring',
        on: q.completed_on, table: 'cs_quests', rarity: rarityOf(q.title, q.track),
      })),
    // Money is not a quest, but it belongs in the same ranking - a net worth
    // band is rarer than most things people put on a card.
    ...(netWorth != null && netWorthRarity(netWorth)
      && !sheet.quests.some((q) => q.pinned && q.title.startsWith('Net worth'))
      ? [{
          id: 'money:net_worth',
          label: `Net worth ${band(netWorth)}`,
          icon: 'Vault', on: netWorthOn, table: 'cs_quests',
          rarity: netWorthRarity(netWorth, life?.years ?? null),
          make: async () => {
            await insertRows('cs_quests', [{
              user_id: userId, title: `Net worth ${band(netWorth)}`, kind: 'side',
              track: 'Vault', phase: '', status: 'done', completed_on: netWorthOn,
              progress_current: null, progress_total: null, note: '',
              display_order: 999, is_public: false, pinned: true,
            }]);
          },
        }]
      : []),
  ]
    .sort(byHard)
    .filter((c) => !accomplishments.some((a) => sameThing(a.label, c.label, a.rarity, c.rarity)));

  // A quest and a skill rung can describe the same climb - "Climb Kilimanjaro"
  // and "Kilimanjaro" - so the card showed it twice. Rarest wins the slot.
  const shown = dedupe(
    [
      ...stillPinned,
      ...candidates.filter((c) => pinNow[c.id]).map((c) => ({
        id: c.id, label: c.label, icon: c.icon, on: c.on, rarity: c.rarity,
        kind: (c.table === 'cs_skill_milestones' ? 'rung' : 'quest') as 'rung' | 'quest',
      })),
    ].sort(byHard),
    (a) => a.label,
    (a) => a.rarity,
  ).slice(0, 10);

  const suggestions = dedupe(
    candidates.filter((c) => !pinNow[c.id]), (c) => c.label, (c) => c.rarity,
  ).slice(0, 10);

  const addCandidate = async (c: (typeof suggestions)[number]) => {
    setPinNow((m) => ({ ...m, [c.id]: true }));
    if (c.make) await c.make();
    else await setPinned(c.table as 'cs_quests', c.id, true);
    onChanged();
  };

  const dropAccomplishment = async (a: (typeof shown)[number]) => {
    setPinNow((m) => ({ ...m, [a.id]: false }));
    await setPinned(a.kind === 'rung' ? 'cs_skill_milestones' : 'cs_quests', a.id, false);
    onChanged();
  };

  /** Clear the card and put back the three rarest things you have done. */
  const useTopThree = async () => {
    setPinNow({});
    for (const a of accomplishments) {
      await setPinned(a.kind === 'rung' ? 'cs_skill_milestones' : 'cs_quests', a.id, false);
    }
    const best = [...stillPinned.map((a) => ({
      id: a.id, table: a.kind === 'rung' ? 'cs_skill_milestones' : 'cs_quests',
      rarity: a.rarity, make: undefined as (() => Promise<void>) | undefined,
    })), ...suggestions]
      .sort((x, y) => (x.rarity?.share ?? 1) - (y.rarity?.share ?? 1))
      .slice(0, 3);
    for (const b of best) {
      if (b.make) await b.make();
      else await setPinned(b.table as 'cs_quests', b.id, true);
    }
    onChanged();
  };

  // An empty card is worse than a guessed one, so seed it with the three
  // rarest things once, and leave it alone after that.
  useEffect(() => {
    if (accomplishments.length || !suggestions.length || seededCard.current) return;
    seededCard.current = true;
    (async () => {
      for (const c of suggestions.slice(0, 3)) await addCandidate(c);
    })();
  }, [accomplishments.length, suggestions.length]);

  /**
   * Rewrites ladders in the discipline's own vocabulary. Batched into one
   * request: the stock ladder was on every sport, and thirty separate calls to
   * fix thirty sports would be absurd.
   */
  const regenerate = async (...skillIds: string[]) => {
    if (!apiKey) {
      setLadderNote('No API key — set one in Homebase settings first.');
      return;
    }
    const targets = skillIds
      .map((id) => allDerived.find((d) => d.skill.id === id))
      .filter((d): d is DerivedSkill => !!d);
    if (!targets.length) return;

    setRegen((r) => [...r, ...skillIds]);
    setLadderNote(`writing ${targets.length} ladder${targets.length === 1 ? '' : 's'}…`);
    try {
      const out = await generateLadders(apiKey, targets.map((t) => ({
        name: t.skill.name, category: t.skill.category, mastery_def: t.skill.mastery_def,
      })));
      for (const got of out) {
        const t = targets.find((x) => x.skill.name.toLowerCase() === got.skill.toLowerCase());
        if (!t) continue;
        await applyLadder(userId, t.skill, t.ladder, got.rungs, got.mastery_def);
      }
      setLadderNote('');
      onChanged();
    } catch (e) {
      setLadderNote(e instanceof Error ? e.message : String(e));
    } finally {
      setRegen((r) => r.filter((id) => !skillIds.includes(id)));
    }
  };

  // The stock rungs are placeholders, so replace them the first time a sheet
  // with any of them is opened. Once only, and never without a key.
  useEffect(() => {
    if (!apiKey || autoLadders.current) return;
    const stock = allDerived.filter((d) => isGeneric(d.ladder)).map((d) => d.skill.id);
    if (!stock.length) return;
    autoLadders.current = true;
    regenerate(...stock);
  }, [apiKey, sheet.milestones.length]);

  const stockLadders = allDerived.filter((d) => isGeneric(d.ladder)).map((d) => d.skill.id);

  const focusMetrics = sheet.metrics
    .filter((m) => m.is_focus)
    .sort((a, b) => a.focus_order - b.focus_order);
  const main = sheet.quests.filter((q) => q.kind === 'main');
  const side = sheet.quests.filter((q) => q.kind === 'side');
  const bucket = sheet.quests.filter((q) => q.kind === 'bucket');
  const bucketTracks = [...new Set(bucket.map((q) => q.track))];
  const tracks = [...new Set(side.map((q) => q.track))];
  // In progress is a summary at the top; the rows themselves stay in their
  // track, because a chain only reads correctly in order.
  const sideActive = side.filter((q) => stOf(q) === 'active');
  const mainActive = main.filter((q) => stOf(q) === 'active');
  // Paused things are not abandoned, but they are not the list either: they
  // sit at the bottom so a track reads as what you are actually doing.
  const isPausedRoot = (q: Quest) => stOf(q) === 'paused' && !q.parent_id;
  const sideRest = side.filter((q) => !isPausedRoot(q));
  const sidePaused = side.filter(isPausedRoot);
  const mainPaused = main.filter(isPausedRoot);
  const mainPhases = [...new Set(main.map((q) => q.phase))];
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
    const live = [...rows.filter((r) => atlasPending[`${kind}:${r.name}`] !== false), ...added]
      .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
    // One row per place, whatever the table holds. A place is its name, so two
    // rows for it are one place however they got there - and counting rows
    // where the picker counts names is how the two totals drifted apart.
    // 'visited' wins a disagreement: somewhere you have been is not somewhere
    // you are planning to go.
    const byName = new Map<string, AtlasEntry>();
    for (const r of live) {
      const seen = byName.get(r.name);
      if (!seen || (seen.state === 'planned' && r.state !== 'planned')) byName.set(r.name, r);
    }
    return [...byName.values()];
  };
  const lived = at('city_lived');

  /**
   * Spelling is the browser's job - the inputs are spellchecked, so you get the
   * red squiggle and the right-click correction you would get anywhere else.
   * The only thing fixed automatically is shape: stray whitespace and a
   * lower-case first letter. Rewording what you typed would mean guessing at
   * meaning, and it is your sheet.
   */
  const tidy = (raw: string) => {
    const t = raw.trim().replace(/\s+/g, ' ');
    if (!t) return t;
    // Leave something like "iPhone" or "VC" alone; only lift a plain lowercase word.
    const first = t.split(' ')[0];
    if (first !== first.toLowerCase()) return t;
    return t[0].toUpperCase() + t.slice(1);
  };

  const rename = async (q: Quest, title: string) => {
    const next = tidy(title);
    if (!next || next === q.title) return;
    await renameQuest(q.id, next);
    onChanged();
  };
  const drop = async (q: Quest) => {
    await deleteRow('cs_quests', q.id);
    onChanged();
  };

  /**
   * Difficulty is the badge; rarity, the head-count and the gate all live in
   * the tooltip. A thing that is rare only because it is expensive should not
   * look like a thing that took ten years.
   */
  const Badge = ({ r }: { r: Rarity | null }) => {
    if (!r) return <span className="tier none" title="No estimate for this one">—</span>;
    const lv = levelOf(r);
    const tier = tierOf(r);
    return (
      <Tip body={<>
        <b>{lv?.name ?? 'Unrated'}</b>{r.years != null && <> — {yearsLabel(r.years)} of dedicated effort</>}.
        {r.gate && <> {GATE_SAYS[r.gate]}.</>}
        {r.fame === 2 && <> Widely recognised, which is most of what status is.</>}
        {!r.fame && <> Niche — rare, but few people would know what it means.</>}
        {r.impact && <> Impact {'◆'.repeat(r.impact)}: it changes something beyond your own life.</>}
        {' '}About {headCount(r)} Americans have done it, roughly {oneIn(r.share)} — {tier.name.toLowerCase()}.
        {' '}{r.basis}.
      </>}>
        <span className={`tier ${lv?.key ?? 'none'}`}>
          {lv?.name ?? '—'}
          {r.gate === 'access' && <span className="gate" title="money buys the door, not the doing">$</span>}
          {r.gate === 'bought' && <span className="gate" title="the purchase is the achievement">$$</span>}
          {r.gate === 'luck' && <span className="gate" title="you have to be chosen">◇</span>}
          {r.impact && <span className="impact" title="changes something beyond you">{'◆'.repeat(r.impact)}</span>}
        </span>
      </Tip>
    );
  };

  const CatHead = ({ name, done, total, k, active = 0 }:
    { name: string; done: number; total: number; k: string; active?: number }) => (
    <button className={`track-name cat ${shut.includes(k) ? 'shut' : ''}`}
            onClick={() => toggleShut(k)} title="Click to collapse">
      <span className="caret">{shut.includes(k) ? '▸' : '▾'}</span>
      {name} <span className="d">{done}/{total}</span>
      {/* A collapsed category must still say that something live is inside it,
          or folding the list away hides the work. */}
      {shut.includes(k) && active > 0 && (
        <span className="cat-active" title={`${active} in progress in here`}>◈ {active}</span>
      )}
    </button>
  );

  /**
   * What you are actually doing, at the top of the tab and larger than the
   * list. Past five at once the count turns red: the point of the tab is to
   * show what is live, and twelve live things is the same as none.
   */
  const FOCUS_CAP = 5;
  const FocusBlock = ({ list }: { list: Quest[] }) => {
    if (!list.length) return null;
    const over = list.length > FOCUS_CAP;
    return (
      <div className={`focusblock ${over ? 'over' : ''}`}>
        <div className="focusblock-head">
          In progress <span className="num">{list.length}</span>
          {over && (
            <span className="focus-warn">
              more than {FOCUS_CAP} at once — pick a few and pause the rest
            </span>
          )}
        </div>
        <div className="focus-items">
          {list.map((q) => (
            <button className="focus-item" key={q.id}
                    onClick={() => { setEditingId(q.id); setFocusId(q.id); }}>
              <span className="gold">◈</span>
              <span className={isHidden(q) ? 'masked' : ''}>{q.title}</span>
              {(q.track || q.phase) && <span className="d">{q.track || q.phase}</span>}
            </button>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Everything you can do to a quest, behind one control. Rendered for any
   * row, in or out of edit mode - edit mode is for reordering and bulk work,
   * not a gate on changing a single quest.
   */
  const rowMenu = (q: Quest, st: string) => (
    <>
      <button className="qmore" title="More"
              // Without this the input blurs first, the row leaves edit state,
              // and the menu is unmounted before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setMenuFor((v) => (v === q.id ? null : q.id))}>⋯</button>
      {menuFor === q.id && (
                <>
                  <div className="qmenu-away" onClick={() => setMenuFor(null)} />
                  <div className="qmenu">
                    <button onClick={() => { setStatus(q, st === 'active' ? 'locked' : 'active'); setMenuFor(null); }}>
                      <span className="gold">◈</span> {st === 'active' ? 'Not working on it' : 'Working on it'}
                    </button>
                    <button onClick={() => { setStatus(q, st === 'paused' ? 'locked' : 'paused'); setMenuFor(null); }}>
                      ‖ {st === 'paused' ? 'Unpause' : 'Pause'}
                    </button>
                    <button onClick={() => { setStatus(q, st === 'failed' ? 'locked' : 'failed'); setMenuFor(null); }}>
                      ✕ {st === 'failed' ? 'Not failed' : 'Did not work out'}
                    </button>
                    <button onClick={() => { setNoteFor(q); setMenuFor(null); }}>
                      ✎ {q.note ? 'Edit note' : 'Add a note'}
                    </button>
                    <button onClick={() => { updateRow('cs_quests', q.id, { is_private: !q.is_private }); setMenuFor(null); }}>
                      ◍ {q.is_private ? 'Stop blurring' : 'Blur on screen'}
                    </button>
                    <button onClick={() => { addBelow(q); setMenuFor(null); }}>+ Add below</button>
                    <button className="r" onClick={() => { drop(q); setMenuFor(null); }}>× Delete</button>
                  </div>
                </>
      )}
    </>
  );

  const questRow = (q: Quest, depth = 0) => {
    const st = stOf(q);
    const open = editMode || editingId === q.id;
    const hidden = isHidden(q);
    const kids = sheet.quests
      .filter((k) => k.parent_id === q.id)
      .sort((a, b) => Number(a.display_order) - Number(b.display_order));
    const doneKids = kids.filter((k) => stOf(k) === 'done').length;
    const liveKids = kids.filter((k) => stOf(k) === 'active').length;
    const folded = shut.includes(`q:${q.id}`);

    return (
      <div key={q.id} className={depth ? 'qbranch' : undefined}>
        <div className={
               `quest ${st}${open ? ' editing' : ''}` +
               (depth ? ` d${Math.min(depth, 3)}` : '') +
               (dragId === q.id ? ' dragging' : '') +
               (overQuest?.id === q.id ? (overQuest.after ? ' drop-after' : ' drop-before') : '')
             }
             // Outside edit mode the whole row drags. In edit mode the title is a
             // text field, so only the grip does - otherwise selecting text starts
             // a drag instead.
             draggable={!open}
             onDragStart={(e) => {
               if (open) return;
               setDragId(q.id);
               e.dataTransfer.effectAllowed = 'move';
               e.dataTransfer.setData('text/plain', q.id);
             }}
             onDragEnd={() => { setDragId(null); setOverQuest(null); }}
             onDragOver={(e) => {
               if (!dragId || dragId === q.id) return;
               e.preventDefault();
               e.dataTransfer.dropEffect = 'move';
               const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
               setOverQuest({ id: q.id, after: e.clientY > r.top + r.height / 2 });
             }}
             onDragLeave={() => setOverQuest((v) => (v?.id === q.id ? null : v))}
             onDrop={(e) => {
               e.preventDefault();
               e.stopPropagation();
               const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
               dropOnQuest(q, e.clientY > r.top + r.height / 2);
             }}>
          {kids.length > 0 ? (
            <button className="qfold" title={folded ? 'Show the steps' : 'Hide the steps'}
                    onClick={() => toggleShut(`q:${q.id}`)}>{folded ? '▸' : '▾'}</button>
          ) : <span className="qfold blank" />}
          {editMode && (
            <span
              className="qgrip"
              title="Drag to move"
              draggable
              onDragStart={(e) => {
                setDragId(q.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', q.id);
              }}
              onDragEnd={() => { setDragId(null); setOverQuest(null); }}
            >⠿</span>
          )}
          <button className={`bx ${st} ${popped === q.id ? 'pop' : ''}`}
                  onClick={() => cycle(q)} aria-label={`Mark ${q.title}`}
                  title={st === 'done' ? 'Done — click to undo' : 'Click to mark done'}>
            <span className="bxm">
              {st === 'done' ? '✓' : st === 'active' ? '◈' : st === 'paused' ? '‖' : st === 'failed' ? '✕' : ''}
            </span>
          </button>
          {open ? (
            <>
              <input
                className="t qedit"
                defaultValue={q.title}
                spellCheck
                autoCapitalize="sentences"
                autoFocus={focusId === q.id}
                ref={(el) => {
                  if (!el || focusId !== q.id) return;
                  el.focus();
                  // Caret at the end, so backspacing up a list keeps deleting
                  // rather than landing mid-word.
                  el.setSelectionRange(el.value.length, el.value.length);
                  setFocusId(null);
                }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  // A line left blank was never a quest; drop it rather than
                  // leaving an empty row behind.
                  if (!v && !q.title) { drop(q); return; }
                  rename(q, v || q.title);
                  if (!editMode && menuFor !== q.id) setEditingId((id) => (id === q.id ? null : id));
                }}
                onKeyDown={(e) => {
                  const el = e.target as HTMLInputElement;
                  if (e.key === 'Escape') { el.value = q.title; el.blur(); return; }
                  // Backspace on an empty line removes it and puts the caret
                  // at the end of the one above, the way a list behaves.
                  if (e.key === 'Backspace' && el.value === '') {
                    e.preventDefault();
                    removeEmpty(q);
                    return;
                  }
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    if (el.value.trim() !== q.title) rename(q, el.value.trim());
                    if (e.shiftKey) outdent(q); else indent(q);
                    return;
                  }
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  // Split at the caret, the way a list in a document behaves.
                  const cut = el.selectionStart ?? el.value.length;
                  const before = el.value.slice(0, cut).trim();
                  const after = el.value.slice(cut).trim();
                  if (!before && !after) { el.blur(); return; }
                  if (before !== q.title) rename(q, before);
                  addBelow(q, after);
                }}
              />
              {rowMenu(q, st)}
            </>
          ) : (
            <>
              <button className={`pin ${q.pinned ? 'on' : ''}`} title={q.pinned ? 'On the card' : 'Pin to card'}
                  onClick={() => { setPinNow((m) => ({ ...m, [q.id]: !q.pinned })); setPinned('cs_quests', q.id, !q.pinned); }}>★</button>
              <button className={`t ${hidden ? 'masked' : ''}`}
                      onClick={() => (hidden ? reveal(q, true) : (setEditingId(q.id), setFocusId(q.id)))}
                      title={hidden ? 'Hidden — click to show' : 'Click to edit — Enter adds a line below'}>
                {q.title}
                {kids.length > 0 && <span className="y num"> {doneKids}/{kids.length}</span>}
                {folded && liveKids > 0 && (
                  <span className="cat-active" title={`${liveKids} in progress inside`}>◈ {liveKids}</span>
                )}
                {!kids.length && q.progress_total
                  ? <span className="y num"> {q.progress_current ?? 0}/{q.progress_total}</span> : null}
              </button>
              {q.is_private && !hidden && (
                <button className="qhide" title="Hide it again" onClick={() => reveal(q, false)}>◍</button>
              )}
              {questRarity(q) && <Badge r={questRarity(q)} />}
              {q.note && (
                <Tip body={<>{q.note}</>}>
                  <button className="qnote-mark" onClick={() => setNoteFor(q)}>✎</button>
                </Tip>
              )}
              {st === 'paused' && <span className="qflag" title="Paused">‖</span>}
              {st === 'failed' && <span className="qflag r" title="Did not work out">✕</span>}
              <span className="yr">{yearOf(q.completed_on)}</span>
              {rowMenu(q, st)}
            </>
          )}
        </div>
        {!folded && kids.map((k) => questRow(k, depth + 1))}
        {editMode && !folded && kids.length > 0 && (
          <NewQuest kind={q.kind} status="locked" track={q.track} parentId={q.id}
                    nextOrder={Number(q.display_order) + kids.length + 1}
                    onAdded={onChanged} userId={userId} />
        )}
      </div>
    );
  };

  /**
   * Top-level rows only; children are drawn by their parent. Finished ones
   * sink to the bottom of their category - but only at this level, because a
   * chain like Open Water to Divemaster has to stay in order to make sense.
   */
  const roots = (list: Quest[]) => list
    .filter((q) => !q.parent_id)
    .sort((a, b) => Number(a.display_order) - Number(b.display_order))
    .sort((a, b) => Number(stOf(a) === 'done') - Number(stOf(b) === 'done'));

  /** Drop onto a row: take that row's status and slot in beside it. */
  const dropOnQuest = async (target: Quest, after: boolean) => {
    const id = dragId;
    setDragId(null); setOverQuest(null);
    if (!id || id === target.id) return;
    const moving = sheet.quests.find((q) => q.id === id);
    if (!moving) return;
    const siblings = sheet.quests.filter((q) => q.kind === target.kind && q.id !== id);
    const at = siblings.findIndex((q) => q.id === target.id);
    siblings.splice(after ? at + 1 : at, 0, moving);

    await Promise.all(siblings.map((q, i) => updateRow('cs_quests', q.id, { display_order: i })));
    // Dropping onto a child makes it a sibling of that child, not of its parent.
    if (moving.parent_id !== target.parent_id) {
      await updateRow('cs_quests', id, { parent_id: target.parent_id });
    }
    if (moving.status !== target.status) {
      if (target.status === 'done') celebrate(moving);
      await setQuestStatus(id, target.status);
    }
    onChanged();
  };

  // One past the highest order in view, so a new quest lands at the bottom
  // rather than tying with everything else on a shared default.
  const nextOrderFor = (list: Quest[]) =>
    (list.length ? Math.max(...list.map((q) => q.display_order)) : 0) + 1;

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
    ['ranked', 'Ranked', ''],
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
          <Portrait userId={userId} avatarPath={p?.avatar_url ?? null} onChanged={onChanged}
                    mark={p?.other_name || (p?.display_name ?? '?').trim()[0] || '?'} />
          <div>
            <div className="card-name">{p?.display_name || '—'}</div>
            <div className="card-title">
              <span className="title-text">{(demo && p?.title) || autoTitle || '—'}</span>
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
          <div>
            <dt>Net worth</dt>
            <dd className="oneline" title={netWorthOn ? `Last updated ${netWorthOn}` : undefined}>
              {netWorth == null ? '—' : vaultOpen ? (
                <>
                  <span className="num">${netWorth.toLocaleString()}</span>
                  <button className="eye" title="Hide the figure again"
                          onClick={() => {
                            sessionStorage.removeItem('cs-vault-unlocked');
                            setVaultOpen(false);
                          }}>hide</button>
                </>
              ) : (
                <>
                  <span className="masked">${netWorth.toLocaleString()}</span>
                  {/* An explicit button: a blurred number that happens to be
                      clickable gives you nothing to aim at. */}
                  <button className="eye" title="Show the figure"
                          onClick={() => {
                            // No passcode set means nothing to ask for - do not
                            // make setting one the price of reading your own sheet.
                            if (!p?.vault_pin_hash) {
                              sessionStorage.setItem('cs-vault-unlocked', '1');
                              setVaultOpen(true);
                            } else setUnlockOpen(true);
                          }}>show</button>
                </>
              )}
            </dd>
          </div>
        </dl>

        {(
          <div className="card-now">
            <div className="card-now-label">
              Biggest accomplishments
              <button className="card-edit" onClick={() => setCardEdit((v) => !v)}>
                {cardEdit ? 'done' : 'edit'}
              </button>
            </div>
            <div className="accs">
              {!shown.length && <span className="d">Nothing on the card yet — hit edit.</span>}
              {shown.map((a) => (
                <span className="acc" key={a.id}>
                  <Icon name={a.icon} />
                  {!vaultOpen && a.label.startsWith('Net worth') ? (
                    <button className="masked as-text" title="Hidden — click to unlock"
                            onClick={() => setUnlockOpen(true)}>{a.label}</button>
                  ) : a.label}
                  {a.on && <span className="d"> {yearOf(a.on)}</span>}
                  {a.rarity && <Badge r={a.rarity} />}
                  {cardEdit && (
                    <button className="unpin" title="Remove from card"
                            onClick={() => dropAccomplishment(a)}>×</button>
                  )}
                </span>
              ))}
            </div>
            {cardEdit && (
              <div className="acc-add">
                <input
                  value={newAcc}
                  placeholder="Add an accomplishment — type it and press Enter"
                  onChange={(e) => setNewAcc(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key !== 'Enter') return;
                    const title = newAcc.trim();
                    if (!title) return;
                    await insertRows('cs_quests', [{
                      user_id: userId, title, kind: 'side', track: '', phase: '',
                      status: 'done', completed_on: null, progress_current: null,
                      progress_total: null, note: '', display_order: 999,
                      is_public: true, pinned: true,
                    }]);
                    setNewAcc('');
                    onChanged();
                  }}
                />
              </div>
            )}
            {cardEdit && suggestions.length > 0 && (
              <div className="acc-suggest">
                <div className="d">
                  Suggestions, hardest first — read top to bottom. The badge is years of
                  dedicated effort, not how rare it is; $ means money is the real gate and
                  ◇ means you have to be chosen. Hover one for the numbers.
                  {accomplishments.length > 0 && (
                    <button className="card-edit" onClick={useTopThree}>use top 3</button>
                  )}
                </div>
                <div className="tier-key">
                  {LEVELS.map((l) => (
                    <span className={`tier ${l.key}`} key={l.key} title={l.says}>{l.name}</span>
                  ))}
                  <span className="gate" title="money is the gate">$</span>
                  <span className="gate" title="you have to be chosen">◇</span>
                  <span className="d">hardest first</span>
                </div>
                <ol className="acc-rank">
                  {suggestions.map((c, i) => (
                    <li key={c.id}>
                      <span className="acc-n">{i + 1}</span>
                      <button className="acc ghost" onClick={() => addCandidate(c)}>
                        <Icon name={c.icon} />
                        <span className={!vaultOpen && c.label.startsWith('Net worth') ? 'masked' : ''}>
                          {c.label}
                        </span>
                        {c.on && <span className="d"> {yearOf(c.on)}</span>}
                        <span className="plus">+</span>
                      </button>
                      <Badge r={c.rarity} />
                    </li>
                  ))}
                </ol>
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
                    <span className="gold">◆</span>{' '}
                    <span className={isHidden(q) ? 'masked' : ''}>{q.title}</span>
                    {cardEdit && (
                      <button className="unpin" title="Not working on this now"
                              onClick={() => setStatus(q, 'locked')}>×</button>
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
            <DueTests sheet={sheet} onChanged={onChanged} />



            <div className="sec">
              <button className="sec-open" onClick={() => setAllOpen({ cat: 'labs', title: 'Bloodwork' })}>
                Bloodwork <span className="more">see all 135</span>
              </button>
            </div>
            <MetricRows metrics={pick(HEADLINE_LABS)} sheet={sheet} onOpen={setChart} why />

            <button className="med-line" onClick={() => setDocsOpen(true)}>
              <span className="ml-label">Source documents</span>
              <span className="d">
                {sheet.documents.length
                  ? `${sheet.documents.length} original report${sheet.documents.length > 1 ? 's' : ''}`
                  : 'none stored yet'}
              </span>
              <span className="more">open</span>
            </button>

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
          {ladderNote && <p className="ladder-note">{ladderNote}</p>}
          <div className="sec">
            Skills <span className="count">{totalLevel} of {ceiling}
              <button className="add" style={{ marginLeft: 8 }} onClick={() => setSportsOpen('sport')}>sports</button>
              <button className="add" style={{ marginLeft: 6 }} onClick={() => setSportsOpen('hobby')}>hobbies</button>
              <button className="add" style={{ marginLeft: 6 }} onClick={() => onAdd('skill')}>+ skill</button>
              {stockLadders.length > 0 && (
                <button className="add" style={{ marginLeft: 6 }} disabled={regen.length > 0}
                        title="Rewrite the placeholder ladders in each discipline's own terms"
                        onClick={() => regenerate(...stockLadders)}>
                  {regen.length ? 'writing…' : `rewrite ${stockLadders.length} ladders`}
                </button>
              )}
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
                        {group.map((d) => <SkillRow key={d.skill.id} d={d} onToggle={toggle} onHide={hideSkill}
                                                  onPinRung={pinRung} onRegen={regenerate}
                                                  regenning={regen.includes(d.skill.id)} />)}
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
          <FocusBlock list={mainActive} />
          <div className="cols">
            {[0, 1].map((col) => (
              <div key={col}>
                {mainPhases.filter((_, i) => i % 2 === col).map((ph) => {
                  const rows = roots(main.filter((q) => q.phase === ph && !isPausedRoot(q)))
                    .sort((a, b) => a.display_order - b.display_order);
                  if (!rows.length) return null;
                  const all = main.filter((q) => q.phase === ph);
                  return (
                    <div key={ph} className="qphase">
                      <CatHead name={ph || 'Other'} k={`main:${ph}`}
                               done={all.filter((q) => stOf(q) === 'done').length} total={all.length}
                               active={all.filter((q) => stOf(q) === 'active').length} />
                      {!shut.includes(`main:${ph}`) && rows.map((q) => questRow(q))}
                      {editMode && !shut.includes(`main:${ph}`) && (
                        <NewQuest kind="main" status="locked" track="" phase={ph}
                                  nextOrder={nextOrderFor(main)} onAdded={onChanged} userId={userId} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {mainPaused.length > 0 && (
            <div className="qpaused">
              <div className="sec">Paused <span className="count">{mainPaused.length} · set aside for now</span></div>
              <div className="cols">
                {[0, 1].map((col) => (
                  <div key={col}>
                    {[...new Set(mainPaused.map((q) => q.phase))]
                      .filter((_, i) => i % 2 === col)
                      .map((ph) => (
                        <div key={ph}>
                          <div className="track-name">{ph || 'Other'}</div>
                          {mainPaused.filter((q) => q.phase === ph).map((q) => questRow(q))}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}
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
          <FocusBlock list={sideActive} />
          <div className="cols">
            {[0, 1].map((col) => (
              <div key={col}>
                {tracks.filter((_, i) => i % 2 === col).map((t) => {
                  const all = side.filter((q) => q.track === t);
                  const rows = roots(sideRest.filter((q) => q.track === t))
                    .sort((a, b) => a.display_order - b.display_order);
                  if (!rows.length) return null;
                  const doneN = all.filter((q) => stOf(q) === 'done').length;
                  return (
                    <div key={t}>
                      <CatHead name={t || 'Other'} k={`side:${t}`} done={doneN} total={all.length}
                               active={all.filter((q) => stOf(q) === 'active').length} />
                      {!shut.includes(`side:${t}`) && rows.map((q) => questRow(q))}
                      {editMode && !shut.includes(`side:${t}`) && (
                        <NewQuest kind="side" status="locked" track={t}
                                  nextOrder={nextOrderFor(rows)} onAdded={onChanged} userId={userId} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {sidePaused.length > 0 && (
            <div className="qpaused">
              <div className="sec">Paused <span className="count">{sidePaused.length} · set aside for now</span></div>
              <div className="cols">
                {[0, 1].map((col) => (
                  <div key={col}>
                    {[...new Set(sidePaused.map((q) => q.track))]
                      .filter((_, i) => i % 2 === col)
                      .map((t) => (
                        <div key={t}>
                          <div className="track-name">{t || 'Other'}</div>
                          {sidePaused.filter((q) => q.track === t).map((q) => questRow(q))}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  const rows = roots(bucket.filter((q) => q.track === t));
                  if (!rows.length) return null;
                  return (
                    <div key={t}>
                      <div className="track-name">
                        {t || 'Someday'}{' '}
                        <span className="d">{rows.filter((q) => q.status === 'done').length}/{rows.length}</span>
                      </div>
                      {rows.map((q) => questRow(q))}
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

      {view === 'ranked' && (
        <>
          <p className="hint">
            Everything you have written down, hardest first. The score adds years of
            effort, how few people have done it, and whether a stranger would recognise
            it — rare but unknown counts for little, which is why a niche party trick
            sits below a marathon.
          </p>
          <div className="tier-key">
            {LEVELS.map((l) => (
              <span className={`tier ${l.key}`} key={l.key} title={l.says}>{l.name}</span>
            ))}
            <span className="gate" title="money buys the door, not the doing">$</span>
            <span className="gate" title="the purchase is the achievement">$$</span>
            <span className="gate" title="you have to be chosen">◇</span>
          </div>
          <div className="cols">
            {([['main', 'Main Quests'], ['side', 'Side Quests']] as const).map(([k, label]) => (
              <div key={k}>
                <div className="sec">{label}</div>
                {ranked(k === 'main' ? main : side).map(({ q, r }) => (
                  <div className={`quest ranked ${stOf(q)}`} key={q.id}>
                    <span className="rank-score num">{Math.round(score(r))}</span>
                    <Badge r={r} />
                    <button className={`t ${isHidden(q) ? 'masked' : ''}`}
                            onClick={() => (isHidden(q) ? reveal(q, true) : setView(k))}>
                      {q.title}
                    </button>
                    {stOf(q) === 'done' && <span className="yr">{yearOf(q.completed_on) || 'done'}</span>}
                    {stOf(q) === 'paused' && <span className="qflag">‖</span>}
                  </div>
                ))}
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
                <button className="add" style={{ marginLeft: 8 }} onClick={() => onPick('country')}>edit</button>
              </span>
            </div>
            <RegionMap onOpen={() => onPick('country')} kind="country" visited={countries} userId={userId} onChanged={onChanged}
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
                <button className="add" style={{ marginLeft: 8 }} onClick={() => onPick('state')}>edit</button>
              </span>
            </div>
            <RegionMap onOpen={() => onPick('state')} kind="state" visited={at('state')} userId={userId} onChanged={onChanged}
                       onOptimistic={markPending('state')} />
            <ChipList items={at('state')} onRemove={removeAtlas} />

            <div className="sec">
              Chinese Provinces <span className="count">{been(at('province')).length} of {TOTAL_PROVINCES}
                {at('province').length - been(at('province')).length > 0 && (
                  <span className="plannedn"> · {at('province').length - been(at('province')).length} planned</span>
                )}
                <button className="add" style={{ marginLeft: 8 }} onClick={() => onPick('province')}>edit</button>
              </span>
            </div>
            <RegionMap onOpen={() => onPick('province')} kind="province" visited={at('province')} userId={userId} onChanged={onChanged}
                       onOptimistic={markPending('province')} />
            <ChipList items={at('province')} onRemove={removeAtlas} />

            <div className="sec">
              National Parks <span className="count">{been(at('park')).length} of {TOTAL_PARKS}
                {at('park').length - been(at('park')).length > 0 && (
                  <span className="plannedn"> · {at('park').length - been(at('park')).length} planned</span>
                )}
                <button className="add" style={{ marginLeft: 8 }} onClick={() => onPick('park')}>edit</button>
              </span>
            </div>
            <RegionMap onOpen={() => onPick('park')} kind="park" visited={at('park')} userId={userId} onChanged={onChanged}
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
      {noteFor && (
        <div className="scrim" onClick={() => setNoteFor(null)}>
          <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
            <h2>Note</h2>
            <p className="hint">{noteFor.title}</p>
            <textarea
              className="note-area"
              spellCheck
              autoFocus
              defaultValue={noteFor.note}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  setNote(noteFor, (e.target as HTMLTextAreaElement).value.trim());
                  setNoteFor(null);
                }
              }}
              onBlur={(e) => setNote(noteFor, e.target.value.trim())}
            />
            <div className="modal-actions">
              <button className="btn" onClick={() => setNoteFor(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
      {unlockOpen && (
        <div className="scrim" onClick={() => setUnlockOpen(false)}>
          <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
            <VaultLock userId={userId} pinHash={p?.vault_pin_hash ?? null}
                       onUnlock={() => { setVaultOpen(true); setUnlockOpen(false); }} />
            <div className="modal-actions">
              <button className="btn" onClick={() => setUnlockOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {medOpen && <MedicalModal sheet={sheet} onClose={() => setMedOpen(false)} />}
      {docsOpen && <DocsModal sheet={sheet} userId={userId} onChanged={onChanged}
                                onClose={() => setDocsOpen(false)} />}
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
