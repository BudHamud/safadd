import React, { useState } from 'react';
import { Transaction, Category } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';
import { useAppContext } from '../../../context/AppContext';

type TransactionEditViewProps = {
    transaction: Transaction;
    globalCurrency: string;
    categories: Category[];
    onCancel: () => void;
    onSaveSuccess: (updatedTransaction: Transaction) => void;
    onDeleteRequest: () => void;
};

const SURFACE = 'var(--surface)';
const SURFACE2 = 'var(--surface-alt)';
const BORDER = 'var(--border)';
const BORDER2 = 'var(--surface-hover)';
const TEXT = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const GREEN = 'var(--primary)';
const RED = 'var(--accent)';

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

export const TransactionEditView = ({
    transaction, globalCurrency, categories, onCancel, onSaveSuccess, onDeleteRequest
}: TransactionEditViewProps) => {
    const { t } = useLanguage();
    const dialog = useDialog();
    const { authenticatedFetch } = useAppContext();

    const [formData, setFormData] = useState<Partial<Transaction>>({
        ...transaction,
        paymentMethod: transaction.paymentMethod || '',
        cardDigits: transaction.cardDigits || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [catSearch, setCatSearch] = useState<string | null>(null);

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
                amountEUR
            };

            const res = await authenticatedFetch('/api/transactions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });
            if (res.ok) {
                const updatedTransaction = await res.json();
                onSaveSuccess(updatedTransaction);
            }
            else { await dialog.alert(t('details.save_error')); }
        } catch (e) {
            console.error(e);
            await dialog.alert(t('details.recalculate_save_error'));
        }
        setIsSaving(false);
    };

    return (
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: `1px solid ${BORDER2}`, borderRadius: '14px', width: '100%', boxShadow: '0 40px 90px rgba(0,0,0,0.6)', maxHeight: '92vh', overflowY: 'auto', maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.5rem', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: TEXT, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {t('modal.edit_transaction')}
                </span>
                <button onClick={onCancel} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: '4px', display: 'flex' }}>
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
                                            ))
                                        }
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
                            <div className="card-digits-wrapper" style={{ background: SURFACE, display: 'flex', alignItems: 'center', position: 'relative', borderRadius: '8px', border: `1px solid ${BORDER}`, padding: '0.5rem 0.8rem' }}>
                                <div style={{ color: MUTED, letterSpacing: '0.2em', marginRight: '0.6rem' }}>
                                    <span>••••</span> <span>••••</span> <span>••••</span>
                                </div>
                                <input
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
                                    style={{ background: 'transparent', border: 'none', color: TEXT, fontSize: '0.9rem', width: '50px', outline: 'none', letterSpacing: '0.1em' }}
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
                                        body: JSON.stringify({ ...transaction, isCancelled: true })
                                    });
                                    if (res.ok) {
                                        const updatedTransaction = await res.json();
                                        onSaveSuccess(updatedTransaction);
                                    }
                                }
                            }}
                            style={{ width: '100%', background: 'transparent', border: `1px solid ${RED}44`, borderRadius: '8px', color: RED, padding: '0.8rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}
                        >
                            {t('details.cancel_recurrence')}
                        </button>
                    )}

                    <button onClick={onDeleteRequest} style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, padding: '0.8rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                        {t('details.delete_transaction')}
                    </button>
                </div>
            </div>
        </div>
    );
};
