import React, { useState, useEffect } from "react";
import { X, Settings, Check, AlertCircle, TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";
import { MarginThresholdSettings } from "../types/index.js";
import { api } from "../lib/api.js";

interface MarginThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: MarginThresholdSettings;
  onSaved: (newSettings: MarginThresholdSettings) => void;
}

export const MarginThresholdModal: React.FC<MarginThresholdModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaved,
}) => {
  const [goodThreshold, setGoodThreshold] = useState<number>(currentSettings.margin_threshold_good ?? 20);
  const [warningThreshold, setWarningThreshold] = useState<number>(currentSettings.margin_threshold_warning ?? 10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGoodThreshold(currentSettings.margin_threshold_good ?? 20);
      setWarningThreshold(currentSettings.margin_threshold_warning ?? 10);
      setError(null);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (goodThreshold <= warningThreshold) {
      setError("Batas Margin Sehat (Hijau) harus lebih besar dari Batas Margin Tipis (Kuning).");
      return;
    }
    if (warningThreshold < 0 || goodThreshold < 0) {
      setError("Batas persentase margin tidak boleh bernilai negatif.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await api.updateMarginThresholds({
        margin_threshold_good: Number(goodThreshold),
        margin_threshold_warning: Number(warningThreshold),
      });

      onSaved({
        margin_threshold_good: res.margin_threshold_good,
        margin_threshold_warning: res.margin_threshold_warning,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan batas margin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pengaturan Batas Margin</h3>
              <p className="text-xs text-slate-500">Konfigurasi indikator warna margin profit produk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batas Margin Sehat (Hijau)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={goodThreshold}
                  onChange={(e) => setGoodThreshold(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  placeholder="20"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Margin profit <span className="font-semibold text-emerald-600 dark:text-emerald-400">&ge; {goodThreshold}%</span> akan diberi lencana <span className="font-semibold text-emerald-600 dark:text-emerald-400">Hijau (Sehat)</span>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batas Margin Tipis (Kuning)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                  placeholder="10"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Margin antara <span className="font-semibold text-amber-600 dark:text-amber-400">{warningThreshold}% s/d &lt; {goodThreshold}%</span> akan diberi lencana <span className="font-semibold text-amber-600 dark:text-amber-400">Kuning (Tipis)</span>.
              </p>
            </div>
          </div>

          {/* Visual Scale Preview */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pratinjau Status Warna Margin:</p>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium">
                <div className="font-bold flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  &ge; {goodThreshold}%
                </div>
                <div className="text-[10px] mt-0.5 opacity-80">Margin Sehat</div>
              </div>

              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-medium">
                <div className="font-bold flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {warningThreshold} - {goodThreshold - 1}%
                </div>
                <div className="text-[10px] mt-0.5 opacity-80">Margin Tipis</div>
              </div>

              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-medium">
                <div className="font-bold flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  &lt; {warningThreshold}%
                </div>
                <div className="text-[10px] mt-0.5 opacity-80">Margin Rendah</div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
