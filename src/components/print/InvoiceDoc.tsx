import React, { forwardRef } from "react";
import { Order, StoreSettings } from "../../types/index.js";
import { formatRupiah, formatTanggal, getStatusBayarBadge, terbilang } from "../../lib/utils.js";
import { Phone, MapPin, Mail } from "lucide-react";

interface InvoiceDocProps {
  order: Order;
  settings: StoreSettings | null;
}

// Fixed dimensions for A6 Landscape: 148mm x 105mm (~559px x 397px at 96 DPI)
export const INVOICE_WIDTH_PX = 559;
export const INVOICE_HEIGHT_PX = 397;

export const InvoiceDoc = forwardRef<HTMLDivElement, InvoiceDocProps>(
  ({ order, settings }, ref) => {
    const statusBayar = getStatusBayarBadge(order.status_bayar);
    const sisaBayar = Math.max(0, order.total - (order.jumlah_dp || 0));

    return (
      <div
        ref={ref}
        id="invoice-document"
        className="invoice-fixed-root"
        style={{
          width: `${INVOICE_WIDTH_PX}px`,
          height: `${INVOICE_HEIGHT_PX}px`,
          maxHeight: `${INVOICE_HEIGHT_PX}px`,
          padding: "10px 14px 8px 14px",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          color: "#18181b",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: "9.5px",
          lineHeight: 1.25,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Header Store & Invoice Meta */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px solid #0f172a",
              paddingBottom: "6px",
              marginBottom: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
              {/* Logo */}
              {settings?.logo_url ? (
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    flexShrink: 0,
                    borderRadius: "6px",
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
                    width: "42px",
                    height: "42px",
                    flexShrink: 0,
                    borderRadius: "6px",
                    backgroundColor: "#1e3a8a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontWeight: 900,
                    fontSize: "14px",
                    letterSpacing: "1px",
                  }}
                >
                  JS
                </div>
              )}

              {/* Info Toko */}
              <div>
                <h1
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#1e3a8a",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {settings?.nama_toko || "JERES STUDIO"}
                </h1>
                <p style={{ fontSize: "9px", color: "#475569", fontWeight: 600, margin: "1px 0" }}>
                  {settings?.slogan || "Percetakan Digital, Stiker, DTF & Sablon Jersey"}
                </p>
                <div style={{ fontSize: "8px", color: "#64748b" }}>
                  <p style={{ display: "flex", alignItems: "center", gap: "3px", margin: "1px 0" }}>
                    <MapPin size={9} color="#94a3b8" />
                    <span>{settings?.alamat || "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif"}</span>
                  </p>
                  <p style={{ display: "flex", alignItems: "center", gap: "3px", margin: "1px 0" }}>
                    <Phone size={9} color="#94a3b8" />
                    <span>WA: {settings?.no_wa || "0812-3456-7890"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Nomor & Tanggal Invoice */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 900,
                  color: "#1e3a8a",
                  margin: "0 0 2px 0",
                  letterSpacing: "0.02em",
                }}
              >
                INVOICE
              </h2>
              <div
                style={{
                  display: "inline-block",
                  padding: "1px 6px",
                  fontSize: "9px",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  borderRadius: "3px",
                  marginBottom: "2px",
                }}
              >
                {order.nomor_nota}
              </div>
              <p style={{ color: "#475569", fontSize: "8.5px", margin: "1px 0" }}>
                Tgl: <strong style={{ color: "#0f172a" }}>{formatTanggal(order.tanggal_order, true)}</strong>
              </p>
              {order.tanggal_ambil && (
                <p style={{ color: "#475569", fontSize: "8.5px", margin: "1px 0" }}>
                  Jatuh Tempo: <strong style={{ color: "#b91c1c" }}>{formatTanggal(order.tanggal_ambil)}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Kolom Informasi Pelanggan & Status */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "8px",
              padding: "4px 8px",
              marginBottom: "6px",
              backgroundColor: "#f8fafc",
              borderRadius: "5px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <span style={{ fontSize: "8px", textTransform: "uppercase", fontWeight: 700, color: "#64748b", letterSpacing: "0.04em" }}>
                Tagihan Kepada:
              </span>
              <p style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a", margin: "1px 0" }}>
                {order.nama_pelanggan}
              </p>
              <p style={{ color: "#475569", fontSize: "8.5px", margin: 0 }}>
                No. WhatsApp: <strong>{order.no_wa}</strong>
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "8px", textTransform: "uppercase", fontWeight: 700, color: "#64748b", letterSpacing: "0.04em" }}>
                Status Pembayaran:
              </span>
              <div style={{ marginTop: "1px" }}>
                <span
                  className={statusBayar.bg}
                  style={{
                    display: "inline-block",
                    padding: "1px 6px",
                    borderRadius: "3px",
                    fontSize: "8.5px",
                    fontWeight: 800,
                    border: "1px solid currentColor",
                  }}
                >
                  {statusBayar.label.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: "8px", color: "#64748b", margin: "1px 0 0" }}>
                Metode: <strong>{order.metode_bayar}</strong>
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table
            style={{
              width: "100%",
              textAlign: "left",
              borderCollapse: "collapse",
              marginBottom: "5px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#1e293b",
                  color: "#ffffff",
                  fontSize: "8.5px",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: "3px 5px", width: "20px", textAlign: "center" }}>No</th>
                <th style={{ padding: "3px 5px" }}>Item Cetakan & Spesifikasi</th>
                <th style={{ padding: "3px 5px", width: "50px", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "3px 5px", width: "70px", textAlign: "right" }}>Harga</th>
                <th style={{ padding: "3px 5px", width: "75px", textAlign: "right" }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      backgroundColor: idx % 2 === 1 ? "#f8fafc" : "#ffffff",
                    }}
                  >
                    <td style={{ padding: "2.5px 5px", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "3.5px 5px", textAlign: "left" }}>
                      <p style={{ fontWeight: 700, fontSize: "9.5px", margin: 0, color: "#0f172a", textAlign: "left" }}>
                        {item.nama_item}
                      </p>
                      {item.catatan_item && (
                        <p style={{ fontSize: "7.5px", color: "#64748b", fontStyle: "italic", margin: "2px 0 0", textAlign: "left" }}>
                          Catatan: {item.catatan_item}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: "2.5px 5px", textAlign: "center", fontWeight: 600 }}>
                      {item.qty} <span style={{ color: "#64748b", fontSize: "8px" }}>{item.satuan}</span>
                    </td>
                    <td style={{ padding: "2.5px 5px", textAlign: "right", fontFamily: "monospace" }}>
                      {formatRupiah(item.harga_satuan)}
                    </td>
                    <td style={{ padding: "2.5px 5px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                      {formatRupiah(item.subtotal)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "6px", textAlign: "center", color: "#94a3b8" }}>
                    Tidak ada rincian item
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Notes/Bank Info + Totals + Signatures */}
        <div>
          {/* Summary & Calculations */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "10px",
              borderTop: "1px solid #cbd5e1",
              paddingTop: "4px",
              marginBottom: "5px",
            }}
          >
            <div>
              {order.catatan && (
                <div
                  style={{
                    padding: "3px 6px",
                    backgroundColor: "#fffbeb",
                    borderRadius: "4px",
                    border: "1px solid #fef3c7",
                    fontSize: "7.5px",
                    color: "#92400e",
                    marginBottom: "3px",
                  }}
                >
                  <strong style={{ color: "#78350f" }}>Catatan: </strong>
                  <span>{order.catatan}</span>
                </div>
              )}
              <div style={{ fontSize: "7.5px", color: "#64748b", lineHeight: 1.2 }}>
                <strong style={{ color: "#334155" }}>Transfer Bank: </strong>
                <span style={{ fontFamily: "monospace" }}>{settings?.rekening_bank || "BCA 123-456-7890 (Jeres Studio)"}</span>
              </div>
              <div style={{ fontSize: "7.5px", color: "#475569", marginTop: "2px", fontStyle: "italic" }}>
                <strong>Terbilang: </strong>
                <span>{terbilang(order.total)}</span>
              </div>
            </div>

            <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: "9.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {order.diskon > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626", fontWeight: 600, fontSize: "8.5px" }}>
                  <span>Diskon:</span>
                  <span>- {formatRupiah(order.diskon)}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#0f172a",
                  fontWeight: 900,
                  fontSize: "11px",
                  borderTop: "1.5px solid #0f172a",
                  paddingTop: "2px",
                  marginTop: "1px",
                }}
              >
                <span style={{ textDecoration: "underline" }}>TOTAL:</span>
                <span style={{ textDecoration: "underline" }}>{formatRupiah(order.total)}</span>
              </div>
              {order.status_bayar === "dp" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#4338ca", fontWeight: 600, fontSize: "8.5px", marginTop: "1px" }}>
                    <span>Uang Muka (DP):</span>
                    <span>{formatRupiah(order.jumlah_dp)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#b45309",
                      fontWeight: 800,
                      fontSize: "9px",
                      backgroundColor: "#fef3c7",
                      padding: "1px 3px",
                      borderRadius: "3px",
                      marginTop: "1px",
                    }}
                  >
                    <span>Sisa Tagihan:</span>
                    <span>{formatRupiah(sisaBayar)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Signatures & Footer */}
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "4px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "6px",
                textAlign: "center",
                fontSize: "8.5px",
                marginBottom: "3px",
              }}
            >
              <div>
                <p style={{ color: "#64748b", margin: "0 0 14px 0", fontSize: "8px" }}>Dengan Hormat,</p>
                <p
                  style={{
                    fontWeight: 700,
                    color: "#0f172a",
                    borderTop: "1px solid #cbd5e1",
                    paddingTop: "1px",
                    display: "inline-block",
                    padding: "1px 8px 0",
                    margin: 0,
                  }}
                >
                  {order.created_by || settings?.nama_toko || "Jeres Studio"}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: "7px", color: "#94a3b8", fontStyle: "italic" }}>
                  Terima kasih atas kepercayaannya
                </div>
              </div>

              <div>
                <p style={{ color: "#64748b", margin: "0 0 14px 0", fontSize: "8px" }}>Penerima / Pelanggan,</p>
                <p
                  style={{
                    fontWeight: 700,
                    color: "#0f172a",
                    borderTop: "1px solid #cbd5e1",
                    paddingTop: "1px",
                    display: "inline-block",
                    padding: "1px 8px 0",
                    margin: 0,
                  }}
                >
                  {order.nama_pelanggan}
                </p>
              </div>
            </div>

            <div style={{ fontSize: "6.8px", lineHeight: 1.2, color: "#94a3b8", textAlign: "center" }}>
              {settings?.catatan_nota ||
                "1. Barang yang sudah dicetak sesuai file ACC tidak dapat dibatalkan. 2. Pelunasan dilakukan saat serah terima barang."}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InvoiceDoc.displayName = "InvoiceDoc";
