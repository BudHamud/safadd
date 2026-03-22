import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

type ScanResult = { confidence: number; desc: string; remaining: number | null };
type FormData = { amount: string; currency: string; desc: string; tag: string; date: string; details: string; [key: string]: any };

type Props = {
    analyzingImage: boolean;
    ticketPreview: string | null;
    dragActive: boolean;
    scanResult: ScanResult | null;
    scanLimitReached: boolean;
    onImageFile: (file: File) => void;
    onClearPreview: () => void;
    setDragActive: (v: boolean) => void;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
};

export const TicketScanner = ({
    analyzingImage, ticketPreview, dragActive, scanResult, scanLimitReached,
    onImageFile, onClearPreview, setDragActive,
}: Props) => {
    const { t } = useLanguage();

    if (scanLimitReached) return (
        <div style={{
            marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '8px',
            border: '1.5px dashed var(--accent)', background: 'var(--bg)',
            display: 'flex', alignItems: 'center', gap: '0.65rem',
        }}>
            <span style={{ fontSize: '1rem' }}>🚫</span>
            <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.05em' }}>
                    {t('order.daily_limit_reached')}
                </div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {t('order.daily_limit_help')}
                </div>
            </div>
        </div>
    );

    return (
        <div
            style={{ marginBottom: '1rem' }}
            onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={e => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) onImageFile(f); }}
        >
            <input type="file" accept="image/*" capture="environment"
                onChange={e => { if (e.target.files?.[0]) onImageFile(e.target.files[0]); }}
                id="ticket-upload" style={{ display: 'none' }} />
            <label
                htmlFor="ticket-upload"
                style={{
                    display: 'flex',
                    flexDirection: ticketPreview ? 'row' : 'column',
                    alignItems: 'center',
                    justifyContent: ticketPreview ? 'flex-start' : 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: ticketPreview ? '0.6rem 0.85rem' : '1rem',
                    borderRadius: '8px',
                    border: `1.5px dashed ${dragActive || analyzingImage ? 'var(--primary)' : 'var(--border)'}`,
                    background: dragActive || analyzingImage ? 'var(--surface-alt)' : 'var(--bg)',
                    cursor: analyzingImage ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    minHeight: ticketPreview ? 'auto' : '70px',
                }}
            >
                {analyzingImage ? (
                    <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                        </svg>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.06em' }}>{t('order.scanning_ticket')}</span>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{t('order.scanning_ticket_help')}</span>
                        </div>
                    </>
                ) : ticketPreview ? (
                    <>
                        <img src={ticketPreview} alt="ticket" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0, border: '1px solid var(--border)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {scanResult ? (
                                <>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em' }}>{t('order.ticket_scanned')}</div>
                                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {scanResult.desc} · {scanResult.confidence}% {t('order.confidence')}
                                    </div>
                                    <div style={{ marginTop: '0.3rem', height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                                        <div style={{ width: `${scanResult.confidence}%`, height: '100%', background: scanResult.confidence > 75 ? 'var(--primary)' : 'var(--accent)', borderRadius: '2px' }} />
                                    </div>
                                    {scanResult.remaining !== null && (
                                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                            {t('order.remaining_scans_today', { count: scanResult.remaining } as any)}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t('order.change_image')}</span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={e => { e.preventDefault(); onClearPreview(); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}
                        >✕</button>
                    </>
                ) : (
                    <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18M3 15h18M9 3v18M15 3v18" opacity=".3" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>{t('order.scan_ticket_invoice')}</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', opacity: 0.6 }}>{t('order.scan_ticket_invoice_help')}</span>
                    </>
                )}
            </label>
        </div>
    );
};
