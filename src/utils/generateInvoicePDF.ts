import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Order, StoreSettings } from "../types/index.js";
import { formatRupiah, formatTanggal, terbilang } from "../lib/utils.js";
import { api } from "../lib/api.js";

export type PaperFormat = "A4" | "A5" | "thermal58" | "thermal80";

const STORAGE_KEY_PAPER = "jeres_print_paper_layout";

/**
 * Mendapatkan preferensi layout kertas dari localStorage (default: A4)
 */
export function getUserPaperPreference(): PaperFormat {
  if (typeof window === "undefined") return "A4";
  const saved = localStorage.getItem(STORAGE_KEY_PAPER) as PaperFormat;
  if (saved && ["A4", "A5", "thermal58", "thermal80"].includes(saved)) {
    return saved;
  }
  return "A4";
}

/**
 * Menyimpan preferensi layout kertas pengguna ke localStorage
 */
export function setUserPaperPreference(format: PaperFormat): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_PAPER, format);
  }
}

export interface InvoicePdfOptions {
  action?: "open" | "download" | "print" | "blob";
  filename?: string;
  paperFormat?: PaperFormat;
  targetWindow?: Window | null;
}

export interface InvoicePdfResult {
  doc: jsPDF;
  blob: Blob;
  blobUrl: string;
  filename: string;
}

/**
 * Buat tab baru secara sinkron saat klik tombol untuk mencegah pop-up blocker browser
 */
export function createPrintTab(title: string = "Memuat Dokumen..."): Window | null {
  if (typeof window === "undefined") return null;
  try {
    const printTab = window.open("", "_blank");
    if (printTab && printTab.document) {
      printTab.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0f172a;
      color: #f8fafc;
    }
    .card {
      text-align: center;
      padding: 32px 36px;
      background: #1e293b;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.08);
      max-width: 90%;
      width: 360px;
    }
    .spinner {
      width: 42px;
      height: 42px;
      border: 3.5px solid rgba(255,255,255,0.15);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 18px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h3 { margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #ffffff; }
    p { margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h3>Membuka Dokumen...</h3>
    <p>Mohon tunggu sebentar, dokumen PDF sedang disiapkan dan akan segera tampil di browser.</p>
  </div>
</body>
</html>`);
      printTab.document.close();
    }
    return printTab;
  } catch (e) {
    console.warn("Could not pre-open window:", e);
    return null;
  }
}

/**
 * Dapatkan URL shareable invoice yang dapat dibuka oleh pelanggan
 */
export function getPublicInvoiceUrl(order: Order): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const identifier = order.nomor_nota || order.id;
  return `${origin}/?track=${encodeURIComponent(identifier)}`;
}

/**
 * Safe PDF Output Handler: Membuka PDF di browser PDF Viewer tanpa paksa download
 */
export function safeHandlePdfOutput(
  doc: jsPDF,
  pdfBlob: Blob,
  blobUrl: string,
  filename: string,
  action: "download" | "open" | "print" | "blob" = "open",
  targetWindow?: Window | null
): void {
  if (typeof window === "undefined") return;
  if (action === "blob") return;

  if (action === "download") {
    doc.save(filename);
    return;
  }

  // Action: "open" atau "print" -> Langsung buka di tab PDF viewer browser
  if (targetWindow && !targetWindow.closed) {
    try {
      if (filename) {
        const cleanTitle = filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
        targetWindow.document.title = cleanTitle;
      }
      targetWindow.location.href = blobUrl;
      return;
    } catch (err) {
      console.warn("Gagal mengarahkan targetWindow:", err);
    }
  }

  try {
    const newWindow = window.open(blobUrl, "_blank");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      // Fallback anchor tag click dengan target _blank
      const a = document.createElement("a");
      a.href = blobUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 300);
    }
  } catch {
    doc.save(filename);
  }
}

/**
 * Format nomor WhatsApp ke format internasional (misal: 0812... -> 62812...)
 */
export function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("+62")) {
    cleaned = "62" + cleaned.slice(3);
  } else if (!cleaned.startsWith("62") && cleaned.length > 5) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

/**
 * Generate template pesan tagihan WhatsApp / Email sesuai requirement
 */
export function generateBillingMessage(order: Order, settings?: StoreSettings | null): string {
  const storeName = settings?.nama_toko || "Jeres Studio";
  const storePhone = settings?.no_wa || "0812-3456-7890";
  const publicUrl = getPublicInvoiceUrl(order);

  // Buat daftar item ringkas: [qty]x [nama produk]
  const itemsText = (order.items && order.items.length > 0)
    ? order.items.map((it) => {
        const dimStr = it.panjang && it.lebar ? ` [Ukuran: ${it.panjang}${it.dimensi_unit || "m"}x${it.lebar}${it.dimensi_unit || "m"}${it.jumlah_lembar && it.jumlah_lembar > 1 ? ` (${it.jumlah_lembar} lbr)` : ""}]` : "";
        return `• ${it.qty} ${it.satuan || "pcs"} x ${it.nama_item}${dimStr}`;
      }).join("\n")
    : `• 1 pcs x Pesanan Cetak (${formatRupiah(order.total)})`;

  let paymentDetails = `Total: ${formatRupiah(order.total)}`;
  if (order.status_bayar === "lunas") {
    paymentDetails += ` *(LUNAS)*`;
  } else if (order.jumlah_dp > 0) {
    const sisa = Math.max(0, order.total - order.jumlah_dp);
    paymentDetails += `\nDP: ${formatRupiah(order.jumlah_dp)}\nSisa Tagihan: ${formatRupiah(sisa)}`;
  }

  return `Yth. ${order.nama_pelanggan || "Pelanggan"},
Berikut adalah Tagihan Penjualan ${order.nomor_nota} atas transaksi di ${storeName}.

${itemsText}
${paymentDetails}

Detail transaksi bisa dilihat di sini: ${publicUrl}
Informasi lebih lanjut bisa menghubungi nomor berikut ${storePhone}`;
}

/**
 * Generate link wa.me lengkap dengan teks ter-encode
 */
export function generateWhatsAppLink(order: Order, settings?: StoreSettings | null, targetPhone?: string): string {
  const phone = targetPhone || order.no_wa || settings?.no_wa || "";
  const cleanPhone = formatWhatsAppNumber(phone);
  const message = generateBillingMessage(order, settings);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Helper untuk memuat logo toko dari URL / dataUrl / SVG ke format PNG Base64 yang siap di-embed ke jsPDF
 */
async function loadLogoForPdf(
  logoUrl?: string | null
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof window === "undefined") return null;

  const targetUrl = (logoUrl && logoUrl.trim()) ? logoUrl.trim() : "/favicon.svg";

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const nw = img.naturalWidth || img.width || 120;
        const nh = img.naturalHeight || img.height || 120;
        const canvas = document.createElement("canvas");
        const targetW = Math.max(nw, 250);
        const targetH = Math.round(targetW * (nh / nw));
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL("image/png");
        resolve({
          dataUrl,
          width: targetW,
          height: targetH,
        });
      } catch (e) {
        console.warn("Gagal render logo ke canvas:", e);
        if (targetUrl !== "/favicon.svg") {
          loadLogoForPdf("/favicon.svg").then(resolve);
        } else {
          resolve(null);
        }
      }
    };

    img.onerror = () => {
      if (targetUrl !== "/favicon.svg") {
        loadLogoForPdf("/favicon.svg").then(resolve);
      } else {
        resolve(null);
      }
    };

    setTimeout(() => {
      if (targetUrl !== "/favicon.svg") {
        loadLogoForPdf("/favicon.svg").then(resolve);
      } else {
        resolve(null);
      }
    }, 2500);

    img.src = targetUrl;
  });
}

function formatDateDMY(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

// =========================================================================
// 1. GENERATE FAKTUR / INVOICE PDF (Kledo Accounting Layout: A4, A5, Thermal)
// =========================================================================
export async function generateInvoicePDF(
  order: Order,
  settings?: StoreSettings | null,
  options: InvoicePdfOptions = {}
): Promise<InvoicePdfResult> {
  const { action = "open" } = options;
  const paperFormat = options.paperFormat || getUserPaperPreference();

  // Pastikan data settings toko terisi
  let finalSettings = settings;
  if (!finalSettings) {
    try {
      const res = await api.getSettings();
      if (res?.settings) finalSettings = res.settings;
    } catch {
      // ignore
    }
  }

  // Muat data logo toko
  const logoData = await loadLogoForPdf(finalSettings?.logo_url);

  // Inisialisasi jsPDF berdasarkan format kertas
  let doc: jsPDF;
  let pageWidth = 210;
  let pageHeight = 297;
  let marginX = 14;
  let marginY = 14;

  if (paperFormat === "A4") {
    pageWidth = 210;
    pageHeight = 297;
    marginX = 14;
    marginY = 14;
    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  } else if (paperFormat === "thermal58") {
    pageWidth = 58;
    pageHeight = 200;
    marginX = 3;
    marginY = 5;
    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [58, 200], compress: true });
  } else if (paperFormat === "thermal80") {
    pageWidth = 80;
    pageHeight = 220;
    marginX = 4;
    marginY = 5;
    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 220], compress: true });
  } else {
    // Default A5
    pageWidth = 148;
    pageHeight = 210;
    marginX = 10;
    marginY = 10;
    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5", compress: true });
  }

  // Set Metadata PDF agar nama tab browser menjadi "Invoice [Nomor Nota]" seperti Kledo
  const invoiceDocTitle = `Invoice ${order.nomor_nota || ""}`.trim();
  doc.setProperties({
    title: invoiceDocTitle,
    subject: `Invoice Penjualan ${order.nomor_nota || ""}`.trim(),
    author: finalSettings?.nama_toko || "Jeres Studio",
    keywords: "invoice, faktur, nota, kledo",
    creator: finalSettings?.nama_toko || "Jeres Studio",
  });

  let currentY = marginY;

  // Data Toko
  const storeName = finalSettings?.nama_toko || "Jeres Studio";
  const storeAddress = finalSettings?.alamat || "Jl. Mampang Prapatan 19C, Jakarta Selatan 12790";
  const storePhone = finalSettings?.no_wa || "089685640976";
  const storeEmail = finalSettings?.email || "jeresstudio134@gmail.com";
  const storeBank = finalSettings?.rekening_bank || "BCA: 1234567890 a/n Jeres Studio";
  const storeNotes = finalSettings?.catatan_nota || "Barang yang sudah dicetak/diambil tidak dapat dikembalikan. Harap periksa sebelum meninggalkan toko.";

  const rightAlignX = pageWidth - marginX;

  // ================= THERMAL LAYOUT (58mm / 80mm) =================
  if (paperFormat.startsWith("thermal")) {
    const is80 = paperFormat === "thermal80";
    const center = pageWidth / 2;

    if (logoData) {
      const maxLogoW = is80 ? 16 : 13;
      const maxLogoH = is80 ? 12 : 10;
      const aspect = (logoData.width || 1) / (logoData.height || 1);
      let renderW = maxLogoW;
      let renderH = maxLogoH;
      if (aspect >= 1) {
        renderW = maxLogoW;
        renderH = maxLogoW / aspect;
      } else {
        renderH = maxLogoH;
        renderW = maxLogoH * aspect;
      }
      const logoX = center - (renderW / 2);
      try {
        doc.addImage(logoData.dataUrl, "PNG", logoX, currentY, renderW, renderH, undefined, "FAST");
        currentY += renderH + 2;
      } catch {
        // ignore
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(is80 ? 11 : 9.5);
    doc.setTextColor(20, 20, 20);
    doc.text(storeName, center, currentY, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(is80 ? 7 : 6);
    currentY += 4;
    doc.text(storeAddress, center, currentY, { align: "center" });
    currentY += 3.5;
    doc.text(`WA: ${storePhone}`, center, currentY, { align: "center" });

    currentY += 3;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(marginX, currentY, rightAlignX, currentY);
    doc.setLineDashPattern([], 0);

    currentY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(is80 ? 8 : 7);
    doc.text(`NOTA: ${order.nomor_nota}`, marginX, currentY);

    currentY += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(is80 ? 7 : 6);
    doc.text(`Tgl: ${formatTanggal(order.tanggal_order, true)}`, marginX, currentY);
    currentY += 3.5;
    doc.text(`Pelanggan: ${order.nama_pelanggan} (${order.no_wa})`, marginX, currentY);

    currentY += 3;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(marginX, currentY, rightAlignX, currentY);
    doc.setLineDashPattern([], 0);

    currentY += 4;
    const items = order.items && order.items.length > 0 ? order.items : [{ nama_item: "Cetak", qty: 1, satuan: "pcs", harga_satuan: order.total, subtotal: order.total }];

    items.forEach((it) => {
      doc.setFont("helvetica", "bold");
      doc.text(it.nama_item, marginX, currentY);
      currentY += 3.5;
      doc.setFont("helvetica", "normal");
      const leftQty = `${it.qty} x ${formatRupiah(it.harga_satuan)}`;
      doc.text(leftQty, marginX, currentY);
      doc.text(formatRupiah(it.subtotal), rightAlignX, currentY, { align: "right" });
      currentY += 4;
    });

    doc.setLineDashPattern([1, 1], 0);
    doc.line(marginX, currentY, rightAlignX, currentY);
    doc.setLineDashPattern([], 0);

    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(is80 ? 8 : 7);
    doc.text("Subtotal", marginX, currentY);
    doc.text(formatRupiah(order.subtotal || order.total), rightAlignX, currentY, { align: "right" });

    if (order.diskon > 0) {
      currentY += 3.5;
      doc.text("Diskon", marginX, currentY);
      doc.text(`-${formatRupiah(order.diskon)}`, rightAlignX, currentY, { align: "right" });
    }

    currentY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(is80 ? 9 : 8);
    doc.text("TOTAL", marginX, currentY);
    doc.text(formatRupiah(order.total), rightAlignX, currentY, { align: "right" });

    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(is80 ? 7 : 6);
    doc.text(`Status: ${order.status_bayar?.toUpperCase() || "BELUM"}`, marginX, currentY);

    if (order.jumlah_dp > 0 && order.status_bayar !== "lunas") {
      currentY += 3.5;
      doc.text(`DP: ${formatRupiah(order.jumlah_dp)}`, marginX, currentY);
      currentY += 3.5;
      doc.text(`Sisa: ${formatRupiah(Math.max(0, order.total - order.jumlah_dp))}`, marginX, currentY);
    }

    currentY += 6;
    doc.setFont("helvetica", "italic");
    doc.text("Terima kasih atas kunjungan Anda", center, currentY, { align: "center" });

    const sanitizedOrderNo = (order.nomor_nota || "INV").replace(/[^a-zA-Z0-9_-]/g, "-");
    const filename = options.filename || `Invoice-${sanitizedOrderNo}.pdf`;
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);

    safeHandlePdfOutput(doc, pdfBlob, blobUrl, filename, action, options.targetWindow);

    return { doc, blob: pdfBlob, blobUrl, filename };
  }

  // ================= KLEDO ACCOUNTING VECTOR LAYOUT (A4 & A5) =================
  const scale = paperFormat === "A4" ? 1.0 : 0.74;

  // 1. TOP HEADER: Logo Kiri & Info Invoice Kanan
  const logoMaxW = 50 * scale;
  const logoMaxH = 22 * scale;
  let logoBottomY = currentY;

  if (logoData) {
    const aspect = (logoData.width || 1) / (logoData.height || 1);
    let renderW = logoMaxW;
    let renderH = logoMaxW / aspect;

    if (renderH > logoMaxH) {
      renderH = logoMaxH;
      renderW = logoMaxH * aspect;
    }

    try {
      doc.addImage(
        logoData.dataUrl,
        "PNG",
        marginX,
        currentY,
        renderW,
        renderH,
        undefined,
        "FAST"
      );
      logoBottomY = currentY + renderH;
    } catch (err) {
      console.warn("Gagal render logo di invoice:", err);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16 * scale);
    doc.setTextColor(30, 41, 59);
    doc.text(storeName.toUpperCase(), marginX, currentY + (8 * scale));
    logoBottomY = currentY + (12 * scale);
  }

  // Header Kanan: Judul "Invoice" (Warna Biru Kledo)
  const metaLabelX = rightAlignX - (52 * scale);
  const metaValX = rightAlignX;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22 * scale);
  doc.setTextColor(30, 64, 175); // Kledo Royal Blue
  doc.text("Invoice", rightAlignX, currentY + (6 * scale), { align: "right" });

  let metaY = currentY + (12 * scale);
  doc.setFontSize(8.8 * scale);

  // Row 1: Nomor
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Nomor", metaLabelX, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(order.nomor_nota || "-", metaValX, metaY, { align: "right" });
  metaY += 4.5 * scale;

  // Row 2: Tanggal
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Tanggal", metaLabelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(formatDateDMY(order.tanggal_order), metaValX, metaY, { align: "right" });
  metaY += 4.5 * scale;

  // Row 3: Tgl. Jatuh Tempo
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Tgl. Jatuh Tempo", metaLabelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const tempoDate = order.tanggal_ambil || order.tanggal_order;
  doc.text(formatDateDMY(tempoDate), metaValX, metaY, { align: "right" });
  metaY += 4.5 * scale;

  currentY = Math.max(logoBottomY, metaY) + (6 * scale);

  // 2. TWO-COLUMN PARTIES INFO: Informasi Perusahaan & Tagihan Kepada (Kledo Underline Style)
  const colGap = 12 * scale;
  const colWidth = (pageWidth - (marginX * 2) - colGap) / 2;
  const col1X = marginX;
  const col2X = marginX + colWidth + colGap;

  // Section Headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10 * scale);
  doc.setTextColor(30, 41, 59);
  doc.text("Informasi Perusahaan", col1X, currentY);
  doc.text("Tagihan Kepada", col2X, currentY);

  currentY += 2.2 * scale;

  // Underlines for both columns (Kledo signature dark divider line)
  doc.setDrawColor(36, 52, 71);
  doc.setLineWidth(0.5);
  doc.line(col1X, currentY, col1X + colWidth, currentY);
  doc.line(col2X, currentY, col2X + colWidth, currentY);

  currentY += 4.8 * scale;

  // Kolom Kiri: Detail Perusahaan
  let col1Y = currentY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5 * scale);
  doc.setTextColor(30, 64, 175); // Kledo Blue Company Name
  doc.text(storeName, col1X, col1Y);
  col1Y += 4.2 * scale;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(71, 85, 105);
  const addrLines: string[] = doc.splitTextToSize(storeAddress, colWidth);
  doc.text(addrLines, col1X, col1Y);
  col1Y += addrLines.length * (3.8 * scale);

  if (storePhone) {
    doc.text(`Telp: ${storePhone}`, col1X, col1Y);
    col1Y += 3.8 * scale;
  }
  if (storeEmail) {
    doc.text(`Email: ${storeEmail}`, col1X, col1Y);
    col1Y += 3.8 * scale;
  }

  // Kolom Kanan: Detail Pelanggan (Tagihan Kepada)
  let col2Y = currentY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5 * scale);
  doc.setTextColor(30, 64, 175); // Kledo Blue Customer Name
  const custName = order.nama_pelanggan || "Pelanggan Umum";
  const custNameLines: string[] = doc.splitTextToSize(custName, colWidth);
  doc.text(custNameLines, col2X, col2Y);
  col2Y += custNameLines.length * (4.2 * scale);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(71, 85, 105);
  if (order.no_wa) {
    doc.text(`Telp: ${order.no_wa}`, col2X, col2Y);
    col2Y += 3.8 * scale;
  }
  if (order.created_by) {
    doc.text(`Kasir / Admin: ${order.created_by}`, col2X, col2Y);
    col2Y += 3.8 * scale;
  }

  currentY = Math.max(col1Y, col2Y) + (6 * scale);

  // 3. TABEL PRODUK KLEDO (Dark Navy Header, 7 Kolom)
  const items = order.items && order.items.length > 0
    ? order.items
    : [{ nama_item: "Item Cetak", qty: 1, satuan: "pcs", harga_satuan: order.subtotal || order.total, subtotal: order.subtotal || order.total }];

  const tableBody = items.map((item) => {
    let desc = "";
    if (item.panjang && item.lebar) {
      desc += `${item.panjang}${item.dimensi_unit || "m"} × ${item.lebar}${item.dimensi_unit || "m"}`;
      if (item.jumlah_lembar && item.jumlah_lembar > 1) {
        desc += ` (${item.jumlah_lembar} lbr)`;
      }
    }
    if (item.catatan_item) {
      desc += desc ? ` • ${item.catatan_item}` : item.catatan_item;
    }

    const diskonStr = item.diskon ? `${item.diskon}%` : "0%";
    const pajakStr = "-";

    return [
      item.nama_item,
      desc || "-",
      `${item.qty} ${item.satuan || ""}`.trim(),
      item.harga_satuan ? item.harga_satuan.toLocaleString("id-ID") : "0",
      diskonStr,
      pajakStr,
      item.subtotal ? item.subtotal.toLocaleString("id-ID") : "0",
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [["Produk", "Deskripsi", "Kuantitas", "Harga", "Diskon", "Pajak", "Jumlah"]],
    body: tableBody,
    theme: "plain",
    headStyles: {
      fillColor: [36, 52, 71], // Kledo Dark Slate Navy Header
      textColor: [255, 255, 255],
      fontSize: 8.5 * scale,
      fontStyle: "bold",
      halign: "left",
      cellPadding: { top: 3.2 * scale, bottom: 3.2 * scale, left: 3 * scale, right: 3 * scale },
      valign: "middle",
    },
    styles: {
      font: "helvetica",
      fontSize: 8.5 * scale,
      textColor: [30, 41, 59],
      cellPadding: { top: 3 * scale, bottom: 3 * scale, left: 3 * scale, right: 3 * scale },
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: "top",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 44 * scale },
      1: { halign: "left", cellWidth: 42 * scale },
      2: { halign: "center", cellWidth: 18 * scale },
      3: { halign: "right", cellWidth: 24 * scale },
      4: { halign: "center", cellWidth: 16 * scale },
      5: { halign: "center", cellWidth: 14 * scale },
      6: { halign: "right", cellWidth: 24 * scale },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + (5 * scale);

  // 4. SUMMARY (KANAN) & TERBILANG / PEMBAYARAN (KIRI)
  const summaryWidth = 68 * scale;
  const summaryX = rightAlignX - summaryWidth;
  const leftInfoWidth = summaryX - marginX - (8 * scale);

  // --- KANAN: FINANCIAL SUMMARY ---
  let sumY = currentY + (2 * scale);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8 * scale);
  doc.setTextColor(71, 85, 105);

  // Subtotal
  doc.text("Subtotal", summaryX, sumY);
  doc.text(formatRupiah(order.subtotal || order.total), rightAlignX, sumY, { align: "right" });
  sumY += 5 * scale;

  // Diskon (jika ada)
  if (order.diskon > 0) {
    doc.text("Diskon", summaryX, sumY);
    doc.setTextColor(225, 29, 72);
    doc.text(`-${formatRupiah(order.diskon)}`, rightAlignX, sumY, { align: "right" });
    doc.setTextColor(71, 85, 105);
    sumY += 5 * scale;
  }

  // Total (Garis Tebal Kledo di bawah kata Total & Nilai)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5 * scale);
  doc.setTextColor(15, 23, 42);
  doc.text("Total", summaryX, sumY);
  doc.text(formatRupiah(order.total), rightAlignX, sumY, { align: "right" });

  // Garis bawah solid hitam di bawah baris Total
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(summaryX, sumY + (1.8 * scale), rightAlignX, sumY + (1.8 * scale));
  sumY += 6 * scale;

  // Terbayar / DP jika ada
  const dpAmount = order.jumlah_dp || 0;
  const isLunas = order.status_bayar === "lunas";
  const sisa = Math.max(0, order.total - (isLunas ? order.total : dpAmount));

  if (dpAmount > 0 && !isLunas) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5 * scale);
    doc.setTextColor(71, 85, 105);
    doc.text("Terbayar (DP)", summaryX, sumY);
    doc.text(formatRupiah(dpAmount), rightAlignX, sumY, { align: "right" });
    sumY += 4.8 * scale;
  }

  // Sisa Tagihan
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text("Sisa Tagihan", summaryX, sumY);
  doc.setFont("helvetica", isLunas ? "normal" : "bold");
  doc.setTextColor(isLunas ? 4 : 185, isLunas ? 120 : 28, isLunas ? 87 : 28);
  doc.text(isLunas ? "Rp 0 (LUNAS)" : formatRupiah(sisa), rightAlignX, sumY, { align: "right" });
  sumY += 5 * scale;

  // --- KIRI: TERBILANG & INFO REKENING / CATATAN ---
  let leftY = currentY + (2 * scale);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text("Terbilang", marginX, leftY);
  leftY += 4 * scale;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(15, 23, 42);
  const terbilangLines: string[] = doc.splitTextToSize(`${terbilang(order.total)} Rupiah`, leftInfoWidth);
  doc.text(terbilangLines, marginX, leftY);
  leftY += (terbilangLines.length * (3.8 * scale)) + (3 * scale);

  // Info Pembayaran / Rekening Bank
  if (storeBank) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.0 * scale);
    doc.setTextColor(71, 85, 105);
    doc.text("Informasi Pembayaran / Rekening:", marginX, leftY);
    leftY += 3.8 * scale;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.0 * scale);
    doc.setTextColor(30, 41, 59);
    const bankLines: string[] = doc.splitTextToSize(storeBank, leftInfoWidth);
    doc.text(bankLines, marginX, leftY);
    leftY += bankLines.length * (3.5 * scale);
  }

  if (order.catatan || storeNotes) {
    leftY += 2 * scale;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5 * scale);
    doc.setTextColor(100, 116, 139);
    const noteText = order.catatan ? `Catatan: ${order.catatan}` : storeNotes;
    const noteLines: string[] = doc.splitTextToSize(noteText, leftInfoWidth);
    doc.text(noteLines, marginX, leftY);
    leftY += noteLines.length * (3.2 * scale);
  }

  currentY = Math.max(leftY, sumY) + (6 * scale);

  // 5. SIGNATURE FOOTER (Kanan: Dengan Hormat, [Jeres Studio])
  let signatureY: number;
  if (paperFormat === "A4") {
    signatureY = Math.max(currentY + 12, pageHeight - 48);
  } else {
    signatureY = Math.min(pageHeight - (30 * scale), currentY + (8 * scale));
  }

  const sigWidth = 48 * scale;
  const sigX = rightAlignX - sigWidth;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text("Dengan Hormat,", sigX, signatureY);

  // Spasi tanda tangan / stempel toko
  const storeSigY = signatureY + (20 * scale);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9 * scale);
  doc.setTextColor(15, 23, 42);
  doc.text(storeName, sigX, storeSigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8 * scale);
  doc.setTextColor(100, 116, 139);
  doc.text("Toko", sigX, storeSigY + (3.8 * scale));

  const sanitizedOrderNo = (order.nomor_nota || "INV").replace(/[^a-zA-Z0-9_-]/g, "-");
  const filename = options.filename || `Invoice-${sanitizedOrderNo}.pdf`;
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);

  safeHandlePdfOutput(doc, pdfBlob, blobUrl, filename, action, options.targetWindow);

  return { doc, blob: pdfBlob, blobUrl, filename };
}

// =========================================================================
// 2. GENERATE SURAT JALAN PDF (Pengirim, Penerima, Barang Tanpa Harga, 3 Tanda Tangan)
// =========================================================================
export async function generateSuratJalanPDF(
  order: Order,
  settings?: StoreSettings | null,
  options: InvoicePdfOptions = {}
): Promise<InvoicePdfResult> {
  const { action = "open" } = options;
  const paperFormat = options.paperFormat || getUserPaperPreference();

  let finalSettings = settings;
  if (!finalSettings) {
    try {
      const res = await api.getSettings();
      if (res?.settings) finalSettings = res.settings;
    } catch {
      // ignore
    }
  }

  const logoData = await loadLogoForPdf(finalSettings?.logo_url);

  const isA4 = paperFormat === "A4";
  const pageWidth = isA4 ? 210 : 148;
  const pageHeight = isA4 ? 297 : 210;
  const marginX = isA4 ? 8 : 6;
  const scale = isA4 ? 1.35 : 1.05;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: isA4 ? "a4" : "a5",
    compress: true,
  });

  // Set Metadata PDF agar nama tab browser menjadi "Surat Jalan [Nomor Nota]"
  const sjDocTitle = `Surat Jalan ${order.nomor_nota || ""}`.trim();
  doc.setProperties({
    title: sjDocTitle,
    subject: `Surat Jalan ${order.nomor_nota || ""}`.trim(),
    author: finalSettings?.nama_toko || "Jeres Studio",
    keywords: "surat jalan, delivery order",
    creator: finalSettings?.nama_toko || "Jeres Studio",
  });

  const storeName = finalSettings?.nama_toko || "JERES STUDIO";
  const storeAddress = finalSettings?.alamat || "Jl. Percetakan Raya No. 88";
  const storePhone = finalSettings?.no_wa || "0812-3456-7890";
  const rightAlignX = pageWidth - marginX;
  let currentY = 5.5;

  let headerTextX = marginX;
  const logoBoxSize = 14 * scale;

  if (logoData) {
    const aspect = (logoData.width || 1) / (logoData.height || 1);
    let renderW = logoBoxSize;
    let renderH = logoBoxSize;

    if (aspect >= 1) {
      renderW = logoBoxSize;
      renderH = logoBoxSize / aspect;
    } else {
      renderH = logoBoxSize;
      renderW = logoBoxSize * aspect;
    }

    const logoX = marginX + (logoBoxSize - renderW) / 2;
    const logoY = currentY + (logoBoxSize - renderH) / 2;

    try {
      doc.addImage(logoData.dataUrl, "PNG", logoX, logoY, renderW, renderH, undefined, "FAST");
      headerTextX = marginX + logoBoxSize + (3.5 * scale);
    } catch (err) {
      console.warn("Gagal render logo di Surat Jalan:", err);
      headerTextX = marginX;
    }
  }

  // Badge Kanan: SURAT JALAN (Compact)
  const badgeW = (isA4 ? 40 : 35) * scale;
  const badgeH = 13.5 * scale;
  const badgeX = rightAlignX - badgeW;
  const headerGap = 3.5 * scale;
  const maxHeaderWidth = Math.max(badgeX - headerTextX - headerGap, 40);

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(badgeX, currentY, badgeW, badgeH, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5 * scale);
  doc.setTextColor(15, 23, 42);
  doc.text("SURAT JALAN", badgeX + (badgeW / 2), currentY + (5.5 * scale), { align: "center" });

  doc.setFontSize(7.8 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text(`No: SJ-${order.nomor_nota}`, badgeX + (badgeW / 2), currentY + (10.5 * scale), { align: "center" });

  // Header Kiri
  let sjBrandY = currentY + (3.2 * scale);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5 * scale);
  doc.setTextColor(30, 41, 59);
  const sjNameLines: string[] = doc.splitTextToSize(storeName, maxHeaderWidth);
  doc.text(sjNameLines, headerTextX, sjBrandY);
  sjBrandY += sjNameLines.length * (4.2 * scale);

  if (storeAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2 * scale);
    doc.setTextColor(71, 85, 105);
    const sjAddrLines: string[] = doc.splitTextToSize(storeAddress, maxHeaderWidth);
    doc.text(sjAddrLines, headerTextX, sjBrandY);
    sjBrandY += sjAddrLines.length * (2.9 * scale);
  }

  if (storePhone) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2 * scale);
    doc.setTextColor(71, 85, 105);
    doc.text(`Telp/WA: ${storePhone}`, headerTextX, sjBrandY);
    sjBrandY += (2.9 * scale);
  }

  const sjHeaderBottomY = Math.max(
    sjBrandY,
    currentY + badgeH,
    logoData ? currentY + logoBoxSize : currentY + 12
  );
  currentY = sjHeaderBottomY + (2.5 * scale);

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, currentY, rightAlignX, currentY);

  currentY += 4.5 * scale;
  // Metadata Pengiriman
  const colWidth = (pageWidth - marginX * 2) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5 * scale);
  doc.text("PENERIMA / TUJUAN:", marginX, currentY);
  doc.text("INFORMASI PENGIRIMAN:", marginX + colWidth + 2, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9 * scale);
  doc.setTextColor(15, 23, 42);
  doc.text(order.nama_pelanggan, marginX, currentY + (5 * scale));
  doc.setFontSize(8 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text(`No. Kontak : ${order.no_wa}`, marginX, currentY + (9.5 * scale));

  doc.text(`Tanggal Kirim : ${formatTanggal(new Date().toISOString(), false)}`, marginX + colWidth + 2, currentY + (5 * scale));
  doc.text(`Ref. No. Nota : ${order.nomor_nota}`, marginX + colWidth + 2, currentY + (9.5 * scale));

  currentY += 16 * scale;

  // Table Daftar Barang (Tanpa Harga!)
  const items = order.items && order.items.length > 0
    ? order.items
    : [{ nama_item: "Pesanan Cetakan", qty: 1, satuan: "pcs", catatan_item: "" }];

  const tableBody = items.map((it, idx) => [
    String(idx + 1),
    it.nama_item,
    `${it.qty} ${it.satuan || "pcs"}`,
    it.catatan_item || "-",
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [["NO", "NAMA BARANG / ITEM CETAK", "JUMLAH / QTY", "KETERANGAN"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 8.5 * scale,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2.8 * scale,
    },
    styles: {
      fontSize: 8.5 * scale,
      cellPadding: 2.8 * scale,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 * scale },
      1: { halign: "left" },
      2: { halign: "center", cellWidth: 26 * scale },
      3: { halign: "left", cellWidth: 42 * scale },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + (6 * scale);

  // Catatan Pengiriman
  if (order.catatan) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5 * scale);
    doc.setTextColor(100, 116, 139);
    doc.text(`Catatan Khusus: ${order.catatan}`, marginX, currentY);
    currentY += 7 * scale;
  }

  // 3 Kolom Tanda Tangan: Penerima, Pengemudi/Kurir, Pengirim
  let sigY: number;
  if (isA4) {
    sigY = Math.max(currentY + 18, 235);
    if (sigY > pageHeight - 45) sigY = pageHeight - 45;
  } else {
    sigY = Math.min(pageHeight - (32 * scale), currentY + (10 * scale));
  }
  const sigColW = (pageWidth - marginX * 2) / 3;

  const roles = [
    { title: "Penerima Barang,", label: `( ${order.nama_pelanggan} )` },
    { title: "Pengemudi / Kurir,", label: "( ............................. )" },
    { title: "Pengirim / Petugas,", label: `( ${storeName} )` },
  ];

  roles.forEach((r, i) => {
    const x = marginX + (i * sigColW) + (sigColW / 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8 * scale);
    doc.setTextColor(71, 85, 105);
    doc.text(r.title, x, sigY, { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.line(x - (19 * scale), sigY + (18 * scale), x + (19 * scale), sigY + (18 * scale));

    doc.setFontSize(7.5 * scale);
    doc.setTextColor(100, 116, 139);
    doc.text(r.label, x, sigY + (23 * scale), { align: "center" });
  });

  const filename = options.filename || `SuratJalan-${order.nomor_nota}.pdf`;
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);

  safeHandlePdfOutput(doc, pdfBlob, blobUrl, filename, action, options.targetWindow);

  return { doc, blob: pdfBlob, blobUrl, filename };
}

// =========================================================================
// 3. GENERATE TANDA TERIMA DOKUMEN / BARANG PDF
// =========================================================================
export async function generateTandaTerimaPDF(
  order: Order,
  settings?: StoreSettings | null,
  options: InvoicePdfOptions = {}
): Promise<InvoicePdfResult> {
  const { action = "open" } = options;
  const paperFormat = options.paperFormat || getUserPaperPreference();

  let finalSettings = settings;
  if (!finalSettings) {
    try {
      const res = await api.getSettings();
      if (res?.settings) finalSettings = res.settings;
    } catch {
      // ignore
    }
  }

  const logoData = await loadLogoForPdf(finalSettings?.logo_url);

  const isA4 = paperFormat === "A4";
  const pageWidth = isA4 ? 210 : 148;
  const pageHeight = isA4 ? 297 : 210;
  const marginX = isA4 ? 8 : 6;
  const scale = isA4 ? 1.35 : 1.05;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: isA4 ? "a4" : "a5",
    compress: true,
  });

  // Set Metadata PDF agar nama tab browser menjadi "Tanda Terima [Nomor Nota]"
  const ttDocTitle = `Tanda Terima ${order.nomor_nota || ""}`.trim();
  doc.setProperties({
    title: ttDocTitle,
    subject: `Tanda Terima ${order.nomor_nota || ""}`.trim(),
    author: finalSettings?.nama_toko || "Jeres Studio",
    keywords: "tanda terima, receipt",
    creator: finalSettings?.nama_toko || "Jeres Studio",
  });

  const storeName = finalSettings?.nama_toko || "JERES STUDIO";
  const storeAddress = finalSettings?.alamat || "Jl. Percetakan Raya No. 88";
  const storePhone = finalSettings?.no_wa || "0812-3456-7890";
  const rightAlignX = pageWidth - marginX;
  let currentY = 5.5;

  let headerTextX = marginX;
  const logoBoxSize = 14 * scale;

  if (logoData) {
    const aspect = (logoData.width || 1) / (logoData.height || 1);
    let renderW = logoBoxSize;
    let renderH = logoBoxSize;

    if (aspect >= 1) {
      renderW = logoBoxSize;
      renderH = logoBoxSize / aspect;
    } else {
      renderH = logoBoxSize;
      renderW = logoBoxSize * aspect;
    }

    const logoX = marginX + (logoBoxSize - renderW) / 2;
    const logoY = currentY + (logoBoxSize - renderH) / 2;

    try {
      doc.addImage(logoData.dataUrl, "PNG", logoX, logoY, renderW, renderH, undefined, "FAST");
      headerTextX = marginX + logoBoxSize + (3.5 * scale);
    } catch (err) {
      console.warn("Gagal render logo di Tanda Terima:", err);
      headerTextX = marginX;
    }
  }

  // Badge Tanda Terima (Compact)
  const badgeW = (isA4 ? 42 : 36) * scale;
  const badgeH = 13.5 * scale;
  const badgeX = rightAlignX - badgeW;
  const headerGap = 3.5 * scale;
  const maxHeaderWidth = Math.max(badgeX - headerTextX - headerGap, 40);

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(badgeX, currentY, badgeW, badgeH, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5 * scale);
  doc.setTextColor(15, 23, 42);
  doc.text("TANDA TERIMA", badgeX + (badgeW / 2), currentY + (5.5 * scale), { align: "center" });

  doc.setFontSize(7.8 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text(`Ref: ${order.nomor_nota}`, badgeX + (badgeW / 2), currentY + (10.5 * scale), { align: "center" });

  // Header Kiri
  let ttBrandY = currentY + (3.2 * scale);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5 * scale);
  doc.setTextColor(30, 41, 59);
  const ttNameLines: string[] = doc.splitTextToSize(storeName, maxHeaderWidth);
  doc.text(ttNameLines, headerTextX, ttBrandY);
  ttBrandY += ttNameLines.length * (4.2 * scale);

  if (storeAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2 * scale);
    doc.setTextColor(71, 85, 105);
    const ttAddrLines: string[] = doc.splitTextToSize(storeAddress, maxHeaderWidth);
    doc.text(ttAddrLines, headerTextX, ttBrandY);
    ttBrandY += ttAddrLines.length * (2.9 * scale);
  }

  if (storePhone) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2 * scale);
    doc.setTextColor(71, 85, 105);
    doc.text(`Telp/WA: ${storePhone}`, headerTextX, ttBrandY);
    ttBrandY += (2.9 * scale);
  }

  const ttHeaderBottomY = Math.max(
    ttBrandY,
    currentY + badgeH,
    logoData ? currentY + logoBoxSize : currentY + 12
  );
  currentY = ttHeaderBottomY + (2.5 * scale);

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, currentY, rightAlignX, currentY);

  currentY += 6 * scale;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(30, 41, 59);
  doc.text("Telah diterima dengan baik dari:", marginX, currentY);

  currentY += 5.5 * scale;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5 * scale);
  doc.text(storeName, marginX + 4, currentY);

  currentY += 6.5 * scale;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.text("Oleh Pelanggan / Penerima:", marginX, currentY);

  currentY += 5.5 * scale;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5 * scale);
  doc.text(`${order.nama_pelanggan} (${order.no_wa})`, marginX + 4, currentY);

  currentY += 6.5 * scale;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.text("Rincian Dokumen / Barang yang diserahkan:", marginX, currentY);

  currentY += 4.5 * scale;
  const items = order.items && order.items.length > 0 ? order.items : [{ nama_item: "Hasil Cetakan / Dokumen", qty: 1, satuan: "set" }];
  const tableBody = items.map((it, i) => [String(i + 1), it.nama_item, `${it.qty} ${it.satuan || "pcs"}`, "Diterima Lengkap"]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [["NO", "NAMA DOKUMEN / BARANG", "QTY", "STATUS PENYERAHAN"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5 * scale,
      halign: "center",
      cellPadding: 2.8 * scale,
    },
    styles: { fontSize: 8.5 * scale, cellPadding: 2.8 * scale },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 * scale },
      1: { halign: "left" },
      2: { halign: "center", cellWidth: 26 * scale },
      3: { halign: "center", cellWidth: 38 * scale },
    },
  });

  let sigY: number;
  if (isA4) {
    sigY = Math.max((doc as any).lastAutoTable.finalY + 18, 235);
    if (sigY > pageHeight - 45) sigY = pageHeight - 45;
  } else {
    sigY = Math.min(pageHeight - (32 * scale), (doc as any).lastAutoTable.finalY + (10 * scale));
  }

  // Tanda Tangan 2 Pihak
  const half = (pageWidth - marginX * 2) / 2;
  const leftX = marginX + (half / 2);
  const rightX = marginX + half + (half / 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text("Yang Menyerahkan,", leftX, sigY, { align: "center" });
  doc.text("Yang Menerima,", rightX, sigY, { align: "center" });

  doc.setDrawColor(203, 213, 225);
  doc.line(leftX - (22 * scale), sigY + (18 * scale), leftX + (22 * scale), sigY + (18 * scale));
  doc.line(rightX - (22 * scale), sigY + (18 * scale), rightX + (22 * scale), sigY + (18 * scale));

  doc.setFontSize(7.5 * scale);
  doc.setTextColor(100, 116, 139);
  doc.text(`( ${storeName} )`, leftX, sigY + (23 * scale), { align: "center" });
  doc.text(`( ${order.nama_pelanggan} )`, rightX, sigY + (23 * scale), { align: "center" });

  const filename = options.filename || `TandaTerima-${order.nomor_nota}.pdf`;
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);

  safeHandlePdfOutput(doc, pdfBlob, blobUrl, filename, action, options.targetWindow);

  return { doc, blob: pdfBlob, blobUrl, filename };
}

// =========================================================================
// 4. EXPORT INVOICE TO XLS (.XLSX) VIA SHEETJS
// =========================================================================
export function exportInvoiceToXLS(order: Order, settings?: StoreSettings | null): void {
  const storeName = settings?.nama_toko || "Jeres Studio";

  // Data header & ringkasan
  const headerData = [
    ["TAGIHAN PENJUALAN / INVOICE", ""],
    ["Nama Toko", storeName],
    ["No. Nota", order.nomor_nota],
    ["Tanggal Order", formatTanggal(order.tanggal_order, true)],
    ["Nama Pelanggan", order.nama_pelanggan],
    ["No. WhatsApp", order.no_wa],
    ["Status Bayar", order.status_bayar?.toUpperCase() || "BELUM BAYAR"],
    ["Metode Bayar", order.metode_bayar || "Cash"],
    [],
    ["NO", "NAMA ITEM CETAK", "QTY", "SATUAN", "HARGA SATUAN", "SUBTOTAL", "CATATAN"],
  ];

  // Data baris item
  const items = order.items && order.items.length > 0 ? order.items : [];
  const rows = items.map((it, idx) => [
    idx + 1,
    it.nama_item,
    it.qty,
    it.satuan || "pcs",
    it.harga_satuan,
    it.subtotal,
    it.catatan_item || "",
  ]);

  // Data total & footer
  const footerRows = [
    [],
    ["", "", "", "", "Subtotal", order.subtotal || order.total],
    ["", "", "", "", "Diskon", order.diskon || 0],
    ["", "", "", "", "Grand Total", order.total],
    ["", "", "", "", "DP Dibayar", order.jumlah_dp || 0],
    ["", "", "", "", "Sisa Tagihan", Math.max(0, order.total - (order.status_bayar === "lunas" ? order.total : (order.jumlah_dp || 0)))],
  ];

  const fullData = [...headerData, ...rows, ...footerRows];

  const ws = XLSX.utils.aoa_to_sheet(fullData);

  // Set column widths
  ws["!cols"] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoice");

  const sanitizedOrderNo = (order.nomor_nota || "INV").replace(/[^a-zA-Z0-9_-]/g, "-");
  XLSX.writeFile(wb, `Invoice-${sanitizedOrderNo}.xlsx`);
}

// =========================================================================
// 5. EXPORT INVOICE TO CSV VIA SHEETJS
// =========================================================================
export function exportInvoiceToCSV(order: Order, settings?: StoreSettings | null): void {
  const storeName = settings?.nama_toko || "Jeres Studio";

  const rows = [
    ["No Nota", order.nomor_nota],
    ["Toko", storeName],
    ["Pelanggan", order.nama_pelanggan],
    ["No WA", order.no_wa],
    ["Tanggal", order.tanggal_order],
    ["Status Bayar", order.status_bayar],
    [],
    ["No", "Nama Item", "Qty", "Satuan", "Harga Satuan", "Subtotal", "Catatan"],
  ];

  const items = order.items && order.items.length > 0 ? order.items : [];
  items.forEach((it, idx) => {
    rows.push([
      String(idx + 1),
      it.nama_item,
      String(it.qty),
      it.satuan || "pcs",
      String(it.harga_satuan),
      String(it.subtotal),
      it.catatan_item || "",
    ]);
  });

  rows.push(
    [],
    ["", "", "", "", "Subtotal", String(order.subtotal || order.total)],
    ["", "", "", "", "Diskon", String(order.diskon || 0)],
    ["", "", "", "", "Grand Total", String(order.total)],
    ["", "", "", "", "DP", String(order.jumlah_dp || 0)],
    ["", "", "", "", "Sisa", String(Math.max(0, order.total - (order.status_bayar === "lunas" ? order.total : (order.jumlah_dp || 0))))]
  );

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const sanitizedOrderNo = (order.nomor_nota || "INV").replace(/[^a-zA-Z0-9_-]/g, "-");
  a.href = url;
  a.download = `Invoice-${sanitizedOrderNo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Helper fleksibel: Cetak invoice langsung dengan ID Order
 */
export async function printInvoiceById(
  orderId: number | string,
  settings?: StoreSettings | null,
  options: InvoicePdfOptions = { action: "open" }
): Promise<InvoicePdfResult> {
  try {
    const [orderRes, settingsRes] = await Promise.all([
      api.getOrder(orderId),
      settings ? Promise.resolve({ settings }) : api.getSettings(),
    ]);

    if (!orderRes || !orderRes.order) {
      throw new Error(`Order dengan ID #${orderId} tidak ditemukan.`);
    }

    const fullOrder = orderRes.order;
    const finalSettings = settingsRes?.settings || settings;

    return await generateInvoicePDF(fullOrder, finalSettings, options);
  } catch (err) {
    console.error("Gagal generate invoice PDF:", err);
    throw err;
  }
}
