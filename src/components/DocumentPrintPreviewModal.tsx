import React, { useState, useEffect, useRef } from "react";
import { Order, StoreSettings } from "../types/index.js";
import {
  generateInvoicePDF,
  generateSuratJalanPDF,
  generateTandaTerimaPDF,
  getUserPaperPreference,
  setUserPaperPreference,
  PaperFormat,
} from "../utils/generateInvoicePDF.js";
import {
  Printer,
  Download,
  X,
  FileText,
  Truck,
  CheckSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  User,
  Calendar,
  CreditCard,
} from "lucide-react";

export type PreviewDocType = "faktur" | "surat_jalan" | "tanda_terima";

interface DocumentPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  settings?: StoreSettings | null;
  defaultDocType?: PreviewDocType;
  defaultPaperSize?: PaperFormat;
}

export const DocumentPrintPreviewModal: React.FC<DocumentPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  settings,
  defaultDocType = "faktur",
  defaultPaperSize,
}) => {
  const [docType, setDocType] = useState<PreviewDocType>(defaultDocType);
  const [paperFormat, setPaperFormat] = useState<PaperFormat>("A4");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Sync state with props on open
  useEffect(() => {
    if (isOpen) {
      setDocType(defaultDocType);
      const savedPaper = defaultPaperSize || getUserPaperPreference() || "A4";
      setPaperFormat(savedPaper);
    }
  }, [isOpen, defaultDocType, defaultPaperSize]);

  if (!isOpen) return null;

  // Settings helpers
  const storeName = settings?.nama_toko || "JERES STUDIO";
  const storeSlogan = settings?.slogan || "Percetakan Digital, Stiker, DTF & Sablon Jersey Berkualitas";
  const storeAddress = settings?.alamat || "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif";
  const storePhone = settings?.no_wa || "081234567890";
  const storeEmail = settings?.email || "jeresstudio134@gmail.com";
  const storeBank = settings?.rekening_bank || "BCA 1234-567-890 a/n Jeres Studio";
  const storeNotes = settings?.catatan_nota || "Barang yang sudah dicetak/diambil tidak dapat dikembalikan. Harap periksa pesanan Anda sebelum meninggalkan toko.";
  const logoUrl = settings?.logo_url || "";

  // Calculations
  const subtotal = (order.items || []).reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0) || order.total || 0;
  const diskon = Number(order.diskon) || 0;
  const pajak = Number(order.pajak) || 0;
  const grandTotal = Number(order.total) || Math.max(0, subtotal - diskon + pajak);
  const dp = Number(order.jumlah_dp) || 0;
  const sisa = Math.max(0, grandTotal - (order.status_bayar === "lunas" ? grandTotal : dp));
  const isLunas = order.status_bayar === "lunas" || sisa <= 0;

  const formatRp = (num: number) => {
    return "Rp " + Math.round(num).toLocaleString("id-ID");
  };

  const formatTgl = (tglStr?: string) => {
    if (!tglStr) return "-";
    try {
      const d = new Date(tglStr);
      if (isNaN(d.getTime())) return tglStr;
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return tglStr;
    }
  };

  const angkaKeTerbilang = (n: number): string => {
    const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    if (n < 12) return angka[n];
    if (n < 20) return angkaKeTerbilang(n - 10) + " Belas";
    if (n < 100) return angkaKeTerbilang(Math.floor(n / 10)) + " Puluh " + angkaKeTerbilang(n % 10);
    if (n < 200) return "Seratus " + angkaKeTerbilang(n - 100);
    if (n < 1000) return angkaKeTerbilang(Math.floor(n / 100)) + " Ratus " + angkaKeTerbilang(n % 100);
    if (n < 2000) return "Seribu " + angkaKeTerbilang(n - 1000);
    if (n < 1000000) return angkaKeTerbilang(Math.floor(n / 1000)) + " Ribu " + angkaKeTerbilang(n % 1000);
    if (n < 1000000000) return angkaKeTerbilang(Math.floor(n / 1000000)) + " Juta " + angkaKeTerbilang(n % 1000000);
    return "Rp " + n.toLocaleString("id-ID");
  };

  const handleSelectPaper = (paper: PaperFormat) => {
    setPaperFormat(paper);
    setUserPaperPreference(paper);
  };

  // Action: Download PDF
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const options = { action: "download" as const, paperFormat: paperFormat };
      if (docType === "faktur") {
        await generateInvoicePDF(order, settings, options);
      } else if (docType === "surat_jalan") {
        await generateSuratJalanPDF(order, settings, options);
      } else {
        await generateTandaTerimaPDF(order, settings, options);
      }
    } catch (err: any) {
      console.error("Gagal download PDF:", err);
      alert(`Gagal download PDF: ${err?.message || "Terjadi kesalahan"}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Action: Print Now
  const handlePrint = async () => {
    // Buka tab kosong DULUAN, sebelum ada proses async — supaya browser masih
    // menganggap ini aksi langsung dari klik pengguna, jadi tidak diblokir
    // popup blocker. Nanti tab ini diarahkan ke PDF setelah selesai dibuat.
    const printTab = window.open("", "_blank");
    try {
      setIsPrinting(true);
      const options = { action: "print" as const, paperFormat: paperFormat, targetWindow: printTab };
      if (docType === "faktur") {
        await generateInvoicePDF(order, settings, options);
      } else if (docType === "surat_jalan") {
        await generateSuratJalanPDF(order, settings, options);
      } else {
        await generateTandaTerimaPDF(order, settings, options);
      }
    } catch (err: any) {
      console.error("Gagal cetak:", err);
      if (printTab && !printTab.closed) printTab.close();
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  // Action: Share via WhatsApp
  const handleShareWhatsApp = () => {
    const phone = order.no_wa ? order.no_wa.replace(/[^0-9]/g, "") : "";
    const cleanPhone = phone.startsWith("0") ? "62" + phone.slice(1) : phone.startsWith("62") ? phone : "62" + phone;

    let docTitle = "FAKTUR PENJUALAN";
    if (docType === "surat_jalan") docTitle = "SURAT JALAN";
    if (docType === "tanda_terima") docTitle = "TANDA TERIMA DOKUMEN";

    const itemListText = (order.items || [])
      .map((it, idx) => `  ${idx + 1}. *${it.nama_item}* (${it.qty} ${it.satuan || "pcs"}) - ${formatRp(it.subtotal || 0)}`)
      .join("\n");

    const message = `*${docTitle} - ${storeName.toUpperCase()}*
----------------------------------------
*No. Nota:* ${order.nomor_nota}
*Pelanggan:* ${order.nama_pelanggan}
*Tanggal:* ${formatTgl(order.tanggal_order)}
*Status Bayar:* ${isLunas ? "LUNAS ✅" : "BELUM LUNAS (Sisa: " + formatRp(sisa) + ") ⚠️"}

*Rincian Pesanan:*
${itemListText || `  1. Pesanan Cetak (${formatRp(grandTotal)})`}

----------------------------------------
*Total Tagihan:* *${formatRp(grandTotal)}*
*Terbayar (DP):* ${formatRp(dp)}
*Sisa Tagihan:* *${formatRp(sisa)}*

*Pembayaran Transfer:*
${storeBank}

_Terima kasih telah mempercayakan kebutuhan cetak Anda kepada ${storeName}!_`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone.length > 5 ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  const isThermal = paperFormat === "thermal58" || paperFormat === "thermal80";
  const isThermal58 = paperFormat === "thermal58";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
        {/* ================= MODAL HEADER ================= */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs border border-indigo-100 dark:border-indigo-900/40 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  Preview & Cetak Dokumen
                </h3>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800">
                  {order.nomor_nota}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {order.nama_pelanggan || "Pelanggan"} ({order.no_wa || "-"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>Cetak Sekarang</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= CONTROLS TOOLBAR ================= */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Document Type Switcher */}
          <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setDocType("faktur")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                docType === "faktur"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Faktur Penjualan</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType("surat_jalan")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                docType === "surat_jalan"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Surat Jalan</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType("tanda_terima")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                docType === "tanda_terima"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tanda Terima</span>
            </button>
          </div>

          {/* Paper Size Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
              Format Kertas:
            </span>
            <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSelectPaper("A4")}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  paperFormat === "A4"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaper("A5")}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  paperFormat === "A5"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                A5
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaper("thermal80")}
                className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  paperFormat === "thermal80"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                THERMAL80
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaper("thermal58")}
                className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  paperFormat === "thermal58"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                THERMAL58
              </button>
            </div>
          </div>
        </div>

        {/* ================= DOCUMENT PREVIEW AREA ================= */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-200/60 dark:bg-slate-950 flex justify-center items-start">
          <div
            ref={printableRef}
            className={`bg-white text-slate-900 shadow-xl rounded-lg transition-all border border-slate-300 ${
              isThermal58
                ? "w-[290px] p-4 text-[11px]"
                : paperFormat === "thermal80"
                ? "w-[360px] p-5 text-[12px]"
                : paperFormat === "A5"
                ? "w-full max-w-[620px] p-6 text-[13px]"
                : "w-full max-w-[760px] p-8 text-[13.5px]"
            }`}
            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
          >
            {/* ---------------------------------------------------- */}
            {/* CASE 1: THERMAL LAYOUT (58mm & 80mm)                 */}
            {/* Single column, centered header, stacked items & sums */}
            {/* ---------------------------------------------------- */}
            {isThermal ? (
              <div className="flex flex-col gap-2.5 leading-tight">
                {/* Store Header Centered */}
                <div className="text-center pb-2">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="mx-auto h-9 w-auto object-contain mb-1"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <h2 className="font-bold text-sm text-slate-900 uppercase tracking-tight">
                    {storeName}
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{storeAddress}</p>
                  <p className="text-[10px] text-slate-500 font-mono">WA: {storePhone}</p>
                </div>

                <div className="border-t border-dashed border-slate-400 my-0.5" />

                {/* Document Type Badge & Metadata */}
                <div className="text-center py-1 bg-slate-50 rounded border border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-slate-800">
                    {docType === "faktur"
                      ? "FAKTUR PENJUALAN"
                      : docType === "surat_jalan"
                      ? "SURAT JALAN PENGIRIMAN"
                      : "TANDA TERIMA DOKUMEN"}
                  </span>
                  <div className="text-[10px] font-mono font-semibold text-indigo-700 mt-0.5">
                    {order.nomor_nota}
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="flex flex-col gap-1 text-[10px] pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tanggal:</span>
                    <span className="font-medium">{formatTgl(order.tanggal_order)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pelanggan:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[170px]">
                      {order.nama_pelanggan || "Umum"}
                    </span>
                  </div>
                  {order.no_wa && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">No. WA:</span>
                      <span className="font-mono">{order.no_wa}</span>
                    </div>
                  )}
                  {order.created_by && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kasir/Petugas:</span>
                      <span>{order.created_by}</span>
                    </div>
                  )}
                  {docType === "faktur" && (
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-500">Status Bayar:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                          isLunas
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {isLunas ? "LUNAS" : "BELUM LUNAS"} ({order.metode_bayar || "Cash"})
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-400 my-0.5" />

                {/* Items List (Receipt Style) */}
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold uppercase text-slate-600 flex justify-between">
                    <span>ITEM PESANAN</span>
                    {docType === "faktur" && <span>TOTAL</span>}
                  </div>

                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex flex-col text-[10.5px]">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {idx + 1}. {item.nama_item}
                      </div>

                      {/* Dimension / custom notes */}
                      {(item.panjang || item.lebar || item.catatan) && (
                        <div className="text-[9.5px] text-slate-500 pl-3">
                          {item.panjang && item.lebar ? `${item.panjang}m × ${item.lebar}m` : ""}
                          {item.catatan ? ` • ${item.catatan}` : ""}
                        </div>
                      )}

                      {docType === "faktur" ? (
                        <div className="flex justify-between text-[10px] text-slate-600 pl-3 pt-0.5">
                          <span>
                            {item.qty} {item.satuan || "pcs"} × {formatRp(item.harga_satuan || 0)}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatRp(item.subtotal || 0)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-600 pl-3 pt-0.5 font-medium">
                          Qty: {item.qty} {item.satuan || "pcs"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-400 my-0.5" />

                {/* Financial Summary (Only for Faktur) */}
                {docType === "faktur" ? (
                  <div className="flex flex-col gap-1 text-[10.5px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatRp(subtotal)}</span>
                    </div>

                    {diskon > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Diskon:</span>
                        <span>-{formatRp(diskon)}</span>
                      </div>
                    )}

                    {pajak > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>PPN:</span>
                        <span>+{formatRp(pajak)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200 text-slate-900">
                      <span>TOTAL BAYAR:</span>
                      <span className="text-indigo-700 text-sm">{formatRp(grandTotal)}</span>
                    </div>

                    {dp > 0 && (
                      <div className="flex justify-between text-slate-600 pt-0.5">
                        <span>Terbayar (DP):</span>
                        <span>{formatRp(dp)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-[11px] text-slate-800 pt-0.5">
                      <span>SISA TAGIHAN:</span>
                      <span className={sisa > 0 ? "text-red-600" : "text-emerald-700"}>
                        {formatRp(sisa)}
                      </span>
                    </div>

                    {/* Bank Transfer Info */}
                    {storeBank && (
                      <div className="mt-1.5 p-1.5 rounded bg-slate-50 border border-slate-200 text-[9.5px]">
                        <span className="font-bold text-slate-700 block">Transfer Pembayaran:</span>
                        <span className="text-slate-600">{storeBank}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Delivery / Receipt Proof Signatures for Thermal */
                  <div className="pt-2 text-[9.5px]">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-slate-500 mb-6">Penerima,</p>
                        <p className="font-bold border-t border-slate-400 pt-0.5">
                          ( {order.nama_pelanggan || "..........."} )
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-6">Petugas Toko,</p>
                        <p className="font-bold border-t border-slate-400 pt-0.5">
                          ( {order.created_by || storeName} )
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed border-slate-400 my-1" />

                {/* Footer Notes */}
                <div className="text-center text-[9px] text-slate-500 leading-tight">
                  <p className="font-medium">Terima kasih atas pesanan Anda!</p>
                  <p className="mt-0.5 text-[8.5px]">{storeNotes}</p>
                </div>
              </div>
            ) : (
              /* ---------------------------------------------------- */
              /* CASE 2: STANDARD A4 & A5 FULL SPREAD LAYOUT          */
              /* Structured headers, 2-col metadata, clean data table */
              /* ---------------------------------------------------- */
              <div className="flex flex-col gap-4">
                {/* Header: Brand & Document Badge */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
                  {/* Left: Brand info */}
                  <div className="flex items-start gap-3 max-w-[60%]">
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt="Logo Toko"
                        className="w-12 h-12 object-contain rounded-md border border-slate-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div>
                      <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                        {storeName}
                      </h1>
                      <p className="text-xs italic text-slate-500 mt-0.5 leading-snug">
                        {storeSlogan}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">{storeAddress}</p>
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        WA: {storePhone} • Email: {storeEmail}
                      </p>
                    </div>
                  </div>

                  {/* Right: Document Badge */}
                  <div className="text-right bg-slate-50 dark:bg-slate-100 p-3 rounded-xl border border-slate-200 shadow-2xs min-w-[180px]">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider bg-indigo-600 text-white">
                      {docType === "faktur"
                        ? "INVOICE PENJUALAN"
                        : docType === "surat_jalan"
                        ? "SURAT JALAN"
                        : "TANDA TERIMA DOKUMEN"}
                    </span>
                    <div className="text-sm sm:text-base font-black font-mono text-slate-900 mt-1">
                      {order.nomor_nota}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Tgl: {formatTgl(order.tanggal_order)}
                    </div>
                  </div>
                </div>

                {/* Metadata Grid (Customer & Transaction Info) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  {/* Column 1: Customer */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      TAGIHAN KEPADA:
                    </span>
                    <p className="text-sm font-bold text-slate-900">
                      {order.nama_pelanggan || "Pelanggan Umum"}
                    </p>
                    <p className="text-slate-600 mt-0.5">No. WA / Telp: {order.no_wa || "-"}</p>
                    {order.created_by && (
                      <p className="text-slate-500 mt-0.5">Kasir / Admin: {order.created_by}</p>
                    )}
                  </div>

                  {/* Column 2: Order Meta */}
                  <div className="sm:text-right flex flex-col justify-between items-start sm:items-end">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        DETAIL TRANSAKSI:
                      </span>
                      <p className="text-slate-700">
                        Tanggal Order:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatTgl(order.tanggal_order)}
                        </span>
                      </p>
                      {order.tanggal_ambil && (
                        <p className="text-slate-700 mt-0.5">
                          Tanggal Ambil:{" "}
                          <span className="font-semibold text-slate-900">
                            {formatTgl(order.tanggal_ambil)}
                          </span>
                        </p>
                      )}
                      <p className="text-slate-700 mt-0.5">
                        Metode Bayar:{" "}
                        <span className="font-semibold">{order.metode_bayar || "Cash"}</span>
                      </p>
                    </div>

                    {docType === "faktur" && (
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isLunas
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {isLunas ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{isLunas ? "LUNAS" : "BELUM LUNAS"}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table of Items */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3">Deskripsi Item</th>
                        <th className="py-2.5 px-3 text-center w-20">Qty</th>
                        {docType === "faktur" && (
                          <>
                            <th className="py-2.5 px-3 text-right w-28">Harga Satuan</th>
                            <th className="py-2.5 px-3 text-right w-28">Total</th>
                          </>
                        )}
                        {docType !== "faktur" && (
                          <th className="py-2.5 px-3 text-center w-28">Keterangan</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {(order.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{item.nama_item}</div>
                            {((item.hitung_dimensi && item.panjang && item.lebar) || item.catatan_item) && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {item.hitung_dimensi && item.panjang && item.lebar
                                  ? `${item.panjang}${item.dimensi_unit || "m"} × ${item.lebar}${item.dimensi_unit || "m"}${item.jumlah_lembar && item.jumlah_lembar > 1 ? ` (${item.jumlah_lembar} lbr)` : ""}`
                                  : ""}
                                {item.catatan_item ? ` • ${item.catatan_item}` : ""}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium">
                            {item.qty} {item.satuan || "pcs"}
                          </td>
                          {docType === "faktur" && (
                            <>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {formatRp(item.harga_satuan || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                {formatRp(item.subtotal || 0)}
                              </td>
                            </>
                          )}
                          {docType !== "faktur" && (
                            <td className="py-2.5 px-3 text-center text-[11px] text-slate-500">
                              Lengkap & Baik
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Section: Payment Summary & Notes */}
                {docType === "faktur" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2">
                    {/* Left: Bank details & Terbilang */}
                    <div className="flex flex-col gap-2">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-800 block mb-1">
                          PEMBAYARAN / TRANSFER BANK:
                        </span>
                        <p className="text-slate-600 leading-relaxed font-mono">{storeBank}</p>
                      </div>

                      <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
                        <span className="text-[10.5px] font-bold text-indigo-900 block mb-0.5">
                          Terbilang:
                        </span>
                        <p className="italic text-indigo-800 font-medium">
                          {angkaKeTerbilang(grandTotal)} Rupiah
                        </p>
                      </div>
                    </div>

                    {/* Right: Calculations breakdown */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col gap-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-mono font-medium">{formatRp(subtotal)}</span>
                      </div>

                      {diskon > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Diskon:</span>
                          <span className="font-mono font-medium">-{formatRp(diskon)}</span>
                        </div>
                      )}

                      {pajak > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>PPN:</span>
                          <span className="font-mono font-medium">+{formatRp(pajak)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200 text-slate-900">
                        <span>TOTAL BAYAR:</span>
                        <span className="text-indigo-700 font-mono text-base font-black">
                          {formatRp(grandTotal)}
                        </span>
                      </div>

                      {dp > 0 && (
                        <div className="flex justify-between text-slate-600 pt-1">
                          <span>Terbayar (DP):</span>
                          <span className="font-mono font-medium">{formatRp(dp)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                        <span>SISA TAGIHAN:</span>
                        <span
                          className={`font-mono text-sm ${
                            sisa > 0 ? "text-red-600" : "text-emerald-700"
                          }`}
                        >
                          {formatRp(sisa)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Signatures for Surat Jalan & Tanda Terima */}
                {docType === "surat_jalan" && (
                  <div className="grid grid-cols-3 gap-4 text-center text-xs pt-4">
                    <div>
                      <p className="text-slate-500 mb-10">Penerima,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( {order.nama_pelanggan || "......................."} )
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-10">Driver / Kurir,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( ....................... )
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-10">Hormat Kami,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( {order.created_by || storeName} )
                      </p>
                    </div>
                  </div>
                )}

                {docType === "tanda_terima" && (
                  <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4">
                    <div>
                      <p className="text-slate-500 mb-10">Penerima Dokumen,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( {order.nama_pelanggan || "......................."} )
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-10">Diserahkan Oleh,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( {order.created_by || storeName} )
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer Notes */}
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-center leading-snug">
                  <p className="italic">{storeNotes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div>
            Format aktif:{" "}
            <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 uppercase">
              {paperFormat}
            </span>{" "}
            • Siap cetak ke printer fisik maupun download PDF
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
