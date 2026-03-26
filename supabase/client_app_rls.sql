-- Baseline RLS so the mobile app can talk directly to Supabase with the anon key.
-- Run this in the Supabase SQL Editor after confirming table and column names.

alter table public."User" enable row level security;
alter table public."Transaction" enable row level security;

drop policy if exists "users read own profile" on public."User";
drop policy if exists "users update own profile" on public."User";

create policy "users read own profile"
on public."User"
for select
to authenticated
using ("authId" = auth.uid()::text);

create policy "users update own profile"
on public."User"
for update
to authenticated
using ("authId" = auth.uid()::text)
with check ("authId" = auth.uid()::text);

drop policy if exists "users read own transactions" on public."Transaction";
drop policy if exists "users insert own transactions" on public."Transaction";
drop policy if exists "users update own transactions" on public."Transaction";
drop policy if exists "users delete own transactions" on public."Transaction";

create policy "users read own transactions"
on public."Transaction"
for select
to authenticated
using (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "Transaction"."userId"
      and profile."authId" = auth.uid()::text
  )
);

create policy "users insert own transactions"
on public."Transaction"
for insert
to authenticated
with check (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "Transaction"."userId"
      and profile."authId" = auth.uid()::text
  )
);

create policy "users update own transactions"
on public."Transaction"
for update
to authenticated
using (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "Transaction"."userId"
      and profile."authId" = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "Transaction"."userId"
      and profile."authId" = auth.uid()::text
  )
);

create policy "users delete own transactions"
on public."Transaction"
for delete
to authenticated
using (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "Transaction"."userId"
      and profile."authId" = auth.uid()::text
  )
);