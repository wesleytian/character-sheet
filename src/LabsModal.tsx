import { useState } from 'react';
import { Sheet as SheetData, Metric } from './types';
import { useEscape } from './useEscape';

/** All 135 biomarkers, grouped by panel, filterable. */
export function LabsModal({
  sheet, onClose, onOpen, category = 'labs', title = 'Bloodwork',
}: {
  sheet: SheetData; onClose: () => void; onOpen: (m: Metric) => void;
  category?: string; title?: string;
}) {
  useEscape(onClose);

  const [filter, setFilter] = useState('');
  const labs = sheet.metrics.filter((m) => m.category === category);
  const panels = [...new Set(labs.map((m) => m.panel || 'All'))];

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="hint">
          {labs.length} measures · {sheet.measurements.filter((x) => labs.some((m) => m.key === x.metric_key)).length} readings.
          Click any row for its history.
        </p>
        <div className="field">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" autoFocus />
        </div>
        <div className="labs-scroll">
          {panels.map((panel) => {
            const rows = labs.filter(
              (m) => (m.panel || 'All') === panel && m.label.toLowerCase().includes(filter.toLowerCase()),
            );
            if (!rows.length) return null;
            return (
              <div key={panel}>
                <div className="panel-head">{panel}</div>
                {rows.map((m) => {
                  const hist = sheet.measurements
                    .filter((x) => x.metric_key === m.key)
                    .sort((a, b) => b.measured_at.localeCompare(a.measured_at));
                  const latest = hist[0];
                  let tone = 'd';
                  if (latest?.value != null) {
                    const v = Number(latest.value);
                    const bad =
                      (m.target_low != null && v < m.target_low) || (m.target_high != null && v > m.target_high);
                    tone = bad ? 'y' : 'g';
                  }
                  return (
                    <button className="row metric-row" key={m.id} onClick={() => onOpen(m)}>
                      <span className="k" style={{ width: '18ch' }}>{m.label}</span>
                      <span className="v">
                        {latest ? (
                          <>
                            <b className={`num ${tone}`}>{latest.value ?? latest.text_value}</b>{' '}
                            <span className="d">{m.unit}</span>
                          </>
                        ) : (
                          <span className="d">—</span>
                        )}
                      </span>
                      <span className="spark num d">
                        {hist.length > 1 ? `${hist.length}\u00d7` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
