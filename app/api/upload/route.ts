import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename') || 'upload.jpg';
        const contentType = request.headers.get('content-type') || 'image/jpeg';


const originalFilename = filename;
const extFromName = originalFilename.split('.').pop()?.toLowerCase();

const extFromContentType =
    contentType === 'image/png' ? 'png' :
    contentType === 'image/webp' ? 'webp' :
    contentType === 'image/gif' ? 'gif' :
    'jpg';

const ext = extFromName && /^[a-z0-9]+$/.test(extFromName)
    ? extFromName
    : extFromContentType;

const safeFilename = `item-images/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        // 1. Validation: Check if it's an image
        if (!contentType.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 });
        }

        if (!request.body) {
            return NextResponse.json({ error: 'No body provided' }, { status: 400 });
        }

        // 2. Validation: Check file size (Read into buffer to check size)
        const arrayBuffer = await request.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
        }

        // If BLOB_READ_WRITE_TOKEN is missing, return a clear error.
        // Base64 fallback is disabled to prevent database size issues.
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        const hasBlobToken = typeof token === 'string' && token.length > 0;
        const tokenLength = token ? token.length : 0;

        // Collect safe diagnostic info
        const envKeys = Object.keys(process.env);
        const blobRelatedKeys = envKeys.filter(k => k.toUpperCase().includes('BLOB'));

        const diagnostics = {
            hasBlobToken,
            tokenLength,
            blobRelatedKeys,
            runtime: typeof (globalThis as any).EdgeRuntime !== 'undefined' ? 'Edge' : 'Node.js',
            nodeEnv: process.env.NODE_ENV,
        };

        // Server-side diagnostic log (strictly adheres to privacy instructions)
        console.log('[DIAGNOSTIC UPLOAD]', diagnostics);

        if (!hasBlobToken) {
            return NextResponse.json(
                { 
                    error: '画像のアップロード用トークン(BLOB_READ_WRITE_TOKEN)が設定されていません。本番環境の環境変数またはローカルの.envファイルを確認してください。',
                    diagnostics
                },
                { status: 500 }
            );
        }

        // Upload to Vercel Blob (Public access for item images)
       const blob = await put(safeFilename, arrayBuffer, {
            access: 'public',
            contentType: contentType,
        });

        return NextResponse.json(blob);
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
