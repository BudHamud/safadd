// ── Category utilities ─────────────────────────────────────────────────────
// Pure functions — no platform dependencies. Works in Next.js and React Native.

/**
 * Normalizes a category tag to a canonical uppercase, accent-stripped form.
 * Used for comparison and storage keys.
 */
function normalizeTag(value) {
  return value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Derives a deterministic hue-based color from a tag string.
 * Returns an HSL string.
 */
function tagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 55%, 55%)`;
}

/**
 * Merges base and custom category lists, filtering hidden ones,
 * and deduplicating by normalized tag. Returns sorted by name.
 */
function mergeCategories(baseCategories, customCategories, hiddenCategories) {
  const hiddenSet = new Set(hiddenCategories.map(normalizeTag));
  const categoryMap = new Map();

  [...baseCategories, ...customCategories].forEach(cat => {
    const normalized = normalizeTag(cat.name);
    if (hiddenSet.has(normalized)) return;
    if (!categoryMap.has(normalized)) categoryMap.set(normalized, cat);
  });

  return Array.from(categoryMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

module.exports = { normalizeTag, tagColor, mergeCategories };
