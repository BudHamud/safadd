import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { PrivacyPolicyModal } from '../legal';

interface BankSyncExplainerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const BankSyncExplainer = ({ isOpen, onClose, onConfirm }: BankSyncExplainerProps) => {
    const { t } = useLanguage();
    const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out',
        }}>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(10px)',
                }}
            />

            {/* Modal Content */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '440px',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        background: 'var(--accent-faint)',
                        borderRadius: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.2rem',
                        fontSize: '2rem'
                    }}>
                        🛡️
                    </div>
                    <h2 style={{
                        fontSize: '1.4rem', fontWeight: 900,
                        color: 'var(--text-main)', margin: '0 0 0.4rem'
                    }}>
                        {t('bank_explainer.title')}
                    </h2>
                    <p style={{
                        fontSize: '0.85rem', color: 'var(--text-muted)',
                        margin: 0, fontWeight: 500
                    }}>
                        {t('bank_explainer.subtitle')}
                    </p>
                </div>

                {/* Points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ fontSize: '1.2rem' }}>🎯</div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                                {t('bank_explainer.point1_title')}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {t('bank_explainer.point1_desc')}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ fontSize: '1.2rem' }}>🔒</div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                                {t('bank_explainer.point2_title')}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {t('bank_explainer.point2_desc')}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ fontSize: '1.2rem' }}>⚡</div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                                {t('bank_explainer.point3_title')}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {t('bank_explainer.point3_desc')}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-alt)',
                    padding: '0.95rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text-main)' }}>
                        {t('bank_explainer.disclosure_title')}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                        {t('bank_explainer.disclosure_body')}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsPrivacyOpen(true)}
                        style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--primary)', textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        {t('bank_explainer.privacy_link')}
                    </button>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '1rem',
                            borderRadius: '14px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'var(--primary-text)',
                            fontWeight: 900,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {t('bank_explainer.btn_accept')}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.8rem',
                            borderRadius: '14px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                        }}
                    >
                        {t('btn.cancel')}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scaleUp {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>

            <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
        </div>
    );
};
