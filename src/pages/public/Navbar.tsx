import React from "react";
import { StoreSettings } from "../../types/index.js";
import { Printer, MessageCircle, Lock, Menu, X, Sun, Moon } from "lucide-react";
import { createWALink } from "../../lib/utils.js";

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  settings: StoreSettings | null;
  onOpenLogin: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  settings,
  onOpenLogin,
  darkMode,
  setDarkMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: "beranda", label: "Beranda" },
    { id: "pricelist", label: "Price List & Layanan" },
    { id: "kontak", label: "Kontak & Lokasi" },
  ];

  const waLink = createWALink(
    settings?.no_wa || "6281234567890",
    "Halo Jeres Studio, saya ingin konsultasi dan pesan cetak..."
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Store Name */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => {
              setCurrentTab("beranda");
              setMobileMenuOpen(false);
            }}
          >
            {settings?.logo_url ? (
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                <img
                  src={settings.logo_url}
                  alt={settings.nama_toko || "Logo Toko"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105">
                <Printer className="w-4 h-4" />
              </div>
            )}
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                {settings?.nama_toko || "JERES STUDIO"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block -mt-0.5 font-medium">
                {settings?.slogan || "Percetakan & Desain Digital"}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  currentTab === item.id
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* WA Order Button */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat WhatsApp
            </a>

            {/* Admin Login Button */}
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              Admin Portal
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3.5 py-2 text-xs font-medium rounded-lg ${
                currentTab === item.id
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat WhatsApp (Order)
            </a>
            <button
              onClick={() => {
                onOpenLogin();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Login Admin
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
