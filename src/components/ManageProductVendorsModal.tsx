import React, { useState, useEffect } from "react";
import { Product, ProductVendor, Vendor, MarginThresholdSettings } from "../types/index.js";
import { api } from "../lib/api.js";
import { formatRupiah } from "../lib/utils.js";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Building2,
  Star,
  Phone,
  ExternalLink,
  Link as LinkIcon,
  Save,
} from "lucide-react";

interface ManageProductVendorsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  marginThresholds: MarginThresholdSettings;
}

export const ManageProductVendorsModal: React.FC<ManageProductVendorsModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdated,
  marginThresholds,
}) => {
  const [productVendors, setProductVendors] = useState<ProductVendor[]>([]);
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Vendor to Product Form State
  const [selectedVendorId, setSelectedVendorId] = useState<number | "">("");
  const [hargaModalInput, setHargaModalInput] = useState<number | "">("");
  const [catatanInput, setCatatanInput] = useState("");
  const [isDefaultInput, setIsDefaultInput] = useState(false);

  // Quick Create New Vendor in System Inline State
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorNama, setNewVendorNama] = useState("");
  const [newVendorKontak, setNewVendorKontak] = useState("");
  const [newVendorLink, setNewVendorLink] = useState("");
  const [newVendorCatatan, setNewVendorCatatan] = useState("");

  // Unified Edit Form State (Nama, Kontak, Link, Harga Modal, Catatan)
  const [editingPvId, setEditingPvId] = useState<number | null>(null);
  const [editVendorNama, setEditVendorNama] = useState<string>("");
  const [editVendorKontak, setEditVendorKontak] = useState<string>("");
  const [editVendorLink, setEditVendorLink] = useState<string>("");
  const [editHargaModal, setEditHargaModal] = useState<number>(0);
  const [editCatatan, setEditCatatan] = useState<string>("");

  const fetchProductVendorsAndVendors = async () => {
    if (!product) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const [pvRes, vRes] = await Promise.all([
        api.getProductVendors(product.id),
        api.getVendors(),
      ]);
      setProductVendors(pvRes.product_vendors || []);
      setAvailableVendors(vRes.vendors || []);
    } catch (err: any) {
      console.error("Error fetching product vendors:", err);
      setErrorMessage(err.message || "Gagal memuat data vendor produk.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && product) {
      fetchProductVendorsAndVendors();
      setSelectedVendorId("");
      setHargaModalInput("");
      setCatatanInput("");
      setIsDefaultInput(false);
      setShowNewVendorForm(false);
      setEditingPvId(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const productPrice = product.harga || 0;

  // Margin calculation helper
  const getMarginInfo = (hargaModal: number) => {
    const nominal = productPrice - hargaModal;
    const persen = productPrice > 0 ? ((productPrice - hargaModal) / productPrice) * 100 : 0;
    const good = marginThresholds.margin_threshold_good ?? 20;
    const warning = marginThresholds.margin_threshold_warning ?? 10;

    let colorClass = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    let statusLabel = "Kritis";

    if (persen >= good) {
      colorClass = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      statusLabel = "Sehat";
    } else if (persen >= warning) {
      colorClass = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      statusLabel = "Tipis";
    }

    return {
      nominal,
      persen: persen.toFixed(1),
      colorClass,
      statusLabel,
      isPositive: nominal >= 0,
    };
  };

  // Helper to format URL
  const formatUrl = (url?: string) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  // Handle setting a vendor as default
  const handleSetDefault = async (pv: ProductVendor) => {
    try {
      setActionLoading(true);
      await api.updateProductVendor(pv.id, { is_default: true });
      setSuccessMessage(`✓ Vendor "${pv.nama_vendor}" dijadikan vendor default.`);
      await fetchProductVendorsAndVendors();
      onUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengubah vendor default.");
    } finally {
      setActionLoading(false);
    }
  };

  // Start editing a vendor row
  const handleStartEdit = (pv: ProductVendor) => {
    if (editingPvId === pv.id) {
      setEditingPvId(null);
    } else {
      const v = availableVendors.find((item) => item.id === pv.vendor_id);
      setEditingPvId(pv.id);
      setEditVendorNama(pv.nama_vendor || v?.nama_vendor || "");
      setEditVendorKontak(pv.kontak || pv.no_wa || v?.kontak || v?.no_wa || "");
      setEditVendorLink(pv.link || v?.link || "");
      setEditHargaModal(pv.harga_modal);
      setEditCatatan(pv.catatan || "");
    }
  };

  // Handle saving unified edit (Nama, Kontak, Link, Harga Modal, Catatan)
  const handleSaveUnifiedEdit = async (pv: ProductVendor) => {
    if (!editVendorNama.trim()) {
      setErrorMessage("Nama vendor tidak boleh kosong.");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage(null);

      // 1. Update vendor master data (Nama, Kontak, Link)
      await api.updateVendor(pv.vendor_id, {
        nama_vendor: editVendorNama.trim(),
        kontak: editVendorKontak.trim(),
        no_wa: editVendorKontak.trim(),
        link: editVendorLink.trim(),
      });

      // 2. Update product_vendor relation (Harga Modal, Catatan)
      await api.updateProductVendor(pv.id, {
        harga_modal: Number(editHargaModal),
        catatan: editCatatan.trim(),
      });

      setEditingPvId(null);
      setSuccessMessage(`✓ Data vendor "${editVendorNama.trim()}" & harga modal berhasil disimpan!`);
      await fetchProductVendorsAndVendors();
      onUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memperbarui data vendor.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle deleting relation
  const handleDeleteProductVendor = async (pv: ProductVendor) => {
    if (!window.confirm(`Hapus relasi vendor "${pv.nama_vendor}" dari produk ini?`)) {
      return;
    }
    try {
      setActionLoading(true);
      await api.deleteProductVendor(pv.id);
      setSuccessMessage(`✓ Relasi vendor "${pv.nama_vendor}" berhasil dihapus.`);
      await fetchProductVendorsAndVendors();
      onUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menghapus vendor.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle adding vendor to product
  const handleAddVendorToProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || hargaModalInput === "" || Number(hargaModalInput) < 0) {
      setErrorMessage("Pilih vendor dan masukkan harga modal yang valid.");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage(null);
      await api.addProductVendor(product.id, {
        vendor_id: Number(selectedVendorId),
        harga_modal: Number(hargaModalInput),
        catatan: catatanInput.trim(),
        is_default: isDefaultInput || productVendors.length === 0,
      });

      setSelectedVendorId("");
      setHargaModalInput("");
      setCatatanInput("");
      setIsDefaultInput(false);
      setSuccessMessage("✓ Vendor berhasil ditambahkan ke produk!");
      await fetchProductVendorsAndVendors();
      onUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menambahkan vendor ke produk.");
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Register New Vendor in System
  const handleCreateNewVendorInSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorNama.trim()) {
      setErrorMessage("Nama vendor baru wajib diisi.");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage(null);
      const res = await api.createVendor({
        nama_vendor: newVendorNama.trim(),
        kontak: newVendorKontak.trim(),
        no_wa: newVendorKontak.trim(),
        link: newVendorLink.trim(),
        catatan: newVendorCatatan.trim(),
        kategori_supply: "Lainnya",
      });

      const newVendor = res.vendor;
      setAvailableVendors((prev) => [...prev, newVendor]);
      setSelectedVendorId(newVendor.id);
      setShowNewVendorForm(false);
      setNewVendorNama("");
      setNewVendorKontak("");
      setNewVendorLink("");
      setNewVendorCatatan("");
      setSuccessMessage(`✓ Vendor baru "${newVendor.nama_vendor}" berhasil didaftarkan dan dipilih!`);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat vendor baru.");
    } finally {
      setActionLoading(false);
    }
  };

  // Preview margin for the input form
  const inputMarginPreview =
    hargaModalInput !== "" && Number(hargaModalInput) >= 0
      ? getMarginInfo(Number(hargaModalInput))
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Kelola Vendor & Harga Modal
                </h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {product.kategori}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Produk: <span className="text-slate-900 dark:text-white font-semibold">{product.nama_item}</span> &bull; Harga Jual: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatRupiah(product.harga)}</span> / {product.satuan}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Section 1: Daftar Vendor untuk Produk ini */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Daftar Vendor Terdaftar ({productVendors.length})
                </h4>
                <span className="text-[11px] text-slate-500">
                  (Pilih satu sebagai vendor default acuan perhitungan margin utama)
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memuat data vendor...
              </div>
            ) : productVendors.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/20">
                <Building2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Belum ada vendor yang dihubungkan ke produk ini.
                </p>
                <p className="text-[11px] text-slate-400">
                  Gunakan formulir di bawah untuk menambahkan vendor supplier dan harga modalnya.
                </p>
              </div>
            ) : (
              <div>
                {/* 1. Mobile Cards View (block md:hidden) */}
                <div className="block md:hidden space-y-3">
                  {productVendors.map((pv) => {
                    const isEditing = editingPvId === pv.id;
                    const currentModal = isEditing ? editHargaModal : pv.harga_modal;
                    const margin = getMarginInfo(currentModal);
                    const fullLink = formatUrl(pv.link);

                    return (
                      <div
                        key={pv.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isEditing
                            ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 shadow-sm"
                            : pv.is_default
                            ? "bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {!isEditing ? (
                          <div className="space-y-2.5">
                            {/* Header: Name, Default Badge, Default Star */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    {pv.nama_vendor}
                                  </span>
                                  {pv.is_default && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-600 text-white uppercase tracking-wider">
                                      Default
                                    </span>
                                  )}
                                </div>

                                {(pv.kontak || pv.no_wa) && (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="font-mono">{pv.kontak || pv.no_wa}</span>
                                  </div>
                                )}

                                {fullLink && (
                                  <a
                                    href={fullLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5 bg-indigo-50/80 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Buka Link Toko</span>
                                  </a>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => !pv.is_default && handleSetDefault(pv)}
                                disabled={actionLoading || pv.is_default}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  pv.is_default
                                    ? "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/60 border-indigo-300 dark:border-indigo-700"
                                    : "text-slate-400 hover:text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                }`}
                                title={pv.is_default ? "Vendor Default" : "Jadikan Vendor Default"}
                              >
                                <Star className={`w-3.5 h-3.5 ${pv.is_default ? "fill-indigo-600 dark:fill-indigo-400" : ""}`} />
                              </button>
                            </div>

                            {/* Pricing & Margin info */}
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Harga Modal</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {formatRupiah(pv.harga_modal)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-medium">Margin Profit</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${margin.colorClass}`}>
                                  {margin.nominal >= 0 ? "+" : ""}{formatRupiah(margin.nominal)} ({margin.persen}%)
                                </span>
                              </div>
                            </div>

                            {/* Catatan if any */}
                            {pv.catatan && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/60 whitespace-pre-wrap">
                                {pv.catatan}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(pv)}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit Data</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProductVendor(pv)}
                                disabled={actionLoading}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                                title="Hapus Relasi Vendor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Unified Inline Edit Form on Mobile */
                          <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                                <Edit2 className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                Edit Vendor & Modal
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase">
                                  Nama Vendor *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={editVendorNama}
                                  onChange={(e) => setEditVendorNama(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase">
                                    No. WA
                                  </label>
                                  <input
                                    type="text"
                                    value={editVendorKontak}
                                    onChange={(e) => setEditVendorKontak(e.target.value)}
                                    placeholder="0812..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase">
                                    Harga Modal (Rp)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editHargaModal}
                                    onChange={(e) => setEditHargaModal(Number(e.target.value))}
                                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase">
                                  Link Web / Toko
                                </label>
                                <input
                                  type="text"
                                  value={editVendorLink}
                                  onChange={(e) => setEditVendorLink(e.target.value)}
                                  placeholder="https://..."
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase">
                                  Catatan Khusus
                                </label>
                                <textarea
                                  rows={3}
                                  value={editCatatan}
                                  onChange={(e) => setEditCatatan(e.target.value)}
                                  placeholder="Catatan..."
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-sans"
                                />
                              </div>

                              {/* Margin Live Badge */}
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">Estimasi Margin:</span>
                                <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border ${margin.colorClass}`}>
                                  {formatRupiah(margin.nominal)} ({margin.persen}%)
                                </span>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setEditingPvId(null)}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveUnifiedEdit(pv)}
                                  disabled={actionLoading}
                                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Simpan</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 2. Desktop Table View (hidden md:block) */}
                <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">Default</th>
                        <th className="py-2.5 px-3">Nama Vendor, Kontak & Link</th>
                        <th className="py-2.5 px-3 text-right">Harga Modal</th>
                        <th className="py-2.5 px-3 text-center">Margin (Profit)</th>
                        <th className="py-2.5 px-3">Catatan Khusus</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {productVendors.map((pv) => {
                        const isEditing = editingPvId === pv.id;
                        const currentModal = isEditing ? editHargaModal : pv.harga_modal;
                        const margin = getMarginInfo(currentModal);
                        const fullLink = formatUrl(pv.link);

                        return (
                          <React.Fragment key={pv.id}>
                            <tr
                              className={`transition-colors ${
                                isEditing
                                  ? "bg-indigo-50/70 dark:bg-indigo-950/30"
                                  : pv.is_default
                                  ? "bg-indigo-50/40 dark:bg-indigo-950/20 font-medium"
                                  : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                              }`}
                            >
                              {/* Default radio column */}
                              <td className="py-3 px-3 text-center align-top">
                                <button
                                  type="button"
                                  onClick={() => !pv.is_default && handleSetDefault(pv)}
                                  disabled={actionLoading || pv.is_default}
                                  className={`p-1 rounded-full transition-all cursor-pointer ${
                                    pv.is_default
                                      ? "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/60"
                                      : "text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  }`}
                                  title={pv.is_default ? "Vendor Default Saat Ini" : "Klik untuk jadikan Vendor Default"}
                                >
                                  <Star className={`w-4 h-4 ${pv.is_default ? "fill-indigo-600 dark:fill-indigo-400" : ""}`} />
                                </button>
                              </td>

                              {/* Vendor Name, Contact & Link */}
                              <td className="py-3 px-3 align-top">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {pv.nama_vendor}
                                    </span>
                                    {pv.is_default && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-600 text-white uppercase tracking-wider">
                                        Default
                                      </span>
                                    )}
                                  </div>

                                  {/* Contact phone */}
                                  {(pv.kontak || pv.no_wa) && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="font-mono">{pv.kontak || pv.no_wa}</span>
                                    </div>
                                  )}

                                  {/* Supplier Link */}
                                  {fullLink && (
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={fullLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline bg-indigo-50/80 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60"
                                        title={fullLink}
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Buka Link / Web Toko</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Harga Modal */}
                              <td className="py-3 px-3 text-right align-top">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {formatRupiah(pv.harga_modal)}
                                </span>
                              </td>

                              {/* Margin Nominal & % */}
                              <td className="py-3 px-3 text-center align-top">
                                <div className="inline-flex flex-col items-center">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border ${margin.colorClass}`}
                                  >
                                    {margin.nominal >= 0 ? "+" : ""}
                                    {formatRupiah(margin.nominal)} ({margin.persen}%)
                                  </span>
                                </div>
                              </td>

                              {/* Catatan Khusus (View Mode) */}
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-[11px] align-top max-w-xs">
                                {pv.catatan ? (
                                  <div className="whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/80 font-sans">
                                    {pv.catatan}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">-</span>
                                )}
                              </td>

                              {/* Actions: Single Edit & Delete */}
                              <td className="py-3 px-3 text-right align-top">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(pv)}
                                    disabled={actionLoading}
                                    className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                      isEditing
                                        ? "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/60"
                                        : "text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                    title="Edit Nama, Kontak, Link, Harga Modal & Catatan"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProductVendor(pv)}
                                    disabled={actionLoading}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                    title="Hapus Relasi Vendor"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* UNIFIED ALL-IN-ONE EDIT PANEL (No extra modal needed!) */}
                            {isEditing && (
                              <tr className="bg-indigo-50/80 dark:bg-indigo-950/40 border-b-2 border-indigo-200 dark:border-indigo-800">
                                <td colSpan={6} className="p-4">
                                  <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-md">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                                          <Edit2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                                            Edit Data Vendor, Kontak, Link & Harga Modal
                                          </span>
                                          <p className="text-[11px] text-slate-500">
                                            Semua data vendor & relasi produk dapat langsung diedit di sini
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Baris 1: Nama Vendor, Kontak WA, Link Online Shop / Web */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                          Nama Vendor / Supplier *
                                        </label>
                                        <input
                                          type="text"
                                          required
                                          value={editVendorNama}
                                          onChange={(e) => setEditVendorNama(e.target.value)}
                                          placeholder="Nama Vendor"
                                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                          <Phone className="w-3 h-3 text-emerald-500" />
                                          No. WA / Telepon
                                        </label>
                                        <input
                                          type="text"
                                          value={editVendorKontak}
                                          onChange={(e) => setEditVendorKontak(e.target.value)}
                                          placeholder="081234567890"
                                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                          <LinkIcon className="w-3 h-3 text-indigo-500" />
                                          Link Web / Toko Online
                                        </label>
                                        <input
                                          type="text"
                                          value={editVendorLink}
                                          onChange={(e) => setEditVendorLink(e.target.value)}
                                          placeholder="https://tokopedia.com/... atau web"
                                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                      </div>
                                    </div>

                                    {/* Baris 2: Harga Modal & Live Margin Calculation */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                          Harga Modal (Rp) *
                                        </label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                                            Rp
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={editHargaModal}
                                            onChange={(e) => setEditHargaModal(Number(e.target.value))}
                                            className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                          Estimasi Margin & Profitabilitas
                                        </label>
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                                          <div>
                                            <span className="text-[10px] text-slate-400 block">Margin Bersih</span>
                                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                                              {formatRupiah(margin.nominal)}
                                            </span>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-[10px] text-slate-400 block">Persentase Margin</span>
                                            <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border ${margin.colorClass}`}>
                                              {margin.persen}% ({margin.statusLabel})
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Baris 3: Catatan Khusus Multi-line Tampil Penuh */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                          Catatan Khusus Produk Ini (Tampil Penuh untuk Dikoreksi)
                                        </label>
                                        <span className="text-[10px] text-slate-400">
                                          Semua tulisan terlihat lapang & mudah diperiksa
                                        </span>
                                      </div>
                                      <textarea
                                        rows={4}
                                        value={editCatatan}
                                        onChange={(e) => setEditCatatan(e.target.value)}
                                        placeholder="Contoh: Min order 5 lembar, estimasi pengerjaan 2 hari kerja, file PDF resolusi 300dpi, finishing mata ayam 4 sudut..."
                                        className="w-full px-3 py-2.5 text-xs leading-relaxed rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-sans"
                                      />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                      <button
                                        type="button"
                                        onClick={() => setEditingPvId(null)}
                                        disabled={actionLoading}
                                        className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                      >
                                        Batal
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveUnifiedEdit(pv)}
                                        disabled={actionLoading}
                                        className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Simpan Perubahan</span>
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Form Hubungkan Vendor Baru ke Produk */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Hubungkan Vendor ke Produk Ini
              </h4>
              <button
                type="button"
                onClick={() => setShowNewVendorForm(!showNewVendorForm)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {showNewVendorForm ? "Batal Tambah Vendor Baru" : "+ Buat Vendor Baru di Sistem"}
              </button>
            </div>

            {/* If user clicks to create a brand new vendor in system */}
            {showNewVendorForm ? (
              <form onSubmit={handleCreateNewVendorInSystem} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    Daftarkan Vendor Baru ke Master Database
                  </p>
                  <span className="text-[11px] text-slate-400">Termasuk nama, kontak & link</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nama Vendor *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pabrik Flexi Digital"
                      value={newVendorNama}
                      onChange={(e) => setNewVendorNama(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      No. WA / Telepon Kontak
                    </label>
                    <input
                      type="text"
                      placeholder="081234567890"
                      value={newVendorKontak}
                      onChange={(e) => setNewVendorKontak(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Link URL (Website/Toko/Katalog)
                    </label>
                    <input
                      type="text"
                      placeholder="https://tokopedia.com/..."
                      value={newVendorLink}
                      onChange={(e) => setNewVendorLink(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Vendor (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Supplier bahan stiker Ritrama & Maxdecal, tempo pembayaran 14 hari..."
                    value={newVendorCatatan}
                    onChange={(e) => setNewVendorCatatan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowNewVendorForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    Simpan Vendor ke Sistem
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddVendorToProduct} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Select Vendor */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pilih Vendor Supplier *
                    </label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    >
                      <option value="">-- Pilih Vendor --</option>
                      {availableVendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nama_vendor} {v.kontak || v.no_wa ? `(${v.kontak || v.no_wa})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Input Harga Modal */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Harga Modal (Rp) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="45000"
                        value={hargaModalInput}
                        onChange={(e) => setHargaModalInput(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Live Margin Calculation Preview */}
                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Estimasi Margin
                    </label>
                    {inputMarginPreview ? (
                      <div className="px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatRupiah(inputMarginPreview.nominal)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${inputMarginPreview.colorClass}`}
                        >
                          {inputMarginPreview.persen}% &bull; {inputMarginPreview.statusLabel}
                        </span>
                      </div>
                    ) : (
                      <div className="px-3 py-2 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 italic">
                        Masukkan harga modal...
                      </div>
                    )}
                  </div>
                </div>

                {/* Input Catatan Khusus Multi-Line */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Khusus Produk Ini (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Min order 5 lembar, estimasi pengerjaan 2 hari kerja, file PDF resolusi 300dpi..."
                    value={catatanInput}
                    onChange={(e) => setCatatanInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                  />
                </div>

                {/* Checkbox Default and Submit */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isDefaultInput}
                      onChange={(e) => setIsDefaultInput(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Jadikan sebagai vendor default untuk produk ini</span>
                  </label>

                  <button
                    type="submit"
                    disabled={actionLoading || !selectedVendorId || hargaModalInput === ""}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambahkan ke Produk</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="text-[11px] text-slate-500">
            * Data vendor & harga modal bersifat rahasia (internal admin) dan tidak dapat dilihat customer.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
