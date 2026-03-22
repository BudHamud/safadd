import ClientLayout from "../ClientLayout";

export const metadata = {
    title: "Safed - App",
};

export default function AppSegmentLayout({ children }: { children: React.ReactNode }) {
    return <ClientLayout>{children}</ClientLayout>;
}
