"use client";

import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';

type PrivacyPolicyModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export const PrivacyPolicyModal = ({ isOpen, onClose }: PrivacyPolicyModalProps) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.9rem' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: '760px', maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '22px', padding: 'clamp(1rem, 3vw, 1.5rem)', boxShadow: '0 25px 80px rgba(0,0,0,0.45)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                    <button onClick={onClose} style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', borderRadius: '999px', padding: '0.55rem 0.9rem', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
                        {t('btn.close')}
                    </button>
                </div>
                <PrivacyPolicyContent compact />
            </div>
        </div>
    );
};