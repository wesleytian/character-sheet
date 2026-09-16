import { useEffect, useRef, useState } from 'react';

/**
 * One tooltip used everywhere, so dismissal behaves the same in every corner
 * of the sheet: click the ?, click anywhere outside or press Escape to close.
 */
export function Tip({ body, children }: { body: React.ReactNode; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <span className="tip" ref={ref}>
      <button className="help" aria-expanded={open} aria-label="What this means"
              onClick={() => setOpen((v) => !v)}>?</button>
      {children}
      {open && <span className="tip-body">{body}</span>}
    </span>
  );
}
