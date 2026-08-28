import React, { useState, useEffect } from "react";
import { Order, StoreSettings } from "../types/index.js";
import {
  generateBillingMessage,
  generateWhatsAppLink,
  getPublicInvoiceUrl,
  formatWhatsAppNumber,
} from "../utils/generateInvoicePDF.js";
import { api } from "../lib/api.js";
import {
  X,
  Send,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  Phone,
  FileText,
  Sparkles,
} from "lucide-react";

interface SendInvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: StoreSettings | null;
}

export const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({
  order,
  isOpen,
  onClose,
  settings,
}) => {
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (order) {
      setWhatsappNumber(order.no_wa || "");
      setRecipientEmail("");
      const generatedMsg = generateBillingMessage(order, settings);
      setMessageText(generatedMsg);
      setAlertInfo(null);
    }
  }, [order, settings]);

  if (!isOpen || !order) return null;

  const publicInvoiceUrl = getPublicInvoiceUrl(order);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Gagal menyalin pesan:", e);
    }
  };

  const handleSend = async () => {
    setAlertInfo(null);

    if (channel === "whatsapp") {
      if (!whatsappNumber.trim()) {
        setAlertInfo({ type: "error", message: "Silakan masukkan nomor WhatsApp tujuan." });
        return;
      }

      const formattedNumber = formatWhatsAppNumber(whatsappNumber);
      const waUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, "_blank");

      setAlertInfo({
        type: "success",
        message: "Tab WhatsApp telah dibuka. Silakan klik tombol kirim di WhatsApp Web/App.",
      });
    } else {
      // Channel: Email
      if (!recipientEmail.trim()) {
        setAlertInfo({ type: "error", message: "Silakan masukkan alamat email penerima." });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail.trim())) {
        setAlertInfo({ type: "error", message: "Format alamat email tidak valid." });
        return;
      }

      try {
        setLoading(true);
        const storeName = settings?.nama_toko || "Jeres Studio";
        const subject = `Tagihan Penjualan ${order.nomor_nota} - ${storeName}`;

        const res = await api.sendInvoiceEmail({
          orderId: order.id,
          recipientEmail: recipientEmail.trim(),
          subject,
          message: messageText,
          publicInvoiceUrl,
        });

        if (res.method === "mailto_fallback" && res.mailtoUrl) {
          window.location.href = res.mailtoUrl;
          setAlertInfo({
            type: "info",
            message: "Aplikasi email default telah dibuka untuk mengirim tagihan ini.",
          });
        } else {
          setAlertInfo({
            type: "success",
            message: res.message || "Email tagihan berhasil terkirim!",
          });
        }
      } catch (err: any) {
        console.error("Gagal kirim email:", err);
        setAlertInfo({
          type: "error",
          message: err.message || "Gagal mengirim email tagihan.",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Kirim Tagihan Penjualan
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {order.nomor_nota}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Kirim invoice & ringkasan tagihan ke pelanggan secara instan
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
        <div className="p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
          {/* Status Alert if any */}
          {alertInfo && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                alertInfo.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : alertInfo.type === "info"
                  ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
              }`}
            >
              {alertInfo.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <span className="text-xs font-medium">{alertInfo.message}</span>
            </div>
          )}

          {/* Channel Selector Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              1. Pilih Saluran Pengiriman:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${
                  channel === "whatsapp"
                    ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/40"
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp (wa.me)</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${
                  channel === "email"
                    ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/40"
                }`}
              >
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Email Tagihan</span>
              </button>
            </div>
          </div>

          {/* Channel Form Inputs & Message Preview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Sisi Kiri: Form Tujuan */}
            <div className="md:col-span-5 space-y-4">
              {channel === "whatsapp" ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nomor WhatsApp Tujuan:
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Otomatis dikonversi ke format internasional 628xxx.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Alamat Email Pelanggan:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="pelanggan@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Mendukung Resend API / Fallback aplikasi email Anda.
                  </p>
                </div>
              )}

              {/* Info Pelanggan & Link */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Pelanggan
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white text-xs">
                    {order.nama_pelanggan}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Link Invoice Shareable
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="text"
                      readOnly
                      value={publicInvoiceUrl}
                      className="w-full text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300"
                    />
                    <a
                      href={publicInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      title="Buka Link Invoice"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Preview Teks Pesan */}
            <div className="md:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Preview Pesan Tagihan (Dapat Diedit):
                </label>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? "Tersalin!" : "Salin Teks"}</span>
                </button>
              </div>

              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={9}
                className="w-full p-3 text-xs font-mono leading-relaxed rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
              channel === "whatsapp"
                ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {channel === "whatsapp" ? "Kirim via WhatsApp" : "Kirim Email Tagihan"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
