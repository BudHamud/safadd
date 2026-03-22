export type SupportedLang = 'es' | 'en';
export type TranslationKey = string;
export type TranslationParams = Record<string, string | number>;

export declare const en: Record<string, string>;
export declare const es: Record<string, string>;
export declare const DICTS: Record<SupportedLang, Record<string, string>>;
export declare const SUPPORTED_LANGS: readonly SupportedLang[];
export declare const DEFAULT_LANGUAGE: SupportedLang;
export declare const APP_LANGUAGE_STORAGE_KEY = "app-lang";

export declare function normalizeLang(value?: string | null): SupportedLang | null;
export declare function resolveLangFromList(languages: Array<string | null | undefined>): SupportedLang;
export declare const resolveLangFromBrowserList: typeof resolveLangFromList;
export declare function getDictionary(lang: SupportedLang): Record<string, string>;
export declare function translate(lang: SupportedLang, key: TranslationKey, params?: TranslationParams): string;
export declare function createTranslator(lang: SupportedLang): (key: TranslationKey, params?: TranslationParams) => string;