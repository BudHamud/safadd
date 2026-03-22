import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.gastoscajafuerte.app.dev',
    appName: 'Safed - Dev',
    webDir: 'public',
    server: {
        url: 'http://192.168.68.55:3000/app',
        cleartext: true
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
