import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const reporterClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

type ReportClientErrorOptions = {
  context?: string;
  metadata?: Record<string, unknown>;
  userEmail?: string;
};

function normalizeErrorMessage(error: unknown, options?: ReportClientErrorOptions) {
  const serialized = {
    appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null,
    context: options?.context ?? null,
    message: error instanceof Error ? error.message : String(error),
    metadata: options?.metadata ?? null,
    name: error instanceof Error ? error.name : null,
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
  };

  try {
    return JSON.stringify(serialized);
  } catch {
    return serialized.message;
  }
}

function resolveDeviceModel() {
  return Device.modelName ?? Constants.deviceName ?? `${Platform.OS} ${String(Platform.Version)}`;
}

export async function reportClientError(error: unknown, options?: ReportClientErrorOptions) {
  if (!reporterClient) return;

  try {
    const { error: insertError } = await reporterClient.from('client_errors').insert({
      device_model: resolveDeviceModel(),
      error_message: normalizeErrorMessage(error, options),
      user_email: options?.userEmail?.trim().toLowerCase() || null,
    });

    if (insertError) {
      console.warn('[client_errors] insert failed:', insertError.message);
    }
  } catch (reportError) {
    console.warn('[client_errors] unexpected reporter failure:', reportError);
  }
}