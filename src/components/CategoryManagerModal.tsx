import React, { useState } from "react";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Settings,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CheckCircle2,
  Info,
} from "lucide-react";
import { api } from "../lib/api.js";
import { TransactionCategory } from "../types/index.js";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TransactionCategory[];
  onCategoriesChanged: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "masuk" | "keluar">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New Category Form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"masuk" | "keluar">("keluar");
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit Category State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"masuk" | "keluar">("masuk");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation State
  const [deletingCategory, setDeletingCategory] = useState<TransactionCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((cat) => {
    const matchesTab = activeTab === "all" || cat.type === activeTab;
    const matchesSearch =
      !searchQuery ||
      cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const incomeCount = categories.filter((c) => c.type === "masuk").length;
  const expenseCount = categories.filter((c) => c.type === "keluar").length;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg("Nama kategori tidak boleh kosong.");
      return;
    }

    try {
      setCreating(true);
      setErrorMsg("");
      setSuccessMsg("");
      await api.createCategory({
        name: newName.trim(),
        type: newType,
      });

      setNewName("");
      setSuccessMsg(`Kategori "${newName.trim()}" berhasil ditambahkan!`);
      onCategoriesChanged();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menambahkan kategori.");
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (cat: TransactionCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditType(cat.type);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSaveEdit = async (cat: TransactionCategory) => {
    if (!editName.trim()) {
      setErrorMsg("Nama kategori tidak boleh kosong.");
      return;
    }

    try {
      setSavingEdit(true);
      setErrorMsg("");
      setSuccessMsg("");
      await api.updateCategory(cat.id, {
        name: editName.trim(),
        oldName: cat.name,
        type: editType,
      } as any);

      setEditingId(null);
      setSuccessMsg(`Kategori "${cat.name}" berhasil diubah menjadi "${editName.trim()}" pada riwayat!`);
      onCategoriesChanged();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengubah kategori.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;

    try {
      setDeleting(true);
      setErrorMsg("");
      await api.deleteCategory(deletingCategory.id);
      setSuccessMsg(`Kategori "${deletingCategory.name}" berhasil dihapus.`);
      setDeletingCategory(null);
      onCategoriesChanged();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus kategori.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Kelola Kategori Kas & Transaksi
              </h3>
              <p className="text-xs text-slate-500">
                Semua kategori dapat diedit & dihapus bebas. Transaksi lama tetap menyimpan nama kategori secara independen.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Tambah Kategori Baru */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              Tambah Kategori Baru
            </h4>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Tipe Kategori
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as "masuk" | "keluar")}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="keluar">Pengeluaran (Kas Keluar)</option>
                    <option value="masuk">Pemasukan (Kas Masuk)</option>
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nama Kategori
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Biaya Packing & Ekspedisi"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3 flex items-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {creating ? "Menyimpan..." : "Tambah"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Semua ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("masuk")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  activeTab === "masuk"
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-emerald-600"
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Pemasukan ({incomeCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("keluar")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  activeTab === "keluar"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-rose-600"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Pengeluaran ({expenseCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* List of Categories */}
          <div className="space-y-2">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Tidak ada kategori yang sesuai filter.
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    {isEditing ? (
                      /* Editing Form */
                      <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as "masuk" | "keluar")}
                          className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                        >
                          <option value="masuk">Pemasukan</option>
                          <option value="keluar">Pengeluaran</option>
                        </select>

                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                        />

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            disabled={savingEdit}
                            onClick={() => handleSaveEdit(cat)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Display */
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                              cat.type === "masuk"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {cat.type === "masuk" ? (
                              <>
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                Pemasukan
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                Pengeluaran
                              </>
                            )}
                          </span>

                          <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {cat.name}
                          </span>
                        </div>

                        {/* Action buttons (Both edit and delete are 100% allowed for every category) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit nama kategori"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingCategory(cat)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Hapus kategori"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Info snapshot note */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <span className="font-bold">Keamanan Riwayat Pembukuan:</span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                Setiap transaksi keuangan menyimpan snapshot nama kategori secara permanen. Mengedit atau menghapus kategori di sini tidak akan merusak atau mengubah riwayat transaksi lama yang sudah tercatat.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Hapus Kategori "{deletingCategory.name}"?
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Kategori ini akan dihilangkan dari daftar pilihan transaksi baru. Transaksi lama yang sudah menggunakan kategori ini <strong className="text-slate-700 dark:text-slate-300">tetap aman dan tidak berubah</strong>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus Kategori"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
