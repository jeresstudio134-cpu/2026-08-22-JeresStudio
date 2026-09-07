import React, { forwardRef } from "react";
import { Order, StoreSettings } from "../../types/index.js";
import { InvoiceDoc, INVOICE_WIDTH_PX, INVOICE_HEIGHT_PX } from "./InvoiceDoc.js";
import { SuratJalanDoc, SURAT_JALAN_WIDTH_PX, SURAT_JALAN_HEIGHT_PX } from "./SuratJalanDoc.js";
import { LabelPengirimanDoc, LABEL_WIDTH_PX, LABEL_HEIGHT_PX } from "./LabelPengirimanDoc.js";
import { RekapPembayaranDoc, REKAP_WIDTH_PX, REKAP_HEIGHT_PX } from "./RekapPembayaranDoc.js";

export type DocumentType = "nota" | "surat-jalan" | "label" | "rekap-pembayaran";

export interface DocumentConfig {
  type: DocumentType;
  title: string;
  shortTitle: string;
  description: string;
  paperSizeLabel: string;
  orientation: "landscape" | "portrait";
  dimensionsMm: [number, number]; // [width, height] in mm
  dimensionsPx: [number, number]; // [width, height] in px
  pageCssRule: string;
}

export const DOCUMENT_CONFIGS: Record<DocumentType, DocumentConfig> = {
  nota: {
    type: "nota",
    title: "Nota / Invoice Pesanan",
    shortTitle: "Nota / Invoice",
    description: "Format nota resmi lengkap dengan rincian harga, DP, sisa, dan info rekening",
    paperSizeLabel: "A6 Landscape (148 x 105 mm)",
    orientation: "landscape",
    dimensionsMm: [148, 105],
    dimensionsPx: [INVOICE_WIDTH_PX, INVOICE_HEIGHT_PX],
    pageCssRule: "@page { size: 148mm 105mm landscape; margin: 0; }",
  },
  "surat-jalan": {
    type: "surat-jalan",
    title: "Surat Jalan / Pengiriman",
    shortTitle: "Surat Jalan",
    description: "Dokumen pengiriman barang tanpa harga dengan 3 kolom tanda tangan",
    paperSizeLabel: "A5 Portrait (148 x 210 mm)",
    orientation: "portrait",
    dimensionsMm: [148, 210],
    dimensionsPx: [SURAT_JALAN_WIDTH_PX, SURAT_JALAN_HEIGHT_PX],
    pageCssRule: "@page { size: 148mm 210mm portrait; margin: 0; }",
  },
  label: {
    type: "label",
    title: "Label Pengiriman Paket",
    shortTitle: "Label Pengiriman",
    description: "Stiker paket / resi pengiriman dengan kontak penerima besar & barcode",
    paperSizeLabel: "Label (100 x 150 mm)",
    orientation: "portrait",
    dimensionsMm: [100, 150],
    dimensionsPx: [LABEL_WIDTH_PX, LABEL_HEIGHT_PX],
    pageCssRule: "@page { size: 100mm 150mm portrait; margin: 0; }",
  },
  "rekap-pembayaran": {
    type: "rekap-pembayaran",
    title: "Rekap / Kuitansi Pembayaran",
    shortTitle: "Rekap Pembayaran",
    description: "Bukti riwayat pembayaran (DP/Lunas), nominal terbayar, terbilang & tanda tangan",
    paperSizeLabel: "A6 Landscape (148 x 105 mm)",
    orientation: "landscape",
    dimensionsMm: [148, 105],
    dimensionsPx: [REKAP_WIDTH_PX, REKAP_HEIGHT_PX],
    pageCssRule: "@page { size: 148mm 105mm landscape; margin: 0; }",
  },
};

interface PrintDocumentRendererProps {
  type: DocumentType;
  order: Order;
  settings: StoreSettings | null;
}

export const PrintDocumentRenderer = forwardRef<HTMLDivElement, PrintDocumentRendererProps>(
  ({ type, order, settings }, ref) => {
    switch (type) {
      case "surat-jalan":
        return <SuratJalanDoc ref={ref} order={order} settings={settings} />;
      case "label":
        return <LabelPengirimanDoc ref={ref} order={order} settings={settings} />;
      case "rekap-pembayaran":
        return <RekapPembayaranDoc ref={ref} order={order} settings={settings} />;
      case "nota":
      default:
        return <InvoiceDoc ref={ref} order={order} settings={settings} />;
    }
  }
);

PrintDocumentRenderer.displayName = "PrintDocumentRenderer";
