"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconShapes, Logo } from '../layout';
import { useLanguage } from '../../../context/LanguageContext';
import './LandingPage.css';

interface LandingPageProps {
    onGetStarted: () => void;
}

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
    const { t, lang, setLang } = useLanguage();
    // Prevent hydration mismatch: lang comes from localStorage (client-only)
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const timeoutId = window.setTimeout(() => setMounted(true), 0);

        return () => window.clearTimeout(timeoutId);
    }, []);

    const heroLine3 = t('landing.hero_line_3').trim();

    return (
        <div className="landing-root">
            <header className="landing-header">
                <div className="landing-logo">
                    <Logo size={24} />
                    <span>SAFED</span>
                </div>
                <div className="landing-lang-switcher" suppressHydrationWarning>
                    <span className="landing-lang-label">{mounted ? t('landing.lang_label') : 'Idioma'}</span>
                    <div className="landing-lang-toggle" role="group" aria-label={t('landing.lang_toggle_aria')}>
                        <button
                            type="button"
                            className={`landing-lang-option ${mounted && lang === 'es' ? 'is-active' : ''}`}
                            onClick={() => setLang('es')}
                            aria-pressed={lang === 'es'}
                        >
                            Español
                        </button>
                        <button
                            type="button"
                            className={`landing-lang-option ${mounted && lang === 'en' ? 'is-active' : ''}`}
                            onClick={() => setLang('en')}
                            aria-pressed={lang === 'en'}
                        >
                            English
                        </button>
                    </div>
                </div>
            </header>

            <main className="landing-container">
                <section className="landing-hero">
                    <h1 className="landing-headline">
                        {t('landing.hero_line_1')}<br />
                        <span className="italic-accent">{t('landing.hero_line_2')}</span>
                        {heroLine3 ? <><br />{heroLine3}</> : null}
                    </h1>
                    <p className="landing-subheadline">
                        {t('landing.subheadline')}
                    </p>
                    <button className="landing-cta" onClick={onGetStarted}>
                        {t('landing.cta')}
                    </button>
                </section>

                <div className="landing-card-preview">
                    <div className="preview-card-chip"></div>
                    <div className="preview-card-wifi">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 8c3-3 6-3 9 0M2 5c5-5 10-5 15 0" />
                        </svg>
                    </div>
                    <div className="preview-card-info">
                        <div className="preview-card-label">{t('landing.card_label')}</div>
                        <div className="preview-card-number">**** **** **** 8824</div>
                    </div>
                </div>

                <section className="landing-privacy">
                    <div className="privacy-badge">
                        <span className="dot"></span> {t('landing.privacy_badge')}
                    </div>
                    <h2 className="privacy-headline">
                        {t('landing.privacy_headline')}
                    </h2>
                    <div className="privacy-line"></div>
                </section>

                <section className="landing-features">
                    <h3 className="features-section-label">{t('landing.features_label')}</h3>

                    <div className="feature-item">
                        <div className="feature-icon-box">
                            <IconShapes type="card" />
                        </div>
                        <div className="feature-text">
                            <h4>{t('landing.feature_sync_title')}</h4>
                            <p>{t('landing.feature_sync_desc')}</p>
                        </div>
                    </div>

                    <div className="feature-item">
                        <div className="feature-icon-box">
                            <IconShapes type="plane" />
                        </div>
                        <div className="feature-text">
                            <h4>{t('landing.feature_travel_title')}</h4>
                            <p>{t('landing.feature_travel_desc')}</p>
                        </div>
                    </div>

                    <div className="feature-item">
                        <div className="feature-icon-box">
                            <IconShapes type="chart" />
                        </div>
                        <div className="feature-text">
                            <h4>{t('landing.feature_stats_title')}</h4>
                            <p>{t('landing.feature_stats_desc')}</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="footer-icons">
                    <button><IconShapes type="plus" /></button>
                    <button>✉️</button>
                    <button>?</button>
                </div>
                <div className="footer-links">
                    <Link href="/privacy" className="footer-link">{t('landing.privacy_policy')}</Link>
                </div>
                <div className="footer-copyright">
                    {t('landing.footer_copy')}
                </div>
            </footer>
        </div>
    );
};
