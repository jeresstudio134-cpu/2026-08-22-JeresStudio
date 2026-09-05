import React, { useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { StoreSettings } from "../../types/index.js";
import {
  LayoutDashboard,
  Tag,
  ShoppingBag,
  Truck,
  Wallet,
  Settings,
  BookOpen,
  LogOut,
  Globe,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  Printer,
  Shield,
  User,
  AlertTriangle,
  Calculator,
} from "lucide-react";

interface AdminLayoutProps {
  currentAdminTab: string;
  setCurrentAdminTab: (tab: string) => void;
  onBackToPublic: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  deadlineCount?: number;
  settings?: StoreSettings | null;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentAdminTab,
  setCurrentAdminTab,
  onBackToPublic,
  darkMode,
  setDarkMode,
  deadlineCount = 0,
  settings,
  children,
}) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isOwner = user?.role === "owner";

  const allMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard Ringkasan",
      icon: LayoutDashboard,
      badge: deadlineCount > 0 ? deadlineCount : undefined,
    },
    {
      id: "orders",
      label: "Manajemen Orderan",
      icon: ShoppingBag,
    },
    {
      id: "products",
      label: "Price List & Produk",
      icon: Tag,
    },
    {
      id: "calculator",
      label: "Kalkulator HPP",
      icon: Calculator,
    },
    {
      id: "vendors",
      label: "Vendor & Kulakan",
      icon: Truck,
    },
    {
      id: "finance",
      label: "Keuangan (Kas)",
      icon: Wallet,
    },
    {
      id: "settings",
      label: "Pengaturan & Staff",
      icon: Settings,
      ownerOnly: true,
    },
    {
      id: "guides",
      label: "Panduan Kerja",
      icon: BookOpen,
    },
  ];

  const menuItems = allMenuItems.filter((item) => !item.ownerOnly || isOwner);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex transition-colors text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
                  <img
                    src={settings.logo_url}
                    alt={settings.nama_toko || "Logo Toko"}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
              )}
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white uppercase block">
                  {settings?.nama_toko || "Jeres Studio"}
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Panel Administrasi
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentAdminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentAdminTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "bg-rose-500 text-white animate-pulse"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info & Actions Bottom */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          {/* User Profile Card */}
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs">
              {user?.nama?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.nama || "Admin User"}
              </p>
              <span className="inline-block text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                {user?.role || "Staff"}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <button
              onClick={onBackToPublic}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Lihat Website Toko</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight capitalize">
              {menuItems.find((m) => m.id === currentAdminTab)?.label || "Admin Panel"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {deadlineCount > 0 && (
              <button
                onClick={() => setCurrentAdminTab("orders")}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800/60"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>{deadlineCount} Order Dekat Deadline</span>
              </button>
            )}

            {/* Dark Mode Switch */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Mode Gelap/Terang"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="p-3 sm:p-5 lg:p-6 w-full max-w-[1600px] mx-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
