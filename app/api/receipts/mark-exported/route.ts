import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        // 1. 認証・権限チェック (管理者権限が必要)
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
        }
        if (session.role !== 'admin') {
            return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const rawIds = Array.isArray(body?.ids) ? body.ids : [];
        const ids = rawIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0);

        // 4. 空配列や不正なIDは安全に処理し、更新せず0件として正常返却
        if (ids.length === 0) {
            return NextResponse.json({
                success: true,
                updatedCount: 0,
                message: '更新対象の領収書IDが送信されなかったため、更新を行いませんでした。'
            });
        }

        // 2 & 3. 渡されたIDかつ「確定済(CONFIRMED)」の領収書のみを厳格に更新
        const result = await prisma.receipt.updateMany({
            where: {
                id: { in: ids },
                status: 'CONFIRMED'
            },
            data: { status: 'EXPORT_READY' }
        });

        return NextResponse.json({
            success: true,
            updatedCount: result.count,
            message: `${result.count} 件の領収書を「出力済」に変更しました。`
        });
    } catch (error: any) {
        console.error('Mark Exported Error:', error);
        return NextResponse.json({ error: 'ステータスの更新に失敗しました。' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
