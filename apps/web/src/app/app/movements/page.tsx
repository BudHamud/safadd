"use client";
import React from "react";
import { MovementsTab } from "../../components/movements";
import { useAppContext } from "../../../context/AppContext";

export default function MovementsPage() {
    const context = useAppContext();

    if (!context.isClient || !context.userId) return null;

    return (
        <MovementsTab
            transactions={context.mappedTransactions}
            userId={context.userId}
            onTransactionsUpdated={() => {
                if (context.userId) context.loadUserTransactions(context.userId);
            }}
            onTransactionClick={context.setSelectedTransaction}
            globalCurrency={context.globalCurrency}
            monthlyGoal={context.userGoal}
            availableCategories={context.allCategories}
        />
    );
}
