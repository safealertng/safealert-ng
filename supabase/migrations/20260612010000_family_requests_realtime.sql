-- Allow clients to subscribe to realtime postgres_changes on family_requests
-- so an incoming family request shows up immediately without a page reload.
alter publication supabase_realtime add table public.family_requests;
