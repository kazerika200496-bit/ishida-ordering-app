import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // ITEMS
    const items = [
        // 共和産業
        { id: 'I0001', category: 'ハンガー類', name: '白ハンガー', displayName: '白ハンガー', unit: '本', price: 10, imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200', defaultSupplierId: 'SUP001' },
        { id: 'I0002', category: 'ハンガー類', name: 'ワイシャツハンガー', displayName: 'Yシャツハンガー', unit: '本', price: 8, imageUrl: 'https://images.unsplash.com/photo-1591123720164-de1348028a82?w=200', defaultSupplierId: 'SUP001' },

        // 浅野通商
        { id: 'I0006', category: 'タグ類', name: 'H型 1-10カラータック ピンク', displayName: 'ピンクタグ', unit: '箱', price: 2500, imageUrl: 'https://images.unsplash.com/photo-1626497746270-0bcc7-90059345?w=200', defaultSupplierId: 'SUP003' },
        { id: 'I0008', category: 'タグ類', name: 'NEW汗ぬきタグ', displayName: '汗ぬきタグ', unit: '個', price: 500, imageUrl: 'https://images.unsplash.com/photo-1605518295918-aa7823736af1?w=200', defaultSupplierId: 'SUP003' },

        // マルワパッケージ
        { id: 'I0003', category: 'ポリ袋', name: 'サービスバッグ大', displayName: 'サービス大', unit: '枚', price: 15, imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=200', defaultSupplierId: 'SUP004' },
        { id: 'I0004', category: 'ポリ袋', name: 'サービスバッグ中', displayName: 'サービス中', unit: '枚', price: 12, imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=150', defaultSupplierId: 'SUP004' },
    ];

    for (const item of items) {
        await prisma.item.upsert({
            where: { id: item.id },
            update: { ...item },
            create: { ...item },
        });
    }

    // LOCATIONS
    const locations = [
        { id: 'F001', name: 'いしだクリーニング 本社工場', type: '工場' },
        { id: 'F002', name: 'パステルクリーニング 駅家工場', type: '工場' },
        { id: 'S001', name: 'パステルクリーニング アクロス神辺店', type: '店舗', defaultSupplierId: 'F001' },
    ];

    for (const loc of locations) {
        await prisma.location.upsert({
            where: { id: loc.id },
            update: { ...loc },
            create: { ...loc },
        });
    }

    // SUPPLIERS
    const suppliers = [
        { id: 'SUP001', name: '共和産業', officialName: '株式会社 共和産業', type: '業者', method: '訪問', cutoffDayOfWeek: '月', cutoffTime: '17:00', deliveryDayOfWeek: '火' },
        { id: 'SUP002', name: 'MCS', officialName: '株式会社 MCS', type: '業者', method: '訪問', cutoffDayOfWeek: '水', cutoffTime: '12:00', deliveryDayOfWeek: '木' },
        { id: 'SUP003', name: '浅野通商', officialName: '有限会社 浅野通商', type: '業者', method: '訪問', cutoffDayOfWeek: '金', cutoffTime: '17:00', deliveryDayOfWeek: '月' },
        { id: 'SUP004', name: 'マルワパッケージ', officialName: 'マルワパッケージ 株式会社', type: '業者', method: '訪問' },
        { id: 'SUP005', name: '新日本製紙', officialName: '新日本製紙 株式会社', type: '業者', method: 'FAX' },
        { id: 'SUP006', name: '石川島ボイラー', officialName: '石川島ボイラー', type: '業者', method: 'TEL/FAX' },
    ];

    for (const sup of suppliers) {
        await prisma.supplier.upsert({
            where: { id: sup.id },
            update: { ...sup },
            create: { ...sup },
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
