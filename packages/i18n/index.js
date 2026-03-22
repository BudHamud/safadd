const en = require('./en.json');
const es = require('./es.json');

const SUPPORTED_LANGS = ['es', 'en'];
const DEFAULT_LANGUAGE = 'en';
const APP_LANGUAGE_STORAGE_KEY = 'app-lang';
const DICTS = { en, es };

function normalizeLang(value) {
  if (!value) return null;

  const baseLang = String(value).toLowerCase().split('-')[0];
  if (baseLang === 'es') return 'es';
  if (baseLang === 'en') return 'en';
  return null;
}

function resolveLangFromList(languages) {
  for (const candidate of languages) {
    const supported = normalizeLang(candidate);
    if (supported) return supported;
  }

  return DEFAULT_LANGUAGE;
}

function getDictionary(lang) {
  return DICTS[lang] || DICTS[DEFAULT_LANGUAGE];
}

function translate(lang, key, params) {
  const template = getDictionary(lang)[key] ?? DICTS.es[key] ?? key;
  if (!params) return template;

  return Object.entries(params).reduce((result, [paramKey, value]) => {
    return result.replaceAll(`{${paramKey}}`, String(value));
  }, template);
}

function createTranslator(lang) {
  return (key, params) => translate(lang, key, params);
}

module.exports = {
  APP_LANGUAGE_STORAGE_KEY,
  DEFAULT_LANGUAGE,
  DICTS,
  SUPPORTED_LANGS,
  createTranslator,
  en,
  es,
  getDictionary,
  normalizeLang,
  resolveLangFromBrowserList: resolveLangFromList,
  resolveLangFromList,
  translate,
};