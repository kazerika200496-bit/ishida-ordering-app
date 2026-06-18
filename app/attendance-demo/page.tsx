'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

// --- Types ---
interface DayRecord {
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    memo: string;
}

interface Employee {
    id: string;
    name: string;
    type: '店舗' | '工場';
    records: DayRecord[];
}

// --- Constants ---
const DUMMY_EMPLOYEES: Employee[] = [
    {
        id: '1',
        name: '店舗 Aさん',
        type: '店舗',
        records: generateInitialRecords('2026-06-01')
    },
    {
        id: '2',
        name: '工場 Bさん',
        type: '工場',
        records: generateInitialRecords('2026-06-01')
    },
    {
        id: '3',
        name: '店舗 Cさん',
        type: '店舗',
        records: generateInitialRecords('2026-06-01')
    }
];

function generateInitialRecords(startDateStr: string): DayRecord[] {
    const records: DayRecord[] = [];
    const startDate = new Date(startDateStr);
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        records.push({
            date: d.toISOString().split('T')[0],
            startTime: isWeekend ? '' : '09:00',
            endTime: isWeekend ? '' : '18:00',
            breakMinutes: isWeekend ? 0 : 60,
            memo: ''
        });
    }
    return records;
}

// --- Helper Functions ---
function calculateMinutes(start: string, end: string): number {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return diff > 0 ? diff : 0;
}

function formatMinutes(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
}

// --- Component ---
export default function AttendanceDemoPage() {
    const [employees, setEmployees] = useState<Employee[]>(DUMMY_EMPLOYEES);
    const [activeId, setActiveId] = useState<string>('1');

    const activeEmployee = employees.find(e => e.id === activeId)!;

    const handleUpdate = (date: string, field: keyof DayRecord, value: string | number) => {
        setEmployees(prev => prev.map(emp => {
            if (emp.id !== activeId) return emp;
            return {
                ...emp,
                records: emp.records.map(r => r.date === date ? { ...r, [field]: value } : r)
            };
        }));
    };

    const stats = useMemo(() => {
        let totalWorking = 0;
        let totalOvertime = 0;
        let missingCount = 0;

        activeEmployee.records.forEach(r => {
            const workMins = calculateMinutes(r.startTime, r.endTime) - r.breakMinutes;
            const actualWork = Math.max(0, workMins);
            totalWorking += actualWork;
            if (actualWork > 8 * 60) {
                totalOvertime += (actualWork - 8 * 60);
            }
            if ((r.startTime && !r.endTime) || (!r.startTime && r.endTime)) {
                missingCount++;
            }
        });

        return { totalWorking, totalOvertime, missingCount };
    }, [activeEmployee]);

    const csvPreview = useMemo(() => {
        const header = "社員ID,名前,日付,出勤,退勤,休憩(分),実働(分),残業(分)\n";
        const rows = activeEmployee.records.map(r => {
            const workMins = Math.max(0, calculateMinutes(r.startTime, r.endTime) - r.breakMinutes);
            const overtimeMins = workMins > 8 * 60 ? workMins - 8 * 60 : 0;
            return `${activeEmployee.id},${activeEmployee.name},${r.date},${r.startTime},${r.endTime},${r.breakMinutes},${workMins},${overtimeMins}`;
        }).join('\n');
        return header + rows;
    }, [activeEmployee]);

    return (
        <div className="container" style={{ paddingBottom: '40px' }}>
            <header style={{ marginBottom: '20px' }}>
                <div className="header-title">勤怠集計デモ (試作版)</div>
                <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px' }}>ホームへ戻る</Link>
            </header>

            <div className="alert alert-success" style={{ textAlign: 'left', display: 'block', padding: '15px', marginBottom: '20px' }}>
                <div className="alert-message" style={{ fontSize: '14px', marginBottom: '8px' }}>
                    💡 これは開発中のデモ画面です
                </div>
                <p style={{ fontSize: '12px', margin: 0, color: '#2f855a' }}>
                    本番のDBには保存されません。従業員を切り替えて、出退勤時間を自由に変更してみてください。
                    1日8時間を超えると自動的に残業としてカウントされます。
                </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
                {employees.map(emp => (
                    <button
                        key={emp.id}
                        onClick={() => setActiveId(emp.id)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            backgroundColor: activeId === emp.id ? 'var(--primary-color)' : '#fff',
                            color: activeId === emp.id ? '#fff' : '#333',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontWeight: 'bold'
                        }}
                    >
                        {emp.name} ({emp.type})
                    </button>
                ))}
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ fontSize: '18px', margin: 0 }}>{activeEmployee.name} の勤怠 (2026年6月)</h2>
                    {stats.missingCount > 0 && (
                        <span style={{ fontSize: '12px', color: '#d93025', fontWeight: 'bold' }}>
                            ⚠️ 打刻漏れ: {stats.missingCount}件
                        </span>
                    )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>日付</th>
                                <th style={{ padding: '10px' }}>出勤</th>
                                <th style={{ padding: '10px' }}>退勤</th>
                                <th style={{ padding: '10px' }}>休憩(分)</th>
                                <th style={{ padding: '10px' }}>実働</th>
                                <th style={{ padding: '10px' }}>残業</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeEmployee.records.map(r => {
                                const workMins = calculateMinutes(r.startTime, r.endTime) - r.breakMinutes;
                                const isError = (r.startTime && !r.endTime) || (!r.startTime && r.endTime);
                                const isOvertime = workMins > 8 * 60;

                                return (
                                    <tr key={r.date} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isError ? '#fff5f5' : 'transparent' }}>
                                        <td style={{ padding: '10px' }}>{r.date.split('-')[2]}日</td>
                                        <td style={{ padding: '5px' }}>
                                            <input
                                                type="time"
                                                value={r.startTime}
                                                onChange={e => handleUpdate(r.date, 'startTime', e.target.value)}
                                                style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '5px' }}>
                                            <input
                                                type="time"
                                                value={r.endTime}
                                                onChange={e => handleUpdate(r.date, 'endTime', e.target.value)}
                                                style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', borderColor: isError ? '#d93025' : '#ddd' }}
                                            />
                                        </td>
                                        <td style={{ padding: '5px' }}>
                                            <input
                                                type="number"
                                                value={r.breakMinutes}
                                                onChange={e => handleUpdate(r.date, 'breakMinutes', Number(e.target.value))}
                                                style={{ width: '60px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>
                                            {workMins > 0 ? formatMinutes(workMins) : '-'}
                                        </td>
                                        <td style={{ padding: '10px', color: isOvertime ? '#d93025' : 'inherit', fontWeight: isOvertime ? 'bold' : 'normal' }}>
                                            {isOvertime ? formatMinutes(workMins - 8 * 60) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>期間中 合計勤務</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{formatMinutes(stats.totalWorking)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#d93025' }}>期間中 合計残業</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d93025' }}>{formatMinutes(stats.totalOvertime)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button 
                                onClick={() => alert('デモ版のためダウンロードはできませんが、以下の形式でCSV出力されます。\n\n' + csvPreview)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                ↓ 集計CSV出力 (仮)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '30px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#64748b' }}>CSVプレビューイメージ</h3>
                <pre style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', margin: 0 }}>
                    {csvPreview}
                </pre>
            </div>
        </div>
    );
}
