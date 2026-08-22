import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI, Type } from "@google/genai";
import { memoryDb, isNeonConnected, db } from "../src/db/index.js";
import * as schema from "../src/db/schema.js";
import { eq, desc } from "drizzle-orm";

const app = express();

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "jeres-studio-secret-key-super-secure-2025";

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

// Staff List (Admin Only)
app.get("/api/auth/staff", authenticateToken, (req: Request, res: Response) => {
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

  res.json({ products: results });
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
      catatan_item: it.catatan_item || "",
    };
    memoryDb.orderItems.push(itemRecord);
    return itemRecord;
  });

  logActivity(currentUser.nama, "Buat Order Baru", `Nota ${invoiceNumber} untuk ${nama_pelanggan} (Total: Rp ${calculatedTotal.toLocaleString()})`);

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
        catatan_item: it.catatan_item || "",
      });
    });
  }

  const calculatedTotal = Math.max(0, calculatedSubtotal - discountAmount);

  memoryDb.orders[orderIndex] = {
    ...memoryDb.orders[orderIndex],
    nama_pelanggan: nama_pelanggan ? nama_pelanggan.trim() : memoryDb.orders[orderIndex].nama_pelanggan,
    no_wa: no_wa ? no_wa.trim() : memoryDb.orders[orderIndex].no_wa,
    tanggal_ambil: tanggal_ambil !== undefined ? (tanggal_ambil ? new Date(tanggal_ambil).toISOString() : null) : memoryDb.orders[orderIndex].tanggal_ambil,
    status: status || memoryDb.orders[orderIndex].status,
    metode_bayar: metode_bayar || memoryDb.orders[orderIndex].metode_bayar,
    status_bayar: status_bayar || memoryDb.orders[orderIndex].status_bayar,
    jumlah_dp: jumlah_dp !== undefined ? Number(jumlah_dp) : memoryDb.orders[orderIndex].jumlah_dp,
    catatan: catatan !== undefined ? catatan : memoryDb.orders[orderIndex].catatan,
    subtotal: calculatedSubtotal,
    diskon: discountAmount,
    total: calculatedTotal,
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

  const { status, status_bayar } = req.body;
  if (status) order.status = status;
  if (status_bayar) order.status_bayar = status_bayar;
  order.updated_at = new Date().toISOString();

  logActivity(currentUser.nama, "Ubah Status Order", `Nota ${order.nomor_nota} diubah status menjadi: ${order.status}, bayar: ${order.status_bayar}`);

  res.json({ message: "Status order berhasil diperbarui", order });
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
  const { nama_vendor, kategori_supply, kontak_nama, no_wa, alamat, catatan } = req.body;

  if (!nama_vendor || !kategori_supply || !no_wa) {
    res.status(400).json({ error: "Nama vendor, kategori supply, dan No. WA wajib diisi." });
    return;
  }

  const newId = memoryDb.vendors.length ? Math.max(...memoryDb.vendors.map((v) => v.id)) + 1 : 1;
  const newVendor = {
    id: newId,
    nama_vendor: nama_vendor.trim(),
    kategori_supply: kategori_supply.trim(),
    kontak_nama: kontak_nama ? kontak_nama.trim() : "",
    no_wa: no_wa.trim(),
    alamat: alamat || "",
    catatan: catatan || "",
    is_active: true,
    created_at: new Date().toISOString(),
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

  const { nama_vendor, kategori_supply, kontak_nama, no_wa, alamat, catatan, is_active } = req.body;
  memoryDb.vendors[index] = {
    ...memoryDb.vendors[index],
    nama_vendor: nama_vendor ? nama_vendor.trim() : memoryDb.vendors[index].nama_vendor,
    kategori_supply: kategori_supply ? kategori_supply.trim() : memoryDb.vendors[index].kategori_supply,
    kontak_nama: kontak_nama !== undefined ? kontak_nama.trim() : memoryDb.vendors[index].kontak_nama,
    no_wa: no_wa ? no_wa.trim() : memoryDb.vendors[index].no_wa,
    alamat: alamat !== undefined ? alamat : memoryDb.vendors[index].alamat,
    catatan: catatan !== undefined ? catatan : memoryDb.vendors[index].catatan,
    is_active: is_active !== undefined ? Boolean(is_active) : memoryDb.vendors[index].is_active,
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
  logActivity(currentUser.nama, "Hapus Vendor", `Menghapus supplier ${deleted.nama_vendor}`);
  res.json({ message: "Vendor berhasil dihapus" });
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
const DEFAULT_INCOME_CATEGORIES = [
  "Penjualan Order Cetak",
  "Pelunasan Order",
  "DP Order Pelanggan",
  "Jasa Desain & Setting",
  "Penjualan Bahan / Retail",
  "Pemasukan Lain-lain",
];

const DEFAULT_EXPENSE_CATEGORIES = [
  "Kulakan Bahan Baku",
  "Tinta & Master Film DTF",
  "Perawatan & Sparepart Mesin",
  "Gaji & Bonus Karyawan",
  "Listrik, Air & Internet",
  "Sewa Tempat & Bangunan",
  "Transportasi & Kurir",
  "Konsumsi & Kas Toko",
  "Pengeluaran Lain-lain",
];

// Get Categories
app.get("/api/transactions/categories", authenticateToken, (req: Request, res: Response) => {
  const customIncome = memoryDb.transactions
    .filter((t) => t.tipe === "masuk")
    .map((t) => t.kategori);
  const customExpense = memoryDb.transactions
    .filter((t) => t.tipe === "keluar")
    .map((t) => t.kategori);

  const uniqueIncome = Array.from(new Set([...DEFAULT_INCOME_CATEGORIES, ...customIncome]));
  const uniqueExpense = Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...customExpense]));

  res.json({
    incomeCategories: uniqueIncome,
    expenseCategories: uniqueExpense,
  });
});

// Get Transactions List with Filters
app.get("/api/transactions", authenticateToken, (req: Request, res: Response) => {
  const { tipe, kategori, startDate, endDate, search, metode } = req.query;
  let list = [...(memoryDb.transactions || [])];

  if (tipe && tipe !== "all") {
    list = list.filter((t) => t.tipe === tipe);
  }

  if (kategori && kategori !== "all") {
    list = list.filter((t) => t.kategori.toLowerCase() === (kategori as string).toLowerCase());
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
        t.metode_pembayaran.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  res.json({ transactions: list });
});

// Get Financial Summary (KPI & Category Breakdown)
app.get("/api/transactions/summary", authenticateToken, (req: Request, res: Response) => {
  const transactions = memoryDb.transactions || [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  let pemasukanBulanIni = 0;
  let pengeluaranBulanIni = 0;

  const incomeCatMap: Record<string, { total: number; count: number }> = {};
  const expenseCatMap: Record<string, { total: number; count: number }> = {};

  transactions.forEach((t) => {
    const nominal = Number(t.nominal) || 0;
    const tDate = new Date(t.tanggal);
    const isThisMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;

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
  });

  const breakdownPemasukan = Object.entries(incomeCatMap).map(([kategori, val]) => ({
    kategori,
    total: val.total,
    count: val.count,
  })).sort((a, b) => b.total - a.total);

  const breakdownPengeluaran = Object.entries(expenseCatMap).map(([kategori, val]) => ({
    kategori,
    total: val.total,
    count: val.count,
  })).sort((a, b) => b.total - a.total);

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
6. metode_pembayaran: Metode bayar terdeteksi ('Cash', 'QRIS', 'Transfer BCA', 'Transfer Mandiri', 'Transfer BNI', 'Transfer BRI', 'Debit', atau 'Lainnya').
7. referensi: Nomor struk, nomor nota/invoice, no resi, atau kode transaksi jika ada. Jika tidak ada, kosongkan string.
8. keterangan: Ringkasan narasi jelas mengenai pengeluaran/pemasukan tersebut (contoh: 'Belanja 2 roll Pet Film DTF 30cm & 1kg Hotmelt Powder di CV Sinar Sablon').
9. items: Array rincian barang/jasa jika terbaca dalam struk: [ { "nama_item": string, "qty": number, "harga_satuan": number, "subtotal": number } ]. Jika tidak ada rincian per item, buat 1 item dengan nama rincian nota dan totalnya.
10. confidence_notes: Keterangan singkat mengenai kejelasan pembacaan gambar oleh AI.`;

    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.7-flash",
      "gemini-2.5-pro",
    ];

    let lastError: any = null;
    let parsedJson: any = null;

    for (const modelName of candidateModels) {
      // Try up to 2 attempts per model if high demand / 503 is encountered
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
            // Wait 500ms before retrying same model
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }
          // If still failing, break to try next candidate model
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

// Create Transaction
app.post("/api/transactions", authenticateToken, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { tipe, kategori, nominal, tanggal, metode_pembayaran, keterangan, referensi } = req.body;

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

  const newId = memoryDb.transactions.length
    ? Math.max(...memoryDb.transactions.map((t) => t.id)) + 1
    : 1;

  const newTx = {
    id: newId,
    tipe,
    kategori: kategori.trim(),
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
    `[${tipe.toUpperCase()}] ${newTx.kategori} - Rp ${Number(nominal).toLocaleString()} (${newTx.keterangan})`
  );

  res.status(201).json({
    message: `Transaksi ${tipe === "masuk" ? "pemasukan" : "pengeluaran"} berhasil dicatat`,
    transaction: newTx,
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

  const { tipe, kategori, nominal, tanggal, metode_pembayaran, keterangan, referensi } = req.body;

  if (nominal !== undefined && Number(nominal) <= 0) {
    res.status(400).json({ error: "Nominal harus lebih dari 0." });
    return;
  }

  memoryDb.transactions[index] = {
    ...memoryDb.transactions[index],
    tipe: tipe || memoryDb.transactions[index].tipe,
    kategori: kategori ? kategori.trim() : memoryDb.transactions[index].kategori,
    nominal: nominal !== undefined ? Number(nominal) : memoryDb.transactions[index].nominal,
    tanggal: tanggal ? new Date(tanggal).toISOString() : memoryDb.transactions[index].tanggal,
    metode_pembayaran: metode_pembayaran || memoryDb.transactions[index].metode_pembayaran,
    keterangan: keterangan !== undefined ? keterangan.trim() : memoryDb.transactions[index].keterangan,
    referensi: referensi !== undefined ? referensi.trim() : memoryDb.transactions[index].referensi,
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
  const backupData = {
    exportDate: new Date().toISOString(),
    storeSettings: memoryDb.storeSettings,
    products: memoryDb.products,
    orders: memoryDb.orders,
    orderItems: memoryDb.orderItems,
    vendors: memoryDb.vendors,
    purchaseHistory: memoryDb.purchaseHistory,
    transactions: memoryDb.transactions,
    activityLogs: memoryDb.activityLogs,
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
  if (backupData.purchaseHistory) memoryDb.purchaseHistory = backupData.purchaseHistory;
  if (backupData.transactions) memoryDb.transactions = backupData.transactions;
  if (backupData.storeSettings) memoryDb.storeSettings = backupData.storeSettings;

  logActivity(currentUser.nama, "Restore Database", "Melakukan pemulihan data dari file backup JSON");
  res.json({ message: "Data berhasil dipulihkan dari backup!" });
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

export default app;
