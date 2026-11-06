import { supabase } from './supabase';
import { Sheet, EMPTY_SHEET } from './types';
import {
  SEED_SKILLS, SEED_QUESTS, SEED_METRICS, SEED_ATLAS, SEED_PROFILE, SEED_MEASUREMENTS,
} from './seed';
import { SPORT_LADDER } from './catalog';
import { Op, OpInput, enqueue, emitOp, looksOffline } from './offline';

/**
 * Demo mode shows a disguised sheet to someone else; nothing it does may reach
 * the real database, so every write becomes a no-op at this one choke point
 * rather than being guarded at each of the forty call sites.
 */
let demoMode = false;
export function setDemoMode(on: boolean) { demoMode = on; }
export const inDemoMode = () => demoMode;

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);

/** Performs one op for real. Exported so the offline queue can replay it. */
export async function runOp(op: Op): Promise<void> {
  const err = op.kind === 'insert'
    ? (await supabase.from(op.table).insert(op.rows)).error
    : op.kind === 'upsert'
    ? (await supabase.from(op.table).upsert(op.rows, { onConflict: op.onConflict })).error
    : op.kind === 'update'
      ? (await supabase.from(op.table).update(op.patch).eq('id', op.id)).error
      : op.kind === 'delete'
        ? (await supabase.from(op.table).delete().eq('id', op.id)).error
        : (await supabase.from('cs_profile').update(op.patch).eq('user_id', op.userId)).error;
  if (err) throw new Error(err.message);
}

/**
 * Every write goes through here: straight to Supabase when there is a
 * connection, into the durable queue when there is not. A queued write is not
 * an error - the caller carries on and the UI stays responsive on a plane.
 */
async function write(op: OpInput): Promise<void> {
  const full = { ...op, at: Date.now() } as Op;
  // Announce first: the click should land on screen now, not after the server
  // agrees. In demo mode this is the whole effect - it never goes further.
  emitOp(full);
  if (demoMode) return;
  try {
    await runOp(full);
  } catch (e) {
    if (!looksOffline(e)) throw e;
    enqueue(full);
  }
}

/**
 * The access token can be expired at boot: supabase-js refreshes in the
 * background, but the first load fires before it finishes and comes back
 * "JWT expired". That used to surface as a red banner over a cached sheet,
 * which looks exactly like data going missing - anything added since the cache
 * was written simply was not there. So refresh once and try again.
 */
export async function loadSheet(userId: string): Promise<Sheet> {
  try {
    return await fetchSheet(userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/jwt|token.*expire|expired|not authenticated/i.test(msg)) throw e;
    const { error } = await supabase.auth.refreshSession();
    if (error) throw new Error(`session expired, please sign in again: ${error.message}`);
    return fetchSheet(userId);
  }
}

async function fetchSheet(userId: string): Promise<Sheet> {
  const [profile, metrics, measurements, skills, milestones, quests, atlas, medical, documents, counters, events, money, items, notes, people, checkups] =
    await Promise.all([
      supabase.from('cs_profile').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('cs_metrics').select('*').eq('user_id', userId).order('display_order'),
      supabase.from('cs_measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }),
      supabase.from('cs_skills').select('*').eq('user_id', userId).order('display_order'),
      supabase.from('cs_skill_milestones').select('*').eq('user_id', userId).order('level'),
      supabase.from('cs_quests').select('*').eq('user_id', userId).order('display_order'),
      supabase.from('cs_atlas').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('cs_medical').select('*').eq('user_id', userId).order('happened_on', { ascending: false }),
      supabase.from('cs_documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('cs_counters').select('*').eq('user_id', userId).order('display_order'),
      supabase.from('cs_events').select('*').eq('user_id', userId).order('happened_on', { ascending: false }),
      supabase.from('cs_money').select('*').eq('user_id', userId).order('display_order'),
      supabase.from('cs_items').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('cs_notes').select('*').eq('user_id', userId).order('display_order'),
      supabase.from('cs_people').select('*').eq('user_id', userId).order('display_order'),
      supabase.from('cs_checkups').select('*').eq('user_id', userId).order('display_order'),
    ]);

  const firstError = [profile, metrics, measurements, skills, milestones, quests, atlas, medical, documents, counters, events, money, items, notes, people, checkups]
    .find((r) => r.error)?.error;
  if (firstError) throw new Error(firstError.message);

  return {
    ...EMPTY_SHEET,
    profile: profile.data ?? null,
    metrics: metrics.data ?? [],
    measurements: measurements.data ?? [],
    skills: skills.data ?? [],
    milestones: milestones.data ?? [],
    quests: quests.data ?? [],
    atlas: atlas.data ?? [],
    medical: medical.data ?? [],
    documents: documents.data ?? [],
    counters: counters.data ?? [],
    events: events.data ?? [],
    money: money.data ?? [],
    items: items.data ?? [],
    notes: notes.data ?? [],
    people: people.data ?? [],
    checkups: checkups.data ?? [],
  };
}

/**
 * Populates a brand-new account. Safe to call repeatedly: each table is filled
 * only if it is empty, so a half-finished seed heals itself on the next load.
 *
 * Every bulk insert below writes a uniform key set on every row. PostgREST
 * rejects a batch whose objects have differing keys ("All object keys must
 * match"), which is silent unless you check `error`.
 */
/**
 * Whether seeding has anything left to do. Answered from a sheet we have
 * already loaded, so the common case - an account that was seeded months ago -
 * costs no extra round trips at all.
 */
export function needsSeed(sheet: Sheet): boolean {
  return !sheet.profile || !sheet.metrics.length || !sheet.quests.length
    || !sheet.atlas.length || !sheet.skills.length;
}

export async function seedIfEmpty(
  userId: string,
  onProgress: (msg: string) => void = () => {},
  loaded?: Sheet,
): Promise<string[]> {
  const notes: string[] = [];
  const check = (label: string, error: { message: string } | null) => {
    if (error) throw new Error(`seed ${label}: ${error.message}`);
    notes.push(label);
    onProgress(label);
  };

  // When the caller already holds the sheet, believe it rather than asking
  // the server to count rows we just read.
  const known: Record<string, boolean> = loaded ? {
    cs_metrics: !loaded.metrics.length,
    cs_quests: !loaded.quests.length,
    cs_atlas: !loaded.atlas.length,
    cs_skills: !loaded.skills.length,
  } : {};

  const isEmpty = async (table: string) => {
    if (table in known) return known[table];
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw new Error(`count ${table}: ${error.message}`);
    return (count ?? 0) === 0;
  };

  // Only seed the profile when there isn't one. An unconditional upsert here
  // silently reverted every later edit (lifespan, birthplace) on the next load.
  const existingProfile = loaded
    ? loaded.profile
    : (await supabase.from('cs_profile').select('user_id').eq('user_id', userId).maybeSingle()).data;
  if (!existingProfile) {
    const { error: pErr } = await supabase
      .from('cs_profile')
      .insert({ user_id: userId, ...SEED_PROFILE });
    check('profile', pErr);
  }

  let seededMetrics = false;
  if (await isEmpty('cs_metrics')) {
    seededMetrics = true;
    const { error } = await supabase.from('cs_metrics').insert(
      SEED_METRICS.map((m, i) => ({
        user_id: userId,
        key: m.key,
        label: m.label,
        unit: m.unit ?? '',
        category: m.category,
        direction: m.direction,
        target_low: (m as { target_low?: number }).target_low ?? null,
        target_high: (m as { target_high?: number }).target_high ?? null,
        display_order: m.display_order ?? i,
        is_public: false,
      })),
    );
    check(`metrics (${SEED_METRICS.length})`, error);
  }

  // Sample readings go in only alongside the sample metrics, i.e. on a brand
  // new account. An existing sheet that merely has no readings yet must never
  // be handed invented numbers.
  if (seededMetrics && await isEmpty('cs_measurements')) {
    const unitOf = new Map(SEED_METRICS.map((m) => [m.key, m.unit ?? '']));
    const { error } = await supabase.from('cs_measurements').insert(
      SEED_MEASUREMENTS.map((r) => ({
        user_id: userId,
        metric_key: r.key,
        value: r.value,
        unit: unitOf.get(r.key) ?? '',
        measured_at: r.on,
        source: r.source,
        note: '',
      })),
    );
    check(`measurements (${SEED_MEASUREMENTS.length})`, error);
  }

  if (await isEmpty('cs_quests')) {
    const { error } = await supabase.from('cs_quests').insert(
      SEED_QUESTS.map((q, i) => ({
        user_id: userId,
        title: q.title,
        kind: q.kind,
        track: q.track ?? '',
        phase: q.phase ?? '',
        status: q.status ?? 'locked',
        completed_on: q.on ?? null,
        progress_current: q.cur ?? null,
        progress_total: q.total ?? null,
        note: q.note ?? '',
        display_order: i,
        is_public: true,
      })),
    );
    check(`quests (${SEED_QUESTS.length})`, error);
  }

  if (await isEmpty('cs_atlas')) {
    const { error } = await supabase.from('cs_atlas').insert(
      SEED_ATLAS.map((a) => ({
        user_id: userId,
        kind: a.kind,
        name: a.name,
        detail: (a as { detail?: string }).detail ?? '',
        happened_on: null,
        years: (a as { years?: number }).years ?? null,
        is_public: true,
      })),
    );
    check(`atlas (${SEED_ATLAS.length})`, error);
  }

  if (await isEmpty('cs_skills')) {
    for (const [i, s] of SEED_SKILLS.entries()) {
      onProgress(`ladder: ${s.name}`);
      const { data: skill, error } = await supabase
        .from('cs_skills')
        .insert({
          user_id: userId,
          name: s.name,
          category: s.category,
          mastery_def: s.mastery_def,
          icon: '',
          display_order: i,
          is_public: true,
        })
        .select()
        .single();
      if (error) throw new Error(`seed skill ${s.name}: ${error.message}`);
      if (!skill) throw new Error(`seed skill ${s.name}: no row returned`);

      const { error: mErr } = await supabase.from('cs_skill_milestones').insert(
        s.ladder.map((m) => ({
          user_id: userId,
          skill_id: skill.id,
          label: m.label,
          level: m.level,
          achieved: m.achieved ?? false,
          achieved_on: m.on ?? null,
          progress_current: null,
          progress_total: null,
          note: m.note ?? '',
        })),
      );
      if (mErr) throw new Error(`seed ladder ${s.name}: ${mErr.message}`);
    }
    notes.push(`skills (${SEED_SKILLS.length})`);
    onProgress(`skills (${SEED_SKILLS.length})`);
  }

  return notes;
}

export async function toggleMilestone(id: string, achieved: boolean) {
  await write({ kind: 'update', table: 'cs_skill_milestones', id,
    patch: { achieved, achieved_on: achieved ? today() : null } });
}

export async function setQuestStatus(id: string, status: string) {
  await write({ kind: 'update', table: 'cs_quests', id,
    patch: { status, completed_on: status === 'done' ? today() : null } });
}

export async function insertRows(table: string, rows: Record<string, unknown>[]) {
  await write({ kind: 'insert', table, rows });
}

/**
 * Insert, or update in place when the row already exists. Use this wherever a
 * row is identified by what it means rather than by its id - a country is the
 * country, so ticking one twice must not leave two of it. Plain insert writes
 * blind, which duplicates whenever the caller's snapshot is behind the server:
 * two fast clicks, a double click, or an offline queue replayed after a reload.
 * `onConflict` must name a unique index or Postgres rejects the write.
 */
export async function upsertRows(
  table: string, rows: Record<string, unknown>[], onConflict: string,
) {
  await write({ kind: 'upsert', table, rows, onConflict });
}

export async function deleteRow(table: string, id: string) {
  await write({ kind: 'delete', table, id });
}

export async function updateProfile(userId: string, patch: Record<string, unknown>) {
  await write({ kind: 'profile', table: 'cs_profile', userId,
    patch: { ...patch, updated_at: now() } });
}

/**
 * Every language gets the same ladder, so levels mean the same thing across
 * them: 100 is native across speaking, reading and writing.
 */
const LANGUAGE_LADDER: [string, number][] = [
  ['Survival phrases', 10],
  ['Hold a conversation', 25],
  ['Travel and order alone', 35],
  ['Follow a film without subtitles', 50],
  ['Read a newspaper', 65],
  ['Read a novel', 80],
  ['Business fluent', 90],
  ['Native', 100],
];

export async function addLanguage(userId: string, language: string) {
  const { data, error } = await supabase
    .from('cs_skills')
    .insert({
      user_id: userId,
      name: language,
      category: 'language',
      mastery_def: `Native ${language}: speak, read and write without effort`,
      icon: '',
      display_order: 50,
      is_public: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const { error: mErr } = await supabase.from('cs_skill_milestones').insert(
    LANGUAGE_LADDER.map(([label, level]) => ({
      user_id: userId,
      skill_id: data.id,
      label,
      level,
      achieved: false,
      achieved_on: null,
      progress_current: null,
      progress_total: null,
      note: '',
    })),
  );
  if (mErr) throw new Error(mErr.message);
}

/**
 * A generic ladder for a skill whose rungs the user has not spelled out yet.
 * The top rung carries their own definition of mastery so the scale means
 * something immediately; the middle rungs are meant to be rewritten.
 */
export async function addSkill(
  userId: string,
  name: string,
  category: string,
  masteryDef: string,
) {
  const { data, error } = await supabase
    .from('cs_skills')
    .insert({
      user_id: userId,
      name,
      category,
      mastery_def: masteryDef,
      icon: '',
      display_order: 60,
      is_public: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const scaffold: [string, number][] = [
    ['Tried it', 10],
    ['Can do it unsupervised', 30],
    ['Competent', 50],
    ['Advanced', 70],
    ['Expert', 88],
    [masteryDef, 100],
  ];
  const { error: mErr } = await supabase.from('cs_skill_milestones').insert(
    scaffold.map(([label, level]) => ({
      user_id: userId,
      skill_id: data.id,
      label,
      level,
      achieved: false,
      achieved_on: null,
      progress_current: null,
      progress_total: null,
      note: '',
    })),
  );
  if (mErr) throw new Error(mErr.message);
}

/** Uploads to the private per-user folder and records the document row. */
export async function uploadDocument(userId: string, file: File, kind = 'report') {
  const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
  const { error } = await supabase.storage.from('character-sheet').upload(path, file);
  if (error) throw new Error(error.message);
  const { error: dErr } = await supabase.from('cs_documents').insert({
    user_id: userId,
    name: file.name,
    storage_path: path,
    mime_type: file.type,
    size_bytes: file.size,
    kind,
  });
  if (dErr) throw new Error(dErr.message);
  return path;
}

/** Private bucket, so links are short-lived signed URLs. */
export async function signedUrl(path: string, seconds = 3600) {
  const { data, error } = await supabase.storage
    .from('character-sheet').createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function loadDocuments(userId: string) {
  const { data, error } = await supabase
    .from('cs_documents').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setAvatar(userId: string, file: File) {
  const path = `${userId}/portrait-${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
  const { error } = await supabase.storage.from('character-sheet').upload(path, file);
  if (error) throw new Error(error.message);
  await updateProfile(userId, { avatar_url: path });
  return path;
}

export async function setMetricFocus(id: string, on: boolean) {
  await write({ kind: 'update', table: 'cs_metrics', id, patch: { is_focus: on } });
}

/**
 * Creates the sport if needed, then ticks the shared ladder up to `level`.
 * level 0 removes the skill entirely.
 */
export async function setSportLevel(
  userId: string, sport: string, level: number, category = 'sport',
) {
  const { data: existing } = await supabase
    .from('cs_skills').select('id').eq('user_id', userId).eq('name', sport).maybeSingle();

  if (level === 0) {
    if (existing) await supabase.from('cs_skills').delete().eq('id', existing.id);
    return;
  }

  let skillId = existing?.id as string | undefined;
  if (!skillId) {
    const { data, error } = await supabase.from('cs_skills').insert({
      user_id: userId, name: sport, category,
      mastery_def: `Expert-level ${sport.toLowerCase()}`, icon: '',
      display_order: 40, is_public: true,
    }).select().single();
    if (error) throw new Error(error.message);
    skillId = data.id;
    const { error: mErr } = await supabase.from('cs_skill_milestones').insert(
      SPORT_LADDER.map(([label, lv]) => ({
        user_id: userId, skill_id: skillId, label, level: lv,
        achieved: false, achieved_on: null, progress_current: null, progress_total: null, note: '',
      })),
    );
    if (mErr) throw new Error(mErr.message);
  }

  // Everything at or below the chosen level counts as reached.
  await supabase.from('cs_skill_milestones')
    .update({ achieved: true }).eq('skill_id', skillId).lte('level', level);
  await supabase.from('cs_skill_milestones')
    .update({ achieved: false, achieved_on: null }).eq('skill_id', skillId).gt('level', level);
}

export async function renameQuest(id: string, title: string) {
  await write({ kind: 'update', table: 'cs_quests', id, patch: { title } });
}

export async function setMetricGoal(
  id: string,
  goal: { target_low: number | null; target_high: number | null; direction: string },
) {
  await write({ kind: 'update', table: 'cs_metrics', id, patch: goal });
}

export async function setCounter(id: string, value: number | null) {
  await write({ kind: 'update', table: 'cs_counters', id, patch: { value, updated_at: now() } });
}

export async function setFriendOrder(userId: string, names: string[]) {
  await write({ kind: 'profile', table: 'cs_profile', userId, patch: { friend_order: names } });
}

export async function setMoney(id: string, value: number | null) {
  await write({ kind: 'update', table: 'cs_money', id, patch: { value, recorded_on: today() } });
}

export async function setPinned(table: 'cs_quests' | 'cs_skill_milestones', id: string, pinned: boolean) {
  await write({ kind: 'update', table, id, patch: { pinned } });
}

export async function updateItem(id: string, patch: Record<string, unknown>) {
  await write({ kind: 'update', table: 'cs_items', id, patch });
}

export async function resolveNote(id: string, resolved: boolean) {
  await write({ kind: 'update', table: 'cs_notes', id, patch: {
    status: resolved ? 'resolved' : 'open',
    resolved_at: resolved ? now() : null,
  } });
}

export async function answerNote(id: string, answer: string) {
  await write({ kind: 'update', table: 'cs_notes', id, patch: { answer } });
}

export async function setSkillHidden(id: string, hidden: boolean) {
  await write({ kind: 'update', table: 'cs_skills', id, patch: { hidden } });
}

export async function updateAtlas(id: string, patch: Record<string, unknown>) {
  await write({ kind: 'update', table: 'cs_atlas', id, patch });
}

export async function setTabPrefs(userId: string, order: string[], muted: string[]) {
  await write({ kind: 'profile', table: 'cs_profile', userId,
    patch: { tab_order: order, tab_muted: muted } });
}

export async function updateRow(table: string, id: string, patch: Record<string, unknown>) {
  await write({ kind: 'update', table, id, patch });
}
