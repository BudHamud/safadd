/**
 * colorSystem.ts — Presets de color, definición de zonas widget,
 * y helpers para inyectar CSS dinámico en el DOM.
 */

export type WidgetColors = Record<string, Record<string, string>>;

export type ColorPreset = {
    id: string;
    name: string;
    emoji: string;
    colors: Record<string, string>;
};

export type WidgetZone = {
    id: string;
    name: string;
    icon: string;
    desc: string;
    vars: { variable: string; label: string; defaultColor: string }[];
};

// ── Presets ──────────────────────────────────────────────────────────────────

export const COLOR_PRESETS: ColorPreset[] = [
    {
        id: 'organic-dark',
        name: 'Dark',
        emoji: '🌑',
        colors: {
            '--bg': '#0d0f0d',
            '--surface': '#141714',
            '--surface-alt': '#1a1a1a',
            '--surface-hover': '#1e211e',
            '--primary': '#5d7253',
            '--primary-text': '#0d0d0d',
            '--accent': '#8e4a39',
            '--accent-text': '#e0e0ce',
            '--text-main': '#e0e0ce',
            '--text-muted': '#8c8c80',
            '--border': '#2b2e2b',
            '--border-dim': '#1c1e1c',
        },
    },
    {
        id: 'organic-light',
        name: 'Light',
        emoji: '☀️',
        colors: {
            '--bg': '#f8f6f0',
            '--surface': '#ffffff',
            '--surface-alt': '#e9e5db',
            '--surface-hover': '#f1efeb',
            '--primary': '#cce9cc',
            '--primary-text': '#111411',
            '--accent': '#ffc4ba',
            '--accent-text': '#111411',
            '--text-main': '#111411',
            '--text-muted': '#595c58',
            '--border': '#111411',
            '--border-dim': '#d3d1cb',
        },
    },
    {
        id: 'ocean',
        name: 'Océano',
        emoji: '🌊',
        colors: {
            '--bg': '#020617',
            '--surface': '#0d1829',
            '--surface-alt': '#111e30',
            '--surface-hover': '#172540',
            '--primary': '#06b6d4',
            '--primary-text': '#020d18',
            '--accent': '#ff4d8d',
            '--accent-text': '#fff0f6',
            '--text-main': '#cde4ff',
            '--text-muted': '#486b8a',
            '--border': '#1a3048',
            '--border-dim': '#0a1424',
        },
    },
    {
        id: 'forest',
        name: 'Bosque',
        emoji: '🌿',
        colors: {
            '--bg': '#0a0f08',
            '--surface': '#111a0e',
            '--surface-alt': '#172113',
            '--surface-hover': '#1d2918',
            '--primary': '#4ade80',
            '--primary-text': '#0a1a0a',
            '--accent': '#fb923c',
            '--accent-text': '#1a0800',
            '--text-main': '#d1fae5',
            '--text-muted': '#6b7e60',
            '--border': '#1e3018',
            '--border-dim': '#121e0e',
        },
    },
    {
        id: 'ember',
        name: 'Brasa',
        emoji: '🔥',
        colors: {
            '--bg': '#0f0805',
            '--surface': '#1c1008',
            '--surface-alt': '#231410',
            '--surface-hover': '#2a1a14',
            '--primary': '#f97316',
            '--primary-text': '#0f0500',
            '--accent': '#ef4444',
            '--accent-text': '#fff',
            '--text-main': '#fde8cc',
            '--text-muted': '#8c6450',
            '--border': '#2e1a10',
            '--border-dim': '#1e1008',
        },
    },
    {
        id: 'arctic',
        name: 'Ártico',
        emoji: '❄️',
        colors: {
            '--bg': '#f0f4f8',
            '--surface': '#ffffff',
            '--surface-alt': '#e2e8f0',
            '--surface-hover': '#f1f5f9',
            '--primary': '#3b82f6',
            '--primary-text': '#ffffff',
            '--accent': '#ef4444',
            '--accent-text': '#ffffff',
            '--text-main': '#1e293b',
            '--text-muted': '#64748b',
            '--border': '#cbd5e1',
            '--border-dim': '#e2e8f0',
        },
    },
    {
        id: 'purple',
        name: 'Morado',
        emoji: '🔮',
        colors: {
            '--bg': '#0d0b14',
            '--surface': '#16122a',
            '--surface-alt': '#1a1530',
            '--surface-hover': '#201a3a',
            '--primary': '#a855f7',
            '--primary-text': '#ffffff',
            '--accent': '#f43f5e',
            '--accent-text': '#ffffff',
            '--text-main': '#e2d9f0',
            '--text-muted': '#7c6fa0',
            '--border': '#2d2460',
            '--border-dim': '#1e1840',
        },
    },
    {
        id: 'mono',
        name: 'Mono',
        emoji: '◼️',
        colors: {
            '--bg': '#000000',
            '--surface': '#111111',
            '--surface-alt': '#1a1a1a',
            '--surface-hover': '#222222',
            '--primary': '#e0e0e0',
            '--primary-text': '#000000',
            '--accent': '#888888',
            '--accent-text': '#ffffff',
            '--text-main': '#ffffff',
            '--text-muted': '#666666',
            '--border': '#333333',
            '--border-dim': '#222222',
        },
    },
];

// ── Widget zones ─────────────────────────────────────────────────────────────

export const WIDGET_ZONES: WidgetZone[] = [
    {
        id: 'sidebar',
        name: 'Sidebar',
        icon: '☰',
        desc: 'Navegación lateral',
        vars: [
            { variable: '--w-sidebar-bg', label: 'Fondo', defaultColor: '#0d0d0d' },
            { variable: '--w-sidebar-text', label: 'Íconos / texto', defaultColor: '#666666' },
            { variable: '--w-sidebar-active', label: 'Ítem activo', defaultColor: '#5d7253' },
            { variable: '--w-sidebar-border', label: 'Borde', defaultColor: '#1a1a1a' },
        ],
    },
    {
        id: 'dashboard',
        name: 'Tarjetas',
        icon: '🃏',
        desc: 'Balance, métricas y resumen',
        vars: [
            { variable: '--w-card-bg', label: 'Fondo tarjeta', defaultColor: '#141714' },
            { variable: '--w-card-border', label: 'Borde tarjeta', defaultColor: '#2b2e2b' },
            { variable: '--w-income-color', label: 'Color ingresos', defaultColor: '#5d7253' },
            { variable: '--w-expense-color', label: 'Color gastos', defaultColor: '#8e4a39' },
        ],
    },
    {
        id: 'tx-rows',
        name: 'Movimientos',
        icon: '📋',
        desc: 'Filas de transacciones',
        vars: [
            { variable: '--w-tx-row-bg', label: 'Fondo fila', defaultColor: '#1a1a1a' },
            { variable: '--w-tx-row-border', label: 'Borde fila', defaultColor: '#222222' },
            { variable: '--w-tx-icon-bg', label: 'Fondo ícono', defaultColor: '#1e1e1e' },
            { variable: '--w-tx-income', label: 'Ingreso', defaultColor: '#5d7253' },
            { variable: '--w-tx-expense', label: 'Gasto', defaultColor: '#8e4a39' },
        ],
    },
    {
        id: 'modal',
        name: 'Modales',
        icon: '⬜',
        desc: 'Ventanas de agregar / editar',
        vars: [
            { variable: '--w-modal-bg', label: 'Fondo', defaultColor: '#161917' },
            { variable: '--w-modal-border', label: 'Borde', defaultColor: '#373a37' },
        ],
    },
    {
        id: 'stats',
        name: 'Estadísticas',
        icon: '📊',
        desc: 'Gráficos y métricas',
        vars: [
            { variable: '--w-stats-bg', label: 'Fondo', defaultColor: '#161917' },
            { variable: '--w-stats-primary', label: 'Color primario', defaultColor: '#5c7152' },
            { variable: '--w-stats-accent', label: 'Color acento', defaultColor: '#8b4a38' },
        ],
    },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Construye la cadena CSS a inyectar en el <style> tag */
export function buildColorStylesheet(
    globalColors: Record<string, string>,
    widgetColors: WidgetColors
): string {
    // Use html[data-theme] selector (specificity 0,1,1) to override both
    // :root (0,1,0) and html[data-theme="dark"] (0,1,1) in globals.css,
    // winning by source order since this tag is appended after globals.css.
    const globalRules =
        Object.keys(globalColors).length > 0
            ? `html[data-theme] { ${Object.entries(globalColors)
                  .map(([v, c]) => `${v}: ${c};`)
                  .join(' ')} }`
            : '';
    const widgetRules = Object.entries(widgetColors)
        .filter(([, vars]) => Object.keys(vars).length > 0)
        .map(([zone, vars]) => {
            const decls = Object.entries(vars)
                .map(([v, c]) => `${v}: ${c};`)
                .join(' ');
            return `[data-color-zone="${zone}"] { ${decls} }`;
        })
        .join('\n');
    return [globalRules, widgetRules].filter(Boolean).join('\n');
}

/** Inyecta / actualiza el <style id="gastosapp-colors"> en el <head> */
export function injectColorStylesheet(css: string): void {
    if (typeof document === 'undefined') return;
    let styleEl = document.getElementById(
        'gastosapp-colors'
    ) as HTMLStyleElement | null;
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'gastosapp-colors';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
}
