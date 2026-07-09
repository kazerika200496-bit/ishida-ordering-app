export const CATEGORY_MAP: Record<string, string> = {
    '伝票・書類': '書類伝票(店舗用)',
    '書類・伝票': '書類伝票(店舗用)',
    'ハンガー類': 'ハンガー',
    '包装資材': '包装・梱包',
    '看板・ボード': '看板・POP',
    'その他（店舗）': 'その他',
    '機械メンテナンス': 'その他',
};

/**
 * カテゴリ名を統一・正規化します。
 */
export function normalizeCategory(category: string): string {
    return CATEGORY_MAP[category] || category;
}

