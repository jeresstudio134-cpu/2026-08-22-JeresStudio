import React from "react";
import { StoreSettings } from "../../types/index.js";
import { Printer, MapPin, Phone, Mail, Heart, Lock } from "lucide-react";
import { createWALink } from "../../lib/utils.js";

interface FooterProps {
  settings: StoreSettings | null;
  onNavigate: (tab: string) => void;
  onOpenLogin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate, onOpenLogin }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                JS
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                {settings?.nama_toko || "JERES STUDIO"}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {settings?.slogan || "Solusi Cetak & Desain Digital Cepat, Rapi & Berkualitas."}
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Masuk ke Portal Admin
              </button>
            </div>
          </div>

          {/* Col 2: Nav Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              Menu Navigasi
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate("beranda")}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Beranda Utama
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("pricelist")}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Daftar Harga & Layanan
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("kontak")}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Kontak, Lokasi & FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Layanan Cetak */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              Katalog Cetak
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <li>• Stiker Vinyl & Hologram Die-Cut</li>
              <li>• DTF Transfer Film Sablon Kaos</li>
              <li>• Banner & Spanduk Outdoor Flexi</li>
              <li>• Jersey Full Sublim Custom Printing</li>
              <li>• Jasa Desain Grafis & Setting ACC</li>
              <li>• Nota NCR 2-3 Rangkap Carbonless</li>
            </ul>
          </div>

          {/* Col 4: Lokasi & Kontak */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              Hubungi Kami
            </h4>
            <div className="space-y-2 text-xs">
              <p className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>{settings?.alamat || "Jl. Percetakan Raya No. 134"}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <a
                  href={createWALink(settings?.no_wa || "6281234567890", "Halo Jeres Studio")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-500 font-mono"
                >
                  {settings?.no_wa || "0812-3456-7890"}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{settings?.email || "jeresstudio134@gmail.com"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {currentYear} {settings?.nama_toko || "Jeres Studio"}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with React, Express, Neon PostgreSQL & Drizzle ORM
          </p>
        </div>
      </div>
    </footer>
  );
};
