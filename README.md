# Character Sheet

A life dashboard shaped like a roguelike character dump. Quests, skills with
derived levels, health metrics, and an atlas — updated by talking to it.

## Backend

Data lives in Supabase. Every table is `cs_`-prefixed, so the app can share a
project with other apps (it was built alongside a habit tracker, Homebase, and
can optionally read that app's `monthly_reflections`, `routines` and
`user_settings` tables when they exist).

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and anon key
npm run dev                  # http://localhost:5174
```

The schema in `supabase/migrations/` must be applied once before first run.

The chat needs an Anthropic API key. It reads
`user_settings.settings.anthropicApiKey` if that table exists; if it
isn't found, the prompt asks for one and keeps it in `localStorage`.

## How skill levels work

A level is never typed in. Each skill declares **what 100 means**, and carries a
ladder of milestones:

```
Diving — 100 = PADI Divemaster
    5  Discover Scuba dive
   20  Open Water
   35  Advanced Open Water
   55  Rescue Diver
   75  100 logged dives
  100  Divemaster
```

Your level is the highest rung you've ticked. If the next rung tracks partial
progress (Seven Summits, 1 of 7), the level moves proportionally toward it
instead of waiting for the whole thing. See `src/skills.ts`.

Three ways to change one:

- Click the `?` next to a skill and tick a rung.
- Tell the chat: *"I got my rescue diver cert"*.
- Add a rung the ladder doesn't have yet, via chat.

## Updating by chat

The prompt at the bottom writes to the database through Claude tool use
(`src/agent.ts`, `claude-opus-5`). It can log measurements, define new metrics,
tick milestones, add and complete quests, add countries and animals, and edit
the character card. It's given the whole sheet with real row IDs each turn, so
"mark the marathon done" resolves without you naming an ID.

## Layout

| File | What it holds |
|---|---|
| `src/skills.ts` | The level formula |
| `src/seed.ts` | First-run content: a fictional sample character |
| `src/agent.ts` | Claude tools and the tool-use loop |
| `src/Sheet.tsx` | The dump itself |
| `src/Chat.tsx` | The `>` prompt |

## Seeded content

A new account is seeded with **Rowan Abernathy, a fictional sample
character**: a dozen skill ladders at different levels, quests that are done,
in progress (some with partial counts) and locked, a few years of body,
performance and lab readings so the charts and health score have something to
draw, and an atlas with cities lived, countries, states, provinces, national
parks and animals. None of it describes a real person. The seeder only fills
empty tables and only adds sample readings to a brand-new account, so edit or
delete it freely.
