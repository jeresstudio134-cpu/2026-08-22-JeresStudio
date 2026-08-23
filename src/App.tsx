import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/auth.js";
import { Product, StoreSettings, Order } from "./types/index.js";
import { api } from "./lib/api.js";

// Public Pages
import { Navbar } from "./pages/public/Navbar.js";
import { LandingPage } from "./pages/public/LandingPage.js";
import { PublicPriceList } from "./pages/public/PublicPriceList.js";
import { ContactPage } from "./pages/public/ContactPage.js";
import { Footer } from "./pages/public/Footer.js";

// Admin Pages
import { AdminLogin } from "./pages/admin/AdminLogin.js";
import { AdminLayout } from "./pages/admin/AdminLayout.js";
import { AdminDashboard } from "./pages/admin/AdminDashboard.js";
import { AdminOrders } from "./pages/admin/AdminOrders.js";
import { AdminProducts } from "./pages/admin/AdminProducts.js";
import { AdminVendors } from "./pages/admin/AdminVendors.js";
import { AdminFinance } from "./pages/admin/AdminFinance.js";
import { AdminSettings } from "./pages/admin/AdminSettings.js";

// Print Invoice Dedicated Page
import { PdfInvoicePage } from "./pages/admin/PdfInvoicePage.js";

function MainApp() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Navigation state
  // 'public' or 'admin'
  const [viewScope, setViewScope] = useState<"public" | "admin">("public");
  // Public tabs: 'beranda', 'pricelist', 'kontak'
  const [publicTab, setPublicTab] = useState<string>("beranda");
  // Admin tabs: 'dashboard', 'orders', 'products', 'vendors', 'settings'
  const [adminTab, setAdminTab] = useState<string>("dashboard");

  // Shared Data
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [deadlineCount, setDeadlineCount] = useState<number>(0);

  // Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("jeres_theme") === "dark";
  });

  // Printable Order Modal
  const [printableOrder, setPrintableOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("jeres_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("jeres_theme", "light");
    }
  }, [darkMode]);

  const loadInitialData = async () => {
    try {
      const [prodRes, setRes] = await Promise.all([
        api.getProducts({ activeOnly: true }),
        api.getSettings(),
      ]);
      setProducts(prodRes.products);
      setSettings(setRes.settings);
    } catch (err) {
      console.error("Initial data load error:", err);
    }
  };

  const refreshDeadlineAlerts = async () => {
    if (isAuthenticated) {
      try {
        const stats = await api.getDashboardStats();
        setDeadlineCount(stats.deadlineApproachingCount);
      } catch (err) {
        console.error("Deadline refresh error:", err);
      }
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Dynamic favicon update based on uploaded custom logo
    const faviconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (faviconLink) {
      if (settings?.logo_url) {
        faviconLink.href = settings.logo_url;
      } else {
        faviconLink.href = "/favicon.svg";
      }
    }

    // Dynamic title update based on store name
    document.title = settings?.nama_toko || "Jeres Studio";
  }, [settings?.logo_url, settings?.nama_toko]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshDeadlineAlerts();
    }
  }, [isAuthenticated]);

  // Navigate handlers
  const handleOpenLogin = () => {
    setViewScope("admin");
  };

  const handleBackToPublic = () => {
    setViewScope("public");
  };

  const handlePublicNavigate = (tab: string) => {
    setPublicTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            Memuat Sistem Jeres Studio...
          </p>
        </div>
      </div>
    );
  }

  if (printableOrder) {
    return (
      <PdfInvoicePage
        order={printableOrder}
        settings={settings}
        onBack={() => setPrintableOrder(null)}
      />
    );
  }

  // --- RENDER VIEW ---
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors selection:bg-indigo-500 selection:text-white">
      <div id="main-app-wrapper" className="min-h-screen flex flex-col flex-1 print:hidden">
        {viewScope === "public" ? (
          // PUBLIC WEBSITE
          <>
            <Navbar
              currentTab={publicTab}
              setCurrentTab={handlePublicNavigate}
              onOpenLogin={handleOpenLogin}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              settings={settings}
            />

            <main className="flex-1">
              {publicTab === "beranda" && (
                <LandingPage
                  products={products}
                  settings={settings}
                  onNavigate={handlePublicNavigate}
                />
              )}
              {publicTab === "pricelist" && (
                <PublicPriceList products={products} settings={settings} />
              )}
              {publicTab === "kontak" && <ContactPage settings={settings} />}
            </main>

            <Footer
              settings={settings}
              onNavigate={handlePublicNavigate}
              onOpenLogin={handleOpenLogin}
            />
          </>
        ) : (
          // ADMIN PORTAL
          <>
            {!isAuthenticated ? (
              <AdminLogin
                onBackToPublic={handleBackToPublic}
                onLoginSuccess={() => {
                  setViewScope("admin");
                  setAdminTab("dashboard");
                  refreshDeadlineAlerts();
                }}
              />
            ) : (
              <AdminLayout
                currentAdminTab={adminTab}
                setCurrentAdminTab={setAdminTab}
                onBackToPublic={handleBackToPublic}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                deadlineCount={deadlineCount}
                settings={settings}
              >
                {adminTab === "dashboard" && (
                  <AdminDashboard
                    onNavigateOrders={() => setAdminTab("orders")}
                    onNavigateProducts={() => setAdminTab("products")}
                    onNavigateFinance={() => setAdminTab("finance")}
                    onPrintOrder={(order) => setPrintableOrder(order)}
                    settings={settings}
                  />
                )}

                {adminTab === "orders" && (
                  <AdminOrders
                    onPrintOrder={(order) => setPrintableOrder(order)}
                    settings={settings}
                  />
                )}

                {adminTab === "products" && <AdminProducts />}

                {adminTab === "vendors" && <AdminVendors />}

                {adminTab === "finance" && <AdminFinance settings={settings} />}

                {adminTab === "settings" && (
                  <AdminSettings
                    settings={settings}
                    onRefreshSettings={loadInitialData}
                  />
                )}
              </AdminLayout>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
