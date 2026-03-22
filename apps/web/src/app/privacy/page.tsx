"use client";

import Link from "next/link";
import { useLanguage } from "../../context";
import { PrivacyPolicyContent } from "../components";

export default function PrivacyPage() {
    const { lang, setLang } = useLanguage();
    const backLabel = lang === 'es' ? 'Volver al inicio' : 'Back to home';

    return (
        <main style={{
            minHeight: "100vh",
            background: "var(--bg)",
            color: "var(--text-main)",
            padding: "clamp(1rem, 4vw, 2rem) clamp(0.9rem, 4vw, 1.25rem) 3rem",
        }}>
            <div style={{ maxWidth: "760px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.85rem", flexWrap: "wrap", marginBottom: "1.2rem", alignItems: 'center' }}>
                    <Link href="/" style={{ color: "var(--primary)", fontWeight: 800, textDecoration: "none" }}>
                        {backLabel}
                    </Link>
                    <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "999px", padding: "0.2rem", gap: "0.2rem" }}>
                        <button type="button" onClick={() => setLang("es")} style={{ border: 0, cursor: "pointer", borderRadius: "999px", padding: "0.45rem 0.8rem", background: lang === "es" ? "var(--primary)" : "transparent", color: lang === "es" ? "var(--primary-text)" : "var(--text-muted)", fontWeight: 800 }}>ES</button>
                        <button type="button" onClick={() => setLang("en")} style={{ border: 0, cursor: "pointer", borderRadius: "999px", padding: "0.45rem 0.8rem", background: lang === "en" ? "var(--primary)" : "transparent", color: lang === "en" ? "var(--primary-text)" : "var(--text-muted)", fontWeight: 800 }}>EN</button>
                    </div>
                </div>

                <div style={{ border: "1px solid var(--border)", borderRadius: "24px", background: "var(--surface)", padding: "clamp(1rem, 4vw, 2rem)" }}>
                    <PrivacyPolicyContent />
                </div>
            </div>
        </main>
    );
}