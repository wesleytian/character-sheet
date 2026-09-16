import { supabase } from './supabase';
import { Sheet, EMPTY_SHEET } from './types';
import {
  SEED_SKILLS, SEED_QUESTS, SEED_METRICS, SEED_ATLAS, SEED_PROFILE,
} from './seed';
import { SPORT_LADDER } from './catalog';

export async function loadSheet(userId: string): Promise<Sheet> {
  const [profile, metrics, measurements, skills, milestones, quests, atlas, medical, documents, counters, events, money, items, notes] =
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
    ]);

  const firstError = [profile, metrics, measurements, skills, milestones, quests, atlas, medical, documents, counters, events, money, items, notes]
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
export async function seedIfEmpty(
  userId: string,
  onProgress: (msg: string) => void = () => {},
): Promise<string[]> {
  const notes: string[] = [];
  const check = (label: string, error: { message: string } | null) => {
    if (error) throw new Error(`seed ${label}: ${error.message}`);
    notes.push(label);
    onProgress(label);
  };

  const isEmpty = async (table: string) => {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw new Error(`count ${table}: ${error.message}`);
    return (count ?? 0) === 0;
  };

  // Only seed the profile when there isn't one. An unconditional upsert here
  // silently reverted every later edit (lifespan, birthplace) on the next load.
  const { data: existingProfile } = await supabase
    .from('cs_profile')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!existingProfile) {
    const { error: pErr } = await supabase
      .from('cs_profile')
      .insert({ user_id: userId, ...SEED_PROFILE });
    check('profile', pErr);
  }

  if (await isEmpty('cs_metrics')) {
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
  const { error } = await supabase
    .from('cs_skill_milestones')
    .update({
      achieved,
      achieved_on: achieved ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setQuestStatus(id: string, status: string) {
  const { error } = await supabase
    .from('cs_quests')
    .update({
      status,
      completed_on: status === 'done' ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function insertRows(table: string, rows: Record<string, unknown>[]) {
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw new Error(error.message);
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateProfile(userId: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from('cs_profile')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
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
  const { error } = await supabase.from('cs_metrics').update({ is_focus: on }).eq('id', id);
  if (error) throw new Error(error.message);
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
  const { error } = await supabase.from('cs_quests').update({ title }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setMetricGoal(
  id: string,
  goal: { target_low: number | null; target_high: number | null; direction: string },
) {
  const { error } = await supabase.from('cs_metrics').update(goal).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setCounter(id: string, value: number | null) {
  const { error } = await supabase
    .from('cs_counters')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setFriendOrder(userId: string, names: string[]) {
  const { error } = await supabase
    .from('cs_profile').update({ friend_order: names }).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function setMoney(id: string, value: number | null) {
  const { error } = await supabase
    .from('cs_money').update({ value, recorded_on: new Date().toISOString().slice(0, 10) }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setPinned(table: 'cs_quests' | 'cs_skill_milestones', id: string, pinned: boolean) {
  const { error } = await supabase.from(table).update({ pinned }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateItem(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('cs_items').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function resolveNote(id: string, resolved: boolean) {
  const { error } = await supabase.from('cs_notes').update({
    status: resolved ? 'resolved' : 'open',
    resolved_at: resolved ? new Date().toISOString() : null,
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function answerNote(id: string, answer: string) {
  const { error } = await supabase.from('cs_notes').update({ answer }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setSkillHidden(id: string, hidden: boolean) {
  const { error } = await supabase.from('cs_skills').update({ hidden }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateAtlas(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('cs_atlas').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}
