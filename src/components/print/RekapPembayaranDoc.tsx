import React, { forwardRef } from "react";
import { Order, StoreSettings } from "../../types/index.js";
import { formatRupiah, formatTanggal, getStatusBayarBadge, terbilang } from "../../lib/utils.js";
import { Phone, MapPin, CheckCircle2, CreditCard } from "lucide-react";

interface RekapPembayaranDocProps {
  order: Order;
  settings: StoreSettings | null;
}

// Fixed dimensions for A6 Landscape: 148mm x 105mm (~559px x 397px at 96 DPI)
export const REKAP_WIDTH_PX = 559;
export const REKAP_HEIGHT_PX = 397;

export const RekapPembayaranDoc = forwardRef<HTMLDivElement, RekapPembayaranDocProps>(
  ({ order, settings }, ref) => {
    const statusBayar = getStatusBayarBadge(order.status_bayar);
    const sisaBayar = Math.max(0, order.total - (order.jumlah_dp || 0));
    const nominalTerbayar = order.status_bayar === "lunas" ? order.total : (order.jumlah_dp || 0);

    return (
      <div
        ref={ref}
        id="rekap-pembayaran-document"
        className="rekap-fixed-root"
        style={{
          width: `${REKAP_WIDTH_PX}px`,
          height: `${REKAP_HEIGHT_PX}px`,
          maxHeight: `${REKAP_HEIGHT_PX}px`,
          padding: "12px 16px",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: "9.5px",
          lineHeight: 1.3,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: "2px solid #0f172a",
        }}
      >
        {/* Top Header */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px solid #0f172a",
              paddingBottom: "6px",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              {settings?.logo_url ? (
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    flexShrink: 0,
                    borderRadius: "6px",
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    border: "1px solid #cbd5e1",
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
                    width: "40px",
                    height: "40px",
                    flexShrink: 0,
                    borderRadius: "6px",
                    backgroundColor: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
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
                    fontSize: "13px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  {settings?.nama_toko || "JERES STUDIO"}
                </h1>
                <p style={{ fontSize: "8.5px", color: "#64748b", margin: "1px 0" }}>
                  {settings?.slogan || "Percetakan Digital, Stiker, DTF & Sablon Jersey"}
                </p>
                <div style={{ fontSize: "8px", color: "#64748b" }}>
                  <span>{settings?.alamat || "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif"}</span>
                  <span style={{ margin: "0 4px" }}>•</span>
                  <span>WA: {settings?.no_wa || "0812-3456-7890"}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "13px",
                  fontWeight: 900,
                  color: "#059669",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                <CreditCard size={14} />
                <span>REKAP PEMBAYARAN</span>
              </div>
              <p style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: 700, margin: "2px 0", color: "#0f172a" }}>
                No: PAY-{order.nomor_nota}
              </p>
              <p style={{ fontSize: "8.5px", color: "#64748b", margin: 0 }}>
                Tgl: <strong>{formatTanggal(order.tanggal_order, true)}</strong>
              </p>
            </div>
          </div>

          {/* Customer & Transaction Meta Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "8px",
              padding: "6px 10px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "5px",
              marginBottom: "8px",
            }}
          >
            <div>
              <span style={{ fontSize: "8px", textTransform: "uppercase", fontWeight: 700, color: "#64748b" }}>
                Telah Diterima Dari:
              </span>
              <p style={{ fontSize: "11.5px", fontWeight: 800, color: "#0f172a", margin: "1px 0" }}>
                {order.nama_pelanggan}
              </p>
              <p style={{ fontSize: "8.5px", color: "#475569", margin: 0 }}>
                Kontak: <strong>{order.no_wa}</strong>
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "8px", textTransform: "uppercase", fontWeight: 700, color: "#64748b" }}>
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
              <p style={{ fontSize: "8px", color: "#64748b", margin: "2px 0 0" }}>
                Metode: <strong>{order.metode_bayar}</strong>
              </p>
            </div>
          </div>

          {/* Payment Detail Breakdown Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              marginBottom: "8px",
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
                <th style={{ padding: "3.5px 6px" }}>Rincian Tagihan & Deskripsi Order</th>
                <th style={{ padding: "3.5px 6px", width: "90px", textAlign: "right" }}>Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3.5px 6px" }}>
                  <p style={{ fontWeight: 600, fontSize: "9px", margin: 0 }}>
                    Total Nilai Transaksi #{order.nomor_nota} ({order.items?.length || 0} Iteman)
                  </p>
                  {order.items && order.items.length > 0 && (
                    <p style={{ fontSize: "8px", color: "#64748b", margin: "1px 0 0" }}>
                      Item: {order.items.map((i) => `${i.qty} ${i.satuan} ${i.nama_item}`).join(", ")}
                    </p>
                  )}
                </td>
                <td style={{ padding: "3.5px 6px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                  {formatRupiah(order.subtotal)}
                </td>
              </tr>
              {order.diskon > 0 && (
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#fff1f2" }}>
                  <td style={{ padding: "3px 6px", color: "#be123c", fontWeight: 600 }}>
                    Potongan / Diskon Transaksi
                  </td>
                  <td style={{ padding: "3px 6px", textAlign: "right", fontFamily: "monospace", color: "#be123c", fontWeight: 700 }}>
                    - {formatRupiah(order.diskon)}
                  </td>
                </tr>
              )}
              <tr style={{ borderBottom: "1.5px solid #0f172a", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3.5px 6px", fontWeight: 800, color: "#0f172a" }}>
                  GRAND TOTAL AKHIR
                </td>
                <td style={{ padding: "3.5px 6px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: "10.5px" }}>
                  {formatRupiah(order.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Box: Terbilang, History, and Signature */}
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr",
              gap: "10px",
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "5px",
              padding: "6px 8px",
              marginBottom: "6px",
            }}
          >
            <div>
              <span style={{ fontSize: "8px", textTransform: "uppercase", fontWeight: 700, color: "#64748b" }}>
                Uang Yang Telah Dibayarkan:
              </span>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: "#059669",
                  fontFamily: "monospace",
                  margin: "1px 0",
                }}
              >
                {formatRupiah(nominalTerbayar)}
              </p>
              <div style={{ fontSize: "7.5px", color: "#475569", fontStyle: "italic", lineHeight: 1.2 }}>
                <strong>Terbilang: </strong>
                <span>{terbilang(nominalTerbayar)}</span>
              </div>
            </div>

            <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: "8.5px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>Sudah Masuk:</span>
                <span style={{ fontWeight: 700, color: "#059669" }}>{formatRupiah(nominalTerbayar)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: sisaBayar > 0 ? "#b45309" : "#059669",
                  fontWeight: 800,
                  fontSize: "9.5px",
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: "2px",
                  marginTop: "2px",
                }}
              >
                <span>{sisaBayar > 0 ? "Sisa Tagihan:" : "Status Sisa:"}</span>
                <span>{sisaBayar > 0 ? formatRupiah(sisaBayar) : "LUNAS"}</span>
              </div>
            </div>
          </div>

          {/* Footer & Signature */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              borderTop: "1.5px solid #0f172a",
              paddingTop: "4px",
              textAlign: "center",
              fontSize: "8.5px",
            }}
          >
            <div>
              <p style={{ color: "#64748b", margin: "0 0 14px 0", fontSize: "8px" }}>Penyetor / Pelanggan,</p>
              <p style={{ fontWeight: 700, color: "#0f172a", borderTop: "1px solid #cbd5e1", paddingTop: "1px", display: "inline-block", padding: "1px 12px 0", margin: 0 }}>
                {order.nama_pelanggan}
              </p>
            </div>
            <div>
              <p style={{ color: "#64748b", margin: "0 0 14px 0", fontSize: "8px" }}>Kasir / Penerima Pembayaran,</p>
              <p style={{ fontWeight: 700, color: "#0f172a", borderTop: "1px solid #cbd5e1", paddingTop: "1px", display: "inline-block", padding: "1px 12px 0", margin: 0 }}>
                {order.created_by || settings?.nama_toko || "Kasir Jeres"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

RekapPembayaranDoc.displayName = "RekapPembayaranDoc";
