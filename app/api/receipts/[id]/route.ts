import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { del } from '@vercel/blob';

const prisma = new PrismaClient();

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. 認証チェック: ログインセッションが存在する場合のみ実行可能
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
        }

        const receiptId = params.id;

        // 2. 対象のReceiptが存在するか確認
        const receipt = await prisma.receipt.findUnique({
            where: { id: receiptId }
        });

        if (!receipt) {
            return NextResponse.json({ error: '対象の領収書が見つかりません' }, { status: 404 });
        }

        // 3. Vercel Blob上の画像を削除
        // blobPathname があり、かつ BLOB_READ_WRITE_TOKEN が設定されている場合のみ実行
        if (receipt.blobPathname && process.env.BLOB_READ_WRITE_TOKEN) {
            try {
                // @vercel/blob の del() はフルURLを受け取るため、imageUrl が http から始まる場合はそれを優先使用し、
                // そうでなければ blobPathname 自体がフルURLであると仮定して使用します。
                const deleteTarget = receipt.imageUrl?.startsWith('http')
                    ? receipt.imageUrl
                    : (receipt.blobPathname.startsWith('http') ? receipt.blobPathname : null);

                if (deleteTarget) {
                    await del(deleteTarget);
                }
            } catch (blobErr: any) {
                // Blob削除に失敗しても、DB削除は継続するためエラーは握り潰しログ出力のみとする
                console.error('Failed to delete Vercel Blob file:', blobErr);
            }
        }

        // 4. DBからレコードを削除
        await prisma.receipt.delete({
            where: { id: receiptId }
        });

        return NextResponse.json({ success: true, message: '削除しました' });

    } catch (error: any) {
        console.error('Delete API Error:', error);
        return NextResponse.json({ error: error.message || '削除に失敗しました' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
