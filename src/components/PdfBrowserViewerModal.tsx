import React, { useState, useEffect, useRef } from "react";
import { Printer, ExternalLink, Download, X, FileText, Loader2 } from "lucide-react";

export interface PdfViewerData {
  blobUrl: string;
  filename: string;
  title?: string;
  action?: "open" | "print" | "download" | "blob";
}

const EVENT_NAME = "jeres:open-pdf-browser";

export function openInAppPdfBrowserViewer(data: PdfViewerData): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: data }));
  }
}

export const PdfBrowserViewerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pdfData, setPdfData] = useState<PdfViewerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PdfViewerData>;
      if (customEvent.detail && customEvent.detail.blobUrl) {
        setPdfData(customEvent.detail);
        setIsLoading(true);
        setIsOpen(true);
      }
    };

    window.addEventListener(EVENT_NAME, handleOpenEvent);
    return () => {
      window.removeEventListener(EVENT_NAME, handleOpenEvent);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setPdfData(null);
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        console.warn("Iframe print blocked, trying window.open:", e);
      }
    }
    if (pdfData?.blobUrl) {
      const win = window.open(pdfData.blobUrl, "_blank");
      if (win) {
        setTimeout(() => win.print(), 600);
      }
    }
  };

  const handleOpenNewTab = () => {
    if (pdfData?.blobUrl) {
      window.open(pdfData.blobUrl, "_blank");
    }
  };

  const handleDownload = () => {
    if (!pdfData?.blobUrl) return;
    const a = document.createElement("a");
    a.href = pdfData.blobUrl;
    a.download = pdfData.filename || "Dokumen.pdf";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 300);
  };

  if (!isOpen || !pdfData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[92vh] flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">
                  {pdfData.title || pdfData.filename}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden sm:inline-block">
                  Halaman PDF Browser
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {pdfData.filename}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Cetak dokumen ini langsung ke printer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak (Print)</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Buka PDF di tab baru browser"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Buka di Tab Baru</span>
              <span className="sm:hidden">Tab Baru</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Download file PDF ke komputer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <div className="w-px h-5 bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Tutup penampil PDF"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Iframe Viewer Container */}
        <div className="relative flex-1 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-300 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs">Memuat halaman PDF browser...</p>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={`${pdfData.blobUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={pdfData.title || "PDF Document"}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </div>
  );
};
