/**
 * Sample mode: the fictional seed character (src/seed.ts) rendered entirely
 * in memory, with no sign-in and no backend. Dev only - open
 * http://localhost:5174/sample.html while `npm run dev` is running. It is not
 * part of the production build (vite builds index.html only).
 *
 * sample.html blocks every Supabase request before the app loads, and writes
 * are switched to no-ops, so clicking around changes nothing anywhere.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Sheet } from './Sheet';
import * as db from './db';
import { EMPTY_SHEET, Sheet as SheetData } from './types';
import {
  SEED_PROFILE, SEED_METRICS, SEED_MEASUREMENTS, SEED_QUESTS, SEED_ATLAS, SEED_SKILLS,
} from './seed';
import './terminal.css';

if (!import.meta.env.DEV) throw new Error('sample mode is dev only');

// Writes become no-ops where the db layer supports it.
(db as { setDemoMode?: (on: boolean) => void }).setDemoMode?.(true);

const USER = 'sample-user';
const id = (prefix: string, i: number) => `${prefix}-${i}`;

function buildSample(): SheetData {
  const skills = SEED_SKILLS.map((s, i) => ({
    id: id('skill', i), name: s.name, category: s.category, mastery_def: s.mastery_def,
    icon: '', pursuing: false, hidden: false, self_level: null, display_order: i, is_public: true,
  }));
  const milestones = SEED_SKILLS.flatMap((s, i) => s.ladder.map((m, j) => ({
    id: id(`ms-${i}`, j), skill_id: id('skill', i), label: m.label, level: m.level,
    achieved: m.achieved ?? false, achieved_on: m.on ?? null,
    progress_current: null, progress_total: null, note: m.note ?? '', pinned: false,
  })));
  const metrics = SEED_METRICS.map((m, i) => ({
    id: id('metric', i), key: m.key, label: m.label, unit: m.unit ?? '', category: m.category,
    target_low: (m as { target_low?: number }).target_low ?? null,
    target_high: (m as { target_high?: number }).target_high ?? null,
    direction: m.direction, display_order: m.display_order ?? i, panel: '', is_focus: false,
    cadence_months: null, test_group: '', target_source: '', why: '',
    p50: null, p75: null, p90: null, percentile_source: '', percentile_useful: false,
    focus_order: 0, focus_goal: '', is_public: false,
  }));
  const unitOf = new Map(SEED_METRICS.map((m) => [m.key, m.unit ?? '']));
  const measurements = SEED_MEASUREMENTS.map((r, i) => ({
    id: id('reading', i), metric_key: r.key, value: r.value, text_value: null,
    unit: unitOf.get(r.key) ?? '', measured_at: r.on, source: r.source, note: '',
  })).sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  const quests = SEED_QUESTS.map((q, i) => ({
    id: id('quest', i), title: q.title, kind: q.kind, track: q.track ?? '', phase: q.phase ?? '',
    status: q.status ?? 'locked', completed_on: q.on ?? null,
    progress_current: q.cur ?? null, progress_total: q.total ?? null, note: q.note ?? '',
    display_order: i, is_public: true, pinned: false, parent_id: null, is_private: false,
  }));
  const atlas = SEED_ATLAS.map((a, i) => ({
    id: id('place', i), kind: a.kind, name: a.name,
    detail: (a as { detail?: string }).detail ?? '', happened_on: null,
    years: (a as { years?: number }).years ?? null, state: '', display_order: i, is_public: true,
  }));
  const profile = {
    user_id: USER, ...SEED_PROFILE, gold_value: null, healthspan_years: 75,
    gold_updated_at: null, avatar_url: null, friend_order: null, vault_pin_hash: null,
    tab_order: null, tab_muted: null,
  };
  // Cast through unknown so this keeps compiling as row types gain columns.
  return { ...EMPTY_SHEET, profile, skills, milestones, metrics, measurements, quests, atlas } as unknown as SheetData;
}

const sheet = buildSample();
const props = {
  sheet, userId: USER, apiKey: '',
  onChanged: () => {}, onAdd: () => {}, onPick: () => {},
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sheet {...props} />
  </React.StrictMode>,
);

// ?tab=skills (or any tab label) opens that tab and scrolls to it, which is
// how the README screenshots are taken with a headless browser.
const tab = new URLSearchParams(location.search).get('tab');
if (tab) {
  setTimeout(() => {
    const want = tab.toLowerCase().replace(/[-_]/g, ' ');
    const el = [...document.querySelectorAll<HTMLElement>('button, [role="tab"], a')]
      .find((b) => (b.textContent ?? '').trim().toLowerCase().startsWith(want));
    el?.click();
    setTimeout(() => el?.scrollIntoView({ block: 'start' }), 300);
  }, 500);
}
