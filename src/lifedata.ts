import { supabase } from './supabase';

/**
 * The life areas come straight from Homebase's monthly reflection - same
 * database, so these are the scores already given rather than a second rating
 * to keep up to date.
 */
export interface LifeBar { key: string; label: string; score: number | null }
export interface LifeSnapshot { month: string; overall: number | null; bars: LifeBar[] }

const AREAS: [string, string][] = [
  ['rating_health', 'Body'],
  ['rating_mental_health', 'Mind'],
  ['rating_career', 'Work'],
  ['rating_finances', 'Money'],
  ['rating_romance', 'Love'],
  ['rating_friends', 'People'],
  ['rating_fun', 'Fun'],
];

export async function loadLifeBars(): Promise<LifeSnapshot | null> {
  const { data, error } = await supabase
    .from('monthly_reflections')
    .select('month, rating_overall, rating_health, rating_mental_health, rating_career, rating_finances, rating_romance, rating_friends, rating_family, rating_fun')
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as Record<string, string | number | null>;
  const num = (v: string | number | null) => (v == null ? null : Number(v));
  const bars = AREAS.map(([key, label]) => {
    if (key === 'rating_friends') {
      const f = num(row.rating_friends);
      const fam = num(row.rating_family);
      const both = [f, fam].filter((x): x is number => x != null);
      return { key, label, score: both.length ? both.reduce((a, b) => a + b, 0) / both.length : null };
    }
    return { key, label, score: num(row[key]) };
  });
  return { month: String(row.month), overall: num(row.rating_overall), bars };
}
