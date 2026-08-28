import React, { useState, useEffect } from "react";
import { Vendor, PurchaseHistory } from "../../types/index.js";
import { api } from "../../lib/api.js";
import { formatRupiah, formatTanggal, createWALink } from "../../lib/utils.js";
import {
  Plus,
  Search,
  Truck,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  DollarSign,
  Receipt,
  MessageCircle,
  AlertCircle,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";

export const AdminVendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchases, setPurchases] = useState<PurchaseHistory[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"vendors" | "purchases">("vendors");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Vendor Modal State
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorFormData, setVendorFormData] = useState({
    nama_vendor: "",
    kategori_supply: "Bahan Stiker & Laminasi",
    kontak_nama: "",
    no_wa: "",
    link: "",
    alamat: "",
    catatan: "",
  });

  // Purchase Modal State
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseFormData, setPurchaseFormData] = useState({
    vendor_id: 0,
    tanggal: new Date().toISOString().slice(0, 10),
    nama_barang: "",
    qty: 1,
    satuan: "roll",
    harga_satuan: 0,
    total: 0,
    catatan: "",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [vRes, pRes] = await Promise.all([api.getVendors(), api.getPurchases()]);
      setVendors(vRes.vendors);
      setPurchases(pRes.purchases);
    } catch (err) {
      console.error("Fetch vendors error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleOpenAddVendor = () => {
    setEditingVendor(null);
    setVendorFormData({
      nama_vendor: "",
      kategori_supply: "Bahan Stiker & Laminasi",
      kontak_nama: "",
      no_wa: "",
      link: "",
      alamat: "",
      catatan: "",
    });
    setFormError(null);
    setVendorModalOpen(true);
  };

  const handleOpenEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setVendorFormData({
      nama_vendor: v.nama_vendor,
      kategori_supply: v.kategori_supply || "",
      kontak_nama: v.kontak_nama || "",
      no_wa: v.no_wa || v.kontak || "",
      link: v.link || "",
      alamat: v.alamat || "",
      catatan: v.catatan || "",
    });
    setFormError(null);
    setVendorModalOpen(true);
  };

  const handleSubmitVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorFormData.nama_vendor || !vendorFormData.no_wa) {
      setFormError("Nama vendor dan nomor WhatsApp wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      if (editingVendor) {
        await api.updateVendor(editingVendor.id, vendorFormData);
      } else {
        await api.createVendor(vendorFormData);
      }
      setVendorModalOpen(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data vendor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendor = async (id: number, name: string) => {
    if (confirm(`Hapus vendor ${name}?`)) {
      try {
        await api.deleteVendor(id);
        fetchAll();
      } catch (err: any) {
        alert(err.message || "Gagal menghapus vendor");
      }
    }
  };

  const handleOpenAddPurchase = (defaultVendorId?: number) => {
    setPurchaseFormData({
      vendor_id: defaultVendorId || (vendors[0] ? vendors[0].id : 0),
      tanggal: new Date().toISOString().slice(0, 10),
      nama_barang: "",
      qty: 1,
      satuan: "roll",
      harga_satuan: 0,
      total: 0,
      catatan: "",
    });
    setFormError(null);
    setPurchaseModalOpen(true);
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseFormData.vendor_id || !purchaseFormData.nama_barang || !purchaseFormData.total) {
      setFormError("Vendor, nama barang dan total harga wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      await api.createPurchase({
        vendor_id: purchaseFormData.vendor_id,
        tanggal: purchaseFormData.tanggal,
        nama_barang: purchaseFormData.nama_barang,
        qty: purchaseFormData.qty,
        satuan: purchaseFormData.satuan,
        harga_satuan: purchaseFormData.harga_satuan || Math.round(purchaseFormData.total / purchaseFormData.qty),
        total: purchaseFormData.total,
        catatan: purchaseFormData.catatan,
      });
      setPurchaseModalOpen(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message || "Gagal mencatat kulakan");
    } finally {
      setSaving(false);
    }
  };

  const totalPengeluaranKulakan = purchases.reduce((sum, p) => sum + (p.total || 0), 0);

  const filteredVendors = vendors.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.nama_vendor.toLowerCase().includes(q) ||
      (v.kategori_supply && v.kategori_supply.toLowerCase().includes(q)) ||
      (v.no_wa && v.no_wa.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Vendor & Catatan Kulakan Bahan
          </h2>
          <p className="text-xs text-slate-500">
            Kelola kontak supplier percetakan dan rekap pengeluaran pembelian bahan baku
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === "vendors" ? (
            <button
              onClick={handleOpenAddVendor}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Vendor
            </button>
          ) : (
            <button
              onClick={() => handleOpenAddPurchase()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Catat Pembelian Kulakan
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab("vendors")}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSubTab === "vendors"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          Daftar Vendor / Supplier ({vendors.length})
        </button>
        <button
          onClick={() => setActiveSubTab("purchases")}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSubTab === "purchases"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          Riwayat Kulakan ({purchases.length})
        </button>
      </div>

      {/* SUBTAB 1: VENDORS LIST */}
      {activeSubTab === "vendors" && (
        <div className="space-y-4">
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari vendor berdasarkan nama, kategori bahan, atau no WA..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVendors.map((v) => {
              const waLink = v.no_wa ? createWALink(v.no_wa, "Halo Supplier, saya mau cek stok & order bahan.") : null;

              return (
                <div
                  key={v.id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                          {v.nama_vendor}
                        </h3>
                        <span className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 mt-1 border border-indigo-200 dark:border-indigo-800">
                          {v.kategori_supply || "Bahan Baku"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditVendor(v)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(v.id, v.nama_vendor)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                      {v.kontak_nama && (
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          PIC: {v.kontak_nama}
                        </p>
                      )}
                      {v.no_wa && (
                        <p className="flex items-center gap-2 font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{v.no_wa}</span>
                        </p>
                      )}
                      {v.link && (
                        <p className="flex items-center gap-2">
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <a
                            href={v.link.startsWith("http") ? v.link : `https://${v.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline font-medium truncate max-w-[200px]"
                            title={v.link}
                          >
                            {v.link.replace(/^https?:\/\//i, "")}
                          </a>
                        </p>
                      )}
                      {v.alamat && (
                        <p className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{v.alamat}</span>
                        </p>
                      )}
                      {v.catatan && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Catatan Khusus:
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {v.catatan}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenAddPurchase(v.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      + Catat Beli
                    </button>

                    <div className="flex items-center gap-1.5">
                      {v.link && (
                        <a
                          href={v.link.startsWith("http") ? v.link : `https://${v.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors"
                          title="Buka Website / Toko Vendor"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Link Web</span>
                        </a>
                      )}
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Hubungi WA
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: PURCHASES / KULAKAN LIST */}
      {activeSubTab === "purchases" && (
        <div className="space-y-4">
          {/* Kulakan Total Summary Banner */}
          <div className="p-5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Total Riwayat Kulakan / Belanja Bahan
              </span>
              <h3 className="text-2xl font-bold text-emerald-950 dark:text-white font-mono mt-1">
                {formatRupiah(totalPengeluaranKulakan)}
              </h3>
            </div>
            <Receipt className="w-9 h-9 text-emerald-600 opacity-60" />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Tanggal Beli</th>
                    <th className="py-3 px-4">Vendor Supplier</th>
                    <th className="py-3 px-4">Nama Barang / Bahan</th>
                    <th className="py-3 px-4">Kuantitas</th>
                    <th className="py-3 px-4 text-right">Total Biaya</th>
                    <th className="py-3 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {purchases.length > 0 ? (
                    purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {formatTanggal(p.tanggal)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {p.vendor_nama || `Vendor #${p.vendor_id}`}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {p.nama_barang}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {p.qty} {p.satuan}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(p.total)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {p.catatan || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada catatan kulakan tersimpan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Add/Edit Modal */}
      {vendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingVendor ? "Edit Vendor" : "Tambah Vendor Baru"}
              </h3>
              <button
                onClick={() => setVendorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
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

            <form onSubmit={handleSubmitVendor} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Vendor / Supplier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Toko Bahan Grafika 99"
                  value={vendorFormData.nama_vendor}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, nama_vendor: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Bahan / Supply
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bahan Stiker Vinyl, DTF PET Film, Tinta Sublim"
                  value={vendorFormData.kategori_supply}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, kategori_supply: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kontak (PIC)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ko Hendra"
                  value={vendorFormData.kontak_nama}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, kontak_nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Kontak / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="081234567890"
                  value={vendorFormData.no_wa}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, no_wa: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
                  Link Website / Toko Online / Katalog Supplier
                </label>
                <input
                  type="text"
                  placeholder="https://tokopedia.com/toko-supplier atau https://supplier.com"
                  value={vendorFormData.link}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, link: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Link ini memudahkan admin membuka katalog online / marketplace supplier.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Supplier
                </label>
                <textarea
                  rows={2}
                  value={vendorFormData.alamat}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Catatan Khusus (Syarat Pembayaran / Ketentuan Supplier)
                  </label>
                  <span className="text-[10px] text-slate-400">Tampil penuh untuk dikoreksi</span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Contoh: Tempo 14 hari, diskon 5% untuk pembelian min 5 roll, retur barang maksimal 3 hari..."
                  value={vendorFormData.catatan}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, catatan: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setVendorModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Catat Pengeluaran Kulakan Bahan
              </h3>
              <button
                onClick={() => setPurchaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
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

            <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Vendor Supplier *
                </label>
                <select
                  required
                  value={purchaseFormData.vendor_id}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, vendor_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nama_vendor} ({v.kategori_supply})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Bahan / Barang yang Dibeli *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PET Film DTF Cold Peel 60cm (100 Meter)"
                  value={purchaseFormData.nama_barang}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, nama_barang: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah (Qty) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchaseFormData.qty}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, qty: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={purchaseFormData.satuan}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, satuan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Biaya Pembelian (Rp) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={purchaseFormData.total}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, total: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Beli
                </label>
                <input
                  type="date"
                  value={purchaseFormData.tanggal}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, tanggal: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / No. Faktur Supplier
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Inv-99238 lunas via Transfer"
                  value={purchaseFormData.catatan}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, catatan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Kulakan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
