'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useDialog } from '../../context/DialogContext';

const MIN_PASSWORD_LENGTH = 8;

const readRecoveryParams = (searchParams: URLSearchParams) => {
    const queryToken = searchParams.get('access_token');
    const queryCode = searchParams.get('code');
    if (queryToken || queryCode) {
        return {
            accessToken: queryToken || '',
            code: queryCode || '',
        };
    }

    if (typeof window === 'undefined') {
        return { accessToken: '', code: '' };
    }

    const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(rawHash);
    return {
        accessToken: hashParams.get('access_token') || '',
        code: hashParams.get('code') || '',
    };
};

export default function ResetPasswordPage() {
    const { t } = useLanguage();
    const dialog = useDialog();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [accessToken, setAccessToken] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ password: '', confirmPassword: '' });

    useEffect(() => {
        const params = readRecoveryParams(searchParams);
        setAccessToken(params.accessToken);
        setRecoveryCode(params.code);
        setIsReady(true);
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!accessToken && !recoveryCode) {
            await dialog.alert(t('auth.reset_invalid_link'));
            return;
        }

        if (!form.password || !form.confirmPassword) {
            await dialog.alert(t('auth.complete_fields'));
            return;
        }

        if (form.password.length < MIN_PASSWORD_LENGTH) {
            await dialog.alert(t('auth.password_min_length'));
            return;
        }

        if (form.password !== form.confirmPassword) {
            await dialog.alert(t('auth.password_mismatch'));
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/auth/password/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, code: recoveryCode, password: form.password }),
            });

            if (!res.ok) {
                await dialog.alert(t('auth.reset_error'));
                return;
            }

            await dialog.alert(t('auth.reset_success'));
            router.push('/app');
        } catch (error) {
            console.error(error);
            await dialog.alert(t('auth.server_connection_error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <form
                onSubmit={handleSubmit}
                style={{ width: '100%', maxWidth: '380px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '2px', padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
                <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.55rem' }}>
                        Safed
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', lineHeight: 1.05, fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                        {t('auth.reset_password_title')}
                    </h1>
                    <p style={{ margin: '0.7rem 0 0', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                        {t('auth.reset_password_desc')}
                    </p>
                </div>

                {!isReady || accessToken ? (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.57rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                                {t('auth.reset_new_password')}
                            </label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                                style={{ width: '100%', background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 600, padding: '0.8rem 0.9rem', outline: 'none', boxSizing: 'border-box', borderRadius: '2px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.57rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                                {t('auth.reset_confirm_password')}
                            </label>
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                style={{ width: '100%', background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 600, padding: '0.8rem 0.9rem', outline: 'none', boxSizing: 'border-box', borderRadius: '2px' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{ width: '100%', background: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '2px', color: 'var(--primary-text)', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.9rem', cursor: isSubmitting ? 'default' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}
                        >
                            {isSubmitting ? t('auth.processing') : t('auth.reset_submit')}
                        </button>
                    </>
                ) : (
                    <div style={{ border: '1px solid color-mix(in srgb, var(--accent) 35%, var(--border) 65%)', background: 'color-mix(in srgb, var(--accent) 8%, var(--surface) 92%)', borderRadius: '2px', padding: '0.9rem 1rem', color: 'var(--text-main)', fontSize: '0.8rem', lineHeight: 1.55 }}>
                        {t('auth.reset_invalid_link')}
                    </div>
                )}
            </form>
        </div>
    );
}