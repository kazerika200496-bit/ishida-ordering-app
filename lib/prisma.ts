import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

/**
 * Prisma Client を必要になった時点で初めて初期化する Proxy。
 * インポートしただけでは PrismaClient のコンストラクタが走らないため、
 * Vercel のビルド時など DATABASE_URL が参照できない環境でのエラーを回避できます。
 */
export const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop) => {
        if (!globalForPrisma.prisma) {
            globalForPrisma.prisma = new PrismaClient({
                log: ['query'],
            });
        }
        return (globalForPrisma.prisma as any)[prop];
    }
});
