import { Metric } from './types';
import { Trajectory as T } from './trajectoryMath';
import { Tip } from './Tip';

const fmt = (n: number) => (Math.abs(n) < 1 ? n.toFixed(3) : Math.abs(n) < 10 ? n.toFixed(1) : n.toFixed(0));

export function TrajectoryBlock({ metric, t }: { metric: Metric; t: T }) {
  const better = (a: number, b: number) =>
    metric.direction === 'lower' ? a < b : metric.direction === 'higher' ? a > b : null;
  const beatingAge = better(t.projected, t.ageOnly);

  return (
    <div className="traj">
      <div className="goal-head">
        Five years out
        <Tip body={
          <>
            A straight line through your own {t.n} readings, extended five years, next to what
            ageing alone would do. <b>{t.drift?.note}</b> Population averages, not predictions
            about you — and with {t.n} readings over {t.years.toFixed(1)} years this is a shape,
            not a forecast.
          </>
        } />
        {!t.trustworthy && <span className="thin">thin data</span>}
      </div>

      <div className="traj-rows">
        <div className="row">
          <span className="k">Now</span>
          <span className="v"><b className="num">{fmt(t.last)}</b> <span className="d">{metric.unit} · {t.lastOn}</span></span>
        </div>
        <div className="row">
          <span className="k">Your trend</span>
          <span className="v">
            <b className={`num ${beatingAge === true ? 'g' : beatingAge === false ? 'r' : ''}`}>{fmt(t.projected)}</b>
            <span className="d"> {metric.unit} · {t.slopePerYear >= 0 ? '+' : ''}{fmt(t.slopePerYear)}/yr</span>
          </span>
        </div>
        <div className="row">
          <span className="k">Ageing alone</span>
          <span className="v">
            <b className="num d">{fmt(t.ageOnly)}</b>
            <span className="d"> {metric.unit} · {t.drift!.pctPerYear > 0 ? '+' : ''}{t.drift!.pctPerYear}%/yr</span>
          </span>
        </div>
      </div>

      <p className="traj-note">
        {t.n} readings over {t.years.toFixed(1)} years · fit {Math.round(t.r2 * 100)}%
        {!t.trustworthy && ' — too few points spread over too short a period to lean on'}
        {t.trustworthy && beatingAge === true && ' — you are ahead of the age curve'}
        {t.trustworthy && beatingAge === false && ' — you are behind the age curve'}
      </p>
    </div>
  );
}
