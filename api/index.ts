import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { memoryDb, isNeonConnected, db } from "../src/db/index.js";
import * as schema from "../src/db/schema.js";
import { eq, desc } from "drizzle-orm";

const app = express();

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "jeres-studio-secret-key-super-secure-2025";

// Helper to generate public share token
function generateShareToken(): string {
  return "trk_" + randomBytes(10).toString("hex");
}

// Helper to normalize progress notes
function normalizeProgressNotes(notes: any): Array<{ status: string; detail: string; timestamp: string }> {
  if (Array.isArray(notes)) {
    return notes;
  }
  if (typeof notes === "string" && notes.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

// Helper to format status text
function getStatusLabel(statusStr: string): string {
  const s = (statusStr || "").toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "proses" || s === "dalam proses") return "Dalam Proses";
  if (s === "selesai") return "Selesai";
  if (s === "dibatalkan" || s === "batal") return "Dibatalkan";
  return statusStr || "Pending";
}

// Gemini AI Client Helper
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi. Silakan pastikan API key tersedia di Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper for activity log
function logActivity(userName: string, action: string, details: string) {
  try {
    const newLog = {
      id: memoryDb.activityLogs.length + 1,
      user_name: userName || "System/Admin",
      action,
      details,
      created_at: new Date().toISOString(),
    };
    memoryDb.activityLogs.unshift(newLog);
  } catch (e) {
    console.error("Log activity error:", e);
  }
}

// Authentication Middleware
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const tokenFromHeader = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const tokenFromCookie = req.cookies ? req.cookies.admin_token : null;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    res.status(401).json({ error: "Akses ditolak. Silakan login terlebih dahulu." });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: "Sesi telah berakhir atau token tidak valid." });
      return;
    }
    (req as any).user = user;
    next();
  });
}

// Optional Auth (for Public vs Admin info)
function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) || req.cookies?.admin_token;
  if (token) {
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (!err && user) {
        (req as any).user = user;
      }
      next();
    });
  } else {
    next();
  }
}

/* ========================================================
   AUTH ROUTES
======================================================== */

// Login
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username dan password wajib diisi." });
    return;
  }

  const user = memoryDb.adminUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    res.status(401).json({ error: "Username atau password salah." });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    res.status(401).json({ error: "Username atau password salah." });
    return;
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

  res.cookie("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logActivity(user.nama, "Login Admin", `Pengguna ${user.nama} (${user.role}) berhasil masuk`);

  res.json({
    message: "Login berhasil",
    token,
    user: {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
    },
  });
});

// Logout
app.post("/api/auth/logout", (req: Request, res: Response) => {
  res.clearCookie("admin_token");
  res.json({ message: "Logout berhasil" });
});

// Current User
app.get("/api/auth/me", authenticateToken, (req: Request, res: Response) => {
  const user = (req as any).user;
  const fullUser = memoryDb.adminUsers.find((u) => u.id === user.id);
  if (!fullUser) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }
  res.json({
    user: {
      id: fullUser.id,
      username: fullUser.username,
      nama: fullUser.nama,
      role: fullUser.role,
    },
  });
});

// Staff List (Owner/Admin Only)
app.get("/api/auth/staff", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (currentUser.role !== "owner") {
    res.status(403).json({ error: "Hanya Admin/Owner yang dapat melihat daftar staff." });
    return;
  }

  const list = memoryDb.adminUsers.map((u) => ({
    id: u.id,
    username: u.username,
    nama: u.nama,
    role: u.role,
    created_at: u.created_at,
  }));
  res.json({ staff: list });
});

// Add New Staff
app.post("/api/auth/staff", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (currentUser.role !== "owner") {
    res.status(403).json({ error: "Hanya Owner yang dapat menambah pengguna baru." });
    return;
  }

  const { username, password, nama, role } = req.body;
  if (!username || !password || !nama) {
    res.status(400).json({ error: "Username, nama, dan password wajib diisi." });
    return;
  }

  const existing = memoryDb.adminUsers.find((u) => u.username.toLowerCase() === username.toLowerCase().trim());
  if (existing) {
    res.status(400).json({ error: "Username sudah digunakan." });
    return;
  }

  const newUser = {
    id: memoryDb.adminUsers.length ? Math.max(...memoryDb.adminUsers.map((u) => u.id)) + 1 : 1,
    username: username.trim(),
    password_hash: bcrypt.hashSync(password, 10),
    nama: nama.trim(),
    role: role === "owner" ? "owner" : "staff",
    created_at: new Date().toISOString(),
  };

  memoryDb.adminUsers.push(newUser);
  logActivity(currentUser.nama, "Tambah Staff", `Menambahkan user baru: ${nama} (${newUser.role})`);

  res.status(201).json({
    message: "Staff berhasil ditambahkan",
    user: {
      id: newUser.id,
      username: newUser.username,
      nama: newUser.nama,
      role: newUser.role,
    },
  });
});

// Update Staff User (Username, Name, Role, and optional Password)
app.put("/api/auth/staff/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const staffId = Number(req.params.id);

  // Only owner or the user themselves can edit
  if (currentUser.role !== "owner" && currentUser.id !== staffId) {
    res.status(403).json({ error: "Anda tidak memiliki izin untuk mengedit akun ini." });
    return;
  }

  const targetUser = memoryDb.adminUsers.find((u) => u.id === staffId);
  if (!targetUser) {
    res.status(404).json({ error: "User tidak ditemukan." });
    return;
  }

  const { username, nama, role, password } = req.body;

  if (username && username.trim().toLowerCase() !== targetUser.username.toLowerCase()) {
    const existing = memoryDb.adminUsers.find(
      (u) => u.id !== staffId && u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (existing) {
      res.status(400).json({ error: "Username sudah digunakan oleh akun lain." });
      return;
    }
    targetUser.username = username.trim();
  }

  if (nama && nama.trim()) {
    targetUser.nama = nama.trim();
  }

  // Only Owner can change roles, and cannot demote the last owner
  if (role && currentUser.role === "owner") {
    if (targetUser.role === "owner" && role !== "owner") {
      const ownerCount = memoryDb.adminUsers.filter((u) => u.role === "owner").length;
      if (ownerCount <= 1) {
        res.status(400).json({ error: "Tidak dapat mengubah role karena minimal harus ada 1 Owner." });
        return;
      }
    }
    targetUser.role = role === "owner" ? "owner" : "staff";
  }

  // Optional new password
  if (password && password.trim()) {
    if (password.trim().length < 6) {
      res.status(400).json({ error: "Password baru minimal 6 karakter." });
      return;
    }
    targetUser.password_hash = bcrypt.hashSync(password.trim(), 10);
  }

  logActivity(currentUser.nama, "Edit User", `Memperbarui data user: ${targetUser.nama} (${targetUser.username})`);

  res.json({
    message: "Data akun berhasil diperbarui",
    user: {
      id: targetUser.id,
      username: targetUser.username,
      nama: targetUser.nama,
      role: targetUser.role,
    },
  });
});

// Delete Staff User
app.delete("/api/auth/staff/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const staffId = Number(req.params.id);

  if (currentUser.role !== "owner") {
    res.status(403).json({ error: "Hanya Owner yang dapat menghapus akun." });
    return;
  }

  if (currentUser.id === staffId) {
    res.status(400).json({ error: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif." });
    return;
  }

  const targetIdx = memoryDb.adminUsers.findIndex((u) => u.id === staffId);
  if (targetIdx === -1) {
    res.status(404).json({ error: "User tidak ditemukan." });
    return;
  }

  const removedUser = memoryDb.adminUsers[targetIdx];
  memoryDb.adminUsers.splice(targetIdx, 1);
  logActivity(currentUser.nama, "Hapus Staff", `Menghapus akun: ${removedUser.nama} (${removedUser.username})`);

  res.json({ message: "Akun staff berhasil dihapus." });
});

// Change Password
app.post("/api/auth/change-password", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { currentPassword, newPassword, targetUserId } = req.body;

  const targetId = targetUserId && currentUser.role === "owner" ? Number(targetUserId) : currentUser.id;
  const user = memoryDb.adminUsers.find((u) => u.id === targetId);

  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan." });
    return;
  }

  if (targetId === currentUser.id) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      res.status(400).json({ error: "Password saat ini tidak cocok." });
      return;
    }
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Password baru minimal 6 karakter." });
    return;
  }

  user.password_hash = bcrypt.hashSync(newPassword, 10);
  logActivity(currentUser.nama, "Ganti Password", `Mengubah password user: ${user.nama}`);

  res.json({ message: "Password berhasil diperbarui." });
});

/* ========================================================
   PRODUCTS (PRICE LIST) ROUTES
======================================================== */

// Get Products (with public/admin filter)
app.get("/api/products", optionalAuth, (req: Request, res: Response) => {
  const isAdmin = !!(req as any).user;
  const { kategori, search, activeOnly } = req.query;

  let results = [...memoryDb.products];

  // If not admin, only show active products
  if (!isAdmin || activeOnly === "true") {
    results = results.filter((p) => p.is_active);
  }

  if (kategori && kategori !== "all") {
    results = results.filter((p) => p.kategori.toLowerCase() === (kategori as string).toLowerCase());
  }

  if (search) {
    const q = (search as string).toLowerCase();
    results = results.filter(
      (p) =>
        p.nama_item.toLowerCase().includes(q) ||
        (p.deskripsi && p.deskripsi.toLowerCase().includes(q)) ||
        p.kategori.toLowerCase().includes(q)
    );
  }

  if (isAdmin) {
    // Enrich with vendor and margin information for admin only
    const enriched = results.map((product) => {
      const pvList = (memoryDb.product_vendors || []).filter((pv) => pv.product_id === product.id);
      const joinedPV = pvList.map((pv) => {
        const v = (memoryDb.vendors || []).find((ven) => ven.id === pv.vendor_id);
        return {
          ...pv,
          nama_vendor: v ? v.nama_vendor : "Vendor Tidak Dikenal",
          kontak: v ? (v.kontak || v.no_wa || "") : "",
          kontak_nama: v ? (v.kontak_nama || "") : "",
          no_wa: v ? (v.no_wa || "") : "",
          link: v ? (v.link || "") : "",
          vendor_catatan: v ? (v.catatan || "") : "",
          kategori_supply: v ? (v.kategori_supply || "") : "",
        };
      });

      const defaultVendor = joinedPV.find((pv) => pv.is_default) || (joinedPV.length > 0 ? joinedPV[0] : null);

      return {
        ...product,
        product_vendors: joinedPV,
        default_vendor: defaultVendor,
        vendor_count: joinedPV.length,
      };
    });

    res.json({ products: enriched });
    return;
  }

  // Strictly sanitize for public / customer: NO vendor data, NO cost data
  const publicResults = results.map((p) => {
    const { product_vendors, default_vendor, vendor_count, ...cleanProduct } = p as any;
    return cleanProduct;
  });

  res.json({ products: publicResults });
});

// Add Product
app.post("/api/products", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { kategori, nama_item, deskripsi, satuan, harga, harga_minimum_qty, gambar_url, images, is_active, tampilkan_harga_publik } = req.body;

  if (!kategori || !nama_item || harga === undefined) {
    res.status(400).json({ error: "Kategori, Nama Item, dan Harga wajib diisi." });
    return;
  }

  const normalizedImages: string[] = Array.isArray(images) && images.length > 0 
    ? images.filter((img: any) => typeof img === "string" && img.trim() !== "")
    : (gambar_url ? [gambar_url] : []);

  const primaryImage = normalizedImages.length > 0 ? normalizedImages[0] : (gambar_url || "");

  const newId = memoryDb.products.length ? Math.max(...memoryDb.products.map((p) => p.id)) + 1 : 1;
  const newProduct = {
    id: newId,
    kategori: kategori.toLowerCase().trim(),
    nama_item: nama_item.trim(),
    deskripsi: deskripsi || "",
    satuan: satuan || "pcs",
    harga: Number(harga),
    harga_minimum_qty: Number(harga_minimum_qty) || 1,
    gambar_url: primaryImage,
    images: normalizedImages,
    is_active: is_active !== false,
    tampilkan_harga_publik: tampilkan_harga_publik !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryDb.products.push(newProduct);
  logActivity(currentUser.nama, "Tambah Produk", `Menambahkan ${newProduct.nama_item} (Rp ${newProduct.harga})`);

  res.status(201).json({ message: "Produk berhasil ditambahkan", product: newProduct });
});

// Update Product
app.put("/api/products/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = memoryDb.products.findIndex((p) => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Produk tidak ditemukan." });
    return;
  }

  const { kategori, nama_item, deskripsi, satuan, harga, harga_minimum_qty, gambar_url, images, is_active, tampilkan_harga_publik } = req.body;

  let normalizedImages = memoryDb.products[index].images || [];
  if (Array.isArray(images)) {
    normalizedImages = images.filter((img: any) => typeof img === "string" && img.trim() !== "");
  } else if (gambar_url !== undefined && !images) {
    normalizedImages = gambar_url ? [gambar_url] : [];
  }

  const primaryImage = normalizedImages.length > 0 ? normalizedImages[0] : (gambar_url !== undefined ? gambar_url : memoryDb.products[index].gambar_url);

  memoryDb.products[index] = {
    ...memoryDb.products[index],
    kategori: kategori ? kategori.toLowerCase().trim() : memoryDb.products[index].kategori,
    nama_item: nama_item ? nama_item.trim() : memoryDb.products[index].nama_item,
    deskripsi: deskripsi !== undefined ? deskripsi : memoryDb.products[index].deskripsi,
    satuan: satuan || memoryDb.products[index].satuan,
    harga: harga !== undefined ? Number(harga) : memoryDb.products[index].harga,
    harga_minimum_qty: harga_minimum_qty !== undefined ? Number(harga_minimum_qty) : memoryDb.products[index].harga_minimum_qty,
    gambar_url: primaryImage,
    images: normalizedImages,
    is_active: is_active !== undefined ? Boolean(is_active) : memoryDb.products[index].is_active,
    tampilkan_harga_publik: tampilkan_harga_publik !== undefined ? Boolean(tampilkan_harga_publik) : memoryDb.products[index].tampilkan_harga_publik,
    updated_at: new Date().toISOString(),
  };

  logActivity(currentUser.nama, "Edit Produk", `Memperbarui produk ${memoryDb.products[index].nama_item}`);

  res.json({ message: "Produk berhasil diperbarui", product: memoryDb.products[index] });
});

// Delete Product
app.delete("/api/products/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = memoryDb.products.findIndex((p) => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Produk tidak ditemukan." });
    return;
  }

  const deleted = memoryDb.products.splice(index, 1)[0];
  logActivity(currentUser.nama, "Hapus Produk", `Menghapus produk ${deleted.nama_item}`);

  res.json({ message: "Produk berhasil dihapus" });
});

// Toggle Active / Public status
app.patch("/api/products/:id/toggle", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const product = memoryDb.products.find((p) => p.id === id);

  if (!product) {
    res.status(404).json({ error: "Produk tidak ditemukan." });
    return;
  }

  const { field } = req.body; // 'is_active' or 'tampilkan_harga_publik'
  if (field === "is_active") {
    product.is_active = !product.is_active;
  } else if (field === "tampilkan_harga_publik") {
    product.tampilkan_harga_publik = !product.tampilkan_harga_publik;
  }
  product.updated_at = new Date().toISOString();

  logActivity(currentUser.nama, "Update Status Produk", `Ubah ${field} produk ${product.nama_item}`);
  res.json({ message: "Status produk berhasil diubah", product });
});

/* ========================================================
   ORDERS MANAGEMENT ROUTES (CRUD + INVOICE)
======================================================== */

// Auto-generate invoice number format: INV-YYYYMMDD-XXXX
function generateInvoiceNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const todayOrders = memoryDb.orders.filter((o) => o.nomor_nota.includes(`INV-${dateStr}`));
  const nextSeq = String(todayOrders.length + 1).padStart(4, "0");
  return `INV-${dateStr}-${nextSeq}`;
}

// Helper to automatically record order payments into cash ledger (Pemasukan Toko)
function recordOrderCashPayment(params: {
  amount: number;
  invoiceNumber: string;
  customerName: string;
  paymentMethod: string;
  cashierName: string;
  notes?: string;
  date?: string;
}) {
  const nominal = Math.round(Number(params.amount) || 0);
  if (nominal <= 0) return null;

  if (!memoryDb.transactions) {
    memoryDb.transactions = [];
  }

  const newTxId = memoryDb.transactions.length
    ? Math.max(...memoryDb.transactions.map((t) => t.id)) + 1
    : 1;

  const newTx = {
    id: newTxId,
    tipe: "masuk",
    kategori: "Pemasukan Toko",
    nominal,
    tanggal: params.date ? new Date(params.date).toISOString() : new Date().toISOString(),
    metode_pembayaran: params.paymentMethod || "Cash",
    keterangan: params.notes || `Pemasukan Order ${params.invoiceNumber} - ${params.customerName}`,
    referensi: params.invoiceNumber,
    created_by: params.cashierName || "Kasir",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryDb.transactions.push(newTx);
  return newTx;
}

// Get Orders with filters
app.get("/api/orders", authenticateToken, (req: Request, res: Response) => {
  const { status, status_bayar, search, startDate, endDate } = req.query;

  let results = [...memoryDb.orders];

  if (status && status !== "all") {
    results = results.filter((o) => o.status === status);
  }

  if (status_bayar && status_bayar !== "all") {
    results = results.filter((o) => o.status_bayar === status_bayar);
  }

  if (startDate) {
    results = results.filter((o) => new Date(o.tanggal_order) >= new Date(startDate as string));
  }

  if (endDate) {
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    results = results.filter((o) => new Date(o.tanggal_order) <= end);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    results = results.filter(
      (o) =>
        o.nomor_nota.toLowerCase().includes(q) ||
        o.nama_pelanggan.toLowerCase().includes(q) ||
        o.no_wa.includes(q)
    );
  }

  // Attach items to each order
  const ordersWithItems = results.map((order) => ({
    ...order,
    items: memoryDb.orderItems.filter((item) => item.order_id === order.id),
  }));

  // Sort latest first
  ordersWithItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ orders: ordersWithItems });
});

// Get Single Order (for detail / print invoice)
app.get("/api/orders/:id", authenticateToken, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const order = memoryDb.orders.find((o) => o.id === id || o.nomor_nota === req.params.id);

  if (!order) {
    res.status(404).json({ error: "Order tidak ditemukan." });
    return;
  }

  const items = memoryDb.orderItems.filter((i) => i.order_id === order.id);
  res.json({
    order: {
      ...order,
      items,
    },
  });
});

// Create Order
app.post("/api/orders", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const {
    nama_pelanggan,
    no_wa,
    tanggal_ambil,
    status,
    metode_bayar,
    status_bayar,
    jumlah_dp,
    catatan,
    diskon,
    items,
  } = req.body;

  if (!nama_pelanggan || !no_wa) {
    res.status(400).json({ error: "Nama pelanggan dan No. WhatsApp wajib diisi." });
    return;
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Order harus memiliki minimal 1 item cetakan." });
    return;
  }

  const calculatedSubtotal = items.reduce((sum: number, item: any) => {
    const itemSub = Number(item.qty || 1) * Number(item.harga_satuan || 0);
    return sum + itemSub;
  }, 0);

  const discountAmount = Number(diskon) || 0;
  const calculatedTotal = Math.max(0, calculatedSubtotal - discountAmount);
  const invoiceNumber = generateInvoiceNumber();

  const newOrderId = memoryDb.orders.length ? Math.max(...memoryDb.orders.map((o) => o.id)) + 1 : 1;

  const newOrder = {
    id: newOrderId,
    nomor_nota: invoiceNumber,
    nama_pelanggan: nama_pelanggan.trim(),
    no_wa: no_wa.trim(),
    tanggal_order: new Date().toISOString(),
    tanggal_ambil: tanggal_ambil ? new Date(tanggal_ambil).toISOString() : null,
    status: status || "pending",
    metode_bayar: metode_bayar || "Cash",
    status_bayar: status_bayar || "belum",
    jumlah_dp: Number(jumlah_dp) || 0,
    catatan: catatan || "",
    subtotal: calculatedSubtotal,
    diskon: discountAmount,
    total: calculatedTotal,
    created_by: currentUser.nama || "Admin",
    share_token: generateShareToken(),
    share_expires_at: status === "selesai" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    progress_notes: [
      {
        status: getStatusLabel(status || "pending"),
        detail: "Order berhasil dibuat & nota diterbitkan",
        timestamp: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryDb.orders.push(newOrder);

  // Insert items
  let nextItemId = memoryDb.orderItems.length ? Math.max(...memoryDb.orderItems.map((i) => i.id)) + 1 : 1;
  const savedItems = items.map((it: any) => {
    const itemRecord = {
      id: nextItemId++,
      order_id: newOrderId,
      product_id: it.product_id ? Number(it.product_id) : null,
      nama_item: it.nama_item.trim(),
      qty: Number(it.qty) || 1,
      satuan: it.satuan || "pcs",
      harga_satuan: Number(it.harga_satuan) || 0,
      subtotal: (Number(it.qty) || 1) * (Number(it.harga_satuan) || 0),
      panjang: it.panjang !== undefined && it.panjang !== null ? Number(it.panjang) : null,
      lebar: it.lebar !== undefined && it.lebar !== null ? Number(it.lebar) : null,
      dimensi_unit: it.dimensi_unit || "m",
      jumlah_lembar: it.jumlah_lembar ? Number(it.jumlah_lembar) : 1,
      hitung_dimensi: Boolean(it.hitung_dimensi),
      catatan_item: it.catatan_item || "",
    };
    memoryDb.orderItems.push(itemRecord);
    return itemRecord;
  });

  logActivity(currentUser.nama, "Buat Order Baru", `Nota ${invoiceNumber} untuk ${nama_pelanggan} (Total: Rp ${calculatedTotal.toLocaleString()})`);

  // Auto-record cash in to Pemasukan Toko if payment is made at order creation
  if (status_bayar === "lunas" && calculatedTotal > 0) {
    recordOrderCashPayment({
      amount: calculatedTotal,
      invoiceNumber,
      customerName: nama_pelanggan.trim(),
      paymentMethod: metode_bayar || "Cash",
      cashierName: currentUser.nama || "Kasir",
      notes: `Order Lunas (${invoiceNumber}) - ${nama_pelanggan.trim()}`,
      date: newOrder.tanggal_order,
    });
  } else if (status_bayar === "dp") {
    const dpVal = Number(jumlah_dp) || 0;
    if (dpVal > 0) {
      recordOrderCashPayment({
        amount: dpVal,
        invoiceNumber,
        customerName: nama_pelanggan.trim(),
        paymentMethod: metode_bayar || "Cash",
        cashierName: currentUser.nama || "Kasir",
        notes: `DP Order (${invoiceNumber}) - ${nama_pelanggan.trim()}`,
        date: newOrder.tanggal_order,
      });
    }
  }

  res.status(201).json({
    message: "Order berhasil dibuat",
    order: {
      ...newOrder,
      items: savedItems,
    },
  });
});

// Update Order
app.put("/api/orders/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const orderIndex = memoryDb.orders.findIndex((o) => o.id === id);

  if (orderIndex === -1) {
    res.status(404).json({ error: "Order tidak ditemukan." });
    return;
  }

  const oldOrder = memoryDb.orders[orderIndex];
  const oldStatusBayar = oldOrder.status_bayar;
  const oldDp = Number(oldOrder.jumlah_dp) || 0;

  const {
    nama_pelanggan,
    no_wa,
    tanggal_ambil,
    status,
    metode_bayar,
    status_bayar,
    jumlah_dp,
    catatan,
    diskon,
    items,
  } = req.body;

  let calculatedSubtotal = memoryDb.orders[orderIndex].subtotal;
  let discountAmount = diskon !== undefined ? Number(diskon) : memoryDb.orders[orderIndex].diskon;

  // If new items provided, replace items
  if (items && Array.isArray(items)) {
    calculatedSubtotal = items.reduce((sum: number, item: any) => {
      return sum + Number(item.qty || 1) * Number(item.harga_satuan || 0);
    }, 0);

    // Delete old items
    memoryDb.orderItems = memoryDb.orderItems.filter((i) => i.order_id !== id);

    // Insert new
    let nextItemId = memoryDb.orderItems.length ? Math.max(...memoryDb.orderItems.map((i) => i.id)) + 1 : 1;
    items.forEach((it: any) => {
      memoryDb.orderItems.push({
        id: nextItemId++,
        order_id: id,
        product_id: it.product_id ? Number(it.product_id) : null,
        nama_item: it.nama_item.trim(),
        qty: Number(it.qty) || 1,
        satuan: it.satuan || "pcs",
        harga_satuan: Number(it.harga_satuan) || 0,
        subtotal: (Number(it.qty) || 1) * (Number(it.harga_satuan) || 0),
        panjang: it.panjang !== undefined && it.panjang !== null ? Number(it.panjang) : null,
        lebar: it.lebar !== undefined && it.lebar !== null ? Number(it.lebar) : null,
        dimensi_unit: it.dimensi_unit || "m",
        jumlah_lembar: it.jumlah_lembar ? Number(it.jumlah_lembar) : 1,
        hitung_dimensi: Boolean(it.hitung_dimensi),
        catatan_item: it.catatan_item || "",
      });
    });
  }

  const calculatedTotal = Math.max(0, calculatedSubtotal - discountAmount);
  const targetStatusBayar = status_bayar || oldStatusBayar;
  const targetDp = jumlah_dp !== undefined ? Number(jumlah_dp) : oldDp;
  const targetPaymentMethod = metode_bayar || oldOrder.metode_bayar || "Cash";
  const customerName = nama_pelanggan ? nama_pelanggan.trim() : oldOrder.nama_pelanggan;

  // Check incremental payment received and record to Pemasukan Toko
  if (oldStatusBayar === "belum" && targetStatusBayar === "lunas" && calculatedTotal > 0) {
    recordOrderCashPayment({
      amount: calculatedTotal,
      invoiceNumber: oldOrder.nomor_nota,
      customerName,
      paymentMethod: targetPaymentMethod,
      cashierName: currentUser.nama || "Kasir",
      notes: `Pelunasan Order (${oldOrder.nomor_nota}) - ${customerName}`,
    });
  } else if (oldStatusBayar === "belum" && targetStatusBayar === "dp" && targetDp > 0) {
    recordOrderCashPayment({
      amount: targetDp,
      invoiceNumber: oldOrder.nomor_nota,
      customerName,
      paymentMethod: targetPaymentMethod,
      cashierName: currentUser.nama || "Kasir",
      notes: `DP Order (${oldOrder.nomor_nota}) - ${customerName}`,
    });
  } else if (oldStatusBayar === "dp" && targetStatusBayar === "lunas") {
    const remaining = Math.max(0, calculatedTotal - oldDp);
    if (remaining > 0) {
      recordOrderCashPayment({
        amount: remaining,
        invoiceNumber: oldOrder.nomor_nota,
        customerName,
        paymentMethod: targetPaymentMethod,
        cashierName: currentUser.nama || "Kasir",
        notes: `Pelunasan Sisa Order (${oldOrder.nomor_nota}) - ${customerName}`,
      });
    }
  } else if (oldStatusBayar === "dp" && targetStatusBayar === "dp" && targetDp > oldDp) {
    const additionalDp = targetDp - oldDp;
    recordOrderCashPayment({
      amount: additionalDp,
      invoiceNumber: oldOrder.nomor_nota,
      customerName,
      paymentMethod: targetPaymentMethod,
      cashierName: currentUser.nama || "Kasir",
      notes: `Tambahan DP Order (${oldOrder.nomor_nota}) - ${customerName}`,
    });
  }

  const updatedStatus = status || memoryDb.orders[orderIndex].status;
  const statusChanged = status && status !== oldOrder.status;
  let notes = normalizeProgressNotes(memoryDb.orders[orderIndex].progress_notes);

  if (statusChanged) {
    const detailMsg = req.body.progress_detail || (
      updatedStatus === "proses" ? "Sedang dalam proses cetak / produksi" :
      updatedStatus === "selesai" ? "Pesanan siap diambil / dikirim" :
      updatedStatus === "dibatalkan" ? "Pesanan dibatalkan" :
      "Status diperbarui menjadi Pending"
    );
    notes.push({
      status: getStatusLabel(updatedStatus),
      detail: detailMsg,
      timestamp: new Date().toISOString(),
    });
  } else if (req.body.progress_detail) {
    notes.push({
      status: getStatusLabel(updatedStatus),
      detail: req.body.progress_detail,
      timestamp: new Date().toISOString(),
    });
  }

  // Update expiry if status is selesai (30 days from completion)
  let shareExpiresAt = memoryDb.orders[orderIndex].share_expires_at;
  if (updatedStatus === "selesai") {
    if (!shareExpiresAt || statusChanged) {
      shareExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  } else {
    shareExpiresAt = null;
  }

  memoryDb.orders[orderIndex] = {
    ...memoryDb.orders[orderIndex],
    nama_pelanggan: customerName,
    no_wa: no_wa ? no_wa.trim() : memoryDb.orders[orderIndex].no_wa,
    tanggal_ambil: tanggal_ambil !== undefined ? (tanggal_ambil ? new Date(tanggal_ambil).toISOString() : null) : memoryDb.orders[orderIndex].tanggal_ambil,
    status: updatedStatus,
    metode_bayar: targetPaymentMethod,
    status_bayar: targetStatusBayar,
    jumlah_dp: targetDp,
    catatan: catatan !== undefined ? catatan : memoryDb.orders[orderIndex].catatan,
    subtotal: calculatedSubtotal,
    diskon: discountAmount,
    total: calculatedTotal,
    share_expires_at: shareExpiresAt,
    progress_notes: notes,
    updated_at: new Date().toISOString(),
  };

  logActivity(currentUser.nama, "Update Order", `Memperbarui nota ${memoryDb.orders[orderIndex].nomor_nota}`);

  const currentItems = memoryDb.orderItems.filter((i) => i.order_id === id);
  res.json({
    message: "Order berhasil diperbarui",
    order: {
      ...memoryDb.orders[orderIndex],
      items: currentItems,
    },
  });
});

// Update Order Status only (Quick Status change)
app.patch("/api/orders/:id/status", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const order = memoryDb.orders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: "Order tidak ditemukan." });
    return;
  }

  const oldStatus = order.status;
  const oldStatusBayar = order.status_bayar;
  const oldDp = Number(order.jumlah_dp) || 0;
  const orderTotal = Number(order.total) || 0;

  const { status, status_bayar, progress_detail } = req.body;
  if (status) order.status = status;
  if (status_bayar) order.status_bayar = status_bayar;

  // Manage Progress Notes
  let notes = normalizeProgressNotes(order.progress_notes);
  const statusChanged = status && status !== oldStatus;

  if (statusChanged) {
    const defaultDetail =
      order.status === "proses"
        ? "Sedang dalam proses cetak / produksi"
        : order.status === "selesai"
        ? "Pesanan siap diambil / dikirim"
        : order.status === "dibatalkan"
        ? "Pesanan dibatalkan"
        : "Status pesanan kembali ke antrean Pending";

    notes.push({
      status: getStatusLabel(order.status),
      detail: progress_detail || defaultDetail,
      timestamp: new Date().toISOString(),
    });
    order.progress_notes = notes;
  } else if (progress_detail) {
    notes.push({
      status: getStatusLabel(order.status),
      detail: progress_detail,
      timestamp: new Date().toISOString(),
    });
    order.progress_notes = notes;
  }

  // Manage Share Expiry: 30 days after Selesai, or null if not yet finished
  if (order.status === "selesai") {
    if (!order.share_expires_at || statusChanged) {
      order.share_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  } else {
    order.share_expires_at = null;
  }

  order.updated_at = new Date().toISOString();

  // Auto-record cash in to Pemasukan Toko if payment status updated
  if (status_bayar && status_bayar !== oldStatusBayar) {
    if (oldStatusBayar === "belum" && status_bayar === "lunas" && orderTotal > 0) {
      recordOrderCashPayment({
        amount: orderTotal,
        invoiceNumber: order.nomor_nota,
        customerName: order.nama_pelanggan,
        paymentMethod: order.metode_bayar || "Cash",
        cashierName: currentUser.nama || "Kasir",
        notes: `Pelunasan Order (${order.nomor_nota}) - ${order.nama_pelanggan}`,
      });
    } else if (oldStatusBayar === "dp" && status_bayar === "lunas") {
      const remaining = Math.max(0, orderTotal - oldDp);
      if (remaining > 0) {
        recordOrderCashPayment({
          amount: remaining,
          invoiceNumber: order.nomor_nota,
          customerName: order.nama_pelanggan,
          paymentMethod: order.metode_bayar || "Cash",
          cashierName: currentUser.nama || "Kasir",
          notes: `Pelunasan Sisa Order (${order.nomor_nota}) - ${order.nama_pelanggan}`,
        });
      }
    }
  }

  logActivity(currentUser.nama, "Ubah Status Order", `Nota ${order.nomor_nota} diubah status menjadi: ${order.status}, bayar: ${order.status_bayar}`);

  res.json({ message: "Status order berhasil diperbarui", order });
});

// Generate / Get Share Link Tracking for Order (Admin auth required)
app.post("/api/orders/:id/share", authenticateToken, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const order = memoryDb.orders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: "Order tidak ditemukan." });
    return;
  }

  // Generate share token if not yet created
  if (!order.share_token) {
    order.share_token = generateShareToken();
    order.updated_at = new Date().toISOString();
  }

  // Recalculate expiry rules:
  // If Selesai: expires 30 days after completion; if not completed yet: active without expiry
  if (order.status === "selesai") {
    if (!order.share_expires_at) {
      order.share_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  } else {
    order.share_expires_at = null;
  }

  // Determine origin URL
  const forwardedProto = (req.headers["x-forwarded-proto"] as string) || "https";
  const forwardedHost = (req.headers["x-forwarded-host"] as string) || req.get("host") || "localhost:3000";
  const isLocalhost = forwardedHost.includes("localhost") || forwardedHost.includes("127.0.0.1");
  const protocol = isLocalhost ? (req.protocol || "http") : forwardedProto;
  const share_url = `${protocol}://${forwardedHost}/track/${order.share_token}`;

  res.json({
    message: "Link tracking siap dibagikan",
    share_token: order.share_token,
    share_url,
    expires_at: order.share_expires_at,
    order: {
      id: order.id,
      nomor_nota: order.nomor_nota,
      nama_pelanggan: order.nama_pelanggan,
      no_wa: order.no_wa,
      status: order.status,
      total: order.total,
    },
  });
});

// Add Progress Note Milestone (Admin auth required)
app.post("/api/orders/:id/progress-notes", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const order = memoryDb.orders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: "Order tidak ditemukan." });
    return;
  }

  const { detail, status } = req.body;
  if (!detail || typeof detail !== "string" || !detail.trim()) {
    res.status(400).json({ error: "Detail progres wajib diisi." });
    return;
  }

  let notes = normalizeProgressNotes(order.progress_notes);
  const noteStatus = status ? getStatusLabel(status) : getStatusLabel(order.status);

  const newNote = {
    status: noteStatus,
    detail: detail.trim(),
    timestamp: new Date().toISOString(),
  };

  notes.push(newNote);
  order.progress_notes = notes;
  order.updated_at = new Date().toISOString();

  logActivity(currentUser.nama, "Tambah Progres Order", `Menambahkan catatan progres pada nota ${order.nomor_nota}: ${detail.trim()}`);

  res.status(201).json({
    message: "Catatan progres berhasil ditambahkan",
    progress_notes: notes,
    order,
  });
});

/* ========================================================
   PUBLIC ORDER TRACKING ROUTE (NO AUTH REQUIRED)
======================================================== */
app.get("/api/public/track/:token", (req: Request, res: Response) => {
  const token = req.params.token?.trim();
  if (!token) {
    res.status(400).json({ error: "Token tracking tidak valid." });
    return;
  }

  const order = memoryDb.orders.find((o) => o.share_token === token);
  if (!order) {
    res.status(404).json({
      error: "Link tracking tidak ditemukan atau nomor pesanan salah.",
      expired: false,
    });
    return;
  }

  // Check if link expired (after 30 days of completion)
  if (order.share_expires_at && new Date() > new Date(order.share_expires_at)) {
    res.status(410).json({
      error: "Link tracking ini sudah tidak berlaku lagi (kadaluarsa 30 hari setelah pesanan selesai).",
      expired: true,
      nomor_nota: order.nomor_nota,
      nama_pelanggan: order.nama_pelanggan,
      tanggal_order: order.tanggal_order,
    });
    return;
  }

  // Fetch items and strictly omit vendor / internal cost / margin fields
  const items = memoryDb.orderItems
    .filter((i) => i.order_id === order.id)
    .map((i) => ({
      nama_item: i.nama_item,
      qty: i.qty,
      satuan: i.satuan,
      harga_satuan: i.harga_satuan,
      subtotal: i.subtotal,
      catatan_item: i.catatan_item || "",
    }));

  // Normalize progress notes (sorted latest first for UI convenience)
  const rawNotes = normalizeProgressNotes(order.progress_notes);
  const sortedNotes = [...rawNotes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Store brand info from settings
  const storeInfo = {
    nama_toko: memoryDb.storeSettings?.nama_toko || "Jeres Studio",
    alamat: memoryDb.storeSettings?.alamat || "Jl. Percetakan Grafika No. 12, Malang",
    no_telepon_wa: memoryDb.storeSettings?.no_telepon_wa || "081234567890",
    email: memoryDb.storeSettings?.email || "kontak@jeresstudio.com",
    logo_url: memoryDb.storeSettings?.logo_url || "",
    catatan_footer: memoryDb.storeSettings?.catatan_footer || "Terima kasih telah mempercayakan cetakan Anda kepada kami!",
  };

  res.json({
    nomor_nota: order.nomor_nota,
    tanggal_order: order.tanggal_order,
    tanggal_ambil: order.tanggal_ambil,
    nama_pelanggan: order.nama_pelanggan,
    status: order.status,
    status_bayar: order.status_bayar,
    metode_bayar: order.metode_bayar,
    subtotal: order.subtotal,
    diskon: order.diskon,
    total: order.total,
    jumlah_dp: order.jumlah_dp,
    catatan: order.catatan || "",
    items,
    progress_notes: sortedNotes,
    share_expires_at: order.share_expires_at,
    store_info: storeInfo,
  });
});

// Delete Order
app.delete("/api/orders/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = memoryDb.orders.findIndex((o) => o.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Order tidak ditemukan." });
    return;
  }

  const deleted = memoryDb.orders.splice(index, 1)[0];
  memoryDb.orderItems = memoryDb.orderItems.filter((i) => i.order_id !== id);

  logActivity(currentUser.nama, "Hapus Order", `Menghapus nota ${deleted.nomor_nota}`);

  res.json({ message: "Order berhasil dihapus" });
});

/* ========================================================
   VENDORS & PURCHASES (KULAKAN) ROUTES
======================================================== */

// Get Vendors
app.get("/api/vendors", authenticateToken, (req: Request, res: Response) => {
  const { search, kategori } = req.query;
  let list = [...memoryDb.vendors];

  if (kategori && kategori !== "all") {
    list = list.filter((v) => v.kategori_supply.toLowerCase().includes((kategori as string).toLowerCase()));
  }

  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(
      (v) =>
        v.nama_vendor.toLowerCase().includes(q) ||
        (v.kontak_nama && v.kontak_nama.toLowerCase().includes(q)) ||
        v.no_wa.includes(q)
    );
  }

  // Calculate total spent per vendor
  const vendorsWithStats = list.map((vendor) => {
    const purchases = memoryDb.purchaseHistory.filter((p) => p.vendor_id === vendor.id);
    const totalSpent = purchases.reduce((sum, p) => sum + Number(p.total), 0);
    return {
      ...vendor,
      totalPurchases: purchases.length,
      totalSpent,
      purchases,
    };
  });

  res.json({ vendors: vendorsWithStats });
});

// Add Vendor
app.post("/api/vendors", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { nama_vendor, kategori_supply, kontak_nama, kontak, no_wa, link, alamat, catatan } = req.body;

  if (!nama_vendor || !nama_vendor.trim()) {
    res.status(400).json({ error: "Nama vendor wajib diisi." });
    return;
  }

  const effectivePhone = (kontak || no_wa || "").trim();

  const newId = memoryDb.vendors.length ? Math.max(...memoryDb.vendors.map((v) => v.id)) + 1 : 1;
  const newVendor = {
    id: newId,
    nama_vendor: nama_vendor.trim(),
    kategori_supply: (kategori_supply || "Lainnya").trim(),
    kontak: effectivePhone,
    kontak_nama: kontak_nama ? kontak_nama.trim() : "",
    no_wa: effectivePhone,
    link: link ? link.trim() : "",
    alamat: alamat || "",
    catatan: catatan || "",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryDb.vendors.push(newVendor);
  logActivity(currentUser.nama, "Tambah Vendor", `Menambahkan supplier ${newVendor.nama_vendor}`);

  res.status(201).json({ message: "Vendor berhasil ditambahkan", vendor: newVendor });
});

// Update Vendor
app.put("/api/vendors/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = memoryDb.vendors.findIndex((v) => v.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Vendor tidak ditemukan." });
    return;
  }

  const { nama_vendor, kategori_supply, kontak_nama, kontak, no_wa, link, alamat, catatan, is_active } = req.body;
  const effectivePhone = kontak !== undefined ? kontak : (no_wa !== undefined ? no_wa : memoryDb.vendors[index].kontak || memoryDb.vendors[index].no_wa);

  memoryDb.vendors[index] = {
    ...memoryDb.vendors[index],
    nama_vendor: nama_vendor ? nama_vendor.trim() : memoryDb.vendors[index].nama_vendor,
    kategori_supply: kategori_supply ? kategori_supply.trim() : memoryDb.vendors[index].kategori_supply,
    kontak: effectivePhone,
    kontak_nama: kontak_nama !== undefined ? kontak_nama.trim() : memoryDb.vendors[index].kontak_nama,
    no_wa: effectivePhone,
    link: link !== undefined ? (link ? link.trim() : "") : (memoryDb.vendors[index].link || ""),
    alamat: alamat !== undefined ? alamat : memoryDb.vendors[index].alamat,
    catatan: catatan !== undefined ? catatan : memoryDb.vendors[index].catatan,
    is_active: is_active !== undefined ? Boolean(is_active) : memoryDb.vendors[index].is_active,
    updated_at: new Date().toISOString(),
  };

  logActivity(currentUser.nama, "Update Vendor", `Memperbarui vendor ${memoryDb.vendors[index].nama_vendor}`);
  res.json({ message: "Vendor berhasil diperbarui", vendor: memoryDb.vendors[index] });
});

// Delete Vendor
app.delete("/api/vendors/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = memoryDb.vendors.findIndex((v) => v.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Vendor tidak ditemukan." });
    return;
  }

  const deleted = memoryDb.vendors.splice(index, 1)[0];
  // Also clean up any product_vendors relations for this vendor
  if (memoryDb.product_vendors) {
    memoryDb.product_vendors = memoryDb.product_vendors.filter((pv) => pv.vendor_id !== id);
  }

  logActivity(currentUser.nama, "Hapus Vendor", `Menghapus supplier ${deleted.nama_vendor}`);
  res.json({ message: "Vendor berhasil dihapus" });
});

/* ========================================================
   PRODUCT VENDORS (RELASI PRODUK & VENDOR / HARGA MODAL)
======================================================== */

// Get all vendors for a specific product
app.get("/api/products/:id/vendors", authenticateToken, (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  const product = memoryDb.products.find((p) => p.id === productId);

  if (!product) {
    res.status(404).json({ error: "Produk tidak ditemukan." });
    return;
  }

  const pvList = (memoryDb.product_vendors || []).filter((pv) => pv.product_id === productId);
  const joined = pvList.map((pv) => {
    const v = (memoryDb.vendors || []).find((ven) => ven.id === pv.vendor_id);
    return {
      ...pv,
      nama_vendor: v ? v.nama_vendor : "Vendor Tidak Dikenal",
      kontak: v ? (v.kontak || v.no_wa || "") : "",
      kontak_nama: v ? (v.kontak_nama || "") : "",
      no_wa: v ? (v.no_wa || "") : "",
      link: v ? (v.link || "") : "",
      kategori_supply: v ? (v.kategori_supply || "") : "",
      vendor_catatan: v ? (v.catatan || "") : "",
    };
  });

  // Sort: is_default first, then by id
  joined.sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return a.id - b.id;
  });

  res.json({ product_vendors: joined, product });
});

// Add vendor relation to product
app.post("/api/products/:id/vendors", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const productId = Number(req.params.id);
  const product = memoryDb.products.find((p) => p.id === productId);

  if (!product) {
    res.status(404).json({ error: "Produk tidak ditemukan." });
    return;
  }

  const { vendor_id, harga_modal, catatan, is_default } = req.body;

  if (!vendor_id || harga_modal === undefined || Number(harga_modal) < 0) {
    res.status(400).json({ error: "Vendor dan Harga Modal valid wajib diisi." });
    return;
  }

  const vendorIdNum = Number(vendor_id);
  const vendor = (memoryDb.vendors || []).find((v) => v.id === vendorIdNum);
  if (!vendor) {
    res.status(404).json({ error: "Vendor tidak ditemukan di sistem." });
    return;
  }

  if (!memoryDb.product_vendors) {
    memoryDb.product_vendors = [];
  }

  const currentVendorsForProduct = memoryDb.product_vendors.filter((pv) => pv.product_id === productId);
  const makeDefault = Boolean(is_default) || currentVendorsForProduct.length === 0;

  if (makeDefault) {
    // Unset default on other relations for this product
    memoryDb.product_vendors.forEach((pv) => {
      if (pv.product_id === productId) {
        pv.is_default = false;
      }
    });
  }

  // Check if relation already exists for this vendor
  const existingIndex = memoryDb.product_vendors.findIndex(
    (pv) => pv.product_id === productId && pv.vendor_id === vendorIdNum
  );

  if (existingIndex !== -1) {
    memoryDb.product_vendors[existingIndex] = {
      ...memoryDb.product_vendors[existingIndex],
      harga_modal: Number(harga_modal),
      catatan: catatan !== undefined ? (catatan || "") : memoryDb.product_vendors[existingIndex].catatan,
      is_default: makeDefault,
      updated_at: new Date().toISOString(),
    };

    const updated = {
      ...memoryDb.product_vendors[existingIndex],
      nama_vendor: vendor.nama_vendor,
      kontak: vendor.kontak || vendor.no_wa || "",
      no_wa: vendor.no_wa || "",
      link: vendor.link || "",
      vendor_catatan: vendor.catatan || "",
    };

    logActivity(
      currentUser.nama,
      "Update Vendor Produk",
      `Memperbarui data vendor ${vendor.nama_vendor} pada produk ${product.nama_item}`
    );

    res.json({ message: "Vendor produk berhasil diperbarui", product_vendor: updated });
    return;
  }

  const newId = memoryDb.product_vendors.length
    ? Math.max(...memoryDb.product_vendors.map((pv) => pv.id)) + 1
    : 1;

  const newPV = {
    id: newId,
    product_id: productId,
    vendor_id: vendorIdNum,
    harga_modal: Number(harga_modal),
    is_default: makeDefault,
    catatan: catatan ? String(catatan).trim() : "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryDb.product_vendors.push(newPV);

  const resultWithVendor = {
    ...newPV,
    nama_vendor: vendor.nama_vendor,
    kontak: vendor.kontak || vendor.no_wa || "",
    no_wa: vendor.no_wa || "",
    link: vendor.link || "",
    vendor_catatan: vendor.catatan || "",
  };

  logActivity(
    currentUser.nama,
    "Tambah Vendor Produk",
    `Menghubungkan vendor ${vendor.nama_vendor} ke produk ${product.nama_item} (Modal: Rp ${Number(harga_modal).toLocaleString()})`
  );

  res.status(201).json({ message: "Vendor berhasil ditambahkan ke produk", product_vendor: resultWithVendor });
});

// Update product-vendor relation
app.put("/api/product-vendors/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = (memoryDb.product_vendors || []).findIndex((pv) => pv.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Relasi vendor produk tidak ditemukan." });
    return;
  }

  const targetPV = memoryDb.product_vendors[index];
  const { harga_modal, catatan, is_default } = req.body;

  if (is_default === true) {
    // Unset default on all other relations for this product
    memoryDb.product_vendors.forEach((pv) => {
      if (pv.product_id === targetPV.product_id) {
        pv.is_default = false;
      }
    });
  }

  memoryDb.product_vendors[index] = {
    ...targetPV,
    harga_modal: harga_modal !== undefined ? Number(harga_modal) : targetPV.harga_modal,
    catatan: catatan !== undefined ? (catatan ? String(catatan).trim() : "") : targetPV.catatan,
    is_default: is_default !== undefined ? Boolean(is_default) : targetPV.is_default,
    updated_at: new Date().toISOString(),
  };

  const vendor = (memoryDb.vendors || []).find((v) => v.id === targetPV.vendor_id);
  const product = memoryDb.products.find((p) => p.id === targetPV.product_id);

  logActivity(
    currentUser.nama,
    "Update Vendor Produk",
    `Mengubah harga modal/catatan vendor ${vendor?.nama_vendor || ""} pada produk ${product?.nama_item || ""}`
  );

  res.json({
    message: "Data vendor produk berhasil disimpan",
    product_vendor: {
      ...memoryDb.product_vendors[index],
      nama_vendor: vendor?.nama_vendor || "",
      kontak: vendor?.kontak || vendor?.no_wa || "",
      no_wa: vendor?.no_wa || "",
      link: vendor?.link || "",
      vendor_catatan: vendor?.catatan || "",
    },
  });
});

// Delete product-vendor relation
app.delete("/api/product-vendors/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = (memoryDb.product_vendors || []).findIndex((pv) => pv.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Relasi vendor produk tidak ditemukan." });
    return;
  }

  const deleted = memoryDb.product_vendors.splice(index, 1)[0];
  const remainingForProduct = memoryDb.product_vendors.filter((pv) => pv.product_id === deleted.product_id);

  // If deleted was default and others remain, set first remaining as default
  if (deleted.is_default && remainingForProduct.length > 0) {
    remainingForProduct[0].is_default = true;
  }

  const vendor = (memoryDb.vendors || []).find((v) => v.id === deleted.vendor_id);
  const product = memoryDb.products.find((p) => p.id === deleted.product_id);

  logActivity(
    currentUser.nama,
    "Hapus Vendor Produk",
    `Menghapus relasi vendor ${vendor?.nama_vendor || ""} dari produk ${product?.nama_item || ""}`
  );

  res.json({ message: "Relasi vendor berhasil dihapus dari produk" });
});

// Batch update products and product vendors from simulation
app.post("/api/products/batch-apply-simulations", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { items } = req.body; // Array of { productId, newPrice, newVendorCost, vendorId, updatePrice, updateVendorCost }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Daftar item untuk update tidak boleh kosong." });
    return;
  }

  let updatedProductCount = 0;
  let updatedVendorCostCount = 0;

  items.forEach((item) => {
    const prodId = Number(item.productId);
    const prod = memoryDb.products.find((p) => p.id === prodId);

    // Update Product Selling Price if specified
    if (prod && item.updatePrice && item.newPrice !== undefined && Number(item.newPrice) > 0) {
      prod.harga = Math.round(Number(item.newPrice));
      prod.updated_at = new Date().toISOString();
      updatedProductCount++;
    }

    // Update Product Vendor Modal if specified
    if (item.updateVendorCost && item.vendorId && item.newVendorCost !== undefined) {
      const vId = Number(item.vendorId);
      const newCost = Math.round(Number(item.newVendorCost));

      if (!memoryDb.product_vendors) memoryDb.product_vendors = [];
      const pvIndex = memoryDb.product_vendors.findIndex((pv) => pv.product_id === prodId && pv.vendor_id === vId);

      if (pvIndex !== -1) {
        memoryDb.product_vendors[pvIndex].harga_modal = newCost;
        memoryDb.product_vendors[pvIndex].updated_at = new Date().toISOString();
        updatedVendorCostCount++;
      } else {
        // Create new relation if not yet linked
        const newId = memoryDb.product_vendors.length ? Math.max(...memoryDb.product_vendors.map((pv) => pv.id)) + 1 : 1;
        memoryDb.product_vendors.push({
          id: newId,
          product_id: prodId,
          vendor_id: vId,
          harga_modal: newCost,
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        updatedVendorCostCount++;
      }
    }
  });

  logActivity(
    currentUser.nama,
    "Simulasi Massal Diterapkan",
    `Menerapkan update simulasi ke ${updatedProductCount} harga jual produk dan ${updatedVendorCostCount} harga modal vendor.`
  );

  res.json({
    message: `Berhasil memperbarui ${updatedProductCount} harga jual dan ${updatedVendorCostCount} modal vendor.`,
    updatedProductCount,
    updatedVendorCostCount,
  });
});

/* ========================================================
   MARGIN THRESHOLD SETTINGS
======================================================== */

// Get Margin Threshold Settings
app.get("/api/settings/margin-threshold", authenticateToken, (req: Request, res: Response) => {
  const settings = memoryDb.storeSettings || {};
  const good = Number(settings.margin_threshold_good ?? 20);
  const warning = Number(settings.margin_threshold_warning ?? 10);
  res.json({
    margin_threshold_good: good,
    margin_threshold_warning: warning,
  });
});

// Update Margin Threshold Settings
app.put("/api/settings/margin-threshold", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { margin_threshold_good, margin_threshold_warning } = req.body;

  if (margin_threshold_good === undefined || margin_threshold_warning === undefined) {
    res.status(400).json({ error: "Batas margin sehat dan margin tipis wajib diisi." });
    return;
  }

  const good = Math.max(0, Number(margin_threshold_good));
  const warning = Math.max(0, Number(margin_threshold_warning));

  memoryDb.storeSettings = {
    ...memoryDb.storeSettings,
    margin_threshold_good: String(good),
    margin_threshold_warning: String(warning),
    updated_at: new Date().toISOString(),
  };

  logActivity(
    currentUser.nama,
    "Update Batas Margin",
    `Mengubah ambang margin: Sehat (Hijau) >= ${good}%, Tipis (Kuning) >= ${warning}%`
  );

  res.json({
    message: "Pengaturan batas margin berhasil disimpan",
    margin_threshold_good: good,
    margin_threshold_warning: warning,
  });
});

// Get Purchase History
app.get("/api/purchases", authenticateToken, (req: Request, res: Response) => {
  const { vendorId } = req.query;
  let list = [...memoryDb.purchaseHistory];

  if (vendorId) {
    list = list.filter((p) => p.vendor_id === Number(vendorId));
  }

  const listWithVendor = list.map((item) => {
    const vendor = memoryDb.vendors.find((v) => v.id === item.vendor_id);
    return {
      ...item,
      vendor_nama: vendor ? vendor.nama_vendor : "Vendor Tidak Dikenal",
    };
  });

  listWithVendor.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  res.json({ purchases: listWithVendor });
});

// Add Purchase History
app.post("/api/purchases", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { vendor_id, tanggal, nama_barang, qty, satuan, harga_satuan, catatan } = req.body;

  if (!vendor_id || !nama_barang || harga_satuan === undefined) {
    res.status(400).json({ error: "Vendor, Nama barang, dan Harga satuan wajib diisi." });
    return;
  }

  const q = Number(qty) || 1;
  const price = Number(harga_satuan) || 0;
  const total = q * price;

  const newId = memoryDb.purchaseHistory.length ? Math.max(...memoryDb.purchaseHistory.map((p) => p.id)) + 1 : 1;
  const newPurchase = {
    id: newId,
    vendor_id: Number(vendor_id),
    tanggal: tanggal ? new Date(tanggal).toISOString() : new Date().toISOString(),
    nama_barang: nama_barang.trim(),
    qty: q,
    satuan: satuan || "pcs",
    harga_satuan: price,
    total,
    catatan: catatan || "",
    created_at: new Date().toISOString(),
  };

  memoryDb.purchaseHistory.push(newPurchase);

  const vendor = memoryDb.vendors.find((v) => v.id === Number(vendor_id));

  // Auto-record to Kas Keluar (Kulakan Bahan Baku)
  if (total > 0) {
    if (!memoryDb.transactions) memoryDb.transactions = [];
    const newTxId = memoryDb.transactions.length
      ? Math.max(...memoryDb.transactions.map((t) => t.id)) + 1
      : 1;

    memoryDb.transactions.push({
      id: newTxId,
      tipe: "keluar",
      kategori: "Kulakan Bahan Baku",
      nominal: total,
      tanggal: newPurchase.tanggal,
      metode_pembayaran: "Transfer BCA",
      keterangan: `Kulakan ${newPurchase.nama_barang} (${vendor?.nama_vendor || "Vendor"}) - ${newPurchase.qty} ${newPurchase.satuan}`,
      referensi: `KULAK-${newPurchase.id}`,
      created_by: currentUser.nama || "Admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  logActivity(currentUser.nama, "Catat Kulakan", `Beli ${newPurchase.nama_barang} ke ${vendor?.nama_vendor || "Vendor"} (Rp ${total.toLocaleString()})`);

  res.status(201).json({ message: "Catatan kulakan berhasil disimpan", purchase: newPurchase });
});

// Delete Purchase
app.delete("/api/purchases/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = memoryDb.purchaseHistory.findIndex((p) => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Catatan kulakan tidak ditemukan." });
    return;
  }

  const deleted = memoryDb.purchaseHistory.splice(index, 1)[0];
  logActivity(currentUser.nama, "Hapus Kulakan", `Menghapus catatan kulakan: ${deleted.nama_barang}`);
  res.json({ message: "Catatan kulakan berhasil dihapus" });
});

/* ========================================================
   FINANCIAL TRANSACTIONS (KEUANGAN KELUAR MASUK) ROUTES
======================================================== */

// Default categories presets
// Helper to normalize category types
function normalizeCategoryType(type: string): "masuk" | "keluar" {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "income" || lower === "masuk" || lower === "pemasukan") return "masuk";
  return "keluar";
}

// Get Categories combining registered categories and transaction history
app.get("/api/categories", authenticateToken, (req: Request, res: Response) => {
  const txs = memoryDb.transactions || [];
  if (!memoryDb.categories) {
    memoryDb.categories = [
      { id: 1, name: "Pemasukan Toko", type: "masuk", created_at: new Date().toISOString() },
      { id: 2, name: "Pemasukan Pribadi", type: "masuk", created_at: new Date().toISOString() },
      { id: 3, name: "Kulakan Bahan Baku", type: "keluar", created_at: new Date().toISOString() },
      { id: 4, name: "Beli Mesin & Alat", type: "keluar", created_at: new Date().toISOString() },
      { id: 5, name: "Operasional Toko", type: "keluar", created_at: new Date().toISOString() },
      { id: 6, name: "Pengeluaran Pribadi / Prive", type: "keluar", created_at: new Date().toISOString() },
    ];
  }

  const registeredIncome = memoryDb.categories
    .filter((c) => normalizeCategoryType(c.type) === "masuk")
    .map((c) => c.name.trim());
  const historyIncome = txs
    .filter((t) => normalizeCategoryType(t.tipe) === "masuk" && t.kategori && t.kategori.trim())
    .map((t) => t.kategori.trim());
  const uniqueIncome = Array.from(new Set([...registeredIncome, ...historyIncome]));

  const registeredExpense = memoryDb.categories
    .filter((c) => normalizeCategoryType(c.type) === "keluar")
    .map((c) => c.name.trim());
  const historyExpense = txs
    .filter((t) => normalizeCategoryType(t.tipe) === "keluar" && t.kategori && t.kategori.trim())
    .map((t) => t.kategori.trim());
  const uniqueExpense = Array.from(new Set([...registeredExpense, ...historyExpense]));

  let idCounter = 1;
  const allCategories = [
    ...uniqueIncome.map((name) => ({ id: idCounter++, name, type: "masuk" as const })),
    ...uniqueExpense.map((name) => ({ id: idCounter++, name, type: "keluar" as const })),
  ];

  res.json({
    categories: allCategories,
    incomeCategories: uniqueIncome,
    expenseCategories: uniqueExpense,
  });
});

// Legacy / Compatibility Endpoint for Categories
app.get("/api/transactions/categories", authenticateToken, (req: Request, res: Response) => {
  const txs = memoryDb.transactions || [];
  if (!memoryDb.categories) {
    memoryDb.categories = [
      { id: 1, name: "Pemasukan Toko", type: "masuk", created_at: new Date().toISOString() },
      { id: 2, name: "Pemasukan Pribadi", type: "masuk", created_at: new Date().toISOString() },
      { id: 3, name: "Kulakan Bahan Baku", type: "keluar", created_at: new Date().toISOString() },
      { id: 4, name: "Beli Mesin & Alat", type: "keluar", created_at: new Date().toISOString() },
      { id: 5, name: "Operasional Toko", type: "keluar", created_at: new Date().toISOString() },
      { id: 6, name: "Pengeluaran Pribadi / Prive", type: "keluar", created_at: new Date().toISOString() },
    ];
  }

  const registeredIncome = memoryDb.categories
    .filter((c) => normalizeCategoryType(c.type) === "masuk")
    .map((c) => c.name.trim());
  const historyIncome = txs
    .filter((t) => normalizeCategoryType(t.tipe) === "masuk" && t.kategori && t.kategori.trim())
    .map((t) => t.kategori.trim());
  const uniqueIncome = Array.from(new Set([...registeredIncome, ...historyIncome]));

  const registeredExpense = memoryDb.categories
    .filter((c) => normalizeCategoryType(c.type) === "keluar")
    .map((c) => c.name.trim());
  const historyExpense = txs
    .filter((t) => normalizeCategoryType(t.tipe) === "keluar" && t.kategori && t.kategori.trim())
    .map((t) => t.kategori.trim());
  const uniqueExpense = Array.from(new Set([...registeredExpense, ...historyExpense]));

  let idCounter = 1;
  const allCategories = [
    ...uniqueIncome.map((name) => ({ id: idCounter++, name, type: "masuk" as const })),
    ...uniqueExpense.map((name) => ({ id: idCounter++, name, type: "keluar" as const })),
  ];

  res.json({
    categories: allCategories,
    incomeCategories: uniqueIncome,
    expenseCategories: uniqueExpense,
  });
});

// Create Category (Optional: Adds a category or validates)
app.post("/api/categories", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { name, type } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: "Nama kategori tidak boleh kosong." });
    return;
  }

  const normType = normalizeCategoryType(type || "masuk");
  const trimmedName = name.trim();

  // Create a placeholder record in transactions or categories if needed
  if (!memoryDb.categories) memoryDb.categories = [];
  const exists = memoryDb.categories.find(
    (c) => normalizeCategoryType(c.type) === normType && c.name.toLowerCase() === trimmedName.toLowerCase()
  );

  const newCat = {
    id: Date.now(),
    name: trimmedName,
    type: normType,
    created_at: new Date().toISOString(),
  };

  if (!exists) {
    memoryDb.categories.push(newCat);
  }

  logActivity(
    currentUser.nama,
    "Tambah Kategori Kas",
    `Menambahkan kategori [${normType.toUpperCase()}]: ${trimmedName}`
  );

  res.status(201).json({
    message: "Kategori berhasil ditambahkan",
    category: newCat,
  });
});

// Update Category (Renames this category across transactions in history)
app.put("/api/categories/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const { name, oldName, type } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: "Nama kategori baru tidak boleh kosong." });
    return;
  }

  const trimmedNewName = name.trim();
  const txs = memoryDb.transactions || [];

  // If oldName is supplied, rename all matching transactions
  let affectedCount = 0;
  if (oldName) {
    txs.forEach((t) => {
      if (t.kategori && t.kategori.toLowerCase() === oldName.toLowerCase()) {
        t.kategori = trimmedNewName;
        if (type) t.tipe = normalizeCategoryType(type);
        t.updated_at = new Date().toISOString();
        affectedCount++;
      }
    });
  }

  logActivity(
    currentUser.nama,
    "Edit Kategori Kas",
    `Mengubah nama kategori "${oldName || id}" menjadi "${trimmedNewName}" (${affectedCount} transaksi diperbarui)`
  );

  res.json({
    message: "Kategori berhasil diperbarui pada riwayat transaksi",
    category: { id, name: trimmedNewName, type: type || "masuk" },
  });
});

// Delete Category
app.delete("/api/categories/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { categoryName } = req.query;

  logActivity(
    currentUser.nama,
    "Hapus Kategori Kas",
    `Menghapus kategori: ${categoryName || req.params.id}`
  );

  res.json({
    message: "Kategori berhasil dihapus",
  });
});

// Helper to infer Kantong Kas based on category and transaction type
function inferKantongKas(kategori: string, tipe: "masuk" | "keluar"): "modal" | "overhead" | "gaji_saya" | "gaji_karyawan" | "margin" {
  const cat = (kategori || "").toLowerCase().trim();
  if (
    cat.includes("kulakan") ||
    cat.includes("bahan") ||
    cat.includes("mesin") ||
    cat.includes("tinta") ||
    cat.includes("film") ||
    cat.includes("vendor") ||
    cat.includes("alat")
  ) {
    return "modal";
  }
  if (
    cat.includes("listrik") ||
    cat.includes("air") ||
    cat.includes("internet") ||
    cat.includes("operasional") ||
    cat.includes("sewa") ||
    cat.includes("transportasi") ||
    cat.includes("konsumsi") ||
    cat.includes("sparepart") ||
    cat.includes("perawatan") ||
    cat.includes("pln") ||
    cat.includes("wifi")
  ) {
    return "overhead";
  }
  if (
    cat.includes("pribadi") ||
    cat.includes("prive") ||
    cat.includes("owner") ||
    cat.includes("gaji saya") ||
    cat.includes("desain owner")
  ) {
    return "gaji_saya";
  }
  if (
    cat.includes("karyawan") ||
    cat.includes("staff") ||
    cat.includes("operator") ||
    cat.includes("upah") ||
    cat.includes("bonus")
  ) {
    return "gaji_karyawan";
  }
  if (tipe === "masuk") {
    return "margin";
  }
  return "overhead";
}

// Logic pemotongan diskon & alokasi HPP ke 5 kantong
function alokasikanOrder(
  breakdownHPP: {
    modal: number;
    margin: number;
    gajiSaya: number;
    overhead: number;
    gajiKaryawan: number;
  },
  diskon: number = 0
) {
  let sisaDiskon = Math.max(0, diskon || 0);
  const alokasi = {
    modal: Math.round(Number(breakdownHPP.modal) || 0),
    margin: Math.round(Number(breakdownHPP.margin) || 0),
    gajiSaya: Math.round(Number(breakdownHPP.gajiSaya) || 0),
    overhead: Math.round(Number(breakdownHPP.overhead) || 0),
    gajiKaryawan: Math.round(Number(breakdownHPP.gajiKaryawan) || 0),
  };

  // Urutan pemotongan diskon: margin -> gajiSaya -> overhead -> gajiKaryawan
  const urutanPotong: Array<keyof Omit<typeof breakdownHPP, "modal">> = [
    "margin",
    "gajiSaya",
    "overhead",
    "gajiKaryawan",
  ];

  for (const kantong of urutanPotong) {
    if (sisaDiskon <= 0) break;
    const potongan = Math.min(alokasi[kantong], sisaDiskon);
    alokasi[kantong] -= potongan;
    sisaDiskon -= potongan;
  }

  // Jika diskon masih bersisa setelah 4 kantong non-modal habis terpotong
  let potonganModal = 0;
  if (sisaDiskon > 0) {
    potonganModal = Math.min(alokasi.modal, sisaDiskon);
    alokasi.modal -= potonganModal;
  }

  return {
    alokasi,
    sisaDiskonTidakTertutup: sisaDiskon,
    potonganModal,
  };
}

// Get Transactions List with Filters (including Kantong Kas)
app.get("/api/transactions", authenticateToken, (req: Request, res: Response) => {
  const { tipe, kategori, kantong, startDate, endDate, search, metode } = req.query;
  let list = [...(memoryDb.transactions || [])];

  if (tipe && tipe !== "all") {
    list = list.filter((t) => t.tipe === tipe);
  }

  if (kategori && kategori !== "all") {
    list = list.filter((t) => t.kategori.toLowerCase() === (kategori as string).toLowerCase());
  }

  if (kantong && kantong !== "all") {
    list = list.filter((t) => (t.kantong || inferKantongKas(t.kategori, t.tipe)) === kantong);
  }

  if (metode && metode !== "all") {
    list = list.filter((t) => t.metode_pembayaran.toLowerCase() === (metode as string).toLowerCase());
  }

  if (startDate) {
    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);
    list = list.filter((t) => new Date(t.tanggal) >= start);
  }

  if (endDate) {
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    list = list.filter((t) => new Date(t.tanggal) <= end);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(
      (t) =>
        t.keterangan.toLowerCase().includes(q) ||
        t.kategori.toLowerCase().includes(q) ||
        (t.referensi && t.referensi.toLowerCase().includes(q)) ||
        (t.created_by && t.created_by.toLowerCase().includes(q)) ||
        t.metode_pembayaran.toLowerCase().includes(q) ||
        (t.kantong && t.kantong.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  res.json({ transactions: list });
});

// Get Financial Summary (KPI, Category Breakdown & 5-Pocket Balances)
app.get("/api/transactions/summary", authenticateToken, (req: Request, res: Response) => {
  const { kantong } = req.query;
  const transactions = memoryDb.transactions || [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  let pemasukanBulanIni = 0;
  let pengeluaranBulanIni = 0;

  // 5 Kantong Balances Trackers
  const kantongBalances = {
    modal: { saldo: 0, masuk: 0, keluar: 0 },
    overhead: { saldo: 0, masuk: 0, keluar: 0 },
    gaji_saya: { saldo: 0, masuk: 0, keluar: 0 },
    gaji_karyawan: { saldo: 0, masuk: 0, keluar: 0 },
    margin: { saldo: 0, masuk: 0, keluar: 0 },
  };

  const incomeCatMap: Record<string, { total: number; count: number }> = {};
  const expenseCatMap: Record<string, { total: number; count: number }> = {};

  transactions.forEach((t) => {
    const nominal = Number(t.nominal) || 0;
    const tDate = new Date(t.tanggal);
    const isThisMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    const kType = (t.kantong as keyof typeof kantongBalances) || inferKantongKas(t.kategori, t.tipe);

    // Track overall pockets
    if (kantongBalances[kType]) {
      if (t.tipe === "masuk") {
        kantongBalances[kType].masuk += nominal;
        kantongBalances[kType].saldo += nominal;
      } else if (t.tipe === "keluar") {
        kantongBalances[kType].keluar += nominal;
        kantongBalances[kType].saldo -= nominal;
      }
    }

    // Category breakdown and general total (filtered by kantong if requested)
    const matchKantongFilter = !kantong || kantong === "all" || kType === kantong;

    if (matchKantongFilter) {
      if (t.tipe === "masuk") {
        totalPemasukan += nominal;
        if (isThisMonth) pemasukanBulanIni += nominal;

        if (!incomeCatMap[t.kategori]) {
          incomeCatMap[t.kategori] = { total: 0, count: 0 };
        }
        incomeCatMap[t.kategori].total += nominal;
        incomeCatMap[t.kategori].count += 1;
      } else if (t.tipe === "keluar") {
        totalPengeluaran += nominal;
        if (isThisMonth) pengeluaranBulanIni += nominal;

        if (!expenseCatMap[t.kategori]) {
          expenseCatMap[t.kategori] = { total: 0, count: 0 };
        }
        expenseCatMap[t.kategori].total += nominal;
        expenseCatMap[t.kategori].count += 1;
      }
    }
  });

  const breakdownPemasukan = Object.entries(incomeCatMap)
    .map(([kategori, val]) => ({
      kategori,
      total: val.total,
      count: val.count,
    }))
    .sort((a, b) => b.total - a.total);

  const breakdownPengeluaran = Object.entries(expenseCatMap)
    .map(([kategori, val]) => ({
      kategori,
      total: val.total,
      count: val.count,
    }))
    .sort((a, b) => b.total - a.total);

  res.json({
    summary: {
      totalPemasukan,
      totalPengeluaran,
      saldoBersih: totalPemasukan - totalPengeluaran,
      pemasukanBulanIni,
      pengeluaranBulanIni,
      saldoBulanIni: pemasukanBulanIni - pengeluaranBulanIni,
      breakdownPemasukan,
      breakdownPengeluaran,
      kantongBalances,
    },
  });
});

// AI Scan Receipt / Invoice / Nota with Gemini (with multi-model fallback and auto-retry for 503/429 spikes)
app.post("/api/transactions/scan-receipt", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      res.status(400).json({ error: "Gambar nota/bon belanja harus disertakan." });
      return;
    }

    let base64Data = image;
    let mimeType = "image/jpeg";

    if (image.startsWith("data:")) {
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const ai = getGeminiClient();

    const promptText = `Kamu adalah asisten AI akuntansi & kasir cerdas untuk Toko Percetakan & Digital 'Jeres Studio' (usaha percetakan: stiker, sablon DTF, spanduk/banner flexi, jersey printing, merchandise, ATK, dan operasional workshop).

Analisis foto atau gambar nota / struk belanja / faktur invoice / kwitansi / struk bensin-listrik / bukti transfer pembayaran yang diunggah.

Ekstrak dan kategorisasikan informasi berikut ke dalam format JSON:
1. tipe: 'keluar' (untuk nota belanja supplier, kulakan bahan baku, struk minimarket, token listrik PLN, servis mesin, kurir, bensin/transportasi, makan/konsumsi staff, nota belanja toko) ATAU 'masuk' (jika gambar adalah bukti transfer pembayaran pelanggan, kwitansi penerimaan kas/DP pelanggan, faktur penjualan order cetak). Defaultkan ke 'keluar' jika merupakan bon pembelian barang/jasa.
2. vendor_name: Nama toko/merchant/penjual/instansi yang menerbitkan nota/struk (misal: 'Indomaret', 'CV Sinar Sablon', 'SPBU Pertamina', 'PLN', 'BCA Mobile', 'Mitra 10', 'Toko Plastik Makmur', dll.).
3. nominal: Grand Total / Jumlah Total Akhir yang harus dibayar atau ditransfer (angka bulat integer murni dalam Rupiah, tanpa titik/koma/simbol).
4. tanggal: Tanggal transaksi yang tertera pada nota (format YYYY-MM-DD). Jika tahun tidak jelas, gunakan tahun ${new Date().getFullYear()} atau tanggal hari ini (${new Date().toISOString().slice(0, 10)}).
5. kategori: Kategori pembukuan kas Jeres Studio yang paling tepat:
   - 'Kulakan Bahan Baku' (stiker vinyl, flexi banner, kaos polos, kain jersey, akrilik, kertas art paper, dll.)
   - 'Tinta & Master Film DTF' (tinta sablon/sublim, lem bubuk DTF, pet film roll, cairan cleaner printhead, solvent)
   - 'Perawatan & Sparepart Mesin' (onderdil printer, damper, wiper, teknisi mesin, kabel head)
   - 'Listrik, Air & Internet' (token PLN, tagihan air PDAM, tagihan WiFi internet toko, pulsa)
   - 'Transportasi & Kurir' (ongkir J&T/JNE/Lalamove/Gojek/Grab, bensin motor/mobil toko, parkir)
   - 'Konsumsi & Kas Toko' (makan siang staff/lembur, air galon, kopi/teh, lakban, kardus/plastik packing, ATK kasir)
   - 'Gaji & Bonus Karyawan' (upah operator/desainer/kasir)
   - 'Sewa Tempat & Bangunan'
   - 'Penjualan Order Cetak' (jika bukti masuk)
   - 'DP Order Pelanggan' / 'Pelunasan Order'
6. kantong: Kantong Kas Jeres Studio yang paling cocok:
   - 'modal' (untuk belanja bahan baku, kulakan, tinta, mesin/alat cetak)
   - 'overhead' (untuk listrik, WiFi/internet, konsumsi, bensin/transportasi, sewa, ATK)
   - 'gaji_saya' (untuk jasa desain owner / prive)
   - 'gaji_karyawan' (untuk upah/gaji staf, operator cetak, lembur)
   - 'margin' (untuk profit/pemasukan bersih atau penjualan umum)
7. metode_pembayaran: Metode bayar terdeteksi ('Cash', 'QRIS', 'Transfer BCA', 'Transfer Mandiri', 'Transfer BNI', 'Transfer BRI', 'Debit', atau 'Lainnya').
8. referensi: Nomor struk, nomor nota/invoice, no resi, atau kode transaksi jika ada. Jika tidak ada, kosongkan string.
9. keterangan: Ringkasan narasi jelas mengenai pengeluaran/pemasukan tersebut (contoh: 'Belanja 2 roll Pet Film DTF 30cm & 1kg Hotmelt Powder di CV Sinar Sablon').
10. items: Array rincian barang/jasa jika terbaca dalam struk: [ { "nama_item": string, "qty": number, "harga_satuan": number, "subtotal": number } ]. Jika tidak ada rincian per item, buat 1 item dengan nama rincian nota dan totalnya.
11. confidence_notes: Keterangan singkat mengenai kejelasan pembacaan gambar oleh AI.`;

    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.7-flash",
      "gemini-2.5-pro",
    ];

    let lastError: any = null;
    let parsedJson: any = null;

    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  tipe: { type: Type.STRING, description: "'masuk' atau 'keluar'" },
                  vendor_name: { type: Type.STRING, description: "Nama toko / merchant / penerbit" },
                  nominal: { type: Type.NUMBER, description: "Total nominal akhir dalam Rupiah (integer)" },
                  tanggal: { type: Type.STRING, description: "Tanggal transaksi format YYYY-MM-DD" },
                  kategori: { type: Type.STRING, description: "Kategori pembukuan kas yang sesuai" },
                  kantong: { type: Type.STRING, description: "Kantong kas: modal, overhead, gaji_saya, gaji_karyawan, atau margin" },
                  metode_pembayaran: { type: Type.STRING, description: "Metode pembayaran" },
                  referensi: { type: Type.STRING, description: "Nomor nota atau referensi" },
                  keterangan: { type: Type.STRING, description: "Ringkasan transaksi" },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        nama_item: { type: Type.STRING },
                        qty: { type: Type.NUMBER },
                        harga_satuan: { type: Type.NUMBER },
                        subtotal: { type: Type.NUMBER },
                      },
                      required: ["nama_item", "qty", "harga_satuan", "subtotal"],
                    },
                  },
                  confidence_notes: { type: Type.STRING, description: "Catatan kejelasan pembacaan AI" },
                },
                required: ["tipe", "vendor_name", "nominal", "tanggal", "kategori", "keterangan"],
              },
            },
          });

          let rawText = (response.text || "").trim();
          if (rawText.startsWith("```")) {
            rawText = rawText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
          }

          parsedJson = JSON.parse(rawText || "{}");
          break; // success
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err);
          const isDemandError =
            errMsg.includes("503") ||
            errMsg.includes("429") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("high demand") ||
            errMsg.includes("RESOURCE_EXHAUSTED");

          if (isDemandError && attempt < 2) {
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }
          break;
        }
      }

      if (parsedJson && Object.keys(parsedJson).length > 0) {
        break;
      }
    }

    if (!parsedJson || Object.keys(parsedJson).length === 0) {
      throw lastError || new Error("Gagal mengekstrak data nota.");
    }

    res.json({
      success: true,
      result: parsedJson,
    });
  } catch (error: any) {
    console.error("AI Scan Receipt error:", error);
    const rawMsg = error.message || String(error);
    let userMsg = rawMsg;

    if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("high demand")) {
      userMsg = "Layanan AI sedang mengalami antrean trafik tinggi sesaat. Silakan klik 'Coba Scan Lagi' dalam beberapa detik.";
    }

    res.status(500).json({
      error: userMsg,
    });
  }
});

// Create Transaction (Single Pocket)
app.post("/api/transactions", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { tipe, kategori, kantong, nominal, tanggal, metode_pembayaran, keterangan, referensi } = req.body;

  if (!tipe || (tipe !== "masuk" && tipe !== "keluar")) {
    res.status(400).json({ error: "Tipe transaksi harus 'masuk' atau 'keluar'." });
    return;
  }

  if (!kategori || !nominal || Number(nominal) <= 0 || !keterangan) {
    res.status(400).json({ error: "Kategori, Nominal (harus lebih dari 0), dan Keterangan wajib diisi." });
    return;
  }

  if (!memoryDb.transactions) {
    memoryDb.transactions = [];
  }

  const categorySnapshot = (kategori || "").trim();
  const assignedKantong = kantong || inferKantongKas(categorySnapshot, tipe);

  // If this category does not exist in memoryDb.categories, auto-save to categories table
  if (categorySnapshot) {
    if (!memoryDb.categories) memoryDb.categories = [];
    const normType = normalizeCategoryType(tipe);
    const catExists = memoryDb.categories.some(
      (c) => normalizeCategoryType(c.type) === normType && c.name.toLowerCase() === categorySnapshot.toLowerCase()
    );
    if (!catExists) {
      const newCatId = memoryDb.categories.length
        ? Math.max(...memoryDb.categories.map((c) => c.id || 0)) + 1
        : 1;
      memoryDb.categories.push({
        id: newCatId,
        name: categorySnapshot,
        type: normType,
        created_at: new Date().toISOString(),
      });
    }
  }

  const newId = memoryDb.transactions.length
    ? Math.max(...memoryDb.transactions.map((t) => t.id)) + 1
    : 1;

  const newTx = {
    id: newId,
    tipe,
    kategori: categorySnapshot,
    kantong: assignedKantong,
    nominal: Number(nominal),
    tanggal: tanggal ? new Date(tanggal).toISOString() : new Date().toISOString(),
    metode_pembayaran: metode_pembayaran || "Cash",
    keterangan: keterangan.trim(),
    referensi: referensi ? referensi.trim() : "",
    created_by: currentUser.nama || "Staff",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryDb.transactions.push(newTx);

  logActivity(
    currentUser.nama,
    tipe === "masuk" ? "Catat Pemasukan" : "Catat Pengeluaran",
    `[${tipe.toUpperCase()}] [${assignedKantong.toUpperCase()}] ${newTx.kategori} - Rp ${Number(nominal).toLocaleString()} (${newTx.keterangan})`
  );

  res.status(201).json({
    message: `Transaksi ${tipe === "masuk" ? "pemasukan" : "pengeluaran"} berhasil dicatat`,
    transaction: newTx,
  });
});

// Auto-allocate Order Revenue to 5 Cash Pockets (HPP Breakdown + Discount Rules)
app.post("/api/transactions/auto-allocate-order", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const {
    nomor_nota,
    breakdownHPP,
    diskon,
    tanggal,
    metode_pembayaran,
    keterangan,
    customer_name,
  } = req.body;

  if (!breakdownHPP || typeof breakdownHPP !== "object") {
    res.status(400).json({ error: "Breakdown HPP (modal, overhead, gajiSaya, gajiKaryawan, margin) wajib diisi." });
    return;
  }

  const calculation = alokasikanOrder(breakdownHPP, Number(diskon) || 0);
  const { alokasi, sisaDiskonTidakTertutup, potonganModal } = calculation;

  if (!memoryDb.transactions) memoryDb.transactions = [];

  const createdTransactions: any[] = [];
  const baseDate = tanggal ? new Date(tanggal).toISOString() : new Date().toISOString();
  const paymentMethod = metode_pembayaran || "Transfer BCA";
  const refCode = nomor_nota ? `INV-${nomor_nota}` : `ORD-${Date.now().toString().slice(-6)}`;

  const pocketDescriptions: Record<string, { label: string; kategori: string }> = {
    modal: {
      label: "Alokasi Kantong Modal (Biaya Vendor/Kulakan)",
      kategori: "Pemasukan Toko",
    },
    overhead: {
      label: "Alokasi Kantong Overhead (Listrik, Wifi & Operasional)",
      kategori: "Pemasukan Toko",
    },
    gaji_saya: {
      label: "Alokasi Kantong Gaji Saya (Jasa Desain Owner)",
      kategori: "Pemasukan Pribadi",
    },
    gaji_karyawan: {
      label: "Alokasi Kantong Gaji Karyawan (Upah Setting & Operator)",
      kategori: "Pemasukan Toko",
    },
    margin: {
      label: "Alokasi Kantong Margin/Profit (Keuntungan Bersih Toko)",
      kategori: "Pemasukan Toko",
    },
  };

  const pocketKeys: Array<{ key: keyof typeof alokasi; pocketType: "modal" | "overhead" | "gaji_saya" | "gaji_karyawan" | "margin" }> = [
    { key: "modal", pocketType: "modal" },
    { key: "overhead", pocketType: "overhead" },
    { key: "gajiSaya", pocketType: "gaji_saya" },
    { key: "gajiKaryawan", pocketType: "gaji_karyawan" },
    { key: "margin", pocketType: "margin" },
  ];

  pocketKeys.forEach(({ key, pocketType }) => {
    const nominal = alokasi[key];
    if (nominal > 0) {
      const newId = memoryDb.transactions.length
        ? Math.max(...memoryDb.transactions.map((t) => t.id)) + 1
        : 1;

      const pocketInfo = pocketDescriptions[pocketType];
      const desc = keterangan
        ? `${pocketInfo.label} - ${keterangan} ${customer_name ? `(${customer_name})` : ""}`
        : `${pocketInfo.label} - Order ${refCode} ${customer_name ? `(${customer_name})` : ""}`;

      const newTx = {
        id: newId,
        tipe: "masuk" as const,
        kategori: pocketInfo.kategori,
        kantong: pocketType,
        nominal,
        tanggal: baseDate,
        metode_pembayaran: paymentMethod,
        keterangan: desc.trim(),
        referensi: refCode,
        created_by: currentUser.nama || "Staff",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      memoryDb.transactions.push(newTx);
      createdTransactions.push(newTx);
    }
  });

  const totalAllocated = Object.values(alokasi).reduce((sum, v) => sum + v, 0);

  logActivity(
    currentUser.nama,
    "Alokasi Kas Order 5 Kantong",
    `Memecah order ${refCode} (Total Rp ${totalAllocated.toLocaleString()}) ke 5 kantong kas`
  );

  res.status(201).json({
    message: `Order berhasil dialokasikan ke ${createdTransactions.length} kantong kas`,
    transactions: createdTransactions,
    alokasi,
    sisaDiskonTidakTertutup,
    potonganModal,
    totalAllocated,
  });
});

// Update Transaction
app.put("/api/transactions/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = (memoryDb.transactions || []).findIndex((t) => t.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Transaksi tidak ditemukan." });
    return;
  }

  const { tipe, kategori, kantong, nominal, tanggal, metode_pembayaran, keterangan, referensi } = req.body;

  if (nominal !== undefined && Number(nominal) <= 0) {
    res.status(400).json({ error: "Nominal harus lebih dari 0." });
    return;
  }

  const current = memoryDb.transactions[index];
  const targetTipe = tipe || current.tipe;
  const targetKategori = kategori ? kategori.trim() : current.kategori;
  const targetKantong = kantong || current.kantong || inferKantongKas(targetKategori, targetTipe);

  memoryDb.transactions[index] = {
    ...current,
    tipe: targetTipe,
    kategori: targetKategori,
    kantong: targetKantong,
    nominal: nominal !== undefined ? Number(nominal) : current.nominal,
    tanggal: tanggal ? new Date(tanggal).toISOString() : current.tanggal,
    metode_pembayaran: metode_pembayaran || current.metode_pembayaran,
    keterangan: keterangan !== undefined ? keterangan.trim() : current.keterangan,
    referensi: referensi !== undefined ? referensi.trim() : current.referensi,
    updated_at: new Date().toISOString(),
  };

  logActivity(
    currentUser.nama,
    "Update Transaksi",
    `Memperbarui transaksi #${id} (${memoryDb.transactions[index].keterangan})`
  );

  res.json({
    message: "Transaksi berhasil diperbarui",
    transaction: memoryDb.transactions[index],
  });
});

// Delete Transaction
app.delete("/api/transactions/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Number(req.params.id);
  const index = (memoryDb.transactions || []).findIndex((t) => t.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Transaksi tidak ditemukan." });
    return;
  }

  const deleted = memoryDb.transactions.splice(index, 1)[0];
  logActivity(
    currentUser.nama,
    "Hapus Transaksi",
    `Menghapus catatan kas: [${deleted.tipe.toUpperCase()}] ${deleted.kategori} - Rp ${deleted.nominal.toLocaleString()}`
  );

  res.json({ message: "Transaksi berhasil dihapus" });
});

/* ========================================================
   DASHBOARD & STATS ROUTES
======================================================== */

app.get("/api/dashboard/stats", authenticateToken, (req: Request, res: Response) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter orders this month
  const thisMonthOrders = memoryDb.orders.filter((o) => {
    const d = new Date(o.tanggal_order);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalOmzetBulanIni = thisMonthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalOrderBulanIni = thisMonthOrders.length;
  const orderPending = memoryDb.orders.filter((o) => o.status === "pending").length;
  const orderProses = memoryDb.orders.filter((o) => o.status === "proses").length;
  const orderSelesai = memoryDb.orders.filter((o) => o.status === "selesai").length;

  // Deadline Approaching (within next 48 hours and not finished)
  const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const deadlineApproachingOrders = memoryDb.orders.filter((o) => {
    if (o.status === "selesai" || o.status === "dibatalkan" || !o.tanggal_ambil) return false;
    const deadline = new Date(o.tanggal_ambil);
    return deadline <= next48h;
  });

  // Monthly Revenue Chart Data (Last 6 Months)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const revenueTrend = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const label = `${monthNames[m]} ${y}`;

    const monthOrders = memoryDb.orders.filter((o) => {
      const od = new Date(o.tanggal_order);
      return od.getMonth() === m && od.getFullYear() === y && o.status !== "dibatalkan";
    });

    const omzet = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const orderCount = monthOrders.length;

    revenueTrend.push({
      bulan: label,
      omzet,
      orderCount,
    });
  }

  // Category Distribution from Order Items
  const categoryCount: Record<string, number> = {
    stiker: 0,
    dtf: 0,
    banner: 0,
    jersey: 0,
    desain: 0,
    lainnya: 0,
  };

  memoryDb.orderItems.forEach((item) => {
    const product = memoryDb.products.find((p) => p.id === item.product_id);
    const cat = product ? product.kategori : "lainnya";
    categoryCount[cat] = (categoryCount[cat] || 0) + item.qty;
  });

  const categoryDistribution = Object.keys(categoryCount).map((k) => ({
    name: k.toUpperCase(),
    value: categoryCount[k],
  }));

  res.json({
    totalOmzetBulanIni,
    totalOrderBulanIni,
    orderPending,
    orderProses,
    orderSelesai,
    deadlineApproachingCount: deadlineApproachingOrders.length,
    deadlineApproachingOrders,
    revenueTrend,
    categoryDistribution,
    recentOrders: memoryDb.orders.slice(0, 5),
  });
});

/* ========================================================
   STORE SETTINGS & BACKUP ROUTES
======================================================== */

// Get Store Settings (Public & Admin)
app.get("/api/settings", (req: Request, res: Response) => {
  res.json({ settings: memoryDb.storeSettings });
});

// Update Store Settings
app.put("/api/settings", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (currentUser.role !== "owner") {
    res.status(403).json({ error: "Hanya Admin/Owner yang dapat mengubah pengaturan toko." });
    return;
  }

  const { nama_toko, slogan, alamat, no_wa, email, logo_url, rekening_bank, catatan_nota } = req.body;

  memoryDb.storeSettings = {
    ...memoryDb.storeSettings,
    nama_toko: nama_toko ? nama_toko.trim() : memoryDb.storeSettings.nama_toko,
    slogan: slogan ? slogan.trim() : memoryDb.storeSettings.slogan,
    alamat: alamat ? alamat.trim() : memoryDb.storeSettings.alamat,
    no_wa: no_wa ? no_wa.trim() : memoryDb.storeSettings.no_wa,
    email: email ? email.trim() : memoryDb.storeSettings.email,
    logo_url: logo_url !== undefined ? logo_url : memoryDb.storeSettings.logo_url,
    rekening_bank: rekening_bank !== undefined ? rekening_bank : memoryDb.storeSettings.rekening_bank,
    catatan_nota: catatan_nota !== undefined ? catatan_nota : memoryDb.storeSettings.catatan_nota,
    updated_at: new Date().toISOString(),
  };

  logActivity(currentUser.nama, "Update Pengaturan Toko", "Memperbarui profil dan format nota toko");
  res.json({ message: "Pengaturan toko berhasil disimpan", settings: memoryDb.storeSettings });
});

// Export Backup JSON
app.get("/api/settings/backup", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (currentUser.role !== "owner") {
    res.status(403).json({ error: "Hanya Admin/Owner yang dapat mengunduh backup data." });
    return;
  }

  const backupData = {
    exportDate: new Date().toISOString(),
    storeSettings: memoryDb.storeSettings,
    products: memoryDb.products,
    orders: memoryDb.orders,
    orderItems: memoryDb.orderItems,
    vendors: memoryDb.vendors,
    product_vendors: memoryDb.product_vendors,
    purchaseHistory: memoryDb.purchaseHistory,
    categories: memoryDb.categories,
    transactions: memoryDb.transactions,
    activityLogs: memoryDb.activityLogs,
    guides: memoryDb.guides,
  };

  res.setHeader("Content-Disposition", `attachment; filename=jeres-studio-backup-${new Date().toISOString().slice(0, 10)}.json`);
  res.setHeader("Content-Type", "application/json");
  res.json(backupData);
});

// Restore / Import JSON Backup
app.post("/api/settings/restore", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (currentUser.role !== "owner") {
    res.status(403).json({ error: "Hanya Owner yang berhak melakukan restore database." });
    return;
  }

  const { backupData } = req.body;
  if (!backupData || !backupData.products || !backupData.orders) {
    res.status(400).json({ error: "Format file backup tidak valid." });
    return;
  }

  if (backupData.products) memoryDb.products = backupData.products;
  if (backupData.orders) memoryDb.orders = backupData.orders;
  if (backupData.orderItems) memoryDb.orderItems = backupData.orderItems;
  if (backupData.vendors) memoryDb.vendors = backupData.vendors;
  if (backupData.product_vendors) memoryDb.product_vendors = backupData.product_vendors;
  if (backupData.purchaseHistory) memoryDb.purchaseHistory = backupData.purchaseHistory;
  if (backupData.categories) memoryDb.categories = backupData.categories;
  if (backupData.transactions) memoryDb.transactions = backupData.transactions;
  if (backupData.guides) memoryDb.guides = backupData.guides;
  if (backupData.storeSettings) memoryDb.storeSettings = backupData.storeSettings;

  logActivity(currentUser.nama, "Restore Database", "Melakukan pemulihan data dari file backup JSON");
  res.json({ message: "Data berhasil dipulihkan dari backup!" });
});

/* ========================================================
   GUIDES & SOP / TEMPLATE CHAT ROUTES (CRUD)
======================================================== */

// Get Guides (with search and category filter)
app.get("/api/guides", authenticateToken, (req: Request, res: Response) => {
  const { category, search } = req.query;
  let list = memoryDb.guides || [];

  if (category && typeof category === "string" && category.trim() !== "" && category !== "Semua") {
    list = list.filter((g) => g.category.toLowerCase() === category.trim().toLowerCase());
  }

  if (search && typeof search === "string" && search.trim() !== "") {
    const q = search.toLowerCase();
    list = list.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.content.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
    );
  }

  // Sort by id asc / created_at asc
  list = [...list].sort((a, b) => a.id - b.id);

  // Extract all unique categories
  const allCategories = Array.from(
    new Set((memoryDb.guides || []).map((g) => g.category.trim()).filter(Boolean))
  );

  res.json({ guides: list, categories: allCategories });
});

// Create Guide
app.post("/api/guides", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { category, title, content } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: "Judul panduan / template wajib diisi." });
    return;
  }

  if (!content || !content.trim()) {
    res.status(400).json({ error: "Isi konten panduan / template wajib diisi." });
    return;
  }

  if (!memoryDb.guides) {
    memoryDb.guides = [];
  }

  const newId = memoryDb.guides.length
    ? Math.max(...memoryDb.guides.map((g) => g.id)) + 1
    : 1;

  const newGuide = {
    id: newId,
    category: category && category.trim() ? category.trim() : "Template Chat",
    title: title.trim(),
    content: content.trim(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryDb.guides.push(newGuide);

  logActivity(
    currentUser.nama,
    "Tambah Panduan Kerja",
    `Menambahkan "${newGuide.title}" ke kategori ${newGuide.category}`
  );

  res.status(201).json({ message: "Panduan kerja berhasil disimpan", guide: newGuide });
});

// Update Guide
app.put("/api/guides/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const guideId = Number(req.params.id);
  const guideIndex = (memoryDb.guides || []).findIndex((g) => g.id === guideId);

  if (guideIndex === -1) {
    res.status(404).json({ error: "Panduan kerja tidak ditemukan." });
    return;
  }

  const { category, title, content } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: "Judul panduan / template wajib diisi." });
    return;
  }

  if (!content || !content.trim()) {
    res.status(400).json({ error: "Isi konten panduan / template wajib diisi." });
    return;
  }

  const updatedGuide = {
    ...memoryDb.guides[guideIndex],
    category: category && category.trim() ? category.trim() : memoryDb.guides[guideIndex].category,
    title: title.trim(),
    content: content.trim(),
    updated_at: new Date().toISOString(),
  };

  memoryDb.guides[guideIndex] = updatedGuide;

  logActivity(
    currentUser.nama,
    "Edit Panduan Kerja",
    `Memperbarui "${updatedGuide.title}" (${updatedGuide.category})`
  );

  res.json({ message: "Panduan kerja berhasil diperbarui", guide: updatedGuide });
});

// Delete Guide
app.delete("/api/guides/:id", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const guideId = Number(req.params.id);
  const guideIndex = (memoryDb.guides || []).findIndex((g) => g.id === guideId);

  if (guideIndex === -1) {
    res.status(404).json({ error: "Panduan kerja tidak ditemukan." });
    return;
  }

  const deletedGuide = memoryDb.guides[guideIndex];
  memoryDb.guides.splice(guideIndex, 1);

  logActivity(
    currentUser.nama,
    "Hapus Panduan Kerja",
    `Menghapus panduan "${deletedGuide.title}"`
  );

  res.json({ message: "Panduan kerja berhasil dihapus", guide: deletedGuide });
});

// Activity Logs
app.get("/api/activities", authenticateToken, (req: Request, res: Response) => {
  res.json({ activities: memoryDb.activityLogs.slice(0, 50) });
});

// Image Upload Helper (Base64 / Cloudinary helper)
app.post("/api/upload", authenticateToken, (req: Request, res: Response) => {
  const { dataUrl, filename } = req.body;
  if (!dataUrl) {
    res.status(400).json({ error: "Data URL gambar diperlukan" });
    return;
  }

  // If using dataUrl, return as image previewable URL directly or simulate cloud upload
  res.json({
    url: dataUrl,
    filename: filename || "uploaded_image.png",
  });
});

// Public Order Detail (Accessible without login for customer viewing link)
app.get("/api/public/orders/:id", (req: Request, res: Response) => {
  const idOrNota = req.params.id;
  const order = memoryDb.orders.find(
    (o) => String(o.id) === idOrNota || o.nomor_nota.toLowerCase() === idOrNota.toLowerCase()
  );

  if (!order) {
    res.status(404).json({ error: "Order tidak ditemukan." });
    return;
  }

  const items = memoryDb.orderItems.filter((i) => i.order_id === order.id);
  res.json({
    order: {
      ...order,
      items,
    },
    store: {
      nama_toko: memoryDb.storeSettings.nama_toko,
      slogan: memoryDb.storeSettings.slogan,
      alamat: memoryDb.storeSettings.alamat,
      no_wa: memoryDb.storeSettings.no_wa,
      email: memoryDb.storeSettings.email,
      rekening_bank: memoryDb.storeSettings.rekening_bank,
    },
  });
});

// Send Invoice Email (Resend / mailto fallback)
app.post("/api/send-invoice-email", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { orderId, recipientEmail, subject, message, publicInvoiceUrl } = req.body;

    if (!recipientEmail) {
      res.status(400).json({ error: "Alamat email tujuan wajib diisi." });
      return;
    }

    const order = memoryDb.orders.find((o) => o.id === Number(orderId) || o.nomor_nota === String(orderId));
    const store = memoryDb.storeSettings;
    const storeName = store?.nama_toko || "Jeres Studio";

    const emailSubject = subject || `Tagihan Penjualan ${order?.nomor_nota || ""} - ${storeName}`;
    const emailBody = message || `Halo, berikut adalah tagihan pesanan Anda di ${storeName}.`;

    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      // Call Resend API via native fetch
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${storeName} <onboarding@resend.dev>`,
          to: [recipientEmail],
          subject: emailSubject,
          text: emailBody,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #4338ca; margin-bottom: 8px;">${storeName}</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">${store?.slogan || "Digital Printing & Custom Merchandise"}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #1e293b;">
                ${emailBody.replace(/\n/g, "<br/>")}
              </div>
              ${
                publicInvoiceUrl
                  ? `
                <div style="margin-top: 24px; text-align: center;">
                  <a href="${publicInvoiceUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">Lihat & Download Invoice</a>
                </div>
              `
                  : ""
              }
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">${store?.alamat || ""} • WA: ${store?.no_wa || ""}</p>
            </div>
          `,
        }),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        throw new Error(resendData.message || "Gagal mengirim email melalui Resend");
      }

      logActivity(
        (req as any).user?.nama || "Sistem",
        "Kirim Email Invoice",
        `Mengirim invoice ${order?.nomor_nota || ""} ke ${recipientEmail}`
      );
      res.json({
        success: true,
        method: "resend",
        message: `Email tagihan berhasil dikirim ke ${recipientEmail}!`,
        data: resendData,
      });
      return;
    }

    // Fallback: Return success status with mailto url
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    logActivity(
      (req as any).user?.nama || "Sistem",
      "Generate Email Invoice",
      `Membuat email draft untuk ${recipientEmail}`
    );

    res.json({
      success: true,
      method: "mailto_fallback",
      message: "Layanan Resend belum dikonfigurasi, email dialihkan ke aplikasi email default Anda.",
      mailtoUrl,
    });
  } catch (err: any) {
    console.error("Error sending invoice email:", err);
    res.status(500).json({ error: err.message || "Gagal memproses pengiriman email." });
  }
});

export default app;
