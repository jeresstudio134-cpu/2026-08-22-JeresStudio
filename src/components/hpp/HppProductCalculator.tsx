import React, { useState, useEffect, useMemo } from "react";
import { Product, Vendor, MarginThresholdSettings } from "../../types/index.js";
import { formatRupiah } from "../../lib/utils.js";
import { api } from "../../lib/api.js";
import {
  Calculator,
  Palette,
  Truck,
  Layers,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Check,
  RotateCcw,
  Save,
  Copy,
  ArrowRight,
  HelpCircle,
  Percent,
  SlidersHorizontal,
  Package,
  Clock,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Tag,
  CheckCircle2,
} from "lucide-react";

interface AdditionalCostItem {
  id: string;
  label: string;
  nominal: number;
}

interface HppDraft {
  id: string;
  title: string;
  timestamp: string;
  productId: number | null;
  productName: string;
  method: "design" | "vendor" | "hybrid";
  vendorCost: number;
  unit: string;
  designFeeType: "flat" | "hourly";
  designFlatFee: number;
  designHours: number;
  designHourlyRate: number;
  additionalCosts: AdditionalCostItem[];
  quantity: number;
  targetMargin: number;
  totalHpp: number;
  recommendedPrice: number;
}

interface HppProductCalculatorProps {
  products: Product[];
  vendors: Vendor[];
  marginThresholds: MarginThresholdSettings;
  onRefreshData: () => Promise<void>;
  onShowToast: (message: string, type?: "success" | "error" | "info") => void;
}

export const HppProductCalculator: React.FC<HppProductCalculatorProps> = ({
  products,
  vendors,
  marginThresholds,
  onRefreshData,
  onShowToast,
}) => {
  // 1. Existing Product Selection
  const [selectedProductId, setSelectedProductId] = useState<number | "new">("new");
  const [selectedVendorId, setSelectedVendorId] = useState<number | "custom">("custom");

  // 2. Method of Work
  const [method, setMethod] = useState<"design" | "vendor" | "hybrid">("hybrid");

  // 3. Vendor Cost
  const [vendorCost, setVendorCost] = useState<number>(15000);
  const [unit, setUnit] = useState<string>("pcs");

  // 4. Design Cost
  const [designFeeType, setDesignFeeType] = useState<"flat" | "hourly">("flat");
  const [designFlatFee, setDesignFlatFee] = useState<number>(25000);
  const [designHours, setDesignHours] = useState<number>(2);
  const [designHourlyRate, setDesignHourlyRate] = useState<number>(35000);

  // 5. Additional Costs
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCostItem[]>([
    { id: "cost-1", label: "Packaging & Plastik", nominal: 2000 },
  ]);

  // 6. Quantity (Scale)
  const [quantity, setQuantity] = useState<number>(1);

  // 7. Target Margin %
  const [targetMargin, setTargetMargin] = useState<number>(30);

  // UI States
  const [savingToPriceList, setSavingToPriceList] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [drafts, setDrafts] = useState<HppDraft[]>(() => {
    try {
      const saved = localStorage.getItem("jeres_hpp_drafts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("stiker");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [showNewProductModal, setShowNewProductModal] = useState(false);

  // Default standard categories
  const defaultCategoryOptions = useMemo(() => [
    { id: "stiker", label: "Stiker & Cutting" },
    { id: "dtf", label: "DTF & Sablon Kaos" },
    { id: "banner", label: "Banner & Spanduk" },
    { id: "jersey", label: "Jersey Custom" },
    { id: "desain", label: "Jasa Desain" },
    { id: "lainnya", label: "Lainnya" },
  ], []);

  // Available categories merged with unique categories from existing products
  const availableCategories = useMemo(() => {
    const catMap = new Map<string, string>();
    defaultCategoryOptions.forEach((c) => catMap.set(c.id.toLowerCase(), c.label));
    products.forEach((p) => {
      if (p.kategori) {
        const k = p.kategori.toLowerCase().trim();
        if (!catMap.has(k)) {
          const lbl = p.kategori.charAt(0).toUpperCase() + p.kategori.slice(1);
          catMap.set(k, lbl);
        }
      }
    });
    return Array.from(catMap.entries()).map(([id, label]) => ({ id, label }));
  }, [products, defaultCategoryOptions]);

  // Preset additionals
  const presetAdditions = [
    { label: "Packaging & Plastik", nominal: 2000 },
    { label: "Ongkir / Ekspedisi", nominal: 10000 },
    { label: "Finishing Laminasi", nominal: 5000 },
    { label: "Mata Ayam & Lem", nominal: 3000 },
    { label: "Biaya Transfer Bank", nominal: 2500 },
    { label: "Listrik & Operasional", nominal: 3000 },
  ];

  // Current selected product object
  const currentProduct = useMemo(() => {
    if (selectedProductId === "new") return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [selectedProductId, products]);

  // When product changes, auto-fill
  useEffect(() => {
    if (currentProduct) {
      setUnit(currentProduct.satuan || "pcs");
      if (currentProduct.kategori === "desain") {
        setMethod("design");
      } else if (currentProduct.product_vendors && currentProduct.product_vendors.length > 0) {
        const def = currentProduct.default_vendor || currentProduct.product_vendors[0];
        setMethod("hybrid");
        setSelectedVendorId(def.vendor_id);
        setVendorCost(def.harga_modal || 0);
      } else {
        setMethod("hybrid");
      }

      // Estimate target margin from existing price
      if (currentProduct.harga > 0 && currentProduct.default_vendor?.harga_modal) {
        const modal = currentProduct.default_vendor.harga_modal;
        const currentMargin = Math.round(((currentProduct.harga - modal) / currentProduct.harga) * 100);
        if (currentMargin > 0 && currentMargin <= 90) {
          setTargetMargin(currentMargin);
        }
      }
    }
  }, [selectedProductId, currentProduct]);

  // When vendor dropdown changes
  const handleVendorSelect = (vendorIdStr: string) => {
    if (vendorIdStr === "custom") {
      setSelectedVendorId("custom");
    } else {
      const vId = Number(vendorIdStr);
      setSelectedVendorId(vId);
      if (currentProduct && currentProduct.product_vendors) {
        const found = currentProduct.product_vendors.find((pv) => pv.vendor_id === vId);
        if (found) {
          setVendorCost(found.harga_modal || 0);
        }
      }
    }
  };

  // Calculations
  const effectiveVendorCost = useMemo(() => {
    if (method === "design") return 0;
    return Math.max(0, vendorCost);
  }, [method, vendorCost]);

  const effectiveDesignCost = useMemo(() => {
    if (method === "vendor") return 0;
    if (designFeeType === "flat") {
      return Math.max(0, designFlatFee);
    }
    return Math.max(0, designHours * designHourlyRate);
  }, [method, designFeeType, designFlatFee, designHours, designHourlyRate]);

  const totalAdditionalCost = useMemo(() => {
    return additionalCosts.reduce((acc, item) => acc + (Number(item.nominal) || 0), 0);
  }, [additionalCosts]);

  // Total HPP for batch
  const totalHpp = useMemo(() => {
    const qty = Math.max(1, quantity);
    // Vendor cost is multiplied by quantity, design fee and additional costs are apportioned or fixed
    return effectiveVendorCost * qty + effectiveDesignCost + totalAdditionalCost;
  }, [effectiveVendorCost, quantity, effectiveDesignCost, totalAdditionalCost]);

  // HPP per Unit
  const hppPerUnit = useMemo(() => {
    const qty = Math.max(1, quantity);
    return Math.round(totalHpp / qty);
  }, [totalHpp, quantity]);

  // Recommended Selling Price Total & Per Unit based on Margin %:
  // Selling Price = HPP / (1 - Margin/100)
  const { recommendedPriceTotal, recommendedPricePerUnit, grossProfitTotal, grossProfitPerUnit } = useMemo(() => {
    const marginRatio = Math.min(0.95, Math.max(0, targetMargin / 100));
    const factor = 1 - marginRatio;

    const totalJual = factor > 0 ? Math.round(totalHpp / factor) : totalHpp;
    const perUnitJual = factor > 0 ? Math.round(hppPerUnit / factor) : hppPerUnit;

    const profitTotal = totalJual - totalHpp;
    const profitPerUnit = perUnitJual - hppPerUnit;

    return {
      recommendedPriceTotal: totalJual,
      recommendedPricePerUnit: perUnitJual,
      grossProfitTotal: profitTotal,
      grossProfitPerUnit: profitPerUnit,
    };
  }, [totalHpp, hppPerUnit, targetMargin]);

  // Comparison with existing price
  const priceComparison = useMemo(() => {
    if (!currentProduct) return null;
    const currentPrice = currentProduct.harga || 0;
    const currentModal = currentProduct.default_vendor?.harga_modal || hppPerUnit;
    const currentMarginNominal = currentPrice - currentModal;
    const currentMarginPercent = currentPrice > 0 ? ((currentMarginNominal / currentPrice) * 100).toFixed(1) : "0";

    const diffNominal = recommendedPricePerUnit - currentPrice;
    const diffPercent = currentPrice > 0 ? ((diffNominal / currentPrice) * 100).toFixed(1) : "0";

    return {
      currentPrice,
      currentModal,
      currentMarginNominal,
      currentMarginPercent,
      diffNominal,
      diffPercent,
      isHigher: diffNominal > 0,
      isLower: diffNominal < 0,
      isSame: diffNominal === 0,
    };
  }, [currentProduct, recommendedPricePerUnit, hppPerUnit]);

  // Additional cost helpers
  const handleAddCost = (preset?: { label: string; nominal: number }) => {
    setAdditionalCosts((prev) => [
      ...prev,
      {
        id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label: preset ? preset.label : "Biaya Lainnya",
        nominal: preset ? preset.nominal : 5000,
      },
    ]);
  };

  const handleUpdateCost = (id: string, field: "label" | "nominal", value: string | number) => {
    setAdditionalCosts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: field === "nominal" ? Number(value) || 0 : value } : c))
    );
  };

  const handleDeleteCost = (id: string) => {
    setAdditionalCosts((prev) => prev.filter((c) => c.id !== id));
  };

  // Apply directly to Price List
  const handleApplyToPriceList = async () => {
    if (!currentProduct) {
      // Prompt user to save as new product
      setShowNewProductModal(true);
      return;
    }

    try {
      setSavingToPriceList(true);
      // 1. Update product selling price
      await api.updateProduct(currentProduct.id, {
        ...currentProduct,
        harga: recommendedPricePerUnit,
        satuan: unit,
      });

      // 2. If vendor cost is defined and vendor selected, update or add product vendor relation
      if (method !== "design" && effectiveVendorCost > 0 && selectedVendorId !== "custom") {
        await api.addProductVendor(currentProduct.id, {
          vendor_id: Number(selectedVendorId),
          harga_modal: effectiveVendorCost,
          is_default: true,
          catatan: `Diperbarui via Kalkulator HPP (${new Date().toLocaleDateString("id-ID")})`,
        });
      }

      await onRefreshData();
      onShowToast(`Harga "${currentProduct.nama_item}" berhasil diperbarui ke ${formatRupiah(recommendedPricePerUnit)}!`, "success");
    } catch (err: any) {
      console.error("Gagal update price list:", err);
      onShowToast(err.message || "Gagal menerapkan harga ke price list", "error");
    } finally {
      setSavingToPriceList(false);
    }
  };

  // Create new product from calculation
  const handleCreateNewProduct = async () => {
    if (!newProductName.trim()) {
      onShowToast("Nama produk baru wajib diisi", "error");
      return;
    }

    const finalCategory = isCustomCategory
      ? customCategoryName.trim().toLowerCase()
      : newProductCategory.trim().toLowerCase();

    if (isCustomCategory && !customCategoryName.trim()) {
      onShowToast("Nama kategori baru wajib diisi", "error");
      return;
    }

    try {
      setSavingToPriceList(true);
      const res = await api.createProduct({
        nama_item: newProductName.trim(),
        kategori: finalCategory || "lainnya",
        satuan: unit,
        harga: recommendedPricePerUnit,
        deskripsi: `Dihitung via Kalkulator HPP. Estimasi HPP: ${formatRupiah(hppPerUnit)}/satuan.`,
        is_active: true,
        tampilkan_harga_publik: true,
      });

      const newProd = res.product;
      if (newProd && method !== "design" && effectiveVendorCost > 0 && selectedVendorId !== "custom") {
        await api.addProductVendor(newProd.id, {
          vendor_id: Number(selectedVendorId),
          harga_modal: effectiveVendorCost,
          is_default: true,
          catatan: `Input dari Kalkulator HPP`,
        });
      }

      await onRefreshData();
      setShowNewProductModal(false);
      setIsCustomCategory(false);
      setCustomCategoryName("");
      setSelectedProductId(newProd.id);
      onShowToast(`Produk baru "${newProd.nama_item}" berhasil ditambahkan ke Price List!`, "success");
    } catch (err: any) {
      console.error("Gagal buat produk baru:", err);
      onShowToast(err.message || "Gagal membuat produk baru", "error");
    } finally {
      setSavingToPriceList(false);
    }
  };

  // Save to Drafts
  const handleSaveDraft = () => {
    const title = currentProduct ? currentProduct.nama_item : newProductName.trim() || `Kalkulasi HPP ${new Date().toLocaleDateString("id-ID")}`;
    const newDraft: HppDraft = {
      id: `draft-${Date.now()}`,
      title,
      timestamp: new Date().toISOString(),
      productId: currentProduct ? currentProduct.id : null,
      productName: title,
      method,
      vendorCost,
      unit,
      designFeeType,
      designFlatFee,
      designHours,
      designHourlyRate,
      additionalCosts,
      quantity,
      targetMargin,
      totalHpp,
      recommendedPrice: recommendedPricePerUnit,
    };

    const updated = [newDraft, ...drafts.slice(0, 19)];
    setDrafts(updated);
    localStorage.setItem("jeres_hpp_drafts", JSON.stringify(updated));
    onShowToast(`Kalkulasi berhasil disimpan ke Draft ("${title}")`, "success");
  };

  const handleLoadDraft = (d: HppDraft) => {
    if (d.productId) {
      setSelectedProductId(d.productId);
    } else {
      setSelectedProductId("new");
    }
    setMethod(d.method);
    setVendorCost(d.vendorCost);
    setUnit(d.unit);
    setDesignFeeType(d.designFeeType);
    setDesignFlatFee(d.designFlatFee);
    setDesignHours(d.designHours);
    setDesignHourlyRate(d.designHourlyRate);
    setAdditionalCosts(d.additionalCosts || []);
    setQuantity(d.quantity || 1);
    setTargetMargin(d.targetMargin || 30);
    setShowDraftModal(false);
    onShowToast(`Draft "${d.title}" berhasil dimuat.`, "info");
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = drafts.filter((d) => d.id !== id);
    setDrafts(updated);
    localStorage.setItem("jeres_hpp_drafts", JSON.stringify(updated));
  };

  // Copy WhatsApp Quotation Format
  const handleCopyQuote = () => {
    const prodName = currentProduct ? currentProduct.nama_item : "Custom Print Item";
    const text = `*ESTIMASI BIAYA & QUOTATION - JERES STUDIO*
---------------------------------------
📦 *Item:* ${prodName}
🔢 *Qty:* ${quantity} ${unit}
💰 *HPP per Satuan:* ${formatRupiah(hppPerUnit)}
🏷️ *Harga Jual Rekomendasi:* ${formatRupiah(recommendedPricePerUnit)} / ${unit}
💵 *Total Tagihan:* ${formatRupiah(recommendedPriceTotal)}

*Rincian Komponen Biaya:*
${method !== "design" ? `• Biaya Produksi Vendor: ${formatRupiah(effectiveVendorCost * quantity)}` : ""}
${method !== "vendor" ? `• Jasa Desain & Setting: ${formatRupiah(effectiveDesignCost)}` : ""}
${additionalCosts.map((c) => `• ${c.label}: ${formatRupiah(c.nominal)}`).join("\n")}
---------------------------------------
_Dihitung otomatis oleh Sistem Kalkulator HPP Jeres Studio_`;

    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
    onShowToast("Rincian quotation disalin ke clipboard!", "info");
  };

  return (
    <div className="space-y-6">
      {/* Drafts Drawer / Modal Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Kalkulator Simulasi HPP Produk</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ubah parameter biaya & margin di kolom kiri untuk melihat simulasi harga real-time di kolom kanan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {drafts.length > 0 && (
            <button
              onClick={() => setShowDraftModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
              <span>Buka Draft ({drafts.length})</span>
            </button>
          )}
          <button
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Draft</span>
          </button>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            KOLOM KIRI: FORM INPUT (7 Cols on LG)
        ======================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section 1: Pemilihan Produk */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  1. Pilih Produk Target
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Opsional</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Produk dari Price List
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedProductId(val === "new" ? "new" : Number(val));
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="new">+ Produk Baru (Belum Terdaftar di Price List)</option>
                <optgroup label="Daftar Produk Existing">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.kategori.toUpperCase()}] {p.nama_item} - {formatRupiah(p.harga)}/{p.satuan}
                    </option>
                  ))}
                </optgroup>
              </select>
              {currentProduct && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {currentProduct.kategori}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{currentProduct.nama_item}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Harga Sekarang: </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      {formatRupiah(currentProduct.harga)}
                    </span>
                    <span className="text-slate-400 text-[10px]">/{currentProduct.satuan}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Metode Pengerjaan */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  2. Metode Pengerjaan
                </span>
              </div>
            </div>

            {/* Segmented Control / Radio Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setMethod("design")}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                  method === "design"
                    ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-950/70 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <Palette className="w-4 h-4" />
                  </div>
                  {method === "design" && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Desain Sendiri</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Jasa setting / file tanpa cetak fisik</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod("vendor")}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                  method === "vendor"
                    ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  {method === "vendor" && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Full Vendor</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Produksi cetak langsung lempar supplier</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod("hybrid")}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                  method === "hybrid"
                    ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  {method === "hybrid" && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Hybrid (Desain + Vendor)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Jasa layout/desain + ongkos cetak supplier</p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Biaya dari Vendor (Visible for Vendor or Hybrid) */}
          {method !== "design" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    3. Biaya dari Vendor Supplier
                  </span>
                </div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Harga Kulakan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vendor Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Vendor Supplier
                  </label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => handleVendorSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="custom">-- Vendor Custom / Non-Terdaftar --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nama_vendor} ({v.kategori_supply || "General"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Satuan Produk */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Satuan Hitung
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="pcs">per Pcs / Lembar</option>
                    <option value="meter">per Meter</option>
                    <option value="lembar">per Lembar (A3+/A4)</option>
                    <option value="lusin">per Lusin (12 pcs)</option>
                    <option value="paket">per Paket / Set</option>
                    <option value="roll">per Roll</option>
                  </select>
                </div>

                {/* Input Modal Vendor */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Biaya Modal Vendor (Rp / {unit})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={vendorCost || ""}
                      onChange={(e) => setVendorCost(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[10000, 15000, 20000, 25000, 35000, 50000, 75000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setVendorCost(preset)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        {formatRupiah(preset)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Biaya Desain (Visible for Design or Hybrid) */}
          {method !== "vendor" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    4. Biaya Jasa Desain & Setting
                  </span>
                </div>

                {/* Toggle Flat Fee vs Hourly */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setDesignFeeType("flat")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      designFeeType === "flat"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Flat Fee
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesignFeeType("hourly")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      designFeeType === "hourly"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Per Jam (Hourly)
                  </button>
                </div>
              </div>

              {designFeeType === "flat" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tarif Desain Flat (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={designFlatFee || ""}
                      onChange={(e) => setDesignFlatFee(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[0, 15000, 25000, 35000, 50000, 100000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDesignFlatFee(preset)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 hover:text-pink-600 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        {preset === 0 ? "Gratis / Rp 0" : formatRupiah(preset)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Estimasi Waktu Pengerjaan
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0.25}
                        step={0.5}
                        value={designHours || ""}
                        onChange={(e) => setDesignHours(Math.max(0.1, Number(e.target.value) || 1))}
                        placeholder="1"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        Jam
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Rate Per Jam (Rp/jam)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={designHourlyRate || ""}
                        onChange={(e) => setDesignHourlyRate(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="35000"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 p-2.5 rounded-lg bg-pink-50/70 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/60 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      Subtotal Biaya Desain ({designHours} jam × {formatRupiah(designHourlyRate)}):
                    </span>
                    <span className="font-bold text-pink-600 dark:text-pink-400 font-mono">
                      {formatRupiah(designHours * designHourlyRate)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 5: Biaya Tambahan (Expandable Dynamic List) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  5. Biaya Tambahan & Overhead
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                Total: {formatRupiah(totalAdditionalCost)}
              </span>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                Pintasan Tambah Biaya:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetAdditions.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddCost(preset)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-indigo-500" />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List of Dynamic Rows */}
            <div className="space-y-2.5 pt-1">
              {additionalCosts.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleUpdateCost(item.id, "label", e.target.value)}
                    placeholder="Nama Biaya (contoh: Packaging)"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={item.nominal || ""}
                      onChange={(e) => handleUpdateCost(item.id, "nominal", e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCost(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Baris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => handleAddCost()}
                className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Biaya Lainnya</span>
              </button>
            </div>
          </div>

          {/* Section 6 & 7: Kuantitas & Slider Target Margin */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  6. Skala Kuantitas & Target Margin
                </span>
              </div>
            </div>

            {/* Input Kuantitas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kuantitas / Jumlah Order
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                    {unit}
                  </span>
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500">HPP per Satuan:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{formatRupiah(hppPerUnit)}</span>
                </div>
              </div>
            </div>

            {/* Slider Target Margin */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Margin Keuntungan (%)
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {targetMargin}%
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={90}
                step={1}
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              {/* Quick Margin Preset Chips */}
              <div className="flex items-center justify-between mt-3 gap-1">
                {[15, 20, 30, 40, 50, 60, 75].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetMargin(preset)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      targetMargin === preset
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            KOLOM KANAN: PREVIEW HASIL REAL-TIME (5 Cols on LG - Sticky)
        ======================================================== */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-5">
          {/* Main Calculation Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 block">
                  Ringkasan Kalkulasi Real-Time
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {currentProduct ? currentProduct.nama_item : "Item Baru (Simulasi)"}
                </h3>
              </div>

              <button
                onClick={handleCopyQuote}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Salin Rincian Quotation"
              >
                {copiedQuote ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Breakdown Rincian Biaya */}
            <div className="space-y-2.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Rincian Komponen Biaya:
              </span>

              {method !== "design" && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Truck className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      Vendor ({formatRupiah(effectiveVendorCost)} × {quantity} {unit})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatRupiah(effectiveVendorCost * quantity)}
                  </span>
                </div>
              )}

              {method !== "vendor" && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Palette className="w-3.5 h-3.5 text-pink-500" />
                    <span>
                      Jasa Desain ({designFeeType === "flat" ? "Flat Fee" : `${designHours} jam`})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatRupiah(effectiveDesignCost)}
                  </span>
                </div>
              )}

              {additionalCosts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="truncate max-w-[170px]">{c.label}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatRupiah(c.nominal)}
                  </span>
                </div>
              ))}

              {additionalCosts.length === 0 && method === "design" && effectiveDesignCost === 0 && (
                <p className="text-slate-400 italic py-1">Belum ada komponen biaya yang dimasukkan.</p>
              )}
            </div>

            {/* Total HPP Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                  Total HPP ({quantity} {unit})
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {quantity > 1 ? `${formatRupiah(hppPerUnit)} / ${unit}` : "Harga Pokok Produksi"}
                </span>
              </div>
              <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                {formatRupiah(totalHpp)}
              </span>
            </div>

            {/* Recommended Selling Price (Highlight) */}
            <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Harga Jual Rekomendasi
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Margin {targetMargin}%
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {formatRupiah(recommendedPricePerUnit)}
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  /{unit}
                </span>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span>Keuntungan Bersih (Gross Profit):</span>
                <span className="font-bold font-mono">
                  +{formatRupiah(grossProfitPerUnit)} / {unit}
                </span>
              </div>

              {quantity > 1 && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400">
                  <span>Total Tagihan ({quantity} {unit}):</span>
                  <span className="font-bold font-mono">{formatRupiah(recommendedPriceTotal)}</span>
                </div>
              )}
            </div>

            {/* Comparison with Current Price List (If Existing Product Selected) */}
            {priceComparison && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                  Perbandingan vs Price List Saat Ini:
                </span>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Harga di Price List:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatRupiah(priceComparison.currentPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Margin Price List:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {priceComparison.currentMarginPercent}% ({formatRupiah(priceComparison.currentMarginNominal)})
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Selisih Penyesuaian:</span>
                  <div className="flex items-center gap-1.5">
                    {priceComparison.isHigher ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{formatRupiah(priceComparison.diffNominal)} (+{priceComparison.diffPercent}%)
                      </span>
                    ) : priceComparison.isLower ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {formatRupiah(priceComparison.diffNominal)} ({priceComparison.diffPercent}%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Sama Persis
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleApplyToPriceList}
                disabled={savingToPriceList}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {savingToPriceList
                    ? "Menyimpan ke Price List..."
                    : currentProduct
                    ? "Terapkan ke Price List"
                    : "+ Simpan Jadi Produk Baru di Price List"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-indigo-500" />
                <span>Simpan sebagai Draft / Catatan HPP</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Simpan Produk Baru */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Simpan Produk Baru ke Price List</h3>
              <button
                onClick={() => setShowNewProductModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Item Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Contoh: Banner Spanduk Flexi 280gr"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Kategori Item <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      if (isCustomCategory) {
                        setCustomCategoryName("");
                      }
                    }}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isCustomCategory ? "← Pilih Kategori Tersedia" : "+ Tambah Kategori Baru"}
                  </button>
                </div>

                {isCustomCategory ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="Ketik nama kategori baru (cth: Sablon Topi, Box Packaging, Mug)"
                      className="w-full px-3 py-2 bg-indigo-50/50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      autoFocus
                    />
                    <p className="text-[10px] text-slate-400">
                      Kategori baru akan otomatis terdaftar dan bisa digunakan pada produk lainnya.
                    </p>
                  </div>
                ) : (
                  <select
                    value={newProductCategory}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setIsCustomCategory(true);
                        setCustomCategoryName("");
                      } else {
                        setNewProductCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                    <option value="__new__" className="text-indigo-600 dark:text-indigo-400 font-bold">
                      + Tambah Kategori Baru...
                    </option>
                  </select>
                )}
              </div>

              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Harga Jual Resmi:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {formatRupiah(recommendedPricePerUnit)} / {unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Estimasi Modal HPP:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {formatRupiah(hppPerUnit)} / {unit}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewProductModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateNewProduct}
                disabled={savingToPriceList}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingToPriceList ? "Menyimpan..." : "Simpan Produk"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Daftar Draft Tersimpan */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Draft Kalkulasi Tersimpan</h3>
              </div>
              <button
                onClick={() => setShowDraftModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {drafts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Belum ada draft tersimpan.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleLoadDraft(d)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-slate-900 dark:text-white">{d.title}</h4>
                      <p className="text-[11px] text-slate-400">
                        {new Date(d.timestamp).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • Margin: {d.targetMargin}%
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono block">
                          {formatRupiah(d.recommendedPrice)}
                        </span>
                        <span className="text-[10px] text-slate-400">HPP: {formatRupiah(d.totalHpp)}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteDraft(d.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
