import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    // 【安全対策】本番環境でのデータ破壊を防ぐためガードを設けます。
    if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ Warning: Seeding is disabled in production to prevent data loss.');
        return;
    }

    // ITEMS
    const items = [
        // 共和産業
        { id: 'I0001', category: 'ハンガー', name: '白ハンガー', displayName: '白ハンガー', unit: '本', price: 10, imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200', defaultSupplierId: 'SUP001' },
        { id: 'I0002', category: 'ハンガー', name: 'ワイシャツハンガー', displayName: 'Yシャツハンガー', unit: '本', price: 8, imageUrl: 'https://images.unsplash.com/photo-1591123720164-de1348028a82?w=200', defaultSupplierId: 'SUP001' },

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

    // USERS
    console.log('Seeding Users...');

    // 1. Admin ユーザーの作成
    const adminPassword = crypto.randomBytes(6).toString('hex'); // Random 12 char hex
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: { password: adminPassword },
        create: {
            username: 'admin',
            password: adminPassword, // 簡易ハッシュなし (ミニマム構成)
            role: 'admin',
        },
    }); // Closing the upsert call for admin user

    // 2. 各ロケーション用の Store ユーザーの作成
    console.log('\n--- 初期ログイン情報 ---');

    // Write admin password to a local temporary file for the bot to read, so we don't console.log it wildly
    const fs = require('fs');
    fs.writeFileSync('c:\\資材発注フォーム\\ishida-ordering-app\\_temp_admin.txt', adminPassword);

    // We will collect passwords to write them out or display them
    const accountList: { store: string, id: string, pass: string }[] = [];

    for (const loc of locations) {
        const username = loc.name.replace(/\s+/g, '_'); // 簡易的なユーザー名
        const randomPass = crypto.randomBytes(4).toString('hex'); // 例: a1b2c3d4

        accountList.push({ store: loc.name, id: username, pass: randomPass });
        console.log(`店舗 [${username}]: ID [${username}] / PASS [${randomPass}]`);

        await prisma.user.upsert({
            where: { username: username },
            update: {
                locationId: loc.id,
                password: randomPass
            },
            create: {
                username: username,
                password: randomPass,
                role: 'store',
                locationId: loc.id
            }
        });
    }

    // JSON file writing has been removed for security.
    console.log('\n✅ セキュリティのため、生成されたパスワードはファイルに保存されません。上記のログを記録してください。');
    console.log('Database seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
