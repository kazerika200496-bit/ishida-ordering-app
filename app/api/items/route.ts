import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
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
