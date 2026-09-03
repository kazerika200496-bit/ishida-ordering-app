import { Receipt } from '@prisma/client';

export const YAYOI_REQUIRED_FIELDS = [
    'receiptDate',
    'amount',
    'accountName',
    'taxCategory',
    'paymentMethod'
] as const;

export type YayoiRequiredField = typeof YAYOI_REQUIRED_FIELDS[number];

export const YAYOI_REQUIRED_FIELD_LABELS: Record<YayoiRequiredField, string> = {
    receiptDate: '日付',
    amount: '金額',
    accountName: '勘定科目',
    taxCategory: '税区分',
    paymentMethod: '支払方法'
};

export interface InvalidReceipt {
    id: string;
    missingFields: YayoiRequiredField[];
}

export interface YayoiValidationResult {
    isValid: boolean;
    invalidReceiptCount: number;
    missingCounts: Partial<Record<YayoiRequiredField, number>>;
    invalidReceipts: InvalidReceipt[];
}

function isBlank(value: unknown): boolean {
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function isMissing(receipt: Receipt, field: YayoiRequiredField): boolean {
    if (field === 'amount') return receipt.amount === null || receipt.amount === 0;
    return isBlank(receipt[field]);
}

export function validateYayoiReceipts(receipts: Receipt[]): YayoiValidationResult {
    const invalidReceipts = receipts.reduce<InvalidReceipt[]>((result, receipt) => {
        const missingFields = YAYOI_REQUIRED_FIELDS.filter((field) => isMissing(receipt, field));
        if (missingFields.length > 0) {
            result.push({ id: receipt.id, missingFields });
        }
        return result;
    }, []);

    const missingCounts: Partial<Record<YayoiRequiredField, number>> = {};
    for (const field of YAYOI_REQUIRED_FIELDS) {
        const count = invalidReceipts.filter((receipt) => receipt.missingFields.includes(field)).length;
        if (count > 0) missingCounts[field] = count;
    }

    return {
        isValid: invalidReceipts.length === 0,
        invalidReceiptCount: invalidReceipts.length,
        missingCounts,
        invalidReceipts
    };
}