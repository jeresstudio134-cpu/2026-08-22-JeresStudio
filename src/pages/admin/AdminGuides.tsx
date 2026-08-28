import React, { useState, useEffect } from "react";
import { Guide } from "../../types/index.js";
import { api } from "../../lib/api.js";
import {
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  FileText,
  Bookmark,
  Sparkles,
  Layers,
  X,
  ExternalLink,
  Info,
} from "lucide-react";

export const AdminGuides: React.FC = () => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("Semua");

  // Accordion state: map category -> boolean (open/close)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Copy state: map guideId -> boolean (copied tooltip)
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modal Create/Edit state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [formCategory, setFormCategory] = useState<string>("Template Chat");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  // Delete modal state
  const [deleteConfirmGuide, setDeleteConfirmGuide] = useState<Guide | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const res = await api.getGuides();
      setGuides(res.guides || []);
      setCategories(res.categories || []);

      // By default, expand all categories
      const initialExpanded: Record<string, boolean> = {};
      (res.categories || []).forEach((cat) => {
        initialExpanded[cat] = true;
      });
      // also any extra categories found in guides
      (res.guides || []).forEach((g: Guide) => {
        initialExpanded[g.category] = true;
      });
      setExpandedCategories(initialExpanded);
    } catch (err) {
      console.error("Gagal memuat panduan kerja:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    allUniqueCategories.forEach((cat) => {
      next[cat] = true;
    });
    setExpandedCategories(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    allUniqueCategories.forEach((cat) => {
      next[cat] = false;
    });
    setExpandedCategories(next);
  };

  const handleCopyContent = (guide: Guide) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(guide.content);
    } else {
      // Fallback for browsers without direct clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = guide.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedId(guide.id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === guide.id ? null : prev));
    }, 2000);
  };

  const handleOpenAddModal = (defaultCat?: string) => {
    setEditingGuide(null);
    setFormCategory(defaultCat || (categories[0] || "Template Chat"));
    setCustomCategory("");
    setFormTitle("");
    setFormContent("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (guide: Guide) => {
    setEditingGuide(guide);
    const standardCategories = ["Template Chat", "SOP/Alur Kerja", "Instruksi Setting & Cetak", "Panduan Kasir & Nota"];
    if (standardCategories.includes(guide.category) || categories.includes(guide.category)) {
      setFormCategory(guide.category);
      setCustomCategory("");
    } else {
      setFormCategory("__custom__");
      setCustomCategory(guide.category);
    }
    setFormTitle(guide.title);
    setFormContent(guide.content);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const finalCategory =
      formCategory === "__custom__" ? customCategory.trim() : formCategory.trim();

    if (!finalCategory) {
      setFormError("Kategori panduan wajib dipilih atau diisi.");
      return;
    }
    if (!formTitle.trim()) {
      setFormError("Judul panduan wajib diisi.");
      return;
    }
    if (!formContent.trim()) {
      setFormError("Isi konten panduan wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingGuide) {
        await api.updateGuide(editingGuide.id, {
          category: finalCategory,
          title: formTitle.trim(),
          content: formContent.trim(),
        });
      } else {
        await api.createGuide({
          category: finalCategory,
          title: formTitle.trim(),
          content: formContent.trim(),
        });
      }

      setIsModalOpen(false);
      await fetchGuides();
    } catch (err: any) {
      console.error("Error saving guide:", err);
      setFormError(err.message || "Gagal menyimpan panduan kerja.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuide = async () => {
    if (!deleteConfirmGuide) return;
    try {
      setIsDeleting(true);
      await api.deleteGuide(deleteConfirmGuide.id);
      setDeleteConfirmGuide(null);
      await fetchGuides();
    } catch (err) {
      console.error("Gagal menghapus panduan:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered guides by search
  const filteredGuides = guides.filter((g) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategoryFilter === "Semua" ||
      g.category.toLowerCase() === selectedCategoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Extract all categories list
  const allUniqueCategories = Array.from(
    new Set([
      "Template Chat",
      "SOP/Alur Kerja",
      ...categories,
      ...guides.map((g) => g.category),
    ])
  ).filter(Boolean);

  // Group filtered guides by category
  const groupedGuides: Record<string, Guide[]> = {};
  filteredGuides.forEach((g) => {
    const cat = g.category || "Lainnya";
    if (!groupedGuides[cat]) {
      groupedGuides[cat] = [];
    }
    groupedGuides[cat].push(g);
  });

  // Category Icon & Badge color helper
  const getCategoryMeta = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("chat") || c.includes("pesan") || c.includes("whatsapp")) {
      return {
        icon: MessageSquare,
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
        pillBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      };
    }
    if (c.includes("sop") || c.includes("alur") || c.includes("kerja") || c.includes("operasional")) {
      return {
        icon: FileText,
        badgeBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
        pillBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      };
    }
    if (c.includes("desain") || c.includes("cetak") || c.includes("setting")) {
      return {
        icon: Sparkles,
        badgeBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
        pillBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      };
    }
    return {
      icon: Bookmark,
      badgeBg: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      pillBg: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/60 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Panduan Kerja & Template Chat
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Koleksi SOP operasional workshop cetak, template balasan WhatsApp pelanggan, dan instruksi alur kerja.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Panduan / Template</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul panduan, SOP, atau isi pesan template chat..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Accordion Controls */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              onClick={handleExpandAll}
              className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Buka Semua
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Tutup Semua
            </button>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-slate-400 text-xs font-medium mr-1 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setSelectedCategoryFilter("Semua")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategoryFilter === "Semua"
                ? "bg-indigo-600 text-white font-semibold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Semua Kategori ({guides.length})
          </button>
          {allUniqueCategories.map((cat) => {
            const count = guides.filter((g) => g.category.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategoryFilter.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-indigo-700 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main List Section */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3">
            Memuat panduan kerja & template chat...
          </p>
        </div>
      ) : filteredGuides.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Tidak ada panduan kerja yang cocok
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? `Tidak ditemukan panduan dengan kata kunci "${searchQuery}". Coba gunakan kata kunci lain.`
              : "Belum ada item panduan di kategori ini. Silakan buat item panduan baru."}
          </p>
          <button
            onClick={() => handleOpenAddModal(selectedCategoryFilter !== "Semua" ? selectedCategoryFilter : undefined)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Panduan Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.keys(groupedGuides).map((categoryName) => {
            const items = groupedGuides[categoryName];
            const isExpanded = expandedCategories[categoryName] !== false;
            const meta = getCategoryMeta(categoryName);
            const CatIcon = meta.icon;

            return (
              <div
                key={categoryName}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* Category Header (Accordion Clickable) */}
                <div
                  onClick={() => toggleCategoryExpand(categoryName)}
                  className="w-full flex items-center justify-between p-4 sm:px-5 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 cursor-pointer transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${meta.badgeBg}`}>
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        {categoryName}
                      </h3>
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                        {items.length} {items.length === 1 ? "Item" : "Items"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenAddModal(categoryName)}
                      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah di Kategori Ini</span>
                    </button>
                  </div>
                </div>

                {/* Items List in Category */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {items.map((guide) => {
                      const isCopied = copiedId === guide.id;
                      const isTemplate =
                        categoryName.toLowerCase().includes("chat") ||
                        categoryName.toLowerCase().includes("pesan") ||
                        categoryName.toLowerCase().includes("wa");

                      return (
                        <div
                          key={guide.id}
                          className="p-4 sm:p-5 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            {/* Left: Title & Content */}
                            <div className="space-y-2.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                  {guide.title}
                                </h4>
                                <span
                                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${meta.pillBg}`}
                                >
                                  {guide.category}
                                </span>
                              </div>

                              {/* Content Display Card */}
                              <div className="relative group">
                                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 font-mono text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                                  {guide.content}
                                </div>
                              </div>
                            </div>

                            {/* Right: Action Buttons (Copy, Edit, Delete) */}
                            <div className="flex items-center gap-2 shrink-0 self-end md:self-start pt-1">
                              {/* Big Copy Button */}
                              <button
                                onClick={() => handleCopyContent(guide)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                                  isCopied
                                    ? "bg-emerald-600 text-white ring-2 ring-emerald-500/30"
                                    : isTemplate
                                    ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                                    : "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                                }`}
                                title="Salin teks ke clipboard"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin Teks</span>
                                  </>
                                )}
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEditModal(guide)}
                                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                title="Edit Panduan"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setDeleteConfirmGuide(guide)}
                                className="p-2 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                                title="Hapus Panduan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form: Create / Edit Guide */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingGuide ? "Edit Panduan Kerja / Template" : "Tambah Panduan / Template Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuide} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {formError}
                </div>
              )}

              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Kategori
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                >
                  <option value="Template Chat">Template Chat (WhatsApp / Pelanggan)</option>
                  <option value="SOP/Alur Kerja">SOP / Alur Kerja Operasional</option>
                  <option value="Instruksi Setting & Cetak">Instruksi Setting & Cetak Mesin</option>
                  <option value="Panduan Kasir & Nota">Panduan Kasir & Nota Tagihan</option>
                  {categories
                    .filter(
                      (c) =>
                        ![
                          "Template Chat",
                          "SOP/Alur Kerja",
                          "Instruksi Setting & Cetak",
                          "Panduan Kasir & Nota",
                        ].includes(c)
                    )
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  <option value="__custom__">+ Tambah Kategori Baru (Kustom)...</option>
                </select>

                {formCategory === "__custom__" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Ketik nama kategori baru (contoh: SOP Finishing & Packing)"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Judul Panduan / Template
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Tagihan DP Pembayaran BCA, atau SOP Penerimaan File Desain"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              {/* Content textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Isi Konten (Teks Template / Langkah SOP)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Mendukung placeholder [Nama Pelanggan], nomor, dsb.
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Tuliskan format chat WA lengkap atau butir-butir instruksi SOP kerja di sini..."
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
                  required
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-xs cursor-pointer inline-flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{editingGuide ? "Simpan Perubahan" : "Tambah Panduan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {deleteConfirmGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Panduan Kerja?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Apakah Anda yakin ingin menghapus{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  "{deleteConfirmGuide.title}"
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmGuide(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteGuide}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                {isDeleting && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
