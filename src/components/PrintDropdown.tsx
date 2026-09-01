import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Order, StoreSettings } from "../types/index.js";
import {
  generateInvoicePDF,
  generateSuratJalanPDF,
  generateTandaTerimaPDF,
  exportInvoiceToXLS,
  exportInvoiceToCSV,
  getUserPaperPreference,
} from "../utils/generateInvoicePDF.js";
import { ChangePaperLayoutModal } from "./ChangePaperLayoutModal.js";
import { DocumentPrintPreviewModal, PreviewDocType } from "./DocumentPrintPreviewModal.js";
import {
  Printer,
  ChevronDown,
  FileText,
  Truck,
  CheckSquare,
  FileSpreadsheet,
  FileCode,
  Sliders,
  Download,
  Loader2,
} from "lucide-react";

interface PrintDropdownProps {
  order: Order;
  settings?: StoreSettings | null;
  variant?: "primary" | "table" | "icon" | "button";
  className?: string;
  onLayoutChange?: () => void;
}

export const PrintDropdown: React.FC<PrintDropdownProps> = ({
  order,
  settings,
  variant = "primary",
  className = "",
  onLayoutChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocType, setPreviewDocType] = useState<PreviewDocType>("faktur");
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; right?: number }>({
    top: 0,
    left: 0,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let leftPos = rect.right - menuWidth;
      if (leftPos < 12) {
        leftPos = Math.max(12, rect.left);
      }
      if (leftPos + menuWidth > window.innerWidth - 12) {
        leftPos = window.innerWidth - menuWidth - 12;
      }

      let topPos: number;
      if (spaceBelow < 340 && spaceAbove > spaceBelow) {
        topPos = Math.max(12, rect.top - 330);
      } else {
        topPos = Math.min(window.innerHeight - 340, rect.bottom + 4);
        if (topPos < 12) topPos = 12;
      }

      setMenuPosition({
        top: topPos,
        left: Math.max(10, leftPos),
      });
    }
    setIsOpen(!isOpen);
  };

  const handleAction = async (actionType: string) => {
    try {
      setLoadingAction(actionType);
      if (actionType === "faktur" || actionType === "surat_jalan" || actionType === "tanda_terima") {
        setPreviewDocType(actionType as PreviewDocType);
        setPreviewModalOpen(true);
      } else if (actionType === "download_pdf") {
        await generateInvoicePDF(order, settings, { action: "download" });
      } else if (actionType === "xls") {
        exportInvoiceToXLS(order, settings);
      } else if (actionType === "csv") {
        exportInvoiceToCSV(order, settings);
      } else if (actionType === "layout") {
        setLayoutModalOpen(true);
      }
    } catch (err: any) {
      console.error(`Gagal memproses aksi ${actionType}:`, err);
      alert(`Gagal: ${err?.message || "Terjadi kesalahan saat memproses dokumen."}`);
    } finally {
      setLoadingAction(null);
      setIsOpen(false);
    }
  };

  const currentPaper = getUserPaperPreference();

  // Dropdown portal menu
  const menuPortal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 9999,
              maxHeight: "calc(100vh - 24px)",
            }}
            className="w-60 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 overflow-y-auto animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Section 1: Dokumen Utama */}
            <div className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>Cetak & Preview Dokumen</span>
              <span className="text-[9px] font-mono text-indigo-500 font-bold">{currentPaper}</span>
            </div>

            <button
              type="button"
              onClick={() => handleAction("faktur")}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold">Faktur Penjualan</p>
                  <p className="text-[10px] text-slate-400 font-normal">Cetak nota & rincian pembayaran</p>
                </div>
              </div>
              {loadingAction === "faktur" && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleAction("surat_jalan")}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold">Surat Jalan</p>
                  <p className="text-[10px] text-slate-400 font-normal">Pengiriman barang (3 tanda tangan)</p>
                </div>
              </div>
              {loadingAction === "surat_jalan" && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleAction("tanda_terima")}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold">Tanda Terima Dokumen</p>
                  <p className="text-[10px] text-slate-400 font-normal">Bukti serah terima hasil cetak</p>
                </div>
              </div>
              {loadingAction === "tanda_terima" && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />}
            </button>

            <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

            {/* Section 2: Export Data */}
            <div className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Download & Export
            </div>

            <button
              type="button"
              onClick={() => handleAction("download_pdf")}
              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Download PDF Langsung</span>
              </div>
              {loadingAction === "download_pdf" && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleAction("xls")}
              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Download XLS (Excel)</span>
              </div>
              {loadingAction === "xls" && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleAction("csv")}
              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Download CSV</span>
              </div>
              {loadingAction === "csv" && <Loader2 className="w-3 h-3 animate-spin text-amber-600" />}
            </button>

            <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

            {/* Section 3: Konfigurasi Layout */}
            <button
              type="button"
              onClick={() => handleAction("layout")}
              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" />
                <span>Ganti Layout Kertas</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 font-mono font-bold">
                {currentPaper}
              </span>
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {variant === "table" ? (
        <div className={`inline-flex items-center shrink-0 ${className}`}>
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleDropdown}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Menu Print & Dokumen"
          >
            {loadingAction ? (
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
            ) : (
              <Printer className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>Print</span>
            <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      ) : variant === "icon" ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          className={`p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer ${className}`}
          title="Menu Print Dokumen"
        >
          {loadingAction ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
        </button>
      ) : (
        <div className={`inline-flex items-center ${className}`}>
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleDropdown}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {loadingAction ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>Print Dokumen</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {menuPortal}

      {/* Document Print & Preview Interactive Modal */}
      <DocumentPrintPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        order={order}
        settings={settings}
        defaultDocType={previewDocType}
      />

      {/* Paper Layout Preference Modal */}
      <ChangePaperLayoutModal
        isOpen={layoutModalOpen}
        onClose={() => setLayoutModalOpen(false)}
        onLayoutChanged={() => {
          if (onLayoutChange) onLayoutChange();
        }}
      />
    </>
  );
};

