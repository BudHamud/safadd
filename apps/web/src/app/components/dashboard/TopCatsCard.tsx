import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

type CatSegment = {
    tag: string;
    pct: number;
    segmentDasharray: string;
    segmentDashoffset: number;
    amount: number;
};

type Props = {
    topCatSegments: CatSegment[];
    radius: number;
    circumference: number;
};

const palette = ['var(--primary)', 'var(--accent)', 'var(--text-main)'];

export const TopCatsCard = ({ topCatSegments, radius, circumference }: Props) => {
    const { t } = useLanguage();

    return (
        <div style={{
            background: 'var(--w-card-bg, var(--surface))', border: '1px solid var(--w-card-border, var(--border))',
            borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column',
        }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                {t('dashboard.top_cats')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <div style={{ width: '85px', height: '85px', position: 'relative', flexShrink: 0 }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                        <circle cx="50" cy="50" r={radius} stroke="var(--border-dim)" strokeWidth="20" fill="none" />
                        {topCatSegments.length === 0 && (
                            <circle cx="50" cy="50" r={radius} stroke="var(--surface-hover)" strokeWidth="20" fill="none" />
                        )}
                        {topCatSegments.map((seg, i) => (
                            <circle
                                key={i} cx="50" cy="50" r={radius}
                                stroke={palette[i % palette.length]}
                                strokeWidth="20" fill="none"
                                strokeDasharray={seg.segmentDasharray}
                                strokeDashoffset={seg.segmentDashoffset}
                            />
                        ))}
                    </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {topCatSegments.length > 0 ? topCatSegments.map((seg, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette[i % palette.length], flexShrink: 0 }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'capitalize' }}>{seg.tag}</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>{Math.round(seg.pct)}%</span>
                        </div>
                    )) : (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('dashboard.no_data')}</div>
                    )}
                </div>
            </div>
        </div>
    );
};
