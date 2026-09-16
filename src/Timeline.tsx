import { Sheet as SheetData } from './types';

interface Event {
  year: string;
  date: string;
  tag: 'quest' | 'skill' | 'med' | 'life';
  label: string;
  detail?: string;
}

/**
 * The chronicle is derived, not stored - every dated thing on the sheet already
 * knows when it happened, so the timeline is a view rather than another table.
 */
export function Timeline({ sheet }: { sheet: SheetData }) {
  const events: Event[] = [];

  for (const q of sheet.quests) {
    if (q.completed_on) {
      events.push({
        year: q.completed_on.slice(0, 4),
        date: q.completed_on,
        tag: 'quest',
        label: q.title,
        detail: q.track || (q.kind === 'main' ? 'Main quest' : ''),
      });
    }
  }
  for (const m of sheet.milestones) {
    if (m.achieved && m.achieved_on) {
      const skill = sheet.skills.find((s) => s.id === m.skill_id);
      events.push({
        year: m.achieved_on.slice(0, 4),
        date: m.achieved_on,
        tag: 'skill',
        label: m.label,
        detail: skill ? `${skill.name} → ${m.level}` : '',
      });
    }
  }
  for (const e of sheet.events) {
    if (e.happened_on) {
      events.push({
        year: e.happened_on.slice(0, 4),
        date: e.happened_on,
        tag: 'life',
        label: e.title,
        detail: [e.place, e.note].filter(Boolean).join(' · '),
      });
    }
  }
  for (const m of sheet.medical) {
    if (m.happened_on) {
      events.push({
        year: m.happened_on.slice(0, 4),
        date: m.happened_on,
        tag: 'med',
        label: m.name,
        detail: [m.body_part, m.severity].filter(Boolean).join(' · '),
      });
    }
  }

  // Collapse duplicates: a quest and its milestone are often the same event.
  const seen = new Set<string>();
  const unique = events.filter((e) => {
    const key = `${e.date}|${e.label.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const years = [...new Set(unique.map((e) => e.year))].sort((a, b) => b.localeCompare(a));

  const undated = sheet.events.filter((e) => !e.happened_on);

  if (!years.length && !undated.length) {
    return <p className="d">Nothing dated yet. Completed quests and ticked milestones appear here.</p>;
  }

  return (
    <div className="tl">
      {years.map((y) => (
        <div key={y}>
          <div className="tl-year">{y}</div>
          {unique
            .filter((e) => e.year === y)
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e, i) => (
              <div className="tl-item" key={`${y}-${i}`}>
                <span className={`tag ${e.tag}`}>
                  {e.tag === 'med' ? 'body' : e.tag}
                </span>
                <span>
                  {e.label}
                  {e.detail && <span className="d"> · {e.detail}</span>}
                </span>
              </div>
            ))}
        </div>
      ))}
      {undated.length > 0 && (
        <>
          <div className="tl-year">Undated</div>
          {undated.map((e) => (
            <div className="tl-item" key={e.id}>
              <span className="tag life">life</span>
              <span>
                {e.title}
                {e.place && <span className="d"> · {e.place}</span>}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
