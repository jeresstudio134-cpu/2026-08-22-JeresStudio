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
        product_id INTEGER,
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
    // Ensure legacy product_id foreign key constraint is dropped so custom line items won't violate FK
    await sql`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey`.catch(() => {});

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
        items TEXT,
        created_by VARCHAR(100) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // Ensure items column exists in transactions for older tables
    try {
      await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS items TEXT;`;
    } catch {
      // Column may already exist
    }

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

    // 13. savings_targets (Tabungan & Angsuran Kas)
    await sql`
      CREATE TABLE IF NOT EXISTS savings_targets (
        id SERIAL PRIMARY KEY,
        tipe VARCHAR(20) DEFAULT 'tabungan' NOT NULL,
        nama VARCHAR(150) NOT NULL,
        target_nominal NUMERIC NOT NULL,
        terkumpul_nominal NUMERIC DEFAULT 0 NOT NULL,
        sumber_kantong_default VARCHAR(50) DEFAULT 'margin' NOT NULL,
        jatuh_tempo VARCHAR(50),
        cicilan_per_bulan NUMERIC DEFAULT 0,
        catatan TEXT,
        status VARCHAR(20) DEFAULT 'aktif' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    console.log("✓ Semua 13 tabel berhasil diverifikasi & dibuat di Neon PostgreSQL.");

    // Auto-seed initial data ONLY if tables are completely empty
    await autoSeedIfEmpty(sql);

    // Sync all existing data from Neon directly into memory store
    await syncFromNeonToMemory(sql);

    // Auto repair postgres ID sequences to prevent collision with existing records
    await repairPostgresSequences(sql);

    return {
      success: true,
      message: "Tabel dan skema Neon PostgreSQL berhasil diinisialisasi & disinkronkan dengan data database Neon.",
      tableCount: 13,
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

// Helper to auto-repair PostgreSQL serial sequences based on existing MAX(id)
export async function repairPostgresSequences(sql: any) {
  if (!sql) return;
  const tables = [
    "admin_users",
    "products",
    "orders",
    "order_items",
    "vendors",
    "product_vendors",
    "purchase_history",
    "activity_logs",
    "guides",
    "categories",
    "transactions",
  ];
  for (const tbl of tables) {
    try {
      await sql`
        SELECT setval(
          pg_get_serial_sequence(${tbl}, 'id'),
          COALESCE((SELECT MAX(id) FROM ${sql(tbl)}), 1)
        );
      `;
    } catch {
      // Ignore if table or sequence doesn't support setval
    }
  }
}

// 2. Auto-Seed Initial Data ONLY if Tables are completely Empty
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
          INSERT INTO vendors (id, nama_vendor, kategori_supply, kontak, kontak_nama, no_wa, link, alamat, catatan, is_active, created_at, updated_at)
          VALUES (${v.id}, ${v.nama_vendor}, ${v.kategori_supply || 'Lainnya'}, ${v.kontak || ''}, ${v.kontak_nama || ''}, ${v.no_wa || ''}, ${v.link || ''}, ${v.alamat || ''}, ${v.catatan || ''}, ${v.is_active !== false}, ${new Date(v.created_at || Date.now())}, ${new Date(v.updated_at || Date.now())})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }

    // Check product_vendors
    const pvCount = await sql`SELECT COUNT(*)::int as count FROM product_vendors`;
    if (pvCount[0]?.count === 0 && Array.isArray(memoryDb.product_vendors) && memoryDb.product_vendors.length > 0) {
      console.log("--> Seeding data hubungan produk vendor...");
      for (const pv of memoryDb.product_vendors) {
        await sql`
          INSERT INTO product_vendors (id, product_id, vendor_id, harga_modal, is_default, catatan, created_at, updated_at)
          VALUES (${pv.id}, ${pv.product_id}, ${pv.vendor_id}, ${pv.harga_modal}, ${pv.is_default || false}, ${pv.catatan || ''}, ${new Date(pv.created_at || Date.now())}, ${new Date(pv.updated_at || Date.now())})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }

    // Check orders and order_items
    const ordersCount = await sql`SELECT COUNT(*)::int as count FROM orders`;
    if (ordersCount[0]?.count === 0 && Array.isArray(memoryDb.orders) && memoryDb.orders.length > 0) {
      console.log("--> Seeding data awal pesanan & nota cetak...");
      for (const o of memoryDb.orders) {
        const progNotesStr = JSON.stringify(o.progress_notes || []);
        const tglOrder = o.tanggal_order ? new Date(o.tanggal_order) : new Date();
        const tglAmbil = o.tanggal_ambil ? new Date(o.tanggal_ambil) : null;
        await sql`
          INSERT INTO orders (
            id, nomor_nota, nama_pelanggan, no_wa, tanggal_order, tanggal_ambil, status, 
            metode_bayar, status_bayar, jumlah_dp, catatan, subtotal, diskon, total, 
            created_by, share_token, share_expires_at, progress_notes, created_at, updated_at
          ) VALUES (
            ${o.id}, ${o.nomor_nota}, ${o.nama_pelanggan}, ${o.no_wa}, 
            ${tglOrder}, ${tglAmbil}, ${o.status || 'pending'}, 
            ${o.metode_bayar || 'Cash'}, ${o.status_bayar || 'belum'}, ${o.jumlah_dp || 0}, 
            ${o.catatan || ''}, ${o.subtotal || 0}, ${o.diskon || 0}, ${o.total || 0}, 
            ${o.created_by || 'Admin'}, ${o.share_token || null}, null, 
            ${progNotesStr}, ${new Date(o.created_at || Date.now())}, ${new Date(o.updated_at || Date.now())}
          )
          ON CONFLICT (id) DO NOTHING
        `;

        // Seed items for this order
        const orderItems = (memoryDb.orderItems || []).filter((i: any) => i.order_id === o.id);
        for (const item of orderItems) {
          await sql`
            INSERT INTO order_items (
              id, order_id, product_id, nama_item, qty, satuan, harga_satuan, 
              subtotal, catatan_item, panjang, lebar, dimensi_unit, jumlah_lembar, hitung_dimensi
            ) VALUES (
              ${item.id}, ${o.id}, ${item.product_id || null}, ${item.nama_item}, ${item.qty || 1}, 
              ${item.satuan || 'pcs'}, ${item.harga_satuan || 0}, ${item.subtotal || 0}, 
              ${item.catatan_item || ''}, ${item.panjang || null}, ${item.lebar || null}, 
              ${item.dimensi_unit || 'm'}, ${item.jumlah_lembar || 1}, ${item.hitung_dimensi || false}
            )
            ON CONFLICT (id) DO NOTHING
          `;
        }
      }
    }

    // Check transactions (5 Kantong Keuangan)
    const txCount = await sql`SELECT COUNT(*)::int as count FROM transactions`;
    if (txCount[0]?.count === 0 && Array.isArray(memoryDb.transactions) && memoryDb.transactions.length > 0) {
      console.log("--> Seeding data awal transaksi kas (5 kantong)...");
      for (const t of memoryDb.transactions) {
        const itemsJson = t.items ? JSON.stringify(t.items) : null;
        await sql`
          INSERT INTO transactions (
            id, tipe, kategori, kantong, nominal, tanggal, metode_pembayaran, keterangan, referensi, items, created_by, created_at, updated_at
          ) VALUES (
            ${t.id}, ${t.tipe}, ${t.kategori}, ${t.kantong || 'margin'}, ${Math.round(Number(t.nominal) || 0)}, 
            ${new Date(t.tanggal || Date.now())}, ${t.metode_pembayaran || 'Cash'}, ${t.keterangan || ''}, 
            ${t.referensi || null}, ${itemsJson}, ${t.created_by || 'admin'}, ${new Date(t.created_at || Date.now())}, ${new Date(t.updated_at || Date.now())}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }

    // Check savings_targets
    const stCount = await sql`SELECT COUNT(*)::int as count FROM savings_targets`;
    if (stCount[0]?.count === 0 && Array.isArray(memoryDb.savingsTargets) && memoryDb.savingsTargets.length > 0) {
      console.log("--> Seeding target tabungan & angsuran...");
      for (const st of memoryDb.savingsTargets) {
        await sql`
          INSERT INTO savings_targets (
            id, tipe, nama, target_nominal, terkumpul_nominal, sumber_kantong_default, jatuh_tempo, cicilan_per_bulan, catatan, status, created_at, updated_at
          ) VALUES (
            ${st.id}, ${st.tipe || 'tabungan'}, ${st.nama}, ${st.target_nominal || 0}, ${st.terkumpul_nominal || 0},
            ${st.sumber_kantong_default || 'margin'}, ${st.jatuh_tempo || ''}, ${st.cicilan_per_bulan || 0},
            ${st.catatan || ''}, ${st.status || 'aktif'}, ${new Date(st.created_at || Date.now())}, ${new Date(st.updated_at || Date.now())}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }

    // Check purchase_history
    const phCount = await sql`SELECT COUNT(*)::int as count FROM purchase_history`;
    if (phCount[0]?.count === 0 && Array.isArray(memoryDb.purchaseHistory) && memoryDb.purchaseHistory.length > 0) {
      console.log("--> Seeding riwayat pembelian kulakan...");
      for (const ph of memoryDb.purchaseHistory) {
        await sql`
          INSERT INTO purchase_history (
            id, vendor_id, tanggal, nama_barang, qty, satuan, harga_satuan, total, catatan, created_at
          ) VALUES (
            ${ph.id}, ${ph.vendor_id}, ${new Date(ph.tanggal || Date.now())}, ${ph.nama_barang}, ${ph.qty || 1}, 
            ${ph.satuan || 'pcs'}, ${ph.harga_satuan || 0}, ${ph.total || 0}, ${ph.catatan || ''}, ${new Date(ph.created_at || Date.now())}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }

    // Repair PostgreSQL serial sequence pointers
    await repairPostgresSequences(sql);

    console.log("✓ Verifikasi & seeding awal selesai.");
  } catch (err) {
    console.error("Peringatan saat seeding data awal ke Neon:", err);
  }
}

// 3. Sync from Neon directly into memoryDb Cache with bidirectional recovery
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

    // Bidirectional sync for transactions
    const txs = await sql`SELECT * FROM transactions ORDER BY id DESC`;
    if (txs.length > 0) {
      const dbTxIds = new Set(txs.map((t: any) => t.id));
      if (Array.isArray(memoryDb.transactions)) {
        for (const mTx of memoryDb.transactions) {
          if (!dbTxIds.has(mTx.id)) {
            try {
              await persistTransaction(mTx);
            } catch (e) {
              console.warn("Auto-sync memory transaction to Neon:", e);
            }
          }
        }
      }
      const refreshedTxs = await sql`SELECT * FROM transactions ORDER BY id DESC`;
      memoryDb.transactions = refreshedTxs.map((t: any) => {
        let parsedItems = undefined;
        if (t.items) {
          try {
            parsedItems = typeof t.items === "string" ? JSON.parse(t.items) : t.items;
          } catch {
            parsedItems = undefined;
          }
        }
        return {
          ...t,
          nominal: Number(t.nominal),
          items: Array.isArray(parsedItems) ? parsedItems : undefined,
          tanggal: t.tanggal ? new Date(t.tanggal).toISOString() : new Date().toISOString(),
          created_at: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
          updated_at: t.updated_at ? new Date(t.updated_at).toISOString() : new Date().toISOString(),
        };
      });
    } else if (memoryDb.transactions && memoryDb.transactions.length > 0) {
      for (const mTx of memoryDb.transactions) {
        await persistTransaction(mTx).catch(() => {});
      }
      const seededTxs = await sql`SELECT * FROM transactions ORDER BY id DESC`;
      if (seededTxs.length > 0) {
        memoryDb.transactions = seededTxs.map((t: any) => ({
          ...t,
          nominal: Number(t.nominal),
          tanggal: t.tanggal ? new Date(t.tanggal).toISOString() : new Date().toISOString(),
          created_at: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
          updated_at: t.updated_at ? new Date(t.updated_at).toISOString() : new Date().toISOString(),
        }));
      }
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

    const purchases = await sql`SELECT * FROM purchase_history ORDER BY id DESC`;
    if (purchases.length > 0) {
      memoryDb.purchaseHistory = purchases.map((p: any) => ({
        ...p,
        qty: Number(p.qty),
        harga_satuan: Number(p.harga_satuan),
        total: Number(p.total),
        tanggal: p.tanggal ? new Date(p.tanggal).toISOString() : new Date().toISOString(),
        created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    const targets = await sql`SELECT * FROM savings_targets ORDER BY id ASC`;
    if (targets.length > 0) {
      memoryDb.savingsTargets = targets.map((st: any) => ({
        ...st,
        target_nominal: Number(st.target_nominal),
        terkumpul_nominal: Number(st.terkumpul_nominal),
        cicilan_per_bulan: Number(st.cicilan_per_bulan || 0),
        created_at: st.created_at ? new Date(st.created_at).toISOString() : new Date().toISOString(),
        updated_at: st.updated_at ? new Date(st.updated_at).toISOString() : new Date().toISOString(),
      }));
    }

    console.log("✓ Data dari database Neon PostgreSQL berhasil disinkronkan secara presisi ke memori server.");
  } catch (err) {
    console.error("Gagal sinkronisasi data dari Neon:", err);
  }
}

export async function refreshMemoryFromNeon() {
  const sql = getNeonSql();
  if (!sql) return;
  await syncFromNeonToMemory(sql);
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
  if (!sql) return product;
  try {
    const imagesStr = JSON.stringify(product.images || []);
    const tanggal = product.updated_at ? new Date(product.updated_at) : new Date();
    const createdAt = product.created_at ? new Date(product.created_at) : new Date();
    
    if (product.id && typeof product.id === "number") {
      await sql`
        INSERT INTO products (id, kategori, nama_item, deskripsi, satuan, harga, harga_minimum_qty, gambar_url, images, is_active, tampilkan_harga_publik, created_at, updated_at)
        VALUES (${product.id}, ${product.kategori}, ${product.nama_item}, ${product.deskripsi || ''}, ${product.satuan || 'pcs'}, ${product.harga}, ${product.harga_minimum_qty || 1}, ${product.gambar_url || ''}, ${imagesStr}, ${product.is_active !== false}, ${product.tampilkan_harga_publik !== false}, ${createdAt}, ${tanggal})
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
    } else {
      const res = await sql`
        INSERT INTO products (kategori, nama_item, deskripsi, satuan, harga, harga_minimum_qty, gambar_url, images, is_active, tampilkan_harga_publik, created_at, updated_at)
        VALUES (${product.kategori}, ${product.nama_item}, ${product.deskripsi || ''}, ${product.satuan || 'pcs'}, ${product.harga}, ${product.harga_minimum_qty || 1}, ${product.gambar_url || ''}, ${imagesStr}, ${product.is_active !== false}, ${product.tampilkan_harga_publik !== false}, ${createdAt}, ${tanggal})
        RETURNING *;
      `;
      if (res && res[0]) {
        product.id = res[0].id;
      }
    }
    await sql`SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1))`.catch(() => {});
    return product;
  } catch (e) {
    console.error("Error persisting product to Neon:", e);
    throw e;
  }
}

export async function persistDeleteProduct(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM products WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting product from Neon:", e);
    throw e;
  }
}

export async function persistOrder(order: any, items: any[]) {
  const sql = getNeonSql();
  if (!sql) return order;
  try {
    const progNotesStr = JSON.stringify(order.progress_notes || []);
    const tanggalOrder = order.tanggal_order ? new Date(order.tanggal_order) : new Date();
    const tanggalAmbil = order.tanggal_ambil ? new Date(order.tanggal_ambil) : null;
    const shareExpires = order.share_expires_at ? new Date(order.share_expires_at) : null;

    let targetId = order.id && typeof order.id === "number" ? order.id : null;
    if (!targetId && order.nomor_nota) {
      const existing = await sql`SELECT id FROM orders WHERE nomor_nota = ${order.nomor_nota} LIMIT 1`;
      if (existing.length > 0) targetId = existing[0].id;
    }

    if (targetId) {
      const existing = await sql`SELECT id FROM orders WHERE id = ${targetId} LIMIT 1`;
      if (existing.length > 0) {
        order.id = targetId;
        await sql`
          UPDATE orders SET
            nomor_nota = ${order.nomor_nota},
            nama_pelanggan = ${order.nama_pelanggan},
            no_wa = ${order.no_wa},
            tanggal_ambil = ${tanggalAmbil},
            status = ${order.status || 'pending'},
            metode_bayar = ${order.metode_bayar || 'Cash'},
            status_bayar = ${order.status_bayar || 'belum'},
            jumlah_dp = ${Math.round(Number(order.jumlah_dp) || 0)},
            catatan = ${order.catatan || ''},
            subtotal = ${Math.round(Number(order.subtotal) || 0)},
            diskon = ${Math.round(Number(order.diskon) || 0)},
            total = ${Math.round(Number(order.total) || 0)},
            share_token = ${order.share_token || null},
            share_expires_at = ${shareExpires},
            progress_notes = ${progNotesStr},
            updated_at = NOW()
          WHERE id = ${targetId};
        `;
      } else {
        const res = await sql`
          INSERT INTO orders (
            id, nomor_nota, nama_pelanggan, no_wa, tanggal_order, tanggal_ambil, status, 
            metode_bayar, status_bayar, jumlah_dp, catatan, subtotal, diskon, total, 
            created_by, share_token, share_expires_at, progress_notes, created_at, updated_at
          ) VALUES (
            ${targetId}, ${order.nomor_nota}, ${order.nama_pelanggan}, ${order.no_wa}, 
            ${tanggalOrder}, ${tanggalAmbil}, ${order.status || 'pending'}, 
            ${order.metode_bayar || 'Cash'}, ${order.status_bayar || 'belum'}, ${Math.round(Number(order.jumlah_dp) || 0)}, 
            ${order.catatan || ''}, ${Math.round(Number(order.subtotal) || 0)}, ${Math.round(Number(order.diskon) || 0)}, ${Math.round(Number(order.total) || 0)}, 
            ${order.created_by || 'admin'}, ${order.share_token || null}, ${shareExpires}, 
            ${progNotesStr}, ${new Date(order.created_at || Date.now())}, ${new Date()}
          )
          RETURNING *;
        `;
        if (res && res[0]) order.id = res[0].id;
      }
    } else {
      const res = await sql`
        INSERT INTO orders (
          nomor_nota, nama_pelanggan, no_wa, tanggal_order, tanggal_ambil, status, 
          metode_bayar, status_bayar, jumlah_dp, catatan, subtotal, diskon, total, 
          created_by, share_token, share_expires_at, progress_notes, created_at, updated_at
        ) VALUES (
          ${order.nomor_nota}, ${order.nama_pelanggan}, ${order.no_wa}, 
          ${tanggalOrder}, ${tanggalAmbil}, ${order.status || 'pending'}, 
          ${order.metode_bayar || 'Cash'}, ${order.status_bayar || 'belum'}, ${Math.round(Number(order.jumlah_dp) || 0)}, 
          ${order.catatan || ''}, ${Math.round(Number(order.subtotal) || 0)}, ${Math.round(Number(order.diskon) || 0)}, ${Math.round(Number(order.total) || 0)}, 
          ${order.created_by || 'admin'}, ${order.share_token || null}, ${shareExpires}, 
          ${progNotesStr}, ${new Date(order.created_at || Date.now())}, ${new Date()}
        )
        RETURNING *;
      `;
      if (res && res[0]) {
        order.id = res[0].id;
      }
    }

    // Persist items if provided
    if (items && Array.isArray(items)) {
      await sql`DELETE FROM order_items WHERE order_id = ${order.id}`;
      for (const item of items) {
        await sql`
          INSERT INTO order_items (
            order_id, product_id, nama_item, qty, satuan, harga_satuan, 
            subtotal, catatan_item, panjang, lebar, dimensi_unit, jumlah_lembar, hitung_dimensi
          ) VALUES (
            ${order.id}, ${item.product_id || null}, ${item.nama_item}, ${Number(item.qty) || 1}, 
            ${item.satuan || 'pcs'}, ${Math.round(Number(item.harga_satuan) || 0)}, ${Math.round(Number(item.subtotal) || 0)}, 
            ${item.catatan_item || ''}, ${item.panjang ? Number(item.panjang) : null}, ${item.lebar ? Number(item.lebar) : null}, 
            ${item.dimensi_unit || 'm'}, ${item.jumlah_lembar ? Number(item.jumlah_lembar) : 1}, ${Boolean(item.hitung_dimensi)}
          );
        `;
      }
    }

    await sql`SELECT setval(pg_get_serial_sequence('orders', 'id'), COALESCE((SELECT MAX(id) FROM orders), 1))`.catch(() => {});
    await sql`SELECT setval(pg_get_serial_sequence('order_items', 'id'), COALESCE((SELECT MAX(id) FROM order_items), 1))`.catch(() => {});
    return order;
  } catch (e) {
    console.error("Error persisting order to Neon:", e);
    throw e;
  }
}

export async function persistDeleteOrder(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM orders WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting order from Neon:", e);
    throw e;
  }
}

export async function persistTransaction(tx: any) {
  const sql = getNeonSql();
  if (!sql) return tx;
  try {
    const tanggal = tx.tanggal ? new Date(tx.tanggal) : new Date();
    const itemsJson = tx.items ? JSON.stringify(tx.items) : null;
    const nominal = Math.round(Number(tx.nominal) || 0);

    if (tx.id && typeof tx.id === "number") {
      await sql`
        INSERT INTO transactions (
          id, tipe, kategori, kantong, nominal, tanggal, metode_pembayaran, keterangan, referensi, items, created_by, updated_at
        ) VALUES (
          ${tx.id}, ${tx.tipe}, ${tx.kategori}, ${tx.kantong || 'margin'}, ${nominal}, 
          ${tanggal}, ${tx.metode_pembayaran || 'Cash'}, ${tx.keterangan || ''}, 
          ${tx.referensi || null}, ${itemsJson}, ${tx.created_by || 'admin'}, ${new Date()}
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
          items = EXCLUDED.items,
          updated_at = NOW();
      `;
    } else {
      const res = await sql`
        INSERT INTO transactions (
          tipe, kategori, kantong, nominal, tanggal, metode_pembayaran, keterangan, referensi, items, created_by, updated_at
        ) VALUES (
          ${tx.tipe}, ${tx.kategori}, ${tx.kantong || 'margin'}, ${nominal}, 
          ${tanggal}, ${tx.metode_pembayaran || 'Cash'}, ${tx.keterangan || ''}, 
          ${tx.referensi || null}, ${itemsJson}, ${tx.created_by || 'admin'}, ${new Date()}
        )
        RETURNING *;
      `;
      if (res && res[0]) {
        tx.id = res[0].id;
      }
    }
    await sql`SELECT setval(pg_get_serial_sequence('transactions', 'id'), COALESCE((SELECT MAX(id) FROM transactions), 1))`.catch(() => {});
    return tx;
  } catch (e) {
    console.error("Error persisting transaction to Neon:", e);
    throw e;
  }
}

export async function persistDeleteTransaction(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM transactions WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting transaction from Neon:", e);
    throw e;
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
        1, ${s.nama_toko || 'Jeres Studio'}, ${s.slogan || ''}, ${s.alamat || ''}, ${s.no_wa || ''}, ${s.email || ''}, 
        ${s.logo_url || ''}, ${s.rekening_bank || ''}, ${s.catatan_nota || ''}, 
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
    console.log("✓ Pengaturan toko & URL Logo berhasil tersimpan permanen ke Neon PostgreSQL.");
  } catch (e) {
    console.error("Error persisting store settings to Neon:", e);
    throw e;
  }
}

export async function persistAdminUser(u: any) {
  const sql = getNeonSql();
  if (!sql) return u;
  try {
    if (u.id && typeof u.id === "number") {
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
    } else {
      const res = await sql`
        INSERT INTO admin_users (
          username, password_hash, nama, role
        ) VALUES (
          ${u.username}, ${u.password_hash}, ${u.nama}, ${u.role || 'staff'}
        )
        RETURNING *;
      `;
      if (res && res[0]) {
        u.id = res[0].id;
      }
    }
    await sql`SELECT setval(pg_get_serial_sequence('admin_users', 'id'), COALESCE((SELECT MAX(id) FROM admin_users), 1))`.catch(() => {});
    return u;
  } catch (e) {
    console.error("Error persisting admin user to Neon:", e);
    throw e;
  }
}

export async function persistDeleteAdminUser(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM admin_users WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting admin user from Neon:", e);
    throw e;
  }
}

export async function persistVendor(v: any) {
  const sql = getNeonSql();
  if (!sql) return v;
  try {
    if (v.id && typeof v.id === "number") {
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
    } else {
      const res = await sql`
        INSERT INTO vendors (
          nama_vendor, kategori_supply, kontak, kontak_nama, no_wa, link, alamat, catatan, is_active, updated_at
        ) VALUES (
          ${v.nama_vendor}, ${v.kategori_supply || 'Lainnya'}, ${v.kontak || ''}, 
          ${v.kontak_nama || ''}, ${v.no_wa || ''}, ${v.link || ''}, ${v.alamat || ''}, 
          ${v.catatan || ''}, ${v.is_active !== false}, ${new Date()}
        )
        RETURNING *;
      `;
      if (res && res[0]) {
        v.id = res[0].id;
      }
    }
    await sql`SELECT setval(pg_get_serial_sequence('vendors', 'id'), COALESCE((SELECT MAX(id) FROM vendors), 1))`.catch(() => {});
    return v;
  } catch (e) {
    console.error("Error persisting vendor to Neon:", e);
    throw e;
  }
}

export async function persistDeleteVendor(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM vendors WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting vendor from Neon:", e);
    throw e;
  }
}

export async function persistProductVendor(pv: any) {
  const sql = getNeonSql();
  if (!sql) return pv;
  try {
    if (pv.id && typeof pv.id === "number") {
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
    } else {
      const res = await sql`
        INSERT INTO product_vendors (
          product_id, vendor_id, harga_modal, is_default, catatan, updated_at
        ) VALUES (
          ${pv.product_id}, ${pv.vendor_id}, ${pv.harga_modal}, 
          ${pv.is_default || false}, ${pv.catatan || ''}, ${new Date()}
        )
        RETURNING *;
      `;
      if (res && res[0]) {
        pv.id = res[0].id;
      }
    }
    await sql`SELECT setval(pg_get_serial_sequence('product_vendors', 'id'), COALESCE((SELECT MAX(id) FROM product_vendors), 1))`.catch(() => {});
    return pv;
  } catch (e) {
    console.error("Error persisting product vendor to Neon:", e);
    throw e;
  }
}

export async function persistDeleteProductVendor(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM product_vendors WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting product vendor from Neon:", e);
    throw e;
  }
}

export async function persistGuide(g: any) {
  const sql = getNeonSql();
  if (!sql) return g;
  try {
    if (g.id && typeof g.id === "number") {
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
    } else {
      const res = await sql`
        INSERT INTO guides (
          category, title, content, updated_at
        ) VALUES (
          ${g.category || 'Template Chat'}, ${g.title}, ${g.content}, ${new Date()}
        )
        RETURNING *;
      `;
      if (res && res[0]) {
        g.id = res[0].id;
      }
    }
    await sql`SELECT setval(pg_get_serial_sequence('guides', 'id'), COALESCE((SELECT MAX(id) FROM guides), 1))`.catch(() => {});
    return g;
  } catch (e) {
    console.error("Error persisting guide to Neon:", e);
    throw e;
  }
}

export async function persistDeleteGuide(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM guides WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting guide from Neon:", e);
    throw e;
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

export async function persistCategory(c: any) {
  const sql = getNeonSql();
  if (!sql) return c;
  try {
    if (c.id && typeof c.id === "number") {
      await sql`
        INSERT INTO categories (id, name, type, created_at)
        VALUES (${c.id}, ${c.name}, ${c.type || 'masuk'}, ${new Date(c.created_at || Date.now())})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type;
      `;
    } else {
      const res = await sql`
        INSERT INTO categories (name, type, created_at)
        VALUES (${c.name}, ${c.type || 'masuk'}, ${new Date(c.created_at || Date.now())})
        RETURNING *;
      `;
      if (res && res[0]) {
        c.id = res[0].id;
      }
    }
    await sql`SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1))`.catch(() => {});
    return c;
  } catch (e) {
    console.error("Error persisting category to Neon:", e);
    throw e;
  }
}

export async function persistDeleteCategory(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM categories WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting category from Neon:", e);
    throw e;
  }
}

export async function persistPurchase(p: any) {
  const sql = getNeonSql();
  if (!sql) return p;
  try {
    const tanggal = p.tanggal ? new Date(p.tanggal) : new Date();
    if (p.id && typeof p.id === "number") {
      await sql`
        INSERT INTO purchase_history (
          id, vendor_id, tanggal, nama_barang, qty, satuan, harga_satuan, total, catatan, created_at
        ) VALUES (
          ${p.id}, ${p.vendor_id}, ${tanggal}, ${p.nama_barang}, ${p.qty || 1}, 
          ${p.satuan || 'pcs'}, ${p.harga_satuan || 0}, ${p.total || 0}, ${p.catatan || ''}, ${new Date(p.created_at || Date.now())}
        )
        ON CONFLICT (id) DO UPDATE SET
          vendor_id = EXCLUDED.vendor_id,
          tanggal = EXCLUDED.tanggal,
          nama_barang = EXCLUDED.nama_barang,
          qty = EXCLUDED.qty,
          satuan = EXCLUDED.satuan,
          harga_satuan = EXCLUDED.harga_satuan,
          total = EXCLUDED.total,
          catatan = EXCLUDED.catatan;
      `;
    } else {
      const res = await sql`
        INSERT INTO purchase_history (
          vendor_id, tanggal, nama_barang, qty, satuan, harga_satuan, total, catatan, created_at
        ) VALUES (
          ${p.vendor_id}, ${tanggal}, ${p.nama_barang}, ${p.qty || 1}, 
          ${p.satuan || 'pcs'}, ${p.harga_satuan || 0}, ${p.total || 0}, ${p.catatan || ''}, ${new Date(p.created_at || Date.now())}
        )
        RETURNING *;
      `;
      if (res && res[0]) {
        p.id = res[0].id;
      }
    }
    await sql`SELECT setval(pg_get_serial_sequence('purchase_history', 'id'), COALESCE((SELECT MAX(id) FROM purchase_history), 1))`.catch(() => {});
    return p;
  } catch (e) {
    console.error("Error persisting purchase to Neon:", e);
    throw e;
  }
}

export async function persistDeletePurchase(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM purchase_history WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting purchase from Neon:", e);
    throw e;
  }
}

export async function persistSavingsTarget(st: any) {
  const sql = getNeonSql();
  if (!sql) return st;
  try {
    if (st.id && typeof st.id === "number") {
      await sql`
        INSERT INTO savings_targets (
          id, tipe, nama, target_nominal, terkumpul_nominal, sumber_kantong_default, jatuh_tempo, cicilan_per_bulan, catatan, status, created_at, updated_at
        ) VALUES (
          ${st.id}, ${st.tipe || 'tabungan'}, ${st.nama}, ${st.target_nominal || 0}, ${st.terkumpul_nominal || 0},
          ${st.sumber_kantong_default || 'margin'}, ${st.jatuh_tempo || ''}, ${st.cicilan_per_bulan || 0},
          ${st.catatan || ''}, ${st.status || 'aktif'}, ${new Date(st.created_at || Date.now())}, ${new Date(st.updated_at || Date.now())}
        )
        ON CONFLICT (id) DO UPDATE SET
          tipe = EXCLUDED.tipe,
          nama = EXCLUDED.nama,
          target_nominal = EXCLUDED.target_nominal,
          terkumpul_nominal = EXCLUDED.terkumpul_nominal,
          sumber_kantong_default = EXCLUDED.sumber_kantong_default,
          jatuh_tempo = EXCLUDED.jatuh_tempo,
          cicilan_per_bulan = EXCLUDED.cicilan_per_bulan,
          catatan = EXCLUDED.catatan,
          status = EXCLUDED.status,
          updated_at = NOW();
      `;
    } else {
      const res = await sql`
        INSERT INTO savings_targets (
          tipe, nama, target_nominal, terkumpul_nominal, sumber_kantong_default, jatuh_tempo, cicilan_per_bulan, catatan, status, created_at, updated_at
        ) VALUES (
          ${st.tipe || 'tabungan'}, ${st.nama}, ${st.target_nominal || 0}, ${st.terkumpul_nominal || 0},
          ${st.sumber_kantong_default || 'margin'}, ${st.jatuh_tempo || ''}, ${st.cicilan_per_bulan || 0},
          ${st.catatan || ''}, ${st.status || 'aktif'}, ${new Date(st.created_at || Date.now())}, ${new Date(st.updated_at || Date.now())}
        )
        RETURNING *;
      `;
      if (res && res[0]) {
        st.id = res[0].id;
      }
    }
    await sql`SELECT setval(pg_get_serial_sequence('savings_targets', 'id'), COALESCE((SELECT MAX(id) FROM savings_targets), 1))`.catch(() => {});
    return st;
  } catch (e) {
    console.error("Error persisting savings target to Neon:", e);
    throw e;
  }
}

export async function persistDeleteSavingsTarget(id: number) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`DELETE FROM savings_targets WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting savings target from Neon:", e);
    throw e;
  }
}

// 6. Direct Neon Query Readers (Ensures Vercel serverless consistency across all lambdas)

export async function fetchOrdersFromNeon(filters?: {
  status?: string;
  status_bayar?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) {
  const sql = getNeonSql();
  if (!sql) {
    let list = [...memoryDb.orders];
    if (filters?.status && filters.status !== "all") list = list.filter((o) => o.status === filters.status);
    if (filters?.status_bayar && filters.status_bayar !== "all") list = list.filter((o) => o.status_bayar === filters.status_bayar);
    if (filters?.startDate) list = list.filter((o) => new Date(o.tanggal_order) >= new Date(filters.startDate!));
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((o) => new Date(o.tanggal_order) <= end);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((o) => o.nomor_nota.toLowerCase().includes(q) || o.nama_pelanggan.toLowerCase().includes(q) || o.no_wa.includes(q));
    }
    return list.map((o) => ({ ...o, items: memoryDb.orderItems.filter((i) => i.order_id === o.id) }));
  }

  const orders = await sql`SELECT * FROM orders ORDER BY created_at DESC, id DESC`;
  const items = await sql`SELECT * FROM order_items ORDER BY id ASC`;

  const itemsByOrder: Record<number, any[]> = {};
  for (const it of items) {
    const formatted = {
      id: it.id,
      order_id: it.order_id,
      product_id: it.product_id,
      nama_item: it.nama_item,
      qty: Number(it.qty),
      satuan: it.satuan || 'pcs',
      harga_satuan: Number(it.harga_satuan),
      subtotal: Number(it.subtotal),
      catatan_item: it.catatan_item || '',
      panjang: it.panjang !== null ? Number(it.panjang) : null,
      lebar: it.lebar !== null ? Number(it.lebar) : null,
      dimensi_unit: it.dimensi_unit || 'm',
      jumlah_lembar: it.jumlah_lembar ? Number(it.jumlah_lembar) : 1,
      hitung_dimensi: Boolean(it.hitung_dimensi),
    };
    if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
    itemsByOrder[it.order_id].push(formatted);
  }

  const formattedOrders = orders.map((o: any) => {
    let progNotes = [];
    try {
      progNotes = typeof o.progress_notes === 'string' ? JSON.parse(o.progress_notes) : (o.progress_notes || []);
    } catch {
      progNotes = [];
    }
    return {
      id: o.id,
      nomor_nota: o.nomor_nota,
      nama_pelanggan: o.nama_pelanggan,
      no_wa: o.no_wa,
      tanggal_order: o.tanggal_order ? new Date(o.tanggal_order).toISOString() : new Date().toISOString(),
      tanggal_ambil: o.tanggal_ambil ? new Date(o.tanggal_ambil).toISOString() : "",
      status: o.status,
      metode_bayar: o.metode_bayar,
      status_bayar: o.status_bayar,
      jumlah_dp: Number(o.jumlah_dp || 0),
      catatan: o.catatan || "",
      subtotal: Number(o.subtotal || 0),
      diskon: Number(o.diskon || 0),
      total: Number(o.total || 0),
      created_by: o.created_by || "Admin",
      share_token: o.share_token || null,
      share_expires_at: o.share_expires_at ? new Date(o.share_expires_at).toISOString() : null,
      progress_notes: progNotes,
      created_at: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
      updated_at: o.updated_at ? new Date(o.updated_at).toISOString() : new Date().toISOString(),
      items: itemsByOrder[o.id] || [],
    };
  });

  // Sync memory cache
  memoryDb.orders = formattedOrders.map(({ items, ...rest }) => rest);
  memoryDb.orderItems = items.map((it: any) => ({
    id: it.id,
    order_id: it.order_id,
    product_id: it.product_id,
    nama_item: it.nama_item,
    qty: Number(it.qty),
    satuan: it.satuan || 'pcs',
    harga_satuan: Number(it.harga_satuan),
    subtotal: Number(it.subtotal),
    catatan_item: it.catatan_item || '',
    panjang: it.panjang !== null ? Number(it.panjang) : null,
    lebar: it.lebar !== null ? Number(it.lebar) : null,
    dimensi_unit: it.dimensi_unit || 'm',
    jumlah_lembar: it.jumlah_lembar ? Number(it.jumlah_lembar) : 1,
    hitung_dimensi: Boolean(it.hitung_dimensi),
  }));

  let results = formattedOrders;
  if (filters?.status && filters.status !== "all") results = results.filter((o) => o.status === filters.status);
  if (filters?.status_bayar && filters.status_bayar !== "all") results = results.filter((o) => o.status_bayar === filters.status_bayar);
  if (filters?.startDate) results = results.filter((o) => new Date(o.tanggal_order) >= new Date(filters.startDate!));
  if (filters?.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    results = results.filter((o) => new Date(o.tanggal_order) <= end);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (o) =>
        o.nomor_nota.toLowerCase().includes(q) ||
        o.nama_pelanggan.toLowerCase().includes(q) ||
        o.no_wa.includes(q)
    );
  }

  return results;
}

export async function fetchSingleOrderFromNeon(idOrNota: string | number) {
  const sql = getNeonSql();
  if (!sql) {
    const id = Number(idOrNota);
    const order = memoryDb.orders.find((o) => o.id === id || o.nomor_nota === String(idOrNota));
    if (!order) return null;
    return {
      ...order,
      items: memoryDb.orderItems.filter((i) => i.order_id === order.id),
    };
  }

  let rows;
  if (!isNaN(Number(idOrNota))) {
    rows = await sql`SELECT * FROM orders WHERE id = ${Number(idOrNota)} OR nomor_nota = ${String(idOrNota)} LIMIT 1`;
  } else {
    rows = await sql`SELECT * FROM orders WHERE nomor_nota = ${String(idOrNota)} LIMIT 1`;
  }

  if (rows.length === 0) return null;
  const o = rows[0];
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${o.id} ORDER BY id ASC`;
  
  let progNotes = [];
  try {
    progNotes = typeof o.progress_notes === 'string' ? JSON.parse(o.progress_notes) : (o.progress_notes || []);
  } catch {
    progNotes = [];
  }

  return {
    id: o.id,
    nomor_nota: o.nomor_nota,
    nama_pelanggan: o.nama_pelanggan,
    no_wa: o.no_wa,
    tanggal_order: o.tanggal_order ? new Date(o.tanggal_order).toISOString() : new Date().toISOString(),
    tanggal_ambil: o.tanggal_ambil ? new Date(o.tanggal_ambil).toISOString() : "",
    status: o.status,
    metode_bayar: o.metode_bayar,
    status_bayar: o.status_bayar,
    jumlah_dp: Number(o.jumlah_dp || 0),
    catatan: o.catatan || "",
    subtotal: Number(o.subtotal || 0),
    diskon: Number(o.diskon || 0),
    total: Number(o.total || 0),
    created_by: o.created_by || "Admin",
    share_token: o.share_token || null,
    share_expires_at: o.share_expires_at ? new Date(o.share_expires_at).toISOString() : null,
    progress_notes: progNotes,
    created_at: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
    updated_at: o.updated_at ? new Date(o.updated_at).toISOString() : new Date().toISOString(),
    items: items.map((it: any) => ({
      id: it.id,
      order_id: it.order_id,
      product_id: it.product_id,
      nama_item: it.nama_item,
      qty: Number(it.qty),
      satuan: it.satuan || 'pcs',
      harga_satuan: Number(it.harga_satuan),
      subtotal: Number(it.subtotal),
      catatan_item: it.catatan_item || '',
      panjang: it.panjang !== null ? Number(it.panjang) : null,
      lebar: it.lebar !== null ? Number(it.lebar) : null,
      dimensi_unit: it.dimensi_unit || 'm',
      jumlah_lembar: it.jumlah_lembar ? Number(it.jumlah_lembar) : 1,
      hitung_dimensi: Boolean(it.hitung_dimensi),
    })),
  };
}

export async function fetchProductsFromNeon(filters?: {
  kategori?: string;
  search?: string;
  activeOnly?: boolean;
}) {
  const sql = getNeonSql();
  if (!sql) return memoryDb.products;

  const rows = await sql`SELECT * FROM products ORDER BY id ASC`;
  const formatted = rows.map((p: any) => {
    let images: string[] = [];
    try {
      images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
    } catch {
      images = p.gambar_url ? [p.gambar_url] : [];
    }
    return {
      id: p.id,
      kategori: p.kategori,
      nama_item: p.nama_item,
      deskripsi: p.deskripsi || "",
      satuan: p.satuan || "pcs",
      harga: Number(p.harga),
      harga_minimum_qty: Number(p.harga_minimum_qty || 1),
      gambar_url: p.gambar_url || (images.length > 0 ? images[0] : ""),
      images: Array.isArray(images) ? images : [],
      is_active: Boolean(p.is_active),
      tampilkan_harga_publik: p.tampilkan_harga_publik !== false,
      created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      updated_at: p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString(),
    };
  });

  memoryDb.products = formatted;

  let results = formatted;
  if (filters?.activeOnly) {
    results = results.filter((p) => p.is_active);
  }
  if (filters?.kategori && filters.kategori !== "all") {
    results = results.filter((p) => p.kategori.toLowerCase() === filters.kategori!.toLowerCase());
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (p) =>
        p.nama_item.toLowerCase().includes(q) ||
        p.deskripsi.toLowerCase().includes(q) ||
        p.kategori.toLowerCase().includes(q)
    );
  }
  return results;
}

export async function fetchVendorsFromNeon(filters?: { search?: string; kategori?: string }) {
  const sql = getNeonSql();
  if (!sql) return memoryDb.vendors;

  const vendors = await sql`SELECT * FROM vendors ORDER BY id ASC`;
  let purchases: any[] = [];
  try {
    purchases = await sql`SELECT vendor_id, total FROM purchase_history`;
  } catch {}

  const totalSpentByVendor: Record<number, number> = {};
  const purchaseCountByVendor: Record<number, number> = {};

  for (const pur of purchases) {
    const vId = pur.vendor_id;
    totalSpentByVendor[vId] = (totalSpentByVendor[vId] || 0) + Number(pur.total || 0);
    purchaseCountByVendor[vId] = (purchaseCountByVendor[vId] || 0) + 1;
  }

  const formatted = vendors.map((v: any) => ({
    id: v.id,
    nama_vendor: v.nama_vendor,
    kategori_supply: v.kategori_supply || "Lainnya",
    kontak: v.kontak || "",
    kontak_nama: v.kontak_nama || "",
    no_wa: v.no_wa || "",
    link: v.link || "",
    alamat: v.alamat || "",
    catatan: v.catatan || "",
    is_active: v.is_active !== false,
    created_at: v.created_at ? new Date(v.created_at).toISOString() : new Date().toISOString(),
    updated_at: v.updated_at ? new Date(v.updated_at).toISOString() : new Date().toISOString(),
    totalSpent: totalSpentByVendor[v.id] || 0,
    totalPurchases: purchaseCountByVendor[v.id] || 0,
  }));

  memoryDb.vendors = formatted;

  let results = formatted;
  if (filters?.kategori && filters.kategori !== "all") {
    results = results.filter((v) => v.kategori_supply.toLowerCase() === filters.kategori!.toLowerCase());
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (v) =>
        v.nama_vendor.toLowerCase().includes(q) ||
        v.kontak_nama.toLowerCase().includes(q) ||
        v.no_wa.includes(q) ||
        v.catatan.toLowerCase().includes(q)
    );
  }
  return results;
}

export async function fetchTransactionsFromNeon(filters?: {
  startDate?: string;
  endDate?: string;
  kantong?: string;
  tipe?: string;
}) {
  const sql = getNeonSql();
  if (!sql) return memoryDb.transactions || [];

  const rows = await sql`SELECT * FROM transactions ORDER BY tanggal DESC, id DESC`;
  const formatted = rows.map((t: any) => {
    let items = undefined;
    if (t.items) {
      try {
        items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items;
      } catch {
        items = undefined;
      }
    }
    return {
      id: t.id,
      tipe: t.tipe as "masuk" | "keluar",
      kategori: t.kategori,
      kantong: t.kantong || "margin",
      nominal: Number(t.nominal),
      tanggal: t.tanggal ? new Date(t.tanggal).toISOString() : new Date().toISOString(),
      metode_pembayaran: t.metode_pembayaran || "Cash",
      keterangan: t.keterangan || "",
      referensi: t.referensi || null,
      items,
      created_by: t.created_by || "admin",
      created_at: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
      updated_at: t.updated_at ? new Date(t.updated_at).toISOString() : new Date().toISOString(),
    };
  });

  memoryDb.transactions = formatted;

  let results = formatted;
  if (filters?.startDate) {
    results = results.filter((t) => new Date(t.tanggal) >= new Date(filters.startDate!));
  }
  if (filters?.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    results = results.filter((t) => new Date(t.tanggal) <= end);
  }
  if (filters?.kantong && filters.kantong !== "all") {
    results = results.filter((t) => t.kantong === filters.kantong);
  }
  if (filters?.tipe && filters.tipe !== "all") {
    results = results.filter((t) => t.tipe === filters.tipe);
  }
  return results;
}

export async function fetchSavingsTargetsFromNeon() {
  const sql = getNeonSql();
  if (!sql) return memoryDb.savingsTargets || [];

  const rows = await sql`SELECT * FROM savings_targets ORDER BY id ASC`;
  const formatted = rows.map((s: any) => ({
    id: s.id,
    tipe: s.tipe || "tabungan",
    nama: s.nama,
    target_nominal: Number(s.target_nominal || 0),
    terkumpul_nominal: Number(s.terkumpul_nominal || 0),
    sumber_kantong_default: s.sumber_kantong_default || "margin",
    jatuh_tempo: s.jatuh_tempo || "",
    cicilan_per_bulan: Number(s.cicilan_per_bulan || 0),
    catatan: s.catatan || "",
    status: s.status || "aktif",
    created_at: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
    updated_at: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString(),
  }));

  memoryDb.savingsTargets = formatted;
  return formatted;
}

export async function fetchPurchasesFromNeon(vendorId?: number) {
  const sql = getNeonSql();
  if (!sql) return memoryDb.purchaseHistory || [];

  const rows = await sql`
    SELECT ph.*, v.nama_vendor 
    FROM purchase_history ph 
    LEFT JOIN vendors v ON ph.vendor_id = v.id 
    ORDER BY ph.tanggal DESC, ph.id DESC
  `;
  const formatted = rows.map((p: any) => ({
    id: p.id,
    vendor_id: p.vendor_id,
    vendor_nama: p.nama_vendor || "Vendor Tidak Dikenal",
    tanggal: p.tanggal ? new Date(p.tanggal).toISOString() : new Date().toISOString(),
    nama_barang: p.nama_barang,
    qty: Number(p.qty || 1),
    satuan: p.satuan || "pcs",
    harga_satuan: Number(p.harga_satuan || 0),
    total: Number(p.total || 0),
    catatan: p.catatan || "",
    created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
  }));

  memoryDb.purchaseHistory = formatted;

  if (vendorId) {
    return formatted.filter((p) => p.vendor_id === vendorId);
  }
  return formatted;
}

export async function fetchGuidesFromNeon(category?: string) {
  const sql = getNeonSql();
  if (!sql) {
    const list = category && category !== "all" 
      ? memoryDb.guides.filter((g) => g.category === category)
      : memoryDb.guides;
    const cats = Array.from(new Set(memoryDb.guides.map((g) => g.category)));
    return { guides: list, categories: cats };
  }

  const rows = await sql`SELECT * FROM guides ORDER BY id ASC`;
  const formatted = rows.map((g: any) => ({
    id: g.id,
    category: g.category || "Template Chat",
    title: g.title,
    content: g.content,
    created_at: g.created_at ? new Date(g.created_at).toISOString() : new Date().toISOString(),
    updated_at: g.updated_at ? new Date(g.updated_at).toISOString() : new Date().toISOString(),
  }));

  memoryDb.guides = formatted;
  const cats = Array.from(new Set(formatted.map((g) => g.category)));
  const list = category && category !== "all" ? formatted.filter((g) => g.category === category) : formatted;
  return { guides: list, categories: cats };
}

export async function fetchDashboardStatsFromNeon() {
  const sql = getNeonSql();
  if (!sql) return null;

  const orders = await sql`SELECT * FROM orders ORDER BY id DESC`;
  const items = await sql`SELECT * FROM order_items`;
  const products = await sql`SELECT id, kategori FROM products`;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthOrders = orders.filter((o: any) => {
    const d = new Date(o.tanggal_order);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalOmzetBulanIni = thisMonthOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
  const totalOrderBulanIni = thisMonthOrders.length;
  const orderPending = orders.filter((o: any) => o.status === "pending").length;
  const orderProses = orders.filter((o: any) => o.status === "proses").length;
  const orderSelesai = orders.filter((o: any) => o.status === "selesai").length;

  const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const deadlineApproachingOrders = orders.filter((o: any) => {
    if (o.status === "selesai" || o.status === "dibatalkan" || !o.tanggal_ambil) return false;
    const deadline = new Date(o.tanggal_ambil);
    return deadline <= next48h;
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const revenueTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const label = `${monthNames[m]} ${y}`;

    const monthOrders = orders.filter((o: any) => {
      const od = new Date(o.tanggal_order);
      return od.getMonth() === m && od.getFullYear() === y && o.status !== "dibatalkan";
    });

    const omzet = monthOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const orderCount = monthOrders.length;
    revenueTrend.push({ bulan: label, omzet, orderCount });
  }

  const prodCatMap: Record<number, string> = {};
  for (const p of products) {
    prodCatMap[p.id] = p.kategori;
  }

  const categoryCount: Record<string, number> = {
    stiker: 0,
    dtf: 0,
    banner: 0,
    jersey: 0,
    desain: 0,
    lainnya: 0,
  };

  for (const it of items) {
    const cat = (it.product_id && prodCatMap[it.product_id]) ? prodCatMap[it.product_id].toLowerCase() : "lainnya";
    categoryCount[cat] = (categoryCount[cat] || 0) + Number(it.qty || 1);
  }

  const categoryDistribution = Object.keys(categoryCount).map((k) => ({
    name: k.toUpperCase(),
    value: categoryCount[k],
  }));

  const recentOrders = orders.slice(0, 5).map((o: any) => ({
    id: o.id,
    nomor_nota: o.nomor_nota,
    nama_pelanggan: o.nama_pelanggan,
    status: o.status,
    status_bayar: o.status_bayar,
    total: Number(o.total || 0),
    tanggal_order: o.tanggal_order ? new Date(o.tanggal_order).toISOString() : new Date().toISOString(),
  }));

  return {
    totalOmzetBulanIni,
    totalOrderBulanIni,
    orderPending,
    orderProses,
    orderSelesai,
    deadlineApproachingCount: deadlineApproachingOrders.length,
    deadlineApproachingOrders,
    revenueTrend,
    categoryDistribution,
    recentOrders,
  };
}

export async function forceFullSync() {
  const initRes = await initNeonTables();
  const status = await getDatabaseStatus();
  return {
    ...initRes,
    status,
  };
}

