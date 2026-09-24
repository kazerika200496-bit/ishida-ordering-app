'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Location = { id: string; name: string; type: string };
type Employee = {
    id: string;
    employeeCode: string;
    name: string;
    locationId: string;
    employmentType: string | null;
    isActive: boolean;
    pinConfigured: boolean;
    location: Location;
};

type EmployeeForm = {
    employeeCode: string;
    name: string;
    locationId: string;
    employmentType: string;
    isActive: boolean;
};

const emptyForm: EmployeeForm = {
    employeeCode: '',
    name: '',
    locationId: '',
    employmentType: '',
    isActive: true,
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [form, setForm] = useState<EmployeeForm>(emptyForm);
    const [pin, setPin] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [employeesRes, locationsRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/locations'),
            ]);
            const employeesData = await employeesRes.json();
            const locationsData = await locationsRes.json();
            if (!employeesRes.ok) throw new Error(employeesData.error || '従業員一覧の取得に失敗しました。');
            if (!locationsRes.ok) throw new Error(locationsData.error || '拠点一覧の取得に失敗しました。');
            setEmployees(employeesData);
            setLocations(locationsData.filter((location: Location) => ['店舗', '工場'].includes(location.type)));
        } catch (err: any) {
            setError(err.message || 'データの取得に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyForm, locationId: locations[0]?.id || '' });
        setPin('');
        setError('');
        setShowForm(true);
    };

    const openEdit = (employee: Employee) => {
        setEditingId(employee.id);
        setForm({
            employeeCode: employee.employeeCode,
            name: employee.name,
            locationId: employee.locationId,
            employmentType: employee.employmentType || '',
            isActive: employee.isActive,
        });
        setPin('');
        setError('');
        setShowForm(true);
    };

    const closeForm = () => {
        if (!isSaving) setShowForm(false);
    };

    const saveEmployee = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.employeeCode.trim() || !form.name.trim() || !form.locationId) {
            setError('社員コード、氏名、所属拠点は必須です。');
            return;
        }
        if (!editingId && pin && !/^\d{4}$/.test(pin)) {
            setError('PINは4桁の数字で入力してください。');
            return;
        }

        setIsSaving(true);
        setError('');
        try {
            const endpoint = editingId ? `/api/employees/${editingId}` : '/api/employees';
            const response = await fetch(endpoint, {
                method: editingId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, ...(pin ? { pin } : {}) }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '保存に失敗しました。');
            setShowForm(false);
            await loadData();
        } catch (err: any) {
            setError(err.message || '保存に失敗しました。');
        } finally {
            setIsSaving(false);
        }
    };

    const updateStatus = async (employee: Employee) => {
        const nextIsActive = !employee.isActive;
        const message = nextIsActive
            ? 'この従業員を在籍中に戻しますか？'
            : 'この従業員を退職扱いにしますか？過去の記録は保持されます。';
        if (!window.confirm(message)) return;

        const response = await fetch(`/api/employees/${employee.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employeeCode: employee.employeeCode,
                name: employee.name,
                locationId: employee.locationId,
                employmentType: employee.employmentType,
                isActive: nextIsActive,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || '在籍状態の更新に失敗しました。');
            return;
        }
        await loadData();
    };

    const resetPin = async (employee: Employee) => {
        const newPin = window.prompt(`${employee.name}さんの新しい4桁PINを入力してください。`);
        if (newPin === null) return;
        if (!/^\d{4}$/.test(newPin)) {
            setError('PINは4桁の数字で入力してください。');
            return;
        }
        const response = await fetch(`/api/employees/${employee.id}/pin`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: newPin }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || 'PINの設定に失敗しました。');
            return;
        }
        setError('');
        await loadData();
    };

    const visibleEmployees = employees.filter(employee => showInactive || employee.isActive);

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>従業員データを読み込み中...</div>;

    return (
        <div className="container" style={{ paddingBottom: '50px' }}>
            <header style={{ marginBottom: '25px' }}>
                <div className="header-title">従業員マスタ</div>
                <Link href="/admin" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px' }}>マスタ管理へ戻る</Link>
            </header>

            {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />
                    退職者を含める
                </label>
                <button onClick={openCreate} style={{ padding: '10px 16px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    従業員を追加
                </button>
            </div>

            {showForm && (
                <form onSubmit={saveEmployee} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #dbeafe', marginBottom: '20px' }}>
                    <h2 style={{ margin: '0 0 18px', fontSize: '18px' }}>{editingId ? '従業員を編集' : '従業員を新規登録'}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                        <label>社員コード<input required value={form.employeeCode} onChange={event => setForm({ ...form, employeeCode: event.target.value })} style={inputStyle} /></label>
                        <label>氏名<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} style={inputStyle} /></label>
                        <label>所属拠点<select required value={form.locationId} onChange={event => setForm({ ...form, locationId: event.target.value })} style={inputStyle}><option value="">選択してください</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}（{location.type}）</option>)}</select></label>
                        <label>雇用区分<input value={form.employmentType} onChange={event => setForm({ ...form, employmentType: event.target.value })} placeholder="例: パート" style={inputStyle} /></label>
                        {!editingId && <label>初期PIN（任意・4桁）<input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={event => setPin(event.target.value)} style={inputStyle} /></label>}
                    </div>
                    {editingId && <p style={{ fontSize: '13px', color: '#64748b', marginBottom: 0 }}>PINを変更する場合は、一覧の「PIN再設定」を使用してください。</p>}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}><button type="submit" disabled={isSaving} style={primaryButton}>{isSaving ? '保存中...' : '保存'}</button><button type="button" onClick={closeForm} style={secondaryButton}>キャンセル</button></div>
                </form>
            )}

            <div style={{ backgroundColor: '#fff', overflowX: 'auto', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                    <thead><tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}><th style={cellStyle}>社員コード</th><th style={cellStyle}>氏名</th><th style={cellStyle}>所属拠点</th><th style={cellStyle}>雇用区分</th><th style={cellStyle}>状態</th><th style={cellStyle}>PIN</th><th style={cellStyle}>操作</th></tr></thead>
                    <tbody>{visibleEmployees.map(employee => <tr key={employee.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: employee.isActive ? 1 : 0.6 }}><td style={cellStyle}>{employee.employeeCode}</td><td style={cellStyle}>{employee.name}</td><td style={cellStyle}>{employee.location.name}（{employee.location.type}）</td><td style={cellStyle}>{employee.employmentType || '-'}</td><td style={cellStyle}>{employee.isActive ? '在籍' : '退職'}</td><td style={cellStyle}>{employee.pinConfigured ? '設定済み' : '未設定'}</td><td style={{ ...cellStyle, whiteSpace: 'nowrap' }}><button onClick={() => openEdit(employee)} style={smallButton}>編集</button>{employee.isActive ? <button onClick={() => updateStatus(employee)} style={smallButton}>退職にする</button> : <button onClick={() => updateStatus(employee)} style={smallButton}>在籍に戻す</button>}<button onClick={() => resetPin(employee)} style={smallButton}>PIN再設定</button></td></tr>)}</tbody>
                </table>
                {visibleEmployees.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>登録されている従業員はいません。</div>}
            </div>
        </div>
    );
}

const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box' as const, marginTop: '6px', padding: '9px', border: '1px solid #cbd5e1', borderRadius: '5px' };
const cellStyle = { padding: '11px 10px', fontSize: '13px' };
const primaryButton = { padding: '9px 18px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const secondaryButton = { padding: '9px 18px', backgroundColor: '#fff', color: '#374151', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer' };
const smallButton = { marginRight: '5px', padding: '5px 8px', backgroundColor: '#fff', color: '#1a73e8', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
