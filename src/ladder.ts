import Anthropic from '@anthropic-ai/sdk';
import { Skill, SkillMilestone } from './types';
import { supabase } from './supabase';

const MODEL = 'claude-opus-5';

/**
 * The stock ladder every sport got - "Tried it", "Beginner", "Intermediate" -
 * is not how any discipline actually measures itself. Climbing has grades,
 * jiu-jitsu has belts, diving has certifications, running has times. This
 * asks for the real rungs of each discipline instead.
 */
const GENERIC = new Set([
  'tried it', 'beginner', 'intermediate', 'advanced', 'expert',
  'novice', 'competent', 'proficient', 'master',
]);

export const isGeneric = (ladder: SkillMilestone[]) =>
  ladder.length > 0 && ladder.every((m) => GENERIC.has(m.label.trim().toLowerCase()));

export interface Rung { label: string; level: number; note?: string }

const TOOL: Anthropic.Tool = {
  name: 'emit_ladders',
  description: 'Return the milestone ladder for each discipline.',
  input_schema: {
    type: 'object',
    properties: {
      ladders: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            skill: { type: 'string', description: 'Exactly the name given to you.' },
            mastery_def: {
              type: 'string',
              description: 'One short phrase for what level 100 means in this discipline.',
            },
            rungs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', description: 'The rung, in the discipline\'s own vocabulary.' },
                  level: { type: 'number', description: '1-100.' },
                  note: { type: 'string', description: 'At most six words of clarification, or empty.' },
                },
                required: ['label', 'level'],
              },
            },
          },
          required: ['skill', 'mastery_def', 'rungs'],
        },
      },
    },
    required: ['ladders'],
  },
};

const PROMPT = `Write milestone ladders for the disciplines listed below.

Rules for every rung:
- Use the discipline's own vocabulary and its real, externally checkable markers: belt ranks, certification names, climbing grades, race distances and times, competition levels, lifts as a multiple of bodyweight, hours logged.
- Never use the words beginner, intermediate, advanced, expert, novice, proficient, master, or "tried it". If a rung cannot be stated concretely, it is not a rung.
- Five to seven rungs, ascending, levels between 1 and 100. The top rung is 100 and means the ceiling a dedicated amateur could reach in a lifetime - not an Olympic medal, unless the discipline has no amateur ceiling.
- The lowest rung should be the first real, verifiable thing someone does in the discipline, not "showed up".
- Levels should reflect how hard each rung is relative to the others: the gap from the second-highest rung to 100 is usually the largest.
- For a discipline with formal grades, use them exactly (e.g. "Blue belt", "5.11a redpoint", "PADI Rescue Diver", "Sub-20 5k").

Return one ladder per discipline through the emit_ladders tool. Say nothing else.`;

export async function generateLadders(
  apiKey: string,
  skills: { name: string; category: string; mastery_def: string }[],
): Promise<{ skill: string; mastery_def: string; rungs: Rung[] }[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const list = skills.map((s) => `- ${s.name} (${s.category})`).join('\n');

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'emit_ladders' },
    messages: [{ role: 'user', content: `${PROMPT}\n\nDisciplines:\n${list}` }],
  });

  const call = res.content.find((c) => c.type === 'tool_use');
  if (!call || call.type !== 'tool_use') throw new Error('no ladder came back');
  const out = (call.input as { ladders?: { skill: string; mastery_def: string; rungs: Rung[] }[] }).ladders;
  if (!out?.length) throw new Error('empty ladder');
  return out;
}

/**
 * Replaces a skill's rungs.
 *
 * Nothing is ticked. The first version carried progress over by level, which
 * quietly turned "Beginner" into "Wet exit and re-entry performed on flat
 * water, 3 km paddled" - a specific, checkable claim the user had never made.
 * A vague self-rating must never become a specific achievement, so the old
 * level is kept as exactly that: a self-rating on the skill, shown as one,
 * replaced the moment a real rung gets ticked.
 */
export async function applyLadder(
  userId: string, skill: Skill, old: SkillMilestone[], rungs: Rung[], masteryDef?: string,
) {
  const reached = old.filter((m) => m.achieved).map((m) => m.level);
  const high = reached.length ? Math.max(...reached) : 0;
  const selfLevel = high > 0 ? high : (skill.self_level ?? null);

  const { error: dErr } = await supabase
    .from('cs_skill_milestones').delete().eq('skill_id', skill.id);
  if (dErr) throw new Error(dErr.message);

  const rows = [...rungs]
    .sort((a, b) => a.level - b.level)
    .map((r) => ({
      user_id: userId,
      skill_id: skill.id,
      label: r.label,
      level: Math.max(1, Math.min(100, Math.round(r.level))),
      achieved: false,
      achieved_on: null,
      progress_current: null,
      progress_total: null,
      note: r.note ?? '',
    }));
  const { error } = await supabase.from('cs_skill_milestones').insert(rows);
  if (error) throw new Error(error.message);

  const patch: Record<string, unknown> = { self_level: selfLevel };
  if (masteryDef && masteryDef !== skill.mastery_def) patch.mastery_def = masteryDef;
  const { error: sErr } = await supabase.from('cs_skills').update(patch).eq('id', skill.id);
  if (sErr) throw new Error(sErr.message);
}
