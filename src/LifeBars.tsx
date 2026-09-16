import { useEffect, useState } from 'react';
import { loadLifeBars, LifeSnapshot } from './lifedata';
import { LifeChart } from './LifeChart';

/** The five-or-so things that actually decide how life is going. */
export function LifeBars() {
  const [snap, setSnap] = useState<LifeSnapshot | null | 'loading'>('loading');
  const [chart, setChart] = useState(false);
  useEffect(() => { loadLifeBars().then(setSnap); }, []);

  if (snap === 'loading' || snap === null) return null;

  const tone = (n: number) => (n >= 8 ? 'jade' : n >= 6 ? 'gold' : 'ember');
  return (
    <div className="lifebars">
      <div className="lifebars-head">
        <button className="lb-title" onClick={() => setChart(true)}>Life<span className="more">over time</span></button>
        <span className="d">
          {snap.month}
          {snap.overall != null && <> · overall <b className="num">{snap.overall}</b></>}
        </span>
        <a className="src-link" href="https://myhomebase.me" target="_blank" rel="noopener">Homebase</a>
      </div>
      <div className="lifebars-grid">
        {snap.bars.map((b) => (
          <div className="lifebar" key={b.key}>
            <div className="lifebar-top">
              <span className="nm">{b.label}</span>
              <span className="num">{b.score != null ? b.score.toFixed(b.score % 1 ? 1 : 0) : '—'}</span>
            </div>
            <div className="track">
              {b.score != null && (
                <div className={`fill ${tone(b.score)}`} style={{ width: `${(b.score / 10) * 100}%` }} />
              )}
            </div>
          </div>
        ))}
      </div>
      {chart && <LifeChart onClose={() => setChart(false)} />}
    </div>
  );
}
