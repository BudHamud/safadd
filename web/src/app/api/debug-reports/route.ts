import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { createAuthenticatedSupabaseClient, ensureAppUserProfile, requireAuth } from '../../../lib/supabase-server';
import { prisma } from '../../../lib/prisma';
import { consumeRateLimit, enforceSameOrigin, normalizeText } from '../../../lib/security';

type ReportStatus = 'open' | 'solved' | 'archived';

type DebugReportRow = {
  id: string;
  user_id: string;
  description: string;
  device_info: string | null;
  app_version: string | null;
  platform: string | null;
  images_count: number | null;
  created_at: Date | string;
  status: string | null;
  resolved_at: Date | string | null;
  archived_at: Date | string | null;
};

function normalizeBase64(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^data:[^;]+;base64,/, '');
}

type SupabaseAuthUser = { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null };

async function resolveAppUser(user: SupabaseAuthUser) {
  try {
    const currentUser = await ensureAppUserProfile(user);
    return { error: null, status: 200, currentUser };
  } catch {
    return { error: 'No se pudo resolver el perfil de usuario', status: 500, currentUser: null };
  }
}

async function requireAdminUser(user: SupabaseAuthUser) {
  const appUser = await resolveAppUser(user);
  if (appUser.error || !appUser.currentUser) {
    return appUser;
  }

  if (appUser.currentUser.role !== 'admin') {
    return { error: 'No autorizado', status: 403, currentUser: appUser.currentUser };
  }

  return appUser;
}

function normalizeReportStatus(value: unknown): ReportStatus | 'all' | null {
  if (value === 'open' || value === 'solved' || value === 'archived' || value === 'all') {
    return value;
  }
  return null;
}

async function buildReporterNames(reporterIds: string[]) {
  if (reporterIds.length === 0) return new Map<string, string>();

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { id: { in: reporterIds } },
        { authId: { in: reporterIds } },
      ],
    },
    select: { id: true, authId: true, username: true },
  });

  const reporterNames = new Map<string, string>();
  for (const row of users) {
    if (row.id) reporterNames.set(row.id as string, row.username as string);
    if (row.authId) reporterNames.set(row.authId as string, row.username as string);
  }
  return reporterNames;
}

async function buildSignedImageUrls(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  reports: Array<{ id: string; user_id: string; images_count: number | null }>,
) {
  const reportsWithImages = reports.filter((report) => (report.images_count ?? 0) > 0);
  const signedUrlMap = new Map<string, string[]>();

  if (reportsWithImages.length === 0) return signedUrlMap;

  const pathIndex: { reportId: string; pathIdx: number; path: string }[] = [];
  for (const report of reportsWithImages) {
    for (let index = 0; index < (report.images_count ?? 0); index += 1) {
      pathIndex.push({
        reportId: report.id,
        pathIdx: index,
        path: `${report.user_id}/${report.id}/${index}.jpg`,
      });
    }
  }

  const allPaths = pathIndex.map((entry) => entry.path);
  const { data } = await supabase.storage.from('debug-attachments').createSignedUrls(allPaths, 3600);

  if (!data) return signedUrlMap;

  for (let index = 0; index < pathIndex.length; index += 1) {
    const entry = pathIndex[index];
    const signed = data[index];
    if (!entry || !signed?.signedUrl) continue;
    const bucket = signedUrlMap.get(entry.reportId) ?? [];
    bucket[entry.pathIdx] = signed.signedUrl;
    signedUrlMap.set(entry.reportId, bucket);
  }

  return signedUrlMap;
}

async function getAdminSummary() {
  const rows = await prisma.$queryRaw<Array<{ status: string | null; count: bigint | number }>>(Prisma.sql`
    select status, count(*)::bigint as count
    from public.debug_reports
    group by status
  `);

  const summary = { open: 0, solved: 0, archived: 0 };
  for (const row of rows) {
    const count = Number(row.count ?? 0);
    if (row.status === 'open') summary.open = count;
    if (row.status === 'solved') summary.solved = count;
    if (row.status === 'archived') summary.archived = count;
  }
  return summary;
}

async function listReports(params: {
  isAdminScope: boolean;
  currentUserId: string;
  reportStatus: ReportStatus | 'all';
  limit: number;
}) {
  if (params.isAdminScope) {
    if (params.reportStatus !== 'all') {
      return prisma.$queryRaw<DebugReportRow[]>(Prisma.sql`
        select
          id,
          user_id,
          description,
          device_info,
          app_version,
          platform,
          images_count,
          created_at,
          status,
          resolved_at,
          archived_at
        from public.debug_reports
        where status = ${params.reportStatus}
        order by created_at desc
        limit ${params.limit}
      `);
    }

    return prisma.$queryRaw<DebugReportRow[]>(Prisma.sql`
      select
        id,
        user_id,
        description,
        device_info,
        app_version,
        platform,
        images_count,
        created_at,
        status,
        resolved_at,
        archived_at
      from public.debug_reports
      where status <> 'archived'
      order by created_at desc
      limit ${params.limit}
    `);
  }

  if (params.reportStatus !== 'all') {
    return prisma.$queryRaw<DebugReportRow[]>(Prisma.sql`
      select
        id,
        user_id,
        description,
        device_info,
        app_version,
        platform,
        images_count,
        created_at,
        status,
        resolved_at,
        archived_at
      from public.debug_reports
      where user_id = ${params.currentUserId}::uuid
        and status <> 'archived'
        and status = ${params.reportStatus}
      order by created_at desc
      limit ${params.limit}
    `);
  }

  return prisma.$queryRaw<DebugReportRow[]>(Prisma.sql`
    select
      id,
      user_id,
      description,
      device_info,
      app_version,
      platform,
      images_count,
      created_at,
      status,
      resolved_at,
      archived_at
    from public.debug_reports
    where user_id = ${params.currentUserId}::uuid
      and status <> 'archived'
    order by created_at desc
    limit ${params.limit}
  `);
}

async function createReport(params: {
  userId: string;
  description: string;
  deviceInfo: string;
  appVersion: string;
  platform: string;
  imagesCount: number;
}) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    insert into public.debug_reports (
      user_id,
      description,
      device_info,
      app_version,
      platform,
      images_count,
      status
    ) values (
      ${params.userId}::uuid,
      ${params.description},
      ${params.deviceInfo || null},
      ${params.appVersion || null},
      ${params.platform || null},
      ${params.imagesCount},
      'open'
    )
    returning id
  `);

  return rows[0] ?? null;
}

async function updateReport(reportId: string, updatePayload: {
  status: 'open' | 'solved' | 'archived';
  resolved_at: string | null;
  archived_at?: string | null;
  resolved_by: string | null;
}) {
  const rows = await prisma.$queryRaw<DebugReportRow[]>(Prisma.sql`
    update public.debug_reports
    set
      status = ${updatePayload.status},
      resolved_at = ${updatePayload.resolved_at ? new Date(updatePayload.resolved_at) : null},
      archived_at = ${updatePayload.archived_at ? new Date(updatePayload.archived_at) : null},
      resolved_by = ${updatePayload.resolved_by ? updatePayload.resolved_by : null}::uuid
    where id = ${reportId}::uuid
    returning
      id,
      user_id,
      description,
      device_info,
      app_version,
      platform,
      images_count,
      created_at,
      status,
      resolved_at,
      archived_at
  `);

  return rows[0] ?? null;
}

async function getReportForDelete(reportId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; user_id: string; images_count: number | null }>>(Prisma.sql`
    select id, user_id, images_count
    from public.debug_reports
    where id = ${reportId}::uuid
    limit 1
  `);

  return rows[0] ?? null;
}

async function deleteReport(reportId: string) {
  await prisma.$executeRaw(Prisma.sql`delete from public.debug_reports where id = ${reportId}::uuid`);
}

async function updateReportImageCount(reportId: string, imagesCount: number) {
  await prisma.$executeRaw(Prisma.sql`
    update public.debug_reports
    set images_count = ${imagesCount}
    where id = ${reportId}::uuid
  `);
}

export async function GET(req: Request) {
  const { user, accessToken, error, status } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status });

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope');
  const reportStatus = normalizeReportStatus(url.searchParams.get('status')) ?? 'all';
  const requestedLimit = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
    : 50;

  const supabase = createAuthenticatedSupabaseClient(accessToken ?? '');
  const isAdminScope = scope === 'admin';
  const appUser = isAdminScope ? await requireAdminUser(user) : await resolveAppUser(user);

  if (appUser.error || !appUser.currentUser) {
    return NextResponse.json({ error: appUser.error }, { status: appUser.status });
  }

  let reports: DebugReportRow[] = [];
  try {
    reports = await listReports({
      isAdminScope,
      currentUserId: appUser.currentUser.id,
      reportStatus,
      limit,
    });
  } catch (reportsError) {
    console.error('[DEBUG_REPORTS GET] list error:', reportsError);
    return NextResponse.json({ error: reportsError.message ?? 'No se pudieron cargar los reportes' }, { status: 500 });
  }

  const reporterIds = Array.from(new Set((reports ?? []).map((report) => report.user_id).filter(Boolean)));
  const reporterNames = await buildReporterNames(reporterIds);
  const signedUrlMap = isAdminScope
    ? await buildSignedImageUrls(supabase, (reports ?? []) as Array<{ id: string; user_id: string; images_count: number | null }>)
    : new Map<string, string[]>();
  const summary = isAdminScope ? await getAdminSummary() : undefined;

  return NextResponse.json({
    reports: (reports ?? []).map((report) => ({
      ...report,
      status: normalizeReportStatus(report.status) === 'all' ? 'open' : normalizeReportStatus(report.status) ?? 'open',
      reporterName: reporterNames.get(report.user_id) ?? null,
      image_urls: signedUrlMap.get(report.id) ?? [],
    })),
    summary,
  });
}

export async function POST(req: Request) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;

  const rateLimitError = consumeRateLimit(req, {
    key: 'debug-reports:post',
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimitError) return rateLimitError;

  const { user, accessToken, error, status } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status });

  const appUser = await resolveAppUser(user);
  if (appUser.error || !appUser.currentUser) {
    return NextResponse.json({ error: appUser.error ?? 'No se pudo resolver el perfil de usuario' }, { status: appUser.status });
  }

  const supabase = createAuthenticatedSupabaseClient(accessToken ?? '');

  try {
    const body = await req.json();
    const description = normalizeText(body?.description, 3000, '');
    const deviceInfo = normalizeText(body?.device_info, 500, '');
    const appVersion = normalizeText(body?.app_version, 64, '');
    const platform = normalizeText(body?.platform, 32, '');
    const images = Array.isArray(body?.images) ? body.images.slice(0, 5) : [];

    if (!description) {
      return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 });
    }

    const report = await createReport({
      userId: appUser.currentUser.id,
      description,
      deviceInfo,
      appVersion,
      platform,
      imagesCount: images.length,
    });

    if (!report?.id) {
      return NextResponse.json({ error: 'No se pudo guardar el reporte' }, { status: 500 });
    }

    let uploadedImages = 0;
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const base64 = normalizeBase64(image?.base64);
      if (!base64) continue;

      const bytes = Buffer.from(base64, 'base64');
      const path = `${appUser.currentUser.id}/${report.id}/${index}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('debug-attachments')
        .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) {
        console.warn('[DEBUG_REPORTS POST] upload warning:', uploadError);
        continue;
      }

      uploadedImages += 1;
    }

    if (uploadedImages !== images.length) {
      await updateReportImageCount(report.id, uploadedImages);
    }

    return NextResponse.json({ id: report.id, success: true, uploadedImages });
  } catch (routeError) {
    console.error('[DEBUG_REPORTS POST] unexpected error:', routeError);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;

  const { user, accessToken, error, status } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status });

  const adminCheck = await requireAdminUser(user);
  if (adminCheck.error || !adminCheck.currentUser) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const reportId = new URL(req.url).searchParams.get('id');
  if (!reportId) {
    return NextResponse.json({ error: 'Falta el reporte' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const nextStatus = normalizeReportStatus(body?.status);
  if (!nextStatus || nextStatus === 'all') {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const supabase = createAuthenticatedSupabaseClient(accessToken ?? '');
  const now = new Date().toISOString();
  const updatePayload = nextStatus === 'open'
    ? { status: 'open', resolved_at: null, archived_at: null, resolved_by: null }
    : nextStatus === 'solved'
      ? { status: 'solved', resolved_at: now, archived_at: null, resolved_by: adminCheck.currentUser.id }
      : { status: 'archived', archived_at: now, resolved_by: adminCheck.currentUser.id };

  let data: DebugReportRow | null = null;
  try {
    data = await updateReport(reportId, updatePayload);
  } catch (updateError) {
    console.error('[DEBUG_REPORTS PUT] update error:', updateError);
    return NextResponse.json({ error: updateError.message ?? 'No se pudo actualizar el reporte' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ success: true, report: data });
}

export async function DELETE(req: Request) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;

  const { user, accessToken, error, status } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status });

  const adminCheck = await requireAdminUser(user);
  if (adminCheck.error || !adminCheck.currentUser) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const reportId = new URL(req.url).searchParams.get('id');
  if (!reportId) {
    return NextResponse.json({ error: 'Falta el reporte' }, { status: 400 });
  }

  const supabase = createAuthenticatedSupabaseClient(accessToken ?? '');
  let report: { id: string; user_id: string; images_count: number | null } | null = null;
  try {
    report = await getReportForDelete(reportId);
  } catch (reportError) {
    return NextResponse.json({ error: reportError.message ?? 'Reporte no encontrado' }, { status: 500 });
  }

  if (!report) {
    return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
  }

  const paths = Array.from({ length: report.images_count ?? 0 }, (_, index) => `${report.user_id}/${report.id}/${index}.jpg`);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('debug-attachments').remove(paths);
    if (storageError) {
      console.error('[DEBUG_REPORTS DELETE] storage error:', storageError);
      return NextResponse.json({ error: storageError.message ?? 'No se pudieron borrar los adjuntos' }, { status: 500 });
    }
  }

  try {
    await deleteReport(reportId);
  } catch (deleteError) {
    console.error('[DEBUG_REPORTS DELETE] delete error:', deleteError);
    return NextResponse.json({ error: deleteError.message ?? 'No se pudo borrar el reporte' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
