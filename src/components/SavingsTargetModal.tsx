import React, { useState, useEffect } from "react";
import {
  X,
  Target,
  PiggyBank,
  CreditCard,
  Calendar,
  AlertCircle,
  Coins,
  FileText,
  Clock,
} from "lucide-react";
import { SavingsAngsuranTarget, KantongKasType } from "../types/index.js";
import { api } from "../lib/api.js";

interface SavingsTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetToEdit?: SavingsAngsuranTarget | null;
  onSuccess: () => void;
}

const KANTONG_OPTIONS: Array<{ id: KantongKasType; label: string; desc: string }> = [
  { id: "margin", label: "Margin / Profit Bersih", desc: "Cocok untuk Tabungan ekspansi & beli mesin baru" },
  { id: "overhead", label: "Overhead & Operasional", desc: "Cocok untuk Angsuran sewa ruko / cicilan mesin" },
  { id: "gaji_saya", label: "Gaji Saya (Owner)", desc: "Cocok untuk Tabungan atau cicilan pribadi owner" },
  { id: "modal", label: "Modal Bahan & Vendor", desc: "Pos kas belanja supply" },
  { id: "gaji_karyawan", label: "Gaji Karyawan", desc: "Pos kas upah staf" },
];

export const SavingsTargetModal: React.FC<SavingsTargetModalProps> = ({
  isOpen,
  onClose,
  targetToEdit,
  onSuccess,
}) => {
  const [tipe, setTipe] = useState<"tabungan" | "angsuran">("tabungan");
  const [nama, setNama] = useState("");
  const [targetNominal, setTargetNominal] = useState("");
  const [terkumpulNominal, setTerkumpulNominal] = useState("");
  const [sumberKantongDefault, setSumberKantongDefault] = useState<KantongKasType>("margin");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [cicilanPerBulan, setCicilanPerBulan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [status, setStatus] = useState<"aktif" | "selesai" | "ditunda">("aktif");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targetToEdit) {
      setTipe(targetToEdit.tipe);
      setNama(targetToEdit.nama);
      setTargetNominal(targetToEdit.target_nominal.toString());
      setTerkumpulNominal(targetToEdit.terkumpul_nominal.toString());
      setSumberKantongDefault(targetToEdit.sumber_kantong_default || (targetToEdit.tipe === "angsuran" ? "overhead" : "margin"));
      setJatuhTempo(targetToEdit.jatuh_tempo || "");
      setCicilanPerBulan(targetToEdit.cicilan_per_bulan ? targetToEdit.cicilan_per_bulan.toString() : "");
      setCatatan(targetToEdit.catatan || "");
      setStatus(targetToEdit.status || "aktif");
    } else {
      setTipe("tabungan");
      setNama("");
      setTargetNominal("");
      setTerkumpulNominal("0");
      setSumberKantongDefault("margin");
      setJatuhTempo("");
      setCicilanPerBulan("");
      setCatatan("");
      setStatus("aktif");
    }
    setError(null);
  }, [targetToEdit, isOpen]);

  if (!isOpen) return null;

  const handleTipeChange = (newTipe: "tabungan" | "angsuran") => {
    setTipe(newTipe);
    if (!targetToEdit) {
      if (newTipe === "angsuran") {
        setSumberKantongDefault("overhead");
      } else {
        setSumberKantongDefault("margin");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numTarget = Math.round(Number(targetNominal.replace(/[^0-9]/g, "")) || 0);
    const numTerkumpul = Math.round(Number(terkumpulNominal.replace(/[^0-9]/g, "")) || 0);
    const numCicilan = Math.round(Number(cicilanPerBulan.replace(/[^0-9]/g, "")) || 0);

    if (!nama.trim()) {
      setError("Nama target/angsuran wajib diisi.");
      return;
    }

    if (numTarget <= 0) {
      setError("Target nominal harus lebih dari Rp 0.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        tipe,
        nama: nama.trim(),
        target_nominal: numTarget,
        terkumpul_nominal: numTerkumpul,
        sumber_kantong_default: sumberKantongDefault,
        jatuh_tempo: jatuhTempo || undefined,
        cicilan_per_bulan: numCicilan || undefined,
        catatan: catatan.trim() || undefined,
        status,
      };

      if (targetToEdit) {
        await api.updateSavingsTarget(targetToEdit.id, payload);
      } else {
        await api.createSavingsTarget(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Save target error:", err);
      setError(err.message || "Gagal menyimpan target tabungan/angsuran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        id="savings-target-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
              tipe === "angsuran"
                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
            }`}>
              {tipe === "angsuran" ? <CreditCard className="w-5 h-5" /> : <PiggyBank className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {targetToEdit
                  ? `Edit ${targetToEdit.tipe === "angsuran" ? "Angsuran / Cicilan" : "Target Tabungan"}`
                  : `Tambah ${tipe === "angsuran" ? "Angsuran / Cicilan" : "Target Menabung"}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur target dana cadangan, beli mesin baru, atau cicilan usaha
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

          {/* Tipe Selector Tab */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Jenis Pos Finansial
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleTipeChange("tabungan")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  tipe === "tabungan"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <PiggyBank className="w-4 h-4" />
                <span>Tabungan / Dana Cadangan</span>
              </button>
              <button
                type="button"
                onClick={() => handleTipeChange("angsuran")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  tipe === "angsuran"
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Angsuran / Cicilan Usaha</span>
              </button>
            </div>
          </div>

          {/* Nama Target */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Pos / Rencana <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder={
                tipe === "angsuran"
                  ? "Contoh: Cicilan Mesin UV Flatbed A3+, Sewa Ruko 2026"
                  : "Contoh: Beli Mesin Digital Printing Baru, Dana Darurat Workshop"
              }
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Target Nominal & Terkumpul */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {tipe === "angsuran" ? "Total Utang / Angsuran (Rp)" : "Target Total Tabungan (Rp)"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="text"
                  value={targetNominal ? Number(targetNominal.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setTargetNominal(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Saldo Awal / Terkumpul Saat Ini (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="text"
                  value={terkumpulNominal ? Number(terkumpulNominal.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setTerkumpulNominal(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Sumber Kantong Kas Default */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sumber Kantong Kas Utama (Disisihkan Dari)
            </label>
            <select
              value={sumberKantongDefault}
              onChange={(e) => setSumberKantongDefault(e.target.value as KantongKasType)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100"
            >
              {KANTONG_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Jatuh Tempo & Cicilan Per Bulan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {tipe === "angsuran" ? "Tanggal Jatuh Tempo" : "Target Tanggal Tercapai"} (Opsional)
              </label>
              <input
                type="date"
                value={jatuhTempo}
                onChange={(e) => setJatuhTempo(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {tipe === "angsuran" ? "Nominal Cicilan / Bulan (Rp)" : "Target Nabung / Bulan (Rp)"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="text"
                  value={cicilanPerBulan ? Number(cicilanPerBulan.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setCicilanPerBulan(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Status (if editing) */}
          {targetToEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status Rencana
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold"
              >
                <option value="aktif">🟢 Aktif Berjalan</option>
                <option value="selesai">✅ Selesai / Lunas</option>
                <option value="ditunda">⏸️ Ditunda / Pause</option>
              </select>
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Keterangan Tambahan
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Pembayaran cicilan tiap tanggal 10 lewat transfer rekening BCA"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Actions */}
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
              disabled={loading || !nama.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  <span>{targetToEdit ? "Perbarui Target" : "Simpan Target"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
