import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    // DATABASE_URL がない場合はビルド時とみなして空配列を返す
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        return NextResponse.json([]);
    }
    const items = await prisma.item.findMany();

    const session = await getSession();
    if (session?.role === 'store') {
        return NextResponse.json(items.map(item => ({ ...item, price: null })));
    }

    return NextResponse.json(items);
}

export async function PATCH(request: Request) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    try {
        const { id, ...data } = await request.json();
        
        if (data.imageUrl && data.imageUrl.startsWith('data:')) {
            return NextResponse.json(
                { error: '画像の保存に失敗しました。画像データが正しい形式(URL)ではありません。画像をもう一度選択・撮影し直してください。' },
                { status: 400 }
            );
        }

        if (!data.name || data.name.trim() === '') {
            return NextResponse.json({ error: '品目名は必須です。' }, { status: 400 });
        }

        // Ensure new IDs are created properly if they come from the frontend as 'new-...'
        const isNew = id.startsWith('new-');
        const finalId = isNew ? `item-${Date.now()}-${Math.floor(Math.random() * 1000)}` : id;

        // Process materialCode
        let materialCode = data.materialCode;
        if (typeof materialCode === 'string') {
            materialCode = materialCode.trim();
        }
        
        // If empty or null, default to finalId as requested
        if (!materialCode) {
            materialCode = finalId;
        }
        data.materialCode = materialCode;

        // Validate materialCode uniqueness
        if (materialCode !== null) {
            const existing = await prisma.item.findFirst({
                where: {
                    materialCode: materialCode,
                    id: { not: finalId }
                }
            });
            if (existing) {
                return NextResponse.json({ 
                    error: `この資材IDはすでに使用されています。別の資材IDを入力してください。 (登録済みの品目: ${existing.name})` 
                }, { status: 400 });
            }
        }

        const item = await prisma.item.upsert({
            where: { id: finalId },
            update: data,
            create: {
                id: finalId,
                ...data
            }
        });
        return NextResponse.json(item);
    } catch (error: any) {
        console.error('Item update error:', error);
        return NextResponse.json({ error: error?.message || 'Failed to update item' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        
        await prisma.item.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Item delete error:', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
