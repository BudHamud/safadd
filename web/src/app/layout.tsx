import { Inter, Outfit } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { AppProvider } from "../context/AppContext";
import { Lang, LanguageProvider } from "../context/LanguageContext";
import { DialogProvider } from "../context/DialogContext";
import { APP_LANGUAGE_STORAGE_KEY, normalizeLang, resolveLangFromBrowserList } from "../lib/language";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit', display: 'swap' });

export const metadata = {
    title: "Safed",
    description: "Gestión de finanzas personales con privacidad radical.",
    icons: {
        icon: '/favicon.svg',
    }
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#141714',
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const cookieLang = normalizeLang(cookieStore.get(APP_LANGUAGE_STORAGE_KEY)?.value);
    const headerLang = resolveLangFromBrowserList(
        (headerStore.get('accept-language') ?? '')
            .split(',')
            .map((entry) => entry.trim().split(';')[0])
    );
    const initialLang: Lang = cookieLang ?? headerLang;

    return (
        <html lang={initialLang} suppressHydrationWarning data-theme="dark" className={`${inter.variable} ${outfit.variable}`}>
            <body suppressHydrationWarning>
                <LanguageProvider initialLang={initialLang}>
                    <DialogProvider>
                        <AppProvider>
                            {children}
                        </AppProvider>
                    </DialogProvider>
                </LanguageProvider>
            </body>
        </html>
    );
}
