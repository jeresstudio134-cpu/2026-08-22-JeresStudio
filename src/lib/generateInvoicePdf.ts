import React from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Order, StoreSettings } from "../types/index.js";
import {
  DocumentType,
  DOCUMENT_CONFIGS,
  PrintDocumentRenderer,
} from "../components/print/PrintDocumentRenderer.js";

export interface GeneratePdfOptions {
  dimensionsMm: [number, number]; // [width, height] in mm
  dimensionsPx: [number, number]; // [width, height] in px
  orientation?: "landscape" | "portrait";
  scale?: number;
}

/**
 * Helper reusable: Render canvas dari element DOM menggunakan html2canvas dan simpan ke jsPDF.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  filename: string,
  options: GeneratePdfOptions
): Promise<void> {
  const { dimensionsMm, dimensionsPx, orientation = "portrait", scale = 3 } = options;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    width: dimensionsPx[0],
    height: dimensionsPx[1],
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png", 1.0);

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: dimensionsMm,
  });

  pdf.addImage(imgData, "PNG", 0, 0, dimensionsMm[0], dimensionsMm[1]);
  pdf.save(filename);
}

/**
 * Generate dan auto-download dokumen PDF apapun (Nota, Surat Jalan, Label, Rekap)
 * menggunakan hidden off-screen container.
 */
export async function downloadDocPdf(
  docType: DocumentType,
  order: Order,
  settings: StoreSettings | null
): Promise<void> {
  const config = DOCUMENT_CONFIGS[docType] || DOCUMENT_CONFIGS.nota;

  // 1. Buat off-screen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-9999px";
  container.style.zIndex = "-9999";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    // 2. Render komponen ke container
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(PrintDocumentRenderer, {
          type: docType,
          order,
          settings,
        })
      );
      setTimeout(resolve, 350);
    });

    const targetNode = container.firstElementChild as HTMLElement;
    if (!targetNode) {
      throw new Error(`Gagal me-render template ${config.title}`);
    }

    // 3. Buat nama file: {JenisDokumen}-{NomorOrder}.pdf
    const sanitizedDocName = config.shortTitle.replace(/[^a-zA-Z0-9]/g, "");
    const sanitizedOrderNo = (order.nomor_nota || "order").replace(/[^a-zA-Z0-9_-]/g, "-");
    const filename = `${sanitizedDocName}-${sanitizedOrderNo}.pdf`;

    // 4. Panggil helper generator PDF
    await generatePdfFromElement(targetNode, filename, {
      dimensionsMm: config.dimensionsMm,
      dimensionsPx: config.dimensionsPx,
      orientation: config.orientation,
      scale: 3,
    });
  } catch (err) {
    console.error(`Gagal generate PDF [${docType}]:`, err);
    throw err;
  } finally {
    // 5. Bersihkan container
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Shorthand functions untuk kemudahan import
 */
export async function downloadInvoicePdf(order: Order, settings: StoreSettings | null): Promise<void> {
  return downloadDocPdf("nota", order, settings);
}

export async function downloadSuratJalanPdf(order: Order, settings: StoreSettings | null): Promise<void> {
  return downloadDocPdf("surat-jalan", order, settings);
}

export async function downloadLabelPengirimanPdf(order: Order, settings: StoreSettings | null): Promise<void> {
  return downloadDocPdf("label", order, settings);
}

export async function downloadRekapPembayaranPdf(order: Order, settings: StoreSettings | null): Promise<void> {
  return downloadDocPdf("rekap-pembayaran", order, settings);
}
