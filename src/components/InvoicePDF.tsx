import React, { useState } from "react";
import { Order, StoreSettings } from "../types/index.js";
import {
  generateInvoicePDF,
  generateSuratJalanPDF,
  generateTandaTerimaPDF,
  exportInvoiceToXLS,
  exportInvoiceToCSV,
  getUserPaperPreference,
} from "../utils/generateInvoicePDF.js";
import { formatRupiah, formatTanggal, getStatusBadge, getStatusBayarBadge } from "../lib/utils.js";
import { PrintDropdown } from "./PrintDropdown.js";
import { SendInvoiceModal } from "./SendInvoiceModal.js";
import { ChangePaperLayoutModal } from "./ChangePaperLayoutModal.js";
import { ShareTrackingModal } from "./ShareTrackingModal.js";
import {
  Printer,
  Download,
  ExternalLink,
  Loader2,
  FileText,
  X,
  Phone,
  User,
  Calendar,
  Clock,
  CreditCard,
  Building2,
  CheckCircle2,
  Send,
  Sliders,
  ChevronDown,
  FileSpreadsheet,
  Share2,
} from "lucide-react";

interface InvoicePDFButtonProps {
  order: Order;
  settings?: StoreSettings | null;
  variant?: "primary" | "secondary" | "table" | "icon" | "button";
  className?: string;
  onSuccess?: () => void;
}

/**
 * Komponen Dropdown Print (Kledo Style) untuk mencetak Faktur, Surat Jalan, Tanda Terima, XLS, CSV & Ganti Layout.
 */
export const InvoicePDFButton: React.FC<InvoicePDFButtonProps> = ({
  order,
  settings,
  variant = "primary",
  className = "",
  onSuccess,
}) => {
  return (
    <PrintDropdown
      order={order}
      settings={settings}
      variant={variant as any}
      className={className}
      onLayoutChange={onSuccess}
    />
  );
};

interface SendInvoiceButtonProps {
  order: Order;
  settings?: StoreSettings | null;
  className?: string;
}

/**
 * Tombol Reusable untuk Membuka Modal Kirim Tagihan (WhatsApp / Email)
 */
export const SendInvoiceButton: React.FC<SendInvoiceButtonProps> = ({
  order,
  settings,
  className = "",
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-2xs ${className}`}
        title="Kirim Tagihan via WhatsApp / Email"
      >
        <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Kirim Tagihan</span>
      </button>

      <SendInvoiceModal
        order={order}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        settings={settings}
      />
    </>
  );
};

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: StoreSettings | null;
}

/**
 * Modal Pop-up Tampilan Detail Order Lengkap dengan Tombol Print Dropdown (Kledo Style) & Kirim Tagihan.
 */
export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  settings,
}) => {
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  if (!isOpen || !order) return null;

  const statusBadge = getStatusBadge(order.status);
  const bayarBadge = getStatusBayarBadge(order.status_bayar);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
          {/* Header Modal */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Detail Nota {order.nomor_nota}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.bg}`}>
                    {statusBadge.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Tanggal: {formatTanggal(order.tanggal_order, true)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-6 text-xs max-h-[70vh] overflow-y-auto">
            {/* Customer & Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Informasi Pelanggan
                </span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {order.nama_pelanggan}
                </p>
                <p className="text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {order.no_wa}
                </p>
                {order.created_by && (
                  <p className="text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Staff: {order.created_by}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Status Pembayaran & Ambil
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${bayarBadge.bg}`}>
                    {bayarBadge.label}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    via {order.metode_bayar || "Cash"}
                  </span>
                </div>
                {order.tanggal_ambil && (
                  <p className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Target Ambil: {formatTanggal(order.tanggal_ambil, false)}
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-white block">
                Daftar Iteman:
              </span>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {item.nama_item}
                              </p>
                              {/* ⬅ CHANGED: cek hitung_dimensi sebelum menampilkan badge ukuran */}
                              {item.hitung_dimensi && item.panjang && item.lebar ? (
                                <span className="inline-flex items-center gap-0.5 text-[9.5px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                  📐 {item.panjang}{item.dimensi_unit || "m"} × {item.lebar}{item.dimensi_unit || "m"} ({item.jumlah_lembar || 1} lembar)
                                </span>
                              ) : null}
                            </div>
                            {item.catatan_item && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">
                                Catatan: {item.catatan_item}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            {item.qty} {item.satuan}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {formatRupiah(item.harga_satuan)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">
                          Item: {formatRupiah(order.total)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal || order.total)}</span>
              </div>
              {order.diskon > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(order.diskon)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 dark:text-white font-bold text-sm border-t border-slate-200 dark:border-slate-700 pt-2">
                <span>Grand Total:</span>
                <span>{formatRupiah(order.total)}</span>
              </div>
              {order.jumlah_dp > 0 && order.status_bayar !== "lunas" && (
                <>
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                    <span>DP Dibayar:</span>
                    <span>{formatRupiah(order.jumlah_dp)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Sisa Tagihan:</span>
                    <span>{formatRupiah(Math.max(0, order.total - order.jumlah_dp))}</span>
                  </div>
                </>
              )}
            </div>

            {order.catatan && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-300">
                <span className="font-bold block mb-0.5">Catatan Khusus:</span>
                <p>{order.catatan}</p>
              </div>
            )}
          </div>

          {/* Footer Actions: Print Dropdown & Kirim Tagihan */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-start">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* Tombol Share Tracking */}
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors cursor-pointer"
                title="Bagikan link tracking publik ke pelanggan"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Share Tracking</span>
              </button>

              {/* Tombol Kirim Tagihan */}
              <button
                type="button"
                onClick={() => setSendModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors cursor-pointer"
                title="Kirim tagihan ke WhatsApp / Email pelanggan"
              >
                <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Kirim Tagihan</span>
              </button>

              {/* Tombol Dropdown Print (Kledo Style) */}
              <PrintDropdown
                order={order}
                settings={settings}
                variant="primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Share Tracking Link */}
      <ShareTrackingModal
        order={order}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        settings={settings}
      />

      {/* Modal Kirim Tagihan */}
      <SendInvoiceModal
        order={order}
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        settings={settings}
      />
    </>
  );
};
