import React, { useState, useMemo, useEffect } from "react";
import { Product, StoreSettings } from "../../types/index.js";
import { formatRupiah, createWALink } from "../../lib/utils.js";
import { api } from "../../lib/api.js";
import {
  Search,
  Filter,
  MessageCircle,
  Calculator,
  Layers,
  Scissors,
  Image as ImageIcon,
  Shirt,
  PenTool,
  FileText,
  Tag,
  CheckCircle2,
  Info,
  ZoomIn,
} from "lucide-react";
import { ImagePreviewLightbox } from "../../components/ImagePreviewLightbox.js";

interface PublicPriceListProps {
  products?: Product[];
  settings?: StoreSettings | null;
}

export const PublicPriceList: React.FC<PublicPriceListProps> = ({
  products: initialProducts,
  settings: initialSettings,
}) => {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [settings, setSettings] = useState<StoreSettings | null>(initialSettings || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchFreshData = async () => {
      try {
        setLoading(true);
        const [prodRes, setRes] = await Promise.all([
          api.getProducts({ activeOnly: true }),
          api.getSettings(),
        ]);
        if (isMounted) {
          setProducts(prodRes.products || []);
          if (setRes.settings) {
            setSettings(setRes.settings);
          }
        }
      } catch (err) {
        console.error("PublicPriceList fetch fresh data error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFreshData();
    return () => {
      isMounted = false;
    };
  }, []);

  const [search, setSearch] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Estimator state
  const [selectedProductForCalc, setSelectedProductForCalc] = useState<Product | null>(null);
  const [calcQty, setCalcQty] = useState<number>(1);

  // Lightbox Preview State
  const [activeLightbox, setActiveLightbox] = useState<{
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

  const handleOpenProductPreview = (prod: Product) => {
    const prodImages = Array.isArray(prod.images) && prod.images.length > 0
      ? prod.images
      : (prod.gambar_url ? [prod.gambar_url] : []);

    if (prodImages.length === 0) return;

    setActiveLightbox({
      isOpen: true,
      images: prodImages,
      title: prod.nama_item,
      subtitle: `${prod.kategori.toUpperCase()} • ${formatRupiah(prod.harga)} / ${prod.satuan}`,
    });
  };

  const categories = [
    { id: "all", label: "Semua Kategori" },
    { id: "stiker", label: "Stiker & Cutting" },
    { id: "dtf", label: "DTF & Sablon" },
    { id: "banner", label: "Banner & Spanduk" },
    { id: "jersey", label: "Jersey Printing" },
    { id: "desain", label: "Desain Grafis" },
    { id: "lainnya", label: "Nota & Lainnya" },
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_active) return false;
      const matchCat = selectedKategori === "all" || p.kategori.toLowerCase() === selectedKategori.toLowerCase();
      const matchSearch =
        search === "" ||
        p.nama_item.toLowerCase().includes(search.toLowerCase()) ||
        (p.deskripsi && p.deskripsi.toLowerCase().includes(search.toLowerCase())) ||
        p.kategori.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedKategori, search]);

  const handleOpenEstimator = (prod: Product) => {
    setSelectedProductForCalc(prod);
    setCalcQty(prod.harga_minimum_qty || 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
          Katalog & Daftar Harga Resmi
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Price List Layanan Cetak
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Harga tertera merupakan harga acuan standar. Untuk pemesanan partai besar / reseller, silakan hubungi admin kami untuk harga spesial.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Item (mis: stiker, dtf, jersey)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs text-slate-500 font-medium mr-1">Tampilan:</span>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Kartu (Grid)
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Tabel
            </button>
          </div>
        </div>

        {/* Category Pill Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedKategori(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                selectedKategori === cat.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Display (Grid View) */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => {
            const prodImages = Array.isArray(prod.images) && prod.images.length > 0
              ? prod.images
              : (prod.gambar_url ? [prod.gambar_url] : []);
            const coverImg = prodImages[0] || prod.gambar_url;
            const totalImages = prodImages.length;

            const waLink = createWALink(
              settings?.no_wa || "6281234567890",
              `Halo Jeres Studio, saya ingin pesan: ${prod.nama_item} (${prod.satuan})`
            );

            return (
              <div
                key={prod.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Image */}
                  {coverImg ? (
                    <div
                      onClick={() => handleOpenProductPreview(prod)}
                      className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer group/img"
                      title="Klik untuk memperbesar galeri foto"
                    >
                      <img
                        src={coverImg}
                        alt={prod.nama_item}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-xs border border-white/10">
                        {prod.kategori}
                      </span>
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity gap-1 text-white text-xs font-semibold">
                        <ZoomIn className="w-4 h-4" />
                        <span>Preview ({totalImages > 1 ? `${totalImages} Foto` : "1 Foto"})</span>
                      </div>

                      {totalImages > 1 && (
                        <span className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded-full border border-white/20 backdrop-blur-xs flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {totalImages} Foto
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Tag className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {prod.nama_item}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {prod.deskripsi || "Layanan cetak berkualitas tinggi dari Jeres Studio."}
                    </p>

                    {prod.harga_minimum_qty && prod.harga_minimum_qty > 1 && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/50 font-medium">
                        <Info className="w-3 h-3" />
                        Min. Order: {prod.harga_minimum_qty} {prod.satuan}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Price & Buttons */}
                <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Harga Satuan:</span>
                    {prod.tampilkan_harga_publik ? (
                      <div className="text-right">
                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                          {formatRupiah(prod.harga)}
                        </span>
                        <span className="text-xs text-slate-500 font-normal"> /{prod.satuan}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 italic">
                        Hubungi Admin
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenEstimator(prod)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                      Hitung Total
                    </button>

                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Order via WA
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Gambar</th>
                  <th className="py-3 px-4">Nama Produk & Spesifikasi</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Satuan</th>
                  <th className="py-3 px-4">Min. Qty</th>
                  <th className="py-3 px-4 text-right">Harga Resmi</th>
                  <th className="py-3 px-4 text-center">Aksi Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredProducts.map((prod) => {
                  const prodImages = Array.isArray(prod.images) && prod.images.length > 0
                    ? prod.images
                    : (prod.gambar_url ? [prod.gambar_url] : []);
                  const coverImg = prodImages[0] || prod.gambar_url;
                  const totalImages = prodImages.length;

                  const waLink = createWALink(
                    settings?.no_wa || "6281234567890",
                    `Halo Jeres Studio, saya ingin order ${prod.nama_item}`
                  );

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center">
                        {coverImg ? (
                          <div
                            onClick={() => handleOpenProductPreview(prod)}
                            className="relative w-12 h-12 rounded-lg overflow-hidden mx-auto cursor-pointer border border-slate-200 dark:border-slate-700 group/img"
                            title="Klik untuk melihat foto besar"
                          >
                            <img
                              src={coverImg}
                              alt={prod.nama_item}
                              className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-200"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                            {totalImages > 1 && (
                              <span className="absolute bottom-0 right-0 px-1 text-[9px] font-bold bg-slate-900/90 text-white rounded-tl border-t border-l border-white/20">
                                {totalImages}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                            <Tag className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{prod.nama_item}</p>
                        {prod.deskripsi && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {prod.deskripsi}
                          </p>
                        )}
                        {totalImages > 1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                            <Layers className="w-3 h-3" />
                            {totalImages} Foto Galeri
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {prod.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {prod.satuan}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {prod.harga_minimum_qty || 1} {prod.satuan}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {prod.tampilkan_harga_publik ? formatRupiah(prod.harga) : "Tanya WA"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEstimator(prod)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Kalkulator Estimasi"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Pesan
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Info className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Tidak ada produk yang cocok dengan pencarian Anda
          </p>
          <p className="text-xs text-slate-500">
            Coba ganti kata kunci atau pilih kategori lain.
          </p>
        </div>
      )}

      {/* Quick Calculator Modal */}
      {selectedProductForCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Estimator Biaya Cetak</h3>
              </div>
              <button
                onClick={() => setSelectedProductForCalc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500">Produk yang dipilih:</span>
                <p className="font-semibold text-slate-900 dark:text-white text-xs">
                  {selectedProductForCalc.nama_item}
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                  Harga Satuan: {formatRupiah(selectedProductForCalc.harga)} / {selectedProductForCalc.satuan}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Pesanan ({selectedProductForCalc.satuan}):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={selectedProductForCalc.harga_minimum_qty || 1}
                    value={calcQty}
                    onChange={(e) => setCalcQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-500">{selectedProductForCalc.satuan}</span>
                </div>
                {selectedProductForCalc.harga_minimum_qty && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    *Minimum order {selectedProductForCalc.harga_minimum_qty} {selectedProductForCalc.satuan}
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">Perkiraan Total:</span>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {formatRupiah(calcQty * selectedProductForCalc.harga)}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 text-right">
                  (Belum termasuk diskon partai)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSelectedProductForCalc(null)}
                className="w-1/2 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                Tutup
              </button>
              <a
                href={createWALink(
                  settings?.no_wa || "6281234567890",
                  `Halo Jeres Studio, saya ingin pesan ${selectedProductForCalc.nama_item} sebanyak ${calcQty} ${selectedProductForCalc.satuan}. Total estimasi ${formatRupiah(calcQty * selectedProductForCalc.harga)}. Mohon info prosesnya.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-1/2 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Pesan via WA
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      <ImagePreviewLightbox
        isOpen={activeLightbox.isOpen}
        onClose={() => setActiveLightbox((prev) => ({ ...prev, isOpen: false }))}
        images={activeLightbox.images}
        title={activeLightbox.title}
        subtitle={activeLightbox.subtitle}
      />
    </div>
  );
};
