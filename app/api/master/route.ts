import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const items = await prisma.item.findMany();
        const locations = await prisma.location.findMany();
        const suppliers = await prisma.supplier.findMany();

        return NextResponse.json({ items, locations, suppliers });
    } catch (error) {
        console.error('Failed to fetch master data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
