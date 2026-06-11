import { Receipt } from '@prisma/client';

export interface ExportFormatter {
    id: string;
    label: string;
    filenamePrefix: string;
    headers: string[];
    mapRow: (receipt: Receipt) => (string | number)[];
}

/**
 * 既存の独自形式（デフォルト）
 */
export const DEFAULT_FORMATTER: ExportFormatter = {
    id: 'default',
    label: '標準CSV',
    filenamePrefix: 'receipts_export',
    headers: [
        '日付',
        '伝票No.',
        '勘定科目コード',
        '勘定科目',
        '補助科目',
        '支払い先',
        '摘要',
        '税区分',
        '金額',
        '消費税額',
        '登録者',
        '店舗/拠点',
        '元画像'
    ],
    mapRow: (r: any) => {
        const dateStr = r.receiptDate ? new Date(r.receiptDate).toISOString().split('T')[0] : '';
        const slipNo = r.slipNo || '';
        const accountCode = r.accountCode || '';
        const accountName = r.accountName || '';
        const subAccount = r.subAccount || '';
        const payee = r.payee || '';
        const description = r.description || '';
        const taxCategory = r.taxCategory || '';
        const amount = r.amount || 0;
        const taxAmount = r.taxAmount || 0;
        const userName = r.createdBy?.username || '';
        const locationName = r.createdBy?.location?.name || '';
        const imageInfo = r.imageUrl && r.imageUrl.startsWith('data:image') ? 'Base64画像保存済' : (r.imageUrl || '');

        return [
            dateStr,
            slipNo,
            accountCode,
            accountName,
            subAccount,
            payee,
            description,
            taxCategory,
            amount,
            taxAmount,
            userName,
            locationName,
            imageInfo
        ];
    }
};

/**
 * 弥生会計形式（将来用プレースホルダー）
 * 正式な雛形が判明次第、headers と mapRow を修正する
 */
export const YAYOI_FORMATTER: ExportFormatter = {
    id: 'yayoi',
    label: '弥生会計形式',
    filenamePrefix: 'yayoi_export',
    headers: [
        // TODO: 正式な列名をここに定義する
        '識別フラグ',
        '日付',
        '借方勘定科目',
        '借方補助科目',
        '借方税区分',
        '借方金額',
        '借方消費税額',
        '貸方勘定科目',
        '摘要'
    ],
    mapRow: (r: any) => {
        // TODO: 正式な変換ルールをここに定義する
        return [
            '2000', // 仮
            r.receiptDate ? new Date(r.receiptDate).toISOString().split('T')[0] : '',
            r.accountName || '',
            r.subAccount || '',
            r.taxCategory || '',
            r.amount || 0,
            r.taxAmount || 0,
            '現金', // 仮
            r.description || ''
        ];
    }
};

export const FORMATTERS: Record<string, ExportFormatter> = {
    default: DEFAULT_FORMATTER,
    yayoi: YAYOI_FORMATTER,
};

/**
 * CSV文字列を生成する共通関数
 */
export function generateCsvContent(receipts: Receipt[], formatter: ExportFormatter): string {
    const headerRow = formatter.headers.join(',');
    const dataRows = receipts.map(r => {
        return formatter.mapRow(r).map((val, index) => {
            // 数値はクオートしない
            if (typeof val === 'number') return String(val);
            
            // 既存の標準形式(default)の1列目(日付)は、互換性のためクオートしない
            if (formatter.id === 'default' && index === 0) return String(val ?? '');

            // それ以外はクオートしてエスケープする
            const str = String(val ?? '');
            return `"${str.replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
}
