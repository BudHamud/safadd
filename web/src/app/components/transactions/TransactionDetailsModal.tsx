import React, { useState } from 'react';
import { Transaction, Category } from "../../../types";
import { formatCurrency } from '../../../lib/utils';
import { getCurrencySymbol } from '@safed/shared/currency';
import { formatDate } from '../movements/movements.utils';
import { useLanguage } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';
import { useAppContext } from '../../../context/AppContext';

type TransactionDetailsModalProps = {
    transaction: Transaction | null;
    onClose: () => void;
    onDelete: (id: string) => void;
    onUpdate?: (updatedTransaction: Transaction) => void;
    globalCurrency: string;
    availableCategories: Category[];
};

const BG = 'var(--bg)';
const SURFACE = 'var(--surface)';
const SURFACE2 = 'var(--surface-alt)';
const BORDER = 'var(--border)';
const BORDER2 = 'var(--surface-hover)';
const TEXT = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const GREEN = 'var(--primary)';
const RED = 'var(--accent)';
const OVERLAY = 'rgba(0,0,0,0.78)';

const fieldLbl: React.CSSProperties = {
    display: 'block',
    fontSize: '0.55rem',
    fontWeight: 800,
    color: MUTED,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginBottom: '0.35rem',
};

const editLbl: React.CSSProperties = {
    display: 'block',
    fontSize: '0.58rem',
    fontWeight: 800,
    color: MUTED,
    letterSpacing: '0.13em',
    textTransform: 'uppercase',
    marginBottom: '0.45rem',
};

const editInp: React.CSSProperties = {
    width: '100%',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: '7px',
    color: TEXT,
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '0.65rem 0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    colorScheme: 'dark',
};

const formatDateForInput = (d: string | undefined) => {
    if (!d) return '';
    let str = d.replace(/\//g, '-');
    if (str.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const p = str.split('-');
        return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    } else if (str.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const p = str.split('-');
        return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
    }
    return str.split('T')[0];
};

type TransactionDetailsModalContentProps = {
    transaction: Transaction;
    onClose: () => void;
    onDelete: (id: string) => void;
    onUpdate?: (updatedTransaction: Transaction) => void;
    globalCurrency: string;
    availableCategories: Category[];
};

const TransactionDetailsModalContent = ({ transaction, onClose, onDelete, onUpdate, globalCurrency, availableCategories }: TransactionDetailsModalContentProps) => {
    const { t } = useLanguage();
    const dialog = useDialog();
    const { authenticatedFetch } = useAppContext();
    const sym = getCurrencySymbol(globalCurrency);
    const [viewMode, setViewMode] = useState<'details' | 'edit' | 'confirm_delete'>('details');
    const [formData, setFormData] = useState<Partial<Transaction>>({
        ...transaction,
        paymentMethod: transaction.paymentMethod || '',
        cardDigits: transaction.cardDigits || '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [catSearch, setCatSearch] = useState<string | null>(null);

    const categories = availableCategories;

    const handleClose = () => { setViewMode('details'); onClose(); };

    const confirmDelete = () => { onDelete(transaction.id); handleClose(); };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let amountUSD = 0;
            let amountARS = 0;
            let amountILS = 0;
            let amountEUR = 0;

            const newAmount = formData.amount || 0;

            const resRates = await authenticatedFetch('/api/exchange-rates');
            if (!resRates.ok) {
                throw new Error('exchange_rates_unavailable');
            }

            const rateSnapshot = await resRates.json();
            const dataRates = rateSnapshot.rates;
            const arsRate = rateSnapshot.usdToArs;

            if (globalCurrency === 'USD') amountUSD = newAmount;
            else if (globalCurrency === 'ILS') amountUSD = newAmount / dataRates.ILS;
            else if (globalCurrency === 'EUR') amountUSD = newAmount / dataRates.EUR;
            else if (globalCurrency === 'ARS') amountUSD = newAmount / arsRate;

            amountILS = amountUSD * dataRates.ILS;
            amountEUR = amountUSD * dataRates.EUR;
            amountARS = amountUSD * arsRate;

            const finalData = {
                ...transaction,
                ...formData,
                amount: amountILS,
                amountUSD,
                amountARS,
                amountILS,
                amountEUR,
            };

            const res = await authenticatedFetch('/api/transactions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData),
            });
            if (res.ok) {
                const updatedTransaction = await res.json();
                onUpdate?.(updatedTransaction);
            }
            else { await dialog.alert(t('details.save_error')); }
        } catch (e) {
            console.error(e);
            await dialog.alert(t('details.recalculate_save_error'));
        }
        setIsSaving(false);
    };

    const isExpense = transaction.type === 'expense';
    const amountColor = isExpense ? RED : GREEN;

    const overlayStyle: React.CSSProperties = {
        position: 'fixed', inset: 0,
        background: OVERLAY,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
        backdropFilter: 'blur(3px)',
    };

    const cardBase: React.CSSProperties = {
        background: BG,
        border: `1px solid ${BORDER2}`,
        borderRadius: '14px',
        width: '100%',
        boxShadow: '0 40px 90px rgba(0,0,0,0.6)',
        maxHeight: '92vh',
        overflowY: 'auto',
    };

    if (viewMode === 'confirm_delete') {
        return (
            <div style={overlayStyle} onClick={handleClose}>
                <div onClick={e => e.stopPropagation()} style={{ ...cardBase, maxWidth: '340px', padding: '2.25rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${RED}22`, border: `1px solid ${RED}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 900, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
                        {t('details.delete_order_title')}
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: MUTED, marginBottom: '1.75rem', lineHeight: 1.5, fontWeight: 500 }}>
                        {t('details.delete_order_warning')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                        <button onClick={confirmDelete} style={{ width: '100%', background: RED, border: 'none', borderRadius: '8px', color: 'var(--accent-text)', padding: '0.8rem', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                            {t('btn.delete')}
                        </button>
                        <button onClick={() => setViewMode('details')} style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER2}`, borderRadius: '8px', color: MUTED, padding: '0.8rem', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                            {t('btn.cancel')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'edit') {
        return (
            <div style={overlayStyle} onClick={handleClose}>
                <div onClick={e => e.stopPropagation()} style={{ ...cardBase, maxWidth: '440px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.5rem', borderBottom: `1px solid ${BORDER}` }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: TEXT, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            {t('modal.edit_transaction')}
                        </span>
                        <button onClick={handleClose} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: '4px', display: 'flex' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={editLbl}>{t('details.concept')}</label>
                            <input value={formData.desc || ''} onChange={e => setFormData({ ...formData, desc: e.target.value })} style={editInp} />
                        </div>

                        <div>
                            <label style={editLbl}>{t('field.amount')}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={formData.amount || ''}
                                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                    style={{ ...editInp, fontSize: '1.5rem', fontWeight: 800, paddingRight: '3.5rem' }}
                                />
                                <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: MUTED, fontWeight: 800, fontSize: '0.75rem', pointerEvents: 'none', letterSpacing: '0.05em' }}>
                                    {globalCurrency}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                            <div>
                                <label style={editLbl}>{t('field.category')}</label>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        type="button"
                                        onClick={() => setCatSearch(prev => prev === null ? '' : null)}
                                        style={{ ...editInp, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' as any }}
                                    >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {formData.tag
                                                ? (() => { const found = categories.find(c => c.label === formData.tag); return found ? `${found.icon} ${found.label}` : formData.tag; })()
                                                : t('order.select_placeholder')}
                                        </span>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.5" style={{ flexShrink: 0, marginLeft: '0.4rem' }}>
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>

                                    {catSearch !== null && (
                                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999, background: SURFACE2, border: `1px solid ${BORDER2}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                            <input
                                                type="text"
                                                placeholder={t('movements.search')}
                                                value={catSearch}
                                                onChange={e => setCatSearch(e.target.value)}
                                                autoFocus
                                                style={{ width: '100%', background: SURFACE, border: 'none', borderBottom: `1px solid ${BORDER}`, color: TEXT, fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, padding: '0.55rem 0.75rem', outline: 'none', boxSizing: 'border-box' as any }}
                                            />
                                            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                                {categories
                                                    .filter(c => c.label.toLowerCase().includes(catSearch.toLowerCase()))
                                                    .map(c => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => { setFormData({ ...formData, tag: c.label, icon: c.icon }); setCatSearch(null); }}
                                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', background: formData.tag === c.label ? `${GREEN}22` : 'transparent', border: 'none', color: formData.tag === c.label ? GREEN : TEXT, fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' as any, transition: 'background 0.12s' }}
                                                            onMouseEnter={e => { if (formData.tag !== c.label) (e.currentTarget as HTMLButtonElement).style.background = SURFACE; }}
                                                            onMouseLeave={e => { if (formData.tag !== c.label) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                                                        >
                                                            <span style={{ fontSize: '1rem' }}>{c.icon}</span>
                                                            <span>{c.label}</span>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label style={editLbl}>{t('field.date')}</label>
                                <input
                                    type="date"
                                    value={formatDateForInput(formData.date)}
                                    onChange={e => setFormData({ ...formData, date: e.target.value.replace(/-/g, '/') })}
                                    style={{ ...editInp }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={editLbl}>{t('field.payment_method')}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '3px', gap: '3px' }}>
                                <button onClick={() => setFormData({ ...formData, paymentMethod: formData.paymentMethod === 'billete' ? '' : 'billete', cardDigits: '' })} style={{ padding: '0.4rem', borderRadius: '6px', border: `1px solid ${formData.paymentMethod === 'billete' ? BORDER2 : 'transparent'}`, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.07em', background: formData.paymentMethod === 'billete' ? SURFACE2 : 'transparent', color: formData.paymentMethod === 'billete' ? TEXT : MUTED, transition: 'all 0.18s' }}>
                                    💵 {t('order.payment_cash')}
                                </button>
                                <button onClick={() => setFormData({ ...formData, paymentMethod: formData.paymentMethod === 'tarjeta' ? '' : 'tarjeta' })} style={{ padding: '0.4rem', borderRadius: '6px', border: `1px solid ${formData.paymentMethod === 'tarjeta' ? BORDER2 : 'transparent'}`, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.07em', background: formData.paymentMethod === 'tarjeta' ? SURFACE2 : 'transparent', color: formData.paymentMethod === 'tarjeta' ? TEXT : MUTED, transition: 'all 0.18s' }}>
                                    💳 {t('order.payment_card')}
                                </button>
                            </div>
                            {formData.paymentMethod === 'tarjeta' && (
                                <div style={{ marginTop: '0.6rem' }}>
                                    <div className="card-digits-wrapper" style={{ background: SURFACE }}>
                                        <div className="card-digits-mask">
                                            <span>••••</span>
                                            <span>••••</span>
                                            <span>••••</span>
                                        </div>
                                        <input
                                            className="card-digits-input"
                                            type="text"
                                            name="cardDigits"
                                            value={formData.cardDigits}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                setFormData({ ...formData, cardDigits: val });
                                            }}
                                            placeholder="0000"
                                            maxLength={4}
                                            inputMode="numeric"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={editLbl}>{t('details.record_type')}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '3px', gap: '3px' }}>
                                {[{ v: 'unico' as const, l: t('order.goal_single') }, { v: 'mensual' as const, l: t('order.goal_monthly') }, { v: 'periodo' as const, l: t('order.goal_period') }].map(o => {
                                    const active = (formData.goalType || 'unico') === o.v;
                                    return (
                                        <button key={o.v} onClick={() => setFormData({ ...formData, goalType: o.v })} style={{ padding: '0.4rem', borderRadius: '6px', border: `1px solid ${active ? BORDER2 : 'transparent'}`, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.07em', background: active ? SURFACE2 : 'transparent', color: active ? TEXT : MUTED, transition: 'all 0.18s' }}>
                                            {o.l}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {formData.goalType === 'periodo' && (
                            <div>
                                <label style={editLbl}>{t('details.frequency_months')}</label>
                                <select
                                    name="periodicity"
                                    value={formData.periodicity || '12'}
                                    onChange={e => setFormData({ ...formData, periodicity: parseInt(e.target.value) })}
                                    style={editInp}
                                >
                                    <option value="3">{t('details.quarterly_short')}</option>
                                    <option value="6">{t('details.biannual_short')}</option>
                                    <option value="12">{t('details.annual_short')}</option>
                                    <option value="24">{t('details.two_years_short')}</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label style={editLbl}>{t('field.description')}</label>
                            <textarea value={formData.details || ''} onChange={e => setFormData({ ...formData, details: e.target.value })} rows={3} style={{ ...editInp, resize: 'none', lineHeight: 1.55 }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <button onClick={handleSave} disabled={isSaving} style={{ width: '100%', background: GREEN, border: 'none', borderRadius: '8px', color: 'var(--primary-text)', padding: '0.8rem', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: isSaving ? 'not-allowed' : 'pointer', textTransform: 'uppercase', fontFamily: 'inherit', opacity: isSaving ? 0.7 : 1 }}>
                                {isSaving ? t('details.saving') : t('order.save_changes')}
                            </button>

                            {(transaction.goalType === 'mensual' || transaction.goalType === 'periodo') && !transaction.isCancelled && (
                                <button
                                    onClick={async () => {
                                        if (await dialog.confirm({ message: t('details.cancel_recurrence_confirm'), tone: 'danger' })) {
                                            const res = await authenticatedFetch('/api/transactions', {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ ...transaction, isCancelled: true }),
                                            });
                                            if (res.ok) {
                                                const updatedTransaction = await res.json();
                                                onUpdate?.(updatedTransaction);
                                            }
                                        }
                                    }}
                                    style={{ width: '100%', background: 'transparent', border: `1px solid ${RED}44`, borderRadius: '8px', color: RED, padding: '0.8rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}
                                >
                                    {t('details.cancel_recurrence')}
                                </button>
                            )}

                            <button onClick={() => setViewMode('confirm_delete')} style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, padding: '0.8rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                                {t('details.delete_transaction')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={overlayStyle} onClick={handleClose}>
            <div onClick={e => e.stopPropagation()} style={{ ...cardBase, maxWidth: '380px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1.25rem 1.4rem 1rem', borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '9px', background: SURFACE2, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', flexShrink: 0 }}>
                        {transaction.icon.length < 5 ? transaction.icon : '💳'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {transaction.desc}
                        </div>
                        <div style={{ fontSize: '0.57rem', color: MUTED, fontWeight: 700, marginTop: '0.18rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {t('details.verified_transaction')}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end', flexShrink: 0 }}>
                        <span style={{ background: `${GREEN}22`, color: GREEN, border: `1px solid ${GREEN}44`, borderRadius: '20px', padding: '0.22rem 0.6rem', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            {transaction.tag}
                        </span>
                        {transaction.goalType && (
                            <span style={{ background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '0.18rem 0.5rem', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                {transaction.goalType === 'meta' ? t('details.goal_badge') : transaction.goalType === 'periodo' ? t('details.period_badge') : t('details.monthly_badge')}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.75rem 0 0.5rem' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                            {t('details.total_amount')}
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: amountColor, letterSpacing: '-0.04em', lineHeight: 1 }}>
                            {isExpense ? '−' : '+'}{formatCurrency(transaction.amount, sym)}
                        </div>
                    </div>

                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '0.8rem 1rem' }}>
                        <span style={fieldLbl}>{t('details.operation_date')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: TEXT, letterSpacing: '0.02em' }}>
                                {formatDate(transaction.date)}
                            </span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                    </div>

                    {transaction.paymentMethod && (
                        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '0.8rem 1rem' }}>
                            <span style={fieldLbl}>{t('field.payment_method')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: TEXT, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                    {transaction.paymentMethod === 'tarjeta' ? `💳 ${t('details.card')}` : `💵 ${t('details.cash')}`}
                                    {transaction.paymentMethod === 'tarjeta' && transaction.cardDigits && (
                                        <span style={{ marginLeft: '0.5rem', color: MUTED, fontSize: '0.85rem', letterSpacing: '0.1em' }}>•••• •••• •••• {transaction.cardDigits}</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '0.8rem 1rem' }}>
                        <span style={fieldLbl}>{t('field.description')}</span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: transaction.details ? TEXT : MUTED, lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                            {transaction.details || t('details.no_description')}
                        </p>
                    </div>

                    <div style={{ padding: '0 0.5rem', marginTop: '-0.2rem' }}>
                        <div style={{ fontSize: '0.52rem', color: MUTED, opacity: 0.5, fontWeight: 700, letterSpacing: '0.05em' }}>
                            ID REF: {transaction.id}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <button
                            onClick={() => setViewMode('edit')}
                            style={{ width: '100%', background: GREEN, border: 'none', borderRadius: '9px', color: 'var(--primary-text)', padding: '0.85rem', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            {t('details.edit_record')}
                        </button>
                        <button
                            onClick={() => setViewMode('confirm_delete')}
                            style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER2}`, borderRadius: '9px', color: MUTED, padding: '0.85rem', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'color 0.15s, border-color 0.15s' }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                            {t('btn.delete')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TransactionDetailsModal = ({ transaction, onClose, onDelete, onUpdate, globalCurrency, availableCategories }: TransactionDetailsModalProps) => {
    if (!transaction) return null;

    return (
        <TransactionDetailsModalContent
            key={transaction.id}
            transaction={transaction}
            onClose={onClose}
            onDelete={onDelete}
            onUpdate={onUpdate}
            globalCurrency={globalCurrency}
            availableCategories={availableCategories}
        />
    );
};
