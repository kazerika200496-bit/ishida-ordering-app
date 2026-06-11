'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { VendorOrder, VendorOrderLine } from '../../types';

export default function PrintableOrder() {
    const params = useParams();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<VendorOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showImages, setShowImages] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch('/api/vendor-orders');
                const orders = await res.json();
                const found = orders.find((o: VendorOrder) => o.id === orderId);
                setOrder(found || null);
            } catch (err) {
                console.error('Failed to fetch order:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const consolidatedLines = React.useMemo(() => {
        if (!order) return [];
        const map: Record<string, { itemId: string, itemName: string, qty: number, unit: string, price: number, imageUrl?: string, materialCode?: string | null }> = {};
        order.lines.forEach(l => {
            if (!map[l.itemId]) {
                map[l.itemId] = { itemId: l.itemId, itemName: l.itemName, qty: 0, unit: l.unit, price: l.price, imageUrl: l.item?.imageUrl, materialCode: l.item?.materialCode };
            }
            map[l.itemId].qty += l.qty;
        });
        return Object.values(map);
    }, [order]);

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>;

    if (!order) {
        const isLocalId = orderId.startsWith('ORD-');
        return (
            <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#fff5f5' }}>
                <h1 style={{ color: '#c53030' }}>注文が見つかりせん</h1>
                <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
                    ID: <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ddd' }}>{orderId}</code> はデータベース内に存在しないか、読み込みに失敗しました。
                </p>
                {isLocalId && (
                    <div style={{
                        maxWidth: '500px', margin: '0 auto', padding: '20px',
                        backgroundColor: '#fff', border: '1px solid #feb2b2', borderRadius: '12px',
                        textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                        <p style={{ fontWeight: 'bold', color: '#e53e3e' }}>💡 ヒント: ID形式の不整合</p>
                        <p style={{ fontSize: '14px' }}>
                            渡されたIDが <strong>ORD-</strong> で始まっています。これはブラウザ内蔵の仮IDであり、業者向けの発注書を表示するには <strong>VORD-</strong> で始まる正規の注文IDが必要です。
                        </p>
                        <p style={{ fontSize: '14px' }}>
                            「業者別注文リスト」から該当する注文を選択し直してください。
                        </p>
                    </div>
                )}
                <button
                    onClick={() => window.history.back()}
                    style={{ marginTop: '30px', padding: '12px 24px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                >戻る</button>
            </div>
        );
    }

    const totalAmount = consolidatedLines.reduce((sum, l) => sum + (l.qty * l.price), 0);

    return (
        <div style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '15mm 20mm',
            margin: '0 auto',
            backgroundColor: '#fff',
            fontFamily: '"Hiragino Mincho ProN", "MS Mincho", serif',
            color: '#000',
            lineHeight: 1.4
        }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', borderBottom: '3px solid #000', paddingBottom: '5px', marginBottom: '10px', letterSpacing: '4px' }}>資材発注書</h1>
                    <div style={{ fontSize: '13px' }}>伝票番号: {order.id}</div>
                    <div style={{ fontSize: '13px' }}>作成日: {new Date(order.createdAt).toLocaleDateString('ja-JP')}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '5px' }}>いしだクリーニング</div>
                    <div>〒720-0092</div>
                    <div>広島県福山市山手町3-6-1</div>
                    <div>TEL: 084-952-0041 / FAX: 084-952-0043</div>
                </div>
            </div>

            {/* Parties Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'flex-end' }}>
                <div style={{ borderBottom: '2px solid #000', width: '60%', paddingBottom: '5px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {order.vendor.officialName || order.vendor.name} <span style={{ fontSize: '16px', fontWeight: 'normal' }}>御中</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right', borderBottom: '1px solid #000', width: '35%', paddingBottom: '5px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>納品・発送先</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>いしだクリーニング 本社工場</div>
                </div>
            </div>

            {/* Order Details */}
            <div style={{ display: 'flex', gap: '40px', marginBottom: '30px', padding: '15px', border: '1px solid #eee', backgroundColor: '#fdfdfd' }}>
                <div>
                    <span style={{ fontSize: '12px', color: '#666' }}>納品予定日:</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', marginLeft: '10px' }}>
                        {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '別途連絡'}
                    </span>
                </div>
                <div>
                    <span style={{ fontSize: '12px', color: '#666' }}>発注方法:</span>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', marginLeft: '10px' }}>{order.vendor.method || '訪問'}</span>
                </div>
            </div>

            <p style={{ fontSize: '14px', marginBottom: '15px' }}>下記の通り発注いたします。よろしくお願い申し上げます。</p>

            {/* Table Area */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', marginBottom: '20px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        {showImages && <th style={{ border: '1px solid #000', padding: '8px', width: '50px' }}>画像</th>}
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: '80px' }}>コード</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>摘要・品名</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '60px' }}>数量</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '50px' }}>単位</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', width: '100px' }}>単価</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', width: '110px' }}>金額</th>
                    </tr>
                </thead>
                <tbody>
                    {consolidatedLines.map((line, idx) => (
                        <tr key={idx}>
                            {showImages && (
                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                                    {line.imageUrl && <img src={line.imageUrl} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />}
                                </td>
                            )}
                            <td style={{ border: '1px solid #000', padding: '10px', fontSize: '13px' }}>{line.materialCode || line.itemId}</td>
                            <td style={{ border: '1px solid #000', padding: '10px', fontWeight: 'bold' }}>{line.itemName}</td>
                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>{line.qty}</td>
                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{line.unit}</td>
                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '13px' }}>¥{line.price.toLocaleString()}</td>
                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>¥{(line.price * line.qty).toLocaleString()}</td>
                        </tr>
                    ))}
                    {/* Filler rows */}
                    {[...Array(Math.max(0, 10 - consolidatedLines.length))].map((_, i) => (
                        <tr key={i} style={{ height: '35px' }}>
                            {showImages && <td style={{ border: '1px solid #000' }}></td>}
                            <td style={{ border: '1px solid #000' }}></td>
                            <td style={{ border: '1px solid #000' }}></td>
                            <td style={{ border: '1px solid #000' }}></td>
                            <td style={{ border: '1px solid #000' }}></td>
                            <td style={{ border: '1px solid #000' }}></td>
                            <td style={{ border: '1px solid #000' }}></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={showImages ? 5 : 4} style={{ border: 'none' }}></td>
                        <td style={{ border: '2px solid #000', padding: '10px', textAlign: 'right', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>合計金額</td>
                        <td style={{ border: '2px solid #000', padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>¥{totalAmount.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Remarks Area */}
            <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>備考</div>
                <div style={{ border: '1px solid #000', padding: '10px', minHeight: '80px', fontSize: '13px' }}>
                    ※ 納期遅延等ある場合は上記連絡先までご連絡ください。
                </div>
            </div>

            {/* Action Buttons (no-print) */}
            <div className="no-print" style={{
                position: 'fixed', bottom: '30px', right: '30px', display: 'flex', gap: '15px', zIndex: 100
            }}>
                <button
                    onClick={() => setShowImages(!showImages)}
                    style={{
                        padding: '12px 20px', borderRadius: '30px', border: '1px solid #ddd',
                        backgroundColor: showImages ? '#1a73e8' : '#fff', color: showImages ? '#fff' : '#333',
                        fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}
                >
                    {showImages ? '🖼️ 画像を表示中' : '🖼️ 画像を表示'}
                </button>
                <button
                    onClick={() => window.print()}
                    style={{
                        padding: '12px 30px', borderRadius: '30px', border: 'none',
                        backgroundColor: '#1a73e8', color: '#fff', fontWeight: 'bold',
                        cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                    }}
                >🖨️ 印刷を実行</button>
                <button
                    onClick={() => window.history.back()}
                    style={{
                        padding: '12px 20px', borderRadius: '30px', border: '1px solid #ddd',
                        backgroundColor: '#fff', color: '#666', cursor: 'pointer'
                    }}
                >閉じる</button>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; padding: 0; background: #fff !important; }
                    @page { margin: 0; }
                }
            `}</style>
        </div>
    );
}
