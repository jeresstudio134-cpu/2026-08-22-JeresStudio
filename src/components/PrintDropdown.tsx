import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Order, StoreSettings } from "../types/index.js";
import { DocumentType } from "./print/PrintDocumentRenderer.js";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left?: number;
    right?: number;
    isUp: boolean;
  }>({
    top: 0,
    isUp: false,
  });

  // Calculate coordinates & auto-detect dropup vs dropdown
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedMenuHeight = 225;
    const menuWidth = 250;

    const spaceBelow = window.innerHeight - rect.bottom;
    const isUp = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;

    let top = isUp ? rect.top - estimatedMenuHeight - 6 : rect.bottom + 6;
    if (top < 10) top = 10;

    // Align with right edge of trigger button
    let right = window.innerWidth - rect.right;
    if (right < 10) right = 10;
    if (rect.right - menuWidth < 10) {
      // If menu extends beyond left screen edge, position from left
      setMenuPos({
        top,
        left: 10,
        isUp,
      });
    } else {
      setMenuPos({
        top,
        right,
        isUp,
      });
    }
  };

  // Toggle & compute position
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Recalculate on window resize / scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
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
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button Variants */}
      {variant === "table" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition-all border cursor-pointer select-none ${
            isOpen
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-indigo-200 dark:border-indigo-800"
          }`}
          title="Pilih Dokumen Cetak"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${
              isOpen ? (menuPos.isUp ? "rotate-0" : "rotate-180") : ""
            }`}
          />
        </button>
      ) : variant === "compact" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          className="p-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shrink-0 flex items-center gap-1 select-none"
          title="Cetak Dokumen"
        >
          <Printer className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 opacity-70" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs select-none ${
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

      {/* Render via Portal directly to body to avoid ANY overflow-hidden clipping */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuPos.top}px`,
              ...(menuPos.left !== undefined ? { left: `${menuPos.left}px` } : {}),
              ...(menuPos.right !== undefined ? { right: `${menuPos.right}px` } : {}),
              width: "250px",
              zIndex: 99999,
            }}
            className={`rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 focus:outline-none divide-y divide-slate-100 dark:divide-slate-800 transition-all duration-150 animate-in fade-in ${
              menuPos.isUp ? "slide-in-from-bottom-2 origin-bottom-right" : "slide-in-from-top-2 origin-top-right"
            }`}
          >
            {/* Header info */}
            <div className="px-3 py-2 bg-slate-50/80 dark:bg-slate-800/60">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                Pilih Dokumen Cetak
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                Nota: {order.nomor_nota}
              </p>
            </div>

            {/* List options */}
            <div className="py-1">
              {menuItems.map((item) => {
                const isItemDownloading = downloadingType === item.type;

                return (
                  <div
                    key={item.type}
                    className="group flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                    onClick={() => handleOpenPrint(item.type)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {getDocIcon(item.type)}
                      <div className="text-left truncate">
                        <p className="font-semibold leading-snug truncate text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                          {item.label}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono">
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
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 text-[10px] text-slate-400 dark:text-slate-400 flex items-center justify-between">
              <span>Klik: Buka Tab Print</span>
              <span className="flex items-center gap-1 font-mono">
                <Download className="w-2.5 h-2.5" /> Unduh PDF
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
