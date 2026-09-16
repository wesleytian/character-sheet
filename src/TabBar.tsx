import { useState } from 'react';
import { setTabPrefs } from './db';

export interface TabDef { id: string; label: string; count: string }

/**
 * Tabs you can reorder and dim. Dimmed is deliberately not hidden - a tab you
 * are not using now is still worth finding later.
 */
export function TabBar({
  tabs, view, setView, order, muted, userId, onChanged, children,
}: {
  tabs: TabDef[]; view: string; setView: (v: string) => void;
  order: string[]; muted: string[]; userId: string; onChanged: () => void;
  children?: React.ReactNode;
}) {
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null);
  const [customising, setCustomising] = useState(false);

  const ordered = [...tabs].sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const isMuted = (id: string) => muted.includes(id);

  const save = async (nextOrder: string[], nextMuted: string[]) => {
    await setTabPrefs(userId, nextOrder, nextMuted);
    onChanged();
  };

  const drop = async (targetId: string, after: boolean) => {
    const from = drag;
    setDrag(null); setOver(null);
    if (!from || from === targetId) return;
    const ids = ordered.map((t) => t.id).filter((i) => i !== from);
    const at = ids.indexOf(targetId);
    ids.splice(after ? at + 1 : at, 0, from);
    await save(ids, muted);
  };

  const toggleMute = async (id: string) => {
    await save(ordered.map((t) => t.id),
      isMuted(id) ? muted.filter((m) => m !== id) : [...muted, id]);
  };

  return (
    <>
      <nav className="tabs">
        {ordered.map((t) => (
          <button
            key={t.id}
            className={
              `tab${view === t.id ? ' on' : ''}${isMuted(t.id) ? ' muted' : ''}` +
              (drag === t.id ? ' dragging' : '') +
              (over?.id === t.id ? (over.after ? ' drop-after' : ' drop-before') : '')
            }
            draggable={customising}
            onDragStart={(e) => {
              setDrag(t.id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', t.id);
            }}
            onDragEnd={() => { setDrag(null); setOver(null); }}
            onDragOver={(e) => {
              if (!customising) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setOver({ id: t.id, after: e.clientX > r.left + r.width / 2 });
            }}
            onDrop={(e) => {
              if (!customising) return;
              e.preventDefault();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              drop(t.id, e.clientX > r.left + r.width / 2);
            }}
            onClick={() => (customising ? toggleMute(t.id) : setView(t.id))}
            title={customising ? (isMuted(t.id) ? 'Click to un-dim' : 'Click to dim') : undefined}
          >
            {t.label}{t.count && <span className="n">{t.count}</span>}
          </button>
        ))}

        <button className={`tab-cog ${customising ? 'on' : ''}`}
                onClick={() => setCustomising((v) => !v)}
                title="Reorder and dim tabs">
          {customising ? 'done' : '⚙'}
        </button>

        {children}
      </nav>

      {customising && (
        <p className="tab-hint">Drag to reorder · click a tab to dim or restore it</p>
      )}
    </>
  );
}
