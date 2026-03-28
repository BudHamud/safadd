import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { apiFetch } from '../lib/api';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

type AdminReportsContextValue = {
  openCount: number;
  unseenCount: number;
  refresh: () => Promise<void>;
  markSeen: () => Promise<void>;
};

const AdminReportsContext = createContext<AdminReportsContextValue | undefined>(undefined);

type AdminReportSummaryResponse = {
  reports?: Array<{ id: string }>;
  summary?: { open?: number };
};

const POLL_INTERVAL_MS = 30000;

export function AdminReportsProvider({ children }: { children: React.ReactNode }) {
  const { session, webUser } = useAuth();
  const { t } = useLanguage();
  const [openCount, setOpenCount] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const isAdmin = (webUser?.role ?? '').toLowerCase() === 'admin';

  const load = useCallback(async (markAsSeen: boolean) => {
    if (!isAdmin || !session) {
      setOpenCount(0);
      setUnseenCount(0);
      knownIdsRef.current = new Set();
      initializedRef.current = false;
      return;
    }

    try {
      const response = await apiFetch('/api/debug-reports?scope=admin&status=open&limit=20', undefined, session);
      const payload = await response.json().catch(() => ({} as AdminReportSummaryResponse));
      if (!response.ok) return;

      const reports = Array.isArray(payload?.reports) ? payload.reports : [];
      const currentIds = reports.map((report) => report.id);
      setOpenCount(typeof payload?.summary?.open === 'number' ? payload.summary.open : currentIds.length);

      if (!initializedRef.current || markAsSeen) {
        knownIdsRef.current = new Set(currentIds);
        initializedRef.current = true;
        setUnseenCount(0);
        return;
      }

      const newIds = currentIds.filter((id) => !knownIdsRef.current.has(id));
      if (newIds.length > 0) {
        newIds.forEach((id) => knownIdsRef.current.add(id));
        setUnseenCount((current) => current + newIds.length);
        Toast.show({
          type: 'success',
          text1: t('mobile.admin_reports.notification_title'),
          text2: t('mobile.admin_reports.notification_body', { count: newIds.length }),
        });
      }
    } catch {
      // Ignore transient polling failures.
    }
  }, [isAdmin, session, t]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    if (!isAdmin || !session) return undefined;
    const interval = setInterval(() => {
      void load(false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAdmin, load, session]);

  const refresh = useCallback(async () => {
    await load(false);
  }, [load]);

  const markSeen = useCallback(async () => {
    await load(true);
  }, [load]);

  const value = useMemo(() => ({ openCount, unseenCount, refresh, markSeen }), [markSeen, openCount, refresh, unseenCount]);

  return <AdminReportsContext.Provider value={value}>{children}</AdminReportsContext.Provider>;
}

export function useAdminReports() {
  const context = useContext(AdminReportsContext);
  if (!context) throw new Error('useAdminReports must be used inside AdminReportsProvider');
  return context;
}