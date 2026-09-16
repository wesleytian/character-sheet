import { useState } from 'react';
import { NoteRow } from './types';
import { resolveNote, answerNote } from './db';
import { useEscape } from './useEscape';

const KINDS: [string, string, string][] = [
  ['question', 'Questions for you', 'Things I could not determine and guessed at, or left blank.'],
  ['flag', 'Worth a look', 'Things in your own data that stand out.'],
  ['todo', 'Still to do', 'Work left on the sheet itself.'],
];

export function InboxButton({ notes, onChanged }: { notes: NoteRow[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const openNotes = notes.filter((n) => n.status === 'open');
  const high = openNotes.filter((n) => n.severity === 'high').length;

  return (
    <>
      <button className={`inbox-btn ${high ? 'urgent' : ''}`} onClick={() => setOpen(true)}>
        Inbox
        <span className="n">{openNotes.length}</span>
      </button>
      {open && <InboxModal notes={notes} onChanged={onChanged} onClose={() => setOpen(false)} />}
    </>
  );
}

function InboxModal({
  notes, onChanged, onClose,
}: { notes: NoteRow[]; onChanged: () => void; onClose: () => void }) {
  useEscape(onClose);
  const [showResolved, setShowResolved] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState('');

  const visible = notes.filter((n) => (showResolved ? true : n.status === 'open'));

  const send = async (n: NoteRow) => {
    if (!text.trim()) return;
    await answerNote(n.id, text.trim());
    setText(''); setReplying(null);
    onChanged();
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>Inbox</h2>
        <p className="hint">
          Open questions, things worth a look in your data, and work left to do.
          Reply to anything — not just questions — and I will pick it up.
        </p>

        <div className="subtabs" style={{ margin: '0 0 10px' }}>
          <button className={`subtab ${!showResolved ? 'on' : ''}`} onClick={() => setShowResolved(false)}>
            Open <span className="n">{notes.filter((n) => n.status === 'open').length}</span>
          </button>
          <button className={`subtab ${showResolved ? 'on' : ''}`} onClick={() => setShowResolved(true)}>
            All <span className="n">{notes.length}</span>
          </button>
        </div>

        <div className="labs-scroll">
          {KINDS.map(([kind, label, blurb]) => {
            const rows = visible.filter((n) => n.kind === kind)
              .sort((a, b) => a.display_order - b.display_order);
            if (!rows.length) return null;
            return (
              <div key={kind}>
                <div className="panel-head">{label} <span className="d">{blurb}</span></div>
                {rows.map((n) => (
                  <div className={`note ${n.status} ${n.severity}`} key={n.id}>
                    <div className="note-top">
                      <button className="note-check" title={n.status === 'open' ? 'Mark done' : 'Reopen'}
                              onClick={async () => { await resolveNote(n.id, n.status === 'open'); onChanged(); }}>
                        <span className="bxm">{n.status === 'resolved' ? '✓' : ''}</span>
                      </button>
                      <span className="note-title">{n.title}</span>
                      {n.severity && <span className={`sev ${n.severity}`}>{n.severity}</span>}
                    </div>
                    {n.body && <p className="note-body">{n.body}</p>}
                    {n.answer && (
                      <p className="note-answer">
                        <b>You:</b> {n.answer}
                        <button className="note-replybtn inline"
                                onClick={() => { setReplying(n.id); setText(n.answer); }}>edit</button>
                      </p>
                    )}
                    {replying === n.id ? (
                      <div className="note-reply">
                        <textarea value={text} autoFocus rows={2}
                                  placeholder={n.kind === 'question' ? 'Your answer…' : 'Your note back…'}
                                  onChange={(e) => setText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(n);
                                  }} />
                        <div className="note-reply-acts">
                          <button className="btn" onClick={() => { setReplying(null); setText(''); }}>Cancel</button>
                          <button className="btn primary" onClick={() => send(n)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      !n.answer && (
                        <button className="note-replybtn" onClick={() => { setReplying(n.id); setText(n.answer); }}>
                          {n.kind === 'question' ? 'answer' : 'reply'}
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          {!visible.length && <p className="d">Nothing open. </p>}
        </div>

        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
