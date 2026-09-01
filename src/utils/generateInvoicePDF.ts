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
}

export interface InvoicePdfResult {
  doc: jsPDF;
  blob: Blob;
  blobUrl: string;
  filename: string;
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

// =========================================================================
// 1. GENERATE FAKTUR / INVOICE PDF (Multi-Layout: A4, A5, Thermal)
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
  let pageWidth = 148;
  let pageHeight = 210;
  let marginX = 6; // Default A5 mepet tepi

  if (paperFormat === "A4") {
    pageWidth = 210;
    pageHeight = 297;
    marginX = 8;
    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  } else if (paperFormat === "thermal58") {
    pageWidth = 58;
    pageHeight = 200;
    marginX = 3;
    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [58, 200], compress: true });
  } else if (paperFormat === "thermal80") {
    pageWidth = 80;
    pageHeight = 220;
    marginX = 4;
    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 220], compress: true });
  } else {
    // Default A5
    pageWidth = 148;
    pageHeight = 210;
    marginX = 6;
    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5", compress: true });
  }

  let currentY = paperFormat.startsWith("thermal") ? 5 : 5.5;

  // Data Toko
  const storeName = finalSettings?.nama_toko || "JERES STUDIO";
  const storeSlogan = finalSettings?.slogan || "Digital Printing & Custom Merchandise";
  const storeAddress = finalSettings?.alamat || "Jl. Percetakan Raya No. 88";
  const storePhone = finalSettings?.no_wa || "0812-3456-7890";
  const storeEmail = finalSettings?.email || "jeresstudio@gmail.com";
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

    if (action === "download") doc.save(filename);
    else if (action === "open" || action === "print") window.open(blobUrl, "_blank");

    return { doc, blob: pdfBlob, blobUrl, filename };
  }

  // ================= A4 & A5 STANDARD VECTOR LAYOUT =================
  const scale = paperFormat === "A4" ? 1.35 : 1.05;

  let headerTextX = marginX;
  const logoBoxSize = 15 * scale;

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
      doc.addImage(
        logoData.dataUrl,
        "PNG",
        logoX,
        logoY,
        renderW,
        renderH,
        undefined,
        "FAST"
      );
      headerTextX = marginX + logoBoxSize + (3 * scale);
    } catch (err) {
      console.warn("Gagal render logo di invoice:", err);
      headerTextX = marginX;
    }
  }

  // Badge Header Kanan: "INVOICE PENJUALAN" (Compact & Modern)
  const badgeW = (paperFormat === "A4" ? 44 : 38) * scale;
  const badgeH = 14 * scale;
  const badgeX = rightAlignX - badgeW;
  const headerGap = 3.5 * scale;
  const maxHeaderWidth = Math.max(badgeX - headerTextX - headerGap, 40);

  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(badgeX, currentY, badgeW, badgeH, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9 * scale);
  doc.setTextColor(67, 56, 202);
  doc.text("INVOICE PENJUALAN", badgeX + (badgeW / 2), currentY + (5.5 * scale), { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8 * scale);
  doc.setTextColor(30, 41, 59);
  doc.text(order.nomor_nota || "-", badgeX + (badgeW / 2), currentY + (11 * scale), { align: "center" });

  // Header Brand Toko (Kiri) dengan batasan maxWidth agar tidak pernah menabrak kotak invoice
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13 * scale);
  doc.setTextColor(30, 41, 59);
  doc.text(storeName, headerTextX, currentY + 3.2, { maxWidth: maxHeaderWidth });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.8 * scale);
  doc.setTextColor(100, 116, 139);
  doc.text(storeSlogan, headerTextX, currentY + (7.2 * scale), { maxWidth: maxHeaderWidth });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text(storeAddress, headerTextX, currentY + (11 * scale), { maxWidth: maxHeaderWidth });
  doc.text(`WA: ${storePhone} • Email: ${storeEmail}`, headerTextX, currentY + (14.8 * scale), { maxWidth: maxHeaderWidth });

  currentY += 17.5 * scale;

  // Garis Pembatas Header
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, rightAlignX, currentY);

  currentY += 4.5 * scale;

  // 2 Kolom: Pelanggan & Detail Transaksi
  const colWidth = (pageWidth - marginX * 2) / 2;
  const col1X = marginX;
  const col2X = marginX + colWidth + 2;

  // Kolom Kiri
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(100, 116, 139);
  doc.text("TAGIHAN KEPADA:", col1X, currentY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5 * scale);
  doc.setTextColor(15, 23, 42);
  doc.text(order.nama_pelanggan || "Pelanggan Umum", col1X, currentY + (5 * scale));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text(`No. WA / Telp : ${order.no_wa || "-"}`, col1X, currentY + (9.5 * scale));
  if (order.created_by) {
    doc.text(`Kasir / Admin : ${order.created_by}`, col1X, currentY + (13.8 * scale));
  }

  // Kolom Kanan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(100, 116, 139);
  doc.text("DETAIL TRANSAKSI:", col2X, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal Order : ${formatTanggal(order.tanggal_order, true)}`, col2X, currentY + (5 * scale));

  if (order.tanggal_ambil) {
    doc.text(`Tanggal Ambil : ${formatTanggal(order.tanggal_ambil, false)}`, col2X, currentY + (9.5 * scale));
  } else {
    doc.text(`Metode Bayar  : ${order.metode_bayar || "Cash"}`, col2X, currentY + (9.5 * scale));
  }

  // Status Bayar Badge Pill
  const statusBayar = (order.status_bayar || "belum").toLowerCase();
  let badgeText = "BELUM BAYAR";
  let badgeBg: [number, number, number] = [254, 226, 226];
  let badgeTextCol: [number, number, number] = [185, 28, 28];

  if (statusBayar === "lunas") {
    badgeText = "LUNAS";
    badgeBg = [209, 250, 229];
    badgeTextCol = [4, 120, 87];
  } else if (statusBayar === "dp") {
    badgeText = `DP: ${formatRupiah(order.jumlah_dp)}`;
    badgeBg = [243, 232, 255];
    badgeTextCol = [107, 33, 168];
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8 * scale);
  const textWidth = doc.getTextWidth(badgeText);
  const badgePillW = Math.max(38 * scale, textWidth + (8 * scale));
  const badgePillX = rightAlignX - badgePillW;
  const pillBoxY = currentY + (12.5 * scale);
  const pillBoxH = 5.8 * scale;

  doc.setFillColor(...badgeBg);
  doc.roundedRect(badgePillX, pillBoxY, badgePillW, pillBoxH, 1.2, 1.2, "F");

  doc.setTextColor(...badgeTextCol);
  // Posisi teks di dalam kotak dibuat agak ke bawah dan proporsional pas di tengah
  doc.text(badgeText, badgePillX + (badgePillW / 2), pillBoxY + (4.0 * scale), { align: "center" });

  currentY += 21 * scale;

  // AutoTable Item Pesanan
  const items = order.items && order.items.length > 0
    ? order.items
    : [{ nama_item: "Item Cetak", qty: 1, satuan: "pcs", harga_satuan: order.subtotal || order.total, subtotal: order.subtotal || order.total }];

  const tableBody = items.map((item, index) => [
    String(index + 1),
    item.nama_item,
    `${item.qty} ${item.satuan || "pcs"}`,
    formatRupiah(item.harga_satuan),
    formatRupiah(item.subtotal),
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [["NO", "DESKRIPSI ITEM CETAK", "QTY", "HARGA SATUAN", "SUBTOTAL"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5 * scale,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2.8 * scale,
    },
    styles: {
      font: "helvetica",
      fontSize: 8.5 * scale,
      textColor: [30, 41, 59],
      cellPadding: { top: 2.8 * scale, bottom: 2.8 * scale, left: 3 * scale, right: 3 * scale },
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 * scale },
      1: { halign: "left" },
      2: { halign: "center", cellWidth: 20 * scale },
      3: { halign: "right", cellWidth: 28 * scale },
      4: { halign: "right", cellWidth: 30 * scale },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        // Clear default text so autoTable draws standard matching cell background and borders
        data.cell.text = [];

        const rawItem = items[data.row.index];
        if (rawItem) {
          const colW = pageWidth - marginX * 2 - ((14 + 20 + 28 + 30) * scale);
          const maxTextW = Math.max(colW - (6 * scale), 40);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5 * scale);
          const nameLines = doc.splitTextToSize(rawItem.nama_item, maxTextW);

          let neededHeight = (2.8 * scale) + (nameLines.length * 3.4 * scale) + (2.8 * scale);

          if (rawItem.catatan_item) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7.2 * scale);
            const noteText = `Catatan: ${rawItem.catatan_item}`;
            const noteLines = doc.splitTextToSize(noteText, maxTextW);

            const nameH = nameLines.length * 3.4 * scale;
            const gapH = 1.3 * scale;
            const noteH = noteLines.length * 2.8 * scale;
            const paddingH = 2.8 * scale * 2; // seimbang: 2.8mm atas, 2.8mm bawah

            neededHeight = paddingH + nameH + gapH + noteH;
          }

          (data.cell as any).minCellHeight = neededHeight;
          (data.row as any).height = neededHeight;
        }
      }
    },
    didDrawCell: (data) => {
      // Customize cell rendering for column 1 (item name & catatan) with custom smaller note font
      if (data.section === "body" && data.column.index === 1) {
        const rawItem = items[data.row.index];
        if (rawItem) {
          const cell = data.cell;
          const textX = cell.x + (3 * scale);
          const maxTextW = cell.width - (6 * scale);

          // 1. Nama Item (Font Normal / Bold)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5 * scale);
          doc.setTextColor(15, 23, 42);
          const nameLines = doc.splitTextToSize(rawItem.nama_item, maxTextW);
          let currentYText = cell.y + (2.8 * scale) + (2.3 * scale);

          for (let i = 0; i < nameLines.length; i++) {
            doc.text(nameLines[i], textX, currentYText);
            if (i < nameLines.length - 1) {
              currentYText += (3.4 * scale);
            }
          }

          // 2. Catatan Item (Font Lebih Kecil & Miring, Lurus Rata Kiri)
          if (rawItem.catatan_item) {
            currentYText += (1.3 * scale) + (2.3 * scale);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7.2 * scale);
            doc.setTextColor(100, 116, 139);
            const noteText = `Catatan: ${rawItem.catatan_item}`;
            const noteLines = doc.splitTextToSize(noteText, maxTextW);

            for (let i = 0; i < noteLines.length; i++) {
              doc.text(noteLines[i], textX, currentYText);
              if (i < noteLines.length - 1) {
                currentYText += (2.8 * scale);
              }
            }
          }
        }
      }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + (4.5 * scale);

  // Summary & Rekening Box
  const summaryBoxWidth = 62 * scale;
  const summaryBoxX = pageWidth - marginX - summaryBoxWidth;
  const leftInfoWidth = summaryBoxX - marginX - (4 * scale);

  // Kalkulasi Konten Kiri (Rekening & Catatan) secara dinamis agar TIDAK TUMPANG TINDIH
  doc.setFontSize(8 * scale);
  const bankLines: string[] = doc.splitTextToSize(storeBank, leftInfoWidth - 6);
  const noteLines: string[] = order.catatan
    ? doc.splitTextToSize(order.catatan, leftInfoWidth - 6)
    : (storeNotes ? doc.splitTextToSize(storeNotes, leftInfoWidth - 6) : []);

  let leftContentHeight = 6 * scale; // Header space
  leftContentHeight += bankLines.length * (4.2 * scale);
  if (order.catatan || storeNotes) {
    leftContentHeight += 5 * scale; // Note header space
    leftContentHeight += noteLines.length * (4 * scale);
  }
  leftContentHeight += 4 * scale; // Bottom padding

  const boxHeight = Math.max(leftContentHeight, 28 * scale);

  // Gambar Box Kiri (FD)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, leftInfoWidth, boxHeight, 1.5, 1.5, "FD");

  let boxTextY = currentY + (4.5 * scale);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text("PEMBAYARAN / TRANSFER:", marginX + 3, boxTextY);

  boxTextY += 4.5 * scale;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8 * scale);
  doc.setTextColor(30, 41, 59);
  doc.text(bankLines, marginX + 3, boxTextY);

  boxTextY += (bankLines.length * (4.2 * scale)) + (1.5 * scale);

  if (order.catatan) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8 * scale);
    doc.setTextColor(71, 85, 105);
    doc.text("Catatan Pesanan:", marginX + 3, boxTextY);
    boxTextY += 4.2 * scale;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(noteLines, marginX + 3, boxTextY);
  } else if (storeNotes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5 * scale);
    doc.setTextColor(148, 163, 184);
    doc.text(noteLines, marginX + 3, boxTextY);
  }

  // Summary (Kanan)
  let sumY = currentY + (2 * scale);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", summaryBoxX, sumY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(formatRupiah(order.subtotal || order.total), rightAlignX, sumY, { align: "right" });

  if (order.diskon > 0) {
    sumY += 5 * scale;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(225, 29, 72);
    doc.text("Diskon", summaryBoxX, sumY);
    doc.text(`-${formatRupiah(order.diskon)}`, rightAlignX, sumY, { align: "right" });
  }

  sumY += 6 * scale;
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(summaryBoxX - 1, sumY - (3.5 * scale), summaryBoxWidth + 1, 8 * scale, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5 * scale);
  doc.setTextColor(67, 56, 202);
  doc.text("TOTAL BAYAR", summaryBoxX + 2, sumY + (1.8 * scale));
  doc.text(formatRupiah(order.total), rightAlignX - 2, sumY + (1.8 * scale), { align: "right" });

  const sisaTagihan = Math.max(0, order.total - (order.status_bayar === "lunas" ? order.total : (order.jumlah_dp || 0)));
  if (order.jumlah_dp > 0 && order.status_bayar !== "lunas") {
    sumY += 9 * scale;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5 * scale);
    doc.setTextColor(100, 116, 139);
    doc.text("Uang Muka (DP)", summaryBoxX, sumY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(formatRupiah(order.jumlah_dp), rightAlignX, sumY, { align: "right" });

    sumY += 5 * scale;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(225, 29, 72);
    doc.text("Sisa Tagihan", summaryBoxX, sumY);
    doc.text(formatRupiah(sisaTagihan), rightAlignX, sumY, { align: "right" });
  }

  currentY = Math.max(currentY + boxHeight + (4 * scale), sumY + (7 * scale));

  // Terbilang
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(100, 116, 139);
  doc.text("Terbilang:", marginX, currentY);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9 * scale);
  doc.setTextColor(30, 41, 59);
  doc.text(terbilang(order.total), marginX + (16 * scale), currentY);

  currentY += 8 * scale;

  // Signature Footer (Model fixed ukuran A4 seimbang dan rapi)
  let signatureY: number;
  if (paperFormat === "A4") {
    signatureY = Math.max(currentY + 18, 235);
    if (signatureY > pageHeight - 45) {
      signatureY = pageHeight - 45;
    }
  } else {
    signatureY = Math.min(pageHeight - (32 * scale), currentY + (10 * scale));
  }

  // Tanda Tangan Kiri
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text("Tanda Terima / Pelanggan,", marginX + 4, signatureY);
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, signatureY + (18 * scale), marginX + (52 * scale), signatureY + (18 * scale));
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(100, 116, 139);
  doc.text(`( ${order.nama_pelanggan || "..................."} )`, marginX + 4, signatureY + (23 * scale));

  // Tanda Tangan Kanan
  const rightSigX = pageWidth - marginX - (52 * scale);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text("Hormat Kami,", rightSigX + 4, signatureY);
  doc.line(rightSigX, signatureY + (18 * scale), rightSigX + (52 * scale), signatureY + (18 * scale));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5 * scale);
  doc.setTextColor(30, 41, 59);
  doc.text(`( ${storeName} )`, rightSigX + 4, signatureY + (23 * scale));

  // Bottom text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5 * scale);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen resmi ${storeName} • Dicetak secara otomatis pada ${new Date().toLocaleString("id-ID")}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  const sanitizedOrderNo = (order.nomor_nota || "INV").replace(/[^a-zA-Z0-9_-]/g, "-");
  const filename = options.filename || `Invoice-${sanitizedOrderNo}.pdf`;
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);

  if (action === "download") {
    doc.save(filename);
  } else if (action === "open" || action === "print") {
    window.open(blobUrl, "_blank");
  }

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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13 * scale);
  doc.setTextColor(30, 41, 59);
  doc.text(storeName, headerTextX, currentY + 3.2, { maxWidth: maxHeaderWidth });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text(storeAddress, headerTextX, currentY + (7.2 * scale), { maxWidth: maxHeaderWidth });
  doc.text(`Telp/WA: ${storePhone}`, headerTextX, currentY + (11 * scale), { maxWidth: maxHeaderWidth });

  currentY += 17 * scale;
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

  if (action === "download") doc.save(filename);
  else if (action === "open" || action === "print") window.open(blobUrl, "_blank");

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

  const storeName = finalSettings?.nama_toko || "JERES STUDIO";
  const storeAddress = finalSettings?.alamat || "Jl. Percetakan Raya No. 88";
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13 * scale);
  doc.setTextColor(30, 41, 59);
  doc.text(storeName, headerTextX, currentY + 3.2, { maxWidth: maxHeaderWidth });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5 * scale);
  doc.setTextColor(71, 85, 105);
  doc.text(storeAddress, headerTextX, currentY + (7.2 * scale), { maxWidth: maxHeaderWidth });

  currentY += 17 * scale;
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

  if (action === "download") doc.save(filename);
  else if (action === "open" || action === "print") window.open(blobUrl, "_blank");

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
