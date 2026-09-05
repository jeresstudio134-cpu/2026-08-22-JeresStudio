import React, { useState, useMemo, useEffect } from "react";
import { Product, Vendor, MarginThresholdSettings } from "../../types/index.js";
import { formatRupiah } from "../../lib/utils.js";
import { api } from "../../lib/api.js";
import {
  Truck,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Play,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Search,
} from "lucide-react";

interface SimulationRow {
  productId: number;
  productName: string;
  category: string;
  unit: string;
  currentSellingPrice: number;
  currentModal: number;
  newModal: number;
  currentMarginNominal: number;
  currentMarginPercent: number;
  newMarginNominal: number;
  newMarginPercent: number;
  recommendedNewPrice: number;
  recommendedPriceDiff: number;
  isMarginUnsafe: boolean;
  selected: boolean;
  pvId?: number;
}

interface HppVendorBatchSimulationProps {
  products: Product[];
  vendors: Vendor[];
  marginThresholds: MarginThresholdSettings;
  onRefreshData: () => Promise<void>;
  onShowToast: (message: string, type?: "success" | "error" | "info") => void;
}

export const HppVendorBatchSimulation: React.FC<HppVendorBatchSimulationProps> = ({
  products,
  vendors,
  marginThresholds,
  onRefreshData,
  onShowToast,
}) => {
  // Vendor selection
  const [selectedVendorId, setSelectedVendorId] = useState<number | "all">(
    vendors.length > 0 ? vendors[0].id : "all"
  );

  // Search & Filter in simulation table
  const [tableSearch, setTableSearch] = useState("");

  // Change type: 'percentage' (+10%) or 'flat' (+Rp 2.000) or 'new_fixed' (Set modal Rp)
  const [changeType, setChangeType] = useState<"percentage" | "flat">("percentage");
  const [changePercentage, setChangePercentage] = useState<number>(10);
  const [changeNominal, setChangeNominal] = useState<number>(2000);

  // Minimum Safe Margin Threshold (default 15% or from marginThresholds.margin_threshold_warning)
  const [safeMarginThreshold, setSafeMarginThreshold] = useState<number>(
    marginThresholds?.margin_threshold_warning || 15
  );

  // Option to maintain original margin % or fixed target margin
  const [targetMarginStrategy, setTargetMarginStrategy] = useState<"maintain_original" | "fixed_target">("maintain_original");
  const [fixedTargetMarginPercent, setFixedTargetMarginPercent] = useState<number>(30);

  // Simulation execution trigger
  const [simulatedRows, setSimulatedRows] = useState<SimulationRow[]>([]);
  const [hasRunSimulation, setHasRunSimulation] = useState(false);
  const [applyingChanges, setApplyingChanges] = useState(false);

  // Selected vendor object
  const currentVendor = useMemo(() => {
    if (selectedVendorId === "all") return null;
    return vendors.find((v) => v.id === selectedVendorId) || null;
  }, [selectedVendorId, vendors]);

  // Products linked to selected vendor
  const linkedProducts = useMemo(() => {
    if (selectedVendorId === "all") {
      // Products with any vendor
      return products.filter((p) => p.product_vendors && p.product_vendors.length > 0);
    }
    return products.filter((p) =>
      p.product_vendors?.some((pv) => pv.vendor_id === selectedVendorId)
    );
  }, [products, selectedVendorId]);

  // Run simulation function
  const runSimulation = () => {
    if (linkedProducts.length === 0) {
      setSimulatedRows([]);
      setHasRunSimulation(true);
      return;
    }

    const rows: SimulationRow[] = linkedProducts.map((p) => {
      // Find matching PV
      let pv = selectedVendorId === "all"
        ? (p.default_vendor || p.product_vendors?.[0])
        : p.product_vendors?.find((v) => v.vendor_id === selectedVendorId);

      const currentModal = pv?.harga_modal || 0;
      const currentPrice = p.harga || 0;

      // Calculate new modal
      let newModal = currentModal;
      if (changeType === "percentage") {
        newModal = Math.round(currentModal * (1 + changePercentage / 100));
      } else if (changeType === "flat") {
        newModal = Math.max(0, currentModal + changeNominal);
      }

      // Old Margin
      const currentMarginNom = currentPrice - currentModal;
      const currentMarginPct = currentPrice > 0 ? (currentMarginNom / currentPrice) * 100 : 0;

      // New Margin if selling price stays the same
      const newMarginNom = currentPrice - newModal;
      const newMarginPct = currentPrice > 0 ? (newMarginNom / currentPrice) * 100 : 0;

      // Recommended New Selling Price to maintain target margin:
      // Selling Price = NewModal / (1 - TargetMargin)
      let targetMargin = currentMarginPct;
      if (targetMarginStrategy === "fixed_target") {
        targetMargin = fixedTargetMarginPercent;
      } else if (targetMargin < 15) {
        // Floor at 15% if old margin was negative or zero
        targetMargin = Math.max(15, targetMargin);
      }

      const marginRatio = Math.min(0.9, Math.max(0, targetMargin / 100));
      const factor = 1 - marginRatio;
      const recommendedNewPrice = factor > 0 ? Math.round(newModal / factor) : newModal;
      const recommendedPriceDiff = recommendedNewPrice - currentPrice;

      const isMarginUnsafe = newMarginPct < safeMarginThreshold;

      return {
        productId: p.id,
        productName: p.nama_item,
        category: p.kategori,
        unit: p.satuan,
        currentSellingPrice: currentPrice,
        currentModal,
        newModal,
        currentMarginNominal: currentMarginNom,
        currentMarginPercent: Number(currentMarginPct.toFixed(1)),
        newMarginNominal: newMarginNom,
        newMarginPercent: Number(newMarginPct.toFixed(1)),
        recommendedNewPrice,
        recommendedPriceDiff,
        isMarginUnsafe,
        selected: true, // Default select all
        pvId: pv?.id,
      };
    });

    setSimulatedRows(rows);
    setHasRunSimulation(true);
  };

  // Run automatically when vendor or parameters change if already run once
  useEffect(() => {
    runSimulation();
  }, [selectedVendorId, changeType, changePercentage, changeNominal, targetMarginStrategy, fixedTargetMarginPercent, safeMarginThreshold]);

  // Select / Deselect All
  const handleToggleSelectAll = () => {
    const allSelected = filteredRows.every((r) => r.selected);
    const targetState = !allSelected;
    setSimulatedRows((prev) =>
      prev.map((r) => {
        const isFiltered = filteredRows.some((fr) => fr.productId === r.productId);
        return isFiltered ? { ...r, selected: targetState } : r;
      })
    );
  };

  const handleToggleRow = (productId: number) => {
    setSimulatedRows((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, selected: !r.selected } : r))
    );
  };

  // Filtered rows for search
  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return simulatedRows;
    const q = tableSearch.toLowerCase();
    return simulatedRows.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q)
    );
  }, [simulatedRows, tableSearch]);

  // Selected count & summary stats
  const selectedRows = useMemo(() => {
    return simulatedRows.filter((r) => r.selected);
  }, [simulatedRows]);

  const unsafeCount = useMemo(() => {
    return simulatedRows.filter((r) => r.isMarginUnsafe).length;
  }, [simulatedRows]);

  // Apply batch changes to Price List & Vendor Cost in database
  const handleApplyBatchChanges = async () => {
    if (selectedRows.length === 0) {
      onShowToast("Pilih minimal satu produk untuk diupdate.", "error");
      return;
    }

    try {
      setApplyingChanges(true);

      const itemsToUpdate = selectedRows.map((r) => ({
        productId: r.productId,
        newPrice: r.recommendedNewPrice,
        newVendorCost: r.newModal,
        vendorId: selectedVendorId !== "all" ? Number(selectedVendorId) : undefined,
        updatePrice: true,
        updateVendorCost: true,
      }));

      const res = await api.batchApplySimulations(itemsToUpdate);

      await onRefreshData();
      onShowToast(res.message || `Berhasil memperbarui ${selectedRows.length} produk ke Price List!`, "success");
    } catch (err: any) {
      console.error("Gagal update simulasi:", err);
      onShowToast(err.message || "Gagal menerapkan perubahan simulasi", "error");
    } finally {
      setApplyingChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Parameter Box Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Simulasi Kenaikan / Penyesuaian Harga Massal Vendor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulasikan dampak fluktuasi harga bahan baku supplier terhadap margin keuntungan & rekomendasikan harga jual baru otomatis.
              </p>
            </div>
          </div>

          <button
            onClick={runSimulation}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Jalankan Ulang Simulasi</span>
          </button>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Pilih Vendor */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              1. Pilih Vendor Supplier
            </label>
            <select
              value={selectedVendorId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedVendorId(val === "all" ? "all" : Number(val));
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nama_vendor} ({v.kategori_supply || "General"})
                </option>
              ))}
              <option value="all">-- Semua Vendor Terhubung ({vendors.length} Vendor) --</option>
            </select>
            <p className="text-[11px] text-slate-400">
              {linkedProducts.length} produk terhubung dengan vendor ini.
            </p>
          </div>

          {/* 2. Jenis Perubahan Modal */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              2. Perubahan Harga Modal
            </label>

            <div className="flex items-center gap-2">
              {/* Type Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setChangeType("percentage")}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    changeType === "percentage"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  % Persen
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType("flat")}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    changeType === "flat"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Rp Flat
                </button>
              </div>

              {/* Value Input */}
              <div className="relative flex-1">
                {changeType === "percentage" ? (
                  <>
                    <input
                      type="number"
                      step={1}
                      value={changePercentage}
                      onChange={(e) => setChangePercentage(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </>
                ) : (
                  <>
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      step={500}
                      value={changeNominal}
                      onChange={(e) => setChangeNominal(Number(e.target.value))}
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1 pt-1">
              {changeType === "percentage" ? (
                [-10, -5, 5, 10, 15, 20].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setChangePercentage(p)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  >
                    {p > 0 ? `+${p}%` : `${p}%`}
                  </button>
                ))
              ) : (
                [1000, 2000, 3000, 5000, 10000].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setChangeNominal(n)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  >
                    +{formatRupiah(n)}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 3. Batas Margin & Strategi Harga Baru */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              3. Batas Margin Aman & Rekomendasi
            </label>
            <div className="flex items-center gap-2">
              <div className="w-1/2">
                <span className="text-[10px] text-slate-400 block font-medium">Batas Margin Tipis</span>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={safeMarginThreshold}
                    onChange={(e) => setSafeMarginThreshold(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                </div>
              </div>

              <div className="w-1/2">
                <span className="text-[10px] text-slate-400 block font-medium">Strategi Rekomendasi</span>
                <select
                  value={targetMarginStrategy}
                  onChange={(e) => setTargetMarginStrategy(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="maintain_original">Pertahankan Margin Semula</option>
                  <option value="fixed_target">Target Margin 30%</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Warning for Unsafe Margins */}
      {unsafeCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Peringatan Margin Kritis: </span>
              <span>
                Terdapat <strong>{unsafeCount} produk</strong> yang marginnya akan turun di bawah batas aman (&lt; {safeMarginThreshold}%) jika harga jual tidak dinaikkan.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Result Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Cari produk dalam simulasi..."
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none w-48 sm:w-64"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total {simulatedRows.length} produk
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              {filteredRows.length > 0 && filteredRows.every((r) => r.selected) ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Batal Pilih Semua</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pilih Semua</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && filteredRows.every((r) => r.selected)}
                    onChange={handleToggleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Nama Produk & Satuan</th>
                <th className="py-3 px-3 text-right">Modal Lama → Baru</th>
                <th className="py-3 px-3 text-right">Harga Jual Saat Ini</th>
                <th className="py-3 px-3 text-center">Margin Lama → Baru</th>
                <th className="py-3 px-3 text-right">Rekomendasi Harga Jual</th>
                <th className="py-3 px-3 text-right">Penyesuaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tidak ada produk yang cocok dengan vendor/filter ini.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.productId}
                    onClick={() => handleToggleRow(row.productId)}
                    className={`transition-colors cursor-pointer ${
                      row.selected
                        ? "bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => handleToggleRow(row.productId)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Product Name & Category */}
                    <td className="py-3.5 px-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {row.category}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">{row.productName}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Satuan: /{row.unit}</span>
                    </td>

                    {/* Modal Old -> New */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div className="text-slate-400 line-through text-[11px]">
                        {formatRupiah(row.currentModal)}
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {formatRupiah(row.newModal)}
                      </div>
                    </td>

                    {/* Current Price */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {formatRupiah(row.currentSellingPrice)}
                    </td>

                    {/* Margin Old -> New */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {row.currentMarginPercent}%
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border ${
                            row.isMarginUnsafe
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                              : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {row.newMarginPercent}%
                        </span>
                      </div>
                    </td>

                    {/* Recommended New Price */}
                    <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatRupiah(row.recommendedNewPrice)}
                    </td>

                    {/* Price Diff */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      {row.recommendedPriceDiff > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <TrendingUp className="w-3 h-3" />
                          +{formatRupiah(row.recommendedPriceDiff)}
                        </span>
                      ) : row.recommendedPriceDiff < 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold">
                          <TrendingDown className="w-3 h-3" />
                          {formatRupiah(row.recommendedPriceDiff)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Rp 0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Action Footer Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {selectedRows.length} dari {simulatedRows.length} produk terpilih
            </span>
            <span>untuk diperbarui ke Price List & modal vendor.</span>
          </div>

          <button
            type="button"
            onClick={handleApplyBatchChanges}
            disabled={selectedRows.length === 0 || applyingChanges}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {applyingChanges
                ? "Menerapkan Pembaruan..."
                : `Terapkan Perubahan Terpilih (${selectedRows.length}) ke Price List`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
