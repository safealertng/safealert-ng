-- Remove the verification row created while testing signup_beta_tester(),
-- and reset the spot sequence so real signups start at spot #1.
delete from public.beta_testers where email = 'test-beta-1@example.com';
select setval('public.beta_testers_spot_seq', 1, false);
