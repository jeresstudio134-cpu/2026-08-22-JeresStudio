import React, { useState, useEffect, useRef } from "react";
import { Order, StoreSettings } from "../types/index.js";
import {
  generateInvoicePDF,
  generateSuratJalanPDF,
  generateTandaTerimaPDF,
  getUserPaperPreference,
  setUserPaperPreference,
  PaperFormat,
  createPrintTab,
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
  const dp = Number(order.dp) || 0;
  const sisa = Number(order.sisa_tagihan) !== undefined ? Number(order.sisa_tagihan) : Math.max(0, grandTotal - dp);
  const isLunas = order.status_bayar === "Lunas" || sisa <= 0;

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

  // Action: Print Now (Buka langsung di tab browser tanpa download)
  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const printTab = createPrintTab(
        `${docType === "faktur" ? "Invoice" : docType === "surat_jalan" ? "Surat Jalan" : "Tanda Terima"} ${order.nomor_nota || ""}`
      );
      const options = { action: "open" as const, paperFormat: paperFormat, targetWindow: printTab };
      if (docType === "faktur") {
        await generateInvoicePDF(order, settings, options);
      } else if (docType === "surat_jalan") {
        await generateSuratJalanPDF(order, settings, options);
      } else {
        await generateTandaTerimaPDF(order, settings, options);
      }
    } catch (err: any) {
      console.error("Gagal cetak:", err);
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
              /* CASE 2: STANDARD A4 & A5 KLEDO ACCOUNTING LAYOUT     */
              /* Structured header, Kledo underlines, dark navy table */
              /* ---------------------------------------------------- */
              <div className="flex flex-col gap-6 text-slate-800">
                {/* Header: Logo Kiri & Invoice Meta Kanan */}
                <div className="flex items-start justify-between gap-6 pb-2">
                  {/* Left: Brand Logo */}
                  <div className="max-w-[55%]">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo Toko"
                        className="h-14 sm:h-16 w-auto object-contain shrink-0 mb-1"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                        {storeName}
                      </h1>
                    )}
                  </div>

                  {/* Right: Invoice Title & Meta Data (Kledo Style) */}
                  <div className="text-right flex flex-col items-end">
                    <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 tracking-tight leading-none mb-3">
                      {docType === "faktur"
                        ? "Invoice"
                        : docType === "surat_jalan"
                        ? "Surat Jalan"
                        : "Tanda Terima"}
                    </h2>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-left min-w-[200px]">
                      <span className="text-slate-500">Nomor</span>
                      <span className="font-bold text-slate-900 text-right font-mono">
                        {order.nomor_nota}
                      </span>

                      <span className="text-slate-500">Tanggal</span>
                      <span className="text-slate-800 text-right font-medium">
                        {order.tanggal_order
                          ? new Date(order.tanggal_order).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "-"}
                      </span>

                      <span className="text-slate-500">Tgl. Jatuh Tempo</span>
                      <span className="text-slate-800 text-right font-medium">
                        {order.tanggal_ambil || order.tanggal_order
                          ? new Date(order.tanggal_ambil || order.tanggal_order).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2-Column Parties Section (Informasi Perusahaan & Tagihan Kepada) with Kledo Underline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
                  {/* Left: Informasi Perusahaan */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 pb-1 border-b-2 border-slate-700 mb-2">
                      Informasi Perusahaan
                    </h3>
                    <div className="space-y-0.5 text-slate-600 leading-relaxed">
                      <p className="font-bold text-sm text-blue-700">{storeName}</p>
                      <p className="text-slate-600">{storeAddress}</p>
                      {storePhone && <p>Telp: {storePhone}</p>}
                      {storeEmail && <p>Email: {storeEmail}</p>}
                    </div>
                  </div>

                  {/* Right: Tagihan Kepada */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 pb-1 border-b-2 border-slate-700 mb-2">
                      Tagihan Kepada
                    </h3>
                    <div className="space-y-0.5 text-slate-600 leading-relaxed">
                      <p className="font-bold text-sm text-blue-700">
                        {order.nama_pelanggan || "Pelanggan Umum"}
                      </p>
                      {order.no_wa && <p>Telp: {order.no_wa}</p>}
                      {order.created_by && <p>Kasir / Admin: {order.created_by}</p>}
                    </div>
                  </div>
                </div>

                {/* Kledo Signature Table (Dark Slate Navy Header) */}
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#243447] text-white font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Produk</th>
                        <th className="py-2.5 px-3">Deskripsi</th>
                        <th className="py-2.5 px-3 text-center">Kuantitas</th>
                        {docType === "faktur" && (
                          <>
                            <th className="py-2.5 px-3 text-right">Harga</th>
                            <th className="py-2.5 px-3 text-center">Diskon</th>
                            <th className="py-2.5 px-3 text-center">Pajak</th>
                            <th className="py-2.5 px-3 text-right">Jumlah</th>
                          </>
                        )}
                        {docType !== "faktur" && (
                          <th className="py-2.5 px-3 text-center">Keterangan</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {(order.items || []).map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {item.nama_item}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {item.panjang && item.lebar
                              ? `${item.panjang}m × ${item.lebar}m ${
                                  item.jumlah_lembar && item.jumlah_lembar > 1
                                    ? `(${item.jumlah_lembar} lbr)`
                                    : ""
                                }`
                              : ""}
                            {item.catatan_item
                              ? `${item.panjang && item.lebar ? " • " : ""}${item.catatan_item}`
                              : !item.panjang && !item.lebar
                              ? "-"
                              : ""}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium">
                            {item.qty} {item.satuan || ""}
                          </td>
                          {docType === "faktur" && (
                            <>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {(item.harga_satuan || 0).toLocaleString("id-ID")}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {item.diskon ? `${item.diskon}%` : "0%"}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                {(item.subtotal || 0).toLocaleString("id-ID")}
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

                {/* Bottom Section: Summary & Terbilang */}
                {docType === "faktur" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start pt-1">
                    {/* Left: Terbilang & Rekening Bank */}
                    <div className="space-y-4 text-xs">
                      <div>
                        <h4 className="font-bold text-slate-600 mb-1">Terbilang</h4>
                        <p className="italic text-slate-900 font-medium leading-relaxed">
                          {angkaKeTerbilang(grandTotal)} Rupiah
                        </p>
                      </div>

                      {storeBank && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="font-bold text-slate-600 block mb-0.5">
                            Informasi Pembayaran / Rekening:
                          </span>
                          <p className="text-slate-800 font-mono leading-relaxed">{storeBank}</p>
                        </div>
                      )}

                      {storeNotes && (
                        <div className="text-[11px] text-slate-500 italic">
                          <p>{storeNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: Kledo Calculations Breakdown */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-medium text-slate-900 font-mono">
                          {formatRp(subtotal)}
                        </span>
                      </div>

                      {diskon > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Diskon</span>
                          <span className="font-mono font-medium">-{formatRp(diskon)}</span>
                        </div>
                      )}

                      {/* Total with Kledo thick underline */}
                      <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 pb-1 border-b-2 border-slate-800">
                        <span>Total</span>
                        <span className="font-mono text-base">{formatRp(grandTotal)}</span>
                      </div>

                      {dp > 0 && !isLunas && (
                        <div className="flex justify-between text-slate-600 pt-1">
                          <span>Terbayar (DP)</span>
                          <span className="font-mono font-medium">{formatRp(dp)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-semibold text-xs pt-1">
                        <span className="text-slate-600">Sisa Tagihan</span>
                        <span
                          className={`font-mono text-sm font-bold ${
                            isLunas ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {isLunas ? "Rp 0 (LUNAS)" : formatRp(sisa)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Signatures Footer */}
                {docType === "faktur" && (
                  <div className="flex justify-end text-xs pt-6">
                    <div className="text-left min-w-[160px]">
                      <p className="text-slate-600 mb-14">Dengan Hormat,</p>
                      <p className="font-bold text-slate-900">{storeName}</p>
                      <p className="text-slate-500 text-[11px]">Toko</p>
                    </div>
                  </div>
                )}

                {docType === "surat_jalan" && (
                  <div className="grid grid-cols-3 gap-4 text-center text-xs pt-6">
                    <div>
                      <p className="text-slate-500 mb-12">Penerima,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( {order.nama_pelanggan || "......................."} )
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-12">Driver / Kurir,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( ....................... )
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-12">Hormat Kami,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( {order.created_by || storeName} )
                      </p>
                    </div>
                  </div>
                )}

                {docType === "tanda_terima" && (
                  <div className="grid grid-cols-2 gap-8 text-center text-xs pt-6">
                    <div>
                      <p className="text-slate-500 mb-12">Penerima Dokumen,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( {order.nama_pelanggan || "......................."} )
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-12">Diserahkan Oleh,</p>
                      <p className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                        ( {order.created_by || storeName} )
                      </p>
                    </div>
                  </div>
                )}
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
