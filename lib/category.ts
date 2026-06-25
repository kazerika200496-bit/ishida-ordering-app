export const CATEGORY_MAP: Record<string, string> = {
    '伝票・書類': '書類・伝票',
    'ハンガー類': 'ハンガー',
};

/**
 * カテゴリ名を統一・正規化します。
 * ・「伝票・書類」→「書類・伝票」
 * ・「ハンガー類」→「ハンガー」
 */
export function normalizeCategory(category: string): string {
    return CATEGORY_MAP[category] || category;
}
