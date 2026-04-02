-- 1. Aseguramos que la extensión exista
create extension if not exists pgcrypto;

-- 1.1 Aseguramos el bucket privado para adjuntos
insert into storage.buckets (id, name, public)
values ('debug-attachments', 'debug-attachments', false)
on conflict (id) do nothing;

-- 2. CREAMOS LA TABLA DE NUEVO (Esto es lo que faltaba)
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
    resolved_by uuid,
    constraint debug_reports_status_check check (status in ('open', 'solved', 'archived'))
);

-- 3. Activamos la seguridad (RLS)
alter table public.debug_reports enable row level security;

-- 4. Limpieza de políticas (Idempotente)
drop policy if exists "users_insert_reports" on public.debug_reports;
drop policy if exists "users_read_reports" on public.debug_reports;
drop policy if exists "admins_manage_reports" on public.debug_reports;
drop policy if exists "users insert own debug reports" on public.debug_reports;
drop policy if exists "users read own debug reports" on public.debug_reports;
drop policy if exists "admins read reports" on public.debug_reports;
drop policy if exists "admins update reports" on public.debug_reports;
drop policy if exists "admins delete reports" on public.debug_reports;
drop policy if exists "admins_read_reports" on public.debug_reports;
drop policy if exists "admins_update_reports" on public.debug_reports;
drop policy if exists "admins_delete_reports" on public.debug_reports;

-- 5. POLÍTICAS OPTIMIZADAS PARA LA TABLA

-- Permitir a los usuarios insertar (con cast a ::text para evitar errores de tipo)
create policy "users_insert_reports"
on public.debug_reports for insert to authenticated
with check (
    exists (
        select 1 from public."User" as profile
        where profile.id::text = debug_reports.user_id::text
          and profile."authId" = auth.uid()::text
    )
);

-- Permitir a los usuarios leer sus reportes
create policy "users_read_reports"
on public.debug_reports for select to authenticated
using (
    exists (
        select 1 from public."User" as profile
        where profile.id::text = debug_reports.user_id::text
          and profile."authId" = auth.uid()::text
    )
);

-- Permitir a los admins leer todos los reportes
create policy "admins_read_reports"
on public.debug_reports for select to authenticated
using (
    exists (
        select 1 from public."User" as profile
        where profile."authId" = auth.uid()::text
          and profile.role = 'admin'
    )
);

-- Permitir a los admins actualizar el estado de cualquier reporte
create policy "admins_update_reports"
on public.debug_reports for update to authenticated
using (
    exists (
        select 1 from public."User" as profile
        where profile."authId" = auth.uid()::text
          and profile.role = 'admin'
    )
)
with check (
    exists (
        select 1 from public."User" as profile
        where profile."authId" = auth.uid()::text
          and profile.role = 'admin'
    )
);

-- Permitir a los admins borrar cualquier reporte
create policy "admins_delete_reports"
on public.debug_reports for delete to authenticated
using (
    exists (
        select 1 from public."User" as profile
        where profile."authId" = auth.uid()::text
          and profile.role = 'admin'
    )
);

-- 6. POLÍTICAS PARA EL STORAGE (Imágenes adjuntas)
drop policy if exists "users upload own debug attachments" on storage.objects;
drop policy if exists "users read own debug attachments" on storage.objects;
drop policy if exists "users_upload_attachments" on storage.objects;
drop policy if exists "users_read_attachments" on storage.objects;
drop policy if exists "admins read debug attachments" on storage.objects;
drop policy if exists "admins delete debug attachments" on storage.objects;
drop policy if exists "admins_read_attachments" on storage.objects;
drop policy if exists "admins_delete_attachments" on storage.objects;

create policy "users_upload_attachments"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'debug-attachments'
    and (storage.foldername(name))[1] = (
        select id::text from public."User" 
        where "authId" = auth.uid()::text 
        limit 1
    )
);

create policy "users_read_attachments"
on storage.objects for select to authenticated
using (
    bucket_id = 'debug-attachments'
    and (storage.foldername(name))[1] = (
        select id::text from public."User" 
        where "authId" = auth.uid()::text 
        limit 1
    )
);

create policy "admins_read_attachments"
on storage.objects for select to authenticated
using (
    bucket_id = 'debug-attachments'
    and exists (
        select 1 from public."User" as profile
        where profile."authId" = auth.uid()::text
          and profile.role = 'admin'
    )
);

create policy "admins_delete_attachments"
on storage.objects for delete to authenticated
using (
    bucket_id = 'debug-attachments'
    and exists (
        select 1 from public."User" as profile
        where profile."authId" = auth.uid()::text
          and profile.role = 'admin'
    )
);