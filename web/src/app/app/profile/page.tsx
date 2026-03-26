"use client";
import React from "react";
import { ProfileTab } from "../../components/profile";
import { useAppContext } from "../../../context/AppContext";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const context = useAppContext();
    const router = useRouter();

    if (!context.isClient || !context.userId) return null;

    return (
        <ProfileTab
            userName={context.userName!}
            userEmail={context.userEmail}
            theme={context.theme}
            toggleTheme={context.toggleTheme}
            onLogout={() => {
                context.handleLogout();
                router.push('/app');
            }}
            transactions={context.mappedTransactions}
            userId={context.userId}
            monthlyGoal={context.userGoal}
            onUpdate={() => {
                if (context.userId) context.loadUserData(context.userId);
            }}
            globalCurrency={context.globalCurrency}
            onCurrencyChange={context.handleCurrencyChange}
            availableCategories={context.allCategories}
            onCategoryChangeInfo={() => context.setCatSignal(c => c + 1)}
        />
    );
}
