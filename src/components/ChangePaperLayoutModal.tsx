import React, { useState } from "react";
import {
  PaperFormat,
  getUserPaperPreference,
  setUserPaperPreference,
} from "../utils/generateInvoicePDF.js";
import { X, Check, FileText, Printer, CheckCircle2 } from "lucide-react";

interface ChangePaperLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLayoutChanged?: (newLayout: PaperFormat) => void;
}

export const ChangePaperLayoutModal: React.FC<ChangePaperLayoutModalProps> = ({
  isOpen,
  onClose,
  onLayoutChanged,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<PaperFormat>(getUserPaperPreference());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const layoutOptions: {
    id: PaperFormat;
    title: string;
    description: string;
    dimensions: string;
    recommendedFor: string;
  }[] = [
    {
      id: "A4",
      title: "Kertas A4 (Fixed Full Page)",
      description: "Format dokumen standar resmi A4, presisi dan rata atas.",
      dimensions: "210 x 297 mm",
      recommendedFor: "Format Utama Standar Jeres Studio",
    },
    {
      id: "A5",
      title: "Kertas A5 (Half Letter)",
      description: "Format nota ringkas setengah folio/A4.",
      dimensions: "148 x 210 mm",
      recommendedFor: "Hemat Kertas / Nota Ringkas",
    },
    {
      id: "thermal80",
      title: "Thermal 80mm",
      description: "Kertas gulung printer kasir POS ukuran standar.",
      dimensions: "Lebar 80 mm (Roll)",
      recommendedFor: "Printer Kasir Epson / Xprinter 80mm",
    },
    {
      id: "thermal58",
      title: "Thermal 58mm",
      description: "Kertas gulung mini printer bluetooth / mobile.",
      dimensions: "Lebar 58 mm (Roll)",
      recommendedFor: "Printer Bluetooth Portabel Mini",
    },
  ];

  const handleSave = () => {
    setUserPaperPreference(selectedFormat);
    setSavedSuccess(true);
    if (onLayoutChanged) {
      onLayoutChanged(selectedFormat);
    }
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Ganti Layout Cetak
              </h3>
              <p className="text-xs text-slate-500">
                Pilih ukuran kertas default untuk cetak PDF
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

        {/* Body Options */}
        <div className="p-6 space-y-3">
          {layoutOptions.map((opt) => {
            const isSelected = selectedFormat === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedFormat(opt.id)}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 text-slate-900 dark:text-white shadow-xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {opt.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {opt.dimensions}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {opt.description}
                  </p>
                  <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                    • {opt.recommendedFor}
                  </p>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <p className="text-[11px] text-slate-500">
            Tersimpan di browser perangkat ini
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <span>Simpan Pilihan</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
