import { useEffect, useState } from 'react';

export interface ToastMsg { id: number; kind: string; title: string }

export function Toast({ msg, onDone }: { msg: ToastMsg | null; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!msg) return;
    setLeaving(false);
    const out = window.setTimeout(() => setLeaving(true), 3200);
    const gone = window.setTimeout(onDone, 3800);
    return () => { window.clearTimeout(out); window.clearTimeout(gone); };
  }, [msg, onDone]);

  if (!msg) return null;
  return (
    <div className={`toast ${leaving ? 'out' : ''}`} role="status" aria-live="polite">
      <span className="toast-rule" />
      <div className="toast-body">
        <div className="toast-kind">{msg.kind}</div>
        <div className="toast-title">{msg.title}</div>
      </div>
      <span className="toast-rule" />
    </div>
  );
}
