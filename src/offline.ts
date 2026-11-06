import { Sheet, EMPTY_SHEET } from './types';

/**
 * Offline support, in two halves.
 *
 * Reads: the last loaded sheet is kept in localStorage and rendered straight
 * away, so opening the page with no connection - or with a slow one - shows
 * your character rather than a spinner.
 *
 * Writes: when a write cannot reach Supabase it goes into a durable queue and
 * is applied to the cached sheet, so the change is visible immediately and
 * survives a reload. The queue drains as soon as the connection returns.
 */

const SHEET_KEY = (userId: string) => `cs-sheet:${userId}`;
const QUEUE_KEY = 'cs-queue';

/** Which array on the Sheet each table feeds. */
const FIELD: Record<string, keyof Sheet> = {
  cs_metrics: 'metrics',
  cs_measurements: 'measurements',
  cs_skills: 'skills',
  cs_skill_milestones: 'milestones',
  cs_quests: 'quests',
  cs_atlas: 'atlas',
  cs_medical: 'medical',
  cs_documents: 'documents',
  cs_counters: 'counters',
  cs_events: 'events',
  cs_money: 'money',
  cs_items: 'items',
  cs_notes: 'notes',
  cs_people: 'people',
  cs_checkups: 'checkups',
};

export type Op =
  | { kind: 'insert'; table: string; rows: Record<string, unknown>[]; at: number }
  | { kind: 'upsert'; table: string; rows: Record<string, unknown>[]; onConflict: string; at: number }
  | { kind: 'update'; table: string; id: string; patch: Record<string, unknown>; at: number }
  | { kind: 'delete'; table: string; id: string; at: number }
  | { kind: 'profile'; table: 'cs_profile'; userId: string; patch: Record<string, unknown>; at: number };

/**
 * Op without the timestamp. Omit must be applied through a type parameter or
 * it collapses the union into its common keys, which are none of the useful ones.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type OpInput = DistributiveOmit<Op, 'at'>;

// ---------------------------------------------------------------- cache

export function cacheSheet(userId: string, sheet: Sheet) {
  try {
    localStorage.setItem(SHEET_KEY(userId), JSON.stringify(sheet));
  } catch {
    // Quota, private mode: a missing cache is not worth failing a load over.
  }
}

export function cachedSheet(userId: string): Sheet | null {
  try {
    const raw = localStorage.getItem(SHEET_KEY(userId));
    if (!raw) return null;
    // Merged into EMPTY_SHEET so a cache written before a new table existed
    // still loads instead of crashing on an undefined array.
    return { ...EMPTY_SHEET, ...(JSON.parse(raw) as Sheet) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- queue

export function queued(): Op[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as Op[];
  } catch {
    return [];
  }
}

const writeQueue = (ops: Op[]) => {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(ops)); } catch { /* full */ }
  listeners.forEach((f) => f(ops.length));
};

const listeners = new Set<(n: number) => void>();
export function onQueueChange(f: (n: number) => void) {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

/**
 * Every write is announced here the moment it is made, so the view can apply
 * it without waiting for the round trip and the reload that follows. One
 * subscription covers every button in the app rather than an optimistic
 * overlay per widget.
 */
const opListeners = new Set<(op: Op) => void>();
export function onOp(f: (op: Op) => void) {
  opListeners.add(f);
  return () => { opListeners.delete(f); };
}
export const emitOp = (op: Op) => opListeners.forEach((f) => f(op));

export function enqueue(op: Op) {
  writeQueue([...queued(), op]);
}

/** Replays a queued op against the cached sheet so the UI reflects it now. */
export function applyLocally(sheet: Sheet, op: Op): Sheet {
  if (op.kind === 'profile') {
    return { ...sheet, profile: { ...(sheet.profile ?? {}), ...op.patch } as Sheet['profile'] };
  }
  const field = FIELD[op.table];
  if (!field) return sheet;
  const rows = (sheet[field] ?? []) as unknown as Record<string, unknown>[];

  if (op.kind === 'insert') {
    // A local id so React keys stay stable; the server issues the real one on sync.
    const added = op.rows.map((r) => ({ id: `local-${Math.random().toString(36).slice(2)}`, ...r }));
    return { ...sheet, [field]: [...rows, ...added] };
  }
  if (op.kind === 'upsert') {
    // Same conflict key the server resolves on, applied locally so a queued
    // upsert does not show up as a second row while it waits for the network.
    const keys = op.onConflict.split(',').map((k) => k.trim());
    const idOf = (r: Record<string, unknown>) => keys.map((k) => String(r[k] ?? '')).join('\u0000');
    const incoming = new Map(op.rows.map((r) => [idOf(r), r]));
    const merged = rows.map((r) => {
      const hit = incoming.get(idOf(r));
      if (!hit) return r;
      incoming.delete(idOf(r));
      return { ...r, ...hit };
    });
    const added = [...incoming.values()]
      .map((r) => ({ id: `local-${Math.random().toString(36).slice(2)}`, ...r }));
    return { ...sheet, [field]: [...merged, ...added] };
  }
  if (op.kind === 'update') {
    return { ...sheet, [field]: rows.map((r) => (r.id === op.id ? { ...r, ...op.patch } : r)) };
  }
  return { ...sheet, [field]: rows.filter((r) => r.id !== op.id) };
}

export function applyAll(sheet: Sheet, ops: Op[] = queued()): Sheet {
  return ops.reduce(applyLocally, sheet);
}

/**
 * Drains the queue oldest first. An op that fails because the network is still
 * down stays queued; one the server rejects outright is dropped, since
 * retrying it forever would block everything behind it.
 */
export async function drain(
  run: (op: Op) => Promise<void>,
  onNote: (msg: string) => void = () => {},
): Promise<number> {
  let ops = queued();
  if (!ops.length) return 0;
  let done = 0;
  while (ops.length) {
    const [op] = ops;
    try {
      await run(op);
      done++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!navigator.onLine || /fetch|network/i.test(msg)) break;
      onNote(`dropped a queued ${op.kind} on ${op.table}: ${msg}`);
    }
    ops = ops.slice(1);
    writeQueue(ops);
  }
  return done;
}

export const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine;

/** True when a failure looks like "no connection" rather than "server said no". */
export const looksOffline = (e: unknown) => {
  if (isOffline()) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /failed to fetch|networkerror|load failed|err_internet|timeout/i.test(msg);
};
