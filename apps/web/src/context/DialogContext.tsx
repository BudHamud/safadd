"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useLanguage } from './LanguageContext';

type DialogTone = 'default' | 'danger';

type DialogOptions = {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: DialogTone;
    inputLabel?: string;
    inputPlaceholder?: string;
    initialValue?: string;
};

type DialogState =
    | ({ kind: 'alert' } & DialogOptions)
    | ({ kind: 'confirm' } & DialogOptions)
    | ({ kind: 'prompt'; inputValue: string } & DialogOptions)
    | null;

type DialogContextType = {
    alert: (options: string | DialogOptions) => Promise<void>;
    confirm: (options: string | DialogOptions) => Promise<boolean>;
    prompt: (options: string | DialogOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

const toOptions = (options: string | DialogOptions): DialogOptions => {
    if (typeof options === 'string') {
        return { message: options };
    }
    return options;
};

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
    const { t } = useLanguage();
    const [dialog, setDialog] = useState<DialogState>(null);
    const resolverRef = useRef<((value: unknown) => void) | null>(null);

    const closeDialog = useCallback((result: unknown) => {
        const resolver = resolverRef.current;
        resolverRef.current = null;
        setDialog(null);
        resolver?.(result);
    }, []);

    const openDialog = useCallback((kind: 'alert' | 'confirm', options: string | DialogOptions) => {
        const normalized = toOptions(options);
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setDialog({ kind, tone: 'default', ...normalized });
        });
    }, []);

    const alert = useCallback(async (options: string | DialogOptions) => {
        await openDialog('alert', options);
    }, [openDialog]);

    const confirm = useCallback((options: string | DialogOptions) => {
        return openDialog('confirm', options);
    }, [openDialog]);

    const prompt = useCallback((options: string | DialogOptions) => {
        const normalized = toOptions(options);
        return new Promise<string | null>((resolve) => {
            resolverRef.current = resolve;
            setDialog({ kind: 'prompt', tone: 'default', inputValue: normalized.initialValue ?? '', ...normalized });
        });
    }, []);

    const value = useMemo(() => ({ alert, confirm, prompt }), [alert, confirm, prompt]);

    const isDanger = dialog?.tone === 'danger';

    return (
        <DialogContext.Provider value={value}>
            {children}

            {dialog && (
                <div
                    onClick={() => closeDialog(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.78)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        zIndex: 50000,
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        onClick={event => event.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '360px',
                            background: 'var(--surface)',
                            border: `1px solid ${isDanger ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: '16px',
                            padding: '1.25rem',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
                        }}
                    >
                        {dialog.title && (
                            <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {dialog.title}
                            </h2>
                        )}

                        <p style={{ margin: dialog.title ? '0.75rem 0 0' : 0, fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                            {dialog.message}
                        </p>

                        {dialog.kind === 'prompt' && (
                            <div style={{ marginTop: '0.95rem' }}>
                                {dialog.inputLabel && (
                                    <div style={{ marginBottom: '0.4rem', fontSize: '0.57rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                                        {dialog.inputLabel}
                                    </div>
                                )}
                                <input
                                    autoFocus
                                    value={dialog.inputValue}
                                    onChange={(event) => setDialog(prev => prev && prev.kind === 'prompt' ? { ...prev, inputValue: event.target.value } : prev)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            closeDialog(dialog.inputValue);
                                        }
                                    }}
                                    placeholder={dialog.inputPlaceholder}
                                    style={{ width: '100%', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '2px', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600, padding: '0.75rem 0.9rem', boxSizing: 'border-box', outline: 'none' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.1rem', justifyContent: 'flex-end' }}>
                            {(dialog.kind === 'confirm' || dialog.kind === 'prompt') && (
                                <button
                                    onClick={() => closeDialog(dialog.kind === 'prompt' ? null : false)}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--text-muted)',
                                        padding: '0.7rem 0.95rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {dialog.cancelLabel || t('btn.cancel')}
                                </button>
                            )}

                            <button
                                onClick={() => closeDialog(dialog.kind === 'prompt' ? dialog.inputValue : true)}
                                style={{
                                    background: isDanger ? 'var(--accent)' : 'var(--primary)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: isDanger ? 'var(--accent-text)' : 'var(--primary-text)',
                                    padding: '0.7rem 0.95rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {dialog.confirmLabel || (dialog.kind === 'alert' ? t('btn.close') : t('btn.confirm'))}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('useDialog must be used inside DialogProvider');
    return context;
};