import React, { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Link as LinkIcon,
  ShieldCheck,
  Send
} from "lucide-react";
import { Order, StoreSettings } from "../types";
import { api } from "../lib/api";
import { createWALink, formatTanggal } from "../lib/utils";

interface ShareTrackingModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: StoreSettings | null;
}

export const ShareTrackingModal: React.FC<ShareTrackingModalProps> = ({
  order,
  isOpen,
  onClose,
  settings,
}) => {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && order) {
      loadShareLink();
    }
  }, [isOpen, order?.id]);

  const loadShareLink = async () => {
    if (!order) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.generateShareLink(order.id);
      // If res.share_url contains window location origin, ensure it matches current window host if in preview
      const fullUrl = res.share_url.startsWith("http")
        ? res.share_url
        : `${window.location.origin}/track/${res.share_token}`;
      setShareUrl(fullUrl);
      setExpiresAt(res.expires_at || null);
    } catch (err: any) {
      console.error("Gagal generate share tracking link:", err);
      // Fallback
      if (order.share_token) {
        setShareUrl(`${window.location.origin}/track/${order.share_token}`);
      } else {
        setError(err.message || "Gagal membuat link tracking.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const storeName = settings?.nama_toko || "Jeres Studio";
  const waText = `Halo Kak *${order.nama_pelanggan}*, berikut link tracking live untuk memantau status & progres pengerjaan pesanan Anda (Nota: *${order.nomor_nota}*):\n\n🔗 ${shareUrl}\n\nTerima kasih telah mempercayakan cetakan Anda kepada *${storeName}*!`;
  const waLink = createWALink(order.no_wa, waText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Bagikan Tracking Order
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Publik
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Nota: {order.nomor_nota} &bull; {order.nama_pelanggan}
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

        {/* Body */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Membuat link tracking unik...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Gagal Membuat Link</span>
                <p>{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* URL Display & Quick Copy */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Link Publik Tracking Pesanan:</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Aman & siap dibagikan ke customer
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 flex items-center gap-2 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-hidden">
                    <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{shareUrl}</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0 ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Send via WhatsApp */}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim ke WhatsApp</span>
                </a>

                {/* Open in new tab preview */}
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka Tampilan Publik</span>
                </a>
              </div>

              {/* Status & Expiry Rules Note */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Perlindungan Privasi Data
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Halaman tracking publik hanya menampilkan detail cetakan, status, dan riwayat pengerjaan. Data staff internal, kulakan/vendor, dan harga modal <strong>tidak ditampilkan</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Masa Aktif Link
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {order.status === "selesai"
                        ? expiresAt
                          ? `Pesanan Selesai. Link akan kadaluarsa pada: ${formatTanggal(expiresAt, true)} (30 hari sejak selesai).`
                          : "Link akan aktif selama 30 hari setelah status Selesai."
                        : "Link aktif tanpa batas selama pesanan masih dalam proses pengerjaan. Batas 30 hari dihitung otomatis saat status diubah menjadi Selesai."}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
