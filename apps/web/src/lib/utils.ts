// Re-exported from the shared package — single source of truth.
export { formatCurrency } from '@safed/shared/locale';

export const getCategoryIcon = (_tag: string) => {
    // Only a generic fallback. User choices are stored in the DB.
    return '💳';
};
