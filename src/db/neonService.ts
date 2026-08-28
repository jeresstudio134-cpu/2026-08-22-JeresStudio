import { neon } from "@neondatabase/serverless";
import { memoryDb, MemoryStore } from "./index.js";

// Helper to get raw SQL query client from DATABASE_URL
export function getNeonSql() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.includes("postgres") || dbUrl.includes("sample")) {
    return null;
  }
  try {
    return neon(dbUrl);
  } catch (e) {
    console.error("Failed to initialize Neon client:", e);
    return null;
  }
}

export interface DbStatusInfo {
  connected: boolean;
  databaseUrlConfigured: boolean;
  databaseHost: string;
  tableCount: number;
  tables: Array<{ name: string; rowCount: number }>;
  lastChecked: string;
  error?: string;
}

// 1. Initialize Tables in Neon PostgreSQL (DDL)
export async function initNeonTables(): Promise<{ success: boolean; message: string; tableCount: number }> {
  const sql = getNeonSql();
  if (!sql) {
    return {
      success: false,
      message: "DATABASE_URL belum dikonfigurasi di Environment Variables.",
      tableCount: 0,
    };
  }

  try {
    console.log("--> Memeriksa & membuat skema tabel di Neon PostgreSQL...");

    // 1. admin_users
    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        nama VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'staff' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // 2. products
    await sql`
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
    `;

    // 3. orders
    await sql`
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
    `;

    // 4. order_items
    await sql`
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
    `;

    // 5. vendors
    await sql`
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
    `;

    // 6. product_vendors
    await sql`
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
    `;

    // 7. purchase_history
    await sql`
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
    `;

    // 8. activity_logs
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // 9. guides
    await sql`
      CREATE TABLE IF NOT EXISTS guides (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) DEFAULT 'Template Chat' NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // 10. categories
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // 11. transactions
    await sql`
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
    `;

    // 12. store_settings
    await sql`
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
      );
    `;

    console.log("✓ Semua 12 tabel berhasil diverifikasi & dibuat di Neon PostgreSQL.");

    // Auto-seed initial data if empty
    await autoSeedIfEmpty(sql);

    // Sync from Neon into memory store for fast startup
    await syncFromNeonToMemory(sql);

    return {
      success: true,
      message: "Tabel dan skema Neon PostgreSQL berhasil diinisialisasi & disinkronkan.",
      tableCount: 12,
    };
  } catch (err: any) {
    console.error("Gagal menginisialisasi tabel di Neon:", err);
    return {
      success: false,
      message: "Terjadi kesalahan saat membuat tabel: " + (err.message || String(err)),
      tableCount: 0,
    };
  }
}

// 2. Auto-Seed Initial Data if Tables are Empty
async function autoSeedIfEmpty(sql: any) {
  try {
    // Check admin_users
    const usersCount = await sql`SELECT COUNT(*)::int as count FROM admin_users`;
    if (usersCount[0]?.count === 0) {
      console.log("--> Seeding data awal admin_users...");
      for (const u of memoryDb.adminUsers) {
        await sql`
          INSERT INTO admin_users (username, password_hash, nama, role, created_at)
          VALUES (${u.username}, ${u.password_hash}, ${u.nama}, ${u.role}, ${new Date(u.created_at)})
          ON CONFLICT (username) DO NOTHING
        `;
      }
    }

    // Check store_settings
    const settingsCount = await sql`SELECT COUNT(*)::int as count FROM store_settings`;
    if (settingsCount[0]?.count === 0) {
      console.log("--> Seeding data awal store_settings...");
      const s = memoryDb.storeSettings;
      await sql`
        INSERT INTO store_settings (id, nama_toko, slogan, alamat, no_wa, email, logo_url, rekening_bank, catatan_nota, margin_threshold_good, margin_threshold_warning, updated_at)
        VALUES (1, ${s.nama_toko}, ${s.slogan}, ${s.alamat}, ${s.no_wa}, ${s.email}, ${s.logo_url || ''}, ${s.rekening_bank}, ${s.catatan_nota}, ${s.margin_threshold_good || '20'}, ${s.margin_threshold_warning || '10'}, ${new Date()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Check products
    const productsCount = await sql`SELECT COUNT(*)::int as count FROM products`;
    if (productsCount[0]?.count === 0) {
      console.log("--> Seeding data awal produk cetak...");
      for (const p of memoryDb.products) {
        const imagesStr = JSON.stringify(p.images || []);
        await sql`
          INSERT INTO products (kategori, nama_item, deskripsi, satuan, harga, harga_minimum_qty, gambar_url, images, is_active, tampilkan_harga_publik, created_at, updated_at)
          VALUES (${p.kategori}, ${p.nama_item}, ${p.deskripsi || ''}, ${p.satuan || 'pcs'}, ${p.harga}, ${p.harga_minimum_qty || 1}, ${p.gambar_url || ''}, ${imagesStr}, ${p.is_active !== false}, ${p.tampilkan_harga_publik !== false}, ${new Date(p.created_at || Date.now())}, ${new Date(p.updated_at || Date.now())})
        `;
      }
    }

    // Check categories
    const categoriesCount = await sql`SELECT COUNT(*)::int as count FROM categories`;
    if (categoriesCount[0]?.count === 0) {
      console.log("--> Seeding kategori kas & pembukuan...");
      for (const c of memoryDb.categories) {
        await sql`
          INSERT INTO categories (name, type, created_at)
          VALUES (${c.name}, ${c.type}, ${new Date(c.created_at || Date.now())})
        `;
      }
    }

    // Check guides
    const guidesCount = await sql`SELECT COUNT(*)::int as count FROM guides`;
    if (guidesCount[0]?.count === 0) {
      console.log("--> Seeding template panduan & SOP percetakan...");
      for (const g of memoryDb.guides) {
        await sql`
          INSERT INTO guides (category, title, content, created_at, updated_at)
          VALUES (${g.category}, ${g.title}, ${g.content}, ${new Date(g.created_at || Date.now())}, ${new Date(g.updated_at || Date.now())})
        `;
      }
    }

    // Check vendors
    const vendorsCount = await sql`SELECT COUNT(*)::int as count FROM vendors`;
    if (vendorsCount[0]?.count === 0) {
      console.log("--> Seeding data vendor...");
      for (const v of memoryDb.vendors) {
        await sql`
          INSERT INTO vendors (nama_vendor, kategori_supply, kontak, kontak_nama, no_wa, link, alamat, catatan, is_active, created_at, updated_at)
          VALUES (${v.nama_vendor}, ${v.kategori_supply || 'Lainnya'}, ${v.kontak || ''}, ${v.kontak_nama || ''}, ${v.no_wa || ''}, ${v.link || ''}, ${v.alamat || ''}, ${v.catatan || ''}, ${v.is_active !== false}, ${new Date(v.created_at || Date.now())}, ${new Date(v.updated_at || Date.now())})
        `;
      }
    }

    console.log("✓ Verifikasi & seeding awal selesai.");
  } catch (err) {
    console.error("Peringatan saat seeding data awal ke Neon:", err);
  }
}

// 3. Sync from Neon into memoryDb Cache
export async function syncFromNeonToMemory(sql: any) {
  try {
    const users = await sql`SELECT * FROM admin_users ORDER BY id ASC`;
    if (users.length > 0) {
      memoryDb.adminUsers = users.map((u: any) => ({
        ...u,
        created_at: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    const prods = await sql`SELECT * FROM products ORDER BY id ASC`;
    if (prods.length > 0) {
      memoryDb.products = prods.map((p: any) => {
        let imgs: string[] = [];
        try {
          imgs = p.images ? JSON.parse(p.images) : [];
        } catch {
          imgs = p.gambar_url ? [p.gambar_url] : [];
        }
        return {
          ...p,
          images: Array.isArray(imgs) ? imgs : [],
          created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
          updated_at: p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString(),
        };
      });
    }

    const ords = await sql`SELECT * FROM orders ORDER BY id DESC`;
    if (ords.length > 0) {
      memoryDb.orders = ords.map((o: any) => {
        let progNotes: any[] = [];
        try {
          progNotes = o.progress_notes ? JSON.parse(o.progress_notes) : [];
        } catch {
          progNotes = [];
        }
        return {
          ...o,
          progress_notes: progNotes,
          tanggal_order: o.tanggal_order ? new Date(o.tanggal_order).toISOString() : new Date().toISOString(),
          tanggal_ambil: o.tanggal_ambil ? new Date(o.tanggal_ambil).toISOString() : null,
          share_expires_at: o.share_expires_at ? new Date(o.share_expires_at).toISOString() : null,
          created_at: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
          updated_at: o.updated_at ? new Date(o.updated_at).toISOString() : new Date().toISOString(),
        };
      });
    }

    const items = await sql`SELECT * FROM order_items ORDER BY id ASC`;
    if (items.length > 0) {
      memoryDb.orderItems = items.map((i: any) => ({
        ...i,
        qty: Number(i.qty),
        harga_satuan: Number(i.harga_satuan),
        subtotal: Number(i.subtotal),
        panjang: i.panjang !== null ? Number(i.panjang) : null,
        lebar: i.lebar !== null ? Number(i.lebar) : null,
      }));
    }

    const st = await sql`SELECT * FROM store_settings WHERE id = 1 LIMIT 1`;
    if (st.length > 0) {
      memoryDb.storeSettings = {
        ...st[0],
        updated_at: st[0].updated_at ? new Date(st[0].updated_at).toISOString() : new Date().toISOString(),
      };
    }

    const vens = await sql`SELECT * FROM vendors ORDER BY id ASC`;
    if (vens.length > 0) {
      memoryDb.vendors = vens.map((v: any) => ({
        ...v,
        created_at: v.created_at ? new Date(v.created_at).toISOString() : new Date().toISOString(),
        updated_at: v.updated_at ? new Date(v.updated_at).toISOString() : new Date().toISOString(),
      }));
    }

    const pvs = await sql`SELECT * FROM product_vendors ORDER BY id ASC`;
    if (pvs.length > 0) {
      memoryDb.product_vendors = pvs.map((pv: any) => ({
        ...pv,
        created_at: pv.created_at ? new Date(pv.created_at).toISOString() : new Date().toISOString(),
        updated_at: pv.updated_at ? new Date(pv.updated_at).toISOString() : new Date().toISOString(),
      }));
    }

    const txs = await sql`SELECT * FROM transactions ORDER BY id DESC`;
    if (txs.length > 0) {
      memoryDb.transactions = txs.map((t: any) => ({
        ...t,
        nominal: Number(t.nominal),
        tanggal: t.tanggal ? new Date(t.tanggal).toISOString() : new Date().toISOString(),
        created_at: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
        updated_at: t.updated_at ? new Date(t.updated_at).toISOString() : new Date().toISOString(),
      }));
    }

    const cats = await sql`SELECT * FROM categories ORDER BY id ASC`;
    if (cats.length > 0) {
      memoryDb.categories = cats.map((c: any) => ({
        ...c,
        created_at: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    const gds = await sql`SELECT * FROM guides ORDER BY id ASC`;
    if (gds.length > 0) {
      memoryDb.guides = gds.map((g: any) => ({
        ...g,
        created_at: g.created_at ? new Date(g.created_at).toISOString() : new Date().toISOString(),
        updated_at: g.updated_at ? new Date(g.updated_at).toISOString() : new Date().toISOString(),
      }));
    }

    console.log("✓ Data dari Neon PostgreSQL berhasil disinkronkan ke memori server.");
  } catch (err) {
    console.error("Gagal sinkronisasi data dari Neon:", err);
  }
}

// 4. Diagnostic Database Status
export async function getDatabaseStatus(): Promise<DbStatusInfo> {
  const dbUrl = process.env.DATABASE_URL || "";
  const isConfigured = Boolean(dbUrl && dbUrl.includes("postgres") && !dbUrl.includes("sample"));

  let hostName = "Belum Terkonfigurasi";
  if (isConfigured) {
    try {
      const parsed = new URL(dbUrl);
      hostName = parsed.host || "Neon Serverless Postgres";
    } catch {
      hostName = "Neon Serverless Postgres";
    }
  }

  const sql = getNeonSql();
  if (!sql) {
    return {
      connected: false,
      databaseUrlConfigured: isConfigured,
      databaseHost: hostName,
      tableCount: 0,
      tables: [],
      lastChecked: new Date().toISOString(),
      error: isConfigured
        ? "DATABASE_URL ada tetapi koneksi ke Neon gagal. Periksa format URL atau status serverless Neon."
        : "DATABASE_URL belum diatur di Vercel Settings -> Environment Variables.",
    };
  }

  try {
    const tableList = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC;
    `;

    const tablesWithCounts: Array<{ name: string; rowCount: number }> = [];

    for (const t of tableList) {
      const name = t.table_name;
      try {
        const countRes = await sql`SELECT COUNT(*)::int as count FROM ${sql(name)}`;
        tablesWithCounts.push({
          name,
          rowCount: countRes[0]?.count || 0,
        });
      } catch {
        tablesWithCounts.push({ name, rowCount: 0 });
      }
    }

    return {
      connected: true,
      databaseUrlConfigured: true,
      databaseHost: hostName,
      tableCount: tablesWithCounts.length,
      tables: tablesWithCounts,
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      connected: false,
      databaseUrlConfigured: true,
      databaseHost: hostName,
      tableCount: 0,
      tables: [],
      lastChecked: new Date().toISOString(),
      error: err.message || String(err),
    };
  }
}

// 5. Persistent CRUD Mutation Helpers
export async function persistProduct(product: any) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    const imagesStr = JSON.stringify(product.images || []);
    if (product.id && typeof product.id === "number") {
      await sql`
        INSERT INTO products (id, kategori, nama_item, deskripsi, satuan, harga, harga_minimum_qty, gambar_url, images, is_active, tampilkan_harga_publik, updated_at)
        VALUES (${product.id}, ${product.kategori}, ${product.nama_item}, ${product.deskripsi || ''}, ${product.satuan || 'pcs'}, ${product.harga}, ${product.harga_minimum_qty || 1}, ${product.gambar_url || ''}, ${imagesStr}, ${product.is_active !== false}, ${product.tampilkan_harga_publik !== false}, ${new Date()})
        ON CONFLICT (id) DO UPDATE SET
          kategori = EXCLUDED.kategori,
          nama_item = EXCLUDED.nama_item,
          deskripsi = EXCLUDED.deskripsi,
          satuan = EXCLUDED.satuan,
          harga = EXCLUDED.harga,
          harga_minimum_qty = EXCLUDED.harga_minimum_qty,
          gambar_url = EXCLUDED.gambar_url,
          images = EXCLUDED.images,
          is_active = EXCLUDED.is_active,
          tampilkan_harga_publik = EXCLUDED.tampilkan_harga_publik,
          updated_at = NOW();
      `;
    }
  } catch (e) {
    console.error("Error persisting product to Neon:", e);
  }
}

export async function persistDeleteProduct(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM products WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting product from Neon:", e);
  }
}

export async function persistOrder(order: any, items: any[]) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    const progNotesStr = JSON.stringify(order.progress_notes || []);
    const tanggalOrder = order.tanggal_order ? new Date(order.tanggal_order) : new Date();
    const tanggalAmbil = order.tanggal_ambil ? new Date(order.tanggal_ambil) : null;
    const shareExpires = order.share_expires_at ? new Date(order.share_expires_at) : null;

    await sql`
      INSERT INTO orders (
        id, nomor_nota, nama_pelanggan, no_wa, tanggal_order, tanggal_ambil, status, 
        metode_bayar, status_bayar, jumlah_dp, catatan, subtotal, diskon, total, 
        created_by, share_token, share_expires_at, progress_notes, updated_at
      ) VALUES (
        ${order.id}, ${order.nomor_nota}, ${order.nama_pelanggan}, ${order.no_wa}, 
        ${tanggalOrder}, ${tanggalAmbil}, ${order.status || 'pending'}, 
        ${order.metode_bayar || 'Cash'}, ${order.status_bayar || 'belum'}, ${order.jumlah_dp || 0}, 
        ${order.catatan || ''}, ${order.subtotal || 0}, ${order.diskon || 0}, ${order.total || 0}, 
        ${order.created_by || 'admin'}, ${order.share_token || null}, ${shareExpires}, 
        ${progNotesStr}, ${new Date()}
      )
      ON CONFLICT (id) DO UPDATE SET
        nama_pelanggan = EXCLUDED.nama_pelanggan,
        no_wa = EXCLUDED.no_wa,
        tanggal_ambil = EXCLUDED.tanggal_ambil,
        status = EXCLUDED.status,
        metode_bayar = EXCLUDED.metode_bayar,
        status_bayar = EXCLUDED.status_bayar,
        jumlah_dp = EXCLUDED.jumlah_dp,
        catatan = EXCLUDED.catatan,
        subtotal = EXCLUDED.subtotal,
        diskon = EXCLUDED.diskon,
        total = EXCLUDED.total,
        share_token = EXCLUDED.share_token,
        share_expires_at = EXCLUDED.share_expires_at,
        progress_notes = EXCLUDED.progress_notes,
        updated_at = NOW();
    `;

    // Persist items if provided
    if (items && items.length > 0) {
      await sql`DELETE FROM order_items WHERE order_id = ${order.id}`;
      for (const item of items) {
        await sql`
          INSERT INTO order_items (
            order_id, product_id, nama_item, qty, satuan, harga_satuan, 
            subtotal, catatan_item, panjang, lebar, dimensi_unit, jumlah_lembar, hitung_dimensi
          ) VALUES (
            ${order.id}, ${item.product_id || null}, ${item.nama_item}, ${item.qty || 1}, 
            ${item.satuan || 'pcs'}, ${item.harga_satuan || 0}, ${item.subtotal || 0}, 
            ${item.catatan_item || ''}, ${item.panjang || null}, ${item.lebar || null}, 
            ${item.dimensi_unit || 'm'}, ${item.jumlah_lembar || 1}, ${item.hitung_dimensi || false}
          );
        `;
      }
    }
  } catch (e) {
    console.error("Error persisting order to Neon:", e);
  }
}

export async function persistDeleteOrder(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM orders WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting order from Neon:", e);
  }
}

export async function persistTransaction(tx: any) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    const tanggal = tx.tanggal ? new Date(tx.tanggal) : new Date();
    await sql`
      INSERT INTO transactions (
        id, tipe, kategori, kantong, nominal, tanggal, metode_pembayaran, keterangan, referensi, created_by, updated_at
      ) VALUES (
        ${tx.id}, ${tx.tipe}, ${tx.kategori}, ${tx.kantong || 'margin'}, ${tx.nominal}, 
        ${tanggal}, ${tx.metode_pembayaran || 'Cash'}, ${tx.keterangan || ''}, 
        ${tx.referensi || null}, ${tx.created_by || 'admin'}, ${new Date()}
      )
      ON CONFLICT (id) DO UPDATE SET
        tipe = EXCLUDED.tipe,
        kategori = EXCLUDED.kategori,
        kantong = EXCLUDED.kantong,
        nominal = EXCLUDED.nominal,
        tanggal = EXCLUDED.tanggal,
        metode_pembayaran = EXCLUDED.metode_pembayaran,
        keterangan = EXCLUDED.keterangan,
        referensi = EXCLUDED.referensi,
        updated_at = NOW();
    `;
  } catch (e) {
    console.error("Error persisting transaction to Neon:", e);
  }
}

export async function persistDeleteTransaction(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM transactions WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting transaction from Neon:", e);
  }
}

export async function persistStoreSettings(s: any) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`
      INSERT INTO store_settings (
        id, nama_toko, slogan, alamat, no_wa, email, logo_url, rekening_bank, 
        catatan_nota, margin_threshold_good, margin_threshold_warning, updated_at
      ) VALUES (
        1, ${s.nama_toko}, ${s.slogan}, ${s.alamat}, ${s.no_wa}, ${s.email}, 
        ${s.logo_url || ''}, ${s.rekening_bank}, ${s.catatan_nota}, 
        ${s.margin_threshold_good || '20'}, ${s.margin_threshold_warning || '10'}, ${new Date()}
      )
      ON CONFLICT (id) DO UPDATE SET
        nama_toko = EXCLUDED.nama_toko,
        slogan = EXCLUDED.slogan,
        alamat = EXCLUDED.alamat,
        no_wa = EXCLUDED.no_wa,
        email = EXCLUDED.email,
        logo_url = EXCLUDED.logo_url,
        rekening_bank = EXCLUDED.rekening_bank,
        catatan_nota = EXCLUDED.catatan_nota,
        margin_threshold_good = EXCLUDED.margin_threshold_good,
        margin_threshold_warning = EXCLUDED.margin_threshold_warning,
        updated_at = NOW();
    `;
  } catch (e) {
    console.error("Error persisting store settings to Neon:", e);
  }
}

export async function persistAdminUser(u: any) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`
      INSERT INTO admin_users (
        id, username, password_hash, nama, role
      ) VALUES (
        ${u.id}, ${u.username}, ${u.password_hash}, ${u.nama}, ${u.role || 'staff'}
      )
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        nama = EXCLUDED.nama,
        role = EXCLUDED.role;
    `;
  } catch (e) {
    console.error("Error persisting admin user to Neon:", e);
  }
}

export async function persistDeleteAdminUser(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM admin_users WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting admin user from Neon:", e);
  }
}

export async function persistVendor(v: any) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`
      INSERT INTO vendors (
        id, nama_vendor, kategori_supply, kontak, kontak_nama, no_wa, link, alamat, catatan, is_active, updated_at
      ) VALUES (
        ${v.id}, ${v.nama_vendor}, ${v.kategori_supply || 'Lainnya'}, ${v.kontak || ''}, 
        ${v.kontak_nama || ''}, ${v.no_wa || ''}, ${v.link || ''}, ${v.alamat || ''}, 
        ${v.catatan || ''}, ${v.is_active !== false}, ${new Date()}
      )
      ON CONFLICT (id) DO UPDATE SET
        nama_vendor = EXCLUDED.nama_vendor,
        kategori_supply = EXCLUDED.kategori_supply,
        kontak = EXCLUDED.kontak,
        kontak_nama = EXCLUDED.kontak_nama,
        no_wa = EXCLUDED.no_wa,
        link = EXCLUDED.link,
        alamat = EXCLUDED.alamat,
        catatan = EXCLUDED.catatan,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    `;
  } catch (e) {
    console.error("Error persisting vendor to Neon:", e);
  }
}

export async function persistDeleteVendor(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM vendors WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting vendor from Neon:", e);
  }
}

export async function persistProductVendor(pv: any) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`
      INSERT INTO product_vendors (
        id, product_id, vendor_id, harga_modal, is_default, catatan, updated_at
      ) VALUES (
        ${pv.id}, ${pv.product_id}, ${pv.vendor_id}, ${pv.harga_modal}, 
        ${pv.is_default || false}, ${pv.catatan || ''}, ${new Date()}
      )
      ON CONFLICT (id) DO UPDATE SET
        product_id = EXCLUDED.product_id,
        vendor_id = EXCLUDED.vendor_id,
        harga_modal = EXCLUDED.harga_modal,
        is_default = EXCLUDED.is_default,
        catatan = EXCLUDED.catatan,
        updated_at = NOW();
    `;
  } catch (e) {
    console.error("Error persisting product vendor to Neon:", e);
  }
}

export async function persistDeleteProductVendor(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM product_vendors WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting product vendor from Neon:", e);
  }
}

export async function persistGuide(g: any) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`
      INSERT INTO guides (
        id, category, title, content, updated_at
      ) VALUES (
        ${g.id}, ${g.category || 'Template Chat'}, ${g.title}, ${g.content}, ${new Date()}
      )
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW();
    `;
  } catch (e) {
    console.error("Error persisting guide to Neon:", e);
  }
}

export async function persistDeleteGuide(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM guides WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting guide from Neon:", e);
  }
}

export async function persistActivityLog(log: any) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`
      INSERT INTO activity_logs (
        user_name, action, details
      ) VALUES (
        ${log.user_name || 'Admin'}, ${log.action}, ${log.details || ''}
      );
    `;
  } catch (e) {
    // Non-critical, ignore
  }
}
