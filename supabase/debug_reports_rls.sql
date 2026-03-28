-- Secure RLS for debug reports and attachments.
-- Run this file in the Supabase SQL Editor for the production project.

create extension if not exists pgcrypto;

create table if not exists public.debug_reports (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null,
	description text not null,
	device_info text,
	app_version text,
	platform text,
	images_count integer not null default 0,
	created_at timestamptz not null default now(),
	status text default 'open',
	resolved_at timestamptz,
	archived_at timestamptz,
	resolved_by uuid
);

-- Drop the FK to auth.users(id) — user_id stores the internal "User".id (Prisma)
-- which is not an auth.users UUID. Data integrity is enforced by RLS policies.
alter table public.debug_reports
	drop constraint if exists debug_reports_user_id_fkey;

alter table public.debug_reports
	add column if not exists status text default 'open',
	add column if not exists resolved_at timestamptz,
	add column if not exists archived_at timestamptz,
	add column if not exists resolved_by uuid;

update public.debug_reports
set status = 'open'
where status is null;

alter table public.debug_reports
	alter column status set default 'open';

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'debug_reports_status_check'
	) then
		alter table public.debug_reports
			add constraint debug_reports_status_check
			check (status in ('open', 'solved', 'archived'));
	end if;
end
$$;

alter table public.debug_reports enable row level security;

drop policy if exists "user can insert own report" on public.debug_reports;
drop policy if exists "allow insert debug report" on public.debug_reports;
drop policy if exists "users insert own debug reports" on public.debug_reports;
drop policy if exists "users read own debug reports" on public.debug_reports;
drop policy if exists "service role reads reports" on public.debug_reports;
drop policy if exists "admins read reports" on public.debug_reports;
drop policy if exists "admins update reports" on public.debug_reports;
drop policy if exists "admins delete reports" on public.debug_reports;

create policy "users insert own debug reports"
on public.debug_reports
for insert
to authenticated
with check (
	exists (
		select 1
		from public."User" as profile
		where profile.id::text = debug_reports.user_id::text
			and profile."authId" = auth.uid()::text
	)
);

create policy "users read own debug reports"
on public.debug_reports
for select
to authenticated
using (
	exists (
		select 1
		from public."User" as profile
		where profile.id::text = debug_reports.user_id::text
			and profile."authId" = auth.uid()::text
	)
);

create policy "admins read reports"
on public.debug_reports
for select
using (
	exists (
		select 1
		from public."User" as profile
		where profile."authId" = auth.uid()::text
			and profile.role = 'admin'
	)
);

create policy "admins update reports"
on public.debug_reports
for update
to authenticated
using (
	exists (
		select 1
		from public."User" as profile
		where profile."authId" = auth.uid()::text
			and profile.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public."User" as profile
		where profile."authId" = auth.uid()::text
			and profile.role = 'admin'
	)
);

create policy "admins delete reports"
on public.debug_reports
for delete
to authenticated
using (
	exists (
		select 1
		from public."User" as profile
		where profile."authId" = auth.uid()::text
			and profile.role = 'admin'
	)
);

drop policy if exists "users upload own debug attachments" on storage.objects;
drop policy if exists "users read own debug attachments" on storage.objects;
drop policy if exists "service role reads debug attachments" on storage.objects;
drop policy if exists "admins read debug attachments" on storage.objects;
drop policy if exists "admins delete debug attachments" on storage.objects;

create policy "users upload own debug attachments"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'debug-attachments'
	and exists (
	  select 1
	  from public."User" as profile
	  where profile.id::text = (storage.foldername(name))[1]
	    and profile."authId" = auth.uid()::text
	)
);

create policy "users read own debug attachments"
on storage.objects
for select
to authenticated
using (
	bucket_id = 'debug-attachments'
	and exists (
	  select 1
	  from public."User" as profile
	  where profile.id::text = (storage.foldername(name))[1]
	    and profile."authId" = auth.uid()::text
	)
);

create policy "admins read debug attachments"
on storage.objects
for select
using (
	bucket_id = 'debug-attachments'
	and exists (
	  select 1
	  from public."User" as profile
	  where profile."authId" = auth.uid()::text
	    and profile.role = 'admin'
	)
);

create policy "admins delete debug attachments"
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'debug-attachments'
	and exists (
	  select 1
	  from public."User" as profile
	  where profile."authId" = auth.uid()::text
	    and profile.role = 'admin'
	)
);
