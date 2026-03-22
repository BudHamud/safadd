"use client";

import React, { useEffect, useState } from "react";
import { SplashScreen as CapSplashScreen } from "@capacitor/splash-screen";
import { Capacitor } from "@capacitor/core";
import { Logo } from "./Logo";

export function SplashScreen() {
    const [visible, setVisible] = useState(true);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        // Hide the native splash screen as soon as React mounts
        // This ensures a seamless transition to our web-based animated splash
        if (Capacitor.isNativePlatform()) {
            CapSplashScreen.hide().catch(e => console.error("Error hiding native splash", e));
        }

        // Keep it spinning for a moment, then fade out
        const fadeTimer = setTimeout(() => {
            setOpacity(0);
        }, 1500);

        // Completely unmount after fade transition is done
        const removeTimer = setTimeout(() => {
            setVisible(false);
        }, 2000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none transition-opacity duration-500"
            style={{ backgroundColor: "var(--bg)", opacity: opacity }}
        >
            <Logo size={120} />
        </div>
    );
}
