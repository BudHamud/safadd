import type { SupportedLang } from '@safed/i18n';

export declare function getLocale(lang: SupportedLang): 'en-US' | 'es-AR';
export declare function formatAmount(value: number, lang: SupportedLang): string;
export declare function formatCurrency(val: number, sym: string): string;
export declare function formatMonthLabel(
  date: Date,
  lang: SupportedLang,
  options?: Intl.DateTimeFormatOptions
): string;
export declare function parseDateValue(value: string | number | Date): Date;
export declare function formatShortDate(value: string, lang: SupportedLang): string;
export declare function formatLongDate(value: string, lang: SupportedLang): string;
