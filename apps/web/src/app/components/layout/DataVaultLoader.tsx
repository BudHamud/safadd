import React from 'react';
import { Logo } from './Logo';

type DataVaultLoaderProps = {
    isVisible: boolean;
    title: string;
    subtitle?: string;
};

export const DataVaultLoader = ({ isVisible, title, subtitle }: DataVaultLoaderProps) => {
    if (!isVisible) return null;

    return (
        <div className="vault-loader-overlay" role="status" aria-live="polite" aria-busy="true">
            <div className="vault-loader-panel">
                <div className="vault-loader-logo-shell">
                    <Logo size={92} loading className="vault-loader-logo" />
                </div>
                <div className="vault-loader-copy">
                    <span className="vault-loader-eyebrow">Vault Sync</span>
                    <h2>{title}</h2>
                    {subtitle ? <p>{subtitle}</p> : null}
                </div>
                <div className="vault-loader-track" aria-hidden="true">
                    <span className="vault-loader-progress" />
                </div>
            </div>
            <style>{`
                .vault-loader-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 1200;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    background:
                        radial-gradient(circle at top, color-mix(in srgb, var(--primary) 14%, transparent), transparent 46%),
                        linear-gradient(180deg, color-mix(in srgb, var(--bg) 84%, black), color-mix(in srgb, var(--surface) 72%, black));
                    backdrop-filter: blur(14px);
                }
                .vault-loader-panel {
                    width: min(460px, 100%);
                    border: 1px solid color-mix(in srgb, var(--border) 80%, white 10%);
                    border-radius: 28px;
                    padding: 28px 24px;
                    background:
                        linear-gradient(145deg, color-mix(in srgb, var(--surface) 92%, white 3%), color-mix(in srgb, var(--surface-alt) 90%, black 6%));
                    box-shadow:
                        0 28px 80px rgba(0, 0, 0, 0.32),
                        inset 0 1px 0 rgba(255, 255, 255, 0.06);
                }
                .vault-loader-logo-shell {
                    width: 132px;
                    height: 132px;
                    margin: 0 auto 18px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background:
                        radial-gradient(circle, color-mix(in srgb, var(--surface-alt) 94%, white 3%), color-mix(in srgb, var(--surface) 84%, black 12%));
                    border: 1px solid color-mix(in srgb, var(--border) 76%, white 10%);
                    box-shadow:
                        inset 0 0 0 10px rgba(255, 255, 255, 0.03),
                        inset 0 -14px 28px rgba(0, 0, 0, 0.18);
                }
                .vault-loader-copy {
                    text-align: center;
                }
                .vault-loader-eyebrow {
                    display: inline-block;
                    margin-bottom: 10px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--text-muted);
                }
                .vault-loader-copy h2 {
                    margin: 0;
                    font-size: clamp(1.4rem, 2vw, 1.8rem);
                    line-height: 1.05;
                    color: var(--text-main);
                }
                .vault-loader-copy p {
                    margin: 10px auto 0;
                    max-width: 28ch;
                    color: var(--text-muted);
                    font-size: 0.98rem;
                    line-height: 1.45;
                }
                .vault-loader-track {
                    position: relative;
                    overflow: hidden;
                    width: 100%;
                    height: 10px;
                    margin-top: 22px;
                    border-radius: 999px;
                    background: color-mix(in srgb, var(--surface-hover) 88%, black 8%);
                }
                .vault-loader-progress {
                    position: absolute;
                    inset: 0;
                    width: 42%;
                    border-radius: inherit;
                    background: linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 60%, white 40%), var(--primary));
                    animation: vault-loader-slide 1.8s cubic-bezier(0.6, 0.04, 0.32, 0.96) infinite;
                }
                @keyframes vault-loader-slide {
                    0% { transform: translateX(-120%) scaleX(0.85); }
                    42% { transform: translateX(78%) scaleX(1); }
                    100% { transform: translateX(245%) scaleX(0.9); }
                }
            `}</style>
        </div>
    );
};