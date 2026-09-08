import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";
import bcrypt from "bcryptjs";

export function getCleanDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const clean = raw.trim().replace(/^["']|["']$/g, "").trim();
  return clean || undefined;
}

export let db: any = null;
export let isNeonConnected = false;

export function connectNeonDatabase(): boolean {
  const databaseUrl = getCleanDatabaseUrl();
  if (databaseUrl && databaseUrl.includes("postgres") && !databaseUrl.includes("sample")) {
    try {
      const sql = neon(databaseUrl);
      db = drizzle(sql, { schema });
      isNeonConnected = true;
      console.log("Connected to Neon PostgreSQL database");
      return true;
    } catch (err) {
      console.warn("Could not connect to Neon PostgreSQL, falling back to storage provider:", err);
      isNeonConnected = false;
      return false;
    }
  }
  isNeonConnected = false;
  return false;
}

// Initial connection attempt
connectNeonDatabase();

// In-Memory resilient repository for fast local preview & fallback
export interface MemoryStore {
  adminUsers: Array<any>;
  products: Array<any>;
  orders: Array<any>;
  orderItems: Array<any>;
  vendors: Array<any>;
  product_vendors: Array<any>;
  purchaseHistory: Array<any>;
  categories: Array<any>;
  transactions: Array<any>;
  activityLogs: Array<any>;
  guides: Array<any>;
  storeSettings: any;
  savingsTargets: Array<any>;
}

const defaultAdminPasswordHash = bcrypt.hashSync("admin123", 10);

export const memoryDb: MemoryStore = {
  adminUsers: [
    {
      id: 1,
      username: "admin",
      password_hash: defaultAdminPasswordHash,
      nama: "Jeres Owner",
      role: "owner",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      username: "staff",
      password_hash: defaultAdminPasswordHash,
      nama: "Rian Kasir",
      role: "staff",
      created_at: new Date().toISOString(),
    }
  ],
  products: [
    {
      id: 1,
      kategori: "stiker",
      nama_item: "Stiker Vinyl Glossy / Matte (Meteran)",
      deskripsi: "Cetak stiker bahan vinyl waterproof, tahan cuaca outdoor, sudah termasuk cutting kiss cut / die cut.",
      satuan: "meter",
      harga: 85000,
      harga_minimum_qty: 1,
      gambar_url: "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      ],
      is_active: true,
      tampilkan_harga_publik: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      kategori: "stiker",
      nama_item: "Stiker Hologram Custom / Die Cut",
      deskripsi: "Stiker efek kilau pelangi hologram premium, daya rekat kuat untuk helm, tumbler, laptop.",
      satuan: "lembar",
      harga: 18000,
      harga_minimum_qty: 5,
      gambar_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80",
      ],
      is_active: true,
      tampilkan_harga_publik: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      kategori: "dtf",
      nama_item: "Cetak DTF Sablon Kaos (Meteran 58cm)",
      deskripsi: "Direct to Film transfer film siap press ke kaos, hoodie, totebag. Warna pekat, lentur, tahan cuci.",
      satuan: "meter",
      harga: 65000,
      harga_minimum_qty: 1,
      gambar_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80",
      ],
      is_active: true,
      tampilkan_harga_publik: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 4,
      kategori: "dtf",
      nama_item: "DTF Ukuran A3 Siap Press (Kaos Custom)",
      deskripsi: "Paket DTF ukuran cetak 28x40cm, warna full color CMYK + White, hasil halus tajam.",
      satuan: "lembar",
      harga: 25000,
      harga_minimum_qty: 2,
      gambar_url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
      ],
      is_active: true,
      tampilkan_harga_publik: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 5,
      kategori: "banner",
      nama_item: "Banner Flexi 280gr Outdoor (Spanduk)",
      deskripsi: "Spanduk promosi standar outdoor warna cerah, sudah termasuk mata ayam tiap sudut.",
      satuan: "meter",
      harga: 25000,
      harga_minimum_qty: 1,
      gambar_url: "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80",
      ],
      is_active: true,
      tampilkan_harga_publik: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 6,
      kategori: "banner",
      nama_item: "X-Banner / Y-Banner Lengkap Rangka (60x160cm)",
      deskripsi: "Cetak bahan Albatros / Flexi tebal anti keriting dengan standing tripod kokoh siap display.",
      satuan: "pcs",
      harga: 85000,
      harga_minimum_qty: 1,
      gambar_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop&q=80",
      ],
      is_active: true,
      tampilkan_harga_publik: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 7,
      kategori: "jersey",
      nama_item: "Jersey Full Printing Sublim (Milano/Dryfit)",
      deskripsi: "Jersey futsal/sepeda/esport full sublim warna bebas, bahan adem menyerap keringat, custom nama & nomor.",
      satuan: "pcs",
      harga: 120000,
      harga_minimum_qty: 6,
      gambar_url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80",
      ],
      is_active: true,
      tampilkan_harga_publik: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 8,
      kategori: "desain",
      nama_item: "Jasa Desain Grafis / Setting Cetak",
      deskripsi: "Pembuatan konsep desain logo, banner, kemasan, atau layout cetak hingga ACC siap produksi.",
      satuan: "paket",
      harga: 50000,
      harga_minimum_qty: 1,
      gambar_url: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=80",
      ],
      is_active: true,
      tampilkan_harga_publik: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 9,
      kategori: "lainnya",
      nama_item: "Nota 2 Ply / Carbonless Custom (Ukuran 1/4 Folio)",
      deskripsi: "Buku nota NCR 2 rangkap 50 set per buku, nomorator + perforasi rapi.",
      satuan: "lusin",
      harga: 145000,
      harga_minimum_qty: 1,
      gambar_url: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80",
      ],
      is_active: true,
      tampilkan_harga_publik: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ],
  orders: [],
  orderItems: [],
  vendors: [
    {
      id: 1,
      nama_vendor: "CV Mitra Sticker Mandiri",
      kategori_supply: "Bahan Stiker",
      kontak: "081122334455",
      kontak_nama: "Pak Hendra",
      no_wa: "081122334455",
      link: "https://mitrasticker.com/katalog",
      alamat: "Kawasan Industri Pergudangan Blok C4, Surabaya",
      catatan: "Supplier bahan Ritrama, Maxdecal, Camel. Tempo 14 hari.",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      nama_vendor: "Indo DTF Film & Ink Supply",
      kategori_supply: "Bahan DTF",
      kontak: "081299887766",
      kontak_nama: "Ko William",
      no_wa: "081299887766",
      link: "https://tokopedia.com/indodtf-official",
      alamat: "Ruko Daan Mogot Permai No. 12, Jakarta Barat",
      catatan: "PET Film Premium Single Matte & Tinta CMYK DuPont.",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      nama_vendor: "Pabrik Spanduk & Flexi Cemerlang",
      kategori_supply: "Bahan Banner",
      kontak: "085677889900",
      kontak_nama: "Ibu Diana",
      no_wa: "085677889900",
      link: "https://shopee.co.id/pabrikflexisby",
      alamat: "Jl. Industri Raya No. 88, Sidoarjo",
      catatan: "Roll Flexi 280gr, 340gr, Korcin, X-Banner Stand.",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ],
  product_vendors: [
    {
      id: 1,
      product_id: 1, // Stiker Vinyl (Harga: 85.000)
      vendor_id: 1, // CV Mitra Sticker Mandiri
      harga_modal: 45000,
      is_default: true,
      catatan: "Bahan Ritrama + tinta Eco, min order 1m",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      product_id: 1, // Stiker Vinyl
      vendor_id: 2, // Indo DTF
      harga_modal: 50000,
      is_default: false,
      catatan: "Vendor cadangan jika over kapasitas",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      product_id: 2, // Stiker Hologram (Harga: 18.000)
      vendor_id: 1, // CV Mitra Sticker
      harga_modal: 9000,
      is_default: true,
      catatan: "Bahan hologram rainbow grade A",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 4,
      product_id: 3, // DTF Sablon Kaos (Harga: 65.000)
      vendor_id: 2, // Indo DTF
      harga_modal: 35000,
      is_default: true,
      catatan: "PET Film 58cm + powder impor, proses 1 hari",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 5,
      product_id: 4, // DTF Ukuran A3 (Harga: 25.000)
      vendor_id: 2, // Indo DTF
      harga_modal: 14000,
      is_default: true,
      catatan: "A3 lembaran siap press",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 6,
      product_id: 5, // Banner Flexi 280gr (Harga: 25.000)
      vendor_id: 3, // Pabrik Spanduk & Flexi
      harga_modal: 15000,
      is_default: true,
      catatan: "Flexi China 280gr finishing mata ayam keliling",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 7,
      product_id: 5, // Banner Flexi 280gr (Harga: 25.000)
      vendor_id: 1, // CV Mitra
      harga_modal: 17000,
      is_default: false,
      catatan: "Vendor opsi kedua untuk order kilat same-day",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ],
  purchaseHistory: [],
  categories: [
    { id: 1, name: "Pemasukan Toko", type: "masuk", created_at: new Date().toISOString() },
    { id: 2, name: "Pemasukan Pribadi", type: "masuk", created_at: new Date().toISOString() },
    { id: 3, name: "Kulakan Bahan Baku", type: "keluar", created_at: new Date().toISOString() },
    { id: 4, name: "Beli Mesin & Alat", type: "keluar", created_at: new Date().toISOString() },
    { id: 5, name: "Operasional Toko", type: "keluar", created_at: new Date().toISOString() },
    { id: 6, name: "Pengeluaran Pribadi / Prive", type: "keluar", created_at: new Date().toISOString() },
  ],
  transactions: [],
  activityLogs: [],
  guides: [
    {
      id: 1,
      category: "Template Chat",
      title: "Sapaan Awal & Tanya Kebutuhan Cetak",
      content: `Halo kak! Terima kasih telah menghubungi *Jeres Studio* 🖨️✨\n\nAda yang bisa kami bantu hari ini? Mau cetak stiker, sablon DTF kaos, banner spanduk, jersey, atau kebutuhan lainnya?\n\nSilakan kirimkan file desain / detail ukurannya ya kak agar bisa kami bantu hitungkan estimasi harga & waktu pengerjaannya 🙏`,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      category: "Template Chat",
      title: "Format Order & Pengiriman Desain",
      content: `Mohon mengisi data pemesanan berikut ya kak:\n\n*Nama Pemesan:* \n*No. HP/WA:* \n*Jenis Produk:* (Stiker / DTF / Banner / Jersey / dll)\n*Ukuran Cetak & Jumlah Qty:* \n*Bahan / Finishing:* (Glossy / Doff / Mata Ayam / Cutting Kiss Cut / dll)\n*Tanggal Dibutuhkan (Deadline):* \n\n📁 *Pengiriman File Desain:*\nKirimkan file siap cetak format PDF/CDR/AI/TIFF/PNG resolusi tinggi ke email kami: *jeresstudio134@gmail.com* dengan subjek nama pemesan.`,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      category: "Template Chat",
      title: "Tagihan Pembayaran & Rekening Transfer (DP/Lunas)",
      content: `Halo Kak [Nama Pelanggan],\n\nBerikut rincian tagihan pesanan *[Nomor Nota]*:\nTotal: *Rp [Total]*\nDP Minimal (50%): *Rp [Nominal DP]*\n\n💳 *Pembayaran dapat ditransfer ke:*\n- *BCA:* 123-456-7890 (a/n Jeres Studio)\n- *Mandiri:* 987-654-3210 (a/n Jeres Studio)\n- *QRIS:* Scan barcode yang kami lampirkan\n\nSetelah transfer, mohon kirimkan bukti pembayarannya di sini agar pesanan dapat segera masuk antrean produksi. Terima kasih! 🙏`,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 4,
      category: "Template Chat",
      title: "Pemberitahuan Pesanan Selesai Siap Diambil",
      content: `Kabar gembira Kak! 🎉\nPesanan Kakak dengan nomor nota *[Nomor Nota]* sudah *SELESAI* dicetak dan melewati tahap Quality Control.\n\n📍 *Lokasi Pengambilan:*\n*Jeres Studio* - Jl. Percetakan Raya No. 134\nJam Operasional: Senin - Sabtu (08.00 - 21.00 WIB)\n\nBagi yang menggunakan layanan kurir / Gosend, silakan konfirmasi sebelum driver meluncur ya kak. Terima kasih telah mempercayakan cetakan di Jeres Studio! 🙌`,
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 5,
      category: "SOP/Alur Kerja",
      title: "SOP Penerimaan File & Validasi Desain Siap Cetak",
      content: `1. **Format File**: Pastikan file diterima dalam format vektor (CDR, AI, PDF) atau bitmap resolusi minimal 300 DPI (TIFF, PNG transparan).\n2. **Color Mode**: Wajib menggunakan mode warna CMYK (bukan RGB) untuk menghindari pergeseran warna saat naik cetak.\n3. **Bleed & Margin**: Berikan bleed minimal 2-3 mm keliling untuk stiker cutting dan 5 cm lipatan keliling untuk spanduk/banner.\n4. **Font Outline / Convert to Curves**: Pastikan semua teks sudah di-convert to curve agar font tidak berubah/missing saat dibuka di komputer operator.\n5. **Proofing Pelanggan**: Kirimkan visual preview (mockup/JPEG) dan minta konfirmasi ACC tertulis dari pelanggan sebelum dicetak massal.`,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 6,
      category: "SOP/Alur Kerja",
      title: "SOP Pengoperasian & Perawatan Mesin Harian",
      content: `1. **Cek Suhu & Kelembaban Ruangan**: Pastikan ruangan workshop ber-AC pada suhu 20-25°C dengan kelembaban 45-60%.\n2. **Pembersihan Head (Pagi Hari)**:\n   - Jalankan head cleaning ringan dan lakukan nozle check.\n   - Bersihkan sisa tinta di wiper blade dan caping station menggunakan cleaning fluid khusus.\n3. **Cek Ketersediaan Bahan & Tinta**: Periksa level tabung tinta DTF/Eco-Solvent sebelum memulai antrean cetak panjang.\n4. **Shutdown Sore Hari**:\n   - Berikan tetesan head cleaner pada caping pad.\n   - Matikan mesin sesuai prosedur standar dan matikan saklar stabilizer.`,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 7,
      category: "SOP/Alur Kerja",
      title: "SOP Quality Control & Packing Pesanan",
      content: `1. **Cek Kuantitas & Ukuran**: Hitung ulang jumlah barang jadi sesuai yang tertera pada nota invoice.\n2. **Inspeksi Hasil Cetak**: Periksa apakah ada noda tinta, garis putih (banding), warna pudar, atau kesalahan cutting.\n3. **Finishing**: Pastikan mata ayam terpasang rapi, sisa cutting terkupas bersih, atau laminasi tidak ada gelembung udara.\n4. **Pengemasan (Packing)**:\n   - Stiker/DTF: Gulung dengan bubble wrap tebal atau masukkan ke plastik seal kedap air.\n   - Banner/Spanduk: Lipat atau gulung rapi dan tempelkan label nomor nota di luar kemasan.\n5. **Update Status Sistem**: Ubah status order di panel admin menjadi "Selesai" dan informasikan ke pelanggan.`,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ],
  storeSettings: {
    id: 1,
    nama_toko: "Jeres Studio",
    slogan: "Percetakan Digital, Stiker, DTF & Sablon Jersey Berkualitas",
    alamat: "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif",
    no_wa: "6281234567890",
    email: "jeresstudio134@gmail.com",
    logo_url: "",
    rekening_bank: "BCA: 123-456-7890 (a/n Jeres Studio)\nMandiri: 987-654-3210 (a/n Jeres Studio)\nQRIS: Semua E-Wallet & M-Banking",
    catatan_nota: "1. Barang yang sudah dicetak sesuai ACC proofing tidak dapat dibatalkan/diretur.\n2. Pelunasan wajib dilakukan saat serah terima barang.\n3. File master dan backup disimpan sistem selama 30 hari kalender.",
    margin_threshold_good: "20",
    margin_threshold_warning: "10",
    updated_at: new Date().toISOString(),
  },
  savingsTargets: []
};
