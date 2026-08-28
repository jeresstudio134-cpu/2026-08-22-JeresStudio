import React, { useState, useEffect, useMemo } from "react";
import { Product, MarginThresholdSettings } from "../../types/index.js";
import { api } from "../../lib/api.js";
import { formatRupiah } from "../../lib/utils.js";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Tag,
  Image as ImageIcon,
  Upload,
  AlertCircle,
  Sparkles,
  Star,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  Link as LinkIcon,
  Layers,
  Building2,
  Settings,
  TrendingUp,
} from "lucide-react";
import { ImagePreviewLightbox } from "../../components/ImagePreviewLightbox.js";
import { ManageProductVendorsModal } from "../../components/ManageProductVendorsModal.js";
import { MarginThresholdModal } from "../../components/MarginThresholdModal.js";

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("all");
  const [sortBy, setSortBy] = useState<"nama" | "hargaAsc" | "hargaDesc">("nama");

  // Margin Thresholds State
  const [marginThresholds, setMarginThresholds] = useState<MarginThresholdSettings>({
    margin_threshold_good: 20,
    margin_threshold_warning: 10,
  });
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);

  // Vendor Management Modal State
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [selectedProductForVendor, setSelectedProductForVendor] = useState<Product | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    kategori: "stiker",
    nama_item: "",
    deskripsi: "",
    satuan: "pcs",
    harga: 0,
    harga_minimum_qty: 1,
    gambar_url: "",
    images: [] as string[],
    is_active: true,
    tampilkan_harga_publik: true,
  });
  const [manualUrlInput, setManualUrlInput] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Lightbox Preview State for Admin Table
  const [previewLightbox, setPreviewLightbox] = useState<{
    isOpen: boolean;
    images: string[];
    title: string;
    subtitle?: string;
  }>({
    isOpen: false,
    images: [],
    title: "",
    subtitle: "",
  });

  const defaultCategoryList = useMemo(() => [
    { id: "stiker", label: "Stiker & Cutting" },
    { id: "dtf", label: "DTF & Sablon Kaos" },
    { id: "banner", label: "Banner & Spanduk" },
    { id: "jersey", label: "Jersey Custom" },
    { id: "desain", label: "Jasa Desain" },
    { id: "lainnya", label: "Lainnya" },
  ], []);

  const categories = useMemo(() => {
    const list = [{ id: "all", label: "Semua Kategori" }];
    const seen = new Set<string>();
    defaultCategoryList.forEach((c) => {
      list.push(c);
      seen.add(c.id.toLowerCase());
    });
    products.forEach((p) => {
      if (p.kategori) {
        const k = p.kategori.toLowerCase().trim();
        if (!seen.has(k)) {
          seen.add(k);
          const label = p.kategori.charAt(0).toUpperCase() + p.kategori.slice(1);
          list.push({ id: k, label });
        }
      }
    });
    return list;
  }, [products, defaultCategoryList]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts({ activeOnly: false });
      setProducts(res.products);
    } catch (err) {
      console.error("Fetch products error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThresholds = async () => {
    try {
      const res = await api.getMarginThresholds();
      setMarginThresholds({
        margin_threshold_good: Number(res.margin_threshold_good ?? 20),
        margin_threshold_warning: Number(res.margin_threshold_warning ?? 10),
      });
    } catch (err) {
      console.error("Fetch margin thresholds error:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchThresholds();
  }, []);

  const handleOpenVendorModal = (prod: Product) => {
    setSelectedProductForVendor(prod);
    setVendorModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setFormData({
      kategori: "stiker",
      nama_item: "",
      deskripsi: "",
      satuan: "meter",
      harga: 50000,
      harga_minimum_qty: 1,
      gambar_url: "",
      images: [],
      is_active: true,
      tampilkan_harga_publik: true,
    });
    setManualUrlInput("");
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    const existingImages = Array.isArray(prod.images) && prod.images.length > 0
      ? prod.images
      : (prod.gambar_url ? [prod.gambar_url] : []);

    setFormData({
      kategori: prod.kategori,
      nama_item: prod.nama_item,
      deskripsi: prod.deskripsi || "",
      satuan: prod.satuan || "pcs",
      harga: prod.harga,
      harga_minimum_qty: prod.harga_minimum_qty || 1,
      gambar_url: prod.gambar_url || (existingImages[0] || ""),
      images: existingImages,
      is_active: prod.is_active,
      tampilkan_harga_publik: prod.tampilkan_harga_publik,
    });
    setManualUrlInput("");
    setFormError(null);
    setModalOpen(true);
  };

  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [productPasteNotice, setProductPasteNotice] = useState<string | null>(null);

  // Helper to add single or multiple image URLs / Base64 into formData.images
  const addImagesToList = (newImages: string[]) => {
    if (!newImages || newImages.length === 0) return;
    setFormData((prev) => {
      const merged = [...prev.images, ...newImages];
      return {
        ...prev,
        images: merged,
        gambar_url: merged[0] || "",
      };
    });
    setProductPasteNotice(`✓ Berhasil menambahkan ${newImages.length} gambar!`);
    setTimeout(() => setProductPasteNotice(null), 3000);
  };

  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const processImageFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));

    if (validFiles.length === 0) {
      setFormError("Mohon upload file gambar yang valid (PNG, JPG, WebP, dsb).");
      return;
    }

    try {
      setIsUploadingImages(true);
      setProductPasteNotice("Mengunggah & mengompres gambar...");

      const uploadedUrls: string[] = [];

      for (const file of validFiles) {
        // Read file as base64
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        try {
          // Upload to Cloudinary / server
          const uploadRes = await api.uploadImage(dataUrl, file.name);
          uploadedUrls.push(uploadRes.url);
        } catch {
          // Fallback to dataUrl directly if offline or error
          uploadedUrls.push(dataUrl);
        }
      }

      addImagesToList(uploadedUrls);
    } catch (err: any) {
      setFormError("Gagal memproses gambar: " + (err.message || "Unknown error"));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleImageFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(e.target.files);
      e.target.value = ""; // Reset input so same files can be re-uploaded
    }
  };

  const handleAddManualUrl = () => {
    const trimmed = manualUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image/")) {
      setFormError("URL gambar harus dimulai dengan http://, https://, atau data:image/");
      return;
    }
    addImagesToList([trimmed]);
    setManualUrlInput("");
    setFormError(null);
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const updated = [...prev.images];
      const [selected] = updated.splice(index, 1);
      updated.unshift(selected);
      return {
        ...prev,
        images: updated,
        gambar_url: updated[0] || "",
      };
    });
  };

  const handleMoveImage = (index: number, direction: "left" | "right") => {
    setFormData((prev) => {
      const updated = [...prev.images];
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;

      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      return {
        ...prev,
        images: updated,
        gambar_url: updated[0] || "",
      };
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const updated = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: updated,
        gambar_url: updated[0] || "",
      };
    });
  };

  // Keyboard Ctrl+V listener when modal is open
  useEffect(() => {
    if (!modalOpen) return;

    const handleModalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        processImageFiles(pastedFiles);
        return;
      }

      // Check if text was pasted and it's a URL
      const text = e.clipboardData?.getData("text");
      if (text && (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("data:image/"))) {
        // If active element is not the manual URL input
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          addImagesToList([text.trim()]);
        }
      }
    };

    window.addEventListener("paste", handleModalPaste);
    return () => window.removeEventListener("paste", handleModalPaste);
  }, [modalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_item || !formData.harga) {
      setFormError("Nama item dan harga satuan wajib diisi.");
      return;
    }

    const resolvedKategori = isCustomCategory
      ? customCategoryName.trim().toLowerCase()
      : formData.kategori.trim().toLowerCase();

    if (isCustomCategory && !customCategoryName.trim()) {
      setFormError("Nama kategori baru wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      
      const payload = {
        ...formData,
        kategori: resolvedKategori || "lainnya",
        gambar_url: formData.images[0] || "",
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
      } else {
        await api.createProduct(payload);
      }
      setModalOpen(false);
      setIsCustomCategory(false);
      setCustomCategoryName("");
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data produk.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Hapus item "${name}" dari price list?`)) {
      try {
        await api.deleteProduct(id);
        fetchProducts();
      } catch (err: any) {
        alert(err.message || "Gagal menghapus produk");
      }
    }
  };

  const handleToggle = async (id: number, field: "is_active" | "tampilkan_harga_publik") => {
    try {
      await api.toggleProduct(id, field);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status");
    }
  };

  const handleOpenTableLightbox = (prod: Product) => {
    const prodImages = Array.isArray(prod.images) && prod.images.length > 0
      ? prod.images
      : (prod.gambar_url ? [prod.gambar_url] : []);

    if (prodImages.length === 0) return;

    setPreviewLightbox({
      isOpen: true,
      images: prodImages,
      title: prod.nama_item,
      subtitle: `${prod.kategori.toUpperCase()} • ${formatRupiah(prod.harga)} / ${prod.satuan}`,
    });
  };

  // Helper to render margin badge with thresholds
  const renderMarginCell = (prod: Product) => {
    const defaultVendor = prod.default_vendor;
    if (!defaultVendor || defaultVendor.harga_modal === undefined) {
      return (
        <button
          onClick={() => handleOpenVendorModal(prod)}
          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> Pasang Vendor
        </button>
      );
    }

    const hargaJual = prod.harga || 0;
    const hargaModal = defaultVendor.harga_modal || 0;
    const marginNominal = hargaJual - hargaModal;
    const marginPersen = hargaJual > 0 ? ((hargaJual - hargaModal) / hargaJual) * 100 : 0;

    const good = marginThresholds.margin_threshold_good ?? 20;
    const warning = marginThresholds.margin_threshold_warning ?? 10;

    let badgeClass = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";

    if (marginPersen >= good) {
      badgeClass = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    } else if (marginPersen >= warning) {
      badgeClass = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    }

    return (
      <div className="flex flex-col items-start gap-1">
        <div className="text-[11px] text-slate-500 font-mono">
          Modal: <span className="font-bold text-slate-700 dark:text-slate-300">{formatRupiah(hargaModal)}</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${badgeClass}`}
          title={`Margin Profit: ${formatRupiah(marginNominal)} (${marginPersen.toFixed(1)}%)`}
        >
          {marginNominal >= 0 ? "+" : ""}
          {formatRupiah(marginNominal)} ({marginPersen.toFixed(1)}%)
        </span>
      </div>
    );
  };

  const filteredAndSortedProducts = products
    .filter((p) => {
      const matchCat = selectedKategori === "all" || p.kategori.toLowerCase() === selectedKategori.toLowerCase();
      const matchSearch =
        search === "" ||
        p.nama_item.toLowerCase().includes(search.toLowerCase()) ||
        (p.deskripsi && p.deskripsi.toLowerCase().includes(search.toLowerCase())) ||
        (p.default_vendor && p.default_vendor.nama_vendor.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "hargaAsc") return a.harga - b.harga;
      if (sortBy === "hargaDesc") return b.harga - a.harga;
      return a.nama_item.localeCompare(b.nama_item);
    });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Manajemen Price List & Produk
          </h2>
          <p className="text-xs text-slate-500">
            Kelola katalog item cetak, multi-vendor supply, analisis margin profit, dan ketersediaan publik
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Margin Thresholds Button */}
          <button
            onClick={() => setThresholdModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
            title="Konfigurasi ambang batas warna margin profit"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Batas Margin</span>
          </button>

          {/* Add Product Button */}
          <button
            id="btn-tambah-produk"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Item Produk</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk atau vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="nama">Urutkan: Nama (A-Z)</option>
            <option value="hargaAsc">Urutkan: Harga Terendah</option>
            <option value="hargaDesc">Urutkan: Harga Tertinggi</option>
          </select>
        </div>
      </div>

      {/* Products Display: Desktop Table (hidden md:block) & Mobile Card List (block md:hidden) */}
      
      {/* 1. Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {filteredAndSortedProducts.length > 0 ? (
          filteredAndSortedProducts.map((prod) => {
            const prodImages = Array.isArray(prod.images) && prod.images.length > 0
              ? prod.images
              : (prod.gambar_url ? [prod.gambar_url] : []);
            const coverImg = prodImages[0] || prod.gambar_url;
            const totalImages = prodImages.length;
            const defaultVendor = prod.default_vendor;
            const vendorCount = prod.vendor_count || (prod.product_vendors?.length ?? (defaultVendor ? 1 : 0));

            return (
              <div
                key={prod.id}
                className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                {/* Header: Image & Basic Details */}
                <div className="flex items-start gap-3">
                  {/* Thumbnail with Lightbox */}
                  {coverImg ? (
                    <div
                      onClick={() => handleOpenTableLightbox(prod)}
                      className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 group cursor-pointer border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs"
                      title="Klik untuk melihat preview galeri foto"
                    >
                      <img
                        src={coverImg}
                        alt={prod.nama_item}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 active:opacity-100 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-4 h-4 text-white drop-shadow-sm" />
                      </div>
                      {totalImages > 1 && (
                        <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-slate-900/90 text-white text-[9px] font-bold rounded-tl font-mono border-t border-l border-white/20">
                          {totalImages}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-slate-700">
                      <Tag className="w-5 h-5" />
                    </div>
                  )}

                  {/* Info: Title, Category, Price */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {prod.kategori}
                      </span>
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {formatRupiah(prod.harga)}
                        <span className="text-[10px] text-slate-400 font-sans font-normal"> /{prod.satuan}</span>
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                      {prod.nama_item}
                    </h4>

                    {prod.deskripsi && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {prod.deskripsi}
                      </p>
                    )}

                    {totalImages > 1 && (
                      <button
                        onClick={() => handleOpenTableLightbox(prod)}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold hover:underline"
                      >
                        <Layers className="w-3 h-3" />
                        {totalImages} Foto Galeri
                      </button>
                    )}
                  </div>
                </div>

                {/* Vendor & Margin Box */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>Vendor Supplier</span>
                      </div>
                      {defaultVendor ? (
                        <div className="mt-0.5">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {defaultVendor.nama_vendor}
                          </p>
                          <button
                            onClick={() => handleOpenVendorModal(prod)}
                            className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            {vendorCount > 1 ? `${vendorCount} Vendor Terhubung` : "Kelola Vendor"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenVendorModal(prod)}
                          className="mt-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Hubungkan Vendor
                        </button>
                      )}
                    </div>

                    {/* Margin Info on Mobile */}
                    <div className="shrink-0 text-right">
                      {renderMarginCell(prod)}
                    </div>
                  </div>
                </div>

                {/* Footer: Quick Status Toggles & Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {/* Status Badges / Toggles */}
                  <div className="flex items-center gap-1.5">
                    {/* Tampil Publik Toggle */}
                    <button
                      onClick={() => handleToggle(prod.id, "tampilkan_harga_publik")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors border ${
                        prod.tampilkan_harga_publik
                          ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                          : "text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                      title={prod.tampilkan_harga_publik ? "Harga publik ditampilkan" : "Harga publik disembunyikan"}
                    >
                      {prod.tampilkan_harga_publik ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3" />}
                      <span>{prod.tampilkan_harga_publik ? "Publik" : "Privat"}</span>
                    </button>

                    {/* Status Aktif Toggle */}
                    <button
                      onClick={() => handleToggle(prod.id, "is_active")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors border ${
                        prod.is_active
                          ? "text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"
                          : "text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                      title={prod.is_active ? "Produk Aktif" : "Produk Nonaktif"}
                    >
                      {prod.is_active ? <CheckCircle className="w-3 h-3 text-blue-600" /> : <XCircle className="w-3 h-3" />}
                      <span>{prod.is_active ? "Aktif" : "Nonaktif"}</span>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenVendorModal(prod)}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                      title="Kelola Vendor & Harga Modal"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                      title="Edit Produk"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id, prod.nama_item)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors border border-rose-200 dark:border-rose-800/80"
                      title="Hapus Produk"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            Tidak ada produk ditemukan
          </div>
        )}
      </div>

      {/* 2. Desktop Products Table (hidden on mobile) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="py-3 px-4 w-16 text-center">Gambar</th>
                <th className="py-3 px-4">Nama Produk & Deskripsi</th>
                <th className="py-3 px-4">Kategori & Satuan</th>
                <th className="py-3 px-4 text-right">Harga Resmi</th>
                <th className="py-3 px-4">Vendor Utama</th>
                <th className="py-3 px-4">Modal & Margin</th>
                <th className="py-3 px-4 text-center">Tampil Publik</th>
                <th className="py-3 px-4 text-center">Status Aktif</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.map((prod) => {
                  const prodImages = Array.isArray(prod.images) && prod.images.length > 0
                    ? prod.images
                    : (prod.gambar_url ? [prod.gambar_url] : []);
                  const coverImg = prodImages[0] || prod.gambar_url;
                  const totalImages = prodImages.length;
                  const defaultVendor = prod.default_vendor;
                  const vendorCount = prod.vendor_count || (prod.product_vendors?.length ?? (defaultVendor ? 1 : 0));

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        {coverImg ? (
                          <div
                            onClick={() => handleOpenTableLightbox(prod)}
                            className="relative w-12 h-12 rounded-lg overflow-hidden group cursor-pointer border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                            title="Klik untuk melihat preview galeri foto"
                          >
                            <img
                              src={coverImg}
                              alt={prod.nama_item}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn className="w-4 h-4 text-white drop-shadow-sm" />
                            </div>
                            {totalImages > 1 && (
                              <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-slate-900/90 text-white text-[9px] font-bold rounded-tl font-mono border-t border-l border-white/20">
                                {totalImages}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <Tag className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white text-xs">{prod.nama_item}</p>
                        {prod.deskripsi && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{prod.deskripsi}</p>
                        )}
                        {totalImages > 1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                            <Layers className="w-3 h-3" />
                            {totalImages} Foto Galeri
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {prod.kategori}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            /{prod.satuan}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                        {formatRupiah(prod.harga)}
                      </td>

                      {/* Vendor Column */}
                      <td className="py-3 px-4">
                        {defaultVendor ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white text-xs">
                                {defaultVendor.nama_vendor}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenVendorModal(prod)}
                                className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Building2 className="w-3 h-3" />
                                {vendorCount > 1 ? `${vendorCount} Vendor Terhubung` : "Kelola Vendor"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenVendorModal(prod)}
                            className="text-[11px] font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>+ Hubungkan</span>
                          </button>
                        )}
                      </td>

                      {/* Modal & Margin Column */}
                      <td className="py-3 px-4">
                        {renderMarginCell(prod)}
                      </td>

                      {/* Tampil Publik Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggle(prod.id, "tampilkan_harga_publik")}
                          className={`p-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            prod.tampilkan_harga_publik
                              ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                              : "text-slate-400 bg-slate-100 dark:bg-slate-800"
                          }`}
                          title={prod.tampilkan_harga_publik ? "Harga ditampilkan di website" : "Harga disembunyikan"}
                        >
                          {prod.tampilkan_harga_publik ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Status Aktif Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggle(prod.id, "is_active")}
                          className={`p-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            prod.is_active
                              ? "text-blue-700 bg-blue-50 dark:bg-blue-950/40"
                              : "text-slate-400 bg-slate-100 dark:bg-slate-800"
                          }`}
                          title={prod.is_active ? "Produk Aktif" : "Produk Nonaktif"}
                        >
                          {prod.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Kelola Vendor Quick Action */}
                          <button
                            onClick={() => handleOpenVendorModal(prod)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                            title="Kelola Vendor & Harga Modal"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                            title="Edit Produk"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id, prod.nama_item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada produk ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingProduct ? "Edit Item Produk" : "Tambah Item Produk Baru"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dukung multiple gambar produk, atur cover utama, dan drag & drop file
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Kategori Item *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(!isCustomCategory);
                        if (isCustomCategory) {
                          setCustomCategoryName("");
                        }
                      }}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isCustomCategory ? "← Pilih Kategori" : "+ Kategori Baru"}
                    </button>
                  </div>

                  {isCustomCategory ? (
                    <input
                      type="text"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="Ketik kategori baru (cth: Sablon Topi, Box Packaging)"
                      className="w-full px-3 py-2 rounded-lg bg-indigo-50/50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <select
                      value={formData.kategori}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setIsCustomCategory(true);
                          setCustomCategoryName("");
                        } else {
                          setFormData({ ...formData, kategori: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    >
                      {categories
                        .filter((c) => c.id !== "all")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      <option value="__new__" className="text-indigo-600 dark:text-indigo-400 font-bold">
                        + Tambah Kategori Baru...
                      </option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Satuan *
                  </label>
                  <select
                    value={formData.satuan}
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="pcs">Pcs (Satuan)</option>
                    <option value="meter">Meter (m² / lari)</option>
                    <option value="lembar">Lembar (A3 / A4)</option>
                    <option value="lusin">Lusin</option>
                    <option value="paket">Paket / Set</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Item Produk *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Stiker Vinyl Glossy Meteran (Print + Cut)"
                  value={formData.nama_item}
                  onChange={(e) => setFormData({ ...formData, nama_item: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Harga Satuan (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.harga}
                    onChange={(e) => setFormData({ ...formData, harga: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Order Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.harga_minimum_qty}
                    onChange={(e) => setFormData({ ...formData, harga_minimum_qty: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi & Spesifikasi
                </label>
                <textarea
                  rows={3}
                  placeholder="Keterangan bahan, finishing, ketebalan, dsb..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Multiple Images Upload & Management Area */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Galeri Foto Produk ({formData.images.length} Gambar)
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    <Sparkles className="w-3 h-3" />
                    Bisa Upload Banyak / Paste (Ctrl+V)
                  </span>
                </div>

                {productPasteNotice && (
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>{productPasteNotice}</span>
                  </div>
                )}

                {/* Drag and Drop Zone + Upload Input */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(true);
                  }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      processImageFiles(e.dataTransfer.files);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 border-dashed text-center transition-all ${
                    isDraggingImage
                      ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40"
                      : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-400 dark:hover:border-indigo-600"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        Drag & drop beberapa foto di sini, atau klik tombol di bawah
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mendukung PNG, JPG, WebP. Bisa juga tekan <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">Ctrl+V</kbd> langsung.
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-xs transition-colors mt-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Pilih File (Bisa Banyak)</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageFileInputChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Manual URL Input Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Atau tambahkan URL gambar (https://...)"
                      value={manualUrlInput}
                      onChange={(e) => setManualUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddManualUrl();
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddManualUrl}
                    className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    + Tambah URL
                  </button>
                </div>

                {/* Image List Preview with Ordering & Cover Badge */}
                {formData.images.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Daftar Gambar ({formData.images.length})</span>
                      <span className="italic">Foto #1 otomatis menjadi Cover Utama katalog</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
                      {formData.images.map((img, idx) => {
                        const isCover = idx === 0;
                        return (
                          <div
                            key={idx}
                            className={`relative rounded-xl border overflow-hidden group bg-slate-100 dark:bg-slate-800 transition-all ${
                              isCover
                                ? "border-indigo-500 ring-2 ring-indigo-500/30 shadow-md"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-400"
                            }`}
                          >
                            <img
                              src={img}
                              alt={`Item ${idx + 1}`}
                              className="w-full h-24 object-cover"
                              referrerPolicy="no-referrer"
                            />

                            {/* Cover Badge */}
                            {isCover && (
                              <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-bold shadow-xs">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                <span>Cover</span>
                              </div>
                            )}

                            {/* Position Number */}
                            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>

                            {/* Overlay Controls */}
                            <div className="p-1.5 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-1">
                              {!isCover ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetCover(idx)}
                                  className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                                  title="Jadikan Foto Utama (Cover)"
                                >
                                  <Star className="w-3 h-3" />
                                  Cover
                                </button>
                              ) : (
                                <span className="text-[10px] text-indigo-600 font-bold">Utama</span>
                              )}

                              <div className="flex items-center gap-0.5">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, "left")}
                                    className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-white rounded"
                                    title="Geser ke Kiri"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {idx < formData.images.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, "right")}
                                    className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-white rounded"
                                    title="Geser ke Kendali Kanan"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded ml-0.5"
                                  title="Hapus foto ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 text-center italic">
                    Belum ada gambar ditambahkan. Produk tanpa gambar akan menampilkan icon placeholder.
                  </p>
                )}
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Produk Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tampilkan_harga_publik}
                    onChange={(e) => setFormData({ ...formData, tampilkan_harga_publik: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Tampilkan di Web Publik</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal for Admin Table */}
      <ImagePreviewLightbox
        isOpen={previewLightbox.isOpen}
        onClose={() => setPreviewLightbox((prev) => ({ ...prev, isOpen: false }))}
        images={previewLightbox.images}
        title={previewLightbox.title}
        subtitle={previewLightbox.subtitle}
      />

      {/* Manage Product Vendors Modal */}
      <ManageProductVendorsModal
        product={selectedProductForVendor}
        isOpen={vendorModalOpen}
        onClose={() => {
          setVendorModalOpen(false);
          setSelectedProductForVendor(null);
        }}
        onUpdated={fetchProducts}
        marginThresholds={marginThresholds}
      />

      {/* Margin Thresholds Settings Modal */}
      <MarginThresholdModal
        isOpen={thresholdModalOpen}
        onClose={() => setThresholdModalOpen(false)}
        currentSettings={marginThresholds}
        onSaved={(newSettings) => {
          setMarginThresholds(newSettings);
          fetchProducts();
        }}
      />
    </div>
  );
};

