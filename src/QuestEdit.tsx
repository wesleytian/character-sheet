import { useState } from 'react';
import { Quest } from './types';
import { supabase } from './supabase';
import { deleteRow } from './db';
import { useEscape } from './useEscape';

export function QuestEdit({
  quest, onClose, onSaved,
}: { quest: Quest; onClose: () => void; onSaved: () => void }) {
  useEscape(onClose);

  const [title, setTitle] = useState(quest.title);
  const [kind, setKind] = useState(quest.kind);
  const [track, setTrack] = useState(quest.track);
  const [status, setStatus] = useState(quest.status);
  const [note, setNote] = useState(quest.note);
  const [done, setDone] = useState(quest.completed_on ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true); setError('');
    try {
      if (!title.trim()) throw new Error('A quest needs a title.');
      const { error } = await supabase.from('cs_quests').update({
        title: title.trim(), kind, track: kind === 'side' ? track : '',
        status, note, completed_on: status === 'done' ? (done || null) : null,
      }).eq('id', quest.id);
      if (error) throw new Error(error.message);
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await deleteRow('cs_quests', quest.id); onSaved(); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit quest</h2>
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <div className="two">
            <div>
              <label>Kind</label>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="main">Main quest</option>
                <option value="side">Side quest</option>
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="locked">Not started</option>
                <option value="active">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
        </div>
        {kind === 'side' && (
          <div className="field">
            <label>Track</label>
            <input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="Adventuring, Strength…" />
          </div>
        )}
        {status === 'done' && (
          <div className="field">
            <label>Completed on</label>
            <input type="date" value={done} onChange={(e) => setDone(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="r">{error}</p>}
        <div className="modal-actions">
          <button className="btn danger" onClick={remove} disabled={busy}>Delete</button>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
