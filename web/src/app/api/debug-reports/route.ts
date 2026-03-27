import { NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient, requireAuth } from '../../../lib/supabase-server';
import { prisma } from '../../../lib/prisma';
import { consumeRateLimit, enforceSameOrigin, normalizeText } from '../../../lib/security';

function normalizeBase64(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^data:[^;]+;base64,/, '');
}

async function getAppUserByAuthId(authUserId: string) {
  const currentUser = await prisma.user.findUnique({
    where: { authId: authUserId },
    select: { id: true, authId: true, role: true, username: true },
  });

  if (!currentUser) {
    return { error: 'Usuario no encontrado', status: 404, currentUser: null };
  }

  return { error: null, status: 200, currentUser };
}

async function requireAdminUser(authUserId: string) {
  const appUser = await getAppUserByAuthId(authUserId);
  if (appUser.error || !appUser.currentUser) {
    return appUser;
  }

  if (appUser.currentUser.role !== 'admin') {
    return { error: 'No autorizado', status: 403, currentUser: appUser.currentUser };
  }

  return appUser;
}

export async function GET(req: Request) {
  const { user, accessToken, error, status } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status });

  const adminCheck = await requireAdminUser(user.id);
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const supabase = createAuthenticatedSupabaseClient(accessToken ?? '');

  const url = new URL(req.url);
  const requestedLimit = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
    : 50;

  const { data: reports, error: reportsError } = await supabase
    .from('debug_reports')
    .select('id, user_id, description, device_info, app_version, platform, images_count, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (reportsError) {
    console.error('[DEBUG_REPORTS GET] list error:', reportsError);
    return NextResponse.json({ error: reportsError.message ?? 'No se pudieron cargar los reportes' }, { status: 500 });
  }

  const reporterIds = Array.from(new Set((reports ?? []).map((report) => report.user_id).filter(Boolean)));
  let reporterNames = new Map<string, string>();

  if (reporterIds.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: { in: reporterIds } },
          { authId: { in: reporterIds } },
        ],
      },
      select: { id: true, authId: true, username: true },
    });

    reporterNames = new Map();
    for (const row of users) {
      if (row.id) reporterNames.set(row.id as string, row.username as string);
      if (row.authId) reporterNames.set(row.authId as string, row.username as string);
    }
  }

  // Generate signed URLs for all images in a single batch call.
  // Mobile uploads use path: {user_id}/{report_id}/{index}.jpg
  const reportsWithImages = (reports ?? []).filter((r) => (r.images_count ?? 0) > 0);
  const signedUrlMap = new Map<string, string[]>();

  if (reportsWithImages.length > 0) {
    const pathIndex: { reportId: string; pathIdx: number; path: string }[] = [];
    for (const report of reportsWithImages) {
      for (let i = 0; i < (report.images_count ?? 0); i++) {
        pathIndex.push({
          reportId: report.id,
          pathIdx: i,
          path: `${report.user_id}/${report.id}/${i}.jpg`,
        });
      }
    }

    const allPaths = pathIndex.map((p) => p.path);
    const { data: signedData } = await supabase.storage
      .from('debug-attachments')
      .createSignedUrls(allPaths, 3600);

    if (signedData) {
      for (let i = 0; i < pathIndex.length; i++) {
        const entry = pathIndex[i];
        const signed = signedData[i];
        if (!entry || !signed?.signedUrl) continue;
        const bucket = signedUrlMap.get(entry.reportId) ?? [];
        bucket[entry.pathIdx] = signed.signedUrl;
        signedUrlMap.set(entry.reportId, bucket);
      }
    }
  }

  return NextResponse.json({
    reports: (reports ?? []).map((report) => ({
      ...report,
      reporterName: reporterNames.get(report.user_id) ?? null,
      image_urls: signedUrlMap.get(report.id) ?? [],
    })),
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

  const appUser = await getAppUserByAuthId(user.id);
  if (appUser.error || !appUser.currentUser) {
    return NextResponse.json({ error: appUser.error ?? 'Usuario no encontrado' }, { status: appUser.status });
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

    const { data: report, error: insertError } = await supabase
      .from('debug_reports')
      .insert({
        user_id: appUser.currentUser.id,
        description,
        device_info: deviceInfo,
        app_version: appVersion,
        platform,
        images_count: images.length,
      })
      .select('id')
      .single();

    if (insertError || !report?.id) {
      console.error('[DEBUG_REPORTS POST] insert error:', insertError);
      return NextResponse.json({ error: insertError?.message ?? 'No se pudo guardar el reporte' }, { status: 500 });
    }

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
        console.error('[DEBUG_REPORTS POST] upload error:', uploadError);
        return NextResponse.json({ error: uploadError.message ?? 'No se pudo subir la imagen' }, { status: 500 });
      }
    }

    return NextResponse.json({ id: report.id, success: true });
  } catch (routeError) {
    console.error('[DEBUG_REPORTS POST] unexpected error:', routeError);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
