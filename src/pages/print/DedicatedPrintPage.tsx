import React, { useState, useEffect, useRef } from "react";
import { Order, StoreSettings } from "../../types/index.js";
import { api } from "../../lib/api.js";
import {
  DocumentType,
  DOCUMENT_CONFIGS,
  PrintDocumentRenderer,
} from "../../components/print/PrintDocumentRenderer.js";
import { downloadDocPdf } from "../../lib/generateInvoicePdf.js";
import {
  Printer,
  Download,
  FileText,
  Truck,
  Tag,
  CreditCard,
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle,
} from "lucide-react";

interface DedicatedPrintPageProps {
  initialDocType?: DocumentType;
  orderId?: number | string;
  initialOrder?: Order | null;
  initialSettings?: StoreSettings | null;
  onClose?: () => void;
  autoPrint?: boolean;
}

export function DedicatedPrintPage({
  initialDocType = "nota",
  orderId,
  initialOrder = null,
  initialSettings = null,
  onClose,
  autoPrint = true,
}: DedicatedPrintPageProps) {
  const [docType, setDocType] = useState<DocumentType>(initialDocType);
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [settings, setSettings] = useState<StoreSettings | null>(initialSettings);
  const [loading, setLoading] = useState<boolean>(!initialOrder);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [hasAutoPrinted, setHasAutoPrinted] = useState<boolean>(false);

  const documentRef = useRef<HTMLDivElement>(null);
  const currentConfig = DOCUMENT_CONFIGS[docType] || DOCUMENT_CONFIGS.nota;

  // Load Order & Settings if not provided
  useEffect(() => {
    async function fetchData() {
      if (order && settings) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [settingsRes, orderRes] = await Promise.all([
          settings ? Promise.resolve({ settings }) : api.getSettings(),
          order
            ? Promise.resolve({ order })
            : orderId
            ? api.getOrder(orderId)
            : Promise.resolve({ order: null }),
        ]);

        if (settingsRes?.settings) {
          setSettings(settingsRes.settings);
        }

        if (orderRes?.order) {
          setOrder(orderRes.order);
        } else if (!order) {
          setError("Pesanan tidak ditemukan atau ID tidak valid.");
        }
      } catch (err: any) {
        console.error("Gagal memuat data print:", err);
        setError(err.message || "Gagal mengambil data pesanan untuk cetak.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orderId]);

  // Update document title for easy browser saving
  useEffect(() => {
    if (order) {
      const sanitizedDoc = currentConfig.shortTitle.replace(/[^a-zA-Z0-9]/g, "");
      const sanitizedOrder = (order.nomor_nota || "Order").replace(/[^a-zA-Z0-9_-]/g, "-");
      document.title = `${sanitizedDoc}-${sanitizedOrder}`;
    }
  }, [docType, order, currentConfig]);

  // Auto-print effect on initial load once ready
  useEffect(() => {
    if (!loading && order && autoPrint && !hasAutoPrinted) {
      const timer = setTimeout(() => {
        try {
          window.print();
          setHasAutoPrinted(true);
        } catch (e) {
          console.warn("Auto-print suppressed:", e);
        }
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [loading, order, autoPrint, hasAutoPrinted]);

  const handleManualPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!order) return;
    try {
      setIsDownloading(true);
      await downloadDocPdf(docType, order, settings);
    } catch (err) {
      console.error("Gagal unduh PDF:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="font-semibold text-sm">Menyiapkan dokumen cetak...</p>
        <p className="text-xs text-slate-400 mt-1">Mengambil template & data order</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="bg-rose-950/60 border border-rose-800 p-6 rounded-2xl max-w-md">
          <p className="text-rose-400 font-bold mb-2">Terjadi Kesalahan</p>
          <p className="text-xs text-slate-300 mb-4">{error || "Data pesanan tidak ditemukan."}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup Halaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center print:bg-white print:text-black">
      {/* Dynamic CSS @page Rule injected for exact browser print dimension matching */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body, html {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                width: 100% !important;
                height: 100% !important;
              }
              .no-print, .print-hide {
                display: none !important;
              }
              .print-container-wrapper {
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                display: block !important;
              }
              .printable-sheet {
                box-shadow: none !important;
                border: none !important;
                margin: 0 auto !important;
                page-break-inside: avoid !important;
              }
              ${currentConfig.pageCssRule}
            }
          `,
        }}
      />

      {/* Screen-Only Control Toolbar (Hidden in Print Dialog) */}
      <div className="no-print w-full sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back & Document Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white">{currentConfig.title}</h2>
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                  {order.nomor_nota}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ukuran: <strong>{currentConfig.paperSizeLabel}</strong> • Pelanggan:{" "}
                <strong className="text-slate-200">{order.nama_pelanggan}</strong>
              </p>
            </div>
          </div>

          {/* Document Switcher Tabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setDocType("nota")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                docType === "nota"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Nota</span>
            </button>

            <button
              onClick={() => setDocType("surat-jalan")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                docType === "surat-jalan"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Surat Jalan</span>
            </button>

            <button
              onClick={() => setDocType("label")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                docType === "label"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Label</span>
            </button>

            <button
              onClick={() => setDocType("rekap-pembayaran")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                docType === "rekap-pembayaran"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Rekap Bayar</span>
            </button>
          </div>

          {/* Action Buttons: Print & Download PDF */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span>Unduh PDF</span>
            </button>

            <button
              onClick={handleManualPrint}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang (Ctrl+P)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview Canvas Area */}
      <div className="print-container-wrapper flex-1 w-full flex items-center justify-center p-6 md:p-10 overflow-auto">
        <div className="printable-sheet bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-700/60 transition-transform">
          <PrintDocumentRenderer
            ref={documentRef}
            type={docType}
            order={order}
            settings={settings}
          />
        </div>
      </div>

      {/* Screen-Only Footer Tip */}
      <div className="no-print py-4 text-center text-xs text-slate-500">
        💡 Tips: Gunakan opsi printer fisik atau pilih <strong>"Save as PDF"</strong> pada dialog print browser untuk menyimpan PDF resolusi tinggi.
      </div>
    </div>
  );
}
