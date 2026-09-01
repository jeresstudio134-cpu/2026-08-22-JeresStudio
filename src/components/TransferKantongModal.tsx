import React, { useState } from "react";
import {
  ArrowRightLeft,
  X,
  Wallet,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Target,
  Sparkles,
} from "lucide-react";
import { KantongKasType, KantongBalances, SavingsAngsuranTarget } from "../types/index.js";
import { formatRupiah } from "../lib/utils.js";
import { api } from "../lib/api.js";

interface TransferKantongModalProps {
  isOpen: boolean;
  onClose: () => void;
  kantongBalances: KantongBalances | null;
  savingsTargets?: SavingsAngsuranTarget[];
  onSuccess: () => void;
  defaultSource?: KantongKasType;
  defaultDest?: KantongKasType;
}

const KANTONG_OPTIONS: Array<{
  id: KantongKasType;
  label: string;
  shortLabel: string;
  desc: string;
  color: string;
}> = [
  { id: "margin", label: "Margin / Profit Toko", shortLabel: "Margin", desc: "Laba bersih toko & cadangan ekspansi", color: "emerald" },
  { id: "overhead", label: "Overhead Operasional", shortLabel: "Overhead", desc: "Listrik, WiFi, sewa toko, maintenance", color: "amber" },
  { id: "modal", label: "Modal (Bahan & Vendor)", shortLabel: "Modal", desc: "Bahan baku, tinta, kertas, supplier", color: "blue" },
  { id: "gaji_saya", label: "Gaji Saya (Owner)", shortLabel: "Gaji Saya", desc: "Jasa desain & porsi pemilik", color: "purple" },
  { id: "gaji_karyawan", label: "Gaji Karyawan", shortLabel: "Gaji Karyawan", desc: "Upah setting, finishing, staff", color: "cyan" },
];

export const TransferKantongModal: React.FC<TransferKantongModalProps> = ({
  isOpen,
  onClose,
  kantongBalances,
  savingsTargets = [],
  onSuccess,
  defaultSource = "margin",
  defaultDest = "overhead",
}) => {
  const [sourcePocket, setSourcePocket] = useState<KantongKasType>(defaultSource);
  const [destPocket, setDestPocket] = useState<KantongKasType>(defaultDest);
  const [nominal, setNominal] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState<string>("");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const sourceBalance = kantongBalances ? (kantongBalances[sourcePocket]?.saldo || 0) : 0;
  const destBalance = kantongBalances ? (kantongBalances[destPocket]?.saldo || 0) : 0;
  const numNominal = Math.round(Number(nominal.replace(/[^0-9]/g, "")) || 0);

  const newSourceBalance = sourceBalance - numNominal;
  const newDestBalance = destBalance + numNominal;

  const handleQuickPercent = (pct: number) => {
    if (sourceBalance <= 0) return;
    const val = Math.round((sourceBalance * pct) / 100);
    setNominal(val.toString());
  };

  const handleSwap = () => {
    setSourcePocket(destPocket);
    setDestPocket(sourcePocket);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (sourcePocket === destPocket) {
      setError("Kantong asal dan kantong tujuan tidak boleh sama.");
      return;
    }

    if (numNominal <= 0) {
      setError("Masukkan nominal transfer yang valid (lebih dari Rp 0).");
      return;
    }

    try {
      setLoading(true);
      await api.transferKantong({
        dari_kantong: sourcePocket,
        ke_kantong: destPocket,
        nominal: numNominal,
        tanggal,
        keterangan: keterangan.trim() || undefined,
        target_id: selectedTargetId ? Number(selectedTargetId) : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Transfer error:", err);
      setError(err.message || "Gagal memproses transfer antar kantong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        id="transfer-kantong-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Pindah Saldo Antar Kantong
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mutasi alokasi dana antar pos kas 5 kantong Jeres Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Kantong Selector Row */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              {/* Asal */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Dari Kantong (Sumber Saldo)
                </label>
                <select
                  value={sourcePocket}
                  onChange={(e) => setSourcePocket(e.target.value as KantongKasType)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100"
                >
                  {KANTONG_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={opt.id === destPocket}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Saldo Saat Ini:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatRupiah(sourceBalance)}
                  </span>
                </div>
              </div>

              {/* Swap Button */}
              <div className="sm:hidden flex justify-center py-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-indigo-600 dark:text-indigo-400 shadow-sm"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Tujuan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Ke Kantong (Tujuan Alokasi)
                </label>
                <select
                  value={destPocket}
                  onChange={(e) => setDestPocket(e.target.value as KantongKasType)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100"
                >
                  {KANTONG_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={opt.id === sourcePocket}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Saldo Saat Ini:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatRupiah(destBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Balance Preview Badge */}
            {numNominal > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300">
                  <span className="block text-[11px] opacity-80">Sisa Saldo Asal:</span>
                  <strong className="text-sm">{formatRupiah(newSourceBalance)}</strong>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  <span className="block text-[11px] opacity-80">Saldo Baru Tujuan:</span>
                  <strong className="text-sm">{formatRupiah(newDestBalance)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Nominal Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nominal Transfer (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={nominal ? Number(nominal.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                onChange={(e) => setNominal(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Quick Percentage Buttons */}
            {sourceBalance > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Porsi Cepat:</span>
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    {pct === 100 ? "Semua (100%)" : `${pct}%`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Optional: Link with Savings Target */}
          {savingsTargets.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-500" />
                  Hubungkan dengan Target Tabungan / Angsuran (Opsional)
                </span>
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              >
                <option value="">-- Tanpa Target Khusus (Mutasi Bebas) --</option>
                {savingsTargets
                  .filter((st) => st.status === "aktif")
                  .map((st) => (
                    <option key={st.id} value={st.id}>
                      [{st.tipe.toUpperCase()}] {st.nama} (Target: {formatRupiah(st.target_nominal)} | Sisa:{" "}
                      {formatRupiah(Math.max(0, st.target_nominal - st.terkumpul_nominal))})
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Jika dipilih, akumulasi saldo target ini akan otomatis bertambah sebesar nominal transfer.
              </p>
            </div>
          )}

          {/* Tanggal & Keterangan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Mutasi
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Keterangan / Catatan
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Sisihkan laba untuk sewa ruko"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || numNominal <= 0}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Pindahkan Saldo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
