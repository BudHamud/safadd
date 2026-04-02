-- 1. Aseguramos RLS en tablas críticas (Idempotente)
-- Nota: este script NO crea `public.debug_reports` ni el bucket `debug-attachments`.
-- Para habilitar reportes de debug hay que correr además `apps/safadd/supabase/debug_reports_rls.sql`.
ALTER TABLE public."ExchangeRateCache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ImportUsage" ENABLE ROW LEVEL SECURITY;

-- 2. Limpieza total de políticas previas para evitar conflictos
DROP POLICY IF EXISTS "authenticated_only_exchange_cache" ON public."ExchangeRateCache";
DROP POLICY IF EXISTS "users_manage_own_import_usage" ON public."ImportUsage";
DROP POLICY IF EXISTS "users read own pending notifications" ON public."PendingNotification";
DROP POLICY IF EXISTS "users insert own pending notifications" ON public."PendingNotification";
DROP POLICY IF EXISTS "users delete own pending notifications" ON public."PendingNotification";
DROP POLICY IF EXISTS "users_manage_own_notifications" ON public."PendingNotification";
DROP POLICY IF EXISTS "users read own scan usage" ON public."ScanUsage";
DROP POLICY IF EXISTS "users insert own scan usage" ON public."ScanUsage";
DROP POLICY IF EXISTS "users delete own scan usage" ON public."ScanUsage";
DROP POLICY IF EXISTS "users update own scan usage" ON public."ScanUsage";
DROP POLICY IF EXISTS "users_manage_own_scan_usage" ON public."ScanUsage";

-- 3. POLÍTICAS DE SEGURIDAD

-- ExchangeRateCache: Lectura global para usuarios logueados (API/App)
CREATE POLICY "authenticated_only_exchange_cache"
ON public."ExchangeRateCache" FOR SELECT TO authenticated USING (true);

-- ImportUsage: Gestión por usuario (Usa el método EXISTS porque ImportUsage no tiene authId todavía)
CREATE POLICY "users_manage_own_import_usage"
ON public."ImportUsage"
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public."User" AS profile
        WHERE profile.id = "ImportUsage"."userId"
          AND profile."authId" = auth.uid()::text
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public."User" AS profile
        WHERE profile.id = "ImportUsage"."userId"
          AND profile."authId" = auth.uid()::text
    )
);

-- PendingNotification: Gestión hiper-rápida (Usa la nueva columna authId)
CREATE POLICY "users_manage_own_notifications"
ON public."PendingNotification"
FOR ALL
TO authenticated
USING ("authId" = auth.uid()::text)
WITH CHECK ("authId" = auth.uid()::text);

-- ScanUsage: Gestión hiper-rápida (Usa la nueva columna authId)
CREATE POLICY "users_manage_own_scan_usage"
ON public."ScanUsage"
FOR ALL
TO authenticated
USING ("authId" = auth.uid()::text)
WITH CHECK ("authId" = auth.uid()::text);