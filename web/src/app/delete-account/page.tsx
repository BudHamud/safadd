"use client";

import Link from "next/link";
import { useLanguage } from "../../context/LanguageContext";

const DELETE_ACCOUNT_COPY = {
    es: {
        eyebrow: "Eliminación de cuenta",
        title: "Cómo eliminar tu cuenta de Safed/Safadd",
        intro: "Safed/Safadd ofrece eliminación de cuenta dentro de la app. Esta página pública existe para cumplir con los requisitos de Google Play y explicar el proceso de borrado.",
        back: "Volver al inicio",
        stepsTitle: "Pasos dentro de la app",
        steps: [
            "Iniciá sesión con la cuenta que querés eliminar.",
            "Abrí Perfil.",
            "Entrá en Identidad.",
            "Presioná Eliminar cuenta y confirmá la acción.",
        ],
        deletedTitle: "Qué se elimina",
        deleted: [
            "Tu perfil de usuario.",
            "Tus transacciones y metadatos asociados.",
            "Tus registros de uso vinculados a la cuenta, incluidos pendientes y estadísticas ligadas al perfil.",
        ],
        retainedTitle: "Qué puede conservarse temporalmente",
        retained: [
            "Copias de seguridad técnicas o registros operativos pueden persistir por un período limitado según la infraestructura del servicio.",
        ],
        privacy: "Ver política de privacidad",
    },
    en: {
        eyebrow: "Account deletion",
        title: "How to delete your Safed/Safadd account",
        intro: "Safed/Safadd provides in-app account deletion. This public page exists to meet Google Play requirements and explain the deletion flow.",
        back: "Back to home",
        stepsTitle: "Steps inside the app",
        steps: [
            "Sign in with the account you want to delete.",
            "Open Profile.",
            "Go to Identity.",
            "Press Delete account and confirm the action.",
        ],
        deletedTitle: "What is deleted",
        deleted: [
            "Your user profile.",
            "Your transactions and related metadata.",
            "Your account-linked usage records, including pending items and profile-related stats.",
        ],
        retainedTitle: "What may be retained temporarily",
        retained: [
            "Technical backups or operational logs may persist for a limited period according to infrastructure retention schedules.",
        ],
        privacy: "View privacy policy",
    },
} as const;

export default function DeleteAccountPage() {
    const { lang, setLang } = useLanguage();
    const copy = DELETE_ACCOUNT_COPY[lang];

    return (
        <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-main)", padding: "2rem 1.25rem 4rem" }}>
            <div style={{ maxWidth: "760px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
                    <Link href="/" style={{ color: "var(--primary)", fontWeight: 800, textDecoration: "none" }}>
                        {copy.back}
                    </Link>
                    <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "999px", padding: "0.2rem", gap: "0.2rem" }}>
                        <button type="button" onClick={() => setLang("es")} style={{ border: 0, cursor: "pointer", borderRadius: "999px", padding: "0.45rem 0.8rem", background: lang === "es" ? "var(--primary)" : "transparent", color: lang === "es" ? "var(--primary-text)" : "var(--text-muted)", fontWeight: 800 }}>ES</button>
                        <button type="button" onClick={() => setLang("en")} style={{ border: 0, cursor: "pointer", borderRadius: "999px", padding: "0.45rem 0.8rem", background: lang === "en" ? "var(--primary)" : "transparent", color: lang === "en" ? "var(--primary-text)" : "var(--text-muted)", fontWeight: 800 }}>EN</button>
                    </div>
                </div>

                <div style={{ border: "1px solid var(--border)", borderRadius: "24px", background: "var(--surface)", padding: "2rem" }}>
                    <div style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "0.74rem", fontWeight: 900, marginBottom: "0.9rem" }}>{copy.eyebrow}</div>
                    <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 0.95, fontWeight: 950 }}>{copy.title}</h1>
                    <p style={{ color: "var(--text-muted)", lineHeight: 1.7, maxWidth: "62ch", margin: "1rem 0 0" }}>{copy.intro}</p>

                    <section style={{ marginTop: "2rem", border: "1px solid var(--border)", borderRadius: "18px", padding: "1.2rem 1.1rem", background: "var(--surface-alt)" }}>
                        <h2 style={{ margin: "0 0 0.8rem", fontSize: "1rem", fontWeight: 900 }}>{copy.stepsTitle}</h2>
                        <ol style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
                            {copy.steps.map((step) => (
                                <li key={step} style={{ marginBottom: "0.45rem" }}>{step}</li>
                            ))}
                        </ol>
                    </section>

                    <section style={{ marginTop: "1rem", border: "1px solid var(--border)", borderRadius: "18px", padding: "1.2rem 1.1rem", background: "var(--surface-alt)" }}>
                        <h2 style={{ margin: "0 0 0.8rem", fontSize: "1rem", fontWeight: 900 }}>{copy.deletedTitle}</h2>
                        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
                            {copy.deleted.map((item) => (
                                <li key={item} style={{ marginBottom: "0.45rem" }}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    <section style={{ marginTop: "1rem", border: "1px solid var(--border)", borderRadius: "18px", padding: "1.2rem 1.1rem", background: "var(--surface-alt)" }}>
                        <h2 style={{ margin: "0 0 0.8rem", fontSize: "1rem", fontWeight: 900 }}>{copy.retainedTitle}</h2>
                        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
                            {copy.retained.map((item) => (
                                <li key={item} style={{ marginBottom: "0.45rem" }}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    <section style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                        <Link href="/privacy" style={{ color: "var(--primary)", fontWeight: 800, textDecoration: "none" }}>
                            {copy.privacy}
                        </Link>
                    </section>
                </div>
            </div>
        </main>
    );
}