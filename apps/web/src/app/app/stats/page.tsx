"use client";
import React from "react";
import { StatsTab } from "../../components/stats";
import { useAppContext } from "../../../context/AppContext";

export default function StatsPage() {
    const context = useAppContext();

    if (!context.isClient || !context.userId) return null;

    return (
        <StatsTab
            transactions={context.mappedTransactions}
            globalCurrency={context.globalCurrency}
            monthlyGoal={context.userGoal}
        />
    );
}
