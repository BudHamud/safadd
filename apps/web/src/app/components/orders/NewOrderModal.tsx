import React, { useState, useEffect } from 'react';
import './NewOrderModal.css';
import { Transaction, Category } from "../../../types";
import { useAppContext } from "../../../context/AppContext";
import { useLanguage } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';
import { TicketScanner, CategoryPicker, PaymentMethodPicker } from '../modals';

type NewOrderModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tx: Transaction) => void;
    availableCategories: Category[];
    initialData?: Partial<Transaction> | null;
    globalCurrency: string;
};

const ICON_PRESETS = ['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'];
const GOAL_LABEL_KEYS = {
    unico: 'order.goal_single',
    mensual: 'order.goal_monthly',
    periodo: 'order.goal_period',
} as const;

export const NewOrderModal = ({ isOpen, onClose, onSave, availableCategories, initialData, globalCurrency }: NewOrderModalProps) => {
    const { authenticatedFetch, setCatSignal } = useAppContext();
    const { lang, t } = useLanguage();
    const dialog = useDialog();

    // ── Form state ──────────────────────────────────────────────────────────
    const [transactionType, setTransactionType] = useState('expense');
    const [goalType, setGoalType] = useState<'unico' | 'mensual' | 'periodo' | 'meta'>('unico');
    const getDefaultDate = () => new Date().toISOString().split('T')[0];
    const buildEmpty = (currency: string) => ({
        amount: '', currency, desc: '', details: '', tag: '', customTag: '',
        customIcon: '💳', date: getDefaultDate(), excludeFromBudget: false,
        periodicity: '12', paymentMethod: '', cardDigits: '',
    });

    const [formData, setFormData] = useState(buildEmpty(globalCurrency || 'ILS'));
    const [lastOpened, setLastOpened] = useState(false);

    // ── Ticket scanner state ─────────────────────────────────────────────────
    const [analyzingImage, setAnalyzingImage] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ticketPreview, setTicketPreview] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<{ confidence: number; desc: string; remaining: number | null } | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [scanLimitReached, setScanLimitReached] = useState(false);

    const isEditing = !!initialData;
    const numberLocale = lang === 'en' ? 'en-US' : 'es-AR';

    // ── Hydrate form when modal opens ────────────────────────────────────────
    useEffect(() => {
        if (isOpen && !lastOpened) {
            if (initialData) {
                const initialCurrency = ((initialData as any).currency || globalCurrency || 'ILS') as string;
                setFormData({
                    amount: initialData.amount ? initialData.amount.toString() : '',
                    currency: initialCurrency, desc: initialData.desc || '',
                    details: initialData.details || '', tag: initialData.tag || '',
                    customTag: '', customIcon: initialData.icon || '💳',
                    date: getDefaultDate(), excludeFromBudget: initialData.excludeFromBudget || false,
                    periodicity: initialData.periodicity?.toString() || '12',
                    paymentMethod: initialData.paymentMethod || '', cardDigits: initialData.cardDigits || '',
                });
                if (initialData.type) setTransactionType(initialData.type);
                if (initialData.goalType) setGoalType(initialData.goalType as any);
            } else {
                setFormData(buildEmpty(globalCurrency || 'ILS'));
                setTransactionType('expense');
                setGoalType('unico');
            }
            setLastOpened(true);
        } else if (!isOpen) {
            setLastOpened(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData, isOpen, globalCurrency, lastOpened]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ── Ticket scanning ──────────────────────────────────────────────────────
    const processImageFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setAnalyzingImage(true);
        setScanResult(null);
        const reader = new FileReader();
        reader.onload = (ev) => setTicketPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
        const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res((r.result as string).split(',')[1]);
            r.onerror = rej;
            r.readAsDataURL(f);
        });
        try {
            const base64 = await toBase64(file);
            const resp = await authenticatedFetch('/api/scan-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
            });
            const data = await resp.json();
            if (data.isLimited) {
                setScanLimitReached(true); setTicketPreview(null);
                await dialog.alert(`${data.error}`);
            } else if (data.error) {
                await dialog.alert(`${t('order.scan_read_error_prefix')}: ${data.error}`);
            } else {
                setFormData(prev => ({
                    ...prev,
                    amount: data.amount?.toString() ?? prev.amount, currency: data.currency ?? prev.currency,
                    desc: data.desc ?? prev.desc, tag: data.tag ?? prev.tag,
                    date: data.date ?? prev.date, details: data.details ?? prev.details,
                }));
                setScanResult({ confidence: data.confidence, desc: data.desc, remaining: data.remaining });
                setScanLimitReached(false);
            }
        } catch (err) {
            console.error(err);
            await dialog.alert(t('order.scan_error'));
        } finally {
            setAnalyzingImage(false);
        }
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!formData.amount) { await dialog.alert(t('order.amount_required')); return; }
        setIsProcessing(true);
        let amountUSD = 0, amountARS = 0, amountILS = 0, amountEUR = 0;
        const amountInput = parseFloat(formData.amount);
        let additionalDetails = formData.details || '';
        try {
            const resGlobal = await authenticatedFetch('/api/exchange-rates');
            if (!resGlobal.ok) {
                throw new Error('exchange_rates_unavailable');
            }

            const rateSnapshot = await resGlobal.json();
            const dataRates = rateSnapshot.rates;
            const arsRate = rateSnapshot.usdToArs;
            if (formData.currency === 'USD') amountUSD = amountInput;
            else if (formData.currency === 'ILS') amountUSD = amountInput / dataRates.ILS;
            else if (formData.currency === 'EUR') amountUSD = amountInput / dataRates.EUR;
            else if (formData.currency === 'ARS') amountUSD = amountInput / arsRate;
            amountILS = amountUSD * dataRates.ILS;
            amountEUR = amountUSD * dataRates.EUR;
            amountARS = amountUSD * arsRate;
            if (formData.currency !== 'ILS') {
                const note = t('order.originally_loaded_as', { currency: formData.currency, amount: amountInput.toLocaleString(numberLocale, { maximumFractionDigits: 2 }) } as any);
                additionalDetails = additionalDetails ? `${additionalDetails}\n\n*${note}*` : `*${note}*`;
            }
        } catch {
            await dialog.alert(t('order.exchange_rate_error'));
            setIsProcessing(false);
            return;
        }

        let finalTagLabel = formData.tag;
        let finalIcon = '💳';
        if (formData.tag === 'custom') {
            if (!formData.customTag) { await dialog.alert(t('order.custom_category_name_required')); setIsProcessing(false); return; }
            finalTagLabel = formData.customTag.trim();
            finalIcon = formData.customIcon;
            const newCat: Category = { id: formData.customTag.toLowerCase().replace(/\s+/g, '-'), label: finalTagLabel, icon: finalIcon };
            const existing: Category[] = JSON.parse(localStorage.getItem('financeCustomCategories') || '[]');
            existing.push(newCat);
            localStorage.setItem('financeCustomCategories', JSON.stringify(existing));
            setCatSignal(prev => prev + 1);
        } else {
            const normalize = (s: string) => s.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const target = normalize(formData.tag);
            const selectedCat = availableCategories.find(c => normalize(c.label) === target);
            if (!selectedCat) { await dialog.alert(t('order.select_category_required')); setIsProcessing(false); return; }
            finalTagLabel = selectedCat.label;
            finalIcon = selectedCat.icon;
        }

        const newTx: Transaction = {
            id: Date.now().toString(), desc: formData.desc || t('order.untitled'),
            amount: amountILS, amountUSD, amountARS, amountILS, amountEUR,
            tag: finalTagLabel, type: transactionType, date: formData.date, icon: finalIcon,
            details: additionalDetails,
            excludeFromBudget: goalType === 'meta' ? false : formData.excludeFromBudget,
            goalType, isCancelled: false,
            periodicity: goalType === 'periodo' ? parseInt(formData.periodicity) : undefined,
            paymentMethod: formData.paymentMethod || undefined,
            cardDigits: formData.cardDigits || undefined,
        };
        onSave(newTx);
        setFormData(buildEmpty(globalCurrency || 'ILS'));
        setTransactionType('expense');
        setGoalType('unico');
        setIsProcessing(false);
    };

    if (!isOpen) return null;

    return (
        <div className="order-modal-overlay" onClick={onClose}>
            <div className="order-modal-box" data-color-zone="modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="order-modal-header">
                    <span className="order-modal-title">{isEditing ? t('order.edit_title') : t('order.new_title')}</span>
                    <button className="order-modal-close" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="order-modal-body">
                    {/* Type toggle */}
                    <div className="order-modal-toggle-group">
                        <button className={`order-modal-toggle-btn ${transactionType === 'expense' ? 'active expense' : ''}`} onClick={() => setTransactionType('expense')}>
                            {t('order.type_expense')}
                        </button>
                        <button className={`order-modal-toggle-btn ${transactionType === 'income' ? 'active income' : ''}`} onClick={() => setTransactionType('income')}>
                            {t('order.type_income')}
                        </button>
                    </div>

                    {/* Recurrence types */}
                    <div className="order-modal-goal-group">
                        {(['unico', 'mensual', 'periodo'] as const).map(gt => (
                            <button key={gt} className={`order-modal-goal-btn ${goalType === gt ? 'active' : ''}`} onClick={() => setGoalType(gt)}>
                                {t(GOAL_LABEL_KEYS[gt] as any)}
                            </button>
                        ))}
                    </div>

                    {goalType === 'periodo' && (
                        <div>
                            <span className="order-modal-label">{t('order.period_frequency')}</span>
                            <select className="order-modal-input" name="periodicity" value={formData.periodicity} onChange={handleInputChange}>
                                <option value="3">{t('order.periodicity_quarterly')}</option>
                                <option value="6">{t('order.periodicity_biannual')}</option>
                                <option value="12">{t('order.periodicity_annual')}</option>
                                <option value="24">{t('order.periodicity_two_years')}</option>
                            </select>
                        </div>
                    )}

                    {/* Ticket scanner */}
                    <TicketScanner
                        analyzingImage={analyzingImage} ticketPreview={ticketPreview}
                        dragActive={dragActive} scanResult={scanResult}
                        scanLimitReached={scanLimitReached}
                        onImageFile={processImageFile}
                        onClearPreview={() => { setTicketPreview(null); setScanResult(null); }}
                        setDragActive={setDragActive}
                        setFormData={setFormData as any}
                    />

                    {/* Amount */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                            <span className="order-modal-label">{t('order.amount_label')}</span>
                        </div>
                        <div className="order-modal-amount-group">
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <select className="order-modal-currency-select" name="currency" value={formData.currency} onChange={handleInputChange}>
                                    <option value="USD">USD</option>
                                    <option value="ARS">ARS</option>
                                    <option value="ILS">ILS</option>
                                    <option value="EUR">EUR</option>
                                </select>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="3" style={{ position: 'absolute', right: '0.4rem', pointerEvents: 'none' }}>
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                            <input className="order-modal-amount-input" type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="0.00" autoFocus />
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="order-modal-label">{t('order.title_label')}</label>
                        <input className="order-modal-input" type="text" name="desc" value={formData.desc} onChange={handleInputChange} placeholder={t('order.title_placeholder')} />
                    </div>

                    {/* Payment method */}
                    <div>
                        <label className="order-modal-label">{t('order.payment_method_optional')}</label>
                        <PaymentMethodPicker
                            paymentMethod={formData.paymentMethod}
                            cardDigits={formData.cardDigits}
                            onChange={(method, digits) => setFormData(prev => ({
                                ...prev,
                                paymentMethod: method,
                                cardDigits: digits ?? (method === 'tarjeta' ? prev.cardDigits : ''),
                            }))}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="order-modal-label">{t('order.description_optional')}</label>
                        <textarea className="order-modal-input" name="details" value={formData.details} onChange={handleInputChange} placeholder={t('order.description_placeholder')} rows={3} style={{ resize: 'vertical', minHeight: '70px', lineHeight: 1.55 }} />
                    </div>

                    {/* Exclude from budget */}
                    {transactionType === 'expense' && goalType !== 'meta' && (
                        <label className="order-modal-checkbox-row">
                            <input className="order-modal-checkbox" type="checkbox" name="excludeFromBudget" checked={formData.excludeFromBudget}
                                onChange={e => setFormData({ ...formData, excludeFromBudget: e.target.checked })} />
                            <span className="order-modal-checkbox-label">{t('order.exclude_from_goal')}</span>
                        </label>
                    )}

                    {/* Category */}
                    <div className="order-modal-cat-wrap">
                        <label className="order-modal-label">{t('order.category_label')}</label>
                        <CategoryPicker
                            selectedTag={formData.tag}
                            availableCategories={availableCategories}
                            onSelect={(tag, icon) => setFormData(prev => ({ ...prev, tag, customTag: '', customIcon: icon || '💳' }))}
                        />

                        {/* Custom category config */}
                        {formData.tag === 'custom' && (
                            <div style={{ marginTop: '1rem', border: '1px dashed var(--border-dim)', borderRadius: '8px', padding: '1rem', background: 'var(--surface-alt)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <span className="order-modal-label" style={{ color: 'var(--primary)', marginBottom: 0 }}>{t('order.configure_new_category')}</span>
                                <input className="order-modal-input" type="text" name="customTag" value={formData.customTag} onChange={handleInputChange} placeholder={t('order.custom_category_name_placeholder')} />
                                <div>
                                    <span className="order-modal-label">{t('order.category_icon')}</span>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            value={ICON_PRESETS.includes(formData.customIcon) ? '' : formData.customIcon}
                                            onChange={e => {
                                                let value = e.target.value;
                                                if (value.length > 2) value = value.slice(-2);
                                                setFormData({ ...formData, customIcon: value || '💳' });
                                            }}
                                            placeholder="+"
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                textAlign: 'center',
                                                fontSize: '1.1rem',
                                                padding: 0,
                                                outline: 'none',
                                                cursor: 'text',
                                                fontFamily: 'inherit',
                                                borderRadius: '6px',
                                                border: (!ICON_PRESETS.includes(formData.customIcon) && formData.customIcon) ? '2px solid var(--primary)' : '1px dashed var(--border-dim)',
                                                background: (!ICON_PRESETS.includes(formData.customIcon) && formData.customIcon) ? 'var(--primary)' : 'transparent',
                                                color: (!ICON_PRESETS.includes(formData.customIcon) && formData.customIcon) ? 'var(--primary-text)' : 'var(--text-main)',
                                            }}
                                        />
                                        {ICON_PRESETS.map(ic => (
                                            <div key={ic} onClick={() => setFormData({ ...formData, customIcon: ic })}
                                                style={{ width: '36px', height: '36px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem', border: formData.customIcon === ic ? '2px solid var(--primary)' : '1px solid var(--border)', background: formData.customIcon === ic ? 'color-mix(in srgb, var(--primary) 13%, transparent)' : 'var(--surface)', transition: 'all 0.15s' }}>
                                                {ic}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Date */}
                    <div>
                        <label className="order-modal-label">{t('field.date')}</label>
                        <div style={{ position: 'relative' }}>
                            <input className="order-modal-input" type="date" name="date" value={formData.date} onChange={handleInputChange} style={{ paddingRight: '2.25rem' }} />
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="order-modal-footer">
                        <button className="order-modal-btn-cancel" onClick={onClose} disabled={isProcessing}>{t('btn.cancel')}</button>
                        <button className="order-modal-btn-submit" onClick={handleSubmit} disabled={isProcessing}>
                            {isProcessing ? t('order.processing') : isEditing ? t('order.save_changes') : t('order.process')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
