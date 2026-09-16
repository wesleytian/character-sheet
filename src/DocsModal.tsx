import { Sheet as SheetData } from './types';
import { Documents } from './Documents';
import { useEscape } from './useEscape';

export function DocsModal({ sheet, onClose }: { sheet: SheetData; onClose: () => void }) {
  useEscape(onClose);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Source documents</h2>
        <p className="hint">
          The original reports behind the readings — DEXA scans, blood panels, the VO2 test.
        </p>
        <div className="labs-scroll">
          <Documents docs={sheet.documents} />
        </div>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
