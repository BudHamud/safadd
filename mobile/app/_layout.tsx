import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { TransactionsProvider, useTransactions } from '../context/TransactionsContext';
import { AdminReportsProvider } from '../context/AdminReportsContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { DialogProvider, useDialog } from '../context/DialogContext';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { AppSplash } from '../components/layout/AppSplash';
import { SafeAreaProvider } from 'react-native-safe-area-context';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function getToastConfig(C: ReturnType<typeof useTheme>['theme']) {
  return {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: C.incomeText, backgroundColor: C.surface, borderRadius: 12 }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ color: C.textMain, fontSize: 14, fontWeight: '700' }}
        text2Style={{ color: C.textMuted, fontSize: 13 }}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{ borderLeftColor: C.expenseText, backgroundColor: C.surface, borderRadius: 12 }}
        text1Style={{ color: C.textMain, fontSize: 14, fontWeight: '700' }}
        text2Style={{ color: C.textMuted, fontSize: 13 }}
      />
    ),
  };
}

function RootLayoutNav() {
  const { session, webUser, loading, configError } = useAuth();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { theme: C, isDark } = useTheme();
  const { t, lang } = useLanguage();
  const dialog = useDialog();
  const segments = useSegments();
  const router = useRouter();
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [lastPromptedUpdateId, setLastPromptedUpdateId] = useState<string | null>(null);
  const hasCheckedForUpdateOnLaunch = useRef(false);
  const inAuthGroup = segments[0] === 'login';
  const awaitingInitialData = Boolean(session && webUser && !inAuthGroup && transactionsLoading && transactions.length === 0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => undefined);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!session && !inAuthGroup) {
      // No session → go to login
      router.replace('/login');
    } else if (session && inAuthGroup) {
      // Has session → go to tabs
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  const checkForAvailableUpdate = useCallback(async () => {
    if (loading || configError || !minSplashElapsed || isCheckingForUpdate || !Updates.isEnabled) {
      return;
    }

    setIsCheckingForUpdate(true);

    try {
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) {
        return;
      }

      const updateId = update.manifest?.id ?? 'available-update';
      if (lastPromptedUpdateId === updateId) {
        return;
      }

      setLastPromptedUpdateId(updateId);

      const shouldApply = await dialog.confirm({
        title: lang === 'es' ? 'Actualizacion disponible' : 'Update available',
        message:
          lang === 'es'
            ? 'Hay una nueva version lista para instalar. La app se va a reiniciar para aplicarla.'
            : 'A new version is ready to install. The app will restart to apply it.',
        confirmText: lang === 'es' ? 'Actualizar' : 'Update',
        cancelText: lang === 'es' ? 'Despues' : 'Later',
        type: 'confirm',
      });

      if (!shouldApply) {
        return;
      }

      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.warn('[expo-updates] automatic update check failed', error);
    } finally {
      setIsCheckingForUpdate(false);
    }
  }, [loading, configError, minSplashElapsed, isCheckingForUpdate, lastPromptedUpdateId, dialog, lang]);

  useEffect(() => {
    if (loading || configError || !minSplashElapsed) {
      return;
    }

    if (hasCheckedForUpdateOnLaunch.current) {
      return;
    }

    hasCheckedForUpdateOnLaunch.current = true;

    const timer = setTimeout(() => {
      void checkForAvailableUpdate();
    }, 1800);

    return () => clearTimeout(timer);
  }, [loading, configError, minSplashElapsed, checkForAvailableUpdate]);

  if (configError) {
    return (
      <View style={[styles.splash, { backgroundColor: C.bg }]}> 
        <AppSplash title="Safadd" subtitle={configError} />
      </View>
    );
  }

  // Show a full-screen spinner while the auth state is being resolved
  if (loading || awaitingInitialData || !minSplashElapsed) {
    return (
      <View style={[styles.splash, { backgroundColor: C.bg }]}>
        <AppSplash title="Safadd" subtitle={t('common.loading_data_hint')} />
      </View>
    );
  }

  return (
    <>
      <Slot />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Toast config={getToastConfig(C)} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <TransactionsProvider>
              <AdminReportsProvider>
                <DialogProvider>
                  <RootLayoutNav />
                </DialogProvider>
              </AdminReportsProvider>
            </TransactionsProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
  },
});
