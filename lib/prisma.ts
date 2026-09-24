import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

function getClient(): PrismaClient {
    if (!globalForPrisma.prisma) {
        let dbUrl = process.env.DATABASE_URL;

        // NeonのプーラーURLで、pgbouncer=trueが未設定の場合は自動付与
        if (dbUrl && dbUrl.includes('pooler.ap-southeast-1.aws.neon.tech') && !dbUrl.includes('pgbouncer=true')) {
            const separator = dbUrl.includes('?') ? '&' : '?';
            dbUrl = `${dbUrl}${separator}pgbouncer=true`;
            console.log('[Prisma] Automatically appended pgbouncer=true to Neon pooler URL');
        }

        globalForPrisma.prisma = new PrismaClient({
            datasourceUrl: dbUrl,
            log: ['query', 'error', 'warn'],
        });
    }
    return globalForPrisma.prisma;
}

/**
 * Prisma Client の lazy getter。
 * インポートしただけでは PrismaClient が初期化されないため、
 * ビルド時の DATABASE_URL 未設定によるエラーを回避しつつ、
 * 実行時には安定した接続を提供します。
 */
export const prisma = {
    get user() { return getClient().user; },
    get item() { return getClient().item; },
    get location() { return getClient().location; },
    get employee() { return getClient().employee; },
    get supplier() { return getClient().supplier; },
    get vendorOrder() { return getClient().vendorOrder; },
    get vendorOrderLine() { return getClient().vendorOrderLine; },
    $connect() { return getClient().$connect(); },
    $disconnect() { return getClient().$disconnect(); },
    $transaction(args: any) { return getClient().$transaction(args); },
} as unknown as PrismaClient;
