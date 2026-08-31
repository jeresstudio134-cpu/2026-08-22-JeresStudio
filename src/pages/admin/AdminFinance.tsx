import React, { useState, useEffect, useMemo } from "react";
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
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  UserCheck,
  Users,
  Layers,
  Info,
  AlertTriangle,
  Coins,
  Package,
  Calculator,
} from "lucide-react";
import { api } from "../../lib/api.js";
import {
  Transaction,
  FinancialSummary,
  StoreSettings,
  TransactionCategory,
  KantongKasType,
  KantongBalances,
  HppBreakdown,
  ScannedReceiptItem,
} from "../../types/index.js";
import { formatRupiah, formatTanggal } from "../../lib/utils.js";
import { useAuth } from "../../lib/auth.js";
import { ReceiptScannerModal } from "../../components/ReceiptScannerModal.js";
import { CategoryManagerModal } from "../../components/CategoryManagerModal.js";

interface AdminFinanceProps {
  settings?: StoreSettings | null;
}

const KANTONG_CONFIG: Record<
  KantongKasType,
  {
    label: string;
    shortLabel: string;
    description: string;
    color: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    icon: React.ElementType;
  }
> = {
  modal: {
    label: "Kantong Modal (Vendor & Bahan)",
    shortLabel: "Modal",
    description: "Biaya bahan baku, tinta, kertas, & vendor pihak ketiga",
    color: "blue",
    badgeBg: "bg-blue-50 dark:bg-blue-950/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    icon: ShieldCheck,
  },
  overhead: {
    label: "Kantong Overhead (Operasional)",
    shortLabel: "Overhead",
    description: "Listrik, WiFi, sewa toko, maintenance, & ATK",
    color: "amber",
    badgeBg: "bg-amber-50 dark:bg-amber-950/60",
    badgeText: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    icon: Zap,
  },
  gaji_saya: {
    label: "Kantong Gaji Saya (Owner / Desain)",
    shortLabel: "Gaji Saya",
    description: "Honor jasa desain dan porsi pemilik bisnis",
    color: "purple",
    badgeBg: "bg-purple-50 dark:bg-purple-950/60",
    badgeText: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    icon: UserCheck,
  },
  gaji_karyawan: {
    label: "Kantong Gaji Karyawan (Operator)",
    shortLabel: "Gaji Karyawan",
    description: "Upah setting, finishing, & staff operasional",
    color: "teal",
    badgeBg: "bg-teal-50 dark:bg-teal-950/60",
    badgeText: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
    icon: Users,
  },
  margin: {
    label: "Kantong Margin / Profit Toko",
    shortLabel: "Margin",
    description: "Keuntungan bersih toko & cadangan kas ekspansi",
    color: "emerald",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: TrendingUp,
  },
};

export const AdminFinance: React.FC<AdminFinanceProps> = ({ settings }) => {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [allCategories, setAllCategories] = useState<TransactionCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Scanner Modal State
  const [scannerModalOpen, setScannerModalOpen] = useState(false);

  // Category Manager Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Allocation Rules Collapsible State
  const [showAllocationRules, setShowAllocationRules] = useState(false);

  // Filters
  const [kantongFilter, setKantongFilter] = useState<string>("all"); // 'all' | KantongKasType
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
  const [modalMode, setModalMode] = useState<"standard" | "auto_allocate">("standard");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Standard Form State
  const [formType, setFormType] = useState<"masuk" | "keluar">("masuk");
  const [formKantong, setFormKantong] = useState<KantongKasType>("margin");
  const [formCategory, setFormCategory] = useState("");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formMethod, setFormMethod] = useState("Cash");
  const [formDescription, setFormDescription] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formItems, setFormItems] = useState<ScannedReceiptItem[]>([]);

  // Item Management (CRUD) for Standard Modal
  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        nama_item: "",
        qty: 1,
        harga_satuan: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof ScannedReceiptItem,
    value: string | number
  ) => {
    setFormItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === "nama_item") {
        current.nama_item = String(value);
      } else if (field === "qty") {
        const q = Number(value) || 0;
        current.qty = q;
        current.subtotal = Math.round(q * (current.harga_satuan || 0));
      } else if (field === "harga_satuan") {
        const h = Number(value) || 0;
        current.harga_satuan = h;
        current.subtotal = Math.round((current.qty || 1) * h);
      } else if (field === "subtotal") {
        const sub = Number(value) || 0;
        current.subtotal = sub;
        if (current.qty > 0) {
          current.harga_satuan = Math.round(sub / current.qty);
        }
      }

      updated[index] = current;

      // Auto compute total nominal from items
      const newTotal = updated.reduce(
        (sum, it) => sum + (Number(it.subtotal) || (Number(it.qty) || 0) * (Number(it.harga_satuan) || 0)),
        0
      );
      if (newTotal > 0) {
        setFormAmount(newTotal.toString());
      }

      return updated;
    });
  };

  const handleDeleteItem = (index: number) => {
    setFormItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      const newTotal = updated.reduce(
        (sum, it) => sum + (Number(it.subtotal) || (Number(it.qty) || 0) * (Number(it.harga_satuan) || 0)),
        0
      );
      if (newTotal > 0) {
        setFormAmount(newTotal.toString());
      }
      return updated;
    });
  };

  const itemsTotalSubtotal = formItems.reduce(
    (sum, it) => sum + (Number(it.subtotal) || (Number(it.qty) || 0) * (Number(it.harga_satuan) || 0)),
    0
  );

  const handleSyncNominalWithItems = () => {
    if (itemsTotalSubtotal > 0) {
      setFormAmount(itemsTotalSubtotal.toString());
    }
  };

  // Auto Allocate Form State (5 Kantong HPP Splitting)
  const [allocOrderRef, setAllocOrderRef] = useState("");
  const [allocCustomer, setAllocCustomer] = useState("");
  const [allocModal, setAllocModal] = useState("");
  const [allocOverhead, setAllocOverhead] = useState("");
  const [allocGajiSaya, setAllocGajiSaya] = useState("");
  const [allocGajiKaryawan, setAllocGajiKaryawan] = useState("");
  const [allocMargin, setAllocMargin] = useState("");
  const [allocDiskon, setAllocDiskon] = useState("");
  const [allocMethod, setAllocMethod] = useState("Cash");
  const [allocDate, setAllocDate] = useState(new Date().toISOString().slice(0, 10));
  const [allocDesc, setAllocDesc] = useState("");

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
          kantong: kantongFilter !== "all" ? kantongFilter : undefined,
          kategori: categoryFilter !== "all" ? categoryFilter : undefined,
          metode: methodFilter !== "all" ? methodFilter : undefined,
          startDate: start || undefined,
          endDate: end || undefined,
          search: searchQuery.trim() || undefined,
        }),
        api.getTransactionSummary(kantongFilter !== "all" ? kantongFilter : undefined),
        api.getCategories(),
      ]);

      setTransactions(txRes.transactions || []);
      setSummary(sumRes.summary || null);
      setAllCategories(catRes.categories || []);
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
  }, [
    kantongFilter,
    typeFilter,
    categoryFilter,
    methodFilter,
    dateRangeFilter,
    customStartDate,
    customEndDate,
    searchQuery,
  ]);

  // Open Standard Create Modal
  const handleOpenCreateModal = (defaultType: "masuk" | "keluar") => {
    setEditingTransaction(null);
    setModalMode("standard");
    setFormType(defaultType);
    setFormKantong(defaultType === "masuk" ? "margin" : "modal");
    const available = defaultType === "masuk" ? incomeCategories : expenseCategories;
    const defaultCat = available.length > 0 ? available[0] : "__custom__";
    setFormCategory(defaultCat);
    setCustomCategoryInput("");
    setFormAmount("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormMethod("Cash");
    setFormDescription("");
    setFormReference("");
    setFormItems([]);
    setErrorMessage("");
    setModalOpen(true);
  };

  // Open Auto Allocate Modal (5 Kantong HPP)
  const handleOpenAutoAllocateModal = () => {
    setEditingTransaction(null);
    setModalMode("auto_allocate");
    setFormType("masuk");
    setAllocOrderRef("");
    setAllocCustomer("");
    setAllocModal("");
    setAllocOverhead("");
    setAllocGajiSaya("");
    setAllocGajiKaryawan("");
    setAllocMargin("");
    setAllocDiskon("");
    setAllocMethod("Cash");
    setAllocDate(new Date().toISOString().slice(0, 10));
    setAllocDesc("Alokasi kas order cetak sesuai HPP");
    setFormItems([]);
    setErrorMessage("");
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setModalMode("standard");
    setFormType(tx.tipe);
    setFormKantong(tx.kantong || (tx.tipe === "masuk" ? "margin" : "modal"));
    setFormCategory(tx.kategori);
    setCustomCategoryInput("");
    setFormAmount(tx.nominal.toString());
    setFormDate(new Date(tx.tanggal).toISOString().slice(0, 10));
    setFormMethod(tx.metode_pembayaran || "Cash");
    setFormDescription(tx.keterangan || "");
    setFormReference(tx.referensi || "");
    setFormItems(tx.items && Array.isArray(tx.items) ? JSON.parse(JSON.stringify(tx.items)) : []);
    setErrorMessage("");
    setModalOpen(true);
  };

  // Live Auto Allocation Calculation Preview
  const allocationPreview = useMemo(() => {
    const rawModal = Number(allocModal.replace(/\D/g, "")) || 0;
    const rawOverhead = Number(allocOverhead.replace(/\D/g, "")) || 0;
    const rawGajiSaya = Number(allocGajiSaya.replace(/\D/g, "")) || 0;
    const rawGajiKaryawan = Number(allocGajiKaryawan.replace(/\D/g, "")) || 0;
    const rawMargin = Number(allocMargin.replace(/\D/g, "")) || 0;
    const diskon = Number(allocDiskon.replace(/\D/g, "")) || 0;

    const subtotal = rawModal + rawOverhead + rawGajiSaya + rawGajiKaryawan + rawMargin;
    const totalDiterima = Math.max(0, subtotal - diskon);

    let sisaDiskon = diskon;

    // 1. Margin
    const potonganMargin = Math.min(rawMargin, sisaDiskon);
    const alokasiMargin = rawMargin - potonganMargin;
    sisaDiskon -= potonganMargin;

    // 2. Gaji Saya
    const potonganGajiSaya = Math.min(rawGajiSaya, sisaDiskon);
    const alokasiGajiSaya = rawGajiSaya - potonganGajiSaya;
    sisaDiskon -= potonganGajiSaya;

    // 3. Overhead
    const potonganOverhead = Math.min(rawOverhead, sisaDiskon);
    const alokasiOverhead = rawOverhead - potonganOverhead;
    sisaDiskon -= potonganOverhead;

    // 4. Gaji Karyawan
    const potonganGajiKaryawan = Math.min(rawGajiKaryawan, sisaDiskon);
    const alokasiGajiKaryawan = rawGajiKaryawan - potonganGajiKaryawan;
    sisaDiskon -= potonganGajiKaryawan;

    // 5. Modal Vendor (Protected, only reduced if discount overflows all 4 pockets)
    const potonganModal = Math.min(rawModal, sisaDiskon);
    const alokasiModal = rawModal - potonganModal;
    sisaDiskon -= potonganModal;

    const exceedsNonModal = potonganModal > 0;

    return {
      subtotal,
      diskon,
      totalDiterima,
      rawBreakdown: {
        modal: rawModal,
        overhead: rawOverhead,
        gajiSaya: rawGajiSaya,
        gajiKaryawan: rawGajiKaryawan,
        margin: rawMargin,
      },
      alokasi: {
        modal: alokasiModal,
        overhead: alokasiOverhead,
        gajiSaya: alokasiGajiSaya,
        gajiKaryawan: alokasiGajiKaryawan,
        margin: alokasiMargin,
      },
      potongan: {
        margin: potonganMargin,
        gajiSaya: potonganGajiSaya,
        overhead: potonganOverhead,
        gajiKaryawan: potonganGajiKaryawan,
        modal: potonganModal,
      },
      sisaDiskonTidakTertutup: sisaDiskon,
      exceedsNonModal,
    };
  }, [allocModal, allocOverhead, allocGajiSaya, allocGajiKaryawan, allocMargin, allocDiskon]);

  // Save Standard Transaction
  const handleSaveStandardTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    let parsedNominal = Number(formAmount.replace(/\D/g, ""));
    if ((isNaN(parsedNominal) || parsedNominal <= 0) && itemsTotalSubtotal > 0) {
      parsedNominal = itemsTotalSubtotal;
      setFormAmount(itemsTotalSubtotal.toString());
    }

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
      const cleanItems = formItems
        .filter((it) => it.nama_item && it.nama_item.trim() !== "")
        .map((it) => ({
          nama_item: it.nama_item.trim(),
          qty: Number(it.qty) || 1,
          harga_satuan: Math.round(Number(it.harga_satuan) || 0),
          subtotal: Math.round(Number(it.subtotal) || (Number(it.qty) || 1) * (Number(it.harga_satuan) || 0)),
        }));

      const payload = {
        tipe: formType,
        kantong: formKantong,
        kategori: finalCategory,
        nominal: parsedNominal,
        tanggal: formDate,
        metode_pembayaran: formMethod,
        keterangan: formDescription.trim(),
        referensi: formReference.trim(),
        items: cleanItems.length > 0 ? cleanItems : undefined,
      };

      if (editingTransaction) {
        await api.updateTransaction(editingTransaction.id, payload);
        setSuccessMessage("Transaksi kas berhasil diperbarui!");
      } else {
        await api.createTransaction(payload);
        setSuccessMessage(
          `Transaksi ${formType === "masuk" ? "pemasukan" : "pengeluaran"} berhasil dicatat ke Kantong ${
            KANTONG_CONFIG[formKantong]?.shortLabel || formKantong
          }!`
        );
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

  // Save Auto Allocated Order (5 Kantong)
  const handleSaveAutoAllocateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (allocationPreview.subtotal <= 0) {
      setErrorMessage("Total HPP + Margin produk harus lebih dari 0.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await api.autoAllocateOrder({
        nomor_nota: allocOrderRef || undefined,
        customer_name: allocCustomer || undefined,
        diskon: allocationPreview.diskon,
        breakdownHPP: allocationPreview.rawBreakdown,
        metode_pembayaran: allocMethod,
        tanggal: allocDate,
        keterangan: allocDesc.trim() || "Alokasi kas order cetak sesuai HPP",
      });

      if (res.potonganModal > 0) {
        setSuccessMessage(
          `Order berhasil dialokasikan! Peringatan: Modal terpotong Rp ${formatRupiah(res.potonganModal)}.`
        );
      } else {
        setSuccessMessage("Order berhasil dialokasikan secara otomatis ke 5 kantong kas!");
      }

      setModalOpen(false);
      await loadFinanceData();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengalokasikan kas order.");
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

    const headers = [
      "ID",
      "Tipe",
      "Kantong Kas",
      "Kategori",
      "Nominal (Rp)",
      "Tanggal",
      "Metode Pembayaran",
      "Keterangan",
      "Referensi",
      "Dicatat Oleh",
    ];
    const rows = transactions.map((t) => [
      t.id,
      t.tipe === "masuk" ? "PEMASUKAN" : "PENGELUARAN",
      `"${KANTONG_CONFIG[t.kantong as KantongKasType]?.shortLabel || t.kantong || "General"}"`,
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
    link.setAttribute("download", `laporan-kas-5-kantong-jeres-studio-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Available categories based on modal form type
  const availableFormCategories = formType === "masuk" ? incomeCategories : expenseCategories;

  // Filtered transactions for display
  const uniqueKasirs = Array.from(new Set(transactions.map((t) => t.created_by || "Admin").filter(Boolean)));

  const displayedTransactions = transactions.filter((tx) => {
    if (kasirFilter !== "all" && (tx.created_by || "Admin") !== kasirFilter) {
      return false;
    }
    return true;
  });

  const balances: KantongBalances = summary?.kantongBalances || {
    modal: { saldo: 0, masuk: 0, keluar: 0 },
    overhead: { saldo: 0, masuk: 0, keluar: 0 },
    gaji_saya: { saldo: 0, masuk: 0, keluar: 0 },
    gaji_karyawan: { saldo: 0, masuk: 0, keluar: 0 },
    margin: { saldo: 0, masuk: 0, keluar: 0 },
  };

  const currentSelectedPocketBalance = balances[formKantong]?.saldo ?? 0;
  const isSelectedExpenseExceeding =
    formType === "keluar" &&
    Number(formAmount.replace(/\D/g, "")) > 0 &&
    Number(formAmount.replace(/\D/g, "")) > currentSelectedPocketBalance;

  return (
    <div className="space-y-4">
      {/* Top Header & Fast Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>Sistem Kas 5 Kantong</span>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  PROTEKSI MODAL
                </span>
              </h2>
              <p className="text-xs text-slate-500 line-clamp-1 sm:line-clamp-none">
                Pemisahan otomatis dana modal vendor, operasional, gaji owner, upah karyawan, dan laba bersih
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: 2-column grid on mobile (with Scan AI spanning), 3-col on sm, 1 neat row on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAllocationRules(!showAllocationRules)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border shadow-xs cursor-pointer transition-colors whitespace-nowrap ${
              showAllocationRules
                ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
            }`}
            title="Lihat Aturan Alokasi Kas & Hierarki Diskon"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Aturan Kas</span>
          </button>

          <button
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 shadow-xs cursor-pointer transition-colors whitespace-nowrap"
            title="Kelola & Edit Kategori Kas Masuk / Keluar"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Kategori</span>
          </button>

          <button
            onClick={loadFinanceData}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 shadow-xs cursor-pointer transition-colors whitespace-nowrap"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 shadow-xs cursor-pointer transition-colors whitespace-nowrap"
            title="Download Spreadsheet CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setScannerModalOpen(true)}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 rounded-xl shadow-xs shadow-indigo-500/20 transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
            title="Scan Foto Nota / Struk Belanja dengan Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Scan AI</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Collapsible: Aturan Alokasi Kas & Proteksi Modal */}
      {showAllocationRules && (
        <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Aturan Alokasi Kas 5 Kantong & Proteksi Modal
            </h4>
            <button
              onClick={() => setShowAllocationRules(false)}
              className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
            >
              Tutup Panduan ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-amber-950 dark:text-amber-200/90">
            <div className="space-y-1.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/50">
              <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <span>🛡️ Prinsip Utama: Modal Vendor Terproteksi</span>
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                Kantong modal adalah uang milik vendor & stok bahan baku. Ketika toko memberikan diskon pesanan,
                dana modal <strong>TIDAK BOLEH dikorbankan</strong> agar toko tidak tekor kulakan.
              </p>
            </div>

            <div className="space-y-1.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/50">
              <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <span>📉 Hierarki Pemotongan Diskon (Otomatis)</span>
              </p>
              <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-amber-700">1.</span>
                  <span><strong>Margin Toko:</strong> dipotong pertama hingga habis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-amber-700">2.</span>
                  <span><strong>Gaji Saya:</strong> dipotong kedua jika diskon belum tertutup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-amber-700">3.</span>
                  <span><strong>Overhead:</strong> dipotong ketiga jika diskon masih tersisa</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-amber-700">4.</span>
                  <span><strong>Gaji Karyawan:</strong> dipotong keempat sebagai opsi terakhir</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-rose-600">5.</span>
                  <span className="text-rose-600 font-semibold"><strong>Modal Vendor:</strong> Terkunci & Aman!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5 KANTONG CARDS SECTION (REPLACES SINGLE SALDO BERSIH) */}
      <div className="space-y-2.5">
        {/* Top Mini Banner: Grand Total Kas & Filter Kantong */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Total Kas Toko:</span>
              <span className="text-sm sm:text-base font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {formatRupiah(summary?.saldoBersih || 0)}
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-600 font-mono font-bold">
                +{formatRupiah(summary?.totalPemasukan || 0)}
              </span>
              <span className="text-rose-600 font-mono font-bold">
                -{formatRupiah(summary?.totalPengeluaran || 0)}
              </span>
            </div>
          </div>

          {/* Quick Filter Pill by Kantong */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Filter Kantong:
            </span>
            <button
              onClick={() => setKantongFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 cursor-pointer transition-all ${
                kantongFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Semua Kantong
            </button>
            {(Object.keys(KANTONG_CONFIG) as KantongKasType[]).map((kKey) => {
              const cfg = KANTONG_CONFIG[kKey];
              const isSelected = kantongFilter === kKey;
              return (
                <button
                  key={kKey}
                  onClick={() => setKantongFilter(isSelected ? "all" : kKey)}
                  className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  <span>{cfg.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Pocket Cards Grid: 2 grid on mobile (with 5th card spanning), 3 grid on tablet, 5 grid on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {(Object.keys(KANTONG_CONFIG) as KantongKasType[]).map((kKey) => {
            const cfg = KANTONG_CONFIG[kKey];
            const bal = balances[kKey] || { saldo: 0, masuk: 0, keluar: 0 };
            const isFilterActive = kantongFilter === kKey;
            const IconComponent = cfg.icon;

            return (
              <div
                key={kKey}
                onClick={() => setKantongFilter(isFilterActive ? "all" : kKey)}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer relative flex flex-col justify-between hover:shadow-md ${
                  kKey === "margin" ? "col-span-2 md:col-span-1" : ""
                } ${
                  isFilterActive
                    ? "ring-2 ring-indigo-500 border-transparent shadow-sm bg-indigo-50/20 dark:bg-indigo-950/20"
                    : "border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300"
                }`}
              >
                {/* Card Top: Icon + Label + Filter indicator */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg shrink-0 flex items-center justify-center ${cfg.badgeBg} ${cfg.badgeText}`}
                      >
                        <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white truncate">
                        {cfg.shortLabel}
                      </span>
                    </div>

                    {kKey === "modal" && (
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase px-1 sm:px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shrink-0">
                        🛡️ Aman
                      </span>
                    )}
                  </div>

                  <p className="text-[9px] sm:text-[10px] text-slate-400 line-clamp-1 mb-1.5 sm:mb-2">
                    {cfg.description}
                  </p>
                </div>

                {/* Card Bottom: Nominal Saldo & In/Out Mini Info */}
                <div className="pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-0.5 sm:space-y-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400">Saldo:</span>
                    <span
                      className={`text-xs sm:text-sm md:text-base font-black font-mono tracking-tight ${
                        bal.saldo >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600"
                      }`}
                    >
                      {formatRupiah(bal.saldo)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                      +{formatRupiah(bal.masuk)}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold truncate">
                      -{formatRupiah(bal.keluar)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: Desktop/Tablet 2 columns, Mobile 1 column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Fast Action Buttons, AI Scanner, Category Breakdown */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
          {/* Action Buttons in Left Column: Standard Masuk/Keluar + Auto Allocate Order */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOpenCreateModal("masuk")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all hover:shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Pemasukan</span>
              </button>
              <button
                onClick={() => handleOpenCreateModal("keluar")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all hover:shadow cursor-pointer"
              >
                <Minus className="w-4 h-4" />
                <span>Pengeluaran</span>
              </button>
            </div>

            {/* Special Button: Auto Allocate Order (5 Kantong HPP Splitting) */}
            <button
              onClick={handleOpenAutoAllocateModal}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>⚡ Alokasikan Order Cetak (5 Kantong HPP)</span>
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
                  Foto nota otomatis diklasifikasikan ke 5 kantong
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
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-indigo-500" />
                  Komposisi Kategori Kas
                </h4>
                {kantongFilter !== "all" && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                    {KANTONG_CONFIG[kantongFilter as KantongKasType]?.shortLabel}
                  </span>
                )}
              </div>

              {/* Breakdown Pengeluaran Top */}
              {summary.breakdownPengeluaran.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                    Top Pengeluaran:
                  </span>
                  {summary.breakdownPengeluaran.slice(0, 3).map((cat, idx) => {
                    const pct = summary.totalPengeluaran > 0 ? (cat.total / summary.totalPengeluaran) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="truncate text-slate-600 dark:text-slate-400">
                            {cat.kategori} ({cat.count}x)
                          </span>
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
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Top Pemasukan:
                  </span>
                  {summary.breakdownPemasukan.slice(0, 3).map((cat, idx) => {
                    const pct = summary.totalPemasukan > 0 ? (cat.total / summary.totalPemasukan) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="truncate text-slate-600 dark:text-slate-400">
                            {cat.kategori} ({cat.count}x)
                          </span>
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
          {/* Filter Bar */}
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

            {/* Segmented Controls for Type Filter & Date presets */}
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
                        <option key={`in-${c}`} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {typeFilter !== "masuk" && (
                    <optgroup label="Pengeluaran">
                      {expenseCategories.map((c) => (
                        <option key={`out-${c}`} value={c}>
                          {c}
                        </option>
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
                    <option key={kasirName} value={kasirName}>
                      {kasirName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Date Pickers Range */}
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
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Riwayat Transaksi ({displayedTransactions.length})
                </span>
                {kantongFilter !== "all" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    Kantong {KANTONG_CONFIG[kantongFilter as KantongKasType]?.shortLabel}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">Klik baris untuk rincian</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedTransactions.length > 0 ? (
                displayedTransactions.map((tx) => {
                  const isIncome = tx.tipe === "masuk";
                  const isExpanded = expandedTxIds[tx.id] ?? false;
                  const kantongCfg = KANTONG_CONFIG[tx.kantong as KantongKasType] || KANTONG_CONFIG.margin;
                  const timeStr = new Date(tx.tanggal).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={tx.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      {/* Baris Utama */}
                      <div
                        onClick={() => toggleExpandTx(tx.id)}
                        className="p-3 sm:px-4 cursor-pointer flex items-center justify-between gap-2.5 select-none"
                      >
                        {/* Kiri: Badge Type + Kantong Badge + Kategori + Ref */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
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

                            {/* Badge Kantong Kas */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${kantongCfg.badgeBg} ${kantongCfg.badgeText}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {kantongCfg.shortLabel}
                            </span>

                            {/* Judul Kategori */}
                            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                              {tx.kategori}
                            </span>

                            {/* Ref */}
                            {tx.referensi && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Ref: {tx.referensi}
                              </span>
                            )}

                            {/* Item Count Badge */}
                            {tx.items && tx.items.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <Package className="w-2.5 h-2.5" />
                                {tx.items.length} item
                              </span>
                            )}
                          </div>

                          {/* Subtext: Tanggal, Jam, Metode & Kasir */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            <span>{formatTanggal(tx.tanggal)}</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[10px] text-slate-400 font-mono">{timeStr} WIB</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {tx.metode_pembayaran || "Cash"}
                            </span>
                            {tx.created_by && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-slate-500">{tx.created_by}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Kanan: Nominal + Icon Buttons */}
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

                          {/* Accordion Chevron */}
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
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                                Kantong Kas
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {kantongCfg.label}
                              </span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                                Metode Bayar
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {tx.metode_pembayaran || "Cash"}
                              </span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                                Dicatat Oleh
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {tx.created_by || "Admin"}
                              </span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                                Referensi Nota
                              </span>
                              <span className="font-mono text-slate-800 dark:text-slate-200">
                                {tx.referensi || "-"}
                              </span>
                            </div>
                          </div>

                          {/* Itemized Breakdown if exists */}
                          {tx.items && tx.items.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Package className="w-3 h-3 text-indigo-600" />
                                Rincian Item Transaksi ({tx.items.length} item)
                              </span>
                              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {tx.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 flex items-center justify-between text-[11px]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-500 font-bold">
                                        {idx + 1}
                                      </span>
                                      <span className="font-medium text-slate-900 dark:text-white">
                                        {item.nama_item}
                                      </span>
                                      {item.qty > 1 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                          x{item.qty} @ {formatRupiah(item.harga_satuan)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                      {formatRupiah(item.subtotal || item.harga_satuan * item.qty)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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

      {/* MODAL: CREATE & EDIT TRANSACTION (STANDARD OR AUTO-ALLOCATE) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  {editingTransaction ? (
                    <>
                      <Edit2 className="w-4 h-4 text-indigo-600" />
                      Edit Transaksi Kas #{editingTransaction.id}
                    </>
                  ) : modalMode === "auto_allocate" ? (
                    <>
                      <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      Alokasi Kas Order Cetak (5 Kantong HPP)
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
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalMode === "auto_allocate"
                    ? "Otomatis pecah omzet ke 5 kantong kas dengan aturan proteksi modal"
                    : "Pilih kantong kas tujuan agar pembukuan tetap presisi"}
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error banner in modal */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* MODE 1: AUTO ALLOCATE 5 KANTONG (ORDER SPLITTING) */}
            {modalMode === "auto_allocate" ? (
              <form onSubmit={handleSaveAutoAllocateOrder} className="space-y-4 text-xs">
                {/* Reference / Order Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No. Pesanan / Nota (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: ORD-2025-0819"
                      value={allocOrderRef}
                      onChange={(e) => setAllocOrderRef(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Pelanggan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bpk. Bambang"
                      value={allocCustomer}
                      onChange={(e) => setAllocCustomer(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* 5 HPP Inputs */}
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-indigo-600" />
                      Rincian Komponen HPP & Margin Produk
                    </span>
                    <span className="text-[11px] text-slate-400">Masukkan nilai komponen</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Modal Vendor */}
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900">
                      <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center justify-between">
                        <span>1. Modal (Bahan / Vendor) *</span>
                        <span className="text-[9px] px-1 bg-blue-100 dark:bg-blue-950 rounded">🛡️ Terproteksi</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Rp 0"
                        value={allocModal}
                        onChange={(e) => setAllocModal(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Overhead */}
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900">
                      <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-1">
                        2. Overhead (Listrik/Wifi/Sewa)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Rp 0"
                        value={allocOverhead}
                        onChange={(e) => setAllocOverhead(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Gaji Saya */}
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-900">
                      <label className="block text-[11px] font-bold text-purple-700 dark:text-purple-300 mb-1">
                        3. Gaji Saya (Owner / Desain)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Rp 0"
                        value={allocGajiSaya}
                        onChange={(e) => setAllocGajiSaya(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Gaji Karyawan */}
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-teal-200 dark:border-teal-900">
                      <label className="block text-[11px] font-bold text-teal-700 dark:text-teal-300 mb-1">
                        4. Gaji Karyawan (Operator)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Rp 0"
                        value={allocGajiKaryawan}
                        onChange={(e) => setAllocGajiKaryawan(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Margin / Profit */}
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 sm:col-span-2">
                      <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                        5. Margin / Profit Bersih Toko
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Rp 0"
                        value={allocMargin}
                        onChange={(e) => setAllocMargin(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Diskon Order (Hierarchical Deduction) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Diskon / Potongan Harga (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Rp 0 (opsional)"
                      value={allocDiskon}
                      onChange={(e) => setAllocDiskon(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Metode Pembayaran
                    </label>
                    <select
                      value={allocMethod}
                      onChange={(e) => setAllocMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="Cash">Cash / Tunai</option>
                      <option value="Transfer BCA">Transfer BCA</option>
                      <option value="Transfer Mandiri">Transfer Mandiri</option>
                      <option value="QRIS">QRIS / E-Wallet</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                {/* Live Preview of 5-Pocket Allocation */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    <span>Simulasi Hasil Alokasi ke 5 Kantong:</span>
                    <span className="font-mono text-sm text-indigo-700 dark:text-indigo-300">
                      Total Masuk Kas: {formatRupiah(allocationPreview.totalDiterima)}
                    </span>
                  </div>

                  {/* Warning if discount exceeds non-modal capacity */}
                  {allocationPreview.exceedsNonModal && (
                    <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 rounded-lg border border-rose-300 flex items-center gap-2 text-[11px]">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        <strong>Peringatan:</strong> Diskon melebihi kapasitas 4 kantong non-modal — akan mengurangi
                        Kantong Modal sebesar <strong>{formatRupiah(allocationPreview.potongan.modal)}</strong>!
                      </span>
                    </div>
                  )}

                  {/* 5 Pocket Allocation Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px] font-mono">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-blue-200 dark:border-blue-900">
                      <span className="text-[10px] text-blue-700 dark:text-blue-300 block font-bold">Modal:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(allocationPreview.alokasi.modal)}
                      </span>
                      {allocationPreview.potongan.modal > 0 && (
                        <span className="text-[9px] text-rose-500 block">(-{formatRupiah(allocationPreview.potongan.modal)})</span>
                      )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 block font-bold">Overhead:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(allocationPreview.alokasi.overhead)}
                      </span>
                      {allocationPreview.potongan.overhead > 0 && (
                        <span className="text-[9px] text-rose-500 block">(-{formatRupiah(allocationPreview.potongan.overhead)})</span>
                      )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-purple-200 dark:border-purple-900">
                      <span className="text-[10px] text-purple-700 dark:text-purple-300 block font-bold">Gaji Saya:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(allocationPreview.alokasi.gajiSaya)}
                      </span>
                      {allocationPreview.potongan.gajiSaya > 0 && (
                        <span className="text-[9px] text-rose-500 block">(-{formatRupiah(allocationPreview.potongan.gajiSaya)})</span>
                      )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-teal-200 dark:border-teal-900">
                      <span className="text-[10px] text-teal-700 dark:text-teal-300 block font-bold">Gaji Staff:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(allocationPreview.alokasi.gajiKaryawan)}
                      </span>
                      {allocationPreview.potongan.gajiKaryawan > 0 && (
                        <span className="text-[9px] text-rose-500 block">(-{formatRupiah(allocationPreview.potongan.gajiKaryawan)})</span>
                      )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-bold">Margin:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(allocationPreview.alokasi.margin)}
                      </span>
                      {allocationPreview.potongan.margin > 0 && (
                        <span className="text-[9px] text-rose-500 block">(-{formatRupiah(allocationPreview.potongan.margin)})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalMode("standard")}
                    className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    ← Beralih ke Form Standar
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || allocationPreview.subtotal <= 0}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {submitting ? "Mengalokasikan..." : "Simpan & Alokasikan ke 5 Kantong"}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* MODE 2: STANDARD TRANSACTION FORM (MASUK / KELUAR) */
              <form onSubmit={handleSaveStandardTransaction} className="space-y-4 text-xs">
                {/* Tipe Selector Toggle (Only when creating) */}
                {!editingTransaction && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tipe Transaksi *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormType("masuk");
                          setFormKantong("margin");
                          setFormCategory(incomeCategories.length > 0 ? incomeCategories[0] : "__custom__");
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
                          setFormKantong("modal");
                          setFormCategory(expenseCategories.length > 0 ? expenseCategories[0] : "__custom__");
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
                )}

                {/* Kantong Kas Dropdown with Balance Display */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Kantong Kas Tujuan *
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">
                      Saldo Saat Ini: <strong>{formatRupiah(currentSelectedPocketBalance)}</strong>
                    </span>
                  </div>

                  <select
                    value={formKantong}
                    onChange={(e) => setFormKantong(e.target.value as KantongKasType)}
                    className="w-full px-3 py-2 rounded-lg bg-indigo-50/40 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    {(Object.keys(KANTONG_CONFIG) as KantongKasType[]).map((kKey) => {
                      const cfg = KANTONG_CONFIG[kKey];
                      const bal = balances[kKey]?.saldo ?? 0;
                      return (
                        <option key={kKey} value={kKey}>
                          {cfg.label} — (Saldo: {formatRupiah(bal)})
                        </option>
                      );
                    })}
                  </select>

                  {/* Warning if expense exceeds selected pocket balance */}
                  {isSelectedExpenseExceeding && (
                    <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Peringatan: Pengeluaran ini melebihi saldo kas kantong saat ini ({formatRupiah(currentSelectedPocketBalance)}).
                      </span>
                    </div>
                  )}
                </div>

                {/* Kategori */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Kategori Transaksi *
                    </label>
                    <button
                      type="button"
                      onClick={() => setCategoryModalOpen(true)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Settings className="w-3 h-3" />
                      Kelola Kategori
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {formCategory &&
                      formCategory !== "__custom__" &&
                      !availableFormCategories.includes(formCategory) && (
                        <option value={formCategory}>{formCategory} (Snapshot)</option>
                      )}
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
                        min="0"
                        step="any"
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

                {/* Rincian Item (CRUD) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Rincian Item / Nota ({formItems.length})
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Opsional)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Item
                    </button>
                  </div>

                  {formItems.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {formItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                placeholder="Nama barang / jasa (cth: Banner Flexi 280gr)"
                                value={item.nama_item}
                                onChange={(e) =>
                                  handleUpdateItem(idx, "nama_item", e.target.value)
                                }
                                className="flex-1 px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer shrink-0"
                                title="Hapus item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[11px] pl-7">
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">
                                  Qty
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.qty || ""}
                                  onChange={(e) =>
                                    handleUpdateItem(idx, "qty", e.target.value)
                                  }
                                  placeholder="1"
                                  className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">
                                  Harga Satuan
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.harga_satuan || ""}
                                  onChange={(e) =>
                                    handleUpdateItem(idx, "harga_satuan", e.target.value)
                                  }
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">
                                  Subtotal
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.subtotal || ""}
                                  onChange={(e) =>
                                    handleUpdateItem(idx, "subtotal", e.target.value)
                                  }
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total Item Subtotal & Samakan Button */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs">
                        <div>
                          <span className="text-[11px] text-indigo-900 dark:text-indigo-200 font-medium">
                            Total Rincian:{" "}
                          </span>
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                            {formatRupiah(itemsTotalSubtotal)}
                          </span>
                        </div>
                        {itemsTotalSubtotal > 0 &&
                          itemsTotalSubtotal !== Number(formAmount) && (
                            <button
                              type="button"
                              onClick={handleSyncNominalWithItems}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                            >
                              <Calculator className="w-3 h-3" />
                              Samakan ke Nominal
                            </button>
                          )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic py-1 text-center">
                      Belum ada rincian item. Klik "+ Tambah Item" jika ingin mencatat rincian per barang.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                  {!editingTransaction && formType === "masuk" ? (
                    <button
                      type="button"
                      onClick={() => setModalMode("auto_allocate")}
                      className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Gunakan Alokasi 5 Kantong HPP →
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
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
                </div>
              </form>
            )}
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

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={allCategories}
        onCategoriesChanged={loadFinanceData}
      />
    </div>
  );
};
