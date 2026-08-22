import React, { useState } from "react";
import { StoreSettings, Product } from "../../types/index.js";
import {
  Sparkles,
  Layers,
  Shirt,
  Image as ImageIcon,
  PenTool,
  FileText,
  Clock,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Scissors,
  Check,
  ZoomIn,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatRupiah, createWALink } from "../../lib/utils.js";
import { ImagePreviewLightbox } from "../../components/ImagePreviewLightbox.js";

interface LandingPageProps {
  settings: StoreSettings | null;
  products: Product[];
  onNavigatePriceList: () => void;
  onNavigateContact: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  settings,
  products,
  onNavigatePriceList,
  onNavigateContact,
}) => {
  const [showAllProducts, setShowAllProducts] = useState(false);
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
  const waOrderLink = createWALink(
    settings?.no_wa || "6281234567890",
    "Halo Jeres Studio, saya ingin tanya harga dan order cetak..."
  );

  const categories = [
    {
      id: "stiker",
      title: "Stiker & Cutting",
      desc: "Vinyl Glossy/Matte, Hologram, Chromo, Transparan. Sudah termasuk cutting kiss cut & die cut.",
      icon: Scissors,
      color: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      id: "dtf",
      title: "DTF & Sablon Kaos",
      desc: "Direct to Film transfer siap press ke kaos, hoodie, totebag. Full color tahan cuci & tidak pecah.",
      icon: Layers,
      color: "from-blue-500 to-indigo-500",
      bgLight: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      id: "banner",
      title: "Banner & Spanduk",
      desc: "Flexi 280g/340g outdoor, Roll Up Banner, X-Banner. Warna pekat tajam tahan panas dan hujan.",
      icon: ImageIcon,
      color: "from-emerald-500 to-teal-500",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      id: "jersey",
      title: "Jersey Sublim Custom",
      desc: "Jersey futsal, gowes, esport full printing. Bahan dryfit milano/brazil adem dan awet.",
      icon: Shirt,
      color: "from-purple-500 to-pink-500",
      bgLight: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      id: "desain",
      title: "Jasa Desain Grafis",
      desc: "Pembuatan logo, layout banner, kemasan stiker, hingga setting file siap cetak beresiko nol.",
      icon: PenTool,
      color: "from-rose-500 to-red-500",
      bgLight: "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      id: "lainnya",
      title: "Nota & Cetak Umum",
      desc: "Buku nota NCR 2 ply/3 ply nomorator, kartu nama, brosur, stempel flash, merchandise.",
      icon: FileText,
      color: "from-cyan-500 to-blue-500",
      bgLight: "bg-cyan-50 dark:bg-cyan-950/30",
    },
  ];

  const activeProducts = products.filter((p) => p.is_active);
  const popularProducts = activeProducts.slice(0, 4);
  const displayedProducts = showAllProducts ? activeProducts : popularProducts;

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Pusat Cetak Digital & Merchandise Terpercaya</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Cetak Cepat, Hasil Rapi, &{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                Kualitas Maksimal
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {settings?.slogan ||
                "Solusi cetak stiker label kemasan, DTF sablon kaos, spanduk banner kilat, jersey full print, dan jasa desain grafis profesional untuk bisnis & komunitas Anda."}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={onNavigatePriceList}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Lihat Daftar Harga (Price List)
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={waOrderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                Konsultasi & Order via WA
              </a>
            </div>

            {/* Quick Guarantees */}
            <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-left border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Bisa Express</h4>
                  <p className="text-[11px] text-slate-500">Same Day / 1 Hari</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Hasil Tajam</h4>
                  <p className="text-[11px] text-slate-500">Mesin High-Res CMYK</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Bantu Setting</h4>
                  <p className="text-[11px] text-slate-500">Gratis cek file & proof</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-slate-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Tanpa Minimum Ribet</h4>
                  <p className="text-[11px] text-slate-500">Satuan tetap dilayani</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services & Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Kategori Layanan Percetakan
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pilihan material terlengkap dan teknologi cetak mutakhir untuk segala kebutuhan visual Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={onNavigatePriceList}
                className="group relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600/50 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 mb-4 transition-transform group-hover:scale-105">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  <span>Cek Price List & Detail</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Products / Price Highlights */}
      {activeProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 md:p-8 rounded-2xl bg-slate-900 text-white dark:bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  {showAllProducts ? "Katalog Lengkap" : "Produk Terpopuler"}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
                  {showAllProducts
                    ? `Seluruh Pilihan Produk (${activeProducts.length} Produk)`
                    : "Paling Banyak Dipesan Pelanggan"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAllProducts(!showAllProducts)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                >
                  <span>
                    {showAllProducts
                      ? "Tampilkan 4 Terpopuler"
                      : `Lihat Semua (${activeProducts.length} Produk)`}
                  </span>
                  {showAllProducts ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {displayedProducts.map((prod) => {
                const prodImages = Array.isArray(prod.images) && prod.images.length > 0
                  ? prod.images
                  : (prod.gambar_url ? [prod.gambar_url] : []);
                const coverImg = prodImages[0] || prod.gambar_url;
                const totalImages = prodImages.length;

                return (
                  <div
                    key={prod.id}
                    className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex flex-col justify-between hover:border-indigo-500/50 transition-all group"
                  >
                    <div className="space-y-3">
                      {coverImg ? (
                        <div
                          onClick={() => handleOpenProductPreview(prod)}
                          className="relative w-full h-36 rounded-lg overflow-hidden cursor-pointer bg-slate-950 group/img"
                          title="Klik untuk melihat preview foto ukuran besar"
                        >
                          <img
                            src={coverImg}
                            alt={prod.nama_item}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity gap-1.5 text-white text-xs font-medium">
                            <ZoomIn className="w-4 h-4" />
                            <span>Preview</span>
                          </div>
                          {totalImages > 1 && (
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded-full border border-white/20 backdrop-blur-xs">
                              {totalImages} Foto
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-36 rounded-lg bg-slate-700/40 flex items-center justify-center text-slate-500">
                          <ImageIcon className="w-7 h-7" />
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                          {prod.kategori}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1.5 line-clamp-2">
                          {prod.nama_item}
                        </h4>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400">Mulai dari</span>
                        <p className="text-xs font-bold text-emerald-400 font-mono">
                          {formatRupiah(prod.harga)}
                          <span className="text-[10px] text-slate-400 font-normal">/{prod.satuan}</span>
                        </p>
                      </div>
                      <a
                        href={createWALink(
                          settings?.no_wa || "6281234567890",
                          `Halo Jeres Studio, saya ingin pesan: ${prod.nama_item}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        title="Pesan via WA"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {!showAllProducts && activeProducts.length > 4 && (
              <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
                <button
                  onClick={() => setShowAllProducts(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                >
                  <span>Tampilkan Seluruh {activeProducts.length} Produk</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How It Works (Alur Order) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Cara Mudah Pesan Cetak
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tanpa repot, tim Jeres Studio siap melayani konsultasi hingga barang sampai di tangan Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {[
            {
              step: "01",
              title: "Konsultasi & Kirim File",
              desc: "Kirim desain via WhatsApp atau email (PDF, CDR, PSD, PNG). Belum ada desain? Kami bantu buatkan.",
            },
            {
              step: "02",
              title: "ACC Proof & Estimasi",
              desc: "Kami kirimkan preview mockup dan nota rincian harga transparan sebelum naik produksi.",
            },
            {
              step: "03",
              title: "Proses Cetak & QC",
              desc: "Diproduksi dengan mesin high-resolution, tinta original tahan luntur, dan quality check teliti.",
            },
            {
              step: "04",
              title: "Pengambilan / Kirim",
              desc: "Pesanan siap diambil di workshop atau dikirim ke lokasi Anda via Gosend/Ekspedisi.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden"
            >
              <span className="text-2xl font-bold text-indigo-600/30 dark:text-indigo-400/30 block font-mono">
                {item.step}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA WhatsApp Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-2xl bg-indigo-600 text-white shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Punya Project Cetak Skala Besar atau Butuh Custom?
            </h2>
            <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
              Dapatkan penawaran harga khusus partai/reseller, mockup gratis, dan konsultasi bahan langsung dengan customer service kami.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <a
              href={waOrderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium text-emerald-950 bg-emerald-300 hover:bg-emerald-200 rounded-lg shadow-xs transition-colors text-center"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              Chat CS Jeres Sekarang
            </a>
            <button
              onClick={onNavigateContact}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium text-white bg-indigo-700/80 hover:bg-indigo-700 rounded-lg border border-indigo-400/40 transition-colors text-center cursor-pointer"
            >
              Lokasi Workshop Kami
            </button>
          </div>
        </div>
      </section>
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
