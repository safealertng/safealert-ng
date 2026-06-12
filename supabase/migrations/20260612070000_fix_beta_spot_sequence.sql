-- The 20260612060000 cleanup migration reset beta_testers_spot_seq back to 1
-- after deleting the test row, but real signups had already claimed spot
-- numbers 1+. Every signup since then re-claimed spot numbers that were
-- already taken instead of continuing the count, so new testers were shown
-- spot #1 again.
--
-- Renumber existing rows sequentially by signup order to remove any
-- duplicate spot numbers, then point the sequence at the new max so future
-- signups continue from there. A unique constraint stops this class of bug
-- from silently happening again.

with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.beta_testers
)
update public.beta_testers bt
set spot_number = o.rn
from ordered o
where bt.id = o.id;

select setval('public.beta_testers_spot_seq', coalesce((select max(spot_number) from public.beta_testers), 0), true);

alter table public.beta_testers add constraint beta_testers_spot_number_key unique (spot_number);
