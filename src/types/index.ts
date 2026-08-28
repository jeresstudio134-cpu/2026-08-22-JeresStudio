export interface AdminUser {
  id: number;
  username: string;
  nama: string;
  role: "owner" | "staff";
  created_at?: string;
}

export interface ProductVendor {
  id: number;
  product_id: number;
  vendor_id: number;
  harga_modal: number;
  is_default: boolean;
  catatan?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields from vendor
  nama_vendor?: string;
  kontak?: string;
  kontak_nama?: string;
  no_wa?: string;
  link?: string;
  vendor_catatan?: string;
  kategori_supply?: string;
}

export interface MarginThresholdSettings {
  margin_threshold_good: number;
  margin_threshold_warning: number;
}

export interface Product {
  id: number;
  kategori: "stiker" | "dtf" | "banner" | "jersey" | "desain" | "lainnya" | string;
  nama_item: string;
  deskripsi: string;
  satuan: "pcs" | "meter" | "lusin" | "lembar" | "paket" | string;
  harga: number;
  harga_minimum_qty?: number;
  gambar_url?: string;
  images?: string[];
  is_active: boolean;
  tampilkan_harga_publik: boolean;
  created_at?: string;
  updated_at?: string;
  // Vendor & Margin information (admin-only)
  product_vendors?: ProductVendor[];
  default_vendor?: ProductVendor | null;
  vendor_count?: number;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id?: number | null;
  nama_item: string;
  qty: number;
  satuan: string;
  harga_satuan: number;
  subtotal: number;
  catatan_item?: string;
  // Dimensi / Panjang x Lebar (P x L) calculation
  panjang?: number | null;
  lebar?: number | null;
  dimensi_unit?: "m" | "cm";
  jumlah_lembar?: number;
  hitung_dimensi?: boolean;
}

export interface ProgressNote {
  status: string; // e.g. "Pending" | "Dalam Proses" | "Selesai" | "Dibatalkan"
  detail: string; // e.g. "Order diterima, menunggu konfirmasi", "Sedang di-print", "Packing"
  timestamp: string; // ISO date string
}

export interface Order {
  id: number;
  nomor_nota: string;
  nama_pelanggan: string;
  no_wa: string;
  tanggal_order: string;
  tanggal_ambil?: string | null;
  status: "pending" | "proses" | "selesai" | "dibatalkan";
  metode_bayar: string;
  status_bayar: "belum" | "dp" | "lunas";
  jumlah_dp: number;
  catatan?: string;
  subtotal: number;
  diskon: number;
  total: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  share_token?: string | null;
  share_expires_at?: string | null;
  progress_notes?: ProgressNote[] | string | null;
}

export interface PublicOrderTracking {
  nomor_nota: string;
  tanggal_order: string;
  tanggal_ambil?: string | null;
  nama_pelanggan: string;
  status: "pending" | "proses" | "selesai" | "dibatalkan";
  status_bayar: "belum" | "dp" | "lunas";
  metode_bayar?: string;
  subtotal: number;
  diskon: number;
  total: number;
  jumlah_dp: number;
  catatan?: string;
  items: Array<{
    nama_item: string;
    qty: number;
    satuan: string;
    harga_satuan: number;
    subtotal: number;
    catatan_item?: string;
  }>;
  progress_notes: ProgressNote[];
  share_expires_at?: string | null;
  store_info: {
    nama_toko: string;
    alamat: string;
    no_telepon_wa: string;
    email: string;
    logo_url?: string;
    catatan_footer?: string;
  };
}

export interface Vendor {
  id: number;
  nama_vendor: string;
  kategori_supply?: string;
  kontak?: string;
  kontak_nama?: string;
  no_wa?: string;
  link?: string;
  alamat?: string;
  catatan?: string;
  is_active?: boolean;
  totalPurchases?: number;
  totalSpent?: number;
  created_at?: string;
  updated_at?: string;
  purchases?: PurchaseHistory[];
}

export interface PurchaseHistory {
  id: number;
  vendor_id: number;
  vendor_nama?: string;
  tanggal: string;
  nama_barang: string;
  qty: number;
  satuan: string;
  harga_satuan: number;
  total: number;
  catatan?: string;
  created_at?: string;
}

export interface TransactionCategory {
  id: number;
  name: string;
  type: "masuk" | "keluar";
  created_at?: string;
}

export interface Guide {
  id: number;
  category: string; // e.g. "Template Chat", "SOP/Alur Kerja", "Instruksi Setting Desain", etc.
  title: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: number;
  user_name: string;
  action: string;
  details?: string;
  created_at: string;
}

export type KantongKasType = "modal" | "overhead" | "gaji_saya" | "gaji_karyawan" | "margin";

export interface KantongBalance {
  saldo: number;
  masuk: number;
  keluar: number;
}

export interface KantongBalances {
  modal: KantongBalance;
  overhead: KantongBalance;
  gaji_saya: KantongBalance;
  gaji_karyawan: KantongBalance;
  margin: KantongBalance;
}

export interface HppBreakdown {
  modal: number;
  overhead: number;
  gajiSaya: number;
  gajiKaryawan: number;
  margin: number;
}

export interface Transaction {
  id: number;
  tipe: "masuk" | "keluar"; // 'masuk' (Income) | 'keluar' (Expense)
  kategori: string;
  kantong?: KantongKasType; // Kantong Kas alokasi ('modal' | 'overhead' | 'gaji_saya' | 'gaji_karyawan' | 'margin')
  nominal: number;
  tanggal: string;
  metode_pembayaran: string; // 'Cash' | 'Transfer BCA' | 'Transfer Mandiri' | 'QRIS' | 'Lainnya'
  keterangan: string;
  referensi?: string; // e.g. "Nota INV-20250821-0001" or "Faktur Kulakan #1"
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialSummary {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoBersih: number;
  pemasukanBulanIni: number;
  pengeluaranBulanIni: number;
  saldoBulanIni: number;
  breakdownPemasukan: Array<{ kategori: string; total: number; count: number }>;
  breakdownPengeluaran: Array<{ kategori: string; total: number; count: number }>;
  kantongBalances?: KantongBalances;
}

export interface ScannedReceiptItem {
  nama_item: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
}

export interface ScannedReceiptResult {
  tipe: "masuk" | "keluar";
  vendor_name: string;
  nominal: number;
  tanggal: string;
  kategori: string;
  kantong?: KantongKasType;
  metode_pembayaran: string;
  referensi?: string;
  keterangan: string;
  items?: ScannedReceiptItem[];
  confidence_notes?: string;
}

export interface StoreSettings {
  id?: number;
  nama_toko: string;
  slogan: string;
  alamat: string;
  no_wa: string;
  email: string;
  logo_url: string;
  rekening_bank: string;
  catatan_nota: string;
  updated_at?: string;
}

export interface DashboardStats {
  totalOmzetBulanIni: number;
  totalOrderBulanIni: number;
  orderPending: number;
  orderProses: number;
  orderSelesai: number;
  deadlineApproachingCount: number;
  deadlineApproachingOrders: Order[];
  revenueTrend: Array<{
    bulan: string;
    omzet: number;
    orderCount: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    value: number;
  }>;
  recentOrders: Order[];
}
