// ── Currency utilities ─────────────────────────────────────────────────────
// Pure functions — no platform dependencies. Works in Next.js and React Native.

// ~155 ISO 4217 currencies supported. Dollar (USD) is the conversion base.
const SUPPORTED_CURRENCIES = [
  // G10 & major
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK',
  // Latin America
  'ARS', 'BRL', 'MXN', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB',
  'CRC', 'GTQ', 'HNL', 'NIO', 'PAB', 'DOP', 'JMD', 'TTD', 'GYD', 'SRD',
  'BBD', 'BSD', 'BMD', 'KYD', 'AWG', 'ANG', 'CUP', 'HTG', 'BZD',
  // Europe
  'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RSD', 'MKD', 'ALL', 'BAM',
  'MDL', 'ISK', 'UAH', 'RUB', 'BYN', 'GEL', 'AMD', 'AZN',
  // Middle East
  'ILS', 'AED', 'SAR', 'KWD', 'BHD', 'QAR', 'OMR', 'JOD', 'TRY', 'IQD',
  'LBP', 'YER',
  // Asia
  'CNY', 'HKD', 'TWD', 'KRW', 'SGD', 'MYR', 'THB', 'PHP', 'IDR', 'VND',
  'INR', 'PKR', 'BDT', 'LKR', 'NPR', 'KHR', 'MMK', 'LAK', 'BTN', 'MVR',
  'KZT', 'UZS', 'TJS', 'TMT', 'KGS', 'MOP', 'MNT',
  // Oceania
  'FJD', 'PGK', 'SBD', 'TOP', 'VUV', 'WST', 'XPF',
  // Africa
  'ZAR', 'NGN', 'KES', 'GHS', 'EGP', 'MAD', 'TND', 'DZD', 'ETB', 'TZS',
  'UGX', 'ZMW', 'RWF', 'MZN', 'AOA', 'MWK', 'NAD', 'BWP', 'MUR', 'SCR',
  'GMD', 'SLL', 'SDG', 'MGA', 'CVE', 'DJF', 'KMF', 'CDF', 'SOS', 'LYD',
  'XOF', 'XAF', 'XCD', 'ERN', 'STN',
];

const CURRENCY_NAME_OVERRIDES_ES = Object.freeze({
  USD: 'dólar estadounidense',
  EUR: 'euro',
  GBP: 'libra esterlina',
  JPY: 'yen japonés',
  CHF: 'franco suizo',
  CAD: 'dólar canadiense',
  AUD: 'dólar australiano',
  NZD: 'dólar neozelandés',
  SEK: 'corona sueca',
  NOK: 'corona noruega',
  DKK: 'corona danesa',
  ARS: 'peso argentino',
  BRL: 'real brasileño',
  MXN: 'peso mexicano',
  CLP: 'peso chileno',
  COP: 'peso colombiano',
  PEN: 'sol peruano',
  UYU: 'peso uruguayo',
  PYG: 'guaraní paraguayo',
  BOB: 'boliviano',
  CRC: 'colón costarricense',
  GTQ: 'quetzal guatemalteco',
  HNL: 'lempira hondureño',
  NIO: 'córdoba oro',
  PAB: 'balboa panameño',
  DOP: 'peso dominicano',
  JMD: 'dólar jamaicano',
  TTD: 'dólar de Trinidad y Tobago',
  GYD: 'dólar guyanés',
  SRD: 'dólar surinamés',
  BBD: 'dólar barbadense',
  BSD: 'dólar bahameño',
  BMD: 'dólar bermudeño',
  KYD: 'dólar de las Islas Caimán',
  AWG: 'florín arubeño',
  ANG: 'florín antillano',
  CUP: 'peso cubano',
  HTG: 'gurde haitiano',
  BZD: 'dólar beliceño',
  PLN: 'esloti polaco',
  CZK: 'corona checa',
  HUF: 'forinto húngaro',
  RON: 'leu rumano',
  BGN: 'leva búlgara',
  HRK: 'kuna croata',
  RSD: 'dinar serbio',
  MKD: 'dinar macedonio',
  ALL: 'lek albanés',
  BAM: 'marco convertible de Bosnia y Herzegovina',
  MDL: 'leu moldavo',
  ISK: 'corona islandesa',
  UAH: 'grivna ucraniana',
  RUB: 'rublo ruso',
  BYN: 'rublo bielorruso',
  GEL: 'lari georgiano',
  AMD: 'dram armenio',
  AZN: 'manat azerbaiyano',
  ILS: 'nuevo shekel israelí',
  AED: 'dírham de los Emiratos Árabes Unidos',
  SAR: 'rial saudí',
  KWD: 'dinar kuwaití',
  BHD: 'dinar bareiní',
  QAR: 'rial catarí',
  OMR: 'rial omaní',
  JOD: 'dinar jordano',
  TRY: 'lira turca',
  IQD: 'dinar iraquí',
  LBP: 'libra libanesa',
  YER: 'rial yemení',
  CNY: 'yuan renminbi',
  HKD: 'dólar hongkonés',
  TWD: 'nuevo dólar taiwanés',
  KRW: 'won surcoreano',
  SGD: 'dólar singapurense',
  MYR: 'ringit malasio',
  THB: 'bat tailandés',
  PHP: 'peso filipino',
  IDR: 'rupia indonesia',
  VND: 'dong vietnamita',
  INR: 'rupia india',
  PKR: 'rupia pakistaní',
  BDT: 'taka bangladesí',
  LKR: 'rupia esrilanquesa',
  NPR: 'rupia nepalí',
  KHR: 'riel camboyano',
  MMK: 'kiat de Myanmar',
  LAK: 'kip laosiano',
  BTN: 'gultrum butanés',
  MVR: 'rufiya maldiva',
  KZT: 'tengue kazajo',
  UZS: 'sum uzbeko',
  TJS: 'somoni tayiko',
  TMT: 'manat turcomano',
  KGS: 'som kirguís',
  MOP: 'pataca macaense',
  MNT: 'tugrik mongol',
  FJD: 'dólar fiyiano',
  PGK: 'kina papú',
  SBD: 'dólar salomonense',
  TOP: 'paanga tongano',
  VUV: 'vatu vanuatense',
  WST: 'tala samoano',
  XPF: 'franco CFP',
  ZAR: 'rand sudafricano',
  NGN: 'naira nigeriano',
  KES: 'chelín keniano',
  GHS: 'cedi ghanés',
  EGP: 'libra egipcia',
  MAD: 'dírham marroquí',
  TND: 'dinar tunecino',
  DZD: 'dinar argelino',
  ETB: 'bir etíope',
  TZS: 'chelín tanzano',
  UGX: 'chelín ugandés',
  ZMW: 'kuacha zambiano',
  RWF: 'franco ruandés',
  MZN: 'metical mozambiqueño',
  AOA: 'kuanza angoleño',
  MWK: 'kuacha malauí',
  NAD: 'dólar namibio',
  BWP: 'pula botsuano',
  MUR: 'rupia mauriciana',
  SCR: 'rupia seychellense',
  GMD: 'dalasi gambiano',
  SLL: 'leona sierraleonesa',
  SDG: 'libra sudanesa',
  MGA: 'ariari malgache',
  CVE: 'escudo de Cabo Verde',
  DJF: 'franco yibutiano',
  KMF: 'franco comorense',
  CDF: 'franco congoleño',
  SOS: 'chelín somalí',
  LYD: 'dinar libio',
  XOF: 'franco CFA de África Occidental',
  XAF: 'franco CFA de África Central',
  XCD: 'dólar del Caribe Oriental',
  ERN: 'nakfa eritreo',
  STN: 'dobra santotomense',
});

const CURRENCY_NAME_OVERRIDES_EN = Object.freeze({
  USD: 'us dollar',
  EUR: 'euro',
  GBP: 'pound sterling',
  JPY: 'japanese yen',
  CHF: 'swiss franc',
  CAD: 'canadian dollar',
  AUD: 'australian dollar',
  NZD: 'new zealand dollar',
  ARS: 'argentine peso',
  BRL: 'brazilian real',
  MXN: 'mexican peso',
  CLP: 'chilean peso',
  COP: 'colombian peso',
  PEN: 'peruvian sol',
  UYU: 'uruguayan peso',
  ILS: 'israeli new shekel',
  ALL: 'albanian lek',
  XOF: 'west african cfa franc',
  XAF: 'central african cfa franc',
  XCD: 'east caribbean dollar',
  XPF: 'cfp franc',
});

const CURRENCY_SYMBOL_OVERRIDES = Object.freeze({
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'Fr',
  CAD: 'C$',
  AUD: 'A$',
  NZD: 'NZ$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  ARS: '$',
  BRL: 'R$',
  MXN: '$',
  CLP: '$',
  COP: '$',
  PEN: 'S/',
  UYU: '$U',
  PYG: '₲',
  BOB: 'Bs',
  CRC: '₡',
  GTQ: 'Q',
  HNL: 'L',
  NIO: 'C$',
  PAB: 'B/.',
  DOP: 'RD$',
  JMD: 'J$',
  TTD: 'TT$',
  GYD: 'G$',
  SRD: 'SRD$',
  BBD: 'Bds$',
  BSD: 'B$',
  BMD: 'BD$',
  KYD: 'CI$',
  AWG: 'Afl',
  ANG: 'NAf',
  CUP: '₱',
  HTG: 'G',
  BZD: 'BZ$',
  PLN: 'zl',
  CZK: 'Kc',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'lv',
  HRK: 'kn',
  RSD: 'din',
  MKD: 'den',
  ALL: 'L',
  BAM: 'KM',
  MDL: 'L',
  ISK: 'kr',
  UAH: '₴',
  RUB: '₽',
  BYN: 'Br',
  GEL: '₾',
  AMD: '֏',
  AZN: '₼',
  ILS: '₪',
  AED: 'د.إ',
  SAR: 'ر.س',
  KWD: 'د.ك',
  BHD: 'د.ب',
  QAR: 'ر.ق',
  OMR: 'ر.ع.',
  JOD: 'د.ا',
  TRY: '₺',
  IQD: 'ع.د',
  LBP: 'ل.ل',
  YER: '﷼',
  CNY: '¥',
  HKD: 'HK$',
  TWD: 'NT$',
  KRW: '₩',
  SGD: 'S$',
  MYR: 'RM',
  THB: '฿',
  PHP: '₱',
  IDR: 'Rp',
  VND: '₫',
  INR: '₹',
  PKR: '₨',
  BDT: '৳',
  LKR: 'Rs',
  NPR: 'रु',
  KHR: '៛',
  MMK: 'K',
  LAK: '₭',
  BTN: 'Nu.',
  MVR: 'Rf',
  KZT: '₸',
  UZS: "so'm",
  TJS: 'ЅМ',
  TMT: 'm',
  KGS: 'som',
  MOP: 'MOP$',
  MNT: '₮',
  FJD: 'FJ$',
  PGK: 'K',
  SBD: 'SI$',
  TOP: 'T$',
  VUV: 'VT',
  WST: 'WS$',
  XPF: '₣',
  ZAR: 'R',
  NGN: '₦',
  KES: 'KSh',
  GHS: 'GH₵',
  EGP: 'E£',
  MAD: 'DH',
  TND: 'DT',
  DZD: 'DA',
  ETB: 'Br',
  TZS: 'TSh',
  UGX: 'USh',
  ZMW: 'ZK',
  RWF: 'FRw',
  MZN: 'MT',
  AOA: 'Kz',
  MWK: 'MK',
  NAD: 'N$',
  BWP: 'P',
  MUR: '₨',
  SCR: '₨',
  GMD: 'D',
  SLL: 'Le',
  SDG: '£',
  MGA: 'Ar',
  CVE: 'CVE$',
  DJF: 'Fdj',
  KMF: 'CF',
  CDF: 'FC',
  SOS: 'Sh',
  LYD: 'LD',
  XOF: 'CFA',
  XAF: 'FCFA',
  XCD: 'EC$',
  ERN: 'Nfk',
  STN: 'Db',
});

function normalizeCurrencyName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Returns the display symbol for a currency using the Intl API.
 * Falls back to the currency code when Intl is unavailable.
 */
function getCurrencySymbol(currency) {
  const normalizedCode = String(currency || '').toUpperCase();
  const override = CURRENCY_SYMBOL_OVERRIDES[normalizedCode];
  if (override) {
    return override;
  }

  try {
    const formatted = (0).toLocaleString('en', {
      style: 'currency',
      currency: normalizedCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const symbol = formatted.replace(/[\d,.\s]/g, '').trim();
    return symbol || normalizedCode;
  } catch {
    return normalizedCode;
  }
}

function getCurrencyName(currency, lang = 'es') {
  const normalizedCode = String(currency || '').toUpperCase();
  const normalizedLang = String(lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  const override = normalizedLang === 'en'
    ? CURRENCY_NAME_OVERRIDES_EN[normalizedCode]
    : CURRENCY_NAME_OVERRIDES_ES[normalizedCode];

  if (override) {
    return override;
  }

  try {
    const dn = new Intl.DisplayNames([normalizedLang, 'en'], { type: 'currency' });
    const resolvedName = dn.of(normalizedCode);
    const normalizedName = normalizeCurrencyName(resolvedName || normalizedCode);
    if (normalizedName && normalizedName !== normalizeCurrencyName(normalizedCode)) {
      return normalizedName;
    }
  } catch {
    // Fall through to the static Spanish dataset below.
  }

  return CURRENCY_NAME_OVERRIDES_ES[normalizedCode] || normalizedCode;
}

function getCurrencyMetadata(currency, lang = 'es') {
  const normalizedCode = String(currency || '').toUpperCase();
  return {
    code: normalizedCode,
    symbol: getCurrencySymbol(normalizedCode),
    name: getCurrencyName(normalizedCode, lang),
  };
}

const CURRENCY_METADATA = Object.freeze(
  SUPPORTED_CURRENCIES.map((code) => Object.freeze(getCurrencyMetadata(code, 'es')))
);

const CURRENCY_METADATA_BY_CODE = Object.freeze(
  CURRENCY_METADATA.reduce((accumulator, item) => {
    accumulator[item.code] = item;
    return accumulator;
  }, {})
);

/**
 * Returns a beautifully formatted label for a currency:
 * Example: ILS: Shekel ₪
 */
function getCurrencyLabel(currency, lang = 'es') {
  const meta = getCurrencyMetadata(currency, lang);
  return `${meta.code}: ${capitalize(meta.name)} ${meta.symbol === meta.code ? '' : meta.symbol}`.trim();
}

/**
 * Returns the transaction amount in the requested currency.
 * For the four stored columns (USD/ARS/ILS/EUR) uses the DB value directly.
 * For any other currency, converts from amountUSD using the provided snapshot.
 * Falls back to the base `amount` field (ILS) when no snapshot is available.
 */
function getTransactionAmount(tx, currency, snapshot) {
  if (currency === 'USD' && tx.amountUSD != null) return tx.amountUSD;
  if (currency === 'ARS' && tx.amountARS != null) return tx.amountARS;
  if (currency === 'EUR' && tx.amountEUR != null) return tx.amountEUR;
  if (currency === 'ILS' && tx.amountILS != null) return tx.amountILS;
  // Extended currencies — convert from stored USD amount using snapshot rates
  if (tx.amountUSD != null && snapshot && snapshot.rates) {
    const rate = snapshot.rates[currency];
    if (Number.isFinite(rate) && rate > 0) return tx.amountUSD * rate;
  }
  return tx.amount;
}

/**
 * Converts an amount from one currency to another using the given snapshot.
 * All conversions go through USD as the base.
 */
function convertAmount(amount, from, to, snapshot) {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const fromRate = snapshot.rates[from];
  const toRate = snapshot.rates[to];
  if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
    return amount;
  }
  return (amount / fromRate) * toRate;
}

/**
 * Builds the amountXXX fields for all currencies given an input amount,
 * its currency, and a snapshot. Does NOT call any storage — pass the snapshot.
 */
function buildStoredAmountsFromSnapshot(amount, currency, snapshot) {
  let amountUSD;
  if (currency === 'USD') {
    amountUSD = amount;
  } else {
    const rate = snapshot.rates[currency];
    amountUSD = Number.isFinite(rate) && rate > 0 ? amount / rate : amount;
  }

  return {
    amount: amountUSD * (snapshot.rates.ILS ?? 1), // base column stored in ILS
    amountUSD,
    amountARS: amountUSD * (snapshot.rates.ARS ?? 0),
    amountILS: amountUSD * (snapshot.rates.ILS ?? 1),
    amountEUR: amountUSD * (snapshot.rates.EUR ?? 1),
  };
}

module.exports = {
  SUPPORTED_CURRENCIES,
  CURRENCY_METADATA,
  CURRENCY_METADATA_BY_CODE,
  getCurrencySymbol,
  getCurrencyName,
  getCurrencyMetadata,
  getCurrencyLabel,
  getTransactionAmount,
  convertAmount,
  buildStoredAmountsFromSnapshot,
};
