"use client";

import React, { useEffect, useState } from "react";
import {
  BankNotifToast,
  ColorCustomizerOverlay,
  DashboardTab,
  DataVaultLoader,
  IconShapes,
  MovementsTab,
  NewOrderModal,
  ProfileTab,
  Sidebar,
  StatsTab,
  TransactionDetailsModal,
} from "./components";
import { useAppContext, useLanguage } from "../context";
import {
  PendingBankTransaction,
  useAndroidBackButton,
  useBankNotifications,
} from "../hooks";
import { usePathname, useRouter } from "next/navigation";
import "./page.css";

type AppTab = "dashboard" | "movements" | "stats" | "profile";

const TAB_PATHS: Record<AppTab, string> = {
  dashboard: "/app",
  movements: "/app/movements",
  stats: "/app/stats",
  profile: "/app/profile",
};

const getTabFromPath = (path: string): AppTab => {
  if (path.includes("/app/movements")) return "movements";
  if (path.includes("/app/stats")) return "stats";
  if (path.includes("/app/profile")) return "profile";
  return "dashboard";
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AppTab>(() =>
    getTabFromPath(pathname),
  );

  // Handle Android hardware back button
  useAndroidBackButton();

  // ── Bank sync settings (synced from ProfileTab via localStorage) ──
  const [bankSyncEnabled, setBankSyncEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bankSyncEnabled") === "true";
  });
  const [autoAddEnabled, setAutoAddEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bankAutoAddEnabled") === "true";
  });

  // ── Notification panel state ───────────────────────────────
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  // Keeps track of which pending DB entry to delete after modal save
  const [pendingNotifId, setPendingNotifId] = useState<string | null>(null);

  const onAutoSaved = React.useCallback(() => {
    if (context.userId) context.loadUserTransactions(context.userId);
  }, [context]);

  // ── Bank notification listener ─────────────────────────────
  const {
    pending,
    permissionGranted,
    requestPermission,
    dismissPending,
    processNotification,
  } = useBankNotifications({
    enabled: bankSyncEnabled,
    userId: context.userId ?? "",
    authenticatedFetch: context.authenticatedFetch,
    autoAdd: autoAddEnabled,
    apiBase: "",
    onAutoSaved,
  });

  // ── Handle confirm: open NewOrderModal pre-filled ──────────
  const handleBankConfirm = React.useCallback(
    async (item: PendingBankTransaction) => {
      // Build initial data for the modal from the parsed notification
      const initialData = {
        desc: item.merchant,
        amount: item.amount,
        tag: item.tag,
        type: item.type as "expense" | "income",
        currency: item.currency,
      };
      // Remember which pending entry to delete after save
      setPendingNotifId(item.id);
      // Close panel if open, then open the pre-filled modal
      setNotifPanelOpen(false);
      context.setAddModalInitialData(initialData);
      context.setIsAddModalOpen(true);
    },
    [context],
  );

  // ── Expose bank sync controls globally so ProfileTab can call them ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).__setBankSync = (enabled: boolean) => {
      setBankSyncEnabled(enabled);
      localStorage.setItem("bankSyncEnabled", String(enabled));
      if (enabled && permissionGranted === false) {
        requestPermission();
      }
    };

    (window as any).__setBankAutoAdd = (enabled: boolean) => {
      setAutoAddEnabled(enabled);
      localStorage.setItem("bankAutoAddEnabled", String(enabled));
    };

    (window as any).__debugNotify = ({ packageName, title, text }: any) => {
      processNotification(packageName, title, text);
    };

    return () => {
      delete (window as any).__setBankSync;
      delete (window as any).__setBankAutoAdd;
      delete (window as any).__debugNotify;
    };
  }, [permissionGranted, processNotification, requestPermission]);

  useEffect(() => {
    if (!context.userName) return;

    router.prefetch("/app");
    router.prefetch("/app/movements");
    router.prefetch("/app/stats");
    router.prefetch("/app/profile");
  }, [context.userName, router]);

  useEffect(() => {
    setActiveTab(getTabFromPath(pathname));
  }, [pathname]);

  const handleNavigate = React.useCallback(
    (nextTab: AppTab) => {
      if (nextTab === activeTab) return;

      setActiveTab(nextTab);
      window.history.pushState(null, "", TAB_PATHS[nextTab]);
    },
    [activeTab],
  );

  if (!context.isClient) return null;

  // Sin sesión: devolvemos children directo (la página /app lo maneja con AuthModal)
  // Agregamos SplashScreen aquí también para que se muestre en el login
  if (!context.userName) {
    return <>{children}</>;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case "movements":
        if (!context.userId) return null;
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
      case "stats":
        if (!context.userId) return null;
        return (
          <StatsTab
            transactions={context.mappedTransactions}
            globalCurrency={context.globalCurrency}
            monthlyGoal={context.userGoal}
          />
        );
      case "profile":
        if (!context.userId) return null;
        return (
          <ProfileTab
            userName={context.userName!}
            userEmail={context.userEmail}
            theme={context.theme}
            toggleTheme={context.toggleTheme}
            onLogout={() => {
              context.handleLogout();
              router.push("/app");
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
            onCategoryChangeInfo={() => context.setCatSignal((c) => c + 1)}
          />
        );
      case "dashboard":
      default:
        return (
          <DashboardTab
            transactions={context.mappedTransactions}
            totalIncome={context.totalIncome}
            totalExpense={context.totalExpense}
            currentBalance={context.currentBalance}
            monthlyGoal={context.userGoal}
            savingsTarget={context.savingsTarget}
            onTransactionClick={context.setSelectedTransaction}
            globalCurrency={context.globalCurrency}
            isTravelMode={!!context.travelModeStart}
            toggleTravelMode={context.toggleTravelMode}
            allTransactions={context.transactions}
            setIsAddModalOpen={context.setIsAddModalOpen}
            setAddModalInitialData={context.setAddModalInitialData}
          />
        );
    }
  };

  return (
    <div className="app-wrapper">
      <DataVaultLoader
        isVisible={context.isLoadingTransactions}
        title={t("common.loading_data")}
        subtitle={t("common.loading_data_hint")}
      />

      <Sidebar
        theme={context.theme}
        toggleTheme={context.toggleTheme}
        activeTab={activeTab}
        userName={context.userName}
        onLogout={() => {
          context.handleLogout();
          router.push("/app");
        }}
        onAddClick={() => context.setIsAddModalOpen(true)}
        travelModeStart={context.travelModeStart}
        toggleTravelMode={context.toggleTravelMode}
        pendingCount={pending.length}
        onBellClick={() => setNotifPanelOpen(true)}
        onNavigate={handleNavigate}
      />

      <header className="app-header">
        <div className="app-header-left">
          <div className="app-user-avatar">
            {context.userName.charAt(0).toUpperCase()}
          </div>
          <div className="app-user-info">
            <span className="app-system-status">
              {bankSyncEnabled
                ? t("header.banks_active")
                : t("header.system_active")}
            </span>
            <span className="app-welcome">
              {t("header.hello")}, {context.userName}
            </span>
          </div>
        </div>
        {/* ... app-header-right ... */}
        <div className="app-header-right">
          <div
            className="app-icon-btn"
            onClick={() => setNotifPanelOpen(true)}
            style={{ cursor: "pointer" }}
          >
            <IconShapes type="bell" />
            {pending.length > 0 && (
              <span className="notif-badge">{pending.length}</span>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {context.userName ? renderActiveTab() : children}
      </main>

      <button
        className="brutalist-btn fab-btn"
        onClick={() => context.setIsAddModalOpen(true)}
      >
        <IconShapes type="plus" />
      </button>

      <NewOrderModal
        isOpen={context.isAddModalOpen}
        onClose={() => {
          context.setIsAddModalOpen(false);
          context.setAddModalInitialData(null);
          setPendingNotifId(null);
        }}
        onSave={async (tx) => {
          await context.saveTransaction(tx);
          if (pendingNotifId) {
            await context.authenticatedFetch(`/api/parse-notification?id=${pendingNotifId}`, {
              method: "DELETE",
            });
            dismissPending(pendingNotifId);
            setPendingNotifId(null);
          }
          context.setIsAddModalOpen(false);
        }}
        availableCategories={context.allCategories}
        initialData={context.addModalInitialData}
        globalCurrency={context.globalCurrency}
      />

      <TransactionDetailsModal
        transaction={context.selectedTransaction}
        onClose={() => context.setSelectedTransaction(null)}
        onDelete={async (id) => {
          await context.handleDeleteTransaction(id);
          context.setSelectedTransaction(null);
        }}
        onUpdate={(updatedTransaction) => {
          void context.updateTransaction(updatedTransaction);
          context.setSelectedTransaction(null);
        }}
        globalCurrency={context.globalCurrency}
        availableCategories={context.allCategories}
      />

      <BankNotifToast
        pending={pending}
        onConfirm={handleBankConfirm}
        onDismiss={dismissPending}
        globalCurrency={context.globalCurrency}
        panelOpen={notifPanelOpen}
        onClosePanel={() => setNotifPanelOpen(false)}
      />

      <ColorCustomizerOverlay />
    </div>
  );
}
