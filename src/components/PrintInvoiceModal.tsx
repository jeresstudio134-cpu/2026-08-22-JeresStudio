import React, { useRef, useEffect } from "react";
import { Order, StoreSettings } from "../types/index.js";
import { formatRupiah, formatTanggal, getStatusBayarBadge } from "../lib/utils.js";
import { Printer, X, Phone, MapPin } from "lucide-react";

interface PrintInvoiceModalProps {
  order: Order | null;
  settings: StoreSettings | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  order,
  settings,
  isOpen = true,
  onClose,
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (order && isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [order, isOpen, onClose]);

  if (!order || isOpen === false) return null;

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error("Print error:", err);
    }
  };

  const statusBayar = getStatusBayarBadge(order.status_bayar);
  const sisaBayar = Math.max(0, order.total - (order.jumlah_dp || 0));

  return (
    <div
      onClick={onClose}
      className="print-modal-wrapper fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      {/* Container Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="print-modal-dialog relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-6 print:border-none print:shadow-none print:m-0 print:max-w-none print:w-full"
      >
        {/* Action Header - Hidden on Print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Nota Pesanan #{order.nomor_nota}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Atur ukuran & orientasi (Portrait/Landscape) langsung pada pengaturan print
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Nota
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div
          ref={printContentRef}
          id="printable-invoice"
          className="print-a4-sheet p-6 md:p-8 bg-white text-zinc-900 font-sans text-xs print:p-0 print:text-black print:text-[11px]"
        >
          {/* Header Store & Invoice Meta */}
          <div className="print-header-section flex justify-between items-start border-b-2 border-zinc-800 pb-3 mb-3 print-avoid-break">
            <div className="flex items-start gap-3.5">
              {/* Logo Toko */}
              {settings?.logo_url ? (
                <div className="print-logo-box w-16 h-16 shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                  <img
                    src={settings.logo_url}
                    alt={settings.nama_toko || "Logo Toko"}
                    className="w-full h-full object-contain max-h-16 max-w-16"
                    loading="eager"
                  />
                </div>
              ) : (
                <div className="print-logo-box w-14 h-14 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg print:border print:border-black print:text-black print:bg-transparent">
                  JS
                </div>
              )}

              {/* Info Toko */}
              <div className="space-y-0.5">
                <h1 className="text-base font-bold tracking-tight text-zinc-900 uppercase">
                  {settings?.nama_toko || "JERES STUDIO"}
                </h1>
                <p className="text-[11px] text-zinc-600 font-medium">
                  {settings?.slogan || "Percetakan Digital, Stiker, DTF & Sablon Jersey"}
                </p>
                <div className="text-[10px] text-zinc-600 pt-0.5 space-y-0.5">
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-400 print:hidden shrink-0" />
                    <span>{settings?.alamat || "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif"}</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-400 print:hidden shrink-0" />
                    <span>WhatsApp: {settings?.no_wa || "0812-3456-7890"}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right space-y-1 shrink-0">
              <div className="inline-block px-2.5 py-0.5 bg-zinc-900 text-white font-mono font-bold text-[11px] tracking-wider rounded print:border print:border-black print:text-black print:bg-transparent">
                NOTA PESANAN
              </div>
              <p className="font-mono font-bold text-zinc-900 text-sm">{order.nomor_nota}</p>
              <p className="text-zinc-600 text-[11px]">
                Tanggal: <span className="font-semibold text-zinc-800">{formatTanggal(order.tanggal_order, true)}</span>
              </p>
              {order.tanggal_ambil && (
                <p className="text-zinc-600 text-[11px]">
                  Deadline/Ambil: <span className="font-semibold text-zinc-800">{formatTanggal(order.tanggal_ambil)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Customer Info & Status Bayar */}
          <div className="print-customer-box grid grid-cols-2 gap-3 p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 mb-3 print:bg-transparent print:border-zinc-400 print:p-2 print-avoid-break">
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Pemesan:</span>
              <p className="text-sm font-bold text-zinc-900">{order.nama_pelanggan}</p>
              <p className="text-zinc-600 text-[11px]">No. WhatsApp: {order.no_wa}</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Status Pembayaran:</span>
              <div className="mt-0.5 flex items-center justify-end gap-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${statusBayar.bg}`}>
                  {statusBayar.label.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">Metode: {order.metode_bayar}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="print-table w-full text-left border-collapse mb-3 print-avoid-break">
            <thead>
              <tr className="border-y-2 border-zinc-800 text-[10px] uppercase font-bold text-zinc-700 bg-zinc-100 print:bg-transparent">
                <th className="py-1.5 px-2 w-8 text-center">No</th>
                <th className="py-1.5 px-2">Item Cetakan & Spesifikasi</th>
                <th className="py-1.5 px-2 text-center w-16">Qty</th>
                <th className="py-1.5 px-2 text-right w-24">Harga Satuan</th>
                <th className="py-1.5 px-2 text-right w-24">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <tr key={idx} className="text-zinc-800">
                    <td className="py-1.5 px-2 text-center text-zinc-500 font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-2">
                      <p className="font-semibold text-zinc-900 text-xs">{item.nama_item}</p>
                      {item.catatan_item && (
                        <p className="text-[10px] text-zinc-500 italic">{item.catatan_item}</p>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center font-medium">
                      {item.qty} <span className="text-zinc-500 text-[10px]">{item.satuan}</span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(item.harga_satuan)}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-zinc-400">
                    Tidak ada rincian item
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Summary & Calculations */}
          <div className="print-summary-box grid grid-cols-2 gap-4 border-t border-zinc-300 pt-2.5 mb-3 print-avoid-break">
            <div className="space-y-1.5">
              {order.catatan && (
                <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[10px] text-amber-900 print:bg-transparent print:border-zinc-300">
                  <span className="font-bold">Catatan Khusus:</span>
                  <p className="whitespace-pre-line mt-0.5">{order.catatan}</p>
                </div>
              )}
              <div className="text-[9px] text-zinc-500 space-y-0.5">
                <p className="font-bold text-zinc-700">Info Pembayaran / Transfer Bank:</p>
                <p className="whitespace-pre-line leading-relaxed font-mono">{settings?.rekening_bank}</p>
              </div>
            </div>

            <div className="space-y-1 text-right font-mono text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {order.diskon > 0 && (
                <div className="flex justify-between text-rose-600 font-medium text-[11px]">
                  <span>Diskon:</span>
                  <span>- {formatRupiah(order.diskon)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-950 font-bold text-sm border-t border-zinc-800 pt-1">
                <span>Grand Total:</span>
                <span>{formatRupiah(order.total)}</span>
              </div>
              {order.status_bayar === "dp" && (
                <>
                  <div className="flex justify-between text-indigo-700 font-medium text-xs pt-0.5">
                    <span>Uang Muka (DP):</span>
                    <span>{formatRupiah(order.jumlah_dp)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 font-bold text-xs bg-amber-50 px-1.5 py-0.5 rounded">
                    <span>Sisa Pelunasan:</span>
                    <span>{formatRupiah(sisaBayar)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Terms & Signatures */}
          <div className="print-sig-container border-t-2 border-zinc-800 pt-2.5 print-avoid-break">
            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
              <div>
                <p className="print-sig-gap text-zinc-500 mb-6 text-[11px]">Hormat Kami,</p>
                <p className="font-bold text-zinc-800 border-t border-zinc-300 pt-0.5 inline-block px-4 text-xs">
                  {order.created_by || "Kasir Jeres"}
                </p>
              </div>
              <div className="text-zinc-400 flex items-center justify-center">
                <div className="text-[9px] text-zinc-500 italic px-2">
                  Terima kasih atas kepercayaan Anda mencetak di Jeres Studio!
                </div>
              </div>
              <div>
                <p className="print-sig-gap text-zinc-500 mb-6 text-[11px]">Penerima / Pelanggan,</p>
                <p className="font-bold text-zinc-800 border-t border-zinc-300 pt-0.5 inline-block px-4 text-xs">
                  {order.nama_pelanggan}
                </p>
              </div>
            </div>

            <div className="print-terms-box text-[8.5px] text-zinc-400 leading-tight">
              <span className="font-semibold text-zinc-500">Syarat & Ketentuan: </span>
              {settings?.catatan_nota ||
                "1. Barang yang sudah dicetak sesuai file yang disetujui tidak dapat dibatalkan. 2. Pelunasan dilakukan saat pengambilan barang. 3. File desain pesanan disimpan maksimal 30 hari."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
