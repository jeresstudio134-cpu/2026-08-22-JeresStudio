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
  Tag,
  Stamp,
  Receipt,
  FileCheck,
  File,
  Loader2,
  Eye,
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
  const [selectedDocType, setSelectedDocType] = useState<PreviewDocType>("faktur");
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
      const menuWidth = 230;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Prefer aligning with right edge of button if close to right edge of viewport
      let leftPos = rect.right - menuWidth;
      if (leftPos < 12) {
        leftPos = Math.max(12, rect.left);
      }
      if (leftPos + menuWidth > window.innerWidth - 12) {
        leftPos = window.innerWidth - menuWidth - 12;
      }

      // Determine top or bottom alignment based on available vertical space
      let topPos: number;
      if (spaceBelow < 320 && spaceAbove > spaceBelow) {
        // Position above the button
        topPos = Math.max(12, rect.top - 310);
      } else {
        // Position below the button
        topPos = Math.min(window.innerHeight - 320, rect.bottom + 4);
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
      setIsOpen(false);
      if (actionType === "preview") {
        setSelectedDocType("faktur");
        setPreviewModalOpen(true);
      } else if (actionType === "faktur") {
        setSelectedDocType("faktur");
        setPreviewModalOpen(true);
      } else if (actionType === "surat_jalan") {
        setSelectedDocType("surat_jalan");
        setPreviewModalOpen(true);
      } else if (actionType === "tanda_terima") {
        setSelectedDocType("tanda_terima");
        setPreviewModalOpen(true);
      } else if (actionType === "xls") {
        setLoadingAction("xls");
        exportInvoiceToXLS(order, settings);
      } else if (actionType === "csv") {
        setLoadingAction("csv");
        exportInvoiceToCSV(order, settings);
      } else if (actionType === "layout") {
        setLayoutModalOpen(true);
      }
    } catch (err: any) {
      console.error(`Gagal memproses aksi ${actionType}:`, err);
      alert(`Gagal: ${err?.message || "Terjadi kesalahan saat memproses dokumen."}`);
    } finally {
      setLoadingAction(null);
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
            className="w-56 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1 overflow-y-auto animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Section 1: Dokumen Utama */}
            <div className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Dokumen Cetak
            </div>

            <button
              type="button"
              onClick={() => handleAction("preview")}
              className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center justify-between transition-colors cursor-pointer rounded-lg mx-auto"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Preview & Cetak</span>
              </div>
              <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded">
                Live
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAction("faktur")}
              className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Faktur Penjualan</span>
              </div>
              {loadingAction === "faktur" && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleAction("surat_jalan")}
              className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Surat Jalan</span>
              </div>
              {loadingAction === "surat_jalan" && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleAction("tanda_terima")}
              className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Tanda Terima Dokumen</span>
              </div>
              {loadingAction === "tanda_terima" && <Loader2 className="w-3 h-3 animate-spin text-sky-600" />}
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            {/* Section 2: Export Data */}
            <div className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Export Data
            </div>

            <button
              type="button"
              onClick={() => handleAction("xls")}
              className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-between transition-colors cursor-pointer"
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
              className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Download CSV</span>
              </div>
              {loadingAction === "csv" && <Loader2 className="w-3 h-3 animate-spin text-amber-600" />}
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            {/* Section 3: Konfigurasi Layout */}
            <button
              type="button"
              onClick={() => handleAction("layout")}
              className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" />
                <span>Ganti Layout</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 font-mono font-bold">
                {currentPaper}
              </span>
            </button>
          </div>,
          document.body
        )
      : null;

  if (variant === "table") {
    return (
      <>
        <div className={`inline-flex items-center shrink-0 ${className}`}>
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleDropdown}
            className="inline-flex items-center gap-1 px-1.5 py-1 text-[10.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-md border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shrink-0"
            title="Menu Print & Dokumen"
          >
            {loadingAction ? (
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
            ) : (
              <Printer className="w-3 h-3" />
            )}
            <span>Print</span>
            <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        {menuPortal}
        <ChangePaperLayoutModal
          isOpen={layoutModalOpen}
          onClose={() => setLayoutModalOpen(false)}
          onLayoutChanged={() => {
            if (onLayoutChange) onLayoutChange();
          }}
        />
        <DocumentPrintPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          order={order}
          settings={settings}
          defaultDocType={selectedDocType}
        />
      </>
    );
  }

  if (variant === "icon") {
    return (
      <>
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
        {menuPortal}
        <ChangePaperLayoutModal
          isOpen={layoutModalOpen}
          onClose={() => setLayoutModalOpen(false)}
          onLayoutChanged={() => {
            if (onLayoutChange) onLayoutChange();
          }}
        />
        <DocumentPrintPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          order={order}
          settings={settings}
          defaultDocType={selectedDocType}
        />
      </>
    );
  }

  // Variant: primary / button
  return (
    <>
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
          <span>Print</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {menuPortal}
      <ChangePaperLayoutModal
        isOpen={layoutModalOpen}
        onClose={() => setLayoutModalOpen(false)}
        onLayoutChanged={() => {
          if (onLayoutChange) onLayoutChange();
        }}
      />
      <DocumentPrintPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        order={order}
        settings={settings}
        defaultDocType={selectedDocType}
      />
    </>
  );
};
