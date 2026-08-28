import { pgTable, serial, text, varchar, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  nama: varchar("nama", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).default("staff").notNull(), // 'owner' | 'staff'
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  kategori: varchar("kategori", { length: 50 }).notNull(), // 'stiker' | 'dtf' | 'banner' | 'jersey' | 'desain' | 'lainnya'
  nama_item: varchar("nama_item", { length: 150 }).notNull(),
  deskripsi: text("deskripsi"),
  satuan: varchar("satuan", { length: 30 }).default("pcs").notNull(), // 'pcs' | 'meter' | 'lusin' | 'lembar' | 'paket'
  harga: integer("harga").notNull(),
  harga_minimum_qty: integer("harga_minimum_qty").default(1),
  gambar_url: text("gambar_url"),
  is_active: boolean("is_active").default(true).notNull(),
  tampilkan_harga_publik: boolean("tampilkan_harga_publik").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  nomor_nota: varchar("nomor_nota", { length: 50 }).notNull().unique(),
  nama_pelanggan: varchar("nama_pelanggan", { length: 150 }).notNull(),
  no_wa: varchar("no_wa", { length: 50 }).notNull(),
  tanggal_order: timestamp("tanggal_order").defaultNow().notNull(),
  tanggal_ambil: timestamp("tanggal_ambil"),
  status: varchar("status", { length: 30 }).default("pending").notNull(), // 'pending' | 'proses' | 'selesai' | 'dibatalkan'
  metode_bayar: varchar("metode_bayar", { length: 50 }).default("Cash").notNull(),
  status_bayar: varchar("status_bayar", { length: 30 }).default("belum").notNull(), // 'belum' | 'dp' | 'lunas'
  jumlah_dp: integer("jumlah_dp").default(0),
  catatan: text("catatan"),
  subtotal: integer("subtotal").default(0).notNull(),
  diskon: integer("diskon").default(0).notNull(),
  total: integer("total").default(0).notNull(),
  created_by: varchar("created_by", { length: 100 }).default("admin"),
  share_token: text("share_token").unique(),
  share_expires_at: timestamp("share_expires_at"),
  progress_notes: text("progress_notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  product_id: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  nama_item: varchar("nama_item", { length: 150 }).notNull(),
  qty: integer("qty").default(1).notNull(),
  satuan: varchar("satuan", { length: 30 }).default("pcs").notNull(),
  harga_satuan: integer("harga_satuan").notNull(),
  subtotal: integer("subtotal").notNull(),
  catatan_item: text("catatan_item"),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  nama_vendor: varchar("nama_vendor", { length: 150 }).notNull(),
  kategori_supply: varchar("kategori_supply", { length: 100 }).default("Lainnya"), // 'Bahan Stiker' | 'Bahan DTF' | 'Tinta' | 'Kertas & Karton' | 'Jasa Cetak' | 'Lainnya'
  kontak: text("kontak"), // nomor WA / telepon
  kontak_nama: varchar("kontak_nama", { length: 100 }),
  no_wa: varchar("no_wa", { length: 50 }),
  link: text("link"), // link website / catalog / marketplace vendor
  alamat: text("alamat"),
  catatan: text("catatan"),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const productVendors = pgTable("product_vendors", {
  id: serial("id").primaryKey(),
  product_id: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  vendor_id: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }).notNull(),
  harga_modal: integer("harga_modal").notNull(),
  is_default: boolean("is_default").default(false).notNull(),
  catatan: text("catatan"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const purchaseHistory = pgTable("purchase_history", {
  id: serial("id").primaryKey(),
  vendor_id: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }).notNull(),
  tanggal: timestamp("tanggal").defaultNow().notNull(),
  nama_barang: varchar("nama_barang", { length: 150 }).notNull(),
  qty: integer("qty").default(1).notNull(),
  satuan: varchar("satuan", { length: 30 }).default("pcs").notNull(),
  harga_satuan: integer("harga_satuan").notNull(),
  total: integer("total").notNull(),
  catatan: text("catatan"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  user_name: varchar("user_name", { length: 100 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const guides = pgTable("guides", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).default("Template Chat").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'masuk' | 'keluar'
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  tipe: varchar("tipe", { length: 20 }).notNull(), // 'masuk' | 'keluar'
  kategori: varchar("kategori", { length: 100 }).notNull(), // snapshot nama kategori
  kantong: varchar("kantong", { length: 50 }).default("margin").notNull(), // 'modal' | 'overhead' | 'gaji_saya' | 'gaji_karyawan' | 'margin'
  nominal: integer("nominal").notNull(),
  tanggal: timestamp("tanggal").defaultNow().notNull(),
  metode_pembayaran: varchar("metode_pembayaran", { length: 50 }).default("Cash").notNull(),
  keterangan: text("keterangan").notNull(),
  referensi: varchar("referensi", { length: 100 }),
  created_by: varchar("created_by", { length: 100 }).default("admin"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  nama_toko: varchar("nama_toko", { length: 150 }).default("Jeres Studio").notNull(),
  slogan: varchar("slogan", { length: 250 }).default("Solusi Cetak & Desain Digital Cepat, Rapi & Berkualitas"),
  alamat: text("alamat").default("Jl. Percetakan No. 134, Kota Kreatif, Indonesia"),
  no_wa: varchar("no_wa", { length: 50 }).default("6281234567890").notNull(),
  email: varchar("email", { length: 100 }).default("jeresstudio134@gmail.com"),
  logo_url: text("logo_url").default(""),
  rekening_bank: text("rekening_bank").default("BCA: 123-456-7890 a/n Jeres Studio\nMandiri: 987-654-3210 a/n Jeres Studio\nQRIS: Tersedia di Kasir"),
  catatan_nota: text("catatan_nota").default("1. Barang yang sudah dicetak sesuai ACC tidak dapat dikembalikan.\n2. Pembayaran lunas saat pengambilan barang.\n3. File disimpan maksimal 30 hari."),
  margin_threshold_good: varchar("margin_threshold_good", { length: 10 }).default("20"),
  margin_threshold_warning: varchar("margin_threshold_warning", { length: 10 }).default("10"),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ many }) => ({
  vendors: many(productVendors),
  orderItems: many(orderItems),
}));

export const productVendorsRelations = relations(productVendors, ({ one }) => ({
  product: one(products, {
    fields: [productVendors.product_id],
    references: [products.id],
  }),
  vendor: one(vendors, {
    fields: [productVendors.vendor_id],
    references: [vendors.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.order_id],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.product_id],
    references: [products.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  purchases: many(purchaseHistory),
  products: many(productVendors),
}));

export const purchaseHistoryRelations = relations(purchaseHistory, ({ one }) => ({
  vendor: one(vendors, {
    fields: [purchaseHistory.vendor_id],
    references: [vendors.id],
  }),
}));
