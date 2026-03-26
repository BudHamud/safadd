import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gastoscajafuerte.app',
  appName: 'Safed',
  webDir: 'public',
  server: {
    url: 'https://zafe.vercel.app/app',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      androidSplashResourceName: "ic_logo_animated",
      backgroundColor: "#141714",
      showSpinner: false
    }
  }
};

export default config;
