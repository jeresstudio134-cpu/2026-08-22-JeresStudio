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

// Dedicated Print Page & Types
import { DedicatedPrintPage } from "./pages/print/DedicatedPrintPage.js";
import { DocumentType } from "./components/print/PrintDocumentRenderer.js";

// PDF Generator
import { downloadInvoicePdf } from "./lib/generateInvoicePdf.js";

function getInitialPrintRoute(): { isPrint: boolean; docType: DocumentType; orderId: string | null } {
  const path = window.location.pathname;
  const hash = window.location.hash;
  const search = new URLSearchParams(window.location.search);

  // Check /print/:docType/:orderId
  const pathMatch = path.match(/^\/print\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) {
    let dt = pathMatch[1] as DocumentType;
    if (dt === ("rekap" as any)) dt = "rekap-pembayaran";
    return { isPrint: true, docType: dt, orderId: pathMatch[2] };
  }

  // Check hash #/print/:docType/:orderId
  const hashMatch = hash.match(/^#\/print\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/);
  if (hashMatch) {
    let dt = hashMatch[1] as DocumentType;
    if (dt === ("rekap" as any)) dt = "rekap-pembayaran";
    return { isPrint: true, docType: dt, orderId: hashMatch[2] };
  }

  // Check search params ?print=nota&id=123
  if (search.get("print")) {
    let dt = (search.get("print") || "nota") as DocumentType;
    if (dt === ("rekap" as any)) dt = "rekap-pembayaran";
    return { isPrint: true, docType: dt, orderId: search.get("id") || search.get("orderId") };
  }

  return { isPrint: false, docType: "nota", orderId: null };
}

function MainApp() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Print route state for dedicated print view
  const [printRoute, setPrintRoute] = useState(getInitialPrintRoute);

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

  const handlePrintOrder = async (order: Order) => {
    try {
      await downloadInvoicePdf(order, settings);
    } catch (err) {
      console.error("Gagal generate PDF:", err);
    }
  };

  // Popstate listener to handle browser back/forward for print route
  useEffect(() => {
    const handlePopState = () => {
      setPrintRoute(getInitialPrintRoute());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  // --- DEDICATED PRINT ROUTE VIEW (/print/:type/:id) ---
  if (printRoute.isPrint) {
    return (
      <DedicatedPrintPage
        initialDocType={printRoute.docType}
        orderId={printRoute.orderId || undefined}
        initialSettings={settings}
        autoPrint={true}
        onClose={() => {
          if (window.opener) {
            window.close();
          } else {
            window.history.pushState({}, "", "/");
            setPrintRoute({ isPrint: false, docType: "nota", orderId: null });
          }
        }}
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
                    onPrintOrder={handlePrintOrder}
                    settings={settings}
                  />
                )}

                {adminTab === "orders" && (
                  <AdminOrders
                    onPrintOrder={handlePrintOrder}
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
