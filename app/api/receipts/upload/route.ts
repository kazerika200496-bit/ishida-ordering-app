import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

// Helper to convert Blob/File to Base64
async function fileToBase64(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:${file.type};base64,${buffer.toString('base64')}`;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        // ログインしていない場合でもアップロード自体は許可するが、createdById は null になる
        // （本来は requireAuth を使うべきだが、現状の可用性を優先）
        const userId = (session?.sub as string) || null;

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 1. Convert to Base64 (MVP approach)
        const base64Image = await fileToBase64(file);

        // 2. Mock OCR Processing (Simulate 2s delay)
        // 実装予定: ここで Vercel Blob または Vision API 等に画像を投げて OCR 結果を取得する
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 現在は本番向けダミーデータ（固定値）を入れない仕様のため、OCR結果は全て null とする
        const ocrResult = {
            payee: null,
            amount: null,
            taxAmount: null,
            receiptDate: null,
            slipNo: null,
            accountCode: null,
            accountName: null,
            subAccount: null,
            description: null,
            taxCategory: null,
        };

        // 3. Insert into Database as UPLOADED (or OCR_DONE if OCR actually ran)
        const receipt = await prisma.receipt.create({
            data: {
                imageUrl: base64Image,
                contentType: file.type,
                fileName: file.name,
                fileSize: file.size,
                status: 'UPLOADED', 
                createdById: userId,
                
                // OCR結果の反映処理（現在は全てnullが入るため空欄になる）
                payee: ocrResult.payee,
                amount: ocrResult.amount,
                taxAmount: ocrResult.taxAmount,
                receiptDate: ocrResult.receiptDate,
                slipNo: ocrResult.slipNo,
                accountCode: ocrResult.accountCode,
                accountName: ocrResult.accountName,
                subAccount: ocrResult.subAccount,
                description: ocrResult.description,
                taxCategory: ocrResult.taxCategory,
            }
        });

        return NextResponse.json({ success: true, receiptId: receipt.id });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    } finally {
        // Disconnect to avoid exhausting connections in serverless environment
        await prisma.$disconnect();
    }
}
