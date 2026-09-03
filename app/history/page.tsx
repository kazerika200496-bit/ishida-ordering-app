'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Supplier } from '../types';
import { formatLocationName } from '@/lib/utils';

export default function HistoryPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const [ordersRes, masterRes] = await Promise.all([
                    fetch('/api/vendor-orders'),
                    fetch('/api/master')
                ]);
                const ordersData = await ordersRes.json();
                const masterData = await masterRes.json();

                if (!ordersRes.ok) throw new Error(ordersData.details || ordersData.error || `Orders API Error ${ordersRes.status}`);
                if (!masterRes.ok) throw new Error(masterData.details || masterData.error || `Master API Error ${masterRes.status}`);

                // Sort orders by most recent first
                const sorted = ordersData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setOrders(sorted);
                setSuppliers(masterData.suppliers);
                setLocations(masterData.locations);
            } catch (err: any) {
                console.error('Failed to fetch history', err);
                setErrorMsg(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || id;
    const getLocationName = (id: string) => formatLocationName(locations.find(l => l.id === id)?.name || id);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'DRAFT': return { label: '受付済', bg: '#e8f0fe', color: '#1a73e8' };
            case 'CONFIRMED': return { label: '発注済', bg: '#fef7e0', color: '#b06000' };
            case 'SENT': return { label: '完了', bg: '#e6f4ea', color: '#137333' };
            default: return { label: status, bg: '#f1f3f4', color: '#5f6368' };
        }
    };

    if (isLoading) return <div style={{ padding: '50px', textAlign: 'center' }}>読み込み中...</div>;

    if (errorMsg) return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            <h2 style={{ color: '#d93025' }}>履歴データの取得に失敗しました</h2>
            <p>{errorMsg}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>再読み込み</button>
        </div>
    );

    return (
        <div className="container" style={{ paddingBottom: '50px' }}>
            <header style={{ marginBottom: '30px', borderBottom: '2px solid #0066cc', paddingBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>📜 自店舗 発注履歴</h1>
                    <Link href="/" className="btn" style={{ padding: '8px 20px', backgroundColor: '#6c757d' }}>
                        ⬅️ 戻る
                    </Link>
                </div>
            </header>

            <main>
                <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', backgroundColor: '#fafafa' }}>
                                <th style={{ padding: '12px' }}>発注日/更新日</th>
                                <th style={{ padding: '12px' }}>発注元</th>
                                <th style={{ padding: '12px' }}>発注先</th>
                                <th style={{ padding: '12px' }}>発注内容</th>
                                <th style={{ padding: '12px' }}>ステータス</th>
                            </tr>
                        </thead>
                        <tbody>
                                {orders.map(order => {
                                    const style = getStatusStyle(order.status);
                                    // Get unique location IDs from all lines in this order
                                    const orderLocationIds = Array.from(new Set(order.lines.map((l: any) => l.locationId).filter(Boolean))) as string[];
                                    const locationNames = orderLocationIds.length > 0 ? orderLocationIds.map(getLocationName).join(', ') : '不明';

                                    // Group lines by locationId
                                    const linesByLocation: Record<string, any[]> = {};
                                    order.lines.forEach((line: any) => {
                                        const locId = line.locationId || 'unknown';
                                        if (!linesByLocation[locId]) {
                                            linesByLocation[locId] = [];
                                        }
                                        linesByLocation[locId].push(line);
                                    });

                                    return (
                                        <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                                <div style={{ fontWeight: 'bold' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                                                {order.confirmedAt && (
                                                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                                        更新: {new Date(order.confirmedAt).toLocaleDateString()} {new Date(order.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                                <div style={{ fontWeight: 'bold', color: '#0056b3' }}>{locationNames}</div>
                                            </td>
                                            <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                                <div style={{ fontWeight: 'bold' }}>{getSupplierName(order.vendorId)}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#666' }}>締切: {new Date(order.cutoffAt).toLocaleDateString()}</div>
                                            </td>
                                            <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {Object.entries(linesByLocation).map(([locId, lines]) => {
                                                        const storeName = getLocationName(locId);
                                                        return (
                                                            <div key={locId} style={{
                                                                backgroundColor: '#f8f9fa',
                                                                borderRadius: '6px',
                                                                padding: '8px 12px',
                                                                borderLeft: '3px solid #0056b3'
                                                            }}>
                                                                <div style={{ fontWeight: 'bold', color: '#0056b3', fontSize: '0.88rem', marginBottom: '4px' }}>
                                                                    ■ {storeName}
                                                                </div>
                                                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem' }}>
                                                                    {lines.map((line: any) => (
                                                                        <li key={line.id} style={{ marginBottom: '3px' }}>
                                                                            {line.itemName} × <strong>{line.qty} {line.unit}</strong>
                                                                            {line.price !== null && (
                                                                                <span style={{ color: '#666', marginLeft: '8px' }}>(¥{line.price.toLocaleString()})</span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: style.bg,
                                                    color: style.color,
                                                    display: 'inline-block'
                                                }}>
                                                    {style.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                    {orders.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                            発注履歴はありません
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
