import React, { forwardRef } from "react";
import { Order, StoreSettings } from "../../types/index.js";
import { formatTanggal } from "../../lib/utils.js";
import { Phone, MapPin, AlertTriangle, Package } from "lucide-react";

interface LabelPengirimanDocProps {
  order: Order;
  settings: StoreSettings | null;
}

// Fixed dimensions for 100mm x 150mm label (~378px x 567px at 96 DPI)
export const LABEL_WIDTH_PX = 378;
export const LABEL_HEIGHT_PX = 567;

export const LabelPengirimanDoc = forwardRef<HTMLDivElement, LabelPengirimanDocProps>(
  ({ order, settings }, ref) => {
    return (
      <div
        ref={ref}
        id="label-pengiriman-document"
        className="label-fixed-root"
        style={{
          width: `${LABEL_WIDTH_PX}px`,
          height: `${LABEL_HEIGHT_PX}px`,
          maxHeight: `${LABEL_HEIGHT_PX}px`,
          padding: "14px",
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
        {/* Top Header & Sender Info */}
        <div>
          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "2px solid #0f172a",
              paddingBottom: "8px",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {settings?.logo_url ? (
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    flexShrink: 0,
                    borderRadius: "4px",
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
                    width: "34px",
                    height: "34px",
                    flexShrink: 0,
                    borderRadius: "4px",
                    backgroundColor: "#1e3a8a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontWeight: 900,
                    fontSize: "13px",
                  }}
                >
                  JS
                </div>
              )}
              <div>
                <h1
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  {settings?.nama_toko || "JERES STUDIO"}
                </h1>
                <p style={{ fontSize: "8.5px", color: "#64748b", margin: 0 }}>
                  WA: <strong>{settings?.no_wa || "0812-3456-7890"}</strong>
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#0f172a",
                color: "#ffffff",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.05em",
                textAlign: "right",
              }}
            >
              LABEL PAKET
            </div>
          </div>

          {/* Barcode & Nomor Order Box */}
          <div
            style={{
              border: "1.5px solid #0f172a",
              borderRadius: "6px",
              padding: "6px 8px",
              marginBottom: "8px",
              textAlign: "center",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
              <span style={{ fontSize: "8px", textTransform: "uppercase", fontWeight: 700, color: "#64748b" }}>
                No. Pesanan:
              </span>
              <span style={{ fontSize: "8px", color: "#64748b" }}>
                {formatTanggal(order.tanggal_order, true)}
              </span>
            </div>
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "14px",
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "0.1em",
                margin: "0 0 4px 0",
              }}
            >
              {order.nomor_nota}
            </p>
            {/* Visual Barcode Pattern */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "2px",
                height: "18px",
                overflow: "hidden",
                opacity: 0.85,
              }}
            >
              {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 3, 2, 4, 1, 2, 3].map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: `${w}px`,
                    height: "100%",
                    backgroundColor: i % 2 === 0 ? "#0f172a" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Penerima Box (Highlight Utama) */}
          <div
            style={{
              border: "2px solid #0f172a",
              borderRadius: "6px",
              padding: "8px 10px",
              marginBottom: "8px",
              backgroundColor: "#ffffff",
            }}
          >
            <span
              style={{
                display: "inline-block",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontSize: "8px",
                fontWeight: 800,
                padding: "1px 6px",
                borderRadius: "3px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "4px",
              }}
            >
              PENERIMA:
            </span>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 900,
                color: "#0f172a",
                margin: "2px 0",
                lineHeight: 1.2,
              }}
            >
              {order.nama_pelanggan}
            </h2>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#1e3a8a",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                margin: "3px 0",
                fontFamily: "monospace",
              }}
            >
              <Phone size={11} color="#1e3a8a" />
              <span>{order.no_wa}</span>
            </div>
            {order.catatan && (
              <div
                style={{
                  fontSize: "8.5px",
                  color: "#475569",
                  marginTop: "4px",
                  paddingTop: "4px",
                  borderTop: "1px dashed #cbd5e1",
                }}
              >
                <strong>Catatan Lokasi/Kirim: </strong>
                <span>{order.catatan}</span>
              </div>
            )}
          </div>

          {/* Package Contents Breakdown */}
          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "6px 8px",
              marginBottom: "8px",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
              <Package size={11} color="#64748b" />
              <span style={{ fontSize: "8.5px", textTransform: "uppercase", fontWeight: 700, color: "#64748b" }}>
                Isi Paket Cetakan ({order.items?.length || 0} Item):
              </span>
            </div>
            <div style={{ maxHeight: "75px", overflow: "hidden" }}>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "8.5px",
                      color: "#334155",
                      borderBottom: idx < order.items!.length - 1 ? "1px dashed #e2e8f0" : "none",
                      padding: "2px 0",
                    }}
                  >
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "230px" }}>
                      • {item.nama_item}
                    </span>
                    <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>
                      {item.qty} {item.satuan}
                    </strong>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "8.5px", color: "#94a3b8", margin: 0 }}>Item cetakan</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Caution & Signatures */}
        <div>
          {/* Caution Alert */}
          <div
            style={{
              border: "1.5px dashed #dc2626",
              borderRadius: "6px",
              padding: "5px 8px",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: "7.5px", color: "#991b1b", lineHeight: 1.2 }}>
              <strong style={{ textTransform: "uppercase", display: "block" }}>PERHATIAN - CETAKAN DIGITAL:</strong>
              <span>JANGAN DIBANTING / JANGAN DITEKUK / HINDARKAN DARI AIR & PANAS</span>
            </div>
          </div>

          {/* Footer Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              borderTop: "1.5px solid #0f172a",
              paddingTop: "6px",
              textAlign: "center",
              fontSize: "8px",
            }}
          >
            <div>
              <p style={{ color: "#64748b", margin: "0 0 12px 0" }}>Pengirim / Toko:</p>
              <p style={{ fontWeight: 800, color: "#0f172a", margin: 0, borderTop: "1px solid #cbd5e1", paddingTop: "2px" }}>
                {settings?.nama_toko || "Jeres Studio"}
              </p>
            </div>
            <div>
              <p style={{ color: "#64748b", margin: "0 0 12px 0" }}>Paraf Kurir / QC:</p>
              <p style={{ fontWeight: 800, color: "#0f172a", margin: 0, borderTop: "1px solid #cbd5e1", paddingTop: "2px" }}>
                [ QC PASS ]
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

LabelPengirimanDoc.displayName = "LabelPengirimanDoc";
