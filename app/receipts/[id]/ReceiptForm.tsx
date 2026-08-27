'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { FAVORITE_ACCOUNTS, TAX_CATEGORIES, PAYMENT_METHODS } from '@/lib/constants';

export default function ReceiptForm({ receipt }: { receipt: any }) {

    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // States
    const [payee, setPayee] = useState(receipt.payee || '');
    const [amount, setAmount] = useState(receipt.amount?.toString() || '');
    const [receiptDate, setReceiptDate] = useState(
        receipt.receiptDate ? new Date(receipt.receiptDate).toISOString().split('T')[0] : ''
    );
    const [taxAmount, setTaxAmount] = useState(receipt.taxAmount?.toString() || '');
    
    // New Fields
    const [slipNo, setSlipNo] = useState(receipt.slipNo || '');
    
    // Account Field (Code + Name combined for UI)
    const initialAccount = receipt.accountCode 
        ? (receipt.accountName ? `${receipt.accountCode} ${receipt.accountName}` : receipt.accountCode) 
        : (receipt.accountName || '');
    const [accountInput, setAccountInput] = useState(initialAccount);

    const [subAccount, setSubAccount] = useState(receipt.subAccount || '');
    const [description, setDescription] = useState(receipt.description || '');
    const [taxCategory, setTaxCategory] = useState(receipt.taxCategory || '');
    const [paymentMethod, setPaymentMethod] = useState(receipt.paymentMethod || '');
    const [memo, setMemo] = useState(receipt.memo || ''); // For internal note

    // Validation
    const isValid = payee.trim() !== '' && amount.trim() !== '' && receiptDate !== '';

    // Check if account code is missing but name is present
    const isCodeMissing = (() => {
        const trimmed = accountInput.trim();
        if (!trimmed) return false;
        const match = trimmed.match(/^(\d+)\s+(.+)$/);
        return !match;
    })();

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) {
            alert('必須項目（支払先、日付、合計金額）をすべて入力してください。');
            return;
        }

        setIsSubmitting(true);

        // Parse Account Input
        let submitCode = '';
        let submitName = accountInput.trim();
        const match = accountInput.trim().match(/^(\d+)\s+(.+)$/);
        if (match) {
            submitCode = match[1];
            submitName = match[2];
        }

        try {
            const res = await fetch('/api/receipts/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiptId: receipt.id,
                    slipNo,
                    receiptDate,
                    payee,
                    amount,
                    taxAmount,
                    accountCode: submitCode,
                    accountName: submitName,
                    subAccount,
                    description,
                    taxCategory,
                    paymentMethod,
                    memo
                })
            });
            if (res.ok) {
                router.push('/receipts');
                router.refresh();
            } else {
                alert('保存に失敗しました');
            }
        } catch (err) {
            alert('通信エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('この領収書データを完全に削除しますか？\n削除したデータは元に戻せません。')) {
            return;
        }

        setIsDeleting(true);

        try {
            const res = await fetch(`/api/receipts/${receipt.id}`, {
                method: 'DELETE',
            });
            const data = await res.json();

            if (res.ok && data.success) {
                alert('削除しました。');
                router.push('/receipts');
                router.refresh();
            } else {
                alert(data.error || '削除に失敗しました。');
            }
        } catch (err) {
            alert('通信エラーが発生しました。');
        } finally {
            setIsDeleting(false);
        }
    };

    const inputStyle = {
        width: '100%',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        padding: '10px',
        fontSize: '14px',
        boxSizing: 'border-box' as const
    };

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#475569',
        marginBottom: '6px'
    };

    const requiredBadge = (
        <span style={{ fontSize: '10px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>
            必須
        </span>
    );

    return (
        <form onSubmit={handleConfirm}>
            <div className="form-row">
                <div className="form-col">
                    <label style={labelStyle}>日付 {requiredBadge}</label>
                    <input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        required
                        placeholder="YYYY/MM/DD"
                        style={{ ...inputStyle, borderColor: !receiptDate ? '#fca5a5' : '#cbd5e1', backgroundColor: !receiptDate ? '#fef2f2' : '#fff' }}
                    />
                </div>
                <div className="form-col">
                    <label style={labelStyle}>伝票No.</label>
                    <input
                        type="text"
                        value={slipNo}
                        onChange={(e) => setSlipNo(e.target.value)}
                        style={{ ...inputStyle, backgroundColor: '#f8fafc' }}
                        placeholder="任意"
                    />
                </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>支払先 (店名) {requiredBadge}</label>
                <input
                    type="text"
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                    required
                    style={{ ...inputStyle, borderColor: !payee.trim() ? '#fca5a5' : '#cbd5e1', backgroundColor: !payee.trim() ? '#fef2f2' : '#fff' }}
                />
                {!payee.trim() && (
                    <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                        ※手入力してください（OCR未接続のため）
                    </div>
                )}
            </div>

            <div className="form-row" style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <div className="form-col">
                    <label style={labelStyle}>勘定科目</label>
                    <select
                        value={accountInput}
                        onChange={(e) => setAccountInput(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="">勘定科目を選択してください</option>
                        {accountInput && !FAVORITE_ACCOUNTS.includes(accountInput) && (
                            <option value={accountInput}>{accountInput}</option>
                        )}
                        {FAVORITE_ACCOUNTS.map(acc => (
                            <option key={acc} value={acc}>{acc}</option>
                        ))}
                    </select>
                    {isCodeMissing && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fffbeb', color: '#b45309', fontSize: '12px', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                            ⚠️ 勘定科目コード未設定 (社内確認用としてはこのままで保存可能です)
                        </div>
                    )}
                </div>
                <div className="form-col">
                    <label style={labelStyle}>補助科目</label>
                    <input
                        type="text"
                        value={subAccount}
                        onChange={(e) => setSubAccount(e.target.value)}
                        style={inputStyle}
                        placeholder="任意"
                    />
                </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>摘要 (購入内容など)</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={inputStyle}
                    placeholder="品代、飲食代など"
                />
            </div>

            <div className="form-row" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <div className="form-col">
                    <label style={labelStyle}>支払方法</label>
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="">未選択</option>
                        {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
                    </select>
                </div>
                <div className="form-col">
                    <label style={labelStyle}>税区分</label>
                    <select
                        value={taxCategory}
                        onChange={(e) => setTaxCategory(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="">未選択</option>
                        {TAX_CATEGORIES.map(tax => <option key={tax} value={tax}>{tax}</option>)}
                    </select>
                </div>
            </div>

            <div className="form-row" style={{ paddingTop: '15px' }}>
                <div className="form-col">
                    <label style={labelStyle}>合計金額 {requiredBadge}</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '16px', borderColor: !amount.trim() ? '#fca5a5' : '#cbd5e1', backgroundColor: !amount.trim() ? '#fef2f2' : '#fff' }}
                    />
                </div>
                <div className="form-col">
                    <label style={labelStyle}>消費税額</label>
                    <input
                        type="number"
                        value={taxAmount}
                        onChange={(e) => setTaxAmount(e.target.value)}
                        style={{ ...inputStyle, fontFamily: 'monospace', backgroundColor: '#f8fafc' }}
                        placeholder="任意"
                    />
                </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>内部メモ <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#94a3b8' }}>(CSVには出力されません)</span></label>
                <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    style={{ ...inputStyle, height: '80px', resize: 'none', backgroundColor: '#f8fafc' }}
                    placeholder="後から確認するためのメモ"
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                <button 
                    type="button" 
                    onClick={handleDelete}
                    disabled={isDeleting || isSubmitting}
                    className="btn-outline"
                    style={{ 
                        padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: (isDeleting || isSubmitting) ? 'not-allowed' : 'pointer',
                        borderColor: '#ef4444', color: '#ef4444', marginRight: 'auto',
                        opacity: (isDeleting || isSubmitting) ? 0.5 : 1
                    }}
                >
                    {isDeleting ? '削除中...' : '🗑️ 削除する'}
                </button>
                <button 
                    type="button" 
                    onClick={() => router.push('/receipts')} 
                    className="btn-outline"
                    style={{ padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    キャンセル
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className="btn-primary"
                    style={{ 
                        padding: '10px 30px', borderRadius: '6px', fontWeight: 'bold', cursor: (!isValid || isSubmitting) ? 'not-allowed' : 'pointer',
                        opacity: (!isValid || isSubmitting) ? 0.5 : 1
                    }}
                >
                    {isSubmitting ? '保存中...' : '確定して保存'}
                </button>
            </div>
        </form>
    );
}
