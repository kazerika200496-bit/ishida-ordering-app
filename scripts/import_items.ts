import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { normalizeCategory } from '../lib/category';


const prisma = new PrismaClient();

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1EKOq27zIKamzGAuiv9QE4Dol4e1AQIabwTV6uRY_OZI/export?format=csv&gid=1470236949';

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const hasForce = args.includes('--force');

    if (!isDryRun && !hasForce) {
        console.error('⚠️ [GUARD] 本番書込を実行するには `--force` オプションが必須です。');
        console.error('例: npm run import:items:force');
        process.exit(1);
    }

    console.log(`\n--- Start Safe Google Sheet Inventory Import ---`);
    console.log(`Target Database: ${process.env.DATABASE_URL ? 'Connected' : 'Missing DATABASE_URL'}`);
    console.log(`Mode: ${isDryRun ? 'DRY-RUN (No Data Written)' : 'LIVE EXECUTION'}`);

    let csvText = '';
    try {
        const response = await fetch(SPREADSHEET_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        csvText = await response.text();
    } catch (e: any) {
        console.error('Failed to fetch spreadsheet:', e.message);
        process.exit(1);
    }

    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return console.log('No data found in CSV. Exiting.');

    console.log(`Found ${lines.length - 1} records. Processing...`);

    let successCount = 0;

    // Header format: 品目ID,最終カテゴリ,品目名,単位,有効フラグ,備考,表示名
    for (let i = 1; i < lines.length; i++) {
        // Splitting safely (assuming no complex quoted commas inside names based on earlier preview)
        const columns = lines[i].split(',');
        const itemId = columns[0]?.trim(); // Maps to `id` (e.g. I0001)
        const category = normalizeCategory(columns[1]?.trim() || 'その他');
        const name = columns[2]?.trim();
        const unit = columns[3]?.trim() || '個';
        const activeFlag = columns[4]?.trim().toUpperCase();
        const displayName = columns[6]?.trim() || name;

        if (!itemId || !name) continue;
        if (activeFlag === 'FALSE') continue;

        if (isDryRun) {
            console.log(`[DRY-RUN] Upsert -> ID: ${itemId}, Name: ${name}, Cat: ${category}`);
            successCount++;
        } else {
            try {
                await prisma.item.upsert({
                    where: { id: itemId },
                    update: {
                        name: name,
                        displayName: displayName,
                        category: category,
                        unit: unit,
                        // Price is missing from the sheet, so we don't overwrite if it exists
                    },
                    create: {
                        id: itemId,
                        name: name,
                        displayName: displayName,
                        category: category,
                        unit: unit,
                        price: 0, // Fallback price
                    }
                });
                successCount++;
            } catch (err: any) {
                console.error(`[ERROR] Failed on item ${itemId}:`, err.message);
            }
        }
    }

    console.log(`\n--- Import Complete ---`);
    console.log(`Total processed successfully: ${successCount} items.`);
    if (isDryRun) {
        console.log(`\n[DRY-RUN] Verify complete. Run 'npm run import:items' without dry-run to push to DB.`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
