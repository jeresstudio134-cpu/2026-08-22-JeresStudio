import React, { useState, useRef, useEffect } from "react";
import { Order, StoreSettings } from "../types/index.js";
import {
  generateInvoicePDF,
  generateSuratJalanPDF,
  generateTandaTerimaPDF,
  getUserPaperPreference,
  setUserPaperPreference,
  PaperFormat,
} from "../utils/generateInvoicePDF.js";
import { formatRupiah, formatTanggal, getStatusBadge, getStatusBayarBadge, terbilang } from "../lib/utils.js";
import { SendInvoiceModal } from "./SendInvoiceModal.js";
import {
  Printer,
  Download,
  X,
  FileText,
  Truck,
  CheckSquare,
  Send,
  Sliders,
  Maximize2,
  Minimize2,
  Loader2,
  CheckCircle2,
  MapPin,
  Phone,
  Building2,
  ExternalLink,
} from "lucide-react";

export type PreviewDocType = "faktur" | "surat_jalan" | "tanda_terima";

interface DocumentPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  settings?: StoreSettings | null;
  defaultDocType?: PreviewDocType;
}

export const DocumentPrintPreviewModal: React.FC<DocumentPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  settings,
  defaultDocType = "faktur",
}) => {
  const [docType, setDocType] = useState<PreviewDocType>(defaultDocType);
  const [paperFormat, setPaperFormat] = useState<PaperFormat>(getUserPaperPreference());
  const [isDownloading, setIsDownloading] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync docType if prop changes
  useEffect(() => {
    if (isOpen) {
      setDocType(defaultDocType);
      setPaperFormat(getUserPaperPreference());
    }
  }, [isOpen, defaultDocType]);

  if (!isOpen || !order) return null;

  const storeName = settings?.nama_toko || "Jeres Studio";
  const storePhone = settings?.no_wa || "0812-3456-7890";
  const storeAddress = settings?.alamat || "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif";
  const storeBank = settings?.informasi_rekening || "BCA 1234-567-890 a/n Jeres Studio";
  const statusBadge = getStatusBadge(order.status);
  const bayarBadge = getStatusBayarBadge(order.status_bayar);
  const sisaTagihan = Math.max(0, order.total - (order.status_bayar === "lunas" ? order.total : (order.jumlah_dp || 0)));

  // Direct print via hidden printable iframe
  const handlePrint = () => {
    const printableContent = printAreaRef.current;
    if (!printableContent) {
      window.print();
      return;
    }

    // Create a dedicated hidden iframe for clean, reliable printing
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const pri = iframe.contentWindow || iframe.contentDocument;
    if (!pri) {
      window.print();
      return;
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Determine page css based on format
    let pageCss = "@page { size: A4 portrait; margin: 10mm; }";
    if (paperFormat === "A5") {
      pageCss = "@page { size: A5 landscape; margin: 8mm; }";
    } else if (paperFormat === "thermal80") {
      pageCss = "@page { size: 80mm auto; margin: 3mm; }";
    } else if (paperFormat === "thermal58") {
      pageCss = "@page { size: 58mm auto; margin: 2mm; }";
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docType.toUpperCase()} - ${order.nomor_nota}</title>
          <style>
            ${pageCss}
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a; 
              background: #fff;
              padding: ${paperFormat.startsWith("thermal") ? "4px" : "16px"};
              font-size: ${paperFormat.startsWith("thermal") ? "11px" : "12px"};
              line-height: 1.4;
            }
            .no-print { display: none !important; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            th, td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: inherit; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
            .signature-box { display: flex; justify-content: space-between; margin-top: 30px; }
            .signature-col { text-align: center; width: 45%; }
            .signature-line { margin-top: 50px; border-top: 1px solid #94a3b8; padding-top: 4px; }
          </style>
        </head>
        <body>
          ${printableContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn("Iframe print error fallback:", err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 400);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      if (docType === "faktur") {
        await generateInvoicePDF(order, settings, { action: "download", paperFormat });
      } else if (docType === "surat_jalan") {
        await generateSuratJalanPDF(order, settings, { action: "download", paperFormat });
      } else if (docType === "tanda_terima") {
        await generateTandaTerimaPDF(order, settings, { action: "download", paperFormat });
      }
    } catch (err: any) {
      console.error("Gagal unduh PDF:", err);
      alert(`Gagal download PDF: ${err?.message || "Terjadi kesalahan"}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePaperChange = (fmt: PaperFormat) => {
    setPaperFormat(fmt);
    setUserPaperPreference(fmt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Action Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Title & Document Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Preview & Cetak Dokumen
                </h3>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  {order.nomor_nota}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {order.nama_pelanggan} ({order.no_wa})
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Unduh file PDF resmi ke komputer/HP"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>Download PDF</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
              title="Cetak langsung ke Printer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>

            {/* Send WhatsApp */}
            <button
              type="button"
              onClick={() => setSendModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Kirim ke WhatsApp Pelanggan"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader: Document Tabs & Paper Format Picker */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Tab Selection */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setDocType("faktur")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                docType === "faktur"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Faktur Penjualan</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType("surat_jalan")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                docType === "surat_jalan"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Surat Jalan</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType("tanda_terima")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                docType === "tanda_terima"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tanda Terima</span>
            </button>
          </div>

          {/* Paper Size Picker */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-indigo-500" />
              <span>Format Kertas:</span>
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              {(["A4", "A5", "thermal80", "thermal58"] as PaperFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handlePaperChange(fmt)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                    paperFormat === fmt
                      ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Document Preview Canvas Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-200/60 dark:bg-slate-950/70 flex justify-center">
          <div
            ref={printAreaRef}
            className={`bg-white text-slate-900 shadow-xl border border-slate-300 rounded-sm p-6 sm:p-8 transition-all my-auto ${
              paperFormat === "A4"
                ? "w-full max-w-[720px] min-h-[900px]"
                : paperFormat === "A5"
                ? "w-full max-w-[620px] min-h-[460px]"
                : paperFormat === "thermal80"
                ? "w-full max-w-[340px] p-4 text-[11px]"
                : "w-full max-w-[280px] p-3 text-[10px]"
            }`}
          >
            {/* === DOKUMEN 1: FAKTUR PENJUALAN === */}
            {docType === "faktur" && (
              <div className="space-y-4">
                {/* Header Kop Surat */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 gap-4">
                  <div className="flex items-start gap-3">
                    {settings?.logo_url ? (
                      <img
                        src={settings.logo_url}
                        alt="Logo"
                        className="w-12 h-12 object-contain rounded shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-base shrink-0">
                        JS
                      </div>
                    )}
                    <div>
                      <h2 className="font-black text-slate-900 text-base uppercase tracking-tight">
                        {storeName}
                      </h2>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {settings?.slogan || "Percetakan Digital, Stiker, DTF & Sablon Jersey"}
                      </p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">{storeAddress}</p>
                      <p className="text-[10.5px] text-slate-500 font-mono">WhatsApp: {storePhone}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block bg-slate-900 text-white text-[10px] font-bold font-mono px-2.5 py-0.5 rounded uppercase tracking-wider">
                      FAKTUR PENJUALAN
                    </span>
                    <p className="font-mono font-bold text-slate-900 text-sm mt-1">
                      {order.nomor_nota}
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      Tgl: {formatTanggal(order.tanggal_order, true)}
                    </p>
                    {order.tanggal_ambil && (
                      <p className="text-[10.5px] text-amber-700 font-semibold">
                        Ambil: {formatTanggal(order.tanggal_ambil)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pelanggan & Status Bayar Grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Kepada Yth:
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{order.nama_pelanggan}</p>
                    <p className="font-mono text-slate-600">{order.no_wa}</p>
                    {order.created_by && (
                      <p className="text-[10.5px] text-slate-500">Petugas: {order.created_by}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Status Transaksi:
                    </span>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${bayarBadge.bg}`}>
                        {bayarBadge.label}
                      </span>
                      <span className="text-slate-600">via {order.metode_bayar || "Cash"}</span>
                    </div>
                    {order.status_bayar === "dp" && (
                      <p className="text-[11px] font-mono text-slate-600 font-semibold mt-0.5">
                        DP: {formatRupiah(order.jumlah_dp || 0)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Table Items */}
                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 text-[10.5px] font-bold text-slate-700 uppercase">
                      <tr>
                        <th className="py-2 px-2.5 w-8 text-center border-r border-slate-300">No</th>
                        <th className="py-2 px-2.5 border-r border-slate-300">Deskripsi Item Cetak</th>
                        <th className="py-2 px-2.5 w-16 text-center border-r border-slate-300">Qty</th>
                        <th className="py-2 px-2.5 w-24 text-right border-r border-slate-300">Harga</th>
                        <th className="py-2 px-2.5 w-28 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-2.5 text-center font-mono text-slate-500 border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2.5 border-r border-slate-200">
                              <p className="font-semibold text-slate-900">{it.nama_item}</p>
                              {it.panjang && it.lebar && (
                                <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                                  📐 {it.panjang}{it.dimensi_unit || "m"} × {it.lebar}{it.dimensi_unit || "m"} ({it.jumlah_lembar || 1} lembar)
                                </p>
                              )}
                              {it.catatan_item && (
                                <p className="text-[10px] text-slate-500 italic mt-0.5">
                                  {it.catatan_item}
                                </p>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                              {it.qty} {it.satuan || "pcs"}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono border-r border-slate-200">
                              {formatRupiah(it.harga_satuan)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(it.subtotal)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            Tidak ada item rincian
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Rekening & Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  {/* Left: Info Pembayaran */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                      Pembayaran / Transfer Bank:
                    </span>
                    <p className="font-mono text-slate-800 text-[11px] whitespace-pre-line font-medium">
                      {storeBank}
                    </p>
                    {order.catatan && (
                      <div className="pt-2 border-t border-slate-200 mt-2">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Catatan Order:
                        </span>
                        <p className="text-slate-700 italic text-[11px]">{order.catatan}</p>
                      </div>
                    )}
                  </div>

                  {/* Right: Summary Total */}
                  <div className="space-y-1.5 text-right">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(order.subtotal || order.total)}
                      </span>
                    </div>

                    {order.diskon > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Diskon:</span>
                        <span className="font-mono font-bold">-{formatRupiah(order.diskon)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-2 bg-indigo-50 border border-indigo-200 rounded font-bold text-indigo-900 text-sm">
                      <span>TOTAL BAYAR:</span>
                      <span className="font-mono text-base">{formatRupiah(order.total)}</span>
                    </div>

                    {order.jumlah_dp > 0 && order.status_bayar !== "lunas" && (
                      <>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>Uang Muka (DP):</span>
                          <span className="font-mono">{formatRupiah(order.jumlah_dp)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-rose-600 text-xs">
                          <span>Sisa Tagihan:</span>
                          <span className="font-mono">{formatRupiah(sisaTagihan)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Terbilang */}
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="font-bold text-slate-700">Terbilang: </span>
                  <span className="italic font-medium text-slate-900">{terbilang(order.total)}</span>
                </div>

                {/* Tanda Tangan */}
                <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs text-slate-600">
                  <div>
                    <p>Tanda Terima / Pelanggan,</p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                      ( {order.nama_pelanggan} )
                    </p>
                  </div>
                  <div>
                    <p>Hormat Kami,</p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                      ( {storeName} )
                    </p>
                  </div>
                </div>

                {/* Footer Note */}
                <p className="text-center text-[9.5px] text-slate-400 pt-2 border-t border-slate-100">
                  Dokumen resmi {storeName} • Dicetak secara otomatis
                </p>
              </div>
            )}

            {/* === DOKUMEN 2: SURAT JALAN === */}
            {docType === "surat_jalan" && (
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 gap-4">
                  <div>
                    <h2 className="font-black text-slate-900 text-base uppercase tracking-tight">
                      {storeName}
                    </h2>
                    <p className="text-[10.5px] text-slate-500">{storeAddress}</p>
                    <p className="text-[10.5px] text-slate-500 font-mono">Telp/WA: {storePhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-slate-900 text-white text-[10px] font-bold font-mono px-2.5 py-0.5 rounded uppercase tracking-wider">
                      SURAT JALAN
                    </span>
                    <p className="font-mono font-bold text-slate-900 text-sm mt-1">
                      SJ-{order.nomor_nota}
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      Tgl: {formatTanggal(order.tanggal_order, true)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Penerima:
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{order.nama_pelanggan}</p>
                    <p className="font-mono text-slate-600">{order.no_wa}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Ref Invoice:
                    </span>
                    <p className="font-mono font-bold text-slate-900">{order.nomor_nota}</p>
                    <p className="text-[10.5px] text-slate-500">Pengiriman Barang Cetak</p>
                  </div>
                </div>

                {/* Surat Jalan Table (Tanpa Harga) */}
                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 text-[10.5px] font-bold text-slate-700 uppercase">
                      <tr>
                        <th className="py-2 px-2.5 w-8 text-center border-r border-slate-300">No</th>
                        <th className="py-2 px-2.5 border-r border-slate-300">Nama Barang / Item Cetakan</th>
                        <th className="py-2 px-2.5 w-24 text-center border-r border-slate-300">Jumlah/Qty</th>
                        <th className="py-2 px-2.5 w-36 text-center">Status / Kondisi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2.5 border-r border-slate-200">
                              <p className="font-semibold text-slate-900">{it.nama_item}</p>
                              {it.catatan_item && (
                                <p className="text-[10px] text-slate-500 italic">{it.catatan_item}</p>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-bold border-r border-slate-200">
                              {it.qty} {it.satuan || "pcs"}
                            </td>
                            <td className="py-2 px-2.5 text-center text-emerald-700 font-semibold text-[11px]">
                              ✓ Baik & Lengkap
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            Tidak ada item rincian
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 3 Tanda Tangan: Pengirim, Kurir, Penerima */}
                <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs text-slate-600">
                  <div>
                    <p>Pengirim (Toko),</p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                      ( {storeName} )
                    </p>
                  </div>
                  <div>
                    <p>Kurir / Driver,</p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                      ( ........................ )
                    </p>
                  </div>
                  <div>
                    <p>Penerima Barang,</p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                      ( {order.nama_pelanggan} )
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* === DOKUMEN 3: TANDA TERIMA DOKUMEN === */}
            {docType === "tanda_terima" && (
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 gap-4">
                  <div>
                    <h2 className="font-black text-slate-900 text-base uppercase tracking-tight">
                      {storeName}
                    </h2>
                    <p className="text-[10.5px] text-slate-500">{storeAddress}</p>
                    <p className="text-[10.5px] text-slate-500 font-mono">Telp/WA: {storePhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-slate-900 text-white text-[10px] font-bold font-mono px-2.5 py-0.5 rounded uppercase tracking-wider">
                      TANDA TERIMA
                    </span>
                    <p className="font-mono font-bold text-slate-900 text-sm mt-1">
                      TT-{order.nomor_nota}
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      Tgl: {formatTanggal(order.tanggal_order, true)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <p className="text-slate-700">
                    Telah diterima dengan baik dokumen / hasil cetakan dari:{" "}
                    <strong className="text-slate-900">{storeName}</strong>
                  </p>
                  <p className="text-slate-700">
                    Oleh Pelanggan / Penerima:{" "}
                    <strong className="text-slate-900">
                      {order.nama_pelanggan} ({order.no_wa})
                    </strong>
                  </p>
                </div>

                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 text-[10.5px] font-bold text-slate-700 uppercase">
                      <tr>
                        <th className="py-2 px-2.5 w-8 text-center border-r border-slate-300">No</th>
                        <th className="py-2 px-2.5 border-r border-slate-300">Nama Dokumen / Barang Diserahkan</th>
                        <th className="py-2 px-2.5 w-24 text-center border-r border-slate-300">Qty</th>
                        <th className="py-2 px-2.5 w-32 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2.5 font-semibold text-slate-900 border-r border-slate-200">
                              {it.nama_item}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                              {it.qty} {it.satuan || "pcs"}
                            </td>
                            <td className="py-2 px-2.5 text-center text-slate-700 text-[11px]">
                              Diterima Lengkap
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            Tidak ada item
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs text-slate-600">
                  <div>
                    <p>Yang Menyerahkan,</p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                      ( {storeName} )
                    </p>
                  </div>
                  <div>
                    <p>Yang Menerima,</p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                      ( {order.nama_pelanggan} )
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            Format aktif: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{paperFormat.toUpperCase()}</strong> • Siap cetak ke printer fisik maupun download PDF
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Send WhatsApp Modal */}
      <SendInvoiceModal
        order={order}
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        settings={settings}
      />
    </div>
  );
};
