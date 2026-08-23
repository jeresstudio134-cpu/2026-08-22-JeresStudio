import React, { forwardRef } from "react";
import { Order, StoreSettings } from "../../types/index.js";
import { formatTanggal } from "../../lib/utils.js";
import { Phone, MapPin, Truck } from "lucide-react";

interface SuratJalanDocProps {
  order: Order;
  settings: StoreSettings | null;
}

// Fixed dimensions for A5 Portrait: 148mm x 210mm (~559px x 794px at 96 DPI)
export const SURAT_JALAN_WIDTH_PX = 559;
export const SURAT_JALAN_HEIGHT_PX = 794;

export const SuratJalanDoc = forwardRef<HTMLDivElement, SuratJalanDocProps>(
  ({ order, settings }, ref) => {
    return (
      <div
        ref={ref}
        id="surat-jalan-document"
        className="surat-jalan-fixed-root"
        style={{
          width: `${SURAT_JALAN_WIDTH_PX}px`,
          height: `${SURAT_JALAN_HEIGHT_PX}px`,
          maxHeight: `${SURAT_JALAN_HEIGHT_PX}px`,
          padding: "16px 20px",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: "10.5px",
          lineHeight: 1.35,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Top Header */}
        <div>
          {/* Store info & Header Title */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2.5px solid #0f172a",
              paddingBottom: "10px",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              {settings?.logo_url ? (
                <div
                  style={{
                    width: "48px",
                    height: "48px",
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
                    width: "48px",
                    height: "48px",
                    flexShrink: 0,
                    borderRadius: "6px",
                    backgroundColor: "#1e3a8a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontWeight: 900,
                    fontSize: "16px",
                  }}
                >
                  JS
                </div>
              )}

              <div>
                <h1
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#1e3a8a",
                    margin: 0,
                  }}
                >
                  {settings?.nama_toko || "JERES STUDIO"}
                </h1>
                <p style={{ fontSize: "10px", color: "#475569", fontWeight: 600, margin: "2px 0" }}>
                  {settings?.slogan || "Percetakan Digital, Stiker, DTF & Sablon Jersey"}
                </p>
                <div style={{ fontSize: "9px", color: "#64748b" }}>
                  <p style={{ display: "flex", alignItems: "center", gap: "4px", margin: "1px 0" }}>
                    <MapPin size={10} color="#94a3b8" />
                    <span>{settings?.alamat || "Jl. Percetakan Raya No. 134, Pusat Usaha Kreatif"}</span>
                  </p>
                  <p style={{ display: "flex", alignItems: "center", gap: "4px", margin: "1px 0" }}>
                    <Phone size={10} color="#94a3b8" />
                    <span>WhatsApp / CS: {settings?.no_wa || "0812-3456-7890"}</span>
                  </p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "15px",
                  fontWeight: 900,
                  color: "#0f172a",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  borderBottom: "1.5px solid #0f172a",
                  paddingBottom: "2px",
                  marginBottom: "4px",
                }}
              >
                <Truck size={16} />
                <span>SURAT JALAN</span>
              </div>
              <p style={{ fontFamily: "monospace", fontSize: "10.5px", fontWeight: 700, margin: "2px 0", color: "#1e3a8a" }}>
                No: SJ-{order.nomor_nota}
              </p>
              <p style={{ fontSize: "9px", color: "#475569", margin: "1px 0" }}>
                Ref. Order: <strong>{order.nomor_nota}</strong>
              </p>
              <p style={{ fontSize: "9px", color: "#475569", margin: "1px 0" }}>
                Tanggal: <strong>{formatTanggal(order.tanggal_order, true)}</strong>
              </p>
            </div>
          </div>

          {/* Delivery & Destination Info Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              padding: "10px 12px",
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              marginBottom: "14px",
            }}
          >
            <div>
              <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: 700, color: "#64748b", letterSpacing: "0.05em" }}>
                Tujuan Pengiriman / Penerima:
              </span>
              <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", margin: "2px 0 1px" }}>
                {order.nama_pelanggan}
              </p>
              <p style={{ fontSize: "10px", color: "#334155", margin: "1px 0" }}>
                Kontak: <strong>{order.no_wa}</strong>
              </p>
            </div>

            <div style={{ borderLeft: "1px dashed #cbd5e1", paddingLeft: "12px" }}>
              <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: 700, color: "#64748b", letterSpacing: "0.05em" }}>
                Status & Ketentuan Antar:
              </span>
              <p style={{ fontSize: "10px", color: "#334155", margin: "3px 0 1px" }}>
                Tgl Selesai/Kirim: <strong>{order.tanggal_ambil ? formatTanggal(order.tanggal_ambil) : "Sesuai Jadwal"}</strong>
              </p>
              <p style={{ fontSize: "9.5px", color: "#64748b", margin: 0 }}>
                Metode: <strong>{order.status === "selesai" ? "Siap Kirim / Ambil" : "Pengiriman Bertahap"}</strong>
              </p>
            </div>
          </div>

          {/* Items Table (WITHOUT PRICES) */}
          <div style={{ marginBottom: "12px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#1e293b",
                    color: "#ffffff",
                    fontSize: "9.5px",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: "6px 8px", width: "26px", textAlign: "center" }}>No</th>
                  <th style={{ padding: "6px 8px" }}>Nama Barang & Spesifikasi Item</th>
                  <th style={{ padding: "6px 8px", width: "70px", textAlign: "center" }}>Jumlah</th>
                  <th style={{ padding: "6px 8px", width: "65px", textAlign: "center" }}>Cek Fisik</th>
                  <th style={{ padding: "6px 8px", width: "90px" }}>Keterangan</th>
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
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <p style={{ fontWeight: 700, fontSize: "10.5px", margin: 0, color: "#0f172a" }}>
                          {item.nama_item}
                        </p>
                        {item.catatan_item && (
                          <p style={{ fontSize: "9px", color: "#64748b", fontStyle: "italic", margin: "2px 0 0" }}>
                            {item.catatan_item}
                          </p>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, fontSize: "11px", color: "#0f172a" }}>
                        {item.qty} <span style={{ fontSize: "9px", fontWeight: 500, color: "#64748b" }}>{item.satuan}</span>
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                        <div
                          style={{
                            width: "14px",
                            height: "14px",
                            border: "1.5px solid #64748b",
                            borderRadius: "3px",
                            margin: "0 auto",
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: "9px", color: "#475569" }}>
                        {item.catatan_item ? "Khusus" : "Kondisi Baik"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "12px", textAlign: "center", color: "#94a3b8" }}>
                      Tidak ada data barang
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes / Special Instructions */}
          {order.catatan && (
            <div
              style={{
                padding: "8px 10px",
                backgroundColor: "#fffbeb",
                border: "1px solid #fef3c7",
                borderRadius: "6px",
                fontSize: "9px",
                color: "#92400e",
                marginBottom: "12px",
              }}
            >
              <strong style={{ color: "#78350f" }}>Catatan Tambahan / Instruksi Kurir:</strong>
              <p style={{ margin: "2px 0 0", whiteSpace: "pre-line" }}>{order.catatan}</p>
            </div>
          )}
        </div>

        {/* Footer & 3 Signature Columns */}
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "10px",
              textAlign: "center",
              borderTop: "2px solid #0f172a",
              paddingTop: "10px",
              marginBottom: "10px",
            }}
          >
            <div>
              <p style={{ color: "#64748b", fontSize: "9.5px", margin: "0 0 38px 0" }}>Yang Menyerahkan,</p>
              <p
                style={{
                  fontWeight: 700,
                  color: "#0f172a",
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "3px",
                  display: "inline-block",
                  padding: "3px 14px 0",
                  margin: 0,
                  fontSize: "10px",
                }}
              >
                {order.created_by || "Admin / Staff"}
              </p>
            </div>

            <div>
              <p style={{ color: "#64748b", fontSize: "9.5px", margin: "0 0 38px 0" }}>Kurir / Pengantar,</p>
              <p
                style={{
                  fontWeight: 700,
                  color: "#0f172a",
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "3px",
                  display: "inline-block",
                  padding: "3px 14px 0",
                  margin: 0,
                  fontSize: "10px",
                }}
              >
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
              </p>
            </div>

            <div>
              <p style={{ color: "#64748b", fontSize: "9.5px", margin: "0 0 38px 0" }}>Penerima Barang,</p>
              <p
                style={{
                  fontWeight: 700,
                  color: "#0f172a",
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "3px",
                  display: "inline-block",
                  padding: "3px 14px 0",
                  margin: 0,
                  fontSize: "10px",
                }}
              >
                {order.nama_pelanggan}
              </p>
            </div>
          </div>

          {/* Delivery Terms */}
          <div
            style={{
              fontSize: "8px",
              color: "#64748b",
              lineHeight: 1.3,
              backgroundColor: "#f8fafc",
              padding: "6px 8px",
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
            }}
          >
            <strong style={{ color: "#334155" }}>Ketentuan Penerimaan:</strong>
            <span style={{ marginLeft: "4px" }}>
              1. Mohon periksa jumlah dan kondisi fisik barang saat diterima. 2. Klaim kerusakan / kekurangan hanya dilayani saat serah terima barang berlangsung dengan bukti tanda tangan surat jalan ini.
            </span>
          </div>
        </div>
      </div>
    );
  }
);

SuratJalanDoc.displayName = "SuratJalanDoc";
