import Anthropic from '@anthropic-ai/sdk';
import { supabase } from './supabase';
import { Sheet } from './types';
import { deriveSkill } from './skills';

const MODEL = 'claude-opus-5';

/** Stable across turns so the prompt cache prefix holds. */
const SYSTEM = `You maintain a personal RPG character sheet - a single source of truth for one person's life, rendered as a roguelike character dump.

You have tools that write directly to the sheet's database. When the user tells you something about their life, record it. Do not ask permission for ordinary entries; just write them and say briefly what you did.

How the sheet works:
- A SKILL never has a level typed in. Each skill declares what level 100 means, and carries a ladder of milestones with levels between 0 and 100. The displayed level is the highest achieved rung, moving proportionally toward the next rung when that rung tracks partial progress. To raise a skill, mark a milestone achieved - never invent a number.
- If the user reports something no rung covers, add a rung with add_milestone at a level consistent with the rest of the ladder, or create a whole new skill with add_skill when it is a new domain.
- A METRIC is a definition (ApoB, VO2 max, weight). A MEASUREMENT is one dated reading of it. Log readings; create the metric first only if the key does not exist.
- QUESTS are main (life direction, grouped in phases), side (grouped in tracks like Adventuring or Strength), or retired (abandoned on purpose - never delete these, they are part of the story).
- The ATLAS holds countries, cities lived, states, and animals seen or eaten.

Rules:
- Use the real IDs from the sheet snapshot you are given. Never guess an ID.
- When the user says a year with no month, use the first of January for that year.
- Today's date is provided in the snapshot; resolve "last week" and similar against it.
- Batch your writes: make all the tool calls a request needs in one turn rather than one at a time.
- Never invent measurements, dates, or achievements the user did not state. If something is ambiguous, write what you are sure of and ask one short question about the rest.
- Reply in two or three short lines, in the voice of a game log. No preamble, no bullet lists.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'log_measurement',
    description: 'Record one dated reading of an existing metric (weight, ApoB, VO2 max, a 1RM).',
    input_schema: {
      type: 'object',
      properties: {
        metric_key: { type: 'string', description: 'Existing metric key from the snapshot.' },
        value: { type: 'number' },
        unit: { type: 'string' },
        measured_at: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
        source: { type: 'string', description: 'Where it came from, e.g. "DEXA", "Function Health".' },
        note: { type: 'string' },
      },
      required: ['metric_key', 'value'],
    },
  },
  {
    name: 'create_metric',
    description: 'Define a new measurable thing before logging readings of it.',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'snake_case identifier.' },
        label: { type: 'string' },
        unit: { type: 'string' },
        category: { type: 'string', enum: ['vitals', 'body', 'labs', 'performance'] },
        direction: { type: 'string', enum: ['higher', 'lower', 'range'], description: 'Which way is better.' },
        target_low: { type: 'number' },
        target_high: { type: 'number' },
      },
      required: ['key', 'label', 'category', 'direction'],
    },
  },
  {
    name: 'add_skill',
    description: 'Create a new skill with its full milestone ladder. The top rung must be level 100 and must match what mastery_def describes.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        category: { type: 'string', enum: ['physical', 'mental', 'craft', 'world'] },
        mastery_def: { type: 'string', description: 'What level 100 means, in one phrase.' },
        ladder: {
          type: 'array',
          description: 'Rungs from easiest to hardest, ending at level 100.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              level: { type: 'number', description: '0-100.' },
              achieved: { type: 'boolean' },
              achieved_on: { type: 'string' },
            },
            required: ['label', 'level'],
          },
        },
      },
      required: ['name', 'category', 'mastery_def', 'ladder'],
    },
  },
  {
    name: 'add_milestone',
    description: 'Add a rung to an existing skill ladder.',
    input_schema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string' },
        label: { type: 'string' },
        level: { type: 'number' },
        achieved: { type: 'boolean' },
        achieved_on: { type: 'string' },
        progress_current: { type: 'number' },
        progress_total: { type: 'number' },
        note: { type: 'string' },
      },
      required: ['skill_id', 'label', 'level'],
    },
  },
  {
    name: 'set_milestone',
    description: 'Mark a rung achieved or not achieved, or update its partial progress. This is how a skill level changes.',
    input_schema: {
      type: 'object',
      properties: {
        milestone_id: { type: 'string' },
        achieved: { type: 'boolean' },
        achieved_on: { type: 'string', description: 'YYYY-MM-DD.' },
        progress_current: { type: 'number' },
        progress_total: { type: 'number' },
        note: { type: 'string' },
      },
      required: ['milestone_id'],
    },
  },
  {
    name: 'add_quest',
    description: 'Add a quest.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        kind: { type: 'string', enum: ['main', 'side', 'retired'] },
        track: { type: 'string', description: 'For side quests: Adventuring, Strength, Endurance, Diving...' },
        phase: { type: 'string', description: 'For main quests: "Phase 2: Build".' },
        status: { type: 'string', enum: ['done', 'active', 'locked'] },
        completed_on: { type: 'string' },
        progress_current: { type: 'number' },
        progress_total: { type: 'number' },
        note: { type: 'string' },
      },
      required: ['title', 'kind'],
    },
  },
  {
    name: 'update_quest',
    description: 'Change a quest: complete it, activate it, retire it, or move its progress.',
    input_schema: {
      type: 'object',
      properties: {
        quest_id: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string', enum: ['done', 'active', 'locked'] },
        kind: { type: 'string', enum: ['main', 'side', 'retired'] },
        completed_on: { type: 'string' },
        progress_current: { type: 'number' },
        progress_total: { type: 'number' },
        note: { type: 'string' },
      },
      required: ['quest_id'],
    },
  },
  {
    name: 'add_atlas_entry',
    description: 'Record a country, state, city, a city lived in, or an animal seen or eaten.',
    input_schema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['country', 'state', 'city', 'city_lived', 'animal_seen', 'animal_eaten'],
        },
        name: { type: 'string' },
        detail: { type: 'string' },
        happened_on: { type: 'string' },
        years: { type: 'number', description: 'For city_lived: years spent there.' },
      },
      required: ['kind', 'name'],
    },
  },
  {
    name: 'update_profile',
    description: 'Change identity fields on the character card.',
    input_schema: {
      type: 'object',
      properties: {
        display_name: { type: 'string' },
        other_name: { type: 'string' },
        species: { type: 'string' },
        ethnicity: { type: 'string' },
        birthday: { type: 'string' },
        birthplace: { type: 'string' },
        title: { type: 'string' },
        life_expectancy_years: { type: 'number' },
        gold_label: { type: 'string' },
        gold_value: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'delete_entry',
    description: 'Remove a row that was entered by mistake.',
    input_schema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          enum: ['cs_quests', 'cs_atlas', 'cs_measurements', 'cs_skills', 'cs_skill_milestones', 'cs_metrics'],
        },
        id: { type: 'string' },
      },
      required: ['table', 'id'],
    },
  },
];

type Args = Record<string, unknown>;

async function runTool(name: string, args: Args, userId: string): Promise<string> {
  const own = { user_id: userId };
  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(e.message);
  };

  switch (name) {
    case 'log_measurement': {
      const { error } = await supabase.from('cs_measurements').insert({
        ...own,
        metric_key: args.metric_key,
        value: args.value,
        unit: args.unit ?? '',
        measured_at: args.measured_at ?? new Date().toISOString().slice(0, 10),
        source: args.source ?? '',
        note: args.note ?? '',
      });
      fail(error);
      return `Logged ${String(args.metric_key)} = ${String(args.value)}`;
    }
    case 'create_metric': {
      const { error } = await supabase.from('cs_metrics').insert({ ...own, ...args });
      fail(error);
      return `Metric ${String(args.key)} created`;
    }
    case 'add_skill': {
      const ladder = (args.ladder ?? []) as Args[];
      const { data, error } = await supabase
        .from('cs_skills')
        .insert({
          ...own,
          name: args.name,
          category: args.category,
          mastery_def: args.mastery_def,
          display_order: 99,
        })
        .select()
        .single();
      fail(error);
      if (!data) return 'Skill insert returned nothing';
      const { error: e2 } = await supabase.from('cs_skill_milestones').insert(
        ladder.map((m) => ({
          ...own,
          skill_id: data.id,
          label: m.label,
          level: m.level,
          achieved: m.achieved ?? false,
          achieved_on: m.achieved_on ?? null,
        })),
      );
      fail(e2);
      return `Skill ${String(args.name)} created with ${ladder.length} rungs`;
    }
    case 'add_milestone': {
      const { error } = await supabase.from('cs_skill_milestones').insert({ ...own, ...args });
      fail(error);
      return `Rung "${String(args.label)}" added at level ${String(args.level)}`;
    }
    case 'set_milestone': {
      const { milestone_id, ...rest } = args;
      if (rest.achieved === true && !rest.achieved_on) {
        rest.achieved_on = new Date().toISOString().slice(0, 10);
      }
      const { error } = await supabase
        .from('cs_skill_milestones')
        .update(rest)
        .eq('id', milestone_id);
      fail(error);
      return 'Milestone updated';
    }
    case 'add_quest': {
      const { error } = await supabase.from('cs_quests').insert({
        ...own,
        status: 'locked',
        ...args,
      });
      fail(error);
      return `Quest "${String(args.title)}" added`;
    }
    case 'update_quest': {
      const { quest_id, ...rest } = args;
      const { error } = await supabase.from('cs_quests').update(rest).eq('id', quest_id);
      fail(error);
      return 'Quest updated';
    }
    case 'add_atlas_entry': {
      const { error } = await supabase.from('cs_atlas').insert({ ...own, ...args });
      fail(error);
      return `${String(args.name)} added to the atlas`;
    }
    case 'update_profile': {
      const { error } = await supabase
        .from('cs_profile')
        .update({ ...args, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      fail(error);
      return 'Profile updated';
    }
    case 'delete_entry': {
      const { error } = await supabase
        .from(String(args.table))
        .delete()
        .eq('id', args.id)
        .eq('user_id', userId);
      fail(error);
      return 'Deleted';
    }
    default:
      return `Unknown tool ${name}`;
  }
}

/**
 * The sheet as text, with the real row IDs the tools need. Sent in the user
 * turn rather than the system prompt so the cached prefix stays stable.
 */
export function snapshot(sheet: Sheet): string {
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`TODAY: ${today}`);

  if (sheet.profile) {
    const p = sheet.profile;
    lines.push(
      `PROFILE: ${p.display_name} (${p.other_name}) | ${p.species} | ${p.ethnicity} | born ${p.birthday} in ${p.birthplace} | ${p.title} | life expectancy ${p.life_expectancy_years}`,
    );
  }

  lines.push('\nSKILLS (level is derived - mark rungs, never type a level):');
  for (const s of sheet.skills) {
    const d = deriveSkill(s, sheet.milestones);
    lines.push(`- ${s.name} [skill_id=${s.id}] level ${d.level}. 100 = ${s.mastery_def}`);
    for (const m of d.ladder) {
      lines.push(
        `    ${m.achieved ? 'x' : ' '} ${m.level.toString().padStart(3)} ${m.label} [milestone_id=${m.id}]` +
          (m.progress_total ? ` (${m.progress_current ?? 0}/${m.progress_total})` : ''),
      );
    }
  }

  lines.push('\nMETRICS (key | label | unit | latest reading):');
  for (const m of sheet.metrics) {
    const latest = sheet.measurements.find((x) => x.metric_key === m.key);
    lines.push(
      `- ${m.key} | ${m.label} | ${m.unit || '-'} | ${latest ? `${latest.value} on ${latest.measured_at}` : 'no readings yet'}`,
    );
  }

  lines.push('\nQUESTS:');
  for (const q of sheet.quests) {
    lines.push(
      `- [${q.status}] ${q.title} (${q.kind}${q.phase ? ' / ' + q.phase : ''}${q.track ? ' / ' + q.track : ''})` +
        `${q.completed_on ? ' done ' + q.completed_on : ''}` +
        `${q.progress_total ? ` ${q.progress_current ?? 0}/${q.progress_total}` : ''} [quest_id=${q.id}]`,
    );
  }

  const byKind: Record<string, string[]> = {};
  for (const a of sheet.atlas) (byKind[a.kind] ??= []).push(a.name);
  lines.push('\nATLAS:');
  for (const [kind, names] of Object.entries(byKind)) {
    lines.push(`- ${kind} (${names.length}): ${names.join(', ')}`);
  }

  return lines.join('\n');
}

export interface Attachment {
  name: string;
  /** base64, no data: prefix */
  data: string;
  mediaType: string;
}

export interface AgentResult {
  text: string;
  actions: string[];
  changed: boolean;
}

export async function askAgent(
  apiKey: string,
  userId: string,
  sheet: Sheet,
  history: Anthropic.MessageParam[],
  userMessage: string,
  attachments: Attachment[] = [],
): Promise<AgentResult> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  // Documents go before the text block so Claude reads them as context for the
  // instruction rather than as an afterthought.
  const content: Anthropic.ContentBlockParam[] = [];
  for (const a of attachments) {
    if (a.mediaType === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: a.data },
      });
    } else {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: a.mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
          data: a.data,
        },
      });
    }
  }
  content.push({
    type: 'text',
    text:
      `<sheet>\n${snapshot(sheet)}\n</sheet>\n\n` +
      (attachments.length
        ? `Attached: ${attachments.map((a) => a.name).join(', ')}. Read every value you can find and log each one against the right metric, using the report's own date. Create a metric first if one does not exist. Say what you logged and name anything you could not place.\n\n`
        : '') +
      userMessage,
  });

  const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content }];

  const actions: string[] = [];
  let changed = false;

  for (let turn = 0; turn < 8; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      messages,
    });

    if (response.stop_reason === 'refusal') {
      return { text: 'That request was declined.', actions, changed };
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (toolUses.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return { text, actions, changed };
    }

    // Every tool_result for one assistant turn goes back in a single user
    // message, otherwise Claude stops issuing parallel calls.
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      try {
        const out = await runTool(use.name, use.input as Args, userId);
        actions.push(out);
        changed = true;
        results.push({ type: 'tool_result', tool_use_id: use.id, content: out });
      } catch (err) {
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: err instanceof Error ? err.message : String(err),
          is_error: true,
        });
      }
    }
    messages.push({ role: 'user', content: results });
  }

  return { text: 'Stopped after 8 turns.', actions, changed };
}
