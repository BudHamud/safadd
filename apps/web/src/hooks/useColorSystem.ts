"use client";

import { useState, useEffect } from "react";
import {
    WidgetColors,
    COLOR_PRESETS,
    buildColorStylesheet,
    injectColorStylesheet,
} from "../lib/colorSystem";

export function useColorSystem(theme: string, setTheme: (t: string) => void) {
    const [customColors, setCustomColorsState] = useState<Record<string, string>>({});
    const [isColorMode, setIsColorMode] = useState(false);
    const [activeColorZone, setActiveColorZone] = useState<string | null>(null);
    const [widgetColors, setWidgetColorsState] = useState<WidgetColors>({});

    // Load stored colors on mount
    useEffect(() => {
        try {
            const storedColors: Record<string, string> = JSON.parse(localStorage.getItem('financeCustomColors') || '{}');
            const storedWidgetColors: WidgetColors = JSON.parse(localStorage.getItem('financeWidgetColors') || '{}');
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (Object.keys(storedColors).length > 0) setCustomColorsState(storedColors);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (Object.keys(storedWidgetColors).length > 0) setWidgetColorsState(storedWidgetColors);
            const css = buildColorStylesheet(storedColors, storedWidgetColors);
            if (css) injectColorStylesheet(css);
        } catch { /* ignorar */ }
    }, []);

    const setCustomColor = (variable: string, color: string) => {
        const newColors = { ...customColors, [variable]: color };
        setCustomColorsState(newColors);
        injectColorStylesheet(buildColorStylesheet(newColors, widgetColors));
        localStorage.setItem('financeCustomColors', JSON.stringify(newColors));
    };

    const resetCustomColors = () => {
        setCustomColorsState({});
        setWidgetColorsState({});
        injectColorStylesheet('');
        localStorage.removeItem('financeCustomColors');
        localStorage.removeItem('financeWidgetColors');
        localStorage.removeItem('financeActivePreset');
    };

    const setWidgetColor = (zone: string, variable: string, color: string) => {
        const newWidgetColors: WidgetColors = {
            ...widgetColors,
            [zone]: { ...(widgetColors[zone] || {}), [variable]: color },
        };
        setWidgetColorsState(newWidgetColors);
        injectColorStylesheet(buildColorStylesheet(customColors, newWidgetColors));
        localStorage.setItem('financeWidgetColors', JSON.stringify(newWidgetColors));
    };

    const resetWidgetColors = (zone?: string) => {
        const newWidgetColors: WidgetColors = zone
            ? Object.fromEntries(Object.entries(widgetColors).filter(([k]) => k !== zone))
            : {};
        setWidgetColorsState(newWidgetColors);
        injectColorStylesheet(buildColorStylesheet(customColors, newWidgetColors));
        if (Object.keys(newWidgetColors).length > 0) {
            localStorage.setItem('financeWidgetColors', JSON.stringify(newWidgetColors));
        } else {
            localStorage.removeItem('financeWidgetColors');
        }
    };

    const applyColorPreset = (presetId: string) => {
        const preset = COLOR_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        const newColors = preset.colors;
        const newWidgetColors: WidgetColors = {};
        setCustomColorsState(newColors);
        setWidgetColorsState(newWidgetColors);
        injectColorStylesheet(buildColorStylesheet(newColors, newWidgetColors));
        localStorage.setItem('financeCustomColors', JSON.stringify(newColors));
        localStorage.removeItem('financeWidgetColors');
        localStorage.setItem('financeActivePreset', presetId);
        const darkPresets = ['organic-dark', 'ocean', 'forest', 'ember', 'purple', 'mono'];
        const targetTheme = darkPresets.includes(presetId) ? 'dark' : 'light';
        if (targetTheme !== theme) {
            setTheme(targetTheme);
            document.documentElement.setAttribute('data-theme', targetTheme);
            localStorage.setItem('app-theme', targetTheme);
        }
    };

    return {
        customColors, setCustomColor, resetCustomColors,
        isColorMode, setIsColorMode,
        activeColorZone, setActiveColorZone,
        widgetColors, setWidgetColor, resetWidgetColors, applyColorPreset,
    };
}
