'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Item, Location, Supplier } from '../types';
import { normalizeCategory } from '@/lib/category';


const CATEGORIES = [
    '店舗備品',
    '工場備品',
    '洗剤・溶剤',
    'ハンガー',
    '包装・梱包',
    'タグ類',
    '書類伝票(店舗用)',
    '書類伝票(工場用)',
    '文具系',
    '看板・POP',
    'その他'
];

const CATEGORY_PREFIX_MAP: Record<string, string> = {
    '店舗備品': 'ST',
    '工場備品': 'KO',
    '洗剤・溶剤': 'SE',
    'ハンガー': 'HA',
    '包装・梱包': 'HO',
    'タグ類': 'TG',
    '書類伝票(店舗用)': 'DS',
    '書類伝票(工場用)': 'DK',
    '文具系': 'BU',
    '看板・POP': 'KP',
    'その他': 'OT',
};

const generateNextMaterialCode = (category: string, existingItems: Item[]): string => {
    const prefix = CATEGORY_PREFIX_MAP[category] || 'OT';
    const regex = new RegExp(`^${prefix}(\\d+)$`);
    let maxNum = 0;
    
    existingItems.forEach(item => {
        if (item.materialCode) {
            const match = item.materialCode.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) {
                    maxNum = num;
                }
            }
        }
    });
    
    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(3, '0');
    return `${prefix}${paddedNum}`;
};

const ItemImageUpload = ({ 
    item, 
    onUpdate,
    onUploadingChange
}: { 
    item: Item, 
    onUpdate: (url: string) => void,
    onUploadingChange?: (uploading: boolean) => void
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const previewUrlRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = null;
            }
        };
    }, []);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit size to 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert('ファイルサイズは5MB以下にしてください。');
            return;
        }

        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }

        const objectUrl = URL.createObjectURL(file);
        previewUrlRef.current = objectUrl;
        setPreviewUrl(objectUrl);
        setIsUploading(true);
        onUploadingChange?.(true);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: file,
            });

            const data = await res.json().catch((err) => {
                console.error('[ITEM IMAGE UPLOAD] json parse failed:', err);
                return {} as Record<string, any>;
            });

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            if (typeof data.url !== 'string' || !/^https?:\/\//.test(data.url) || data.url.startsWith('data:')) {
                throw new Error('Upload returned invalid URL');
            }

            onUpdate(data.url);
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = null;
            }
            setPreviewUrl(null);
        } catch (err: any) {
            alert('画像の保存に失敗しました。もう一度お試しください。改善しない場合は管理者に連絡してください。\n(詳細: ' + err.message + ')');
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = null;
            }
            setPreviewUrl(null);
        } finally {
            setIsUploading(false);
            onUploadingChange?.(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const displayUrl = previewUrl ?? item.imageUrl;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
                style={{ 
                    width: '50px', 
                    height: '50px', 
                    backgroundColor: '#f0f0f0', 
                    borderRadius: '4px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    overflow: 'hidden', 
                    flexShrink: 0,
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                    position: 'relative'
                }} 
                onClick={() => fileInputRef.current?.click()}
                title="画像をクリックしてアップロード"
            >
                {isUploading ? (
                    <div style={{ fontSize: '10px', textAlign: 'center' }}>
                        <div className="spinner" style={{ marginBottom: '2px' }}>⌛</div>
                        Loading
                    </div>
                ) : displayUrl ? (
                    <img src={displayUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="品目写真" />
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '20px', color: '#ccc' }}>🖼️</span>
                        <div style={{ fontSize: '8px', color: '#999' }}>画像なし</div>
                    </div>
                )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input 
                    value={item.imageUrl || ''} 
                    placeholder="URLを直接入力またはアップロード" 
                    onChange={e => onUpdate(e.target.value)} 
                    style={{ width: '100%', padding: '5px', border: '1px solid #eee', fontSize: '11px', borderRadius: '4px' }} 
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{ 
                        padding: '4px 8px', 
                        fontSize: '11px', 
                        backgroundColor: '#fff', 
                        border: '1px solid #1a73e8', 
                        color: '#1a73e8',
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                    }}
                >
                    {isUploading ? '⌛ 送信中...' : '📸 写真を選択・撮影'}
                </button>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
            />
        </div>
    );
};

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'locations' | 'suppliers' | 'items'>('items');
    const [adminCategoryFilter, setAdminCategoryFilter] = useState('すべて');

    const [items, setItems] = useState<Item[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingItemIds, setUploadingItemIds] = useState<Set<string>>(new Set());
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isAnyImageUploading = uploadingItemIds.size > 0;

    const setItemUploading = (itemId: string, uploading: boolean) => {
        setUploadingItemIds(prev => {
            const next = new Set(prev);
            if (uploading) {
                next.add(itemId);
            } else {
                next.delete(itemId);
            }
            return next;
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/master');
                const data = await res.json();
                if (!res.ok) throw new Error(data.details || data.error || `Master API Error ${res.status}`);
                setItems(data.items || []);
                setLocations(data.locations || []);
                setSuppliers(data.suppliers || []);
            } catch (err: any) {
                console.error('Failed to fetch master data:', err);
                setErrorMsg(err.message);
            } finally {
                setIsLoading(false);
                setIsMounted(true);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (isDirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [isDirty]);

    // --- Actions ---
    const updateItem = (id: string, field: keyof Item, value: any) => {
        setItems(items.map(i => {
            if (i.id === id) {
                const updated = { ...i, [field]: value };
                if (id.startsWith('new-') && field === 'category') {
                    const oldCategory = i.category;
                    const oldPrefix = CATEGORY_PREFIX_MAP[oldCategory] || 'OT';
                    const isAutoGenerated = !i.materialCode || i.materialCode.startsWith(oldPrefix);
                    
                    if (isAutoGenerated) {
                        const otherItems = items.filter(item => item.id !== id);
                        updated.materialCode = generateNextMaterialCode(value, otherItems);
                    }
                }
                return updated;
            }
            return i;
        }));
        setIsDirty(true);
    };

    const updateSupplier = (id: string, field: keyof Supplier, value: any) => {
        setSuppliers(suppliers.map(s => s.id === id ? { ...s, [field]: value } : s));
        setIsDirty(true);
    };

    const updateLocation = (id: string, field: keyof Location, value: any) => {
        setLocations(locations.map(l => l.id === id ? { ...l, [field]: value } : l));
        setIsDirty(true);
    };

    const addItem = () => {
        const defaultCategory = adminCategoryFilter === 'すべて' ? 'その他' : adminCategoryFilter;
        const nextCode = generateNextMaterialCode(defaultCategory, items);
        const newItem: Item = { 
            id: `new-${Date.now()}`, 
            materialCode: nextCode, 
            name: '', 
            price: 0, 
            unit: '', 
            category: defaultCategory, 
            defaultSupplierId: suppliers[0]?.id || '' 
        };
        setItems([...items, newItem]);
        setIsDirty(true);
    };

    const addLocation = () => {
        const newLoc: Location = { id: `new-${Date.now()}`, name: '', type: '店舗' };
        setLocations([...locations, newLoc]);
        setIsDirty(true);
    };

    const addSupplier = () => {
        const newSup: Supplier = { id: `new-${Date.now()}`, name: '', type: '業者', method: '訪問' };
        setSuppliers([...suppliers, newSup]);
        setIsDirty(true);
    };

    const deleteItem = async (id: string) => {
        if (!confirm('この品目を削除してもよろしいですか？')) return;
        if (!id.startsWith('new-')) {
            try {
                const res = await fetch(`/api/items?id=${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete');
            } catch (err) {
                alert('削除に失敗しました。');
                return;
            }
        }
        setItems(items.filter(i => i.id !== id));
        setIsDirty(true);
    };

    const deleteLocation = async (id: string) => {
        if (!confirm('この拠点を削除してもよろしいですか？')) return;
        if (!id.startsWith('new-')) {
            try {
                const res = await fetch(`/api/locations?id=${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete');
            } catch (err) {
                alert('削除に失敗しました。');
                return;
            }
        }
        setLocations(locations.filter(l => l.id !== id));
        setIsDirty(true);
    };

    const deleteSupplier = async (id: string) => {
        if (!confirm('この業者を削除してもよろしいですか？')) return;
        if (!id.startsWith('new-')) {
            try {
                const res = await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete');
            } catch (err) {
                alert('削除に失敗しました。');
                return;
            }
        }
        setSuppliers(suppliers.filter(s => s.id !== id));
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (isAnyImageUploading) {
            alert('画像のアップロードが完了するまでお待ちください。');
            return;
        }

        const invalidImageItem = items.find(
            item =>
                typeof item.imageUrl === 'string' &&
                item.imageUrl.startsWith('data:')
        );

        if (invalidImageItem) {
            alert(`「${invalidImageItem.name || invalidImageItem.materialCode}」の画像を選び直してください。`);
            return;
        }

        setIsSaving(true);
        try {
            const validItems = items.filter(i => i.name.trim() !== '');
            const validLocations = locations.filter(l => l.name.trim() !== '');
            const validSuppliers = suppliers.filter(s => s.name.trim() !== '');

            const itemPromises = validItems.map(async item => {
    console.log('[ITEM SAVE] saving item:', {
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        imageUrlPrefix: typeof item.imageUrl === 'string' ? item.imageUrl.slice(0, 30) : null,
    });

    const res = await fetch('/api/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
    });

    console.log('[ITEM SAVE] response:', {
        id: item.id,
        name: item.name,
        status: res.status,
        ok: res.ok,
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[ITEM SAVE] failed:', data);
        throw new Error(data.error || `品目「${item.name}」の保存に失敗しました。`);
    }

    return res.json();
});
            const locPromises = validLocations.map(async loc => {
                const res = await fetch('/api/locations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loc) });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || `拠点「${loc.name}」の保存に失敗しました。`);
                }
                return res.json();
            });
            const supPromises = validSuppliers.map(async sup => {
                const res = await fetch('/api/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sup) });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || `業者「${sup.name}」の保存に失敗しました。`);
                }
                return res.json();
            });

            await Promise.all([...itemPromises, ...locPromises, ...supPromises]);

            localStorage.setItem('master_items', JSON.stringify(validItems));
            localStorage.setItem('master_locations', JSON.stringify(validLocations));
            localStorage.setItem('master_suppliers', JSON.stringify(validSuppliers));

            setItems(validItems);
            setLocations(validLocations);
            setSuppliers(validSuppliers);

            setIsDirty(false);
            alert('変更をサーバーとローカルに保存しました。空行は破棄されました。');
        } catch (err: any) {
            alert(err.message || '保存に失敗しました。');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isMounted || isLoading) return <div style={{ padding: '20px', textAlign: 'center', fontSize: '18px', color: '#666' }}>データ読み込み中...</div>;

    if (errorMsg) return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2 style={{ color: '#d93025' }}>マスタデータの取得に失敗しました</h2>
            <p>{errorMsg}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>再読み込み</button>
        </div>
    );

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: '"Inter", sans-serif', color: '#333' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
                borderBottom: `2px solid ${isDirty ? '#d93025' : '#1a73e8'}`,
                paddingBottom: '15px'
            }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: isDirty ? '#d93025' : '#1a73e8' }}>
                    ⚙️ マスタ管理 {isDirty && <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#d93025', marginLeft: '10px' }}>⚠️ 未保存の変更があります</span>}
                </h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || isAnyImageUploading}
                        style={{ padding: '10px 16px', backgroundColor: isSaving || isAnyImageUploading ? '#9ca3af' : '#34a853', color: '#fff', border: 'none', borderRadius: '8px', cursor: isSaving || isAnyImageUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                    >
                        {isSaving
                            ? '保存中...'
                            : isAnyImageUploading
                                ? '画像アップロード中...'
                                : '変更を保存'}
                    </button>
                    <Link href="/" style={{ padding: '10px 16px', backgroundColor: '#6c757d', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>⬅️ 戻る</Link>
                </div>
            </header>

            <main>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {(['items', 'locations', 'suppliers'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: activeTab === tab ? '#1a73e8' : '#fff', color: activeTab === tab ? '#fff' : '#333', cursor: 'pointer', fontWeight: 'bold' }}>
                                {tab === 'items' ? `品目 (${items.length})` : tab === 'locations' ? `拠点 (${locations.length})` : `業者 (${suppliers.length})`}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {activeTab === 'items' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>カテゴリ絞り込み:</span>
                                <select
                                    value={adminCategoryFilter}
                                    onChange={(e) => setAdminCategoryFilter(e.target.value)}
                                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    <option value="すべて">すべて表示</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button 
                            onClick={() => activeTab === 'items' ? addItem() : activeTab === 'locations' ? addLocation() : addSupplier()}
                            style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#0f172a' }}
                        >
                            ➕ {activeTab === 'items' ? '品目を追加' : activeTab === 'locations' ? '拠点を追加' : '業者を追加'}
                        </button>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', maxHeight: '70vh', overflowY: 'auto' }}>
                    {activeTab === 'items' && (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1, borderBottom: '2px solid #eee' }}>
                                <tr>
                                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', width: '80px' }}>内部ID</th>
                                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', width: '150px' }}>資材ID</th>
                                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', width: '140px' }}>カテゴリ</th>
                                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>写真URL</th>
                                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>品目名</th>
                                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', width: '90px' }}>単価</th>
                                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', width: '60px' }}>単位</th>
                                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', width: '60px' }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const filteredItems = items.filter(item => adminCategoryFilter === 'すべて' || normalizeCategory(item.category) === adminCategoryFilter);
                                    return filteredItems.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '8px', fontSize: '11px', color: '#94a3b8', verticalAlign: 'middle' }}>{item.id.startsWith('new-') ? '新規' : item.id}</td>
                                            <td style={{ padding: '8px' }}>
                                                <input 
                                                    value={item.materialCode || ''} 
                                                    placeholder="未設定(保存時ID)" 
                                                    onChange={e => updateItem(item.id, 'materialCode', e.target.value)} 
                                                    style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px' }} 
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <select
                                                    value={normalizeCategory(item.category) || 'その他'}
                                                    onChange={e => updateItem(item.id, 'category', e.target.value)}
                                                    style={{ width: '100%', padding: '5px', border: '1px solid #eee' }}
                                                >
                                                    {CATEGORIES.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <ItemImageUpload item={item} onUpdate={url => updateItem(item.id, 'imageUrl', url)} onUploadingChange={uploading => setItemUploading(item.id, uploading)} />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} style={{ width: '100%', padding: '5px', border: '1px solid #eee' }} placeholder="入力必須" />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input type="number" value={item.price || 0} onChange={e => updateItem(item.id, 'price', Number(e.target.value))} style={{ width: '70px', padding: '5px', border: '1px solid #eee', textAlign: 'right' }} />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} style={{ width: '40px', padding: '5px', border: '1px solid #eee' }} />
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                <button onClick={() => deleteItem(item.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>削除</button>
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'locations' && (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>拠点ID</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>拠点名</th>
                                    <th style={{ padding: '12px', textAlign: 'center', width: '60px' }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {locations.map(loc => (
                                    <tr key={loc.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>{loc.id.startsWith('new-') ? '新規' : loc.id}</td>
                                        <td style={{ padding: '12px' }}>
                                            <input value={loc.name} onChange={e => updateLocation(loc.id, 'name', e.target.value)} style={{ width: '100%', padding: '5px', border: '1px solid #eee' }} placeholder="入力必須" />
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button onClick={() => deleteLocation(loc.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>削除</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'suppliers' && (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>業者名</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>発注方法</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>納品/締切</th>
                                    <th style={{ padding: '12px', textAlign: 'center', width: '60px' }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map(sup => (
                                    <tr key={sup.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>
                                            <input value={sup.name} onChange={e => updateSupplier(sup.id, 'name', e.target.value)} style={{ width: '100%', padding: '5px', border: '1px solid #eee' }} placeholder="入力必須" />
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <select value={sup.method || '訪問'} onChange={e => updateSupplier(sup.id, 'method', e.target.value)} style={{ padding: '5px' }}>
                                                <option value="訪問">訪問</option>
                                                <option value="FAX">FAX</option>
                                                <option value="TEL">TEL</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            納期:<input value={sup.deliveryDayOfWeek || ''} placeholder="火" onChange={e => updateSupplier(sup.id, 'deliveryDayOfWeek', e.target.value)} style={{ width: '40px', padding: '5px', margin: '0 5px' }} />
                                            締切:<input value={sup.cutoffDayOfWeek || ''} placeholder="月" onChange={e => updateSupplier(sup.id, 'cutoffDayOfWeek', e.target.value)} style={{ width: '40px', padding: '5px', margin: '0 5px' }} />
                                            時刻:<input value={sup.cutoffTime || ''} placeholder="17:00" onChange={e => updateSupplier(sup.id, 'cutoffTime', e.target.value)} style={{ width: '60px', padding: '5px' }} />
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button onClick={() => deleteSupplier(sup.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>削除</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
