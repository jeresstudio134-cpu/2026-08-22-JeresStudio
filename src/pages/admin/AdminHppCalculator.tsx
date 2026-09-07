import React, { useState, useEffect } from "react";
import { Product, Vendor, MarginThresholdSettings } from "../../types/index.js";
import { api } from "../../lib/api.js";
import { HppProductCalculator } from "../../components/hpp/HppProductCalculator.js";
import { HppVendorBatchSimulation } from "../../components/hpp/HppVendorBatchSimulation.js";
import {
  Calculator,
  Truck,
  Sparkles,
  Layers,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  X,
} from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export const AdminHppCalculator: React.FC = () => {
  // Mode Switcher: "product" | "vendor_batch"
  const [activeMode, setActiveMode] = useState<"product" | "vendor_batch">("product");

  // State data
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [marginThresholds, setMarginThresholds] = useState<MarginThresholdSettings>({
    margin_threshold_good: 20,
    margin_threshold_warning: 10,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = async (isManualRefresh: boolean = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const [prodRes, venRes, thresholdRes] = await Promise.all([
        api.getProducts({ activeOnly: false }),
        api.getVendors(),
        api.getMarginThresholds().catch(() => ({ margin_threshold_good: 20, margin_threshold_warning: 10 })),
      ]);

      setProducts(prodRes.products || []);
      setVendors(venRes.vendors || []);
      if (thresholdRes) {
        setMarginThresholds({
          margin_threshold_good: thresholdRes.margin_threshold_good || 20,
          margin_threshold_warning: thresholdRes.margin_threshold_warning || 10,
        });
      }
    } catch (err) {
      console.error("Gagal memuat data Kalkulator HPP:", err);
      showToast("Gagal memuat data produk & vendor", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                : toast.type === "error"
                ? "bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800"
                : "bg-indigo-50 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : toast.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* ========================================================
          HEADER SECTION
      ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Kalkulator HPP
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
              Pro
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hitung harga pokok produksi, simulasikan margin, dan terapkan langsung ke price list
          </p>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode("product")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "product"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Kalkulator Produk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("vendor_batch")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "vendor_batch"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Simulasi Massal Vendor</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ========================================================
          PAGE CONTENT BASED ON ACTIVE MODE
      ======================================================== */}
      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            <p className="text-xs text-slate-500 font-semibold">Memuat Data Produk & Vendor...</p>
          </div>
        </div>
      ) : (
        <>
          {activeMode === "product" && (
            <HppProductCalculator
              products={products}
              vendors={vendors}
              marginThresholds={marginThresholds}
              onRefreshData={loadData}
              onShowToast={showToast}
            />
          )}

          {activeMode === "vendor_batch" && (
            <HppVendorBatchSimulation
              products={products}
              vendors={vendors}
              marginThresholds={marginThresholds}
              onRefreshData={loadData}
              onShowToast={showToast}
            />
          )}
        </>
      )}
    </div>
  );
};
