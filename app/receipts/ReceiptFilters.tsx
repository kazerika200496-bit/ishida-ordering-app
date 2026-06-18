'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ReceiptFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [month, setMonth] = useState(searchParams.get('month') || '');
    const [account, setAccount] = useState(searchParams.get('account') || '');
    const [missingCode, setMissingCode] = useState(searchParams.get('missingCode') === 'true');

    useEffect(() => {
        setMonth(searchParams.get('month') || '');
        setAccount(searchParams.get('account') || '');
        setMissingCode(searchParams.get('missingCode') === 'true');
    }, [searchParams]);

    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (month) params.set('month', month);
        if (account) params.set('account', account);
        if (missingCode) params.set('missingCode', 'true');
        
        router.push(`/receipts?${params.toString()}`);
    };

    const handleClear = () => {
        setMonth('');
        setAccount('');
        setMissingCode(false);
        router.push('/receipts');
    };

    const inputStyle = {
        padding: '6px 10px',
        border: '1px solid #cbd5e1',
        borderRadius: '4px',
        fontSize: '13px'
    };

    return (
        <form onSubmit={handleApply} className="filter-form" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #e2e8f0'
        }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginRight: '5px' }}>
                🔍 絞り込み検索:
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#475569' }}>対象月:</label>
                <input 
                    type="month" 
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    style={inputStyle}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#475569' }}>勘定科目:</label>
                <input 
                    type="text"
                    placeholder="例: 消耗品費"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    style={{ ...inputStyle, width: '120px' }}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input 
                        type="checkbox"
                        checked={missingCode}
                        onChange={(e) => setMissingCode(e.target.checked)}
                    />
                    コード未設定のみ表示
                </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button type="button" onClick={handleClear} style={{ ...inputStyle, backgroundColor: '#fff', cursor: 'pointer' }}>
                    クリア
                </button>
                <button type="submit" style={{ ...inputStyle, backgroundColor: '#10b981', color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    検索
                </button>
            </div>
        </form>
    );
}
