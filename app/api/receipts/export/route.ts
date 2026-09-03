import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { FORMATTERS, generateCsvContent } from '@/lib/receipt-export-utils';
import { validateYayoiReceipts } from '@/lib/receipt-export-validation';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const data = await request.json().catch(() => ({}));
        const monthString = data?.month; // e.g. "2024-04"
        const formatKey = data?.format || 'default';
        const formatter = FORMATTERS[formatKey] || FORMATTERS.default;

        // ベース条件
        let whereClause: any = { status: 'CONFIRMED' };

        // 月指定フィルター（YYYY-MM）
        if (monthString && monthString.length === 7) {
            const year = parseInt(monthString.split('-')[0]);
            const monthIndex = parseInt(monthString.split('-')[1]) - 1; // 0-based
            const firstDay = new Date(year, monthIndex, 1);
            const lastDay = new Date(year, monthIndex + 1, 0, 23, 59, 59);

            whereClause.receiptDate = {
                gte: firstDay,
                lte: lastDay
            };
        }

        // 【重複防止】未出力かつ確定済（CONFIRMED）のものだけを対象とする
        const receipts = await prisma.receipt.findMany({
            where: whereClause,
            include: {
                createdBy: {
                    include: {
                        location: true
                    }
                }
            },
            orderBy: { receiptDate: 'asc' }
        });

        if (receipts.length === 0) {
            return NextResponse.json({ error: '対象の確定済データがありません。' }, { status: 400 });
        }

        if (formatKey === 'yayoi') {
            const validation = validateYayoiReceipts(receipts);
            if (!validation.isValid) {
                return NextResponse.json({
                    error: 'CSVを出力できません。入力内容を確認してください。',
                    ...validation
                }, { status: 422 });
            }
        }

        // CSV生成 (共通ユーティリティを使用)
        const csvContent = generateCsvContent(receipts, formatter);
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);

        // 【事故防止】出力したデータを「出力済 (EXPORT_READY)」に更新する
        await prisma.receipt.updateMany({
            where: { id: { in: receipts.map((r: any) => r.id) } },
            data: { status: 'EXPORT_READY' }
        });

        const filename = `${formatter.filenamePrefix}_${monthString || new Date().toISOString().split('T')[0]}.csv`;

        // 成功した場合はCSVのバイナリと、何件出力したかのヘッダーを返す
        return new NextResponse(Buffer.concat([bom, Buffer.from(csvContent)]), {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'X-Export-Count': receipts.length.toString()
            },
        });

    } catch (error: any) {
        console.error('CSV Export Error:', error);
        return NextResponse.json({ error: '内部サーバーエラーが発生しました。' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
