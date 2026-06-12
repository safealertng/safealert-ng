-- Add Family Tracker to the Basic plan and Shake-to-SOS to the Premium
-- plan, matching the feature lists shown on the landing page pricing
-- section.
update public.subscription_plans
set features = features || array['Family Tracker']::text[]
where name = 'Basic' and not ('Family Tracker' = any(features));

update public.subscription_plans
set features = features || array['Shake-to-SOS']::text[]
where name = 'Premium' and not ('Shake-to-SOS' = any(features));
