import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { DialogProvider } from '../context/DialogContext';
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
  const { session, loading, configError } = useAuth();
  const { theme: C, isDark } = useTheme();
  const { t } = useLanguage();
  const segments = useSegments();
  const router = useRouter();
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => undefined);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, 1350);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!session && !inAuthGroup) {
      // No session → go to login
      router.replace('/login');
    } else if (session && inAuthGroup) {
      // Has session → go to tabs
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  if (configError) {
    return (
      <View style={[styles.splash, { backgroundColor: C.bg }]}> 
        <AppSplash title="Safadd" subtitle={configError} />
      </View>
    );
  }

  // Show a full-screen spinner while the auth state is being resolved
  if (loading || !minSplashElapsed) {
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
            <DialogProvider>
              <RootLayoutNav />
            </DialogProvider>
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
