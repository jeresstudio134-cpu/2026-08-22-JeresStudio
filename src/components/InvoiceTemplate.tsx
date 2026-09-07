import React, { forwardRef } from "react";
import { Order, StoreSettings } from "../types/index.js";
import { formatRupiah, formatTanggal, getStatusBayarBadge } from "../lib/utils.js";
import { Phone, MapPin } from "lucide-react";

interface InvoiceTemplateProps {
  order: Order;
  settings: StoreSettings | null;
}

// Ukuran A6 Landscape dalam px (148mm x 105mm @ 96dpi ≈ 3.7795 px/mm)
export const INVOICE_WIDTH_PX = 559;
export const INVOICE_HEIGHT_PX = 397;

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ order, settings }, ref) => {
    const statusBayar = getStatusBayarBadge(order.status_bayar);
    const sisaBayar = Math.max(0, order.total - (order.jumlah_dp || 0));

    return (
      <div
        ref={ref}
        style={{
          width: `${INVOICE_WIDTH_PX}px`,
          height: `${INVOICE_HEIGHT_PX}px`,
          padding: "12px 14px",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          color: "#18181b",
          fontFamily: "sans-serif",
          fontSize: "10px",
          lineHeight: 1.25,
        }}
      >
        {/* Header Store & Invoice Meta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #18181b",
            paddingBottom: "8px",
            marginBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            {settings?.logo_url ? (
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  flexShrink: 0,
                  borderRadius: "8px",
                  overflow: "hidden",
                  backgroundColor: "#fff",
                }}
              >
                <img
                  src={settings.logo_url}
                  alt={settings.nama_toko || "Logo Toko"}
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  flexShrink: 0,
                  borderRadius: "8px",
                  backgroundColor: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "14px",
                }}
              >
                JS
              </div>
            )}

            <div>
              <h1
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {settings?.nama_toko || "JERES STUDIO"}
              </h1>
              <p style={{ fontSize: "9.5px", color: "#52525b", fontWeight: 500, margin: "2px 0" }}>
                {settings?.slogan || "Percetakan Digital, Stiker, DTF & Sablon Jersey"}
              </p>
              <div style={{ fontSize: "8.5px", color: "#52525b" }}>
                <p style={{ display: "flex", alignItems: "center", gap: "4px", margin: "1px 0" }}>
                  <MapPin size={10} color="#a1a1aa" />
                  <span>{settings?.alamat || "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif"}</span>
                </p>
                <p style={{ display: "flex", alignItems: "center", gap: "4px", margin: "1px 0" }}>
                  <Phone size={10} color="#a1a1aa" />
                  <span>WhatsApp: {settings?.no_wa || "0812-3456-7890"}</span>
                </p>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                display: "inline-block",
                padding: "2px 10px",
                fontSize: "9.5px",
                backgroundColor: "#18181b",
                color: "#fff",
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: "0.05em",
                borderRadius: "4px",
              }}
            >
              NOTA PESANAN
            </div>
            <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12px", margin: "3px 0 0" }}>
              {order.nomor_nota}
            </p>
            <p style={{ color: "#52525b", fontSize: "9px", margin: "1px 0" }}>
              Tgl: <span style={{ fontWeight: 600, color: "#27272a" }}>{formatTanggal(order.tanggal_order, true)}</span>
            </p>
            {order.tanggal_ambil && (
              <p style={{ color: "#52525b", fontSize: "9px", margin: "1px 0" }}>
                Ambil: <span style={{ fontWeight: 600, color: "#27272a" }}>{formatTanggal(order.tanggal_ambil)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Customer Info & Status Bayar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            padding: "6px",
            marginBottom: "8px",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
            border: "1px solid #e4e4e7",
          }}
        >
          <div>
            <span style={{ fontSize: "8.5px", textTransform: "uppercase", fontWeight: 700, color: "#71717a" }}>
              Pemesan:
            </span>
            <p style={{ fontSize: "12px", fontWeight: 700, margin: "1px 0" }}>{order.nama_pelanggan}</p>
            <p style={{ color: "#52525b", fontSize: "9.5px", margin: 0 }}>WA: {order.no_wa}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "8.5px", textTransform: "uppercase", fontWeight: 700, color: "#71717a" }}>
              Status Pembayaran:
            </span>
            <div style={{ marginTop: "2px" }}>
              <span
                className={statusBayar.bg}
                style={{
                  display: "inline-block",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  border: "1px solid currentColor",
                }}
              >
                {statusBayar.label.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: "9px", color: "#71717a", margin: "2px 0 0" }}>
              Metode: {order.metode_bayar}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", marginBottom: "8px" }}>
          <thead>
            <tr
              style={{
                borderTop: "2px solid #18181b",
                borderBottom: "2px solid #18181b",
                fontSize: "9px",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "#3f3f46",
                backgroundColor: "#f4f4f5",
              }}
            >
              <th style={{ padding: "4px 6px", width: "24px", textAlign: "center" }}>No</th>
              <th style={{ padding: "4px 6px" }}>Iteman & Spesifikasi</th>
              <th style={{ padding: "4px 6px", width: "56px", textAlign: "center" }}>Qty</th>
              <th style={{ padding: "4px 6px", width: "80px", textAlign: "right" }}>Harga Satuan</th>
              <th style={{ padding: "4px 6px", width: "88px", textAlign: "right" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items && order.items.length > 0 ? (
              order.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e4e4e7" }}>
                  <td style={{ padding: "4px 6px", textAlign: "center", color: "#71717a", fontFamily: "monospace" }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: "4px 6px" }}>
                    <p style={{ fontWeight: 600, fontSize: "10px", margin: 0 }}>{item.nama_item}</p>
                    {item.catatan_item && (
                      <p style={{ fontSize: "8.5px", color: "#71717a", fontStyle: "italic", margin: "1px 0 0" }}>
                        {item.catatan_item}
                      </p>
                    )}
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 500 }}>
                    {item.qty} <span style={{ color: "#71717a", fontSize: "8.5px" }}>{item.satuan}</span>
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace" }}>
                    {formatRupiah(item.harga_satuan)}
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                    {formatRupiah(item.subtotal)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: "10px", textAlign: "center", color: "#a1a1aa" }}>
                  Tidak ada rincian item
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Summary & Calculations */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", borderTop: "1px solid #d4d4d8", paddingTop: "6px", marginBottom: "8px" }}>
          <div>
            {order.catatan && (
              <div
                style={{
                  padding: "6px",
                  backgroundColor: "#fffbeb",
                  borderRadius: "6px",
                  border: "1px solid #fde68a",
                  fontSize: "8.5px",
                  color: "#78350f",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontWeight: 700 }}>Catatan Khusus:</span>
                <p style={{ whiteSpace: "pre-line", margin: "2px 0 0" }}>{order.catatan}</p>
              </div>
            )}
            <div style={{ fontSize: "8px", color: "#71717a" }}>
              <p style={{ fontWeight: 700, color: "#3f3f46", margin: 0 }}>Info Pembayaran / Transfer Bank:</p>
              <p style={{ whiteSpace: "pre-line", fontFamily: "monospace", margin: "2px 0 0" }}>{settings?.rekening_bank}</p>
            </div>
          </div>

          <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: "10.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#52525b" }}>
              <span>Subtotal:</span>
              <span>{formatRupiah(order.subtotal)}</span>
            </div>
            {order.diskon > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#e11d48", fontWeight: 500, fontSize: "9.5px" }}>
                <span>Diskon:</span>
                <span>- {formatRupiah(order.diskon)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#09090b",
                fontWeight: 700,
                fontSize: "12px",
                borderTop: "1px solid #18181b",
                paddingTop: "2px",
                marginTop: "2px",
              }}
            >
              <span>Grand Total:</span>
              <span>{formatRupiah(order.total)}</span>
            </div>
            {order.status_bayar === "dp" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#4338ca", fontWeight: 500, fontSize: "9.5px", marginTop: "2px" }}>
                  <span>Uang Muka (DP):</span>
                  <span>{formatRupiah(order.jumlah_dp)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#b45309",
                    fontWeight: 700,
                    fontSize: "9.5px",
                    backgroundColor: "#fffbeb",
                    padding: "2px 4px",
                    borderRadius: "4px",
                  }}
                >
                  <span>Sisa Pelunasan:</span>
                  <span>{formatRupiah(sisaBayar)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Terms & Signatures */}
        <div style={{ borderTop: "2px solid #18181b", paddingTop: "6px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center", fontSize: "9.5px", marginBottom: "6px" }}>
            <div>
              <p style={{ color: "#71717a", marginBottom: "16px", fontSize: "9px" }}>Hormat Kami,</p>
              <p style={{ fontWeight: 700, color: "#27272a", borderTop: "1px solid #d4d4d8", paddingTop: "2px", display: "inline-block", padding: "2px 12px 0" }}>
                {order.created_by || "Kasir Jeres"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: "8px", color: "#71717a", fontStyle: "italic", padding: "0 4px" }}>
                Terima kasih atas kepercayaan Anda mencetak di Jeres Studio!
              </div>
            </div>
            <div>
              <p style={{ color: "#71717a", marginBottom: "16px", fontSize: "9px" }}>Penerima / Pelanggan,</p>
              <p style={{ fontWeight: 700, color: "#27272a", borderTop: "1px solid #d4d4d8", paddingTop: "2px", display: "inline-block", padding: "2px 12px 0" }}>
                {order.nama_pelanggan}
              </p>
            </div>
          </div>

          <div style={{ fontSize: "7.5px", lineHeight: 1.3, color: "#a1a1aa" }}>
            <span style={{ fontWeight: 600, color: "#71717a" }}>Syarat & Ketentuan: </span>
            {settings?.catatan_nota ||
              "1. Barang yang sudah dicetak sesuai file yang disetujui tidak dapat dibatalkan. 2. Pelunasan dilakukan saat pengambilan barang. 3. File desain pesanan disimpan maksimal 30 hari."}
          </div>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = "InvoiceTemplate";