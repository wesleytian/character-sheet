import { Sheet as SheetData } from './types';
import { useEscape } from './useEscape';

const KINDS: [string, string][] = [
  ['injury', 'Injuries'],
  ['surgery', 'Surgeries'],
  ['condition', 'Conditions'],
  ['allergy', 'Allergies'],
  ['body_mod', 'Body'],
];

export function MedicalModal({ sheet, onClose }: { sheet: SheetData; onClose: () => void }) {
  useEscape(onClose);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Medical history</h2>
        <p className="hint">{sheet.medical.length} entries. Add more by telling the prompt.</p>
        <div className="labs-scroll">
          {KINDS.map(([kind, label]) => {
            const rows = sheet.medical.filter((m) => m.kind === kind);
            return (
              <div key={kind}>
                <div className="panel-head">{label}</div>
                {rows.length === 0 ? (
                  <p className="d" style={{ fontSize: 14, margin: '0 0 6px' }}>
                    {kind === 'allergy' ? 'None recorded yet.' : 'None recorded.'}
                  </p>
                ) : rows.map((m) => (
                  <div className="row" key={m.id}>
                    <span className="k num">{m.happened_on?.slice(0, 4) ?? '—'}</span>
                    <span className="v">
                      {m.name}
                      {m.body_part && <span className="d"> · {m.body_part}</span>}
                      {m.note && <span className="d"> · {m.note}</span>}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
