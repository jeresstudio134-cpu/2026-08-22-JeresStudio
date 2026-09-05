import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Sparkles,
  Wallet,
} from "lucide-react";
import { SavingsAngsuranTarget, KantongKasType, KantongBalances } from "../types/index.js";
import { formatRupiah } from "../lib/utils.js";
import { api } from "../lib/api.js";

interface DepositTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: SavingsAngsuranTarget | null;
  kantongBalances: KantongBalances | null;
  onSuccess: (msg?: string) => void;
}

const KANTONG_OPTIONS: Array<{ id: KantongKasType; label: string; shortLabel: string }> = [
  { id: "margin", label: "Kantong Margin / Profit Toko", shortLabel: "Margin" },
  { id: "overhead", label: "Kantong Overhead Operasional", shortLabel: "Overhead" },
  { id: "gaji_saya", label: "Kantong Gaji Saya (Owner)", shortLabel: "Gaji Saya" },
  { id: "modal", label: "Kantong Modal", shortLabel: "Modal" },
  { id: "gaji_karyawan", label: "Kantong Gaji Karyawan", shortLabel: "Gaji Karyawan" },
];

export const DepositTargetModal: React.FC<DepositTargetModalProps> = ({
  isOpen,
  onClose,
  target,
  kantongBalances,
  onSuccess,
}) => {
  const [nominal, setNominal] = useState<string>("");
  const [dariKantong, setDariKantong] = useState<KantongKasType>("margin");
  const [metodePembayaran, setMetodePembayaran] = useState<string>("Transfer BCA");
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setDariKantong(target.sumber_kantong_default || (target.tipe === "angsuran" ? "overhead" : "margin"));
      // Default nominal to monthly installment or remaining amount
      const sisaTarget = Math.max(0, target.target_nominal - target.terkumpul_nominal);
      const defaultAmount = target.cicilan_per_bulan && target.cicilan_per_bulan > 0
        ? Math.min(target.cicilan_per_bulan, sisaTarget)
        : sisaTarget;

      setNominal(defaultAmount > 0 ? defaultAmount.toString() : "");
      setKeterangan(
        target.tipe === "angsuran"
          ? `Bayar angsuran '${target.nama}'`
          : `Setor tabungan '${target.nama}'`
      );
    }
    setError(null);
  }, [target, isOpen]);

  if (!isOpen || !target) return null;

  const isAngsuran = target.tipe === "angsuran";
  const numNominal = Math.round(Number(nominal.replace(/[^0-9]/g, "")) || 0);
  const currentPocketBalance = kantongBalances ? (kantongBalances[dariKantong]?.saldo || 0) : 0;
  const sisaSebelumnya = Math.max(0, target.target_nominal - target.terkumpul_nominal);
  const targetBaruTerkumpul = target.terkumpul_nominal + numNominal;
  const targetPct = Math.min(100, Math.round((targetBaruTerkumpul / target.target_nominal) * 100));

  const handleQuickAmount = (amt: number) => {
    setNominal(amt.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numNominal <= 0) {
      setError("Nominal harus lebih dari Rp 0.");
      return;
    }

    try {
      setLoading(true);
      await api.depositToTarget(target.id, {
        nominal: numNominal,
        dari_kantong: dariKantong,
        tanggal,
        keterangan: keterangan.trim() || undefined,
        metode_pembayaran: metodePembayaran,
      });

      onSuccess(
        isAngsuran
          ? `Pembayaran angsuran Rp ${formatRupiah(numNominal)} berhasil dicatat!`
          : `Setoran tabungan Rp ${formatRupiah(numNominal)} berhasil dicatat!`
      );
      onClose();
    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err.message || "Gagal mencatat transaksi tabungan/angsuran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        id="deposit-target-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                isAngsuran
                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isAngsuran ? <CreditCard className="w-5 h-5" /> : <PiggyBank className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {isAngsuran ? "Bayar Angsuran / Cicilan" : "Setor Tabungan Kas"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {target.nama}
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Target Total:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatRupiah(target.target_nominal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {isAngsuran ? "Sudah Dibayar:" : "Sudah Terkumpul:"}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatRupiah(target.terkumpul_nominal)} (
                {Math.round((target.terkumpul_nominal / target.target_nominal) * 100)}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Sisa Kewajiban / Target:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {formatRupiah(sisaSebelumnya)}
              </span>
            </div>

            {/* Progress Bar Preview */}
            <div className="pt-1.5">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isAngsuran ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${targetPct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>Progres Baru: {targetPct}%</span>
                <span>Total: {formatRupiah(targetBaruTerkumpul)}</span>
              </div>
            </div>
          </div>

          {/* Sumber Kantong Kas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Potong Dari Kantong Kas Mana?
            </label>
            <select
              value={dariKantong}
              onChange={(e) => setDariKantong(e.target.value as KantongKasType)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100"
            >
              {KANTONG_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} (Saldo: {formatRupiah(kantongBalances ? (kantongBalances[opt.id]?.saldo || 0) : 0)})
                </option>
              ))}
            </select>
          </div>

          {/* Nominal Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nominal {isAngsuran ? "Pembayaran (Rp)" : "Setoran Tabungan (Rp)"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={nominal ? Number(nominal.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                onChange={(e) => setNominal(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {target.cicilan_per_bulan && target.cicilan_per_bulan > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(target.cicilan_per_bulan!)}
                  className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
                >
                  1x Cicilan ({formatRupiah(target.cicilan_per_bulan)})
                </button>
              )}
              {sisaSebelumnya > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(sisaSebelumnya)}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                >
                  Lunaskan Sisa ({formatRupiah(sisaSebelumnya)})
                </button>
              )}
            </div>
          </div>

          {/* Metode Bayar & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={metodePembayaran}
                onChange={(e) => setMetodePembayaran(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              >
                <option value="Transfer BCA">Transfer BCA</option>
                <option value="Transfer Mandiri">Transfer Mandiri</option>
                <option value="Cash">Cash / Kas Tunai</option>
                <option value="QRIS">QRIS</option>
                <option value="Debit">Debit</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keterangan
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Keterangan transaksi kas"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || numNominal <= 0}
              className={`px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-2 ${
                isAngsuran ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAngsuran ? "Bayar Sekarang" : "Setor Tabungan"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
