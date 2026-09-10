import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Transaction, StoreSettings, KantongKasType } from "../types/index.js";
import { formatRupiah, formatTanggal } from "../lib/utils.js";
import {
  Printer,
  Download,
  X,
  FileSpreadsheet,
  Calendar,
  Filter,
  User,
  CheckCircle2,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Phone,
  Mail,
  Scale,
  Layers,
  ExternalLink,
} from "lucide-react";

export interface FilterInfo {
  type: "all" | "masuk" | "keluar";
  kantong: string;
  category: string;
  kasir: string;
  dateRange: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface FilterTotals {
  totalMasuk: number;
  totalKeluar: number;
  saldoBersih: number;
  countMasuk: number;
  countKeluar: number;
  totalCount: number;
  perKantong?: Record<KantongKasType, { masuk: number; keluar: number; saldo: number }>;
}

interface PrintLaporanKasModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  filterInfo: FilterInfo;
  totals: FilterTotals;
  settings?: StoreSettings | null;
  currentUser?: { nama?: string; username?: string; role?: string } | null;
  onExportCSV?: () => void;
}

const KANTONG_NAMES: Record<string, string> = {
  modal: "Modal (Vendor & Bahan)",
  overhead: "Overhead (Operasional)",
  gaji_saya: "Gaji Saya (Owner/Desain)",
  gaji_karyawan: "Gaji Karyawan (Staff)",
  margin: "Margin / Profit Toko",
};

export const PrintLaporanKasModal: React.FC<PrintLaporanKasModalProps> = ({
  isOpen,
  onClose,
  transactions,
  filterInfo,
  totals,
  settings,
  currentUser,
  onExportCSV,
}) => {
  const [paperOrientation, setPaperOrientation] = useState<"landscape" | "portrait">("landscape");
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Store information
  const storeName = settings?.nama_toko || "JERES STUDIO";
  const storeSlogan = settings?.slogan || "Percetakan Digital, Stiker, DTF & Sablon Jersey Berkualitas";
  const storeAddress = settings?.alamat || "Pusat Usaha Kreatif & Percetakan Digital";
  const storePhone = settings?.no_wa || "-";
  const storeEmail = settings?.email || "-";

  // Label helpers for active filters
  const getPeriodLabel = () => {
    switch (filterInfo.dateRange) {
      case "today":
        return "Hari Ini (" + formatTanggal(new Date().toISOString().slice(0, 10)) + ")";
      case "7days":
        return "7 Hari Terakhir";
      case "month":
        return "Bulan Ini (" + new Date().toLocaleString("id-ID", { month: "long", year: "numeric" }) + ")";
      case "lastMonth":
        const prevMonthDate = new Date();
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        return "Bulan Lalu (" + prevMonthDate.toLocaleString("id-ID", { month: "long", year: "numeric" }) + ")";
      case "custom":
        if (filterInfo.startDate && filterInfo.endDate) {
          return `${formatTanggal(filterInfo.startDate)} s/d ${formatTanggal(filterInfo.endDate)}`;
        }
        return "Rentang Kustom";
      default:
        return "Semua Waktu";
    }
  };

  const getTypeLabel = () => {
    if (filterInfo.type === "masuk") return "Pemasukan Saja (Kas Masuk)";
    if (filterInfo.type === "keluar") return "Pengeluaran Saja (Kas Keluar)";
    return "Semua Transaksi (Masuk & Keluar)";
  };

  const getKantongLabel = () => {
    if (!filterInfo.kantong || filterInfo.kantong === "all") return "Semua Kantong Kas";
    return KANTONG_NAMES[filterInfo.kantong] || filterInfo.kantong;
  };

  const getCategoryLabel = () => {
    if (!filterInfo.category || filterInfo.category === "all") return "Semua Kategori";
    return filterInfo.category;
  };

  const getKasirLabel = () => {
    if (!filterInfo.kasir || filterInfo.kasir === "all") return "Semua Kasir / Staff";
    return filterInfo.kasir;
  };

  const printDateStr = new Date().toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    const reportElem = document.getElementById("print-laporan-content");
    if (!reportElem) {
      window.print();
      return;
    }

    // Try isolated hidden iframe print first to bypass any parent styling or display:none restrictions
    try {
      let printFrame = document.getElementById("print-laporan-iframe") as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement("iframe");
        printFrame.id = "print-laporan-iframe";
        printFrame.style.position = "fixed";
        printFrame.style.right = "0";
        printFrame.style.bottom = "0";
        printFrame.style.width = "0";
        printFrame.style.height = "0";
        printFrame.style.border = "none";
        printFrame.style.visibility = "hidden";
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
        .map((node) => node.outerHTML)
        .join("\n");

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="UTF-8" />
            <title>Laporan Rekapitulasi Kas - ${storeName}</title>
            ${styles}
            <style>
              @page {
                size: ${paperOrientation === "landscape" ? "A4 landscape" : "A4 portrait"};
                margin: 6mm 8mm;
              }
              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                font-size: 11px !important;
              }
              #print-laporan-content {
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 4mm 6mm !important;
                margin: 0 !important;
              }
              table {
                width: 100% !important;
                page-break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
            </style>
          </head>
          <body class="bg-white text-slate-900">
            ${reportElem.outerHTML}
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (err) {
          console.warn("Iframe print fallback to window.print:", err);
          window.print();
        }
      }, 350);
    } catch (e) {
      console.warn("Failed to create print iframe, falling back to window.print:", e);
      window.print();
    }
  };

  const handleOpenInNewWindow = () => {
    const reportElem = document.getElementById("print-laporan-content");
    if (!reportElem) return;

    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((node) => node.outerHTML)
      .join("\n");

    const win = window.open("", "_blank");
    if (!win) {
      handlePrint();
      return;
    }

    win.document.open();
    win.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <title>Cetak Laporan Kas - ${storeName}</title>
          ${styles}
          <style>
            @page {
              size: ${paperOrientation === "landscape" ? "A4 landscape" : "A4 portrait"};
              margin: 6mm 8mm;
            }
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 6mm !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #print-laporan-content {
              box-shadow: none !important;
              border: none !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
            }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="position: sticky; top: 0; background: #0f172a; color: white; padding: 10px 16px; margin: -6mm -6mm 15px -6mm; display: flex; justify-content: space-between; align-items: center; z-index: 999; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            <span style="font-weight: bold; font-size: 13px;">Pratinjau Dokumen Cetak (${paperOrientation.toUpperCase()})</span>
            <div>
              <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 8px;">Cetak Dokumen</button>
              <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Tutup</button>
            </div>
          </div>
          ${reportElem.outerHTML}
        </body>
      </html>
    `);
    win.document.close();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print-modal-wrapper print:p-0 print:m-0 print:bg-white print:static print:overflow-visible">
      {/* Inlined Print CSS specifically for print-laporan-content and Ctrl+P prints */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${paperOrientation === "landscape" ? "A4 landscape" : "A4 portrait"};
            margin: 6mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root, #main-app-wrapper {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-modal-wrapper {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            inset: auto !important;
            z-index: auto !important;
          }
          .print-modal-dialog {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: visible !important;
            max-height: none !important;
          }
          .print-preview-container {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            display: block !important;
          }
          #print-laporan-content {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2mm 4mm !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
        }
      `}} />

      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden print-modal-dialog">
        {/* ================= MODAL HEADER (NO-PRINT) ================= */}
        <div className="no-print p-4 sm:px-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                Pratinjau Cetak Laporan Kas & Transaksi
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sesuai filter aktif: {totals.totalCount} transaksi terfilter
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Orientation Toggle */}
            <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPaperOrientation("landscape")}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  paperOrientation === "landscape"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                A4 Landscape
              </button>
              <button
                type="button"
                onClick={() => setPaperOrientation("portrait")}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  paperOrientation === "portrait"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                A4 Portrait
              </button>
            </div>

            {onExportCSV && (
              <button
                type="button"
                onClick={onExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Download CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenInNewWindow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Buka Pratinjau di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Buka Tab Baru</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ml-1 transition-colors"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= PREVIEW AREA CONTAINER ================= */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto bg-slate-200/70 dark:bg-slate-950 flex justify-center items-start print-preview-container">
          {/* ================= PRINTABLE PAPER CANVAS ================= */}
          <div
            ref={reportRef}
            id="print-laporan-content"
            className={`bg-white text-slate-900 shadow-xl rounded-xl border border-slate-300 p-6 sm:p-8 w-full transition-all print-a4-sheet ${
              paperOrientation === "landscape" ? "max-w-[1050px]" : "max-w-[800px]"
            }`}
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* 1. KOP TOKO / HEADER RESMI */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4 gap-4">
              <div className="flex items-start gap-3">
                {settings?.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={storeName}
                    className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-wider">
                    JS
                  </div>
                )}
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-slate-900">
                    {storeName}
                  </h1>
                  <p className="text-xs font-semibold text-indigo-700">{storeSlogan}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{storeAddress}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                    {storePhone !== "-" && <span>WA / Telp: {storePhone}</span>}
                    {storeEmail !== "-" && <span>Email: {storeEmail}</span>}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-800">
                  DOKUMEN ARUS KAS
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Dicetak pada:</p>
                <p className="text-[11px] font-semibold font-mono text-slate-800">{printDateStr}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Petugas: <span className="font-semibold text-slate-700">{currentUser?.nama || "Admin Toko"}</span>
                </p>
              </div>
            </div>

            {/* 2. TITLE & FILTER CRITERIA */}
            <div className="mb-4">
              <div className="text-center mb-3">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                  LAPORAN REKAPITULASI ARUS KAS & TRANSAKSI
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Sistem Alokasi 5 Kantong Kas • Periode: <strong className="text-slate-900">{getPeriodLabel()}</strong>
                </p>
              </div>

              {/* Filter Parameters Grid */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-2.5 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tipe Transaksi:</span>
                  <span className="font-bold text-slate-800">{getTypeLabel()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kantong Kas:</span>
                  <span className="font-bold text-slate-800">{getKantongLabel()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kategori:</span>
                  <span className="font-bold text-slate-800">{getCategoryLabel()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Staff / Kasir:</span>
                  <span className="font-bold text-slate-800">{getKasirLabel()}</span>
                </div>
              </div>
            </div>

            {/* 3. EXECUTIVE FINANCIAL SUMMARY BOXES */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {/* Box Pemasukan */}
              <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/70 text-slate-900">
                <div className="flex items-center justify-between text-[11px] text-emerald-800 font-bold mb-1">
                  <span className="flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    TOTAL PEMASUKAN
                  </span>
                  <span className="text-[10px] font-normal px-1.5 py-0.2 bg-emerald-200/80 rounded">
                    {totals.countMasuk}x
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-emerald-700">
                  {formatRupiah(totals.totalMasuk)}
                </div>
                <div className="text-[10px] text-emerald-800/80 mt-0.5">Akumulasi kas masuk terfilter</div>
              </div>

              {/* Box Pengeluaran */}
              <div className="p-3 rounded-lg border border-rose-300 bg-rose-50/70 text-slate-900">
                <div className="flex items-center justify-between text-[11px] text-rose-800 font-bold mb-1">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                    TOTAL PENGELUARAN
                  </span>
                  <span className="text-[10px] font-normal px-1.5 py-0.2 bg-rose-200/80 rounded">
                    {totals.countKeluar}x
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-rose-700">
                  {formatRupiah(totals.totalKeluar)}
                </div>
                <div className="text-[10px] text-rose-800/80 mt-0.5">Akumulasi beban biaya terfilter</div>
              </div>

              {/* Box Saldo Kas Bersih */}
              <div
                className={`p-3 rounded-lg border text-slate-900 ${
                  totals.saldoBersih >= 0
                    ? "border-indigo-300 bg-indigo-50/70"
                    : "border-amber-300 bg-amber-50/70"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold mb-1 text-slate-800">
                  <span className="flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-indigo-600" />
                    ARUS KAS BERSIH (NET)
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      totals.saldoBersih >= 0 ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"
                    }`}
                  >
                    {totals.saldoBersih >= 0 ? "Surplus" : "Defisit"}
                  </span>
                </div>
                <div
                  className={`text-base sm:text-lg font-black font-mono ${
                    totals.saldoBersih >= 0 ? "text-indigo-900" : "text-rose-700"
                  }`}
                >
                  {formatRupiah(totals.saldoBersih)}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">Pemasukan dikurangi pengeluaran</div>
              </div>
            </div>

            {/* 4. BREAKDOWN PER KANTONG KAS (IF AVAILABLE) */}
            {totals.perKantong && (
              <div className="mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Rincian Akumulasi Berdasarkan 5 Kantong Kas:
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                  {(
                    [
                      { key: "modal", label: "Modal", color: "border-blue-200 bg-blue-50/50" },
                      { key: "overhead", label: "Overhead", color: "border-amber-200 bg-amber-50/50" },
                      { key: "gaji_saya", label: "Gaji Saya", color: "border-purple-200 bg-purple-50/50" },
                      { key: "gaji_karyawan", label: "Gaji Staff", color: "border-teal-200 bg-teal-50/50" },
                      { key: "margin", label: "Margin", color: "border-emerald-200 bg-emerald-50/50" },
                    ] as const
                  ).map((p) => {
                    const data = totals.perKantong?.[p.key] || { masuk: 0, keluar: 0, saldo: 0 };
                    return (
                      <div key={p.key} className={`p-1.5 rounded border ${p.color} text-slate-800`}>
                        <div className="font-extrabold uppercase text-[9px] text-slate-600 mb-0.5">{p.label}</div>
                        <div className="text-emerald-700 font-mono font-bold text-[10px]">+{formatRupiah(data.masuk)}</div>
                        <div className="text-rose-700 font-mono font-bold text-[10px]">-{formatRupiah(data.keluar)}</div>
                        <div className="border-t border-slate-300 mt-0.5 pt-0.5 font-mono font-extrabold text-[10px] text-slate-900">
                          {formatRupiah(data.saldo)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. TABEL RINCIAN TRANSAKSI */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                  Daftar Transaksi Kas Terfilter ({transactions.length} Data):
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Urutan berdasarkan tanggal input
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-[10.5px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="py-2 px-2 text-center w-8">No</th>
                      <th className="py-2 px-2.5">Tanggal / Jam</th>
                      <th className="py-2 px-2 text-center w-16">Tipe</th>
                      <th className="py-2 px-2">Kantong</th>
                      <th className="py-2 px-2">Kategori</th>
                      <th className="py-2 px-2.5">Keterangan / Referensi</th>
                      <th className="py-2 px-2">Metode</th>
                      <th className="py-2 px-2">Kasir</th>
                      <th className="py-2 px-2.5 text-right">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {transactions.length > 0 ? (
                      transactions.map((tx, idx) => {
                        const isMasuk = tx.tipe === "masuk";
                        const dateObj = new Date(tx.tanggal);
                        const dateFormatted = dateObj.toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });
                        const timeFormatted = dateObj.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <tr
                            key={tx.id || idx}
                            className={`hover:bg-slate-50 ${idx % 2 === 1 ? "bg-slate-50/40" : ""}`}
                          >
                            <td className="py-1.5 px-2 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap">
                              <span className="font-semibold text-slate-800">{dateFormatted}</span>
                              <span className="text-[9.5px] text-slate-400 block font-mono">{timeFormatted} WIB</span>
                            </td>
                            <td className="py-1.5 px-2 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase ${
                                  isMasuk
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-rose-100 text-rose-800 border border-rose-300"
                                }`}
                              >
                                {isMasuk ? "Masuk" : "Keluar"}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 font-medium text-slate-700 capitalize">
                              {KANTONG_NAMES[tx.kantong as string] ? tx.kantong : "Margin"}
                            </td>
                            <td className="py-1.5 px-2 font-medium text-slate-800">{tx.kategori}</td>
                            <td className="py-1.5 px-2.5 max-w-[220px]">
                              <span className="text-slate-800 font-medium block truncate">{tx.keterangan || "-"}</span>
                              {tx.referensi && (
                                <span className="text-[9.5px] text-slate-500 font-mono block">
                                  Ref: {tx.referensi}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">
                              {tx.metode_pembayaran || "Cash"}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 font-medium whitespace-nowrap">
                              {tx.created_by || "Admin"}
                            </td>
                            <td
                              className={`py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap ${
                                isMasuk ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {isMasuk ? "+ " : "- "}
                              {formatRupiah(tx.nominal)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 text-xs italic">
                          Tidak ada transaksi kas yang sesuai dengan kriteria filter yang dipilih.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {transactions.length > 0 && (
                    <tfoot className="border-t-2 border-slate-900 bg-slate-100 font-bold text-[11px]">
                      <tr>
                        <td colSpan={8} className="py-1.5 px-2.5 text-right uppercase text-slate-700">
                          Total Pemasukan (Masuk):
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-emerald-700 font-black">
                          + {formatRupiah(totals.totalMasuk)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={8} className="py-1.5 px-2.5 text-right uppercase text-slate-700">
                          Total Pengeluaran (Keluar):
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-rose-700 font-black">
                          - {formatRupiah(totals.totalKeluar)}
                        </td>
                      </tr>
                      <tr className="bg-slate-200/90 text-slate-900 border-t border-slate-300">
                        <td colSpan={8} className="py-2 px-2.5 text-right uppercase font-black">
                          Saldo Arus Kas Bersih:
                        </td>
                        <td
                          className={`py-2 px-2.5 text-right font-mono font-black text-xs ${
                            totals.saldoBersih >= 0 ? "text-indigo-900" : "text-rose-800"
                          }`}
                        >
                          {totals.saldoBersih >= 0 ? "+ " : ""}
                          {formatRupiah(totals.saldoBersih)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 6. LEMBAR PENGESAHAN & TANDA TANGAN */}
            <div className="pt-4 border-t border-slate-300 grid grid-cols-2 text-center text-xs break-inside-avoid">
              <div>
                <p className="text-[11px] text-slate-500">Dibuat & Diverifikasi Oleh:</p>
                <div className="h-16 flex items-end justify-center">
                  <div className="w-36 border-b border-slate-400 pb-0.5">
                    <span className="font-bold text-slate-800 text-[11px]">
                      {currentUser?.nama || "Staff Keuangan"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Staff / Kasir Toko</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-500">Mengetahui / Disetujui:</p>
                <div className="h-16 flex items-end justify-center">
                  <div className="w-36 border-b border-slate-400 pb-0.5">
                    <span className="font-bold text-slate-800 text-[11px]">Pimpinan Toko</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Owner {storeName}</p>
              </div>
            </div>

            {/* Print Footer note */}
            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>Dicetak melalui Sistem Manajemen Kas 5 Kantong - {storeName}</span>
              <span>Halaman 1</span>
            </div>
          </div>
        </div>

        {/* ================= MODAL FOOTER (NO-PRINT) ================= */}
        <div className="no-print p-3.5 sm:px-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Format siap cetak printer A4 (Fisik atau Simpan sebagai PDF).</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleOpenInNewWindow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Buka Pratinjau di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Buka Tab Baru</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
