/** The fellowship panel, read from the local CRM at 127.0.0.1:5555. */
export interface Friend {
  id: number;
  name: string;
  interaction_score_365: number;
  msg_count_365: number;
  call_duration_seconds_365: number;
}

const CACHE_KEY = 'cs-crm-contacts';
const CACHE_MS = 30 * 60 * 1000;   // half an hour

type Raw = Friend & { archived: number; is_service: number; unnamed: boolean };

function readCache(): Raw[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, rows } = JSON.parse(raw) as { at: number; rows: Raw[] };
    if (Date.now() - at > CACHE_MS) return null;
    return rows;
  } catch { return null; }
}

/**
 * The CRM returns hundreds of contacts and is hit on every render of the People tab.
 * Cached for the session so switching tabs is instant and the local Flask app
 * is not queried repeatedly.
 */
export async function loadFriends(limit = 12): Promise<Friend[] | null> {
  const rank = (all: Raw[]) => all
    .filter((c) => !c.archived && !c.is_service && !c.unnamed)
    .filter((c) => (c.interaction_score_365 ?? 0) > 0)
    .sort((a, b) => (b.interaction_score_365 ?? 0) - (a.interaction_score_365 ?? 0))
    .slice(0, limit);

  const cached = readCache();
  if (cached) return rank(cached);

  try {
    const res = await fetch('/crm/api/contacts', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const all = (await res.json()) as Raw[];
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows: all }));
    } catch { /* quota or private mode - ranking still works */ }
    // Rank purely on contact volume. The CRM's interaction_score_365 is
    // messages + call minutes x3, which is exactly "who do I actually talk to".
    // Tier and starred are manual labels and deliberately not used here.
    return rank(all);
  } catch {
    // CRM not running - the panel just says so.
    return null;
  }
}

/** Forget the cached contacts so the next read hits the CRM. */
export function refreshFriends() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
