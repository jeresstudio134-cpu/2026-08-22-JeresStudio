import React, { useState, useEffect } from "react";
import { StoreSettings } from "../../types/index.js";
import { api } from "../../lib/api.js";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  HelpCircle,
  ChevronDown,
  CreditCard,
  Building2,
  FileCheck,
} from "lucide-react";
import { createWALink } from "../../lib/utils.js";

interface ContactPageProps {
  settings?: StoreSettings | null;
}

export const ContactPage: React.FC<ContactPageProps> = ({ settings: initialSettings }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(initialSettings || null);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const res = await api.getSettings();
        if (isMounted && res.settings) {
          setSettings(res.settings);
        }
      } catch (err) {
        console.error("ContactPage fetch settings error:", err);
      }
    };
    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "Berapa lama proses pengerjaan cetak di Jeres Studio?",
      a: "Untuk stiker meteran, banner spanduk, dan DTF sablon biasanya selesai 1-2 hari kerja (tersedia layanan Express Same Day jika order pagi). Untuk jersey printing dan nota custom berkisar 3-7 hari kerja tergantung antrian dan kuantitas.",
    },
    {
      q: "Bagaimana format file desain yang direkomendasikan?",
      a: "Format terbaik adalah PDF Vector, CorelDraw (CDR font sudah di-convert curve), Adobe Illustrator (AI), atau PNG transparan dengan resolusi minimal 300 DPI warna CMYK agar warna cetak tidak meleset.",
    },
    {
      q: "Apakah bisa dibantu buatkan desain jika belum punya file?",
      a: "Bisa sekali! Kami menyediakan jasa desain grafis profesional mulai dari setting ulang, tracing logo buram, sampai pembuatan konsep desain baru dari nol.",
    },
    {
      q: "Apakah bisa kirim ke luar kota?",
      a: "Bisa, kami melayani pengiriman ke seluruh Indonesia menggunakan JNE, J&T, SiCepat, Wahana, Cargo, atau Gosend/GrabExpress untuk wilayah lokal.",
    },
    {
      q: "Bagaimana sistem pembayaran dan pelunasannya?",
      a: "Untuk order baru dikenakan DP minimal 50% atau pelunasan di muka. Pelunasan sisa tagihan dilakukan saat barang selesai diproduksi / sebelum dikirim.",
    },
  ];

  const quickTemplates = [
    {
      title: "Order Stiker & Label",
      msg: "Halo Jeres Studio, saya mau cetak stiker label kemasan. Mohon info bahan dan harga.",
    },
    {
      title: "Order DTF & Kaos",
      msg: "Halo Jeres Studio, saya mau sablon kaos pakai DTF meteran/satuan.",
    },
    {
      title: "Order Banner & Spanduk",
      msg: "Halo Jeres Studio, saya mau cetak spanduk flexi outdoor ukuran custom.",
    },
    {
      title: "Jasa Desain / Setting File",
      msg: "Halo Jeres Studio, saya butuh bantuan jasa desain / setting file cetak.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          Layanan Pelanggan & Lokasi
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Hubungi Jeres Studio
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tim kami siap melayani pertanyaan spesifikasi bahan, konsultasi file, perhitungan harga, dan status pesanan Anda.
        </p>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Informasi Workshop
          </h2>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Alamat Workshop:</p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {settings?.alamat || "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">WhatsApp & Telepon:</p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                  {settings?.no_wa || "6281234567890"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Email Desain & Admin:</p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                  {settings?.email || "jeresstudio134@gmail.com"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Jam Operasional:</p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  Senin - Sabtu: 08.30 - 21.00 WIB<br />
                  Minggu: 10.00 - 17.00 WIB
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Metode Pembayaran Resmi:
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed font-mono bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
              {settings?.rekening_bank || "BCA, Mandiri, QRIS All Payment"}
            </p>
          </div>
        </div>

        {/* Quick WhatsApp Templates */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Pilih Template Chat Cepat WhatsApp
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klik salah satu kategori di bawah untuk langsung membuka percakapan WhatsApp dengan pesan otomatis terisi:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {quickTemplates.map((t, idx) => {
                const link = createWALink(settings?.no_wa || "6281234567890", t.msg);
                return (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-400 dark:hover:border-emerald-700/60 transition-all group block"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {t.title}
                      </span>
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 italic">
                      "{t.msg}"
                    </p>
                  </a>
                );
              })}
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>

            <div className="space-y-2.5 pt-2">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                          isOpen ? "rotate-180 text-indigo-600" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
