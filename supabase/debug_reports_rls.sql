-- Secure RLS for debug reports and attachments.
-- Run this file in the Supabase SQL Editor for the production project.

alter table public.debug_reports enable row level security;

drop policy if exists "user can insert own report" on public.debug_reports;
drop policy if exists "allow insert debug report" on public.debug_reports;
drop policy if exists "users read own debug reports" on public.debug_reports;
drop policy if exists "service role reads reports" on public.debug_reports;

create policy "users insert own debug reports"
on public.debug_reports
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users read own debug reports"
on public.debug_reports
for select
to authenticated
using (auth.uid() = user_id);

create policy "service role reads reports"
on public.debug_reports
for select
using (auth.role() = 'service_role');

drop policy if exists "users upload own debug attachments" on storage.objects;
drop policy if exists "users read own debug attachments" on storage.objects;
drop policy if exists "service role reads debug attachments" on storage.objects;

create policy "users upload own debug attachments"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'debug-attachments'
	and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users read own debug attachments"
on storage.objects
for select
to authenticated
using (
	bucket_id = 'debug-attachments'
	and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "service role reads debug attachments"
on storage.objects
for select
using (bucket_id = 'debug-attachments' and auth.role() = 'service_role');
