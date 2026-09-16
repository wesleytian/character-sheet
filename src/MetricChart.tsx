import { useState } from 'react';
import { Metric, Measurement } from './types';
import { setMetricGoal, setMetricFocus } from './db';
import { useEscape } from './useEscape';
import { Tip } from './Tip';
import { trajectory } from './trajectoryMath';
import { TrajectoryBlock } from './Trajectory';

const W = 640;
const H = 240;
const PAD = { t: 18, r: 18, b: 34, l: 52 };

/**
 * One metric over time. Single series, so no legend - the title names it.
 * A target band is drawn only when the metric declares one.
 */
export function MetricChart({
  metric,
  measurements,
  onClose,
  onChanged,
}: {
  metric: Metric;
  measurements: Measurement[];
  onClose: () => void;
  onChanged?: () => void;
}) {
  useEscape(onClose);

  const [hover, setHover] = useState<number | null>(null);
  const [goalLo, setGoalLo] = useState(metric.target_low?.toString() ?? '');
  const [goalHi, setGoalHi] = useState(metric.target_high?.toString() ?? '');
  const [dir, setDir] = useState(metric.direction);
  const [focus, setFocus] = useState(metric.is_focus);
  const [saved, setSaved] = useState(false);

  const saveGoal = async () => {
    await setMetricGoal(metric.id, {
      target_low: goalLo === '' ? null : Number(goalLo),
      target_high: goalHi === '' ? null : Number(goalHi),
      direction: dir,
    });
    await setMetricFocus(metric.id, focus);
    setSaved(true);
    onChanged?.();
  };

  const points = measurements
    .filter((m) => m.metric_key === metric.key && m.value != null)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));

  if (points.length === 0) {
    return (
      <div className="scrim" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>{metric.label}</h2>
          <p className="hint">No readings yet. Drop a report into the prompt, or add one by hand.</p>
          <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
        </div>
      </div>
    );
  }

  const values = points.map((p) => Number(p.value));
  const lo = Math.min(...values, metric.target_low ?? Infinity);
  const hi = Math.max(...values, metric.target_high ?? -Infinity);
  const pad = (hi - lo) * 0.18 || Math.abs(hi * 0.1) || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;

  const times = points.map((p) => new Date(p.measured_at + 'T00:00:00').getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const span = tMax - tMin || 1;

  const x = (t: number) => PAD.l + ((t - tMin) / span) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(times[i])},${y(Number(p.value))}`).join(' ');

  // Four gridlines, each labelled with a value the chart actually reaches.
  const ticks = Array.from({ length: 4 }, (_, i) => yMin + ((yMax - yMin) * i) / 3);
  const first = Number(points[0].value);
  const last = Number(points[points.length - 1].value);
  const delta = last - first;
  const better =
    metric.direction === 'higher' ? delta > 0 : metric.direction === 'lower' ? delta < 0 : null;

  const bandTop = metric.target_high != null ? y(metric.target_high) : null;
  const bandBottom = metric.target_low != null ? y(metric.target_low) : null;

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>{metric.label}</h2>
        <p className="hint">
          {points.length} readings · {points[0].measured_at} to {points[points.length - 1].measured_at}
          {metric.target_low != null || metric.target_high != null ? ' · shaded band is the target' : ''}
        </p>

        <div className="chart-head">
          <div>
            <div className="chart-big num">{last}<span className="unit">{metric.unit}</span></div>
            <div className="d">latest · {points[points.length - 1].measured_at}</div>
          </div>
          <div className="chart-delta">
            <div className={`num ${better === true ? 'g' : better === false ? 'r' : 'd'}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(Math.abs(delta) < 1 ? 3 : 1)}
            </div>
            <div className="d">since {points[0].measured_at.slice(0, 7)}</div>
          </div>
        </div>

        <div className="chart-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img"
               aria-label={`${metric.label} from ${points[0].measured_at} to ${points[points.length-1].measured_at}`}>
            {bandTop != null && bandBottom != null && (
              <rect x={PAD.l} y={Math.min(bandTop, bandBottom)} width={W - PAD.l - PAD.r}
                    height={Math.abs(bandBottom - bandTop)} fill="#7FA86B" opacity="0.10" />
            )}
            {bandTop != null && bandBottom == null && (
              <rect x={PAD.l} y={bandTop} width={W - PAD.l - PAD.r} height={H - PAD.b - bandTop}
                    fill="#7FA86B" opacity="0.10" />
            )}
            {bandBottom != null && bandTop == null && (
              <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={bandBottom - PAD.t}
                    fill="#7FA86B" opacity="0.10" />
            )}

            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#333B41" strokeWidth="1" />
                <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fill="#8B979C"
                      style={{ font: '11px "JetBrains Mono", monospace' }}>
                  {t.toFixed(Math.abs(yMax) < 5 ? 2 : 0)}
                </text>
              </g>
            ))}

            <path d={path} fill="none" stroke="#B98B4A" strokeWidth="2"
                  strokeLinejoin="round" strokeLinecap="round" />

            {points.map((p, i) => (
              <g key={p.id}>
                <circle cx={x(times[i])} cy={y(Number(p.value))} r={hover === i ? 7 : 5}
                        fill={i === points.length - 1 ? '#DCAF89' : '#B98B4A'}
                        stroke="#1D2226" strokeWidth="2" />
                <circle cx={x(times[i])} cy={y(Number(p.value))} r="16" fill="transparent"
                        onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
                <text x={x(times[i])} y={H - PAD.b + 18} textAnchor="middle" fill="#606C72"
                      style={{ font: '10px "JetBrains Mono", monospace' }}>
                  {p.measured_at.slice(2, 7)}
                </text>
              </g>
            ))}

            {hover != null && (
              <g>
                <line x1={x(times[hover])} x2={x(times[hover])} y1={PAD.t} y2={H - PAD.b}
                      stroke="#DCAF89" strokeWidth="1" strokeDasharray="3 3" />
                <text x={Math.min(x(times[hover]) + 10, W - PAD.r - 70)} y={y(Number(points[hover].value)) - 12}
                      fill="#DDE3E4" style={{ font: '600 13px "JetBrains Mono", monospace' }}>
                  {points[hover].value} {metric.unit}
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="chart-table">
          {[...points].reverse().map((p) => (
            <div className="row" key={p.id}>
              <span className="k num">{p.measured_at}</span>
              <span className="v"><b className="num">{p.value}</b> <span className="d">{metric.unit}</span></span>
              <span className="d">{p.source}</span>
            </div>
          ))}
        </div>

        {(() => {
          const t = trajectory(metric.key, measurements);
          return t ? <TrajectoryBlock metric={metric} t={t} /> : null;
        })()}

        <div className="goal-edit">
          <div className="goal-head">
            Your goal
            {metric.target_source && <Tip body={metric.target_source} />}
          </div>
          <div className="goal-row">
            <select value={dir} onChange={(e) => { setDir(e.target.value); setSaved(false); }}>
              <option value="lower">Keep it under</option>
              <option value="higher">Keep it over</option>
              <option value="range">Keep it between</option>
            </select>
            {dir !== 'lower' && (
              <input value={goalLo} onChange={(e) => { setGoalLo(e.target.value); setSaved(false); }}
                     inputMode="decimal" placeholder="min" />
            )}
            {dir !== 'higher' && (
              <input value={goalHi} onChange={(e) => { setGoalHi(e.target.value); setSaved(false); }}
                     inputMode="decimal" placeholder="max" />
            )}
            <span className="d">{metric.unit}</span>
            <label className="goal-focus">
              <input type="checkbox" checked={focus}
                     onChange={(e) => { setFocus(e.target.checked); setSaved(false); }} />
              working on it
            </label>
            <button className="btn primary" onClick={saveGoal}>{saved ? 'Saved' : 'Save goal'}</button>
          </div>
        </div>

        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
