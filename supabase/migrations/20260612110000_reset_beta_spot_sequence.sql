-- The test row (spot #2) was deleted and beta_testers is now empty.
-- Reset the spot sequence so the first real signup gets spot #1.
select setval('public.beta_testers_spot_seq', 1, false);
