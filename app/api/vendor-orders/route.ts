import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const dayMap: Record<string, number> = {
    '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6
};

class OrderValidationError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

function calculateCycle(supplier: {
    cutoffDayOfWeek: string | null;
    cutoffTime: string | null;
    deliveryDayOfWeek: string | null;
}) {
    const now = new Date();
    const cutoffDay = dayMap[supplier.cutoffDayOfWeek || '月'] ?? 1;
    const [cutoffHour, cutoffMin] = (supplier.cutoffTime || '17:00').split(':').map(Number);
    const deliveryDay = dayMap[supplier.deliveryDayOfWeek || '火'] ?? 2;

    const cutoffAt = new Date(now);
    cutoffAt.setHours(cutoffHour, cutoffMin, 0, 0);

    const currentDay = now.getDay();
    let daysUntilCutoff = (cutoffDay - currentDay + 7) % 7;

    if (daysUntilCutoff === 0 && now > cutoffAt) {
        daysUntilCutoff = 7;
    }
    cutoffAt.setDate(now.getDate() + daysUntilCutoff);

    const deliveryDate = new Date(cutoffAt);
    let daysUntilDelivery = (deliveryDay - cutoffAt.getDay() + 7) % 7;
    if (daysUntilDelivery === 0) daysUntilDelivery = 1;
    deliveryDate.setDate(cutoffAt.getDate() + daysUntilDelivery);
    deliveryDate.setHours(0, 0, 0, 0);

    return { cutoffAt, deliveryDate };
}

export async function GET(request: Request) {
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        return NextResponse.json([]);
    }
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');

    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isStore = session.role === 'store';
    const storeLocationId = session.locationId as string;
    const isFactory = storeLocationId === 'F001' || storeLocationId === 'F002';

    try {
        const orders = await prisma.vendorOrder.findMany({
            where: {
                ...(vendorId && { vendorId }),
                ...(status && { status }),
                ...(isStore && !isFactory ? { lines: { some: { locationId: storeLocationId } } } : {}),
                ...(isStore && isFactory ? {
                    OR: [
                        { vendorId: storeLocationId },
                        { lines: { some: { locationId: storeLocationId } } }
                    ]
                } : {})
            },
            include: {
                lines: {
                    where: (isStore && !isFactory) && storeLocationId ? { locationId: storeLocationId } : undefined,
                    include: { item: true },
                    orderBy: { addedAt: 'asc' }
                },
                vendor: true
            },
            orderBy: []
        });

        const safeOrders = orders.map(order => ({
            ...order,
            lines: order.lines.map(line => ({
                ...line,
                price: isStore ? null : line.price
            }))
        }));

        return NextResponse.json(safeOrders);
    } catch (error) {
        console.error('Failed to fetch vendor orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json({ error: 'Invalid order request' }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;
        const vendorId = payload.vendorId;
        const locationId = session.role === 'store' ? session.locationId : payload.locationId;
        const requestedBy = session.role === 'store' ? session.username : payload.requestedBy;
        const note = payload.note;
        const inputItems = payload.items;

        if (typeof vendorId !== 'string' || !vendorId.trim()) {
            return NextResponse.json({ error: 'Vendor is required' }, { status: 400 });
        }
        if (typeof locationId !== 'string' || !locationId.trim()) {
            return NextResponse.json({ error: 'Location is required' }, { status: 400 });
        }
        if (typeof requestedBy !== 'string' || !requestedBy.trim()) {
            return NextResponse.json({ error: 'Requester is required' }, { status: 400 });
        }
        if (note !== undefined && typeof note !== 'string') {
            return NextResponse.json({ error: 'Note must be a string' }, { status: 400 });
        }
        if (!Array.isArray(inputItems) || inputItems.length === 0) {
            return NextResponse.json({ error: 'At least one order item is required' }, { status: 400 });
        }

        const items: Array<{
            itemId: string;
            itemName: string;
            qty: number;
            unit: string;
            price: number;
        }> = [];

        for (const inputItem of inputItems) {
            if (!inputItem || typeof inputItem !== 'object' || Array.isArray(inputItem)) {
                return NextResponse.json({ error: 'Invalid order item' }, { status: 400 });
            }
            const item = inputItem as Record<string, unknown>;
            if (typeof item.itemId !== 'string' || !item.itemId.trim()) {
                return NextResponse.json({ error: 'Each item must have a valid item ID' }, { status: 400 });
            }
            if (typeof item.itemName !== 'string' || !item.itemName.trim()) {
                return NextResponse.json({ error: `Item name is required for ${item.itemId}` }, { status: 400 });
            }
            if (typeof item.qty !== 'number' || !Number.isFinite(item.qty) || item.qty <= 0) {
                return NextResponse.json({ error: `Quantity must be greater than zero for ${item.itemName}` }, { status: 400 });
            }
            if (typeof item.unit !== 'string' || !item.unit.trim()) {
                return NextResponse.json({ error: `Unit is required for ${item.itemName}` }, { status: 400 });
            }
            if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0) {
                return NextResponse.json({ error: `Price must be zero or greater for ${item.itemName}` }, { status: 400 });
            }
            items.push({
                itemId: item.itemId,
                itemName: item.itemName,
                qty: item.qty,
                unit: item.unit,
                price: item.price
            });
        }

        const result = await prisma.$transaction(async transaction => {
            const [vendor, location, knownItems] = await Promise.all([
                transaction.supplier.findUnique({ where: { id: vendorId } }),
                transaction.location.findUnique({ where: { id: locationId } }),
                transaction.item.findMany({ where: { id: { in: [...new Set(items.map(item => item.itemId))] } } })
            ]);

            if (!vendor) throw new OrderValidationError('Vendor not found', 404);
            if (!location) throw new OrderValidationError('Location not found', 404);

            const knownItemIds = new Set(knownItems.map(item => item.id));
            const unknownItem = items.find(item => !knownItemIds.has(item.itemId));
            if (unknownItem) {
                throw new OrderValidationError(`Item not found: ${unknownItem.itemId}`, 400);
            }

            const { cutoffAt, deliveryDate } = calculateCycle(vendor);
            const periodStart = new Date(cutoffAt);
            periodStart.setDate(cutoffAt.getDate() - 7);

            let order = await transaction.vendorOrder.findFirst({
                where: {
                    vendorId,
                    status: 'DRAFT',
                    cutoffAt,
                    isLocked: false
                }
            });

            if (!order) {
                order = await transaction.vendorOrder.create({
                    data: {
                        id: `VORD-${Date.now()}`,
                        vendorId,
                        periodStart,
                        periodEnd: cutoffAt,
                        cutoffAt,
                        deliveryDate,
                        status: 'DRAFT'
                    }
                });
            }

            const lineResult = await transaction.vendorOrderLine.createMany({
                data: items.map(item => ({
                    orderId: order.id,
                    itemId: item.itemId,
                    itemName: item.itemName,
                    qty: item.qty,
                    unit: item.unit,
                    price: item.price,
                    note: typeof note === 'string' ? note : null,
                    requestedBy,
                    locationId,
                    addedAt: new Date()
                }))
            });

            if (lineResult.count !== items.length) {
                throw new Error('Not all order lines were saved');
            }

            return { orderId: order.id, lineCount: lineResult.count };
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        if (error instanceof OrderValidationError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('Failed to create vendor order:', error);
        return NextResponse.json({ error: 'Failed to create order. Please retry after checking the order status.' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id, status, confirmedBy, isLocked } = await request.json();

        if (session.role === 'store' && status === 'SENT') {
            return NextResponse.json({ error: 'Stores cannot mark orders as SENT' }, { status: 403 });
        }
        const order = await prisma.vendorOrder.update({
            where: { id },
            data: {
                status,
                isLocked: isLocked !== undefined ? isLocked : (status === 'CONFIRMED' || status === 'SENT'),
                ...(confirmedBy && { confirmedBy, confirmedAt: new Date() })
            }
        });
        return NextResponse.json(order);
    } catch (error) {
        console.error('Failed to update vendor order status:', error);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}
