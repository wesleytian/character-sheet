import { useState } from 'react';
import { Sheet as SheetData } from './types';
import { healthScore } from './health';
import { useEscape } from './useEscape';

export function HealthScoreCard({ sheet }: { sheet: SheetData }) {
  const [open, setOpen] = useState(false);
  const { overall, domains } = healthScore(sheet.metrics, sheet.measurements);
  if (overall == null) return null;

  const tone = (n: number) => (n >= 85 ? 'jade' : n >= 65 ? 'gold' : 'ember');

  return (
    <>
      <button className="hscore" onClick={() => setOpen(true)}>
        <span className="hs-n">{overall}</span>
        <span className="hs-l">Health<br />score</span>
        <span className="hs-bars">
          {domains.map((d) => (
            <span className="hs-bar" key={d.key} title={`${d.label} ${d.score ?? '—'}`}>
              <span className={`fill ${d.score == null ? '' : tone(d.score)}`}
                    style={{ height: `${d.score ?? 0}%` }} />
            </span>
          ))}
        </span>
        <span className="more">breakdown</span>
      </button>

      {open && (
        <ScoreModal sheet={sheet} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ScoreModal({ sheet, onClose }: { sheet: SheetData; onClose: () => void }) {
  useEscape(onClose);
  const { overall, domains, drags } = healthScore(sheet.metrics, sheet.measurements);
  const tone = (n: number) => (n >= 85 ? 'g' : n >= 65 ? 'y' : 'r');

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>Health score</h2>
        <p className="hint">
          Weighted from your latest readings against your own targets. Not a medical opinion —
          it just tells you which markers are furthest from where you want them.
        </p>

        <div className="chart-head">
          <div>
            <div className="chart-big num">{overall}<span className="unit">/100</span></div>
            <div className="d">across {domains.filter((d) => d.score != null).length} domains</div>
          </div>
        </div>

        {drags.length > 0 && (
          <div className="drags">
            <div className="panel-head">Pulling it down</div>
            {drags.map((p) => (
              <div className="row" key={p.label}>
                <span className="k">{p.label}</span>
                <span className="v">
                  <b className="num">{p.value}</b> <span className="d">{p.unit}</span>{' '}
                  <span className={tone(p.score)}>{p.verdict}</span>
                </span>
                <span className="num d">{p.score}</span>
              </div>
            ))}
          </div>
        )}

        <div className="labs-scroll">
          {domains.map((d) => (
            <div key={d.key}>
              <div className="panel-head">
                {d.label} <span className="d">weight {d.weight}% · score {d.score ?? '—'}</span>
              </div>
              {d.parts.map((p) => (
                <div className="row" key={p.label}>
                  <span className="k">{p.label}</span>
                  <span className="v">
                    <b className="num">{p.value}</b> <span className="d">{p.unit}</span>{' '}
                    <span className={tone(p.score)}>{p.verdict}</span>
                  </span>
                  <span className="num d">{p.score}</span>
                </div>
              ))}
              {d.missing.length > 0 && (
                <p className="d" style={{ fontSize: 13.5, margin: '2px 0 0' }}>
                  No reading: {d.missing.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
