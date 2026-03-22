import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { DialogProvider } from '../context/DialogContext';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { AppSplash } from '../components/layout/AppSplash';

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
  const { session, loading } = useAuth();
  const { theme: C, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => undefined);
    });

    return () => cancelAnimationFrame(frame);
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

  // Show a full-screen spinner while the auth state is being resolved
  if (loading) {
    return (
      <View style={[styles.splash, { backgroundColor: C.bg }]}>
        <AppSplash />
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
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <DialogProvider>
            <RootLayoutNav />
          </DialogProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
  },
});
