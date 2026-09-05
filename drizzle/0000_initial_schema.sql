-- Jeres Studio - Neon PostgreSQL Initial Migration
-- Drizzle Migration File

CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"nama" varchar(100) NOT NULL,
	"role" varchar(20) DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"kategori" varchar(50) NOT NULL,
	"nama_item" varchar(150) NOT NULL,
	"deskripsi" text,
	"satuan" varchar(30) DEFAULT 'pcs' NOT NULL,
	"harga" integer NOT NULL,
	"harga_minimum_qty" integer DEFAULT 1,
	"gambar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"tampilkan_harga_publik" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor_nota" varchar(50) NOT NULL UNIQUE,
	"nama_pelanggan" varchar(150) NOT NULL,
	"no_wa" varchar(50) NOT NULL,
	"tanggal_order" timestamp DEFAULT now() NOT NULL,
	"tanggal_ambil" timestamp,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"metode_bayar" varchar(50) DEFAULT 'Cash' NOT NULL,
	"status_bayar" varchar(30) DEFAULT 'belum' NOT NULL,
	"jumlah_dp" integer DEFAULT 0,
	"catatan" text,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"diskon" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"created_by" varchar(100) DEFAULT 'admin',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
	"product_id" integer REFERENCES "products"("id") ON DELETE SET NULL,
	"nama_item" varchar(150) NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"satuan" varchar(30) DEFAULT 'pcs' NOT NULL,
	"harga_satuan" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"catatan_item" text
);

CREATE TABLE IF NOT EXISTS "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama_vendor" varchar(150) NOT NULL,
	"kategori_supply" varchar(100) NOT NULL,
	"kontak_nama" varchar(100),
	"no_wa" varchar(50) NOT NULL,
	"alamat" text,
	"catatan" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
	"tanggal" timestamp DEFAULT now() NOT NULL,
	"nama_barang" varchar(150) NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"satuan" varchar(30) DEFAULT 'pcs' NOT NULL,
	"harga_satuan" integer NOT NULL,
	"total" integer NOT NULL,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_name" varchar(100) NOT NULL,
	"action" varchar(100) NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "store_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama_toko" varchar(150) DEFAULT 'Jeres Studio' NOT NULL,
	"slogan" varchar(250) DEFAULT 'Solusi Cetak & Desain Digital Cepat, Rapi & Berkualitas',
	"alamat" text DEFAULT 'Jl. Percetakan No. 134, Kota Kreatif, Indonesia',
	"no_wa" varchar(50) DEFAULT '6281234567890' NOT NULL,
	"email" varchar(100) DEFAULT 'jeresstudio134@gmail.com',
	"logo_url" text DEFAULT '',
	"rekening_bank" text DEFAULT 'BCA: 123-456-7890 a/n Jeres Studio\nMandiri: 987-654-3210 a/n Jeres Studio\nQRIS: Tersedia di Kasir',
	"catatan_nota" text DEFAULT '1. Barang yang sudah dicetak sesuai ACC tidak dapat dikembalikan.\n2. Pembayaran lunas saat pengambilan barang.\n3. File disimpan maksimal 30 hari.',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
