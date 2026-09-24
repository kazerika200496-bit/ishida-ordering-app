'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Employee = {
    id: string;
    employeeCode: string;
    name: string;
    isActive: boolean;
};

type Attendance = {
    id: string;
    employeeId: string;
    locationId: string;
    date: string;
    clockIn: string | null;
    clockOut: string | null;
    breakMinutes: number;
    status: string;
    employee: Employee;
    location: { id: string; name: string; type: string };
};

function today() {
    return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string | null) {
    return value ? new Date(value).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-';
}

export default function AttendancePage() {
    const [date, setDate] = useState(today());
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [records, setRecords] = useState<Attendance[]>([]);
    const [breakMinutes, setBreakMinutes] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [employeesResponse, attendanceResponse] = await Promise.all([
                fetch('/api/employees'),
                fetch(`/api/attendance?date=${encodeURIComponent(date)}`),
            ]);
            const employeesData = await employeesResponse.json();
            const attendanceData = await attendanceResponse.json();
            if (!employeesResponse.ok) throw new Error(employeesData.error || '従業員一覧の取得に失敗しました。');
            if (!attendanceResponse.ok) throw new Error(attendanceData.error || '勤怠一覧の取得に失敗しました。');
            setEmployees(employeesData.filter((employee: Employee) => employee.isActive));
            setRecords(attendanceData);
            setError('');
        } catch (err: any) {
            setError(err.message || '勤怠データの取得に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    }, [date]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const recordByEmployee = new Map(records.map(record => [record.employeeId, record]));

    const submitAction = async (employee: Employee, action: 'clock-in' | 'clock-out') => {
        const record = recordByEmployee.get(employee.id);
        let selectedBreak = 0;
        if (action === 'clock-out') {
            const value = breakMinutes[employee.id] ?? String(record?.breakMinutes ?? 0);
            selectedBreak = Number(value);
            if (!Number.isInteger(selectedBreak) || selectedBreak < 0) {
                setError('休憩分数は0以上の整数で入力してください。');
                return;
            }
        }

        setBusyId(employee.id);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId: employee.id, action, date, ...(action === 'clock-out' ? { breakMinutes: selectedBreak } : {}) }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '勤怠の保存に失敗しました。');
            setMessage(action === 'clock-in' ? `${employee.name}さんの出勤を登録しました。` : `${employee.name}さんの退勤を登録しました。`);
            await loadData();
        } catch (err: any) {
            setError(err.message || '勤怠の保存に失敗しました。');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '50px' }}>
            <header style={{ marginBottom: '25px' }}>
                <div className="header-title">日次勤怠</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link href="/admin/employees" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px' }}>従業員マスタ</Link>
                    <Link href="/admin" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px' }}>マスタ管理へ戻る</Link>
                </div>
            </header>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <label>対象日 <input type="date" value={date} onChange={event => setDate(event.target.value)} style={inputStyle} /></label>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}
            {message && <div className="alert alert-success" style={{ marginBottom: '15px' }}>{message}</div>}

            {isLoading ? <div style={{ padding: '35px', textAlign: 'center' }}>勤怠データを読み込み中...</div> : (
                <div style={{ backgroundColor: '#fff', overflowX: 'auto', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                        <thead><tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}><th style={cellStyle}>社員コード</th><th style={cellStyle}>氏名</th><th style={cellStyle}>所属拠点</th><th style={cellStyle}>出勤</th><th style={cellStyle}>退勤</th><th style={cellStyle}>休憩分</th><th style={cellStyle}>状態</th><th style={cellStyle}>操作</th></tr></thead>
                        <tbody>{employees.map(employee => {
                            const record = recordByEmployee.get(employee.id);
                            const isWorking = Boolean(record?.clockIn && !record.clockOut);
                            const isCompleted = Boolean(record?.clockOut);
                            return <tr key={employee.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={cellStyle}>{employee.employeeCode}</td>
                                <td style={cellStyle}>{employee.name}</td>
                                <td style={cellStyle}>{record?.location.name || '-'}</td>
                                <td style={cellStyle}>{formatTime(record?.clockIn || null)}</td>
                                <td style={cellStyle}>{formatTime(record?.clockOut || null)}</td>
                                <td style={cellStyle}><input type="number" min="0" step="1" value={breakMinutes[employee.id] ?? String(record?.breakMinutes ?? 0)} onChange={event => setBreakMinutes({ ...breakMinutes, [employee.id]: event.target.value })} disabled={!isWorking || busyId === employee.id} style={{ ...inputStyle, width: '80px' }} /></td>
                                <td style={cellStyle}>{isCompleted ? '退勤済み' : isWorking ? '出勤中' : '未打刻'}</td>
                                <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                                    {!record && <button onClick={() => submitAction(employee, 'clock-in')} disabled={busyId === employee.id} style={smallButton}>出勤</button>}
                                    {isWorking && <button onClick={() => submitAction(employee, 'clock-out')} disabled={busyId === employee.id} style={smallButton}>退勤</button>}
                                    {!record && <span style={{ color: '#64748b', fontSize: '12px' }}>未打刻</span>}
                                    {isCompleted && <span style={{ color: '#64748b', fontSize: '12px' }}>完了</span>}
                                </td>
                            </tr>;
                        })}</tbody>
                    </table>
                    {employees.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>在籍中の従業員がいません。</div>}
                </div>
            )}
        </div>
    );
}

const inputStyle = { padding: '8px', border: '1px solid #cbd5e1', borderRadius: '5px' };
const cellStyle = { padding: '11px 10px', fontSize: '13px' };
const smallButton = { marginRight: '5px', padding: '6px 10px', backgroundColor: '#fff', color: '#1a73e8', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
