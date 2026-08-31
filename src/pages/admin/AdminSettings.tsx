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
  Cpu,
  Mail,
  Cloud,
  RefreshCw,
} from "lucide-react";

interface AdminSettingsProps {
  settings: StoreSettings | null;
  onRefreshSettings: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onRefreshSettings }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"store" | "staff" | "security" | "logs" | "backup" | "integrations">("store");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Integrations Status State
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [initingDb, setInitingDb] = useState(false);
  const [dbInitNotice, setDbInitNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [testingCloudinary, setTestingCloudinary] = useState(false);
  const [cloudinaryNotice, setCloudinaryNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiNotice, setGeminiNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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

  const fetchIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      const [res, dbRes] = await Promise.allSettled([
        api.getIntegrationsStatus(),
        api.getDbStatus(),
      ]);
      if (res.status === "fulfilled") {
        setIntegrationStatus(res.value.integrations);
      }
      if (dbRes.status === "fulfilled") {
        setDbStatus(dbRes.value);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const [syncingDb, setSyncingDb] = useState(false);

  const handleSyncDatabase = async () => {
    try {
      setSyncingDb(true);
      setDbInitNotice(null);
      const res = await api.syncDatabase();
      if (res.success) {
        setDbInitNotice({
          type: "success",
          message: `Berhasil! Data terbaru dari database Neon PostgreSQL telah disinkronkan (${res.counts?.products ?? 0} produk, ${res.counts?.orders ?? 0} orderan, ${res.counts?.transactions ?? 0} transaksi).`,
        });
        await fetchIntegrations();
        if (onRefreshSettings) onRefreshSettings();
      } else {
        setDbInitNotice({
          type: "error",
          message: res.message || "Gagal sinkronisasi data dari Neon.",
        });
      }
    } catch (err: any) {
      setDbInitNotice({
        type: "error",
        message: err.message || "Terjadi kesalahan saat menghubungi server.",
      });
    } finally {
      setSyncingDb(false);
    }
  };

  const handleInitDatabase = async () => {
    try {
      setInitingDb(true);
      setDbInitNotice(null);
      const res = await api.initDatabase();
      if (res.success) {
        setDbInitNotice({
          type: "success",
          message: `Berhasil! ${res.tableCount} tabel di Neon PostgreSQL telah diverifikasi & tersinkronisasi.`,
        });
        await fetchIntegrations();
      } else {
        setDbInitNotice({
          type: "error",
          message: res.message || "Gagal menginisialisasi tabel di Neon.",
        });
      }
    } catch (err: any) {
      setDbInitNotice({
        type: "error",
        message: err.message || "Terjadi kesalahan saat menghubungi server.",
      });
    } finally {
      setInitingDb(false);
    }
  };

  const handleTestCloudinary = async () => {
    try {
      setTestingCloudinary(true);
      setCloudinaryNotice(null);
      const res = await api.testCloudinary();
      if (res.success) {
        setCloudinaryNotice({
          type: "success",
          message: res.message,
        });
        await fetchIntegrations();
      } else {
        setCloudinaryNotice({
          type: "error",
          message: res.message || "Gagal menguji koneksi Cloudinary.",
        });
      }
    } catch (err: any) {
      setCloudinaryNotice({
        type: "error",
        message: err.message || "Terjadi kesalahan saat menguji Cloudinary.",
      });
    } finally {
      setTestingCloudinary(false);
    }
  };

  const handleTestGemini = async () => {
    try {
      setTestingGemini(true);
      setGeminiNotice(null);
      const res = await api.testGemini();
      if (res.success) {
        setGeminiNotice({
          type: "success",
          message: res.message + (res.sampleResponse ? ` (Respon: "${res.sampleResponse}")` : ""),
        });
        await fetchIntegrations();
      } else {
        setGeminiNotice({
          type: "error",
          message: res.message || "Gagal menguji koneksi Google Gemini AI.",
        });
      }
    } catch (err: any) {
      setGeminiNotice({
        type: "error",
        message: err.message || "Terjadi kesalahan saat menguji Google Gemini AI.",
      });
    } finally {
      setTestingGemini(false);
    }
  };

  useEffect(() => {
    if (activeTab === "staff") fetchStaff();
    if (activeTab === "logs") fetchLogs();
    if (activeTab === "integrations") fetchIntegrations();
  }, [activeTab]);

  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoCopied, setLogoCopied] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const handleLogoFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Mohon pilih file gambar (PNG, JPG, SVG, WebP)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file logo maksimal 2MB");
      return;
    }

    try {
      setIsUploadingLogo(true);
      setPasteNotice("Mengunggah gambar logo...");

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let finalLogoUrl = dataUrl;

      // Attempt upload via API
      try {
        const uploadRes = await api.uploadImage(dataUrl, file.name);
        finalLogoUrl = uploadRes.url;
        if (uploadRes.provider === "cloudinary") {
          setPasteNotice("✓ Logo berhasil diunggah ke Cloudinary CDN & diperbarui!");
        } else {
          setPasteNotice("✓ Logo berhasil diperbarui!");
        }
      } catch (uploadErr) {
        console.warn("Upload API error, saving directly as dataUrl", uploadErr);
        setPasteNotice("✓ Logo berhasil diperbarui!");
      }

      setStoreForm((prev) => ({ ...prev, logo_url: finalLogoUrl }));

      // Auto-save to settings in real-time so sidebar, header & print templates update immediately
      try {
        await api.updateSettings({
          ...storeForm,
          logo_url: finalLogoUrl,
        });
        onRefreshSettings();
      } catch (saveErr) {
        console.warn("Failed to auto-save settings with new logo:", saveErr);
      }

      setTimeout(() => setPasteNotice(null), 3500);
    } catch (err: any) {
      setPasteNotice("Gagal memproses gambar logo.");
      setTimeout(() => setPasteNotice(null), 3000);
    } finally {
      setIsUploadingLogo(false);
    }
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

        <button
          onClick={() => setActiveTab("integrations")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "integrations"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          <Cpu className="w-4 h-4" />
          Status Integrasi (AI & Cloud)
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
                  onClick={() => {
                    if (logoInputRef.current) logoInputRef.current.value = "";
                    logoInputRef.current?.click();
                  }}
                  title="Klik untuk ganti logo atau drag file ke sini"
                  className={`relative w-24 h-24 rounded-xl border-2 border-dashed bg-white dark:bg-slate-900 flex items-center justify-center p-2 shadow-xs shrink-0 overflow-hidden group cursor-pointer transition-colors ${
                    isDraggingLogo
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-slate-300 dark:border-slate-700 hover:border-indigo-400"
                  }`}
                >
                  {isUploadingLogo ? (
                    <div className="flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <RefreshCw className="w-6 h-6 animate-spin mb-1" />
                      <span className="text-[9px] font-semibold">Mengunggah...</span>
                    </div>
                  ) : storeForm.logo_url ? (
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
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = "";
                    }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        e.target.value = "";
                        handleLogoFileUpload(file);
                      }
                    }}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Choose File Button */}
                    <button
                      type="button"
                      disabled={isUploadingLogo}
                      onClick={() => {
                        if (logoInputRef.current) logoInputRef.current.value = "";
                        logoInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Upload className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isUploadingLogo ? "animate-pulse" : ""}`} />
                      <span>{isUploadingLogo ? "Sedang Mengunggah..." : "Upload / Pilih File"}</span>
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
                        onClick={async () => {
                          setStoreForm((prev) => ({ ...prev, logo_url: "" }));
                          try {
                            await api.updateSettings({ ...storeForm, logo_url: "" });
                            onRefreshSettings();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
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

      {/* TAB 6: INTEGRATIONS STATUS */}
      {activeTab === "integrations" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                Status Integrasi Eksternal & Cloud
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pantau koneksi API pihak ketiga (Gemini AI, Resend Email, Cloudinary Image, Neon Database).
              </p>
            </div>
            <button
              onClick={fetchIntegrations}
              disabled={loadingIntegrations}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingIntegrations ? "animate-spin" : ""}`} />
              {loadingIntegrations ? "Memeriksa..." : "Refresh Status"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. GEMINI */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Google Gemini AI
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">GEMINI_API_KEY (gemini-3.7-flash)</p>
                  </div>
                </div>
                {integrationStatus?.gemini?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                    <AlertCircle className="w-3 h-3" /> Belum Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Mendukung fitur OCR AI Smart Scanner Nota Struk Belanja & Bon Kulakan Supplier otomatis di Menu Kas & Keuangan.
              </p>

              {geminiNotice && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    geminiNotice.type === "success"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {geminiNotice.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{geminiNotice.message}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleTestGemini}
                  disabled={testingGemini}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingGemini ? "animate-spin" : ""}`} />
                  {testingGemini ? "Menguji Koneksi..." : "🧪 Test Koneksi Gemini AI"}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <strong>Status:</strong> {integrationStatus?.gemini?.connected ? "Kunci API aktif dan siap memindai nota struk belanja." : "Tambahkan GEMINI_API_KEY di Settings platform."}
              </div>
            </div>

            {/* 2. NEON DATABASE */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Neon PostgreSQL
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">DATABASE_URL</p>
                  </div>
                </div>
                {integrationStatus?.neon?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung ({dbStatus?.tableCount ?? 0} Tabel)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    <Database className="w-3 h-3" /> Memori Lokal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Persistensi cloud database relasional aman untuk orderan, produk, supplier, dan kas.
              </p>

              {dbInitNotice && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    dbInitNotice.type === "success"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {dbInitNotice.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{dbInitNotice.message}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleSyncDatabase}
                  disabled={syncingDb || initingDb}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingDb ? "animate-spin" : ""}`} />
                  {syncingDb ? "Menyinkronkan Data..." : "🔄 Tarik Data dari Neon (Sync)"}
                </button>
                <button
                  onClick={handleInitDatabase}
                  disabled={initingDb || syncingDb}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <Database className={`w-3.5 h-3.5 ${initingDb ? "animate-spin" : ""}`} />
                  {initingDb ? "Memeriksa Skema..." : "⚡ Verifikasi Skema Tabel"}
                </button>
                <button
                  onClick={() => setSqlModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Lihat / Salin Skema SQL
                </button>
              </div>

              <div className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <strong>Status:</strong> {integrationStatus?.neon?.connected ? `Tersambung ke cloud database Neon (${dbStatus?.tableCount ?? 0} dari 12 tabel aktif).` : "Data tersimpan di cache server aktif."}
              </div>
            </div>

            {/* 3. RESEND EMAIL */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Resend Email API
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">RESEND_API_KEY</p>
                  </div>
                </div>
                {integrationStatus?.resend?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <Mail className="w-3 h-3" /> Siap / Mailto Fallback
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Pengiriman invoice tagihan dan link tracking pesanan ke email pelanggan secara instan.
              </p>
              <div className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <strong>Status:</strong> {integrationStatus?.resend?.connected ? "Kirim email otomatis via Resend aktif." : "Mode mailto/draft email aktif otomatis saat mengirim tagihan."}
              </div>
            </div>

            {/* 4. CLOUDINARY */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Cloudinary Image Hosting
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">CLOUDINARY_NAME & API_KEY & API_SECRET</p>
                  </div>
                </div>
                {integrationStatus?.cloudinary?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung ({integrationStatus?.cloudinary?.cloudName || "Cloud"})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <AlertCircle className="w-3 h-3" /> Perlu API Secret
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Penyimpanan foto produk katalog dan logo toko ke CDN cloud eksternal agar link gambar langsung online dan hemat memori database.
              </p>

              {cloudinaryNotice && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    cloudinaryNotice.type === "success"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {cloudinaryNotice.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{cloudinaryNotice.message}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleTestCloudinary}
                  disabled={testingCloudinary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingCloudinary ? "animate-spin" : ""}`} />
                  {testingCloudinary ? "Menguji Koneksi..." : "🧪 Test Upload ke Cloudinary"}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <div>
                  <strong>Cloud Name:</strong>{" "}
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {integrationStatus?.cloudinary?.cloudName || "Belum terdeteksi"}
                  </span>
                </div>
                <div>
                  <strong>Status Kunci:</strong>{" "}
                  {integrationStatus?.cloudinary?.hasApiSecret ? (
                    <span className="text-emerald-600 font-medium">✓ Lengkap (API Key & Secret Terpasang)</span>
                  ) : (
                    <span className="text-amber-600 font-medium">
                      ⚠️ Kurang <strong>CLOUDINARY_API_SECRET</strong> di Vercel Environment Variables.
                    </span>
                  )}
                </div>
              </div>
            </div>
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
      {/* SQL Schema Modal */}
      {sqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Skema SQL Neon PostgreSQL
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dapat dijalankan langsung di tab <strong>SQL Editor</strong> pada console Neon.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSqlModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 text-emerald-400 font-mono text-[11px] p-4 rounded-xl border border-slate-800 space-y-2 select-all leading-relaxed">
              <pre className="whitespace-pre-wrap">{`-- Skema Tabel Jeres Studio untuk Neon PostgreSQL
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nama VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  kategori VARCHAR(50) NOT NULL,
  nama_item VARCHAR(150) NOT NULL,
  deskripsi TEXT,
  satuan VARCHAR(30) DEFAULT 'pcs' NOT NULL,
  harga INTEGER NOT NULL,
  harga_minimum_qty INTEGER DEFAULT 1,
  gambar_url TEXT,
  images TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  tampilkan_harga_publik BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  nomor_nota VARCHAR(50) NOT NULL UNIQUE,
  nama_pelanggan VARCHAR(150) NOT NULL,
  no_wa VARCHAR(50) NOT NULL,
  tanggal_order TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  tanggal_ambil TIMESTAMP,
  status VARCHAR(30) DEFAULT 'pending' NOT NULL,
  metode_bayar VARCHAR(50) DEFAULT 'Cash' NOT NULL,
  status_bayar VARCHAR(30) DEFAULT 'belum' NOT NULL,
  jumlah_dp INTEGER DEFAULT 0,
  catatan TEXT,
  subtotal INTEGER DEFAULT 0 NOT NULL,
  diskon INTEGER DEFAULT 0 NOT NULL,
  total INTEGER DEFAULT 0 NOT NULL,
  created_by VARCHAR(100) DEFAULT 'admin',
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMP,
  progress_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  nama_item VARCHAR(150) NOT NULL,
  qty NUMERIC DEFAULT 1 NOT NULL,
  satuan VARCHAR(30) DEFAULT 'pcs' NOT NULL,
  harga_satuan INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  catatan_item TEXT,
  panjang NUMERIC,
  lebar NUMERIC,
  dimensi_unit VARCHAR(20) DEFAULT 'm',
  jumlah_lembar INTEGER DEFAULT 1,
  hitung_dimensi BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  nama_vendor VARCHAR(150) NOT NULL,
  kategori_supply VARCHAR(100) DEFAULT 'Lainnya',
  kontak TEXT,
  kontak_nama VARCHAR(100),
  no_wa VARCHAR(50),
  link TEXT,
  alamat TEXT,
  catatan TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS product_vendors (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  harga_modal INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_history (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  nama_barang VARCHAR(150) NOT NULL,
  qty NUMERIC DEFAULT 1 NOT NULL,
  satuan VARCHAR(30) DEFAULT 'pcs' NOT NULL,
  harga_satuan INTEGER NOT NULL,
  total INTEGER NOT NULL,
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS guides (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) DEFAULT 'Template Chat' NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  tipe VARCHAR(20) NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  kantong VARCHAR(50) DEFAULT 'margin' NOT NULL,
  nominal INTEGER NOT NULL,
  tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  metode_pembayaran VARCHAR(50) DEFAULT 'Cash' NOT NULL,
  keterangan TEXT NOT NULL,
  referensi VARCHAR(100),
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS store_settings (
  id SERIAL PRIMARY KEY,
  nama_toko VARCHAR(150) DEFAULT 'Jeres Studio' NOT NULL,
  slogan VARCHAR(250) DEFAULT 'Solusi Cetak & Desain Digital Cepat, Rapi & Berkualitas',
  alamat TEXT DEFAULT 'Jl. Percetakan No. 134, Kota Kreatif, Indonesia',
  no_wa VARCHAR(50) DEFAULT '6281234567890' NOT NULL,
  email VARCHAR(100) DEFAULT 'jeresstudio134@gmail.com',
  logo_url TEXT DEFAULT '',
  rekening_bank TEXT DEFAULT 'BCA: 123-456-7890 a/n Jeres Studio\nMandiri: 987-654-3210 a/n Jeres Studio\nQRIS: Tersedia di Kasir',
  catatan_nota TEXT DEFAULT '1. Barang yang sudah dicetak sesuai ACC tidak dapat dikembalikan.\n2. Pembayaran lunas saat pengambilan barang.\n3. File disimpan maksimal 30 hari.',
  margin_threshold_good VARCHAR(10) DEFAULT '20',
  margin_threshold_warning VARCHAR(10) DEFAULT '10',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`}</pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                {sqlCopied ? "✓ Skema SQL berhasil disalin ke clipboard!" : "Salin dan tempel ke SQL Editor di console Neon Anda."}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sqlText = `-- Skema Tabel Jeres Studio untuk Neon PostgreSQL
CREATE TABLE IF NOT EXISTS admin_users (id SERIAL PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE, password_hash TEXT NOT NULL, nama VARCHAR(100) NOT NULL, role VARCHAR(20) DEFAULT 'staff' NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, kategori VARCHAR(50) NOT NULL, nama_item VARCHAR(150) NOT NULL, deskripsi TEXT, satuan VARCHAR(30) DEFAULT 'pcs' NOT NULL, harga INTEGER NOT NULL, harga_minimum_qty INTEGER DEFAULT 1, gambar_url TEXT, images TEXT, is_active BOOLEAN DEFAULT TRUE NOT NULL, tampilkan_harga_publik BOOLEAN DEFAULT TRUE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, nomor_nota VARCHAR(50) NOT NULL UNIQUE, nama_pelanggan VARCHAR(150) NOT NULL, no_wa VARCHAR(50) NOT NULL, tanggal_order TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, tanggal_ambil TIMESTAMP, status VARCHAR(30) DEFAULT 'pending' NOT NULL, metode_bayar VARCHAR(50) DEFAULT 'Cash' NOT NULL, status_bayar VARCHAR(30) DEFAULT 'belum' NOT NULL, jumlah_dp INTEGER DEFAULT 0, catatan TEXT, subtotal INTEGER DEFAULT 0 NOT NULL, diskon INTEGER DEFAULT 0 NOT NULL, total INTEGER DEFAULT 0 NOT NULL, created_by VARCHAR(100) DEFAULT 'admin', share_token TEXT UNIQUE, share_expires_at TIMESTAMP, progress_notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id) ON DELETE SET NULL, nama_item VARCHAR(150) NOT NULL, qty NUMERIC DEFAULT 1 NOT NULL, satuan VARCHAR(30) DEFAULT 'pcs' NOT NULL, harga_satuan INTEGER NOT NULL, subtotal INTEGER NOT NULL, catatan_item TEXT, panjang NUMERIC, lebar NUMERIC, dimensi_unit VARCHAR(20) DEFAULT 'm', jumlah_lembar INTEGER DEFAULT 1, hitung_dimensi BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS vendors (id SERIAL PRIMARY KEY, nama_vendor VARCHAR(150) NOT NULL, kategori_supply VARCHAR(100) DEFAULT 'Lainnya', kontak TEXT, kontak_nama VARCHAR(100), no_wa VARCHAR(50), link TEXT, alamat TEXT, catatan TEXT, is_active BOOLEAN DEFAULT TRUE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS product_vendors (id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE, harga_modal INTEGER NOT NULL, is_default BOOLEAN DEFAULT FALSE NOT NULL, catatan TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS purchase_history (id SERIAL PRIMARY KEY, vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE, tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, nama_barang VARCHAR(150) NOT NULL, qty NUMERIC DEFAULT 1 NOT NULL, satuan VARCHAR(30) DEFAULT 'pcs' NOT NULL, harga_satuan INTEGER NOT NULL, total INTEGER NOT NULL, catatan TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS activity_logs (id SERIAL PRIMARY KEY, user_name VARCHAR(100) NOT NULL, action VARCHAR(100) NOT NULL, details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS guides (id SERIAL PRIMARY KEY, category VARCHAR(100) DEFAULT 'Template Chat' NOT NULL, title VARCHAR(255) NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, type VARCHAR(20) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, tipe VARCHAR(20) NOT NULL, kategori VARCHAR(100) NOT NULL, kantong VARCHAR(50) DEFAULT 'margin' NOT NULL, nominal INTEGER NOT NULL, tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, metode_pembayaran VARCHAR(50) DEFAULT 'Cash' NOT NULL, keterangan TEXT NOT NULL, referensi VARCHAR(100), created_by VARCHAR(100) DEFAULT 'admin', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS store_settings (id SERIAL PRIMARY KEY, nama_toko VARCHAR(150) DEFAULT 'Jeres Studio' NOT NULL, slogan VARCHAR(250) DEFAULT 'Solusi Cetak & Desain Digital Cepat, Rapi & Berkualitas', alamat TEXT DEFAULT 'Jl. Percetakan No. 134, Kota Kreatif, Indonesia', no_wa VARCHAR(50) DEFAULT '6281234567890' NOT NULL, email VARCHAR(100) DEFAULT 'jeresstudio134@gmail.com', logo_url TEXT DEFAULT '', rekening_bank TEXT DEFAULT 'BCA: 123-456-7890 a/n Jeres Studio\\nMandiri: 987-654-3210 a/n Jeres Studio\\nQRIS: Tersedia di Kasir', catatan_nota TEXT DEFAULT '1. Barang yang sudah dicetak sesuai ACC tidak dapat dikembalikan.\\n2. Pembayaran lunas saat pengambilan barang.\\n3. File disimpan maksimal 30 hari.', margin_threshold_good VARCHAR(10) DEFAULT '20', margin_threshold_warning VARCHAR(10) DEFAULT '10', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);`;
                    navigator.clipboard.writeText(sqlText);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {sqlCopied ? "Tersalin!" : "Salin Skema SQL"}
                </button>
                <button
                  type="button"
                  onClick={() => setSqlModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
