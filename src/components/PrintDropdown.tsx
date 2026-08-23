import React, { useState, useRef, useEffect } from "react";
import { Order, StoreSettings } from "../types/index.js";
import { DocumentType, DOCUMENT_CONFIGS } from "./print/PrintDocumentRenderer.js";
import { downloadDocPdf } from "../lib/generateInvoicePdf.js";
import {
  Printer,
  ChevronDown,
  FileText,
  Truck,
  Tag,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface PrintDropdownProps {
  order: Order;
  settings: StoreSettings | null;
  variant?: "button" | "compact" | "table";
  className?: string;
  onOpenPrintPage?: (docType: DocumentType, order: Order) => void;
}

export function PrintDropdown({
  order,
  settings,
  variant = "button",
  className = "",
  onOpenPrintPage,
}: PrintDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadingType, setDownloadingType] = useState<DocumentType | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handler buka halaman print terpisah
  const handleOpenPrint = (docType: DocumentType) => {
    setIsOpen(false);
    if (onOpenPrintPage) {
      onOpenPrintPage(docType, order);
      return;
    }

    // Default: Buka route /print/:docType/:orderId di tab baru
    const printUrl = `/print/${docType}/${order.id}`;
    window.open(printUrl, "_blank");
  };

  // Handler download PDF instan via jsPDF + html2canvas
  const handleDownloadPdf = async (e: React.MouseEvent, docType: DocumentType) => {
    e.stopPropagation();
    try {
      setDownloadingType(docType);
      await downloadDocPdf(docType, order, settings);
    } catch (err) {
      console.error("Gagal mendownload PDF:", err);
    } finally {
      setDownloadingType(null);
      setIsOpen(false);
    }
  };

  const getDocIcon = (type: DocumentType) => {
    switch (type) {
      case "surat-jalan":
        return <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "label":
        return <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "rekap-pembayaran":
        return <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />;
      case "nota":
      default:
        return <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
    }
  };

  const menuItems: { type: DocumentType; label: string; paperSize: string }[] = [
    {
      type: "nota",
      label: "Nota / Invoice",
      paperSize: "A6 Landscape",
    },
    {
      type: "surat-jalan",
      label: "Surat Jalan",
      paperSize: "A5 Portrait",
    },
    {
      type: "label",
      label: "Label Pengiriman",
      paperSize: "10 x 15 cm",
    },
    {
      type: "rekap-pembayaran",
      label: "Rekap Pembayaran",
      paperSize: "A6 Landscape",
    },
  ];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button Variants */}
      {variant === "table" ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
            isOpen
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-indigo-200 dark:border-indigo-800"
          }`}
          title="Pilih Dokumen Cetak"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      ) : variant === "compact" ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
          title="Cetak Dokumen"
        >
          <Printer className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 opacity-70" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs ${
            isOpen
              ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
              : "text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800"
          }`}
        >
          <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Cetak</span>
          <ChevronDown
            className={`w-3 h-3 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-white" : ""
            }`}
          />
        </button>
      )}

      {/* Dropdown Menu Popup (Kledo-style) */}
      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-1.5 w-64 origin-top-right rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-800"
          style={{ minWidth: "240px" }}
        >
          {/* Header info */}
          <div className="px-3 py-2 bg-slate-50/80 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Pilih Dokumen Cetak
            </p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              Order: {order.nomor_nota}
            </p>
          </div>

          {/* List options */}
          <div className="py-1">
            {menuItems.map((item) => {
              const isItemDownloading = downloadingType === item.type;

              return (
                <div
                  key={item.type}
                  className="group flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  onClick={() => handleOpenPrint(item.type)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {getDocIcon(item.type)}
                    <div className="text-left truncate">
                      <p className="font-semibold leading-snug truncate">{item.label}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {item.paperSize}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Tab Baru Print / Download PDF */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Quick Download PDF Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDownloadPdf(e, item.type)}
                      disabled={isItemDownloading}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                      title={`Download PDF ${item.label}`}
                    >
                      {isItemDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Open Print Tab Indicator */}
                    <span className="p-1 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>Klik: Buka Tab Print</span>
            <span className="flex items-center gap-1 font-mono">
              <Download className="w-2.5 h-2.5" /> Unduh PDF
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
