'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                window.location.href = '/';
            } else {
                const data = await res.json();
                setError(data.error || 'ログインに失敗しました');
            }
        } catch (err) {
            setError('ネットワークエラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f0f2f5',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            fontFamily: '"Inter", "Noto Sans JP", sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '440px',
                minWidth: '280px',
                backgroundColor: '#fff',
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
            }}>
                {/* Header Area */}
                <div style={{
                    backgroundColor: '#1a73e8',
                    padding: '30px 20px',
                    textAlign: 'center',
                    color: '#fff'
                }}>
                    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
                        いしだクリーニング<br />資材発注システム
                    </h1>
                    <p style={{ margin: '10px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                        店舗・工場アカウントでログインしてください
                    </p>
                </div>

                {/* Form Area */}
                <div style={{ padding: '30px 40px' }}>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#444', marginBottom: '8px' }}>
                                ユーザーID (店舗名など)
                            </label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '8px',
                                    border: '1px solid #ccc',
                                    fontSize: '16px',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#1a73e8'}
                                onBlur={(e) => e.target.style.borderColor = '#ccc'}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#444', marginBottom: '8px' }}>
                                パスワード
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '8px',
                                    border: '1px solid #ccc',
                                    fontSize: '16px',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#1a73e8'}
                                onBlur={(e) => e.target.style.borderColor = '#ccc'}
                            />
                        </div>

                        {error && (
                            <div style={{
                                backgroundColor: '#fce8e6',
                                color: '#d93025',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                textAlign: 'center',
                                fontWeight: 'bold'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '10px',
                                width: '100%',
                                padding: '16px',
                                backgroundColor: loading ? '#a0c3ff' : '#1a73e8',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s',
                                boxShadow: '0 2px 4px rgba(26, 115, 232, 0.3)'
                            }}
                        >
                            {loading ? 'ログイン処理中...' : 'ログイン'}
                        </button>
                    </form>
                </div>
            </div>
            
            <div style={{ marginTop: '30px', fontSize: '12px', color: '#888' }}>
                &copy; Ishida Cleaning
            </div>
        </div>
    );
}
