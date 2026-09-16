-- Healthspan alongside lifespan, a timestamp for manually-entered net worth,
-- and explicit ordering for the atlas (places lived read chronologically).
alter table cs_profile add column if not exists healthspan_years numeric not null default 80;
alter table cs_profile add column if not exists gold_updated_at timestamptz;
alter table cs_atlas   add column if not exists display_order int not null default 0;

-- Phases and retired quests are gone: main quests are one general list now.
update cs_quests set phase = '' where phase <> '';
delete from cs_quests where kind = 'retired';

-- Lifespan 100, healthspan 80.
update cs_profile set life_expectancy_years = 100, healthspan_years = 80;

-- Places lived, in the order they were entered.
update cs_atlas a set display_order = o.n
from (
  select id, row_number() over (partition by user_id order by created_at, id) as n
  from cs_atlas where kind = 'city_lived'
) o
where a.id = o.id;
