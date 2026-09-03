'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { VendorOrder, Supplier, Item, VendorOrderLine, Location } from '../types';
import { formatLocationName } from '@/lib/utils';

export default function VendorOrdersPage() {
    const [orders, setOrders] = useState<VendorOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<string>('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<Record<string, 'consolidated' | 'breakdown'>>({});

    useEffect(() => {
        const adminStatus = localStorage.getItem('is_admin') === 'true' ||
            new URLSearchParams(window.location.search).get('admin') === '1';
        setIsAdmin(adminStatus);

        const fetchData = async () => {
            try {
                const [ordersRes, masterRes] = await Promise.all([
                    fetch('/api/vendor-orders'),
                    fetch('/api/master')
                ]);
                const ordersData = await ordersRes.json();
                const masterData = await masterRes.json();

                if (!ordersRes.ok) throw new Error(ordersData.details || ordersData.error || `Orders API Error ${ordersRes.status}`);
                if (!masterRes.ok) throw new Error(masterData.details || masterData.error || `Master API Error ${masterRes.status}`);

                setOrders(ordersData);
                setSuppliers(masterData.suppliers.filter((s: Supplier) => s.type === '業者'));
                setLocations(masterData.locations || []);
                setItems(masterData.items);
            } catch (err: any) {
                console.error('Failed to fetch data:', err);
                setErrorMsg(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => !selectedVendorId || o.vendorId === selectedVendorId);
    }, [orders, selectedVendorId]);

    const handleUpdateStatus = async (orderId: string, newStatus: string, isLocked: boolean) => {
        if (!isAdmin) return;
        try {
            const res = await fetch('/api/vendor-orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, status: newStatus, isLocked, confirmedBy: '管理者' })
            });
            if (res.ok) {
                const updated = await res.json();
                setOrders(orders.map(o => o.id === orderId ? { ...o, ...updated } : o));
            }
        } catch (err) {
            alert('更新に失敗しました');
        }
    };

    const handleUpdateLine = async (orderId: string, lineId: number, qty: number) => {
        if (qty <= 0) {
            if (!confirm('明細を削除しますか？')) return;
            handleDeleteLine(orderId, lineId);
            return;
        }
        try {
            const res = await fetch(`/api/vendor-orders/lines/${lineId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qty })
            });
            if (res.ok) {
                const updatedLine = await res.json();
                setOrders(orders.map(o => {
                    if (o.id === orderId) {
                        return { ...o, lines: o.lines.map(l => l.id === lineId ? { ...l, ...updatedLine } : l) };
                    }
                    return o;
                }));
            }
        } catch (err) {
            alert('更新に失敗しました');
        }
    };

    const handleDeleteLine = async (orderId: string, lineId: number) => {
        try {
            const res = await fetch(`/api/vendor-orders/lines/${lineId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setOrders(orders.map(o => {
                    if (o.id === orderId) {
                        return { ...o, lines: o.lines.filter(l => l.id !== lineId) };
                    }
                    return o;
                }));
            }
        } catch (err) {
            alert('削除に失敗しました');
        }
    };

    // 締切タイマー計算
    const getDeadlineInfo = (cutoffAtStr?: string) => {
        if (!cutoffAtStr) return null;
        const cutoffAt = new Date(cutoffAtStr);
        const now = new Date();
        const diff = cutoffAt.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (diff < 0) return { text: '締切済', color: '#d93025', isUrgent: false };
        if (hours < 24) return { text: `残り ${hours}時間${mins}分`, color: '#d93025', isUrgent: true };
        return { text: `残り ${Math.floor(hours / 24)}日`, color: '#1a73e8', isUrgent: false };
    };

    // 明細を集約する
    const getConsolidatedLines = (lines: VendorOrderLine[]) => {
        const map: Record<string, { itemId: string, itemName: string, displayName?: string, qty: number, unit: string, price: number, imageUrl?: string }> = {};
        lines.forEach(l => {
            if (!map[l.itemId]) {
                map[l.itemId] = { itemId: l.itemId, itemName: l.itemName, displayName: l.item?.displayName, qty: 0, unit: l.unit, price: l.price, imageUrl: l.item?.imageUrl };
            }
            map[l.itemId].qty += l.qty;
        });
        return Object.values(map);
    };

    const getStatusLabel = (status: string) => {
        if (status === 'DRAFT') return '受付済';
        if (status === 'CONFIRMED') return '発注済';
        if (status === 'SENT') return '完了';
        return status;
    };

    const getStatusColor = (status: string) => {
        if (status === 'DRAFT') return '#1a73e8'; // Blue
        if (status === 'CONFIRMED') return '#fbbc04'; // Yellow
        if (status === 'SENT') return '#34a853'; // Green
        return '#70757a'; // Gray
    };

    const getLocationName = (id: string) => {
        if (!id) return '不明';
        const found = locations.find(l => l.id === id)?.name || id;
        return formatLocationName(found);
    };

    if (isLoading) return <div style={{ padding: '20px' }}>読み込み中...</div>;

    if (errorMsg) return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2 style={{ color: '#d93025' }}>データの取得に失敗しました</h2>
            <p>{errorMsg}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>再読み込み</button>
        </div>
    );

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
            <header className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '22px', color: '#1a73e8' }}>📦 業者別注文管理</h1>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        スタッフの発注を業者・締切ごとに集約しています
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href="/" style={{ textDecoration: 'none', color: '#666', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>戻る</Link>
                    <button
                        onClick={() => { localStorage.setItem('is_admin', (!isAdmin).toString()); setIsAdmin(!isAdmin); }}
                        style={{ backgroundColor: isAdmin ? '#d93025' : '#1a73e8', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                    >
                        {isAdmin ? '管理者🔒' : 'スタッフ👤'}
                    </button>
                </div>
            </header>

            <div className="no-print" style={{ marginBottom: '20px' }}>
                <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                >
                    <option value="">すべての業者を表示</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            <main>
                {filteredOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '2px dashed #eee', color: '#999' }}>
                        該当する注文はありません
                    </div>
                ) : (
                    filteredOrders.map(order => {
                        const deadline = getDeadlineInfo(order.cutoffAt);
                        const isConsolidated = viewMode[order.id] !== 'breakdown';
                        const displayLines = isConsolidated ? getConsolidatedLines(order.lines) : order.lines;

                        return (
                            <div key={order.id} style={{
                                backgroundColor: '#fff',
                                borderRadius: '12px',
                                border: order.status === 'DRAFT' ? '2px solid #1a73e8' : '1px solid #ddd',
                                boxShadow: order.status === 'DRAFT' ? '0 4px 12px rgba(26,115,232,0.1)' : 'none',
                                marginBottom: '25px',
                                overflow: 'hidden'
                            }}>
                                {/* Card Header */}
                                <div style={{
                                    padding: '15px 20px',
                                    borderBottom: '1px solid #eee',
                                    backgroundColor: order.status === 'DRAFT' ? '#f8fbff' : '#fafafa',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '10px'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                backgroundColor: getStatusColor(order.status),
                                                color: '#fff',
                                                fontWeight: 'bold'
                                            }}>{getStatusLabel(order.status)}</span>
                                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{order.vendor.name}</span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                            納品予定: <span style={{ fontWeight: 'bold', color: '#333' }}>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : '未定'}</span>
                                            {order.confirmedAt && (
                                                <span style={{ marginLeft: '10px' }}>
                                                    更新: {new Date(order.confirmedAt).toLocaleDateString()} {new Date(order.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {order.status === 'DRAFT' && deadline && (
                                        <div style={{
                                            textAlign: 'right',
                                            padding: '6px 12px',
                                            backgroundColor: deadline.isUrgent ? '#fce8e6' : '#e8f0fe',
                                            borderRadius: '8px',
                                            border: `1px solid ${deadline.color}`
                                        }}>
                                            <div style={{ fontSize: '11px', color: '#666' }}>締切まで</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: deadline.color }}>{deadline.text}</div>
                                        </div>
                                    )}
                                </div>

                                {/* View Switcher (for Admin) */}
                                {isAdmin && (
                                    <div className="no-print" style={{ padding: '0 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex' }}>
                                        <button
                                            onClick={() => setViewMode({ ...viewMode, [order.id]: 'consolidated' })}
                                            style={{
                                                padding: '10px 15px', border: 'none', background: 'none', fontSize: '13px',
                                                borderBottom: isConsolidated ? '2px solid #1a73e8' : 'none',
                                                color: isConsolidated ? '#1a73e8' : '#666', fontWeight: isConsolidated ? 'bold' : 'normal', cursor: 'pointer'
                                            }}>業者向け(合算)</button>
                                        <button
                                            onClick={() => setViewMode({ ...viewMode, [order.id]: 'breakdown' })}
                                            style={{
                                                padding: '10px 15px', border: 'none', background: 'none', fontSize: '13px',
                                                borderBottom: !isConsolidated ? '2px solid #1a73e8' : 'none',
                                                color: !isConsolidated ? '#1a73e8' : '#666', fontWeight: !isConsolidated ? 'bold' : 'normal', cursor: 'pointer'
                                            }}>内訳(店舗/人別)</button>
                                    </div>
                                )}

                                {/* Card Body: Items Table */}
                                <div style={{ padding: '0 20px', overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left', fontSize: '12px', color: '#999' }}>
                                                <th style={{ padding: '12px 8px' }}>品目</th>
                                                <th style={{ padding: '12px 8px' }}>数量</th>
                                                <th style={{ padding: '12px 8px' }}>単価</th>
                                                <th style={{ padding: '12px 8px' }}>金額</th>
                                                {!isConsolidated && <th style={{ padding: '12px 8px' }}>発注元</th>}
                                                {isAdmin && order.status === 'DRAFT' && <th style={{ padding: '12px 8px' }} className="no-print">操作</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayLines.map((line: any, idx: number) => (
                                                <tr key={isConsolidated ? line.itemId : line.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                    <td style={{ padding: '12px 8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                                {line.imageUrl ? <img src={line.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '14px' }}>🖼️</span>}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{line.displayName || line.item?.displayName || line.itemName}</div>
                                                                {!isConsolidated && line.note && <div style={{ fontSize: '11px', color: '#999' }}>📝 {line.note}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 8px', fontSize: '15px' }}>
                                                        <span style={{ fontWeight: 'bold' }}>{line.qty}</span>
                                                        <span style={{ fontSize: '12px', marginLeft: '4px', color: '#666' }}>{line.unit}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 8px', fontSize: '13px', color: '#666' }}>{line.price === null ? '-' : `¥${line.price.toLocaleString()}`}</td>
                                                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold' }}>{line.price === null ? '-' : `¥${(line.qty * line.price).toLocaleString()}`}</td>
                                                    {!isConsolidated && (
                                                        <td style={{ padding: '12px 8px' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{getLocationName(line.locationId)}</div>
                                                            <div style={{ fontSize: '11px', color: '#999' }}>{line.requestedBy || '-'}</div>
                                                        </td>
                                                    )}
                                                    {isAdmin && order.status === 'DRAFT' && (
                                                        <td style={{ padding: '12px 8px' }} className="no-print">
                                                            {!isConsolidated ? (
                                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                                    <button onClick={() => {
                                                                        const val = prompt('数量を変更', line.qty.toString());
                                                                        if (val !== null) handleUpdateLine(order.id, line.id, parseFloat(val));
                                                                    }} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#fff', cursor: 'pointer', fontSize: '11px' }}>編集</button>
                                                                    <button onClick={() => handleDeleteLine(order.id, line.id)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #fee', color: '#d93025', backgroundColor: '#fff', cursor: 'pointer', fontSize: '11px' }}>削除</button>
                                                                </div>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', color: '#ccc' }}>内訳タブで操作</span>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Card Footer */}
                                <div style={{
                                    padding: '15px 20px',
                                    borderTop: '1px solid #eee',
                                    backgroundColor: '#fff',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '12px', color: '#999' }}>合計 ({order.lines.length}明細)</div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                                            {order.lines[0]?.price === null ? '-' : `¥${order.lines.reduce((sum, l) => sum + (l.qty * (l.price || 0)), 0).toLocaleString()}`}
                                        </div>
                                    </div>

                                    <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
                                        <Link
                                            href={`/printable-order/${order.id}`}
                                            className="btn-print"
                                            style={{
                                                padding: '10px 16px', borderRadius: '8px', border: '1px solid #1a73e8',
                                                backgroundColor: '#fff', color: '#1a73e8', textDecoration: 'none',
                                                fontSize: '14px', fontWeight: 'bold'
                                            }}
                                        >🖨️ 印刷画面</Link>

                                        {isAdmin && order.status === 'DRAFT' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'CONFIRMED', true)}
                                                style={{
                                                    padding: '10px 16px', borderRadius: '8px', border: 'none',
                                                    backgroundColor: '#34a853', color: '#fff',
                                                    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
                                                }}
                                            >✅ 注文を確定</button>
                                        )}

                                        {isAdmin && order.status === 'CONFIRMED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'SENT', true)}
                                                style={{
                                                    padding: '10px 16px', borderRadius: '8px', border: 'none',
                                                    backgroundColor: '#1a73e8', color: '#fff',
                                                    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
                                                }}
                                            >🚀 送信済みへ</button>
                                        )}
                                        {isAdmin && order.status !== 'DRAFT' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'DRAFT', false)}
                                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#fff', color: '#999', cursor: 'pointer' }}
                                                title="下書きに戻す"
                                            >🔄</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
                @media print {
                    .no-print { display: none !important; }
                }
            `}</style>
        </div>
    );
}
