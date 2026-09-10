import {
  generateInvoicePDF,
  openDocPdfInBrowser,
  openInvoicePdfInBrowser,
  PaperFormat,
} from "../utils/generateInvoicePDF.js";
import { Order, StoreSettings } from "../types/index.js";

/**
 * Proxy and Re-export of Invoice PDF Generator
 * Menjaga backwards compatibility dan kemudahan import di seluruh codebase.
 */
export {
  generateInvoicePDF,
  generateSuratJalanPDF,
  generateTandaTerimaPDF,
  openDocPdfInBrowser,
  openInvoicePdfInBrowser,
  printInvoiceById,
  type InvoicePdfOptions,
  type InvoicePdfResult,
  type PaperFormat,
} from "../utils/generateInvoicePDF.js";

// Shorthand helper aliases untuk membuka di halaman PDF browser (BUKAN download)
export const openInvoicePdf = (
  order: Order,
  settings?: StoreSettings | null,
  paperFormat?: PaperFormat
) => openInvoicePdfInBrowser(order, settings, paperFormat);

export const openDocPdf = (
  docType: "faktur" | "surat_jalan" | "tanda_terima" | "nota",
  order: Order,
  settings?: StoreSettings | null,
  paperFormat?: PaperFormat
) => openDocPdfInBrowser(docType, order, settings, paperFormat);

// Download functions (jika secara eksplisit ingin mengunduh file)
export const downloadInvoicePdf = (
  order: Order,
  settings?: StoreSettings | null,
  paperFormat?: PaperFormat
) => generateInvoicePDF(order, settings, { action: "download", paperFormat });

export const downloadDocPdf = (
  docType: string,
  order: Order,
  settings?: StoreSettings | null,
  paperFormat?: PaperFormat
) => generateInvoicePDF(order, settings, { action: "download", paperFormat });


