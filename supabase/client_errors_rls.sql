create extension if not exists pgcrypto;

create table if not exists public.client_errors (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc', now()),
	device_model text not null,
	error_message text not null,
	user_email text null
);

alter table public.client_errors enable row level security;

drop policy if exists "anon and authenticated can insert client errors" on public.client_errors;

create policy "anon and authenticated can insert client errors"
on public.client_errors
for insert
to anon, authenticated
with check (
	char_length(device_model) > 0
	and char_length(error_message) > 0
);