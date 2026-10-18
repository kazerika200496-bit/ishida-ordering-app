import { Receipt } from '@prisma/client';
import iconv from 'iconv-lite';

export interface ExportFormatter {
    id: string;
    label: string;
    filenamePrefix: string;
    includeHeader?: boolean;
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
    includeHeader: true,
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
 * 弥生会計の取引日付を元号形式で出力する。
 */
export function formatDateForYayoi(dateInput: Date | string | null | undefined): string {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    if (d.getTime() < Date.UTC(2019, 4, 1)) return '';
    const year = d.getUTCFullYear();
    const eraYear = String(year - 2018).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `R.${eraYear}/${month}/${day}`;
}

export interface YayoiExportIssue {
    receiptId: string;
    reasons: string[];
}

export class YayoiEncodingError extends Error {
    constructor() {
        super('弥生CSVにShift_JIS（CP932）で表現できない文字が含まれています。');
        this.name = 'YayoiEncodingError';
    }
}

const YAYOI_TAX_CATEGORY_MAP = new Map([
    ['課税仕入10%', '課対仕入込10%適格'],
]);

const YAYOI_CREDIT_ACCOUNT_MAP = new Map([
    ['現金', '現金'],
]);

/**
 * 現在の実機確認済み組み合わせ以外は弥生出力を止める。
 */
export function validateYayoiExport(receipts: Receipt[]): YayoiExportIssue[] {
    return receipts.flatMap(receipt => {
        const reasons: string[] = [];
        if (!YAYOI_TAX_CATEGORY_MAP.has(receipt.taxCategory || '')) {
            reasons.push(`未対応の税区分: ${receipt.taxCategory || '未設定'}`);
        }
        if (!YAYOI_CREDIT_ACCOUNT_MAP.has(receipt.paymentMethod || '')) {
            reasons.push(`未対応の支払方法: ${receipt.paymentMethod || '未設定'}`);
        }
        if (!formatDateForYayoi(receipt.receiptDate)) {
            reasons.push('取引日付を弥生形式に変換できません。');
        }
        return reasons.length > 0 ? [{ receiptId: receipt.id, reasons }] : [];
    });
}

export const YAYOI_FORMATTER: ExportFormatter = {
    id: 'yayoi',
    label: '弥生会計形式',
    filenamePrefix: 'yayoi_export',
    includeHeader: false,
    headers: [
        '識別フラグ',    // 1
        '伝票番号',      // 2
        '決算',          // 3
        '取引日付',      // 4
        '借方勘定科目',  // 5
        '借方補助科目',  // 6
        '借方部門',      // 7
        '借方税区分',    // 8
        '借方金額',      // 9
        '借方税額',      // 10
        '貸方勘定科目',  // 11
        '貸方補助科目',  // 12
        '貸方部門',      // 13
        '貸方税区分',    // 14
        '貸方金額',      // 15
        '貸方税額',      // 16
        '摘要',          // 17
        '番号',          // 18
        '期日',          // 19
        'タイプ',        // 20
        '生成元',        // 21
        '仕訳メモ',      // 22
        '付箋1',         // 23
        '付箋2',         // 24
        '調整'           // 25
    ],
    mapRow: (r: any) => {
        const flag = '2000'; // 1. 識別フラグ (通常仕訳: 2000)
        const slipNo = r.slipNo || ''; // 2. 未設定時は弥生側の自動採番に任せる
        const settlement = ''; // 3. 決算 (空欄)
        const dateStr = formatDateForYayoi(r.receiptDate); // 4. 取引日付
        const debitAccount = r.accountName || ''; // 5. 借方勘定科目
        const debitSubAccount = r.subAccount || ''; // 6. 借方補助科目
        const debitDepartment = ''; // 7. 借方部門
        const debitTaxCategory = YAYOI_TAX_CATEGORY_MAP.get(r.taxCategory || '') || ''; // 8. 借方税区分
        const debitAmount = typeof r.amount === 'number' ? r.amount : 0; // 9. 借方金額
        const debitTaxAmount = 0; // 10. 借方税額

        // 11-12. 貸方勘定科目・補助科目
        const creditAccount = YAYOI_CREDIT_ACCOUNT_MAP.get(r.paymentMethod || '') || '';
        const creditSubAccount = '';

        const creditDepartment = ''; // 13. 貸方部門
        const creditTaxCategory = '対象外'; // 14. 貸方税区分
        const creditAmount = debitAmount; // 15. 貸方金額
        const creditTaxAmount = 0; // 16. 貸方税額
        const description = r.description || r.payee || ''; // 17. 摘要

        const numberField = ''; // 18. 番号
        const dueDate = ''; // 19. 期日
        const typeField = 0; // 20. タイプ
        const originField = ''; // 21. 生成元
        const journalMemo = ''; // 22. 仕訳メモ
        const tag1 = '0'; // 23. 付箋1
        const tag2 = '0'; // 24. 付箋2
        const adjustment = 'no'; // 25. 調整

        return [
            flag,
            slipNo,
            settlement,
            dateStr,
            debitAccount,
            debitSubAccount,
            debitDepartment,
            debitTaxCategory,
            debitAmount,
            debitTaxAmount,
            creditAccount,
            creditSubAccount,
            creditDepartment,
            creditTaxCategory,
            creditAmount,
            creditTaxAmount,
            description,
            numberField,
            dueDate,
            typeField,
            originField,
            journalMemo,
            tag1,
            tag2,
            adjustment
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
    const rows: string[] = [];
    if (formatter.includeHeader !== false) {
        rows.push(formatter.headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
    }
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

    return [...rows, ...dataRows].join('\n');
}

export function generateYayoiCsvContent(receipts: Receipt[]): string {
    const rows = receipts.map(receipt => YAYOI_FORMATTER.mapRow(receipt)
        .map((value, index) => {
            if (typeof value === 'number') return String(value);

            const text = String(value ?? '');
            if (index === 1 && text === '') return '';
            if (index === 1 && /^\d+$/.test(text)) return text;
            return `"${text.replace(/"/g, '""')}"`;
        })
        .join(','));

    return `${rows.join('\r\n')}\r\n`;
}

export function encodeYayoiCsvContent(csv: string): Buffer {
    const encoded = iconv.encode(csv, 'cp932');
    if (iconv.decode(encoded, 'cp932') !== csv) {
        throw new YayoiEncodingError();
    }
    return Buffer.from(encoded);
}
