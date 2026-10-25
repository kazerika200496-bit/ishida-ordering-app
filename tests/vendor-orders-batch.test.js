const assert = require('node:assert/strict');
const Module = require('node:module');
const { beforeEach, test } = require('node:test');

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
    module: 'CommonJS',
    moduleResolution: 'node',
    target: 'ES2020'
});
require('ts-node/register/transpile-only');

let state;
let session;

function createState() {
    return {
        orders: [],
        lines: [],
        transactionCalls: 0,
        failLineCreation: false
    };
}

const transactionClient = {
    supplier: {
        findUnique: async ({ where }) => where.id === 'vendor-1'
            ? { id: 'vendor-1', cutoffDayOfWeek: '月', cutoffTime: '17:00', deliveryDayOfWeek: '火' }
            : null
    },
    location: {
        findUnique: async ({ where }) => where.id === 'location-1' ? { id: 'location-1' } : null
    },
    item: {
        findMany: async ({ where }) => [
            ...new Set(where.id.in.filter(id => id.startsWith('item-')))
        ].map(id => ({ id }))
    },
    vendorOrder: {
        findFirst: async ({ where }) => state.orders.find(order =>
            order.vendorId === where.vendorId &&
            order.status === where.status &&
            order.cutoffAt.getTime() === where.cutoffAt.getTime() &&
            !order.isLocked
        ) || null,
        create: async ({ data }) => {
            state.orders.push(data);
            return data;
        }
    },
    vendorOrderLine: {
        createMany: async ({ data }) => {
            if (state.failLineCreation) throw new Error('simulated line insert failure');
            state.lines.push(...data);
            return { count: data.length };
        }
    }
};

const prismaMock = {
    $transaction: async callback => {
        state.transactionCalls += 1;
        const ordersBefore = [...state.orders];
        const linesBefore = [...state.lines];
        try {
            return await callback(transactionClient);
        } catch (error) {
            state.orders = ordersBefore;
            state.lines = linesBefore;
            throw error;
        }
    }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === '@/lib/prisma') return { prisma: prismaMock };
    if (request === '@/lib/auth') return { getSession: async () => session };
    return originalLoad.call(this, request, parent, isMain);
};

const { POST } = require('../app/api/vendor-orders/route.ts');
Module._load = originalLoad;

beforeEach(() => {
    state = createState();
    session = { role: 'admin', username: 'admin', locationId: null };
});

function line(itemId) {
    return { itemId, itemName: itemId, qty: 2, unit: '個', price: 10 };
}

function request(items) {
    return new Request('http://localhost/api/vendor-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            vendorId: 'vendor-1',
            locationId: 'location-1',
            requestedBy: 'テスト',
            note: '',
            items
        })
    });
}

test('one-item order creates one order and one line in one transaction', async () => {
    const response = await POST(request([line('item-1')]));

    assert.equal(response.status, 200);
    assert.equal(state.transactionCalls, 1);
    assert.equal(state.orders.length, 1);
    assert.equal(state.lines.length, 1);
});

test('multi-item order creates all lines in one transaction', async () => {
    const response = await POST(request([line('item-1'), line('item-2')]));

    assert.equal(response.status, 200);
    assert.equal(state.transactionCalls, 1);
    assert.equal(state.orders.length, 1);
    assert.equal(state.lines.length, 2);
});

test('an invalid line rejects the complete request before any writes', async () => {
    const response = await POST(request([line('item-1'), { ...line('item-2'), qty: 0 }]));

    assert.equal(response.status, 400);
    assert.equal(state.transactionCalls, 0);
    assert.equal(state.orders.length, 0);
    assert.equal(state.lines.length, 0);
});

test('a line insert failure rolls back the new order and every line', async () => {
    state.failLineCreation = true;
    const response = await POST(request([line('item-1'), line('item-2')]));

    assert.equal(response.status, 500);
    assert.equal(state.transactionCalls, 1);
    assert.equal(state.orders.length, 0);
    assert.equal(state.lines.length, 0);
});
