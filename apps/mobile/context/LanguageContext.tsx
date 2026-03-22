import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_LANGUAGE_STORAGE_KEY,
  DEFAULT_LANGUAGE,
  type SupportedLang,
  type TranslationKey,
  normalizeLang,
  translate,
} from '@safed/i18n';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Lang = SupportedLang;

interface LanguageContextType {
  lang: Lang;
  hydrated: boolean;
  setLang: (lang: Lang) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getDeviceLanguage(): Lang {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  return normalizeLang(locale) ?? DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANGUAGE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const storedLang = normalizeLang(await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY));
        const resolvedLang = storedLang ?? getDeviceLanguage();

        if (!cancelled) {
          setLangState(resolvedLang);
          setHydrated(true);
        }

        if (!storedLang) {
          await AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, resolvedLang);
        }
      } catch {
        if (!cancelled) {
          setLangState(getDeviceLanguage());
          setHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback(async (nextLang: Lang) => {
    setLangState(nextLang);
    await AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, nextLang);
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
    return translate(lang, key, params);
  }, [lang]);

  const value = useMemo(() => ({ hydrated, lang, setLang, t }), [hydrated, lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}