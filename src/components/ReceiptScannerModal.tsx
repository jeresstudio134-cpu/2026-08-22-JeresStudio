import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Camera,
  Upload,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileText,
  DollarSign,
  Calendar,
  CreditCard,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Layers,
  HelpCircle,
} from "lucide-react";
import { api } from "../lib/api.js";
import { ScannedReceiptResult, ScannedReceiptItem } from "../types/index.js";
import { formatRupiah } from "../lib/utils.js";

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  incomeCategories: string[];
  expenseCategories: string[];
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  incomeCategories,
  expenseCategories,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedReceiptResult | null>(null);
  const [scanError, setScanError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Editable Form State (populated from AI scan)
  const [formType, setFormType] = useState<"masuk" | "keluar">("keluar");
  const [formCategory, setFormCategory] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formMethod, setFormMethod] = useState("Cash");
  const [formReference, setFormReference] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formItems, setFormItems] = useState<ScannedReceiptItem[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setImagePreview(null);
      setIsScanning(false);
      setScanResult(null);
      setScanError("");
      setIsSaving(false);
      setFormType("keluar");
      setFormCategory(expenseCategories[0] || "Kulakan Bahan Baku");
      setFormVendor("");
      setFormAmount("");
      setFormDate(new Date().toISOString().slice(0, 10));
      setFormMethod("Cash");
      setFormReference("");
      setFormDescription("");
      setFormItems([]);
      setCustomCategoryInput("");
    }
  }, [isOpen, expenseCategories]);

  // Support paste image from clipboard (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processSelectedFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  // Process File and trigger AI scan
  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setScanError("File yang dipilih harus berupa gambar (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setScanError("Ukuran gambar terlalu besar (maksimal 10MB).");
      return;
    }

    setScanError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      triggerAiScan(base64);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini AI Scan
  const triggerAiScan = async (base64Image: string) => {
    try {
      setIsScanning(true);
      setScanError("");
      setScanResult(null);

      const res = await api.scanReceipt(base64Image);
      if (!res || !res.result) {
        throw new Error("Gagal menerima respon parsing dari AI.");
      }

      const result: ScannedReceiptResult = res.result;
      setScanResult(result);

      // Populate form
      const detectedType = result.tipe === "masuk" ? "masuk" : "keluar";
      setFormType(detectedType);

      // Check if category matches existing, else custom
      const availableCategories = detectedType === "masuk" ? incomeCategories : expenseCategories;
      const matchedCategory = availableCategories.find(
        (c) => c.toLowerCase() === (result.kategori || "").toLowerCase()
      );

      if (matchedCategory) {
        setFormCategory(matchedCategory);
        setCustomCategoryInput("");
      } else if (result.kategori) {
        setFormCategory("__custom__");
        setCustomCategoryInput(result.kategori);
      } else {
        setFormCategory(availableCategories[0] || "Kulakan Bahan Baku");
      }

      setFormVendor(result.vendor_name || "");
      setFormAmount(result.nominal ? result.nominal.toString() : "");
      if (result.tanggal) {
        // Validate date format YYYY-MM-DD
        const dateMatch = result.tanggal.match(/^\d{4}-\d{2}-\d{2}$/);
        setFormDate(dateMatch ? result.tanggal : new Date().toISOString().slice(0, 10));
      }
      setFormMethod(result.metode_pembayaran || "Cash");
      setFormReference(result.referensi || "");
      setFormDescription(result.keterangan || "");
      setFormItems(result.items || []);
    } catch (err: any) {
      console.error("AI Scan Error:", err);
      let message = err?.message || "Gagal memindai nota dengan AI. Silakan coba lagi atau isi manual.";
      if (typeof message === "string" && message.includes("503") || message.includes("UNAVAILABLE") || message.includes("high demand")) {
        message = "Layanan AI sedang mengalami antrean trafik tinggi sesaat. Silakan klik tombol 'Coba Scan Lagi' di bawah.";
      }
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Save Transaction to Finance
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanError("");

    const parsedNominal = Number(formAmount.replace(/\D/g, ""));
    if (isNaN(parsedNominal) || parsedNominal <= 0) {
      setScanError("Nominal transaksi harus lebih dari 0.");
      return;
    }

    const finalCategory = formCategory === "__custom__" ? customCategoryInput.trim() : formCategory.trim();
    if (!finalCategory) {
      setScanError("Kategori transaksi harus dipilih atau diisi.");
      return;
    }

    if (!formDescription.trim()) {
      setScanError("Keterangan transaksi wajib diisi.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        tipe: formType,
        kategori: finalCategory,
        nominal: parsedNominal,
        tanggal: formDate,
        metode_pembayaran: formMethod,
        keterangan: formVendor ? `[${formVendor}] ${formDescription.trim()}` : formDescription.trim(),
        referensi: formReference.trim(),
      };

      await api.createTransaction(payload);
      onSuccess(`Nota berhasil dipindai & dicatat ke kas ${formType === "masuk" ? "pemasukan" : "pengeluaran"}!`);
      onClose();
    } catch (err: any) {
      setScanError(err.message || "Gagal menyimpan transaksi kas.");
    } finally {
      setIsSaving(false);
    }
  };

  const availableFormCategories = formType === "masuk" ? incomeCategories : expenseCategories;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  AI Smart Scanner Nota & Bon Belanja
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Powered by Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Foto atau upload nota kulakan, struk belanja ATK, bensin, token listrik, atau bukti bayar untuk diekstrak otomatis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Error Alert */}
          {scanError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <div className="flex-1">{scanError}</div>
              {imagePreview && !isScanning && (
                <button
                  onClick={() => triggerAiScan(imagePreview)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer shrink-0"
                >
                  Coba Scan Lagi
                </button>
              )}
            </div>
          )}

          {/* Upload Dropzone (When no image or want to change) */}
          {!imagePreview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]"
                  : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processSelectedFile(e.target.files[0]);
                  }
                }}
              />

              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-inner">
                  <Receipt className="w-8 h-8" />
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Tarik & Lepas Foto Nota ke Sini
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Atau gunakan opsi di bawah untuk memilih file atau mengambil foto dengan kamera
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Pilih File Gambar
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-purple-600" />
                    Ambil Foto Kamera
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                  <span>💡 Tips: Anda juga bisa menekan</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono text-[10px]">
                    Ctrl + V
                  </kbd>
                  <span>untuk paste screenshot langsung</span>
                </div>
              </div>
            </div>
          ) : (
            /* Split View: Photo Preview + AI Extracted Form */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Image Preview & Scan Progress (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                    Foto Nota Terlampir
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => triggerAiScan(imagePreview)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin" : ""}`} />
                      Scan Ulang
                    </button>
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => {
                        setImagePreview(null);
                        setScanResult(null);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      Ganti Foto
                    </button>
                  </div>
                </div>

                {/* Preview Container with Scanner Laser Animation */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center min-h-[260px] max-h-[380px] group shadow-inner">
                  <img
                    src={imagePreview}
                    alt="Nota Belanja"
                    className={`w-full h-full object-contain max-h-[380px] transition-opacity duration-300 ${
                      isScanning ? "opacity-60" : "opacity-100"
                    }`}
                  />

                  {/* Scanning Animation Overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600/90 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 mb-3 animate-bounce">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <p className="text-xs font-bold text-white tracking-wide">
                        Gemini AI Sedang Membaca Nota...
                      </p>
                      <p className="text-[11px] text-indigo-200 mt-1 max-w-xs">
                        Mengekstrak nama toko, total nominal, tanggal, dan rincian barang belanja
                      </p>
                      <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                        <div className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 h-full rounded-full animate-pulse w-full" />
                      </div>
                    </div>
                  )}

                  {/* Scanner Laser Line */}
                  {isScanning && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse" />
                  )}
                </div>

                {/* AI Confidence / Notes Box */}
                {scanResult?.confidence_notes && (
                  <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Catatan Pengenalan AI
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      {scanResult.confidence_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: AI Extracted Verification Form (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Verifikasi Data Hasil Scan AI
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Periksa & sesuaikan bila ada koreksi
                  </span>
                </div>

                <form onSubmit={handleSaveTransaction} className="space-y-3.5 text-xs">
                  {/* Tipe Transaksi */}
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tipe Transaksi *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormType("keluar");
                          setFormCategory(expenseCategories[0] || "Kulakan Bahan Baku");
                        }}
                        className={`py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer border transition-colors ${
                          formType === "keluar"
                            ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-500 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                        Pengeluaran (Belanja/Kulakan)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormType("masuk");
                          setFormCategory(incomeCategories[0] || "Penjualan Order Cetak");
                        }}
                        className={`py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer border transition-colors ${
                          formType === "masuk"
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                        Pemasukan (Bukti Bayar)
                      </button>
                    </div>
                  </div>

                  {/* Kategori & Toko / Merchant */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kategori Kas *
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
                          placeholder="Ketik kategori baru..."
                          value={customCategoryInput}
                          onChange={(e) => setCustomCategoryInput(e.target.value)}
                          className="w-full mt-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nama Toko / Merchant
                      </label>
                      <div className="relative">
                        <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Contoh: CV Sinar Sablon / Indomaret"
                          value={formVendor}
                          onChange={(e) => setFormVendor(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nominal & Tanggal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Total Nominal (Rp) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                          Rp
                        </span>
                        <input
                          type="number"
                          required
                          min="100"
                          step="100"
                          placeholder="Contoh: 125000"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-sm"
                        />
                      </div>
                      {Number(formAmount) > 0 && (
                        <p className="text-[11px] text-emerald-600 font-mono mt-1 font-semibold">
                          = {formatRupiah(Number(formAmount))}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tanggal Nota *
                      </label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="date"
                          required
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metode Bayar & Referensi */}
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
                        <option value="Debit">Debit Card</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        No. Struk / Referensi
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: STR-20250819-09"
                        value={formReference}
                        onChange={(e) => setFormReference(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Keterangan Rincian Transaksi *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Contoh: Belanja 2 roll pet film DTF & bubuk lem hotmelt"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Itemized Breakdown Table if detected */}
                  {formItems && formItems.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-indigo-600" />
                          Rincian Item yang Terbaca ({formItems.length} item)
                        </span>
                      </div>

                      <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-2 space-y-1">
                        {formItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 py-0.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                          >
                            <span className="truncate max-w-[200px] font-medium">
                              {item.nama_item} {item.qty > 1 ? `(${item.qty}x)` : ""}
                            </span>
                            <span className="font-mono text-slate-900 dark:text-white font-semibold">
                              {formatRupiah(item.subtotal || item.harga_satuan * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving || isScanning}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-md transition-colors cursor-pointer ${
                        formType === "masuk"
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                          : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {isSaving
                        ? "Menyimpan Transaksi..."
                        : "Simpan ke Pembukuan Kas"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
