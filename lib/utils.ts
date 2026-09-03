/**
 * 店舗名から「パステルクリーニング」「いしだクリーニング」および直後・先頭に残るアンダースコア(_)や空白を除去して短縮表示名を返す
 */
export function formatLocationName(name: string | null | undefined): string {
    if (!name) return '';
    return name
        .replace(/^(パステルクリーニング|いしだクリーニング)[\s_]*/, '')
        .replace(/^[\s_]+/, '')
        .trim();
}
