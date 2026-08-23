import React, { useState, useEffect, useRef } from "react";
import { Order, StoreSettings } from "../../types/index.js";
import {
  formatRupiah,
  formatTanggalNumeric,
  angkaTerbilang,
} from "../../lib/utils.js";
import {
  Printer,
  ArrowLeft,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  CheckCircle,
} from "lucide-react";

interface PdfInvoicePageProps {
  order: Order;
  settings: StoreSettings | null;
  onBack: () => void;
}

export const PdfInvoicePage: React.FC<PdfInvoicePageProps> = ({
  order,
  settings,
  onBack,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [downloading, setDownloading] = useState<boolean>(false);
  const invoiceSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo({ top: 0, behavior: "instant" });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    setDownloading(true);
    // Standard trigger for native browser print / save as PDF
    setTimeout(() => {
      window.print();
      setDownloading(false);
    }, 200);
  };

  const sisaTagihan = Math.max(0, order.total - (order.jumlah_dp || 0));
  const defaultItems = order.items && order.items.length > 0 ? order.items : [
    {
      nama_item: "Item Cetakan",
      qty: 1,
      satuan: "pcs",
      harga_satuan: order.total,
      subtotal: order.total,
      catatan_item: order.catatan || "",
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-800 text-zinc-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Dynamic @page CSS rule strictly fixed to A4 Portrait with precision margins */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm 10mm 15mm !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          #main-app-wrapper, .pdf-toolbar, .pdf-screen-wrapper {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .pdf-paper-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            transform: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top PDF Reader Toolbar (like Adobe / Edge / Copilot PDF Viewer in Screenshot) */}
      <header className="pdf-toolbar sticky top-0 z-50 bg-[#2b2d30] border-b border-zinc-700 px-4 py-2.5 flex flex-wrap items-center justify-between shadow-md print:hidden">
        {/* Left: Back button & Document info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700/80 hover:bg-zinc-600 active:scale-95 rounded-md text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
            title="Kembali (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <div className="h-5 w-px bg-zinc-600 hidden sm:block" />
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-zinc-300">
              Invoice_{order.nomor_nota.replace(/\//g, "-")}.pdf
            </span>
          </div>
        </div>

        {/* Center: Zoom Controls & Page indicator */}
        <div className="flex items-center gap-1.5 bg-zinc-900/70 border border-zinc-700/80 px-2 py-1 rounded-md text-xs">
          <button
            onClick={() => setZoom((z) => Math.max(50, z - 15))}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono text-zinc-200 text-xs w-12 text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(150, z + 15))}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="h-3.5 w-px bg-zinc-700 mx-1" />
          <button
            onClick={() => setZoom(100)}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white transition"
            title="Reset 100%"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <div className="h-3.5 w-px bg-zinc-700 mx-1" />
          <span className="text-zinc-400 text-[11px] px-1">1 of 1</span>
        </div>

        {/* Right: Actions (Cetak & Download PDF) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-md text-xs font-semibold text-zinc-200 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Simpan PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-md text-xs font-bold text-white shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Invoice</span>
          </button>
        </div>
      </header>

      {/* PDF Viewport / Screen Canvas */}
      <main className="pdf-screen-wrapper flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start bg-[#525659]">
        {/* A4 Paper Sheet (Fixed Layout matching Image 2 perfectly) */}
        <div
          ref={invoiceSheetRef}
          style={{
            transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
            transformOrigin: "top center",
          }}
          className="pdf-paper-sheet w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-800 shadow-2xl rounded-sm p-[16mm] md:p-[20mm] transition-transform duration-150 relative box-border"
        >
          {/* ================= HEADER SECTION ================= */}
          <div className="flex justify-between items-start mb-8">
            {/* Left: Logo */}
            <div className="w-[180px] shrink-0">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.nama_toko || "Jeres Studio Design"}
                  className="max-w-[160px] max-h-[90px] object-contain"
                  loading="eager"
                />
              ) : (
                <div className="flex flex-col">
                  <div className="font-black text-2xl tracking-tighter text-amber-500 leading-none">
                    JERE&apos;S
                  </div>
                  <div className="font-black text-2xl tracking-tight text-pink-500 leading-none">
                    STUDIO
                  </div>
                  <div className="font-black text-2xl tracking-widest text-cyan-500 leading-none">
                    DESIGN
                  </div>
                </div>
              )}
            </div>

            {/* Right: Invoice Title & Meta */}
            <div className="text-right flex flex-col items-end">
              <h1 className="text-3xl md:text-4xl font-bold text-[#1e40af] tracking-tight mb-2">
                Invoice
              </h1>
              <table className="text-xs text-slate-700 border-separate border-spacing-y-0.5 text-right font-sans">
                <tbody>
                  <tr>
                    <td className="pr-4 text-slate-500 font-normal">Nomor</td>
                    <td className="font-medium text-slate-900">{order.nomor_nota}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-slate-500 font-normal">Tanggal</td>
                    <td className="font-medium text-slate-900">
                      {formatTanggalNumeric(order.tanggal_order)}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-slate-500 font-normal">Tgl. Jatuh Tempo</td>
                    <td className="font-medium text-slate-900">
                      {order.tanggal_ambil
                        ? formatTanggalNumeric(order.tanggal_ambil)
                        : formatTanggalNumeric(order.tanggal_order)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= INFO SECTION (2 COLUMNS) ================= */}
          <div className="grid grid-cols-2 gap-12 mb-8">
            {/* Left: Informasi Perusahaan */}
            <div>
              <div className="border-b-2 border-[#1e3a8a] pb-1 mb-2.5">
                <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                  Informasi Perusahaan
                </h3>
              </div>
              <div className="text-xs space-y-1 text-slate-600">
                <p className="font-bold text-[#1e40af] text-xs">
                  {settings?.nama_toko || "Jeres Studio"}
                </p>
                <p className="leading-snug">
                  {settings?.alamat || "Jl. Mampang Prapatan 19C, Jakarta Selatan 12790"}
                </p>
                <p>Telp: {settings?.no_wa || "089685640976"}</p>
                <p>Email: {settings?.email || "jeresstudio134@gmail.com"}</p>
              </div>
            </div>

            {/* Right: Tagihan Kepada */}
            <div>
              <div className="border-b-2 border-[#1e3a8a] pb-1 mb-2.5">
                <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                  Tagihan Kepada
                </h3>
              </div>
              <div className="text-xs space-y-1 text-slate-600">
                <p className="font-bold text-[#1e40af] text-xs uppercase">
                  {order.nama_pelanggan}
                </p>
                {order.no_wa && <p>Telp / WA: {order.no_wa}</p>}
                <p className="text-[11px] text-slate-500">
                  Metode Bayar: {order.metode_bayar}
                </p>
              </div>
            </div>
          </div>

          {/* ================= ITEMS TABLE ================= */}
          <div className="mb-6 overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#2d3a4b] text-white">
                  <th className="py-2.5 px-3 font-semibold text-xs w-[32%]">Produk</th>
                  <th className="py-2.5 px-3 font-semibold text-xs w-[24%]">Deskripsi</th>
                  <th className="py-2.5 px-3 font-semibold text-xs text-center w-[10%]">Kuantitas</th>
                  <th className="py-2.5 px-3 font-semibold text-xs text-right w-[12%]">Harga</th>
                  <th className="py-2.5 px-3 font-semibold text-xs text-center w-[8%]">Diskon</th>
                  <th className="py-2.5 px-3 font-semibold text-xs text-center w-[6%]">Pajak</th>
                  <th className="py-2.5 px-3 font-semibold text-xs text-right w-[12%]">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defaultItems.map((item, idx) => {
                  const isEven = idx % 2 === 1;
                  return (
                    <tr
                      key={idx}
                      className={isEven ? "bg-slate-100/70" : "bg-white"}
                    >
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.nama_item}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {item.catatan_item || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 font-medium">
                        {item.qty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {Math.round(item.harga_satuan).toLocaleString("id-ID")}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {order.diskon > 0 && idx === 0
                          ? `${Math.round((order.diskon / order.subtotal) * 100)}%`
                          : "0%"}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                        {Math.round(item.subtotal).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ================= SUMMARY SECTION ================= */}
          <div className="flex justify-end mb-8">
            <div className="w-[260px] text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">Subtotal</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatRupiah(order.subtotal)}
                </span>
              </div>
              {order.diskon > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span className="font-semibold">Diskon</span>
                  <span className="font-bold font-mono">
                    - {formatRupiah(order.diskon)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-300">
                <span className="font-bold text-slate-900 text-sm">Total</span>
                <span className="font-bold text-slate-900 text-sm underline decoration-slate-900 font-mono">
                  {formatRupiah(order.total)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700 pt-0.5">
                <span className="font-semibold">Sisa Tagihan</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatRupiah(sisaTagihan)}
                </span>
              </div>
            </div>
          </div>

          {/* ================= TERBILANG SECTION ================= */}
          <div className="mb-14">
            <p className="text-xs text-slate-600 font-normal">Terbilang</p>
            <p className="text-xs font-semibold text-slate-900 tracking-wide mt-0.5">
              {angkaTerbilang(order.total)}
            </p>
          </div>

          {/* ================= FOOTER / TANDA TANGAN ================= */}
          <div className="flex justify-end pr-8">
            <div className="text-center w-[180px]">
              <p className="text-xs text-slate-700 mb-14">Dengan Hormat,</p>
              <p className="text-xs font-bold text-slate-900 underline decoration-slate-900">
                {settings?.nama_toko || "Jeres Studio"}
              </p>
              <p className="text-[11px] text-slate-500">Toko</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
