import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
    encodeYayoiCsvContent,
    FORMATTERS,
    generateCsvContent,
    generateYayoiCsvContent,
    validateYayoiExport,
    YayoiEncodingError
} from '@/lib/receipt-export-utils';
import { validateYayoiReceipts } from '@/lib/receipt-export-validation';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const data = await request.json().catch(() => ({}));
        const monthString = data?.month;
        const formatKey = data?.format || 'default';
        const isYayoi = formatKey === 'yayoi';

        const formatter = FORMATTERS[formatKey] || FORMATTERS.default;

        // 確定済みの領収書のみ対象
        const whereClause: any = {
            status: 'CONFIRMED'
        };

        // 月指定フィルター YYYY-MM
        if (monthString && monthString.length === 7) {
            const year = parseInt(monthString.split('-')[0]);
            const monthIndex = parseInt(monthString.split('-')[1]) - 1;

            const firstDay = new Date(year, monthIndex, 1);
            const lastDay = new Date(
                year,
                monthIndex + 1,
                0,
                23,
                59,
                59
            );

            whereClause.receiptDate = {
                gte: firstDay,
                lte: lastDay
            };
        }

        const receipts = await prisma.receipt.findMany({
            where: whereClause,
            include: {
                createdBy: {
                    include: {
                        location: true
                    }
                }
            },
            orderBy: {
                receiptDate: 'asc'
            }
        });

        if (receipts.length === 0) {
            return NextResponse.json(
                {
                    error: '対象の確定済データがありません。'
                },
                { status: 400 }
            );
        }

        if (isYayoi) {
            const requiredValidation = validateYayoiReceipts(receipts);
            if (!requiredValidation.isValid) {
                return NextResponse.json({
                    error: '弥生CSVを出力できません。入力内容を確認してください。',
                    ...requiredValidation
                }, { status: 422 });
            }

            const formatIssues = validateYayoiExport(receipts);
            if (formatIssues.length > 0) {
                return NextResponse.json({
                    error: '未確認の税区分・支払方法、または弥生形式にできない日付が含まれています。',
                    formatIssues
                }, { status: 422 });
            }
        }

        const csvContent = isYayoi
            ? generateYayoiCsvContent(receipts)
            : generateCsvContent(receipts, formatter);

        let responseBody: Buffer;
        if (isYayoi) {
            try {
                responseBody = encodeYayoiCsvContent(csvContent);
            } catch (error) {
                if (error instanceof YayoiEncodingError) {
                    return NextResponse.json({ error: error.message }, { status: 422 });
                }
                throw error;
            }
        } else {
            const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
            responseBody = Buffer.concat([bom, Buffer.from(csvContent)]);
        }

        const extension = isYayoi ? 'txt' : 'csv';
        const filename = `${formatter.filenamePrefix}_${monthString || new Date().toISOString().split('T')[0]}.${extension}`;

        const exportedIds = receipts
            .map((receipt: any) => receipt.id)
            .join(',');

        // CSV生成だけを行い、ここではステータスを更新しない
        return new NextResponse(
            new Uint8Array(responseBody),
            {
                headers: {
                    'Content-Type': isYayoi
                        ? 'text/plain; charset=Shift_JIS'
                        : 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'X-Export-Count': receipts.length.toString(),
                    'X-Exported-Ids': exportedIds
                }
            }
        );
    } catch (error: any) {
        console.error('CSV Export Error:', error);

        return NextResponse.json(
            {
                error: '内部サーバーエラーが発生しました。'
            },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
