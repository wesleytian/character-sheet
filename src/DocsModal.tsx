import { useRef, useState } from 'react';
import { Sheet as SheetData } from './types';
import { Documents } from './Documents';
import { uploadDocument, deleteRow } from './db';
import { useEscape } from './useEscape';

export function DocsModal({
  sheet, userId, onChanged, onClose,
}: { sheet: SheetData; userId: string; onChanged: () => void; onClose: () => void }) {
  useEscape(onClose);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const take = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    try {
      for (const file of Array.from(files)) {
        setBusy(file.name);
        await uploadDocument(userId, file);
      }
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  };

  const remove = async (id: string) => {
    await deleteRow('cs_documents', id);
    onChanged();
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Source documents</h2>
        <p className="hint">
          The original reports behind the readings — DEXA scans, blood panels, the VO2 test.
          Dropping a file here stores it as-is; to have its numbers read out and logged,
          drop it into the prompt at the bottom of the page instead.
        </p>

        <div
          className={`dropzone ${over ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? `Uploading ${busy}…` : 'Drop files here, or click to choose'}
          <input ref={fileRef} type="file" multiple hidden
                 onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
        </div>

        {error && <p className="r">{error}</p>}

        <div className="labs-scroll">
          <Documents docs={sheet.documents} onRemove={remove} />
        </div>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
