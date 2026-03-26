// ── Locale / formatting utilities ─────────────────────────────────────────
// Pure functions — no platform dependencies. Works in Next.js and React Native.

/** @param {'es'|'en'} lang */
function getLocale(lang) {
  return lang === 'en' ? 'en-US' : 'es-AR';
}

/** Format an absolute amount with exactly 2 decimal places, locale-aware. */
function formatAmount(value, lang) {
  return Math.abs(value).toLocaleString(getLocale(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a value with currency symbol and exactly 2 decimal places (truncated).
 * e.g. formatCurrency(8.526, '$') → '$8.52'
 */
function formatCurrency(val, sym) {
  const truncated = Math.floor((val + 0.00000001) * 100) / 100;
  return `${sym}${truncated.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeShortMonthOutput(value, lang) {
  const cleaned = String(value).replace(/\./g, '');

  if (lang !== 'es') return cleaned;

  return cleaned.replace(/\bsept\b/gi, 'sep');
}

/** Format a Date as a short month label (e.g. "Jan", "ene"). */
function formatMonthLabel(date, lang, options) {
  return normalizeShortMonthOutput(
    new Intl.DateTimeFormat(getLocale(lang), options || { month: 'short' }).format(date),
    lang,
  );
}

function parseDateValue(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value);

  // Match YYYY-MM-DD, YYYY/MM/DD, YYYY-M-D, with optional T or Space for time
  const match = value.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:$|T|\s)/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  // Match DD/MM/YYYY, DD-MM-YYYY, D/M/YYYY with optional T or Space for time
  const dmyMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:$|T|\s)/);
  if (dmyMatch) {
    return new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
  }

  // Fallback to JS native parsing
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // As a last-ditch effort, just return today's Date so it doesn't crash, but it should be caught.
  return new Date();
}

/** Format an ISO date string as 'DD MMM' in the locale. */
function formatShortDate(value, lang) {
  const parts = new Intl.DateTimeFormat(getLocale(lang), {
    day: '2-digit',
    month: 'short',
  }).formatToParts(parseDateValue(value));

  return parts
    .map((part) => (
      part.type === 'month'
        ? normalizeShortMonthOutput(part.value, lang)
        : part.value
    ))
    .join('');
}

/** Format an ISO date string as 'DD MMMM YYYY' in the locale. */
function formatLongDate(value, lang) {
  return parseDateValue(value).toLocaleDateString(getLocale(lang), {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

module.exports = {
  getLocale,
  formatAmount,
  formatCurrency,
  formatMonthLabel,
  parseDateValue,
  formatShortDate,
  formatLongDate,
};
