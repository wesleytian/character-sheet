import { DocumentRow } from './types';
import { signedUrl } from './db';

/** The reports the readings actually came from, openable. */
export function Documents({
  docs, onRemove,
}: { docs: DocumentRow[]; onRemove?: (id: string) => void }) {
  if (!docs.length) {
    return (
      <p className="d">
        Nothing stored yet. Drop a DEXA, blood panel or VO2 report into the prompt
        at the bottom — it gets read, logged, and the original is kept here.
      </p>
    );
  }
  const open = async (path: string) => {
    try { window.open(await signedUrl(path), '_blank', 'noopener'); } catch { /* link expired */ }
  };
  return (
    <>
      {docs.map((d) => (
        <div className="row metric-row doc-row" key={d.id}>
          <button className="doc-open" onClick={() => open(d.storage_path)}>
            <span className="k num">{d.created_at.slice(0, 10)}</span>
            <span className="v">{d.name}</span>
            <span className="d">
              {d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : ''}
            </span>
          </button>
          {onRemove && (
            <button className="unpin" title="Remove" onClick={() => onRemove(d.id)}>×</button>
          )}
        </div>
      ))}
    </>
  );
}
