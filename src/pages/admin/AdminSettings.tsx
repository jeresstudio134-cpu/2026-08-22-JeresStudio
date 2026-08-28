import React, { useState, useEffect, useRef } from "react";
import { StoreSettings, ActivityLog, AdminUser } from "../../types/index.js";
import { api } from "../../lib/api.js";
import { useAuth } from "../../lib/auth.js";
import { formatTanggal } from "../../lib/utils.js";
import {
  Settings,
  Store,
  Users,
  Key,
  Database,
  History,
  Save,
  Plus,
  Download,
  CheckCircle2,
  AlertCircle,
  Lock,
  Upload,
  Image as ImageIcon,
  Trash2,
  Printer,
  ClipboardPaste,
  Copy,
  Check,
  Sparkles,
  Edit2,
  Shield,
  UserCheck,
} from "lucide-react";

interface AdminSettingsProps {
  settings: StoreSettings | null;
  onRefreshSettings: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onRefreshSettings }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"store" | "staff" | "security" | "logs" | "backup">("store");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Store Profile Form
  const [storeForm, setStoreForm] = useState({
    nama_toko: "",
    slogan: "",
    alamat: "",
    no_wa: "",
    email: "",
    logo_url: "",
    rekening_bank: "",
    catatan_nota: "",
  });
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState(false);

  // Staff Management
  const [staffList, setStaffList] = useState<AdminUser[]>([]);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    username: "",
    nama: "",
    password: "",
    role: "staff",
  });
  const [staffSaving, setStaffSaving] = useState(false);

  // Edit Staff State
  const [editStaffModalOpen, setEditStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<{
    id: number;
    username: string;
    nama: string;
    password: string;
    role: string;
  } | null>(null);
  const [editStaffSaving, setEditStaffSaving] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Logs
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (settings) {
      setStoreForm({
        nama_toko: settings.nama_toko || "JERES STUDIO",
        slogan: settings.slogan || "Solusi Cetak & Desain Digital Cepat, Rapi & Berkualitas",
        alamat: settings.alamat || "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif",
        no_wa: settings.no_wa || "6281234567890",
        email: settings.email || "jeresstudio134@gmail.com",
        logo_url: settings.logo_url || "",
        rekening_bank: settings.rekening_bank || "BCA: 123-456-7890 a.n Jeres Studio",
        catatan_nota:
          settings.catatan_nota ||
          "1. Periksa kembali barang pesanan sebelum meninggalkan toko.\n2. Komplain maksimal 1x24 jam setelah barang diterima dengan melampirkan nota fisik/digital.\n3. File desain yang tidak diambil dalam 30 hari akan diarsipkan.",
      });
    }
  }, [settings]);

  const fetchStaff = async () => {
    try {
      const res = await api.getStaff();
      setStaffList(res.staff);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.getActivities();
      setLogs(res.activities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "staff") fetchStaff();
    if (activeTab === "logs") fetchLogs();
  }, [activeTab]);

  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoCopied, setLogoCopied] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const handleLogoFileUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Mohon pilih file gambar (PNG, JPG, SVG, WebP)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file logo maksimal 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setStoreForm((prev) => ({ ...prev, logo_url: reader.result as string }));
        setPasteNotice("Logo berhasil dimuat!");
        setTimeout(() => setPasteNotice(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Paste from Clipboard directly via Button
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            handleLogoFileUpload(new File([blob], "pasted-logo.png", { type: imageType }));
            return;
          }
        }
      }
      // Fallback text (e.g. image URL from clipboard)
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith("data:image/") || text.startsWith("http://") || text.startsWith("https://"))) {
          setStoreForm((prev) => ({ ...prev, logo_url: text.trim() }));
          setPasteNotice("URL gambar berhasil ditempel dari Clipboard!");
          setTimeout(() => setPasteNotice(null), 3000);
          return;
        }
      }
      alert("Tidak ditemukan gambar di clipboard. Silakan copy gambar terlebih dahulu (Ctrl+C), lalu klik Paste atau tekan Ctrl+V.");
    } catch (err) {
      // Browser permission prompt or fallback
      setPasteNotice("Tekan kombinasi tombol keyboard Ctrl+V (atau Cmd+V) untuk menempel gambar langsung.");
      setTimeout(() => setPasteNotice(null), 4000);
    }
  };

  // Global Ctrl+V handler when on Store Tab
  useEffect(() => {
    if (activeTab !== "store") return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleLogoFileUpload(file);
            setPasteNotice("✓ Gambar berhasil di-paste (Ctrl+V) langsung ke Logo!");
            setTimeout(() => setPasteNotice(null), 3000);
            return;
          }
        }
      }
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [activeTab]);

  const handleCopyLogo = async () => {
    if (!storeForm.logo_url) return;
    try {
      await navigator.clipboard.writeText(storeForm.logo_url);
      setLogoCopied(true);
      setTimeout(() => setLogoCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStoreSaving(true);
      await api.updateSettings(storeForm);
      setStoreSuccess(true);
      onRefreshSettings();
      setTimeout(() => setStoreSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan pengaturan");
    } finally {
      setStoreSaving(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.username || !newStaff.password || !newStaff.nama) {
      alert("Mohon lengkapi semua field!");
      return;
    }
    try {
      setStaffSaving(true);
      await api.addStaff(newStaff);
      setStaffModalOpen(false);
      setNewStaff({ username: "", nama: "", password: "", role: "staff" });
      fetchStaff();
    } catch (err: any) {
      alert(err.message || "Gagal menambah user staff");
    } finally {
      setStaffSaving(false);
    }
  };

  const handleOpenEditStaff = (staff: AdminUser) => {
    setEditingStaff({
      id: staff.id,
      username: staff.username,
      nama: staff.nama,
      password: "",
      role: staff.role,
    });
    setEditStaffModalOpen(true);
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editingStaff.username || !editingStaff.nama) {
      alert("Username dan Nama Lengkap wajib diisi!");
      return;
    }
    if (editingStaff.password && editingStaff.password.length < 6) {
      alert("Password baru minimal 6 karakter!");
      return;
    }

    try {
      setEditStaffSaving(true);
      await api.updateStaff(editingStaff.id, {
        username: editingStaff.username,
        nama: editingStaff.nama,
        role: editingStaff.role,
        ...(editingStaff.password ? { password: editingStaff.password } : {}),
      });
      setEditStaffModalOpen(false);
      setEditingStaff(null);
      fetchStaff();
      alert("Data user dan password berhasil diperbarui!");
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui data user");
    } finally {
      setEditStaffSaving(false);
    }
  };

  const handleDeleteStaff = async (staff: AdminUser) => {
    if (staff.id === user?.id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.");
      return;
    }
    if (!confirm(`Yakin ingin menghapus akun ${staff.nama} (@${staff.username})? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      await api.deleteStaff(staff.id);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus user");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Konfirmasi password baru tidak cocok!" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password baru minimal 6 karakter!" });
      return;
    }

    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg({ type: "success", text: "Password berhasil diperbarui!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message || "Gagal mengubah password" });
    }
  };

  // Export Full Database Backup JSON
  const handleExportBackup = async () => {
    try {
      const [pRes, oRes, vRes, sRes] = await Promise.all([
        api.getProducts({ activeOnly: false }),
        api.getOrders(),
        api.getVendors(),
        api.getSettings(),
      ]);

      const backupData = {
        exported_at: new Date().toISOString(),
        version: "1.0",
        settings: sRes.settings,
        products: pRes.products,
        orders: oRes.orders,
        vendors: vRes.vendors,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `backup-jeres-studio-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert(err.message || "Gagal membuat backup");
    }
  };

  if (user?.role !== "owner") {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <Shield className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Akses Terbatas</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Halaman Pengaturan & Staff hanya dapat diakses oleh Admin/Owner toko.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Pengaturan Toko, Staff & Keamanan
        </h2>
        <p className="text-xs text-slate-500">
          Konfigurasi identitas toko, nomor rekening cetak nota, akun staff, dan audit log
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("store")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "store"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          <Store className="w-4 h-4" />
          Profil Toko & Nota
        </button>

        {user?.role === "owner" && (
          <button
            onClick={() => setActiveTab("staff")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "staff"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Manajemen Akun Staff
          </button>
        )}

        <button
          onClick={() => setActiveTab("security")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "security"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          <Key className="w-4 h-4" />
          Ganti Password
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "logs"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          <History className="w-4 h-4" />
          Log Aktivitas
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "backup"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          <Database className="w-4 h-4" />
          Backup & Ekspor JSON
        </button>
      </div>

      {/* TAB 1: STORE PROFILE */}
      {activeTab === "store" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          {storeSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Pengaturan toko berhasil disimpan!</span>
            </div>
          )}

          <form onSubmit={handleSaveStore} className="space-y-5 text-xs">
            {/* Logo Upload Section with Clipboard Paste & Drag Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingLogo(true);
              }}
              onDragLeave={() => setIsDraggingLogo(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingLogo(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleLogoFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`p-4 rounded-xl border transition-all ${
                isDraggingLogo
                  ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  Logo Toko & Nota Cetak
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="w-3 h-3" />
                  Support Copy Paste (Ctrl+V) & Drag-Drop
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mb-3">
                Upload logo usaha Anda sendiri (format PNG, JPG, SVG, atau WebP). Anda juga bisa langsung <b>tekan Ctrl+V</b> di halaman ini untuk menempelkan gambar dari clipboard atau tangkapan layar.
              </p>

              {pasteNotice && (
                <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium">{pasteNotice}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Logo Preview Dropzone */}
                <div
                  onClick={() => logoInputRef.current?.click()}
                  title="Klik untuk ganti logo atau drag file ke sini"
                  className={`relative w-24 h-24 rounded-xl border-2 border-dashed bg-white dark:bg-slate-900 flex items-center justify-center p-2 shadow-xs shrink-0 overflow-hidden group cursor-pointer transition-colors ${
                    isDraggingLogo
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-slate-300 dark:border-slate-700 hover:border-indigo-400"
                  }`}
                >
                  {storeForm.logo_url ? (
                    <img
                      src={storeForm.logo_url}
                      alt="Logo Toko"
                      className="w-full h-full object-contain transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-center">
                      <Printer className="w-7 h-7 text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-medium text-slate-500">Drop Logo / Klik</span>
                    </div>
                  )}
                </div>

                {/* Upload, Paste, & Action Controls */}
                <div className="space-y-2.5 flex-1 w-full">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleLogoFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Choose File Button */}
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Upload / Pilih File</span>
                    </button>

                    {/* Copy Image URL */}
                    {storeForm.logo_url && (
                      <button
                        type="button"
                        onClick={handleCopyLogo}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Copy link / data gambar logo"
                      >
                        {logoCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{logoCopied ? "Tersalin!" : "Copy"}</span>
                      </button>
                    )}

                    {/* Delete Logo */}
                    {storeForm.logo_url && (
                      <button
                        type="button"
                        onClick={() => setStoreForm((prev) => ({ ...prev, logo_url: "" }))}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Logo</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Tips: Cukup <b>Copy gambar di mana saja</b> (WhatsApp, Canva, Snipping Tool) lalu langsung tekan <b>Ctrl + V</b> di halaman ini untuk menempel logo.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Toko / Usaha *
                </label>
                <input
                  type="text"
                  required
                  value={storeForm.nama_toko}
                  onChange={(e) => setStoreForm({ ...storeForm, nama_toko: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white uppercase font-bold focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Slogan / Tagline
                </label>
                <input
                  type="text"
                  value={storeForm.slogan}
                  onChange={(e) => setStoreForm({ ...storeForm, slogan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor WhatsApp Toko (Format: 628...) *
                </label>
                <input
                  type="text"
                  required
                  value={storeForm.no_wa}
                  onChange={(e) => setStoreForm({ ...storeForm, no_wa: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Toko
                </label>
                <input
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Workshop Percetakan
              </label>
              <input
                type="text"
                value={storeForm.alamat}
                onChange={(e) => setStoreForm({ ...storeForm, alamat: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Informasi Rekening Bank untuk Dicetak di Nota
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: BCA: 123456789 a.n Jeres Studio | Mandiri: 987654321"
                value={storeForm.rekening_bank}
                onChange={(e) => setStoreForm({ ...storeForm, rekening_bank: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Syarat & Ketentuan / Catatan Footer Nota A5
              </label>
              <textarea
                rows={3}
                value={storeForm.catatan_nota}
                onChange={(e) => setStoreForm({ ...storeForm, catatan_nota: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={storeSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {storeSaving ? "Menyimpan..." : "Simpan Profil Toko"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: STAFF USERS */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Daftar Akun Operator & Kasir
            </h3>
            <button
              onClick={() => setStaffModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Akun Staff
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role Akses</th>
                  <th className="py-3 px-4">Terdaftar Sejak</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {staffList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{u.nama}</span>
                        {u.id === user?.id && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Akun Anda
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      @{u.username}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {formatTanggal(u.created_at || "")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditStaff(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                          title="Edit username, nama lengkap, role, dan reset password"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit & Password</span>
                        </button>
                        {user?.role === "owner" && u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteStaff(u)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Hapus akun staff"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CHANGE PASSWORD */}
      {activeTab === "security" && (
        <div className="max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            Ganti Password Akun ({user?.username})
          </h3>

          {passwordMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                passwordMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {passwordMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password Saat Ini *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password Baru *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ulangi Password Baru *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
            >
              Simpan Password Baru
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: ACTIVITY LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Rincian Deskripsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {logs.length > 0 ? (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {formatTanggal(l.created_at)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-mono">
                        {l.user_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {l.details || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      {loadingLogs ? "Memuat log aktivitas..." : "Belum ada log tercatat"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BACKUP */}
      {activeTab === "backup" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-4 max-w-2xl">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Cadangkan Data Toko (JSON Backup)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Unduh salinan cadangan lengkap seluruh data toko Jeres Studio mencakup: Katalog Produk, Daftar Orderan & Item Cetakan, Data Vendor, Riwayat Kulakan, dan Konfigurasi Toko dalam format JSON standar.
          </p>

          <div className="pt-2">
            <button
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Backup Lengkap (.JSON)
            </button>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Tambah Akun Staff Baru
              </h3>
              <button
                onClick={() => setStaffModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Operator"
                  value={newStaff.nama}
                  onChange={(e) => setNewStaff({ ...newStaff, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="rian_staff"
                  value={newStaff.username}
                  onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Akses
                </label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="staff">Staff / Operator (Kelola Order & Produk)</option>
                  <option value="owner">Owner / Super Admin (Akses Penuh)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={staffSaving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {staffSaving ? "Menyimpan..." : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff & Password Modal */}
      {editStaffModalOpen && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    Edit Akun & Password
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ID #{editingStaff.id} - @{editingStaff.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditStaffModalOpen(false);
                  setEditingStaff(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Operator"
                  value={editingStaff.nama}
                  onChange={(e) => setEditingStaff({ ...editingStaff, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username Akun *
                </label>
                <input
                  type="text"
                  required
                  placeholder="rian_staff"
                  value={editingStaff.username}
                  onChange={(e) => setEditingStaff({ ...editingStaff, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Username digunakan untuk login ke portal admin.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reset Password Baru (Opsional)
                </label>
                <input
                  type="password"
                  placeholder="Kosongkan jika password tidak ingin diubah"
                  value={editingStaff.password}
                  onChange={(e) => setEditingStaff({ ...editingStaff, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Isi jika ingin mereset password baru (minimal 6 karakter).
                </p>
              </div>

              {user?.role === "owner" && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role Akses
                  </label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="staff">Staff / Operator (Kelola Order & Produk)</option>
                    <option value="owner">Owner / Super Admin (Akses Penuh)</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditStaffModalOpen(false);
                    setEditingStaff(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editStaffSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editStaffSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
