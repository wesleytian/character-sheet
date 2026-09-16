import { Metric, Measurement } from './types';

/**
 * A composite health score built from the markers with the strongest evidence
 * for healthspan. Deliberately transparent: every domain shows which markers
 * fed it, so a low score points at something you can act on rather than being
 * a number you have to trust.
 */
export interface DomainScore {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  parts: { label: string; value: number; unit: string; score: number; verdict: string }[];
  missing: string[];
}

const DOMAINS: { key: string; label: string; weight: number; keys: string[] }[] = [
  { key: 'fitness', label: 'Cardiorespiratory', weight: 25,
    keys: ['vo2max', 'resting_heart_rate', 'hrr_1min'] },
  { key: 'body', label: 'Body composition', weight: 15,
    keys: ['body_fat', 'waist_circumference', 'alm_index'] },
  { key: 'metabolic', label: 'Metabolic', weight: 20,
    keys: ['hba1c', 'glucose_fasting', 'insulin_fasting', 'homa_ir', 'tyg_index'] },
  { key: 'lipids', label: 'Cardiovascular', weight: 20,
    keys: ['apob', 'ldl_cholesterol_calculated', 'hdl_cholesterol', 'triglycerides'] },
  { key: 'inflammation', label: 'Inflammation', weight: 10,
    keys: ['hs_crp', 'homocysteine', 'uric_acid'] },
  { key: 'strength', label: 'Strength & bone', weight: 10,
    keys: ['grip_strength_right', 'grip_strength_left', 'bmd_total'] },
];

/** 100 when a value sits where you want it, falling off outside the target. */
function scoreOne(v: number, direction: string, lo: number | null, hi: number | null): number | null {
  const fall = (over: number, scale: number) =>
    Math.max(0, Math.min(100, 100 * (1 - over / Math.max(scale, 1e-6))));

  if (direction === 'lower' && hi != null) {
    return v <= hi ? 100 : fall(v - hi, Math.abs(hi) * 0.6);
  }
  if (direction === 'higher' && lo != null) {
    return v >= lo ? 100 : fall(lo - v, Math.abs(lo) * 0.45);
  }
  if (lo != null && hi != null) {
    if (v >= lo && v <= hi) return 100;
    const span = (hi - lo) || 1;
    return v < lo ? fall(lo - v, span * 0.8) : fall(v - hi, span * 0.8);
  }
  return null;
}

export function healthScore(metrics: Metric[], measurements: Measurement[]) {
  const latest = (key: string) =>
    measurements
      .filter((m) => m.metric_key === key && m.value != null)
      .sort((a, b) => b.measured_at.localeCompare(a.measured_at))[0];

  const domains: DomainScore[] = DOMAINS.map((d) => {
    const parts: DomainScore['parts'] = [];
    const missing: string[] = [];

    for (const key of d.keys) {
      const metric = metrics.find((m) => m.key === key);
      if (!metric) continue;
      const reading = latest(key);
      if (!reading || reading.value == null) { missing.push(metric.label); continue; }
      const v = Number(reading.value);
      const s = scoreOne(v, metric.direction, metric.target_low, metric.target_high);
      if (s == null) continue;
      parts.push({
        label: metric.label,
        value: v,
        unit: metric.unit,
        score: Math.round(s),
        verdict: s >= 95 ? 'on target' : s >= 70 ? 'slightly off' : s >= 40 ? 'off target' : 'well off',
      });
    }

    const score = parts.length
      ? Math.round(parts.reduce((n, p) => n + p.score, 0) / parts.length)
      : null;
    return { ...d, score, parts, missing };
  });

  const scored = domains.filter((d) => d.score != null);
  const totalWeight = scored.reduce((n, d) => n + d.weight, 0);
  const overall = totalWeight
    ? Math.round(scored.reduce((n, d) => n + d.score! * d.weight, 0) / totalWeight)
    : null;

  // What is dragging it down most, weighted by how much the domain counts.
  const drags = domains
    .flatMap((d) => d.parts.map((p) => ({ ...p, domain: d.label, weight: d.weight })))
    .filter((p) => p.score < 95)
    .sort((a, b) => (a.score - b.score) * 1 || b.weight - a.weight)
    .slice(0, 4);

  return { overall, domains, drags };
}
