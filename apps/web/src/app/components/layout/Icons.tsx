import React from 'react';

export const IconShapes = ({ type }: { type: string }) => {
    const svgProps = {
        width: "22", height: "22", viewBox: "0 0 24 24",
        fill: "none", stroke: "currentColor", strokeWidth: "1.8", className: "icon-svg",
        strokeLinecap: "round" as const, strokeLinejoin: "round" as const
    };

    if (type === "dashboard") return (
        <svg {...svgProps}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
        </svg>
    );
    if (type === "card") return (
        <svg {...svgProps}>
            <rect x="2" y="5" width="20" height="14" />
            <line x1="2" y1="10" x2="22" y2="10" />
            <rect x="6" y="15" width="4" height="2" fill="currentColor" />
        </svg>
    );
    if (type === "chart") return (
        <svg {...svgProps}>
            <path d="M3 3V21H21" />
            <path d="M7 14L11 10L15 13L21 6" />
        </svg>
    );
    if (type === "sun") return (
        <svg {...svgProps}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
    );
    if (type === "moon") return (
        <svg {...svgProps}>
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
    );
    if (type === "plus") return (
        <svg {...svgProps}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
    if (type === "shopping") return (
        <svg {...svgProps}>
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
        </svg>
    );
    if (type === "transport") return (
        <svg {...svgProps}>
            <rect x="3" y="10" width="18" height="8" rx="2" />
            <circle cx="6" cy="18" r="2" />
            <circle cx="18" cy="18" r="2" />
            <path d="M4 10L7 4h10l3 6" />
        </svg>
    );
    if (type === "coffee") return (
        <svg {...svgProps}>
            <path d="M18 8h1a4 4 0 010 8h-1" />
            <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
    );
    if (type === "trending") return (
        <svg {...svgProps}>
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
        </svg>
    );
    if (type === "user") return (
        <svg {...svgProps}>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );

    if (type === "entertainment") return (
        <svg {...svgProps}>
            <rect x="2" y="7" width="20" height="10" rx="2" ry="2" />
            <line x1="6" y1="7" x2="6" y2="17" />
            <line x1="18" y1="7" x2="18" y2="17" />
            <path d="M10 11h4v2h-4z" />
        </svg>
    );

    if (type === "plane") return (
        <svg {...svgProps} fill="currentColor" stroke="none">
            <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
        </svg>
    );

    if (type === "plane-off") return (
        <svg {...svgProps} fill="none">
            {/* Same airplane with a diagonal strike-through */}
            <path fill="currentColor" d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" opacity="0.45" />
            {/* Strike line */}
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );

    if (type === "bell") return (
        <svg {...svgProps}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
    );

    if (type === "shield") return (
        <svg {...svgProps}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );

    // Default icon
    return (
        <svg {...svgProps}>
            <circle cx="12" cy="12" r="10" />
        </svg>
    );
};
