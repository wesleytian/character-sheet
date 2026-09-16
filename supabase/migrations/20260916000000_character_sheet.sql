-- Character Sheet schema.
-- Lives in the same Supabase project as Homebase, so every table is cs_-prefixed
-- to avoid colliding with routines / todos / goals / journal_entries.

-- Who the character is. One row per user.
create table if not exists cs_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  other_name text default '',
  species text default 'Homo sapiens',
  ethnicity text default '',
  birthday date,
  birthplace text default '',
  title text default '',
  life_expectancy_years numeric not null default 80,
  gold_label text default 'Net worth',
  gold_value numeric,
  updated_at timestamptz not null default now()
);

-- A metric is the *definition* of something measurable: weight, ApoB, VO2 max.
-- direction says which way is better, so the sheet can color a value without
-- being told good/bad every time.
create table if not exists cs_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  unit text default '',
  category text not null default 'vitals',   -- vitals | body | labs | performance
  target_low numeric,
  target_high numeric,
  direction text not null default 'range',   -- higher | lower | range
  display_order int not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

-- A measurement is one dated reading of a metric. Keeping every reading (rather
-- than one current value) is what makes trends and "down 3 lb in 90d" possible.
create table if not exists cs_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_key text not null,
  value numeric,
  text_value text,
  unit text default '',
  measured_at date not null default current_date,
  source text default '',
  note text default '',
  created_at timestamptz not null default now()
);
create index if not exists cs_measurements_lookup
  on cs_measurements (user_id, metric_key, measured_at desc);

-- Skills are never assigned a level by hand. Each skill declares what level 100
-- means, and the level is derived from the milestone ladder below it.
create table if not exists cs_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'physical',  -- physical | mental | craft | world
  mastery_def text not null default '',       -- what 100 means, in words
  icon text default '',
  display_order int not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- One rung of a skill ladder. level is where that rung sits on the 0-100 scale,
-- so "Divemaster" carries level 100 and everything below it is partial credit.
-- progress_current/total let an in-flight rung move the bar (Seven Summits 1/7).
create table if not exists cs_skill_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references cs_skills(id) on delete cascade,
  label text not null,
  level int not null check (level >= 0 and level <= 100),
  achieved boolean not null default false,
  achieved_on date,
  progress_current numeric,
  progress_total numeric,
  note text default '',
  created_at timestamptz not null default now()
);
create index if not exists cs_skill_milestones_skill
  on cs_skill_milestones (user_id, skill_id, level);

create table if not exists cs_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null default 'side',       -- main | side | retired
  track text default '',                   -- Adventuring, Strength, Career, ...
  phase text default '',                   -- "Phase 2: Build"
  status text not null default 'locked',   -- done | active | locked
  completed_on date,
  progress_current numeric,
  progress_total numeric,
  note text default '',
  display_order int not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- Countries, cities lived, animals seen/eaten. One table because they are all
-- "a named thing I collected on a date", and they all render as counts.
create table if not exists cs_atlas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,                      -- country | state | city | city_lived | animal_seen | animal_eaten
  name text not null,
  detail text default '',
  happened_on date,
  years numeric,                           -- for city_lived
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists cs_atlas_kind on cs_atlas (user_id, kind);

create table if not exists cs_chat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists cs_chat_recent on cs_chat (user_id, created_at desc);

-- Row level security: every table is scoped to the owning user.
do $$
declare t text;
begin
  foreach t in array array[
    'cs_profile','cs_metrics','cs_measurements','cs_skills',
    'cs_skill_milestones','cs_quests','cs_atlas','cs_chat'
  ] loop
    execute format('alter table %I enable row level security', t);

    if not exists (select 1 from pg_policies where tablename = t and policyname = 'Users read own') then
      execute format('create policy "Users read own" on %I for select using (auth.uid() = user_id)', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'Users insert own') then
      execute format('create policy "Users insert own" on %I for insert with check (auth.uid() = user_id)', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'Users update own') then
      execute format('create policy "Users update own" on %I for update using (auth.uid() = user_id)', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'Users delete own') then
      execute format('create policy "Users delete own" on %I for delete using (auth.uid() = user_id)', t);
    end if;
  end loop;
end $$;
