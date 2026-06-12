-- Re-sync beta_testers_spot_seq with the actual data. Test signups/deletes
-- while building the Beta Testers admin tab left the sequence behind the
-- highest assigned spot_number again, so new signups were retrying spot
-- numbers (1, 2) that already exist and colliding with the unique
-- constraint added in 20260612070000.
select setval('public.beta_testers_spot_seq', coalesce((select max(spot_number) from public.beta_testers), 0), true);
