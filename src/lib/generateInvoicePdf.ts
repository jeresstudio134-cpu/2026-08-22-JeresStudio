import { generateInvoicePDF } from "../utils/generateInvoicePDF.js";
import { Order, StoreSettings } from "../types/index.js";

/**
 * Proxy and Re-export of Invoice PDF Generator
 * Menjaga backwards compatibility dan kemudahan import di seluruh codebase.
 */
export {
  generateInvoicePDF,
  generateSuratJalanPDF,
  generateTandaTerimaPDF,
  printInvoiceById,
  createPrintTab,
  type InvoicePdfOptions,
  type InvoicePdfResult,
} from "../utils/generateInvoicePDF.js";

// Shorthand helper aliases
export const openInvoicePdf = (order: Order, settings?: StoreSettings | null, targetWindow?: Window | null) =>
  generateInvoicePDF(order, settings, { action: "open", targetWindow });

export const downloadInvoicePdf = (order: Order, settings?: StoreSettings | null) =>
  generateInvoicePDF(order, settings, { action: "download" });

export const downloadDocPdf = (docType: string, order: Order, settings?: StoreSettings | null) =>
  generateInvoicePDF(order, settings, { action: "download" });

