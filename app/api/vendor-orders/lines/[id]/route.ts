import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 単一明細の操作
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const { qty, note } = await request.json();

        const line = await prisma.vendorOrderLine.update({
            where: { id },
            data: {
                qty,
                note,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(line);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update line' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        await prisma.vendorOrderLine.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete line' }, { status: 500 });
    }
}
