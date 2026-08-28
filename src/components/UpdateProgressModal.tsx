import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Send,
  Sparkles,
  Layers,
  Printer,
  PackageCheck,
  Truck,
  Scissors
} from "lucide-react";
import { Order, ProgressNote } from "../types";
import { api } from "../lib/api";
import { formatTanggal, getStatusBadge } from "../lib/utils";

interface UpdateProgressModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_MILESTONES = [
  { label: "Naik Cetak", text: "File desain ACC, pesanan sedang naik cetak mesin produksi.", icon: Printer },
  { label: "Cutting & Finishing", text: "Proses cutting presisi, laminasi, & finishing tepi.", icon: Scissors },
  { label: "Quality Check & Packing", text: "Pengecekan kualitas cetak selesai, sedang tahap packing rapi.", icon: Layers },
  { label: "Siap Diambil", text: "Pesanan telah selesai & siap diambil di studio.", icon: PackageCheck },
  { label: "Diserahkan ke Kurir", text: "Pesanan telah diserahkan ke jasa kurir/pengiriman.", icon: Truck },
];

export const UpdateProgressModal: React.FC<UpdateProgressModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<"pending" | "proses" | "selesai" | "dibatalkan">("proses");
  const [customDetail, setCustomDetail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      setSelectedStatus(order.status);
      setCustomDetail("");
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  // Parse progress notes if needed
  const rawNotes = Array.isArray(order.progress_notes)
    ? order.progress_notes
    : typeof order.progress_notes === "string"
    ? JSON.parse(order.progress_notes || "[]")
    : [];
  
  const sortedNotes = [...rawNotes].sort(
    (a: ProgressNote, b: ProgressNote) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDetail.trim() && selectedStatus === order.status) {
      setError("Silakan tulis detail progres atau ubah status pesanan.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call PATCH /api/orders/:id/status
      await api.updateOrderStatus(order.id, {
        status: selectedStatus,
        progress_detail: customDetail.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Gagal update progres:", err);
      setError(err.message || "Gagal memperbarui status progres.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetText: string) => {
    setCustomDetail(presetText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Update Status & Progres Pengerjaan
              </h3>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Ubah Status Pesanan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "pending", label: "Pending", activeClass: "bg-blue-50 text-blue-700 border-blue-500 ring-2 ring-blue-500/20" },
                { id: "proses", label: "Dalam Proses", activeClass: "bg-amber-50 text-amber-700 border-amber-500 ring-2 ring-amber-500/20" },
                { id: "selesai", label: "Selesai", activeClass: "bg-emerald-50 text-emerald-700 border-emerald-500 ring-2 ring-emerald-500/20" },
                { id: "dibatalkan", label: "Dibatalkan", activeClass: "bg-rose-50 text-rose-700 border-rose-500 ring-2 ring-rose-500/20" },
              ].map((st) => {
                const isSelected = selectedStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStatus(st.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      isSelected
                        ? st.activeClass
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Pilih Catatan Cepat (Opsional)</span>
              <span className="text-[10px] text-slate-400 font-normal">Klik untuk mengisi teks otomatis</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_MILESTONES.map((preset, idx) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset.text)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Icon className="w-3 h-3" />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Detail Catatan Progres (Ditampilkan di Link Tracking Pelanggan)
            </label>
            <textarea
              rows={3}
              value={customDetail}
              onChange={(e) => setCustomDetail(e.target.value)}
              placeholder="Contoh: File desain sudah ACC, sedang proses cetak banner & stiker label..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Existing Progress History */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Riwayat Progres Terakhir ({sortedNotes.length}):
            </span>
            <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
              {sortedNotes.length > 0 ? (
                sortedNotes.map((n: ProgressNote, i: number) => (
                  <div
                    key={i}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 text-xs flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        [{n.status}]
                      </span>{" "}
                      <span className="text-slate-600 dark:text-slate-400">{n.detail}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {formatTanggal(n.timestamp)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada catatan progres.</p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Progres</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
