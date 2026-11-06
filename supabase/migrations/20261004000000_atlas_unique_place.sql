-- A place is its name: one row per (user, kind, name).
--
-- Without this, every atlas write was a blind insert against a snapshot that
-- only refreshed after a full sheet reload, so two clicks inside that window
-- wrote two rows. A double click did it every time, since the browser fires
-- click before dblclick - one 'visited' from the click, one 'planned' from the
-- dblclick. The two counters on the Journeys tab then disagreed, one counting
-- rows and the other counting names.

-- Collapse what is already there before the index can be built. Keeps the
-- oldest row of each group, preferring one that is not merely planned -
-- somewhere you have been outranks somewhere you mean to go.
delete from cs_atlas a
using cs_atlas b
where a.user_id = b.user_id
  and a.kind = b.kind
  and a.name = b.name
  and a.id <> b.id
  and (
    (a.state = 'planned') is distinct from (b.state = 'planned')
      and a.state = 'planned'
    or ((a.state = 'planned') is not distinct from (b.state = 'planned')
      and a.created_at > b.created_at)
  );

create unique index if not exists cs_atlas_user_kind_name_key
  on cs_atlas (user_id, kind, name);
