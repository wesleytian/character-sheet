import { Skill, SkillMilestone } from './types';

export interface DerivedSkill {
  skill: Skill;
  level: number;
  /** The highest rung actually achieved. */
  current: SkillMilestone | null;
  /** The next rung up, if there is one. */
  next: SkillMilestone | null;
  ladder: SkillMilestone[];
}

/**
 * Levels are never typed in by hand. A skill declares what 100 means, and the
 * level falls out of the milestone ladder: you sit at the highest rung you have
 * achieved. If the next rung tracks partial progress (Seven Summits 1/7), the
 * level moves proportionally toward it rather than waiting for the whole thing.
 */
export function deriveSkill(skill: Skill, all: SkillMilestone[]): DerivedSkill {
  const ladder = all
    .filter((m) => m.skill_id === skill.id)
    .sort((a, b) => a.level - b.level);

  const achieved = ladder.filter((m) => m.achieved);
  const current = achieved.length ? achieved[achieved.length - 1] : null;
  const base = current ? current.level : 0;
  const next = ladder.find((m) => !m.achieved && m.level > base) ?? null;

  let level = base;
  if (next && next.progress_total && next.progress_total > 0) {
    const fraction = Math.min(1, (next.progress_current ?? 0) / next.progress_total);
    level = Math.round(base + (next.level - base) * fraction);
  }

  return { skill, level, current, next, ladder };
}

export function rankOf(level: number): string {
  if (level >= 100) return 'Mastered';
  if (level >= 85) return 'Expert';
  if (level >= 65) return 'Advanced';
  if (level >= 45) return 'Competent';
  if (level >= 25) return 'Novice';
  if (level > 0) return 'Beginner';
  return 'Untrained';
}
