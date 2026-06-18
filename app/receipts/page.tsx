import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import ExportButton from './ExportButton';
import ReceiptFilters from './ReceiptFilters';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function ReceiptsDashboard({ searchParams }: { searchParams: { month?: string, account?: string, missingCode?: string } }) {
    // Build whereClause based on searchParams
    const whereClause: any = {};
    
    if (searchParams.month && searchParams.month.length === 7) {
        const year = parseInt(searchParams.month.split('-')[0]);
        const monthIndex = parseInt(searchParams.month.split('-')[1]) - 1;
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0, 23, 59, 59);
        whereClause.receiptDate = { gte: firstDay, lte: lastDay };
    }
    
    if (searchParams.account) {
        whereClause.accountName = { contains: searchParams.account };
    }
    
    if (searchParams.missingCode === 'true') {
        whereClause.accountCode = { equals: '' };
        whereClause.accountName = { not: '' };
    }

    const receipts = await prisma.receipt.findMany({
        where: whereClause,
        orderBy: [
            { receiptDate: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    const getStatusBadge = (status: string) => {
        let bgColor = '#f1f5f9';
        let color = '#475569';
        let text = status;

        if (status === 'UPLOADED') { text = '未確認'; }
        if (status === 'OCR_DONE') { bgColor = '#fef3c7'; color = '#b45309'; text = '要確認・修正'; }
        if (status === 'NEEDS_REVIEW') { bgColor = '#fee2e2'; color = '#b91c1c'; text = 'エラー'; }
        if (status === 'CONFIRMED') { bgColor = '#d1fae5'; color = '#047857'; text = '✅ 確定済'; }
        if (status === 'EXPORT_READY') { bgColor = '#dbeafe'; color = '#1d4ed8'; text = '出力待ち'; }

        return (
            <span style={{ 
                backgroundColor: bgColor, color, 
                padding: '4px 10px', borderRadius: '20px', 
                fontSize: '12px', fontWeight: 'bold', border: `1px solid ${color}40` 
            }}>
                {text}
            </span>
        );
    };

    return (
        <div className="container">
            <header className="mobile-header">
                <div>
                    <div className="header-title">いしだクリーニング 領収書管理</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }} className="mobile-nav">
                    <Link href="/receipts/upload" className="nav-link-important" style={{ backgroundColor: '#fff', color: 'var(--primary-color)' }}>
                        ＋ 新規アップロード
                    </Link>
                </div>
            </header>

            <div className="card" style={{ padding: '20px' }}>
                <ReceiptFilters />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }} className="mobile-stack">
                    <h2 style={{ fontSize: '18px', margin: 0, color: '#333' }}>領収書一覧</h2>
                    <ExportButton />
                </div>

                <div className="receipt-table-container">
                    <table className="responsive-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px', fontSize: '14px', color: '#475569' }}>日付</th>
                                <th style={{ padding: '12px', fontSize: '14px', color: '#475569' }}>支払先</th>
                                <th style={{ padding: '12px', fontSize: '14px', color: '#475569' }}>勘定科目</th>
                                <th style={{ padding: '12px', fontSize: '14px', color: '#475569', textAlign: 'right' }} className="hide-mobile">金額</th>
                                <th style={{ padding: '12px', fontSize: '14px', color: '#475569', textAlign: 'center' }} className="hide-mobile">ステータス</th>
                                <th style={{ padding: '12px', fontSize: '14px', color: '#475569', textAlign: 'center' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="empty-cell" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                        対象の領収書データがありません。
                                    </td>
                                </tr>
                            ) : (
                                receipts.map((receipt: any) => (
                                    <tr key={receipt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#334155' }} data-label="日付">
                                            {receipt.receiptDate ? new Date(receipt.receiptDate).toLocaleDateString('ja-JP') : '-'}
                                        </td>
                                        <td style={{ padding: '12px', color: '#334155' }} data-label="支払先">{receipt.payee || '-'}</td>
                                        <td style={{ padding: '12px', color: '#334155' }} data-label="勘定科目">
                                            {receipt.accountName ? (
                                                <div>
                                                    <div>{receipt.accountCode ? `${receipt.accountCode} ${receipt.accountName}` : receipt.accountName}</div>
                                                    {!receipt.accountCode && (
                                                        <span style={{ fontSize: '11px', backgroundColor: '#fffbeb', color: '#b45309', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a', display: 'inline-block', marginTop: '4px' }}>
                                                            ⚠️ コード未設定
                                                        </span>
                                                    )}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#334155' }} data-label="金額" className="price-cell">
                                            {receipt.amount ? `¥${receipt.amount.toLocaleString()}` : '-'}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }} data-label="ステータス" className="status-cell">
                                            {getStatusBadge(receipt.status)}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }} className="action-cell">
                                            <Link
                                                href={`/receipts/${receipt.id}`}
                                                className="btn-action"
                                                style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold', padding: '6px 12px', borderRadius: '4px', backgroundColor: '#eff6ff' }}
                                            >
                                                確認・編集
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
