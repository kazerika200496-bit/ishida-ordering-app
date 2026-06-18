'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// --- Types ---
interface PunchRecord {
    id: string;
    type: 'IN' | 'OUT';
    time: Date;
    breakMinutes?: number;
}

interface Staff {
    id: string;
    name: string;
    pin: string;
    status: 'OUT' | 'IN';
    history: PunchRecord[];
}

// --- Initial Dummy Data ---
const INITIAL_STAFF: Staff[] = [
    { id: '1', name: '石田 太郎', pin: '1111', status: 'OUT', history: [] },
    { id: '2', name: '佐藤 花子', pin: '2222', status: 'OUT', history: [] },
    { id: '3', name: '鈴木 一郎', pin: '3333', status: 'OUT', history: [] },
];

// --- Component ---
export default function AttendancePunchDemoPage() {
    const [staffList, setStaffList] = useState<Staff[]>(INITIAL_STAFF);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [view, setView] = useState<'SELECT' | 'PIN' | 'ACTION' | 'BREAK'>('SELECT');
    const [message, setMessage] = useState({ text: '', type: 'info' });
    const [currentTime, setCurrentTime] = useState(new Date());

    const selectedStaff = staffList.find(s => s.id === selectedStaffId);

    // Update Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // --- Actions ---
    const handleStaffSelect = (id: string) => {
        setSelectedStaffId(id);
        setPinInput('');
        setView('PIN');
    };

    const handlePinClick = (num: string) => {
        if (pinInput.length < 4) {
            const newPin = pinInput + num;
            setPinInput(newPin);
            if (newPin.length === 4) {
                if (selectedStaff && newPin === selectedStaff.pin) {
                    setView('ACTION');
                    setMessage({ text: '', type: 'info' });
                } else {
                    setMessage({ text: 'PINコードが違います。', type: 'error' });
                    setPinInput('');
                }
            }
        }
    };

    const handlePunchIn = () => {
        if (!selectedStaffId) return;
        const now = new Date();
        setStaffList(prev => prev.map(s => s.id === selectedStaffId ? {
            ...s,
            status: 'IN',
            history: [{ id: Math.random().toString(), type: 'IN', time: now }, ...s.history]
        } : s));
        setMessage({ text: `${selectedStaff?.name}さん、おはようございます！`, type: 'success' });
        resetState();
    };

    const handlePunchOutRequest = () => {
        setView('BREAK');
    };

    const handlePunchOutFinal = (breakMinutes: number) => {
        if (!selectedStaffId) return;
        const now = new Date();
        setStaffList(prev => prev.map(s => s.id === selectedStaffId ? {
            ...s,
            status: 'OUT',
            history: [{ id: Math.random().toString(), type: 'OUT', time: now, breakMinutes }, ...s.history]
        } : s));
        setMessage({ text: `${selectedStaff?.name}さん、お疲れ様でした！`, type: 'success' });
        resetState();
    };

    const resetState = () => {
        setTimeout(() => {
            setSelectedStaffId(null);
            setPinInput('');
            setView('SELECT');
            setMessage({ text: '', type: 'info' });
        }, 3000);
    };

    const cancel = () => {
        setSelectedStaffId(null);
        setPinInput('');
        setView('SELECT');
        setMessage({ text: '', type: 'info' });
    };

    // --- Admin Views ---
    const workingStaff = staffList.filter(s => s.status === 'IN');
    const finishedStaff = staffList.filter(s => s.status === 'OUT' && s.history.length > 0);

    return (
        <div className="container" style={{ maxWidth: '500px', paddingBottom: '60px' }}>
            <header style={{ marginBottom: '15px' }}>
                <div className="header-title">打刻機シミュレーター</div>
                <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '13px' }}>ホーム</Link>
            </header>

            <div style={{ textAlign: 'center', marginBottom: '20px', padding: '15px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary-color)', fontFamily: 'monospace' }}>
                    {currentTime.toLocaleTimeString('ja-JP')}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                    {currentTime.toLocaleDateString('ja-JP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>※本番ではサーバー時刻で保存されます</div>
            </div>

            {message.text && (
                <div style={{ 
                    padding: '15px', 
                    borderRadius: '8px', 
                    marginBottom: '20px', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: message.type === 'error' ? '#fee2e2' : '#d1fae5',
                    color: message.type === 'error' ? '#b91c1c' : '#047857',
                    border: `1px solid ${message.type === 'error' ? '#fca5a5' : '#10b981'}`
                }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ padding: '20px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                
                {view === 'SELECT' && (
                    <>
                        <h2 style={{ fontSize: '16px', textAlign: 'center', marginBottom: '20px' }}>名前を選んでください</h2>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {staffList.map(s => (
                                <button 
                                    key={s.id} 
                                    onClick={() => handleStaffSelect(s.id)}
                                    style={{ 
                                        padding: '18px', 
                                        fontSize: '18px', 
                                        fontWeight: 'bold',
                                        borderRadius: '12px', 
                                        border: '2px solid #e2e8f0',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    {s.name}
                                    <span style={{ fontSize: '12px', color: s.status === 'IN' ? '#10b981' : '#94a3b8' }}>
                                        {s.status === 'IN' ? '● 出勤中' : '○ 勤務外'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {view === 'PIN' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '16px', marginBottom: '10px' }}>{selectedStaff?.name}さん</h2>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>PINコードを入力してください</p>
                        <div style={{ fontSize: '24px', letterSpacing: '10px', height: '40px', fontWeight: 'bold' }}>
                            {'●'.repeat(pinInput.length)}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%', maxWidth: '240px', marginTop: '20px' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '←'].map(key => (
                                <button 
                                    key={key} 
                                    onClick={() => {
                                        if (key === 'C') setPinInput('');
                                        else if (key === '←') setPinInput(pinInput.slice(0, -1));
                                        else handlePinClick(key.toString());
                                    }}
                                    style={{ padding: '15px', fontSize: '20px', fontWeight: 'bold', borderRadius: '10px', border: '1px solid #ddd', backgroundColor: '#f8fafc', cursor: 'pointer' }}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                        <button onClick={cancel} style={{ marginTop: '20px', padding: '10px', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>キャンセル</button>
                    </div>
                )}

                {view === 'ACTION' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
                        <h2 style={{ fontSize: '20px', textAlign: 'center' }}>{selectedStaff?.name}さん</h2>
                        {selectedStaff?.status === 'OUT' ? (
                            <button 
                                onClick={handlePunchIn}
                                style={{ padding: '30px', fontSize: '24px', fontWeight: 'bold', borderRadius: '16px', backgroundColor: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                            >
                                出勤
                            </button>
                        ) : (
                            <button 
                                onClick={handlePunchOutRequest}
                                style={{ padding: '30px', fontSize: '24px', fontWeight: 'bold', borderRadius: '16px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                            >
                                退勤
                            </button>
                        )}
                        <button onClick={cancel} style={{ padding: '15px', color: '#666', background: 'none', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>キャンセル</button>
                    </div>
                )}

                {view === 'BREAK' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '15px' }}>
                        <h2 style={{ fontSize: '18px', textAlign: 'center' }}>今日の休憩時間を入力</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            {[0, 15, 30, 45, 60, 90].map(mins => (
                                <button 
                                    key={mins}
                                    onClick={() => handlePunchOutFinal(mins)}
                                    style={{ padding: '15px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #1a73e8', color: '#1a73e8', backgroundColor: '#fff', cursor: 'pointer' }}
                                >
                                    {mins}分
                                </button>
                            ))}
                        </div>
                        <div style={{ marginTop: '10px' }}>
                           <input type="number" placeholder="その他(分)" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} onKeyPress={(e) => {
                               if (e.key === 'Enter') handlePunchOutFinal(Number((e.target as HTMLInputElement).value));
                           }} />
                        </div>
                        <button onClick={() => setView('ACTION')} style={{ marginTop: '10px', padding: '10px', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>戻る</button>
                    </div>
                )}
            </div>

            {/* Admin/Debug Info (Simulation only) */}
            <div className="card" style={{ marginTop: '30px', backgroundColor: '#f8fafc' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    管理者・確認用表示
                </h3>
                <div style={{ fontSize: '13px' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>現在の出勤中:</strong> {workingStaff.length > 0 ? workingStaff.map(s => s.name).join(', ') : 'なし'}
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <strong>今日の打刻履歴:</strong>
                        <div style={{ marginTop: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                            {staffList.flatMap(s => s.history.map(h => ({ name: s.name, ...h })))
                                .sort((a, b) => b.time.getTime() - a.time.getTime())
                                .map(log => (
                                    <div key={log.id} style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                                        {log.time.toLocaleTimeString('ja-JP')} [{log.type === 'IN' ? '出勤' : '退勤'}] {log.name} 
                                        {log.breakMinutes !== undefined && ` (休憩 ${log.breakMinutes}分)`}
                                    </div>
                                ))
                            }
                            {staffList.every(s => s.history.length === 0) && <div style={{ color: '#999' }}>履歴なし</div>}
                        </div>
                    </div>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px' }}>
                    ※PINコード: 石田太郎(1111), 佐藤花子(2222), 鈴木一郎(3333)
                </div>
            </div>
        </div>
    );
}
