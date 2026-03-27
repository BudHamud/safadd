-- Baseline RLS so the mobile app can talk directly to Supabase with the anon key.
-- Run this in the Supabase SQL Editor after confirming table and column names.

alter table public."User" enable row level security;
alter table public."Transaction" enable row level security;
alter table public."ScanUsage" enable row level security;
alter table public."PendingNotification" enable row level security;

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

drop policy if exists "users insert own profile" on public."User";

create policy "users insert own profile"
on public."User"
for insert
to authenticated
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

drop policy if exists "users read own scan usage" on public."ScanUsage";
drop policy if exists "users insert own scan usage" on public."ScanUsage";
drop policy if exists "users update own scan usage" on public."ScanUsage";
drop policy if exists "users delete own scan usage" on public."ScanUsage";

create policy "users read own scan usage"
on public."ScanUsage"
for select
to authenticated
using (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "ScanUsage"."userId"
      and profile."authId" = auth.uid()::text
  )
);

create policy "users insert own scan usage"
on public."ScanUsage"
for insert
to authenticated
with check (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "ScanUsage"."userId"
      and profile."authId" = auth.uid()::text
  )
);

create policy "users update own scan usage"
on public."ScanUsage"
for update
to authenticated
using (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "ScanUsage"."userId"
      and profile."authId" = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "ScanUsage"."userId"
      and profile."authId" = auth.uid()::text
  )
);

create policy "users delete own scan usage"
on public."ScanUsage"
for delete
to authenticated
using (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "ScanUsage"."userId"
      and profile."authId" = auth.uid()::text
  )
);

drop policy if exists "users read own pending notifications" on public."PendingNotification";
drop policy if exists "users insert own pending notifications" on public."PendingNotification";
drop policy if exists "users delete own pending notifications" on public."PendingNotification";

create policy "users read own pending notifications"
on public."PendingNotification"
for select
to authenticated
using (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "PendingNotification"."userId"
      and profile."authId" = auth.uid()::text
  )
);

create policy "users insert own pending notifications"
on public."PendingNotification"
for insert
to authenticated
with check (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "PendingNotification"."userId"
      and profile."authId" = auth.uid()::text
  )
);

create policy "users delete own pending notifications"
on public."PendingNotification"
for delete
to authenticated
using (
  exists (
    select 1
    from public."User" as profile
    where profile.id = "PendingNotification"."userId"
      and profile."authId" = auth.uid()::text
  )
);