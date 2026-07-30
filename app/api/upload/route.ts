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

const safeContentType =
    contentType === 'image/png' ? 'image/png' :
    contentType === 'image/webp' ? 'image/webp' :
    contentType === 'image/gif' ? 'image/gif' :
    'image/jpeg';


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
        console.log('[UPLOAD DIAG] stage=arrayBuffer-read', {
            byteLength: arrayBuffer.byteLength,
            safeContentType
        });
        if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
        }

        const token = process.env.BLOB_READ_WRITE_TOKEN;
        const tokenExists = typeof token === 'string' && token.length > 0;
        const tokenLength = tokenExists ? token.length : 0;
        const tokenPrefixMatches = tokenExists && token.startsWith('vercel_blob_rw_');
        const tokenIsAscii = tokenExists && [...token].every((ch) => ch.charCodeAt(0) <= 127);
        const tokenHasWhitespace = tokenExists && /\s/.test(token);
        const tokenHasQuotes = tokenExists && /['"]/.test(token);
        const nonAsciiIndexes = tokenExists
            ? [...token].map((ch, i) => (ch.charCodeAt(0) > 127 ? i : -1)).filter((i) => i !== -1)
            : [];

        const blobEnvKeys = Object.keys(process.env).filter((key) => /BLOB/i.test(key));

        const diagnostics = {
            tokenExists,
            tokenLength,
            tokenPrefixMatches,
            tokenIsAscii,
            tokenHasWhitespace,
            tokenHasQuotes,
            nonAsciiIndexes,
            blobEnvKeys,
            runtime: typeof (globalThis as any).EdgeRuntime !== 'undefined' ? 'Edge' : 'Node.js',
            nodeEnv: process.env.NODE_ENV,
        };

        console.log('[UPLOAD DIAG] tokenDiagnostics', {
            tokenExists,
            tokenLength,
            tokenPrefixMatches,
            tokenIsAscii,
            tokenHasWhitespace,
            tokenHasQuotes,
            nonAsciiIndexes
        });
        console.log('[UPLOAD DIAG] blobEnvKeys', blobEnvKeys);

        if (!tokenExists) {
            return NextResponse.json(
                {
                    error: '画像のアップロード用トークン(BLOB_READ_WRITE_TOKEN)が設定されていません。本番環境の環境変数またはローカルの.envファイルを確認してください。',
                    diagnostics
                },
                { status: 500 }
            );
        }

        console.log('[UPLOAD DIAG] stage=safeFilename-generated', { safeFilename });
        console.log('[UPLOAD DIAG] stage=before-put', {
            safeFilename,
            safeContentType
        });

        const blob = await put(safeFilename, arrayBuffer, {
            access: 'public',
            contentType: safeContentType,
        });

        console.log('[UPLOAD DIAG] stage=after-put');
        return NextResponse.json(blob);
    } catch (error: any) {
        console.error('[UPLOAD ERROR]', {
            message: error?.message,
            stage: 'catch'
        }, error?.stack);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
