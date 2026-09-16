import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useEscape } from './useEscape';

const AREAS: [string, string, string][] = [
  ['rating_overall', 'Overall', '#DCAF89'],
  ['rating_health', 'Body', '#7FA86B'],
  ['rating_mental_health', 'Mind', '#6E8FA6'],
  ['rating_career', 'Work', '#B98B4A'],
  ['rating_finances', 'Money', '#9B86D3'],
  ['rating_romance', 'Love', '#C97B92'],
  ['rating_friends', 'Friends', '#5FB3C4'],
  ['rating_family', 'Family', '#8AA37B'],
  ['rating_fun', 'Fun', '#D9A03C'],
];

const W = 700, H = 300, PAD = { t: 14, r: 14, b: 30, l: 30 };

export function LifeChart({ onClose }: { onClose: () => void }) {
  useEscape(onClose);

  const [rows, setRows] = useState<Record<string, number | null>[] | null>(null);
  const [only, setOnly] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('monthly_reflections')
      .select(['month', ...AREAS.map(([k]) => k)].join(','))
      .order('month')
      .then(({ data }) => setRows((data as unknown as Record<string, number | null>[]) ?? []));
  }, []);

  if (!rows) return null;
  const months = rows.map((r) => String(r.month));
  const x = (i: number) => PAD.l + (i / Math.max(1, months.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - 1) / 9) * (H - PAD.t - PAD.b);

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>Life over time</h2>
        <p className="hint">
          Monthly self-ratings, 1 to 10, from your Homebase reflections. {months.length} months.
          Click a name to isolate it.
        </p>

        <div className="chart-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Life area ratings over time">
            {[2, 4, 6, 8, 10].map((v) => (
              <g key={v}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#333B41" strokeWidth="1" />
                <text x={PAD.l - 7} y={y(v) + 4} textAnchor="end" fill="#8B979C"
                      style={{ font: '10px "JetBrains Mono", monospace' }}>{v}</text>
              </g>
            ))}
            {AREAS.map(([key, label, colour]) => {
              if (only && only !== label) return null;
              const pts = rows
                .map((r, i) => (r[key] == null ? null : `${x(i)},${y(Number(r[key]))}`))
                .filter(Boolean);
              if (!pts.length) return null;
              return (
                <polyline key={key} points={pts.join(' ')} fill="none" stroke={colour}
                          strokeWidth={label === 'Overall' ? 2.5 : 1.6}
                          strokeLinejoin="round" strokeLinecap="round"
                          opacity={only ? 1 : label === 'Overall' ? 1 : 0.75} />
              );
            })}
            {months.map((m, i) => (
              <text key={m} x={x(i)} y={H - PAD.b + 16} textAnchor="middle" fill="#606C72"
                    style={{ font: '9px "JetBrains Mono", monospace' }}>{m.slice(2)}</text>
            ))}
          </svg>
        </div>

        <div className="legend">
          {AREAS.map(([, label, colour]) => (
            <button key={label} className={`lg ${only === label ? 'on' : ''}`}
                    onClick={() => setOnly(only === label ? null : label)}>
              <span className="sw" style={{ background: colour }} />{label}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <a className="src-link" href="https://myhomebase.me" target="_blank" rel="noopener"
             style={{ marginRight: 'auto' }}>edit in Homebase</a>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
