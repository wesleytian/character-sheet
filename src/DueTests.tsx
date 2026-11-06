import { useState } from 'react';
import { Sheet as SheetData } from './types';
import { updateRow } from './db';

interface Due {
  id: string;
  group: string;
  cadence: number;
  last: string | null;
  due: string | null;
  daysOver: number;
  /** Appointments you book, as opposed to readings parsed out of a report. */
  manual: boolean;
  note: string;
}

const addMonths = (iso: string, months: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d;
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * What is overdue. Two sources: test groups whose cadence is inferred from the
 * readings themselves, and checkups you book rather than measure — an eye exam
 * produces no number, so nothing would ever surface it otherwise.
 */
export function dueList(sheet: SheetData): Due[] {
  const groups = new Map<string, { cadence: number; last: string }>();

  for (const m of sheet.metrics) {
    if (!m.cadence_months || !m.test_group) continue;
    const last = sheet.measurements
      .filter((x) => x.metric_key === m.key)
      .map((x) => x.measured_at)
      .sort()
      .pop();
    if (!last) continue;
    const cur = groups.get(m.test_group);
    if (!cur || last > cur.last) groups.set(m.test_group, { cadence: m.cadence_months, last });
  }

  const now = new Date();
  const over = (due: Date) => Math.round((now.getTime() - due.getTime()) / 86_400_000);

  const fromMetrics: Due[] = [...groups.entries()].map(([group, { cadence, last }]) => {
    const due = addMonths(last, cadence);
    return {
      id: `g:${group}`, group, cadence, last,
      due: due.toISOString().slice(0, 10), daysOver: over(due), manual: false, note: '',
    };
  });

  const fromCheckups: Due[] = sheet.checkups.map((c) => {
    const due = c.last_done ? addMonths(c.last_done, c.cadence_months) : null;
    return {
      id: c.id, group: c.name, cadence: c.cadence_months, last: c.last_done,
      due: due ? due.toISOString().slice(0, 10) : null,
      // Never recorded sorts to the top: it is the least known, not the least urgent.
      daysOver: due ? over(due) : 9_999,
      manual: true, note: c.note,
    };
  });

  return [...fromMetrics, ...fromCheckups].sort((a, b) => b.daysOver - a.daysOver);
}

export function DueTests({ sheet, onChanged }: { sheet: SheetData; onChanged: () => void }) {
  const rows = dueList(sheet);
  const [editing, setEditing] = useState<string | null>(null);
  if (!rows.length) return null;

  // Short forms: the row is a status, not a sentence.
  const say = (d: Due) => {
    if (d.last == null) return 'not recorded';
    if (d.daysOver > 60) return `${Math.round(d.daysOver / 30)} mo overdue`;
    if (d.daysOver > 0) return `${d.daysOver}d overdue`;
    const inDays = -d.daysOver;
    if (inDays > 60) return `in ${Math.round(inDays / 30)} mo`;
    return `in ${inDays}d`;
  };

  const save = async (d: Due, when: string) => {
    await updateRow('cs_checkups', d.id, { last_done: when || null });
    setEditing(null);
    onChanged();
  };

  return (
    <>
      <div className="sec">Due</div>
      {rows.map((d) => (
        <div className={`row due ${d.daysOver > 0 ? 'over' : ''}`} key={d.id}
             title={[
               d.last ? `Last ${d.last}` : 'Never recorded',
               `every ${d.cadence} months`,
               d.due ? `due ${d.due}` : '',
               d.note,
             ].filter(Boolean).join(' · ')}>
          <span className="k">{d.group}</span>
          {editing === d.id ? (
            <span className="v">
              <input className="due-date" type="date" autoFocus defaultValue={d.last ?? today()}
                     onBlur={(e) => save(d, e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') save(d, (e.target as HTMLInputElement).value);
                       if (e.key === 'Escape') setEditing(null);
                     }} />
            </span>
          ) : (
            <span className={`v ${d.last == null ? 'd' : d.daysOver > 0 ? 'r' : 'd'}`}>
              {say(d)}
              {d.manual && (
                <button className="due-log" title="Record when you last had this"
                        onClick={() => setEditing(d.id)}>log</button>
              )}
            </span>
          )}
        </div>
      ))}
    </>
  );
}
