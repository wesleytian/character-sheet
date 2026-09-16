-- Injuries, conditions, surgeries: the things that shaped the body.
create table if not exists cs_medical (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'injury',   -- injury | condition | surgery | allergy
  name text not null,
  body_part text default '',
  happened_on date,
  resolved_on date,
  severity text default '',              -- minor | moderate | major
  note text default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists cs_medical_user on cs_medical (user_id, happened_on desc);

alter table cs_medical enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='cs_medical' and policyname='Users read own') then
    create policy "Users read own" on cs_medical for select using (auth.uid() = user_id); end if;
  if not exists (select 1 from pg_policies where tablename='cs_medical' and policyname='Users insert own') then
    create policy "Users insert own" on cs_medical for insert with check (auth.uid() = user_id); end if;
  if not exists (select 1 from pg_policies where tablename='cs_medical' and policyname='Users update own') then
    create policy "Users update own" on cs_medical for update using (auth.uid() = user_id); end if;
  if not exists (select 1 from pg_policies where tablename='cs_medical' and policyname='Users delete own') then
    create policy "Users delete own" on cs_medical for delete using (auth.uid() = user_id); end if;
end $$;
