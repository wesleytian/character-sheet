import { Sheet as SheetData } from './types';

interface Due {
  group: string;
  cadence: number;
  last: string;
  due: string;
  daysOver: number;
}

const addMonths = (iso: string, months: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d;
};

/** What is overdue, from each test group's cadence and its last reading. */
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

  const today = new Date();
  return [...groups.entries()]
    .map(([group, { cadence, last }]) => {
      const due = addMonths(last, cadence);
      return {
        group,
        cadence,
        last,
        due: due.toISOString().slice(0, 10),
        daysOver: Math.round((today.getTime() - due.getTime()) / 86_400_000),
      };
    })
    .sort((a, b) => b.daysOver - a.daysOver);
}

export function DueTests({ sheet }: { sheet: SheetData }) {
  const rows = dueList(sheet);
  if (!rows.length) return null;

  const say = (d: Due) => {
    if (d.daysOver > 60) return `${Math.round(d.daysOver / 30)} months overdue`;
    if (d.daysOver > 0) return `${d.daysOver} days overdue`;
    const inDays = -d.daysOver;
    if (inDays > 60) return `due in ${Math.round(inDays / 30)} months`;
    return `due in ${inDays} days`;
  };

  return (
    <>
      <div className="sec">
        Due <span className="count">every reading has a cadence</span>
      </div>
      {rows.map((d) => (
        <div className={`row due ${d.daysOver > 0 ? 'over' : ''}`} key={d.group}>
          <span className="k">{d.group}</span>
          <span className="v">
            <span className={d.daysOver > 0 ? 'r' : 'd'}>{say(d)}</span>
            <span className="d"> · last {d.last} · every {d.cadence} mo</span>
          </span>
        </div>
      ))}
    </>
  );
}
