import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    // DATABASE_URL がない場合はビルド時とみなして空配列を返す
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        return NextResponse.json([]);
    }
    const items = await prisma.item.findMany();
    return NextResponse.json(items);
}

export async function PATCH(request: Request) {
    try {
        const { id, ...data } = await request.json();
        const item = await prisma.item.update({
            where: { id },
            data,
        });
        return NextResponse.json(item);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }
}
