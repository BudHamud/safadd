export declare function normalizeTag(value: string): string;
export declare function tagColor(tag: string): string;
export declare function mergeCategories<T extends { name: string }>(
  baseCategories: T[],
  customCategories: T[],
  hiddenCategories: string[]
): T[];
