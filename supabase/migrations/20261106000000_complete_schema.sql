-- Everything the app reads and writes that the earlier migrations never
-- created: columns added along the way, the tables behind the vault, inbox,
-- people, money, counters, timeline, checkups and documents, and the private
-- storage bucket for uploaded documents and portraits.
--
-- Idempotent: safe on a fresh project and on one that already has some or all
-- of this.

-- ---------------------------------------------------------------- columns

alter table cs_profile add column if not exists avatar_url     text;          -- storage path in the character-sheet bucket
alter table cs_profile add column if not exists friend_order   text[];
alter table cs_profile add column if not exists vault_pin_hash text;
alter table cs_profile add column if not exists tab_order      text[];
alter table cs_profile add column if not exists tab_muted      text[];

alter table cs_metrics add column if not exists panel             text not null default '';
alter table cs_metrics add column if not exists is_focus          boolean not null default false;
alter table cs_metrics add column if not exists focus_order       int not null default 0;
alter table cs_metrics add column if not exists focus_goal        text not null default '';
alter table cs_metrics add column if not exists cadence_months    numeric;
alter table cs_metrics add column if not exists test_group        text not null default '';
alter table cs_metrics add column if not exists target_source     text not null default '';
alter table cs_metrics add column if not exists why               text not null default '';
alter table cs_metrics add column if not exists p50               numeric;
alter table cs_metrics add column if not exists p75               numeric;
alter table cs_metrics add column if not exists p90               numeric;
alter table cs_metrics add column if not exists percentile_source text not null default '';
alter table cs_metrics add column if not exists percentile_useful boolean not null default false;

alter table cs_skills add column if not exists pursuing   boolean not null default false;
alter table cs_skills add column if not exists hidden     boolean not null default false;
alter table cs_skills add column if not exists self_level numeric;   -- carried-over rating, used only while no rung is ticked

alter table cs_skill_milestones add column if not exists pinned boolean not null default false;

alter table cs_quests add column if not exists pinned     boolean not null default false;
alter table cs_quests add column if not exists parent_id  uuid references cs_quests(id) on delete cascade;
alter table cs_quests add column if not exists is_private boolean not null default false;

alter table cs_atlas add column if not exists state text not null default 'visited';   -- visited | planned

-- ---------------------------------------------------------------- tables

-- Uploaded files (lab reports, scans). The file itself lives in the
-- character-sheet bucket at storage_path; this row is the index.
create table if not exists cs_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  storage_path text not null,
  mime_type text default '',
  size_bytes bigint,
  kind text not null default 'report',
  taken_on date,
  created_at timestamptz not null default now()
);
create index if not exists cs_documents_user on cs_documents (user_id, created_at desc);

-- Lifetime tallies: books read, dives logged, ...
create table if not exists cs_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null default '',
  label text not null default '',
  value numeric,
  unit text default '',
  category text default '',
  note text default '',
  display_order int not null default 0,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists cs_counters_user on cs_counters (user_id, display_order);

-- Dated life events for the timeline.
create table if not exists cs_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  kind text not null default '',
  happened_on date,
  ended_on date,
  place text default '',
  note text default '',
  created_at timestamptz not null default now()
);
create index if not exists cs_events_user on cs_events (user_id, happened_on desc);

-- Balances: accounts, holdings, debts.
create table if not exists cs_money (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null default '',
  label text not null default '',
  value numeric,
  unit text default 'USD',
  category text default '',
  note text default '',
  display_order int not null default 0,
  recorded_on date,
  created_at timestamptz not null default now()
);
create index if not exists cs_money_user on cs_money (user_id, display_order);

-- Inventory: things owned, by equipment slot.
create table if not exists cs_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slot text not null default '',
  brand text default '',
  acquired_on date,
  value numeric,
  note text default '',
  display_order int not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists cs_items_user on cs_items (user_id, created_at);

-- Inbox: open questions and flags, answered or resolved later.
create table if not exists cs_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default '',
  title text not null default '',
  body text default '',
  status text not null default 'open',   -- open | resolved
  answer text default '',
  severity text default '',
  display_order int not null default 0,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cs_notes_user on cs_notes (user_id, display_order);

create table if not exists cs_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation text default '',
  note text default '',
  display_order int not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists cs_people_user on cs_people (user_id, display_order);

-- Recurring checkups (dentist, eye exam) and when each was last done.
create table if not exists cs_checkups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cadence_months numeric not null default 12,
  last_done date,
  note text default '',
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cs_checkups_user on cs_checkups (user_id, display_order);

-- ---------------------------------------------------------------- row level security

do $$
declare t text;
begin
  foreach t in array array[
    'cs_documents','cs_counters','cs_events','cs_money',
    'cs_items','cs_notes','cs_people','cs_checkups'
  ] loop
    execute format('alter table %I enable row level security', t);

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Users read own') then
      execute format('create policy "Users read own" on %I for select using (auth.uid() = user_id)', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Users insert own') then
      execute format('create policy "Users insert own" on %I for insert with check (auth.uid() = user_id)', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Users update own') then
      execute format('create policy "Users update own" on %I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Users delete own') then
      execute format('create policy "Users delete own" on %I for delete using (auth.uid() = user_id)', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- storage

-- Private bucket. Files go under <user id>/..., and each user can touch only
-- their own folder; the app reads them back through short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('character-sheet', 'character-sheet', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'character-sheet read own') then
    create policy "character-sheet read own" on storage.objects for select to authenticated
      using (bucket_id = 'character-sheet' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'character-sheet insert own') then
    create policy "character-sheet insert own" on storage.objects for insert to authenticated
      with check (bucket_id = 'character-sheet' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'character-sheet update own') then
    create policy "character-sheet update own" on storage.objects for update to authenticated
      using (bucket_id = 'character-sheet' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'character-sheet delete own') then
    create policy "character-sheet delete own" on storage.objects for delete to authenticated
      using (bucket_id = 'character-sheet' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
