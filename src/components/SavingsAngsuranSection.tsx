import React, { useState } from "react";
import {
  PiggyBank,
  CreditCard,
  Target,
  Plus,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  TrendingUp,
  AlertCircle,
  Coins,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { SavingsAngsuranTarget, KantongBalances, KantongKasType } from "../types/index.js";
import { formatRupiah } from "../lib/utils.js";
import { api } from "../lib/api.js";

interface SavingsAngsuranSectionProps {
  targets: SavingsAngsuranTarget[];
  kantongBalances: KantongBalances | null;
  onRefresh: () => void;
  onOpenTransfer?: (source?: KantongKasType, targetId?: number) => void;
  onOpenTransferModal?: (source?: KantongKasType, targetId?: number) => void;
  onOpenAddTarget?: () => void;
  onOpenCreateModal?: () => void;
  onOpenEditTarget?: (target: SavingsAngsuranTarget) => void;
  onOpenEditModal?: (target: SavingsAngsuranTarget) => void;
  onOpenDeposit?: (target: SavingsAngsuranTarget) => void;
  onOpenDepositModal?: (target: SavingsAngsuranTarget) => void;
}

const KANTONG_LABEL_MAP: Record<string, string> = {
  margin: "Kantong Margin",
  overhead: "Kantong Overhead",
  gaji_saya: "Kantong Gaji Saya",
  modal: "Kantong Modal",
  gaji_karyawan: "Kantong Gaji Karyawan",
};

export const SavingsAngsuranSection: React.FC<SavingsAngsuranSectionProps> = ({
  targets,
  kantongBalances,
  onRefresh,
  onOpenTransfer,
  onOpenTransferModal,
  onOpenAddTarget,
  onOpenCreateModal,
  onOpenEditTarget,
  onOpenEditModal,
  onOpenDeposit,
  onOpenDepositModal,
}) => {
  const handleTransfer = (source?: KantongKasType, targetId?: number) => {
    if (onOpenTransferModal) onOpenTransferModal(source, targetId);
    else if (onOpenTransfer) onOpenTransfer(source, targetId);
  };

  const handleAddTarget = () => {
    if (onOpenCreateModal) onOpenCreateModal();
    else if (onOpenAddTarget) onOpenAddTarget();
  };

  const handleEditTarget = (target: SavingsAngsuranTarget) => {
    if (onOpenEditModal) onOpenEditModal(target);
    else if (onOpenEditTarget) onOpenEditTarget(target);
  };

  const handleDeposit = (target: SavingsAngsuranTarget) => {
    if (onOpenDepositModal) onOpenDepositModal(target);
    else if (onOpenDeposit) onOpenDeposit(target);
  };
  const [filterType, setFilterType] = useState<"all" | "tabungan" | "angsuran" | "aktif" | "selesai">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Metrics Calculation
  const tabunganList = targets.filter((t) => t.tipe === "tabungan");
  const angsuranList = targets.filter((t) => t.tipe === "angsuran");

  const totalTabunganTarget = tabunganList.reduce((acc, t) => acc + t.target_nominal, 0);
  const totalTabunganTerkumpul = tabunganList.reduce((acc, t) => acc + t.terkumpul_nominal, 0);
  const pctTabungan = totalTabunganTarget > 0 ? Math.round((totalTabunganTerkumpul / totalTabunganTarget) * 100) : 0;

  const totalAngsuranTarget = angsuranList.reduce((acc, t) => acc + t.target_nominal, 0);
  const totalAngsuranDibayar = angsuranList.reduce((acc, t) => acc + t.terkumpul_nominal, 0);
  const sisaUtangAngsuran = Math.max(0, totalAngsuranTarget - totalAngsuranDibayar);
  const pctAngsuran = totalAngsuranTarget > 0 ? Math.round((totalAngsuranDibayar / totalAngsuranTarget) * 100) : 0;

  // Filtered List
  const filteredTargets = targets.filter((t) => {
    if (filterType === "tabungan") return t.tipe === "tabungan";
    if (filterType === "angsuran") return t.tipe === "angsuran";
    if (filterType === "aktif") return t.status === "aktif";
    if (filterType === "selesai") return t.status === "selesai";
    return true;
  });

  const handleDelete = async (id: number) => {
    try {
      setDeleting(true);
      await api.deleteSavingsTarget(id);
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err) {
      console.error("Gagal menghapus target:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6" id="savings-angsuran-section">
      {/* Top Banner & Action Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Rencana Tabungan & Angsuran Kas Toko
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Kelola dana cadangan ekspansi, beli mesin cetak baru, dan cicilan usaha terjadwal tanpa mengganggu kas operasional
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleTransfer()}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
              <span>Transfer Saldo Antar Kantong</span>
            </button>
            <button
              onClick={handleAddTarget}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Target Baru</span>
            </button>
          </div>
        </div>

        {/* 2 Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Tabungan Summary */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Tabungan & Dana Cadangan
                  </h4>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {tabunganList.length} Pos Rencana Terdaftar
                  </span>
                </div>
              </div>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                {pctTabungan}% Terkumpul
              </span>
            </div>

            <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/60 h-2.5 rounded-full overflow-hidden my-2.5">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pctTabungan}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300 pt-1">
              <span>
                Terkumpul: <strong className="text-emerald-700 dark:text-emerald-300">{formatRupiah(totalTabunganTerkumpul)}</strong>
              </span>
              <span>
                Target: <strong className="text-slate-800 dark:text-slate-100">{formatRupiah(totalTabunganTarget)}</strong>
              </span>
            </div>
          </div>

          {/* Angsuran Summary */}
          <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    Angsuran & Cicilan Usaha
                  </h4>
                  <span className="text-[11px] text-rose-600 dark:text-rose-400">
                    {angsuranList.length} Kewajiban Terjadwal
                  </span>
                </div>
              </div>
              <span className="text-sm font-extrabold text-rose-700 dark:text-rose-300">
                {pctAngsuran}% Lunas
              </span>
            </div>

            <div className="w-full bg-rose-200/60 dark:bg-rose-900/60 h-2.5 rounded-full overflow-hidden my-2.5">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pctAngsuran}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300 pt-1">
              <span>
                Terbayar: <strong className="text-rose-700 dark:text-rose-300">{formatRupiah(totalAngsuranDibayar)}</strong>
              </span>
              <span>
                Sisa Tagihan: <strong className="text-rose-800 dark:text-rose-200">{formatRupiah(sisaUtangAngsuran)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {[
            { id: "all", label: `Semua (${targets.length})` },
            { id: "tabungan", label: `Tabungan (${tabunganList.length})` },
            { id: "angsuran", label: `Angsuran (${angsuranList.length})` },
            { id: "aktif", label: `Aktif (${targets.filter((t) => t.status === "aktif").length})` },
            { id: "selesai", label: `Selesai (${targets.filter((t) => t.status === "selesai").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === tab.id
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Target Cards Grid */}
      {filteredTargets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 mx-auto flex items-center justify-center">
            <PiggyBank className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Belum ada pos tabungan atau angsuran terdaftar
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Gunakan fitur ini untuk menetapkan target menabung beli mesin cetak baru atau membayar cicilan rutin toko tanpa khawatir kas tercampur.
          </p>
          <button
            onClick={handleAddTarget}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Target Pertama Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTargets.map((item) => {
            const isAngsuran = item.tipe === "angsuran";
            const isCompleted = item.status === "selesai" || item.terkumpul_nominal >= item.target_nominal;
            const pct = Math.min(100, Math.round((item.terkumpul_nominal / item.target_nominal) * 100));
            const sisa = Math.max(0, item.target_nominal - item.terkumpul_nominal);

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                  isCompleted
                    ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20"
                    : isAngsuran
                    ? "border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800"
                    : "border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800"
                }`}
              >
                {/* Header Item */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 ${
                          isAngsuran
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        {isAngsuran ? <CreditCard className="w-3 h-3" /> : <PiggyBank className="w-3 h-3" />}
                        <span>{isAngsuran ? "Angsuran" : "Tabungan"}</span>
                      </span>

                      {isCompleted && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Lunas/Tercapai</span>
                        </span>
                      )}
                    </div>

                    {/* Action Menu (Edit / Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditTarget(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Target"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Hapus Target"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Notes */}
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mb-1">
                    {item.nama}
                  </h3>
                  {item.catatan && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {item.catatan}
                    </p>
                  )}

                  {/* Pocket Source & Due Date Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 my-3">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                      Disisihkan dari: {KANTONG_LABEL_MAP[item.sumber_kantong_default] || item.sumber_kantong_default}
                    </span>
                    {item.jatuh_tempo && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Tempo: {item.jatuh_tempo}</span>
                      </span>
                    )}
                  </div>

                  {/* Progress Bar & Amount Display */}
                  <div className="space-y-1.5 my-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {isAngsuran ? "Sudah Dibayar" : "Terkumpul"}
                      </span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {formatRupiah(item.terkumpul_nominal)}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          / {formatRupiah(item.target_nominal)}
                        </span>
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAngsuran ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className={isAngsuran ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                        {pct}% Tercapai
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Sisa: {formatRupiah(sisa)}
                      </span>
                    </div>

                    {item.cicilan_per_bulan && item.cicilan_per_bulan > 0 && (
                      <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                        <span>Porsi Bulanan:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {formatRupiah(item.cicilan_per_bulan)} / bln
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleDeposit(item)}
                    className={`flex-1 py-2 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                      isAngsuran
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isAngsuran ? "Bayar Angsuran" : "Setor Tabungan"}</span>
                  </button>

                  <button
                    onClick={() => handleTransfer(item.sumber_kantong_default, item.id)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                    title="Pindahkan Saldo Kantong ke Rencana Ini"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                  </button>
                </div>

                {/* Delete Confirmation Overlay */}
                {deleteConfirmId === item.id && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-2xl p-5 flex flex-col items-center justify-center text-center z-10 animate-fadeIn">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Hapus Target "{item.nama}"?
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                      Catatan transaksi kas yang sudah tercatat tidak akan hilang.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                      >
                        {deleting ? "Menghapus..." : "Ya, Hapus"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
