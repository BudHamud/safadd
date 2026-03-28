import type { ExpoConfig, ConfigContext } from 'expo/config';

const staticConfig = require('./app.json');

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...staticConfig.expo,
  ...config,
  updates: projectId ? {
    url: `https://u.exe.dev/${projectId}`,
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  } : undefined,
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    ...staticConfig.expo.extra,
    eas: projectId ? {
      projectId: projectId,
    } : undefined,
  },
  android: {
    ...staticConfig.expo.android,
    usesCleartextTraffic: true, 
  }
});