'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ReceiptUploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }

        if (file.type.startsWith('image/')) {
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setPreviewUrl(null);
        }
    }, [file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleClearSelection = () => {
        setFile(null);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setIsUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            // MVPではcreatedByIdをあえて指定せず、DB上でnullとして扱う（外部キー制約エラーを防ぐため）

            // 1. Upload to Blob
            const res = await fetch('/api/receipts/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            // 3. Redirect to Review
            router.push(`/receipts/${data.receiptId}`);
        } catch (err: any) {
            setError(err.message || 'アップロードに失敗しました');
            setIsUploading(false);
        }
    };

    return (
        <div className="container">
            <header>
                <div>
                    <div className="header-title">いしだクリーニング 領収書管理</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link
                        href="/receipts"
                        className="nav-link-important"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.4)' }}
                    >
                        一覧へ戻る
                    </Link>
                </div>
            </header>

            <div style={{ maxWidth: '600px', margin: '40px auto 0' }}>
                <div className="card" style={{ padding: '30px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                        領収書のアップロード
                    </h2>
                    
                    <form onSubmit={handleUpload}>
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#334155', marginBottom: '15px' }}>
                                レシート画像を選択または撮影してください
                            </label>

                            {file ? (
                                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '15px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                                    <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: '#334155', wordBreak: 'break-all' }}>
                                        選択中: {file.name}
                                    </div>
                                    {previewUrl ? (
                                        <div style={{ marginBottom: '15px' }}>
                                            <img 
                                                src={previewUrl} 
                                                alt="Preview" 
                                                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }} 
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ padding: '30px 0', color: '#64748b', fontSize: '14px' }}>
                                            (プレビュー非対応のファイルです)
                                        </div>
                                    )}
                                    <button 
                                        type="button" 
                                        onClick={handleClearSelection}
                                        style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#fff', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        選び直す
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {/* カメラ用 */}
                                    <label style={{ display: 'block', padding: '20px', backgroundColor: '#f0fdf4', border: '2px dashed #10b981', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', color: '#047857', fontWeight: 'bold' }}>
                                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📷</div>
                                        カメラで撮影する
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: 'none' }}
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                    
                                    {/* PC・ライブラリ用 */}
                                    <label style={{ display: 'block', padding: '15px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', color: '#475569', fontWeight: 'bold' }}>
                                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>📁</div>
                                        画像・ファイルを選択
                                        <input
                                            type="file"
                                            accept="image/jpeg, image/png, image/webp, application/pdf"
                                            style={{ display: 'none' }}
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '5px' }}>対応フォーマット: JPEG, PNG, WEBP, PDF</p>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="alert alert-error" style={{ padding: '15px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold' }}>{error}</div>
                                {(error.includes('ログイン') || error.includes('セッション')) && (
                                    <div style={{ marginTop: '12px' }}>
                                        <Link 
                                            href="/login" 
                                            style={{ 
                                                display: 'inline-block', 
                                                textDecoration: 'none', 
                                                textAlign: 'center', 
                                                padding: '8px 16px', 
                                                fontSize: '14px', 
                                                backgroundColor: '#ef4444', 
                                                color: '#fff', 
                                                borderRadius: '6px',
                                                fontWeight: 'bold',
                                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                                            }}
                                        >
                                            ログイン画面へ移動
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!file || isUploading}
                            className="btn-primary"
                            style={{ 
                                width: '100%', 
                                padding: '14px', 
                                fontSize: '16px',
                                opacity: (!file || isUploading) ? 0.5 : 1,
                                cursor: (!file || isUploading) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isUploading ? 'アップロード＆解析中...' : 'アップロードして自動解析'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
