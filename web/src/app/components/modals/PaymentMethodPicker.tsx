import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

type Props = {
    paymentMethod: string;
    cardDigits: string;
    onChange: (method: string, digits?: string) => void;
};

export const PaymentMethodPicker = ({ paymentMethod, cardDigits, onChange }: Props) => {
    const { t } = useLanguage();

    return (
        <div>
            <div className="order-modal-methods-group">
                <button
                    className={`order-modal-method-btn ${paymentMethod === 'billete' ? 'active' : ''}`}
                    onClick={() => onChange(paymentMethod === 'billete' ? '' : 'billete', '')}
                >
                    {`💵 ${t('order.payment_cash')}`}
                </button>
                <button
                    className={`order-modal-method-btn ${paymentMethod === 'tarjeta' ? 'active' : ''}`}
                    onClick={() => onChange(paymentMethod === 'tarjeta' ? '' : 'tarjeta', cardDigits)}
                >
                    {`💳 ${t('order.payment_card')}`}
                </button>
            </div>

            {paymentMethod === 'tarjeta' && (
                <div style={{ marginTop: '0.6rem' }}>
                    <div className="card-digits-wrapper">
                        <div className="card-digits-mask">
                            <span>••••</span>
                            <span>••••</span>
                            <span>••••</span>
                        </div>
                        <input
                            className="card-digits-input"
                            type="text"
                            name="cardDigits"
                            value={cardDigits}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                onChange('tarjeta', val);
                            }}
                            placeholder="0000"
                            maxLength={4}
                            inputMode="numeric"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
