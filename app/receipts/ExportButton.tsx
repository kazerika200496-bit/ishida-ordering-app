'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExportButton() {
    const [isExporting, setIsExporting] = useState(false);
    const [month, setMonth] = useState(''); // e.g. "2024-04"
    const [format, setFormat] = useState('default'); // 'default' or 'yayoi'
    const router = useRouter();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/receipts/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, format })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.error || '出力対象のデータがありません。');
                setIsExporting(false);
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const contentDisposition = response.headers.get('content-disposition');
            let filename = `yayoi_export_${month || 'all'}.csv`;
            if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
                filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
            }
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            const exportedCount = response.headers.get('X-Export-Count') || '複数';
            alert(`CSV出力完了: ${exportedCount} 件のデータを「出力済」にマークしました！`);

            router.refresh();
            setMonth(''); // Reset filter after success
        } catch (error) {
            alert('ネットワークエラーが発生しました');
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    // テスト用：出力済み状態のリセット
    const handleResetExport = async () => {
        if (!confirm('【テスト用機能】\n全ての「出力済」データを「未出力(確定済)」に戻しますか？')) return;

        try {
            const res = await fetch('/api/receipts/reset-export', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                router.refresh();
            } else {
                alert('リセットに失敗しました');
            }
        } catch (e) {
            alert('通信エラー');
        }
    };

    return (
        <div className="export-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{ 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '6px', 
                    padding: '8px 12px', 
                    fontSize: '14px', 
                    color: '#475569',
                    outline: 'none'
                }}
                title="対象月を絞り込む (未選択で全件対象)"
            />

            <button
                onClick={handleExport}
                disabled={isExporting}
                style={{ 
                    padding: '9px 16px', 
                    borderRadius: '6px', 
                    fontWeight: 'bold', 
                    fontSize: '14px',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    backgroundColor: isExporting ? '#cbd5e1' : '#10b981', 
                    color: isExporting ? '#64748b' : '#fff', 
                    border: 'none',
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
            >
                {isExporting ? '出力中...' : '↓ 弥生CSV出力'}
            </button>

            {/* 開発・テスト用リセットボタン（本運用時は非表示推奨） */}
            {process.env.NODE_ENV === 'development' && (
                <button
                    onClick={handleResetExport}
                    style={{ 
                        padding: '6px 10px', 
                        fontSize: '12px', 
                        backgroundColor: '#f1f5f9', 
                        color: '#64748b', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                    title="テストやり直し用: 出力済をリセット"
                >
                    🔄 テストやり直し
                </button>
            )}
        </div>
    );
}
