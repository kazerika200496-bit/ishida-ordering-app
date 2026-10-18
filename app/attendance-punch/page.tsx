'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface StaffItem {
    id: string;
    employeeCode: string;
    name: string;
    locationId: string;
    pinConfigured: boolean;
    todayStatus: 'NONE' | 'WORKING' | 'COMPLETED';
    clockIn: string | null;
    clockOut: string | null;
    breakMinutes: number;
}

export default function AttendancePunchPage() {
    const [staffList, setStaffList] = useState<StaffItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [view, setView] = useState<'SELECT' | 'PIN' | 'ACTION' | 'BREAK'>('SELECT');
    const [breakMinutes, setBreakMinutes] = useState<number>(0);
    const [customBreak, setCustomBreak] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' }>({ text: '', type: 'info' });
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    const selectedStaff = staffList.find(s => s.id === selectedStaffId);

    // Live clock update
    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchStaffList = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/attendance/punch');
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || '従業員情報の取得に失敗しました。');
            }
            const data = await res.json();
            setStaffList(data);
            setError('');
        } catch (err: any) {
            setError(err.message || 'データ取得エラー');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStaffList();
    }, [fetchStaffList]);

    const resetState = useCallback((delayMs = 3000) => {
        setTimeout(() => {
            setSelectedStaffId(null);
            setPinInput('');
            setView('SELECT');
            setMessage({ text: '', type: 'info' });
            setBreakMinutes(0);
            setCustomBreak('');
            fetchStaffList();
        }, delayMs);
    }, [fetchStaffList]);

    const handleStaffSelect = (staff: StaffItem) => {
        if (!staff.pinConfigured) {
            setMessage({ text: `${staff.name}さんはPINが設定されていません。管理者に設定を依頼してください。`, type: 'error' });
            return;
        }
        if (staff.todayStatus === 'COMPLETED') {
            setMessage({ text: `${staff.name}さんは本日の退勤打刻がすでに完了しています。`, type: 'info' });
        } else {
            setMessage({ text: '', type: 'info' });
        }
        setSelectedStaffId(staff.id);
        setPinInput('');
        setView('PIN');
    };

    const handlePinClick = (num: string) => {
        if (pinInput.length < 4) {
            const nextPin = pinInput + num;
            setPinInput(nextPin);
            if (nextPin.length === 4) {
                // Auto proceed to action view when 4 digits entered
                setView('ACTION');
            }
        }
    };

    const handlePunch = async (action: 'clock-in' | 'clock-out', selectedBreak?: number) => {
        if (!selectedStaffId) return;

        setIsSubmitting(true);
        setMessage({ text: '打刻処理中...', type: 'info' });

        try {
            const res = await fetch('/api/attendance/punch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedStaffId,
                    pin: pinInput,
                    action,
                    breakMinutes: action === 'clock-out' ? (selectedBreak ?? breakMinutes) : undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({ text: data.error || '打刻処理に失敗しました。', type: 'error' });
                if (res.status === 401 && data.error?.includes('PIN')) {
                    // PIN error -> return to PIN view
                    setPinInput('');
                    setView('PIN');
                }
                return;
            }

            setMessage({ text: data.message || '打刻が完了しました。', type: 'success' });
            resetState(3000);
        } catch (err: any) {
            setMessage({ text: '通信エラーが発生しました。', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const cancel = () => {
        setSelectedStaffId(null);
        setPinInput('');
        setView('SELECT');
        setMessage({ text: '', type: 'info' });
        setBreakMinutes(0);
        setCustomBreak('');
    };

    return (
        <div className="container" style={{ maxWidth: '560px', paddingBottom: '60px' }}>
            <header style={{ marginBottom: '15px' }}>
                <div className="header-title">勤怠打刻</div>
                <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '13px' }}>ホーム</Link>
            </header>

            {/* Live Clock Card */}
            <div style={{ textAlign: 'center', marginBottom: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--primary-color, #1a73e8)', fontFamily: 'monospace', letterSpacing: '1px' }}>
                    {currentTime
                        ? currentTime.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
                        : '--:--:--'}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
                    {currentTime
                        ? currentTime.toLocaleDateString('ja-JP', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' })
                        : '----年--月--日'}
                </div>
            </div>

            {/* Alert / Notification Message */}
            {message.text && (
                <div style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    backgroundColor: message.type === 'error' ? '#fee2e2' : message.type === 'success' ? '#d1fae5' : '#e0f2fe',
                    color: message.type === 'error' ? '#b91c1c' : message.type === 'success' ? '#047857' : '#0369a1',
                    border: `1px solid ${message.type === 'error' ? '#fca5a5' : message.type === 'success' ? '#6ee7b7' : '#7dd3fc'}`
                }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ padding: '24px', minHeight: '420px', display: 'flex', flexDirection: 'column' }}>

                {/* 1. SELECT STAFF VIEW */}
                {view === 'SELECT' && (
                    <>
                        <h2 style={{ fontSize: '17px', textAlign: 'center', marginBottom: '18px', color: '#334155' }}>自分の名前を選択してください</h2>

                        {loading && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>従業員情報を読み込み中...</div>
                        )}

                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>
                        )}

                        {!loading && !error && staffList.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                                この店舗・工場に所属する在籍従業員はいません。
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: '12px' }}>
                            {staffList.map(s => {
                                const isWorking = s.todayStatus === 'WORKING';
                                const isCompleted = s.todayStatus === 'COMPLETED';

                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => handleStaffSelect(s)}
                                        style={{
                                            padding: '16px 20px',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            borderRadius: '12px',
                                            border: '2px solid #e2e8f0',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <div>
                                            <span style={{ color: '#0f172a' }}>{s.name}</span>
                                            <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '10px' }}>({s.employeeCode})</span>
                                        </div>
                                        <div>
                                            {isWorking && (
                                                <span style={{ fontSize: '13px', backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
                                                    ● 出勤中
                                                </span>
                                            )}
                                            {isCompleted && (
                                                <span style={{ fontSize: '13px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
                                                    ✓ 退勤済
                                                </span>
                                            )}
                                            {!isWorking && !isCompleted && (
                                                <span style={{ fontSize: '13px', backgroundColor: '#f8fafc', color: '#94a3b8', padding: '4px 10px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                                    未打刻
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* 2. PIN INPUT VIEW */}
                {view === 'PIN' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>{selectedStaff?.name}さん</h2>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>4桁のPINコードを入力してください</p>

                        {/* Masked PIN Display */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                            {[0, 1, 2, 3].map(index => (
                                <div
                                    key={index}
                                    style={{
                                        width: '44px',
                                        height: '52px',
                                        borderRadius: '8px',
                                        border: '2px solid #cbd5e1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        backgroundColor: pinInput.length > index ? '#1a73e8' : '#f8fafc',
                                        color: '#fff',
                                    }}
                                >
                                    {pinInput.length > index ? '●' : ''}
                                </div>
                            ))}
                        </div>

                        {/* Numeric Keypad */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', maxWidth: '280px' }}>
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map(key => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        if (key === 'C') setPinInput('');
                                        else if (key === '←') setPinInput(prev => prev.slice(0, -1));
                                        else handlePinClick(key);
                                    }}
                                    style={{
                                        padding: '16px',
                                        fontSize: '22px',
                                        fontWeight: 'bold',
                                        borderRadius: '12px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: key === 'C' || key === '←' ? '#f1f5f9' : '#fff',
                                        color: key === 'C' ? '#dc2626' : '#0f172a',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={cancel}
                            style={{ marginTop: '24px', padding: '10px 20px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                        >
                            キャンセル
                        </button>
                    </div>
                )}

                {/* 3. ACTION VIEW (CLOCK IN / CLOCK OUT) */}
                {view === 'ACTION' && selectedStaff && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{selectedStaff.name}さん</h2>
                            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                                現在のステータス: {selectedStaff.todayStatus === 'WORKING' ? '出勤中' : selectedStaff.todayStatus === 'COMPLETED' ? '退勤済' : '未打刻'}
                            </div>
                        </div>

                        {selectedStaff.todayStatus === 'NONE' && (
                            <button
                                onClick={() => handlePunch('clock-in')}
                                disabled={isSubmitting}
                                style={{
                                    padding: '28px',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    borderRadius: '16px',
                                    backgroundColor: '#10b981',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                                    opacity: isSubmitting ? 0.7 : 1,
                                }}
                            >
                                {isSubmitting ? '処理中...' : '出勤する'}
                            </button>
                        )}

                        {selectedStaff.todayStatus === 'WORKING' && (
                            <button
                                onClick={() => setView('BREAK')}
                                disabled={isSubmitting}
                                style={{
                                    padding: '28px',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    borderRadius: '16px',
                                    backgroundColor: '#f59e0b',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                                    opacity: isSubmitting ? 0.7 : 1,
                                }}
                            >
                                退勤する (休憩時間を選択)
                            </button>
                        )}

                        {selectedStaff.todayStatus === 'COMPLETED' && (
                            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
                                本日の勤怠記録（出勤・退勤）はすでに完了しています。
                            </div>
                        )}

                        <button
                            onClick={cancel}
                            style={{ padding: '14px', color: '#64748b', background: 'none', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            キャンセル・戻る
                        </button>
                    </div>
                )}

                {/* 4. BREAK MINUTES SELECTION VIEW */}
                {view === 'BREAK' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                        <h2 style={{ fontSize: '18px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>本日の休憩時間を選択してください</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {[0, 15, 30, 45, 60, 90].map(mins => (
                                <button
                                    key={mins}
                                    onClick={() => handlePunch('clock-out', mins)}
                                    disabled={isSubmitting}
                                    style={{
                                        padding: '16px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        borderRadius: '10px',
                                        border: '2px solid #1a73e8',
                                        color: '#1a73e8',
                                        backgroundColor: '#fff',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {mins} 分
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <input
                                type="number"
                                min="0"
                                placeholder="その他 (分)"
                                value={customBreak}
                                onChange={e => setCustomBreak(e.target.value)}
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px' }}
                            />
                            <button
                                onClick={() => {
                                    const mins = Number(customBreak);
                                    if (Number.isInteger(mins) && mins >= 0) {
                                        handlePunch('clock-out', mins);
                                    } else {
                                        setMessage({ text: '0以上の数字を入力してください。', type: 'error' });
                                    }
                                }}
                                disabled={isSubmitting || !customBreak}
                                style={{ padding: '12px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                決定
                            </button>
                        </div>

                        <button
                            onClick={() => setView('ACTION')}
                            style={{ marginTop: '10px', padding: '10px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            戻る
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
