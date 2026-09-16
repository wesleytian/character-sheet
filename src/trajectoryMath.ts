import { Measurement } from './types';

/**
 * Age-related change per year for an adult male, from published population
 * averages. These are the "do nothing" baselines a trend gets compared with -
 * not predictions about you.
 */
export const AGE_DRIFT: Record<string, { pctPerYear: number; note: string }> = {
  bmd_total:          { pctPerYear: -0.3, note: 'Bone density peaks near 30 and drifts down roughly 0.3%/yr through the 30s, steepening later.' },
  lean_mass:          { pctPerYear: -0.7, note: 'Muscle mass falls about 3–8% per decade after 30 without resistance training.' },
  body_fat:           { pctPerYear: +1.2, note: 'Body fat tends to creep up through the 30s and 40s at broadly 1%/yr relative.' },
  vo2max:             { pctPerYear: -1.0, note: 'VO2 max declines around 10% per decade after 30 in untrained adults.' },
  grip_strength_right:{ pctPerYear: -0.4, note: 'Grip holds fairly flat into the 40s, then falls away.' },
  grip_strength_left: { pctPerYear: -0.4, note: 'Grip holds fairly flat into the 40s, then falls away.' },
  total_testosterone: { pctPerYear: -1.0, note: 'Total testosterone falls roughly 1%/yr from the 30s onward.' },
};

export interface Trajectory {
  n: number;
  years: number;          // span covered by the readings
  slopePerYear: number;   // from your own data
  r2: number;             // how well the line fits
  last: number;
  lastOn: string;
  projected: number;      // your trend, five years out
  ageOnly: number;        // ageing alone, five years out
  drift: { pctPerYear: number; note: string } | null;
  trustworthy: boolean;
}

export function trajectory(
  key: string, measurements: Measurement[], horizonYears = 5,
): Trajectory | null {
  if (!(key in AGE_DRIFT)) return null;   // only slow-moving measures

  const pts = measurements
    .filter((m) => m.metric_key === key && m.value != null)
    .map((m) => ({ t: new Date(m.measured_at + 'T00:00:00').getTime(), v: Number(m.value), on: m.measured_at }))
    .sort((a, b) => a.t - b.t);
  if (pts.length < 3) return null;

  const YEAR = 365.2425 * 86_400_000;
  const t0 = pts[0].t;
  const xs = pts.map((p) => (p.t - t0) / YEAR);
  const ys = pts.map((p) => p.v);
  const n = pts.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;

  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (intercept + slope * xs[i])) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  const last = ys[n - 1];
  const span = xs[n - 1];
  const drift = AGE_DRIFT[key];

  return {
    n,
    years: span,
    slopePerYear: slope,
    r2,
    last,
    lastOn: pts[n - 1].on,
    projected: last + slope * horizonYears,
    ageOnly: last * (1 + drift.pctPerYear / 100) ** horizonYears,
    drift,
    // Three readings across less than two years is a shape, not a forecast.
    trustworthy: n >= 4 && span >= 2 && r2 >= 0.5,
  };
}
