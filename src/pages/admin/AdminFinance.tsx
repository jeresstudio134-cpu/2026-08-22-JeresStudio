import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Minus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  PieChart,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Sparkles,
  Camera,
  Receipt,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { Transaction, FinancialSummary, StoreSettings } from "../../types/index.js";
import { formatRupiah, formatTanggal } from "../../lib/utils.js";
import { useAuth } from "../../lib/auth.js";
import { ReceiptScannerModal } from "../../components/ReceiptScannerModal.js";

interface AdminFinanceProps {
  settings?: StoreSettings | null;
}

export const AdminFinance: React.FC<AdminFinanceProps> = ({ settings }) => {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Scanner Modal State
  const [scannerModalOpen, setScannerModalOpen] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all"); // 'all' | 'masuk' | 'keluar'
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all"); // 'all' | 'today' | '7days' | 'month' | 'lastMonth' | 'custom'
  const [kasirFilter, setKasirFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form State
  const [formType, setFormType] = useState<"masuk" | "keluar">("masuk");
  const [formCategory, setFormCategory] = useState("");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formMethod, setFormMethod] = useState("Cash");
  const [formDescription, setFormDescription] = useState("");
  const [formReference, setFormReference] = useState("");

  // Delete Confirmation Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mobile/Compact card expand/collapse state
  const [expandedTxIds, setExpandedTxIds] = useState<Record<number, boolean>>({});

  const toggleExpandTx = (id: number) => {
    setExpandedTxIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Load Data
  const loadFinanceData = async () => {
    try {
      setRefreshing(true);

      // Compute dates based on range filter
      let start = "";
      let end = "";
      const today = new Date();

      if (dateRangeFilter === "today") {
        start = today.toISOString().slice(0, 10);
        end = today.toISOString().slice(0, 10);
      } else if (dateRangeFilter === "7days") {
        const d = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        start = d.toISOString().slice(0, 10);
        end = today.toISOString().slice(0, 10);
      } else if (dateRangeFilter === "month") {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = firstDay.toISOString().slice(0, 10);
        end = today.toISOString().slice(0, 10);
      } else if (dateRangeFilter === "lastMonth") {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        start = firstDay.toISOString().slice(0, 10);
        end = lastDay.toISOString().slice(0, 10);
      } else if (dateRangeFilter === "custom") {
        start = customStartDate;
        end = customEndDate;
      }

      const [txRes, sumRes, catRes] = await Promise.all([
        api.getTransactions({
          tipe: typeFilter !== "all" ? typeFilter : undefined,
          kategori: categoryFilter !== "all" ? categoryFilter : undefined,
          metode: methodFilter !== "all" ? methodFilter : undefined,
          startDate: start || undefined,
          endDate: end || undefined,
          search: searchQuery.trim() || undefined,
        }),
        api.getTransactionSummary(),
        api.getTransactionCategories(),
      ]);

      setTransactions(txRes.transactions || []);
      setSummary(sumRes.summary || null);
      setIncomeCategories(catRes.incomeCategories || []);
      setExpenseCategories(catRes.expenseCategories || []);
    } catch (err: any) {
      console.error("Failed to load finance data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [typeFilter, categoryFilter, methodFilter, dateRangeFilter, customStartDate, customEndDate, searchQuery]);

  // Open Create Modal
  const handleOpenCreateModal = (defaultType: "masuk" | "keluar") => {
    setEditingTransaction(null);
    setFormType(defaultType);
    const defaultCat = defaultType === "masuk" ? incomeCategories[0] || "Penjualan Order Cetak" : expenseCategories[0] || "Kulakan Bahan Baku";
    setFormCategory(defaultCat);
    setCustomCategoryInput("");
    setFormAmount("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormMethod("Cash");
    setFormDescription("");
    setFormReference("");
    setErrorMessage("");
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormType(tx.tipe);
    setFormCategory(tx.kategori);
    setCustomCategoryInput("");
    setFormAmount(tx.nominal.toString());
    setFormDate(new Date(tx.tanggal).toISOString().slice(0, 10));
    setFormMethod(tx.metode_pembayaran || "Cash");
    setFormDescription(tx.keterangan || "");
    setFormReference(tx.referensi || "");
    setErrorMessage("");
    setModalOpen(true);
  };

  // Save Transaction (Create / Update)
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const parsedNominal = Number(formAmount.replace(/\D/g, ""));
    if (isNaN(parsedNominal) || parsedNominal <= 0) {
      setErrorMessage("Nominal transaksi harus lebih dari 0.");
      return;
    }

    const finalCategory = formCategory === "__custom__" ? customCategoryInput.trim() : formCategory.trim();
    if (!finalCategory) {
      setErrorMessage("Kategori transaksi harus dipilih atau diisi.");
      return;
    }

    if (!formDescription.trim()) {
      setErrorMessage("Keterangan transaksi wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        tipe: formType,
        kategori: finalCategory,
        nominal: parsedNominal,
        tanggal: formDate,
        metode_pembayaran: formMethod,
        keterangan: formDescription.trim(),
        referensi: formReference.trim(),
      };

      if (editingTransaction) {
        await api.updateTransaction(editingTransaction.id, payload);
        setSuccessMessage("Transaksi kas berhasil diperbarui!");
      } else {
        await api.createTransaction(payload);
        setSuccessMessage(`Transaksi ${formType === "masuk" ? "pemasukan" : "pengeluaran"} berhasil dicatat!`);
      }

      setModalOpen(false);
      await loadFinanceData();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan transaksi.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeleting(true);
      await api.deleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
      setSuccessMessage("Transaksi kas berhasil dihapus.");
      await loadFinanceData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      alert("Gagal menghapus transaksi: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("Tidak ada transaksi untuk diekspor.");
      return;
    }

    const headers = ["ID", "Tipe", "Kategori", "Nominal (Rp)", "Tanggal", "Metode Pembayaran", "Keterangan", "Referensi", "Dicatat Oleh"];
    const rows = transactions.map((t) => [
      t.id,
      t.tipe === "masuk" ? "PEMASUKAN" : "PENGELUARAN",
      `"${t.kategori.replace(/"/g, '""')}"`,
      t.nominal,
      `"${new Date(t.tanggal).toLocaleString("id-ID")}"`,
      `"${t.metode_pembayaran}"`,
      `"${t.keterangan.replace(/"/g, '""')}"`,
      `"${(t.referensi || "-").replace(/"/g, '""')}"`,
      `"${t.created_by || "-"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-kas-jeres-studio-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Available categories based on modal form type
  const availableFormCategories = formType === "masuk" ? incomeCategories : expenseCategories;

  // Filtered transactions for display (including kasir filter)
  const uniqueKasirs = Array.from(
    new Set(transactions.map((t) => t.created_by || "Admin").filter(Boolean))
  );

  const displayedTransactions = transactions.filter((tx) => {
    if (kasirFilter !== "all" && (tx.created_by || "Admin") !== kasirFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Fast Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Manajemen Keuangan Kas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan kas masuk & keluar, omzet cetak, pengeluaran operasional, dan monitoring saldo Jeres Studio
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadFinanceData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 shadow-xs cursor-pointer transition-colors"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            Segarkan
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 shadow-xs cursor-pointer transition-colors"
            title="Download Spreadsheet CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export CSV
          </button>

          <button
            onClick={() => setScannerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 rounded-lg shadow-xs shadow-indigo-500/20 transition-all hover:scale-[1.02] cursor-pointer"
            title="Scan Foto Nota / Struk Belanja dengan Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Scan AI</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TWO-COLUMN LAYOUT: Desktop/Tablet (>=768px/1024px) 2 columns, Mobile (<768px) 1 column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: 2x2 Summary Cards, Quick Action Buttons, AI Scanner, Category Breakdown */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
          {/* 2x2 Summary Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Card 1: Saldo Kas Bersih */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 truncate">Saldo Bersih</span>
                <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                  (summary?.saldoBersih || 0) >= 0
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                }`}>
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className={`text-base sm:text-lg font-black font-mono tracking-tight leading-tight ${
                  (summary?.saldoBersih || 0) >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600"
                }`}>
                  {formatRupiah(summary?.saldoBersih || 0)}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 truncate">
                  <span>Bulan ini:</span>
                  <span className={`font-mono font-bold ${(summary?.saldoBulanIni || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatRupiah(summary?.saldoBulanIni || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Total Pemasukan */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 truncate">Total Pemasukan</span>
                <div className="w-7 h-7 rounded-lg shrink-0 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight leading-tight">
                  +{formatRupiah(summary?.totalPemasukan || 0)}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 truncate">
                  <span>Bulan ini:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatRupiah(summary?.pemasukanBulanIni || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Total Pengeluaran */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 truncate">Total Pengeluaran</span>
                <div className="w-7 h-7 rounded-lg shrink-0 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight leading-tight">
                  -{formatRupiah(summary?.totalPengeluaran || 0)}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 truncate">
                  <span>Bulan ini:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -{formatRupiah(summary?.pengeluaranBulanIni || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Total Mutasi Transaksi */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 truncate">Catatan Kas</span>
                <div className="w-7 h-7 rounded-lg shrink-0 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight leading-tight">
                  {displayedTransactions.length} <span className="text-xs font-normal text-slate-500">item</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  Total {transactions.length} mutasi tercatat
                </div>
              </div>
            </div>
          </div>

          {/* Fast Action Buttons in Left Column */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleOpenCreateModal("masuk")}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all hover:shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Pemasukan</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal("keluar")}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all hover:shadow cursor-pointer"
            >
              <Minus className="w-4 h-4" />
              <span>- Pengeluaran</span>
            </button>
          </div>

          {/* AI Smart Scanner Banner (Compact) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 text-white shadow-xs border border-indigo-800/40 relative overflow-hidden flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                  <span>Scan Bon Belanja AI</span>
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                </h4>
                <p className="text-[10px] text-indigo-200">
                  Foto nota otomatis dicatat oleh Gemini
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScannerModalOpen(true)}
              className="px-3 py-1.5 text-[11px] font-bold text-slate-900 bg-white hover:bg-indigo-50 rounded-lg shadow-sm shrink-0 cursor-pointer transition-transform hover:scale-105"
            >
              Buka Scanner
            </button>
          </div>

          {/* Category Composition Breakdown (Compact Accordion/Card) */}
          {summary && (summary.breakdownPemasukan.length > 0 || summary.breakdownPengeluaran.length > 0) && (
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-indigo-500" />
                Komposisi Kategori Kas
              </h4>

              {/* Breakdown Pengeluaran Top */}
              {summary.breakdownPengeluaran.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Top Pengeluaran:</span>
                  {summary.breakdownPengeluaran.slice(0, 3).map((cat, idx) => {
                    const pct = summary.totalPengeluaran > 0 ? (cat.total / summary.totalPengeluaran) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="truncate text-slate-600 dark:text-slate-400">{cat.kategori} ({cat.count}x)</span>
                          <span className="font-mono font-semibold text-rose-600 shrink-0">
                            {formatRupiah(cat.total)} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Breakdown Pemasukan Top */}
              {summary.breakdownPemasukan.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Top Pemasukan:</span>
                  {summary.breakdownPemasukan.slice(0, 3).map((cat, idx) => {
                    const pct = summary.totalPemasukan > 0 ? (cat.total / summary.totalPemasukan) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="truncate text-slate-600 dark:text-slate-400">{cat.kategori} ({cat.count}x)</span>
                          <span className="font-mono font-semibold text-emerald-600 shrink-0">
                            {formatRupiah(cat.total)} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Filter Bar & Minimalist Accordion Transaction History */}
        <div className="lg:col-span-7 space-y-3">
          {/* Filter Bar (Compact & Sticky at Top) */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi, keterangan, ref nota, kasir..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Segmented Controls for Type Filter */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              {/* Type Segmented Buttons */}
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => {
                    setTypeFilter("all");
                    setCategoryFilter("all");
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    typeFilter === "all"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => {
                    setTypeFilter("masuk");
                    setCategoryFilter("all");
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    typeFilter === "masuk"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
                  }`}
                >
                  🟢 Masuk
                </button>
                <button
                  onClick={() => {
                    setTypeFilter("keluar");
                    setCategoryFilter("all");
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    typeFilter === "keluar"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-rose-700 dark:text-rose-400 hover:text-rose-800"
                  }`}
                >
                  🔴 Keluar
                </button>
              </div>

              {/* Date Presets Dropdown */}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="month">Bulan Ini</option>
                  <option value="lastMonth">Bulan Lalu</option>
                  <option value="custom">Rentang Kustom...</option>
                </select>
              </div>
            </div>

            {/* Dropdown Filters for Category & Kasir */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
              {/* Category Dropdown */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  {typeFilter !== "keluar" && (
                    <optgroup label="Pemasukan">
                      {incomeCategories.map((c) => (
                        <option key={`in-${c}`} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  )}
                  {typeFilter !== "masuk" && (
                    <optgroup label="Pengeluaran">
                      {expenseCategories.map((c) => (
                        <option key={`out-${c}`} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Kasir / PIC Dropdown */}
              <div>
                <select
                  value={kasirFilter}
                  onChange={(e) => setKasirFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Kasir / Staff</option>
                  {uniqueKasirs.map((kasirName) => (
                    <option key={kasirName} value={kasirName}>{kasirName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Date Pickers Range (when selected) */}
            {dateRangeFilter === "custom" && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-500">Dari:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <span className="font-semibold text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Minimalist Transaction History List Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* List Header */}
            <div className="py-2.5 px-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Riwayat Transaksi ({displayedTransactions.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Klik baris untuk melihat detail
              </span>
            </div>

            {/* Minimalist Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedTransactions.length > 0 ? (
                displayedTransactions.map((tx) => {
                  const isIncome = tx.tipe === "masuk";
                  const isExpanded = expandedTxIds[tx.id] ?? false;
                  const timeStr = new Date(tx.tanggal).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={tx.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      {/* Baris Utama (Compact Single/Double Line) */}
                      <div
                        onClick={() => toggleExpandTx(tx.id)}
                        className="p-3 sm:px-4 cursor-pointer flex items-center justify-between gap-2.5 select-none"
                      >
                        {/* Kiri: Badge + Judul/Kategori + Tanggal & Ref */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Badge Status Minimal */}
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-tight ${
                                isIncome
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800"
                                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800"
                              }`}
                            >
                              {isIncome ? (
                                <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="w-2.5 h-2.5 text-rose-600" />
                              )}
                              {isIncome ? "Masuk" : "Keluar"}
                            </span>

                            {/* Judul Kategori */}
                            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                              {tx.kategori}
                            </span>

                            {/* Ref (Abu-abu kecil) */}
                            {tx.referensi && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Ref: {tx.referensi}
                              </span>
                            )}
                          </div>

                          {/* Subtext: Tanggal, Jam, Metode & Kasir */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            <span>{formatTanggal(tx.tanggal)}</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[10px] text-slate-400 font-mono">{timeStr} WIB</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-slate-600 dark:text-slate-300">{tx.metode_pembayaran || "Cash"}</span>
                            {tx.created_by && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-slate-500">{tx.created_by}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Kanan: Nominal + Icon Buttons (Edit, Hapus, Chevron) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div
                            className={`font-mono font-bold text-xs sm:text-sm text-right ${
                              isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatRupiah(tx.nominal)}
                          </div>

                          {/* Action Icon Buttons */}
                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenEditModal(tx)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Transaksi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(tx.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Accordion Chevron Indicator */}
                          <div className="text-slate-400 pl-0.5">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Collapsible / Accordion Detail Box */}
                      {isExpanded && (
                        <div className="px-3.5 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 text-xs space-y-2">
                          {/* Keterangan */}
                          {tx.keterangan && (
                            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                                Keterangan / Catatan:
                              </span>
                              <p className="text-xs font-medium whitespace-pre-wrap leading-relaxed">
                                {tx.keterangan}
                              </p>
                            </div>
                          )}

                          {/* Detail Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Metode Bayar</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{tx.metode_pembayaran || "Cash"}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Dicatat Oleh</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{tx.created_by || "Admin"}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 col-span-2 sm:col-span-1">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Referensi Nota</span>
                              <span className="font-mono text-slate-800 dark:text-slate-200">{tx.referensi || "-"}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {loading ? "Memuat data kas..." : "Tidak ada transaksi kas yang sesuai dengan filter."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create & Edit Transaction */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                {editingTransaction ? (
                  <>
                    <Edit2 className="w-4 h-4 text-indigo-600" />
                    Edit Transaksi Kas #{editingTransaction.id}
                  </>
                ) : (
                  <>
                    {formType === "masuk" ? (
                      <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
                        <Minus className="w-4 h-4" />
                      </div>
                    )}
                    {formType === "masuk" ? "Catat Pemasukan Kas" : "Catat Pengeluaran Kas"}
                  </>
                )}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Error in modal */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              {/* Tipe Selector Toggle (Only when creating, or allow change) */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipe Transaksi *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("masuk");
                      setFormCategory(incomeCategories[0] || "Penjualan Order Cetak");
                    }}
                    className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer border transition-colors ${
                      formType === "masuk"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    Pemasukan (Uang Masuk)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType("keluar");
                      setFormCategory(expenseCategories[0] || "Kulakan Bahan Baku");
                    }}
                    className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer border transition-colors ${
                      formType === "keluar"
                        ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-500 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    Pengeluaran (Uang Keluar)
                  </button>
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Transaksi *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  {availableFormCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__custom__">+ Kategori Kustom Baru...</option>
                </select>

                {formCategory === "__custom__" && (
                  <input
                    type="text"
                    required
                    placeholder="Ketik nama kategori baru..."
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                )}
              </div>

              {/* Nominal & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nominal Transaksi (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      required
                      min="100"
                      step="500"
                      placeholder="Contoh: 150000"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                  {Number(formAmount) > 0 && (
                    <p className="text-[11px] text-emerald-600 font-mono mt-1">
                      = {formatRupiah(Number(formAmount))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Metode Pembayaran & Referensi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Cash">Cash / Tunai</option>
                    <option value="Transfer BCA">Transfer BCA</option>
                    <option value="Transfer Mandiri">Transfer Mandiri</option>
                    <option value="QRIS">QRIS / E-Wallet</option>
                    <option value="Lainnya">Metode Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No. Referensi / Nota (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: INV-20250821-0001 / PLN-123"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan & Rincian Transaksi *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Pelunasan cetak banner 3x1m & stiker vinyl (Bpk. Joko)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors cursor-pointer ${
                    formType === "masuk"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting
                    ? "Menyimpan..."
                    : editingTransaction
                    ? "Simpan Perubahan"
                    : formType === "masuk"
                    ? "Simpan Pemasukan"
                    : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Hapus Catatan Transaksi?
              </h3>
              <p className="text-xs text-slate-500">
                Transaksi #{deleteConfirmId} akan dihapus dari pembukuan kas. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteTransaction}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onSuccess={(msg) => {
          setSuccessMessage(msg);
          loadFinanceData();
        }}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
      />
    </div>
  );
};
