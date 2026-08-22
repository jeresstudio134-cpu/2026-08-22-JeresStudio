import React, { useState, useEffect, useMemo } from "react";
import { Order, OrderItem, Product, StoreSettings } from "../../types/index.js";
import { api } from "../../lib/api.js";
import {
  formatRupiah,
  formatTanggal,
  formatTanggalInput,
  getStatusBadge,
  getStatusBayarBadge,
  createWALink,
} from "../../lib/utils.js";
import {
  Plus,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  Download,
  MessageCircle,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  User,
  Phone,
  Layers,
  X,
  CreditCard,
} from "lucide-react";

interface AdminOrdersProps {
  onPrintOrder: (order: Order) => void;
  settings: StoreSettings | null;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ onPrintOrder, settings }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bayarFilter, setBayarFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Form State
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formStatus, setFormStatus] = useState<"pending" | "proses" | "selesai" | "dibatalkan">("pending");
  const [formMetodeBayar, setFormMetodeBayar] = useState("Cash");
  const [formStatusBayar, setFormStatusBayar] = useState<"belum" | "dp" | "lunas">("belum");
  const [formJumlahDp, setFormJumlahDp] = useState<number>(0);
  const [formCatatan, setFormCatatan] = useState("");
  const [formDiskon, setFormDiskon] = useState<number>(0);

  // Items in Order Form
  const [formItems, setFormItems] = useState<
    Array<{
      product_id: number | null;
      nama_item: string;
      qty: number;
      satuan: string;
      harga_satuan: number;
      catatan_item: string;
    }>
  >([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [orderRes, prodRes] = await Promise.all([
        api.getOrders({
          status: statusFilter,
          status_bayar: bayarFilter,
          search,
          startDate,
          endDate,
        }),
        api.getProducts({ activeOnly: false }),
      ]);
      setOrders(orderRes.orders);
      setProducts(prodRes.products);
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [statusFilter, bayarFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAll();
  };

  // Form Calculation
  const subtotalComputed = useMemo(() => {
    return formItems.reduce((sum, item) => sum + (Number(item.qty) || 1) * (Number(item.harga_satuan) || 0), 0);
  }, [formItems]);

  const grandTotalComputed = useMemo(() => {
    return Math.max(0, subtotalComputed - (Number(formDiskon) || 0));
  }, [subtotalComputed, formDiskon]);

  const handleOpenAdd = () => {
    setEditingOrder(null);
    setFormCustomerName("");
    setFormCustomerPhone("");
    setFormDeadline("");
    setFormStatus("pending");
    setFormMetodeBayar("Cash");
    setFormStatusBayar("belum");
    setFormJumlahDp(0);
    setFormCatatan("");
    setFormDiskon(0);

    // Initial 1 item
    if (products.length > 0) {
      const firstProd = products[0];
      setFormItems([
        {
          product_id: firstProd.id,
          nama_item: firstProd.nama_item,
          qty: 1,
          satuan: firstProd.satuan,
          harga_satuan: firstProd.harga,
          catatan_item: "",
        },
      ]);
    } else {
      setFormItems([
        {
          product_id: null,
          nama_item: "Cetak Stiker Vinyl",
          qty: 1,
          satuan: "meter",
          harga_satuan: 85000,
          catatan_item: "",
        },
      ]);
    }

    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setFormCustomerName(order.nama_pelanggan);
    setFormCustomerPhone(order.no_wa);
    setFormDeadline(formatTanggalInput(order.tanggal_ambil));
    setFormStatus(order.status);
    setFormMetodeBayar(order.metode_bayar);
    setFormStatusBayar(order.status_bayar);
    setFormJumlahDp(order.jumlah_dp || 0);
    setFormCatatan(order.catatan || "");
    setFormDiskon(order.diskon || 0);

    if (order.items && order.items.length > 0) {
      setFormItems(
        order.items.map((i) => ({
          product_id: i.product_id || null,
          nama_item: i.nama_item,
          qty: i.qty,
          satuan: i.satuan,
          harga_satuan: i.harga_satuan,
          catatan_item: i.catatan_item || "",
        }))
      );
    } else {
      setFormItems([
        {
          product_id: null,
          nama_item: "Item Cetakan",
          qty: 1,
          satuan: "pcs",
          harga_satuan: order.total,
          catatan_item: "",
        },
      ]);
    }

    setFormError(null);
    setModalOpen(true);
  };

  // Add Item in Order
  const handleAddItem = () => {
    const defaultProd = products[0];
    setFormItems([
      ...formItems,
      {
        product_id: defaultProd ? defaultProd.id : null,
        nama_item: defaultProd ? defaultProd.nama_item : "Item Custom Cetak",
        qty: 1,
        satuan: defaultProd ? defaultProd.satuan : "pcs",
        harga_satuan: defaultProd ? defaultProd.harga : 0,
        catatan_item: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) {
      alert("Pesanan harus memiliki minimal 1 item!");
      return;
    }
    const updated = [...formItems];
    updated.splice(index, 1);
    setFormItems(updated);
  };

  const handleItemProductSelect = (index: number, prodId: string) => {
    const updated = [...formItems];
    if (prodId === "custom") {
      updated[index].product_id = null;
      updated[index].nama_item = "Item Custom";
      updated[index].satuan = "pcs";
    } else {
      const prod = products.find((p) => p.id === Number(prodId));
      if (prod) {
        updated[index].product_id = prod.id;
        updated[index].nama_item = prod.nama_item;
        updated[index].satuan = prod.satuan;
        updated[index].harga_satuan = prod.harga;
      }
    }
    setFormItems(updated);
  };

  const handleItemFieldChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    (updated[index] as any)[field] = value;
    setFormItems(updated);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerName || !formCustomerPhone) {
      setFormError("Nama pelanggan dan nomor WhatsApp wajib diisi.");
      return;
    }

    if (formItems.length === 0) {
      setFormError("Minimal harus ada 1 item pesanan.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload = {
        nama_pelanggan: formCustomerName,
        no_wa: formCustomerPhone,
        tanggal_ambil: formDeadline ? new Date(formDeadline).toISOString() : null,
        status: formStatus,
        metode_bayar: formMetodeBayar,
        status_bayar: formStatusBayar,
        jumlah_dp: Number(formJumlahDp) || 0,
        catatan: formCatatan,
        diskon: Number(formDiskon) || 0,
        items: formItems,
      };

      if (editingOrder) {
        await api.updateOrder(editingOrder.id, payload);
      } else {
        const created = await api.createOrder(payload);
        // Prompt to print or view
        if (confirm(`Order ${created.order.nomor_nota} berhasil dibuat! Ingin langsung cetak nota A5?`)) {
          onPrintOrder(created.order);
        }
      }

      setModalOpen(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan pesanan");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async (id: number, nota: string) => {
    if (confirm(`Hapus nota ${nota} secara permanen?`)) {
      try {
        await api.deleteOrder(id);
        fetchAll();
      } catch (err: any) {
        alert(err.message || "Gagal menghapus order");
      }
    }
  };

  const handleQuickStatus = async (id: number, status: string) => {
    try {
      await api.updateOrderStatus(id, { status });
      fetchAll();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status");
    }
  };

  const handleQuickBayar = async (id: number, status_bayar: string) => {
    try {
      await api.updateOrderStatus(id, { status_bayar });
      fetchAll();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status bayar");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert("Tidak ada data order untuk diekspor!");
      return;
    }

    const headers = [
      "No. Nota",
      "Tanggal Order",
      "Deadline/Ambil",
      "Nama Pelanggan",
      "No WA",
      "Status Order",
      "Status Bayar",
      "Metode Bayar",
      "Subtotal",
      "Diskon",
      "Total",
      "DP",
      "Catatan",
    ];

    const rows = orders.map((o) => [
      `"${o.nomor_nota}"`,
      `"${formatTanggal(o.tanggal_order)}"`,
      `"${formatTanggal(o.tanggal_ambil)}"`,
      `"${o.nama_pelanggan.replace(/"/g, '""')}"`,
      `"${o.no_wa}"`,
      `"${o.status}"`,
      `"${o.status_bayar}"`,
      `"${o.metode_bayar}"`,
      o.subtotal,
      o.diskon,
      o.total,
      o.jumlah_dp,
      `"${(o.catatan || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-orderan-jeres-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter((o) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        o.nomor_nota.toLowerCase().includes(q) ||
        o.nama_pelanggan.toLowerCase().includes(q) ||
        o.no_wa.includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Manajemen Orderan & Nota
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola transaksi, status cetak, pembayaran DP, dan cetak nota order
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Buat Nota Order Baru
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari no. nota / nama pelanggan / WA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status Order Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Status Order</option>
            <option value="pending">Pending</option>
            <option value="proses">Dalam Proses</option>
            <option value="selesai">Selesai</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>

          {/* Status Bayar Filter */}
          <select
            value={bayarFilter}
            onChange={(e) => setBayarFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Status Bayar</option>
            <option value="lunas">Lunas</option>
            <option value="dp">DP (Uang Muka)</option>
            <option value="belum">Belum Bayar</option>
          </select>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setBayarFilter("all");
              setStartDate("");
              setEndDate("");
            }}
            className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            Reset Filter
          </button>
        </form>
      </div>

      {/* Orders Container: Desktop Table (>= 1280px / xl) & Tablet/Mobile Responsive Cards (< 1280px) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Desktop Table View (>= 1280px / xl) */}
        <div className="hidden xl:block">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3.5 px-4 w-[13%]">No. Nota</th>
                <th className="py-3.5 px-4 w-[17%]">Pelanggan</th>
                <th className="py-3.5 px-4 w-[14%]">Tanggal / Ambil</th>
                <th className="py-3.5 px-4 w-[21%]">Item Cetak</th>
                <th className="py-3.5 px-3 w-[11%]">Status Order</th>
                <th className="py-3.5 px-3 w-[11%]">Status Bayar</th>
                <th className="py-3.5 px-3 text-right w-[13%]">Total</th>
                <th className="py-3.5 px-3 text-center w-[12%]">Cetak & Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const statusBadge = getStatusBadge(order.status);
                  const bayarBadge = getStatusBayarBadge(order.status_bayar);

                  const waNoticeLink = createWALink(
                    order.no_wa,
                    `Halo Kak ${order.nama_pelanggan}, kami dari Jeres Studio ingin menginfokan bahwa pesanan dengan nota ${order.nomor_nota} statusnya saat ini: *${statusBadge.label.toUpperCase()}*. Total: ${formatRupiah(order.total)} (${bayarBadge.label}). Terima kasih!`
                  );

                  return (
                    <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block text-xs truncate">
                          {order.nomor_nota}
                        </span>
                        <span className="text-[10px] text-zinc-400">{order.created_by || "Admin"}</span>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <p className="font-bold text-zinc-900 dark:text-white text-xs truncate">{order.nama_pelanggan}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-zinc-500 font-mono truncate">{order.no_wa}</span>
                          <a
                            href={waNoticeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-500 shrink-0"
                            title="Chat WA Pelanggan"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top text-zinc-600 dark:text-zinc-400">
                        <p className="text-[11px]">{formatTanggal(order.tanggal_order)}</p>
                        {order.tanggal_ambil && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span className="truncate">Deadline: {formatTanggal(order.tanggal_ambil)}</span>
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-0.5">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <p key={idx} className="truncate text-zinc-700 dark:text-zinc-300 text-[11px]">
                                • {item.qty} {item.satuan} {item.nama_item}
                              </p>
                            ))}
                            {order.items.length > 2 && (
                              <span className="text-[10px] text-zinc-400 italic">
                                +{order.items.length - 2} item lainnya
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-top">
                        <select
                          value={order.status}
                          onChange={(e) => handleQuickStatus(order.id, e.target.value)}
                          className={`w-full text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${statusBadge.bg}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="proses">Dalam Proses</option>
                          <option value="selesai">Selesai</option>
                          <option value="dibatalkan">Dibatalkan</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-3 align-top">
                        <select
                          value={order.status_bayar}
                          onChange={(e) => handleQuickBayar(order.id, e.target.value)}
                          className={`w-full text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${bayarBadge.bg}`}
                        >
                          <option value="belum">Belum Bayar</option>
                          <option value="dp">DP (Uang Muka)</option>
                          <option value="lunas">Lunas</option>
                        </select>
                        {order.status_bayar === "dp" && order.jumlah_dp > 0 && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono truncate">
                            DP: {formatRupiah(order.jumlah_dp)}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-top text-right">
                        <p className="font-mono font-bold text-zinc-900 dark:text-white text-xs">
                          {formatRupiah(order.total)}
                        </p>
                        {order.diskon > 0 && (
                          <p className="text-[10px] text-rose-500 font-mono">
                            Diskon: {formatRupiah(order.diskon)}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Nota */}
                          <button
                            onClick={() => onPrintOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                            title="Cetak Nota"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            Cetak Nota
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(order)}
                            className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                            title="Edit Order"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteOrder(order.id, order.nomor_nota)}
                            className="p-1.5 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                            title="Hapus Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400">
                    Tidak ada pesanan yang sesuai filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tablet & Mobile Card Responsive View (< 1280px / Fits iPad & Tablet natively without horizontal scroll) */}
        <div className="block xl:hidden">
          {filteredOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-950/30">
              {filteredOrders.map((order) => {
                const statusBadge = getStatusBadge(order.status);
                const bayarBadge = getStatusBayarBadge(order.status_bayar);

                const waNoticeLink = createWALink(
                  order.no_wa,
                  `Halo Kak ${order.nama_pelanggan}, kami dari Jeres Studio ingin menginfokan bahwa pesanan dengan nota ${order.nomor_nota} statusnya saat ini: *${statusBadge.label.toUpperCase()}*. Total: ${formatRupiah(order.total)} (${bayarBadge.label}). Terima kasih!`
                );

                return (
                  <div
                    key={order.id}
                    className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      {/* Top Bar: Nota + Tanggal + Total */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                              {order.nomor_nota}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatTanggal(order.tanggal_order)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Staff: {order.created_by || "Admin"}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                            {formatRupiah(order.total)}
                          </div>
                          {order.diskon > 0 && (
                            <div className="text-[10px] text-rose-500 font-mono">
                              Diskon {formatRupiah(order.diskon)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {order.nama_pelanggan}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                            <span>{order.no_wa}</span>
                            <a
                              href={waNoticeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-500"
                              title="Chat WA Pelanggan"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        {order.tanggal_ambil && (
                          <div className="text-right text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <div className="flex items-center justify-end gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Deadline:</span>
                            </div>
                            <span className="font-semibold">{formatTanggal(order.tanggal_ambil)}</span>
                          </div>
                        )}
                      </div>

                      {/* Items list */}
                      {order.items && order.items.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Item Cetak:
                          </span>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-300 text-[11px]">
                              <span>• {item.qty} {item.satuan} {item.nama_item}</span>
                              <span className="font-mono text-slate-500">{formatRupiah(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Controls: Badges + Action Buttons */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                          <select
                            value={order.status}
                            onChange={(e) => handleQuickStatus(order.id, e.target.value)}
                            className={`flex-1 text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${statusBadge.bg}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="proses">Dalam Proses</option>
                            <option value="selesai">Selesai</option>
                            <option value="dibatalkan">Dibatalkan</option>
                          </select>

                          <select
                            value={order.status_bayar}
                            onChange={(e) => handleQuickBayar(order.id, e.target.value)}
                            className={`flex-1 text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${bayarBadge.bg}`}
                          >
                            <option value="belum">Belum Bayar</option>
                            <option value="dp">DP</option>
                            <option value="lunas">Lunas</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
                        <button
                          onClick={() => onPrintOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Cetak Nota</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(order)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id, order.nomor_nota)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Tidak ada pesanan yang sesuai filter
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingOrder ? `Edit Nota ${editingOrder.nomor_nota}` : "Buat Nota Order Baru"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Input data pemesan, item cetak, dan status pembayaran
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="space-y-6 text-xs">
              {/* Customer & Deadline Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pelanggan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="081234567890"
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Ambil / Deadline
                  </label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Dynamic Items Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Rincian Item Cetakan
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Baris Item
                  </button>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  {formItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2.5 relative"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        {/* Choose from Price List or Custom */}
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Pilih Produk / Custom #{idx + 1}
                          </label>
                          <select
                            value={item.product_id ? String(item.product_id) : "custom"}
                            onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          >
                            <option value="custom">-- Custom Item Cetak --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nama_item} ({formatRupiah(p.harga)}/{p.satuan})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Name Item */}
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Nama Item di Nota
                          </label>
                          <input
                            type="text"
                            required
                            value={item.nama_item}
                            onChange={(e) => handleItemFieldChange(idx, "nama_item", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Qty */}
                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.qty}
                            onChange={(e) => handleItemFieldChange(idx, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>

                        {/* Satuan */}
                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Satuan
                          </label>
                          <input
                            type="text"
                            value={item.satuan}
                            onChange={(e) => handleItemFieldChange(idx, "satuan", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center"
                          />
                        </div>

                        {/* Harga Satuan */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Harga Satuan (Rp)
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={item.harga_satuan}
                            onChange={(e) => handleItemFieldChange(idx, "harga_satuan", Number(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                          />
                        </div>

                        {/* Remove button */}
                        <div className="sm:col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer"
                            title="Hapus baris item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Catatan Item Spesifikasi */}
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Catatan finishing / ukuran / ACC (contoh: laminasi doff, potong bulat 4cm)"
                          value={item.catatan_item}
                          onChange={(e) => handleItemFieldChange(idx, "catatan_item", e.target.value)}
                          className="w-full px-2.5 py-1 text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400"
                        />
                        <span className="shrink-0 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          Subtotal: {formatRupiah((item.qty || 1) * (item.harga_satuan || 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status Pengerjaan
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="pending">Pending (Menunggu Antrian)</option>
                    <option value="proses">Proses Cetak & Finishing</option>
                    <option value="selesai">Selesai (Siap Ambil)</option>
                    <option value="dibatalkan">Dibatalkan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={formMetodeBayar}
                    onChange={(e) => setFormMetodeBayar(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Cash">Cash (Tunai)</option>
                    <option value="Transfer BCA">Transfer BCA</option>
                    <option value="Transfer Mandiri">Transfer Mandiri</option>
                    <option value="QRIS">QRIS All Payment</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status Bayar
                  </label>
                  <select
                    value={formStatusBayar}
                    onChange={(e) => setFormStatusBayar(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="belum">Belum Bayar</option>
                    <option value="dp">DP (Uang Muka)</option>
                    <option value="lunas">Lunas</option>
                  </select>
                </div>
              </div>

              {/* Discount & DP & Totals Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="space-y-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Potongan / Diskon (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formDiskon}
                      onChange={(e) => setFormDiskon(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  {formStatusBayar === "dp" && (
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Jumlah Uang Muka (DP) (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formJumlahDp}
                        onChange={(e) => setFormJumlahDp(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Catatan Nota (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Desain sudah ACC via WA"
                      value={formCatatan}
                      onChange={(e) => setFormCatatan(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal Item:</span>
                      <span>{formatRupiah(subtotalComputed)}</span>
                    </div>
                    {formDiskon > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>Diskon:</span>
                        <span>- {formatRupiah(formDiskon)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-900 dark:text-white font-bold text-base border-t border-slate-100 dark:border-slate-800 pt-2">
                      <span>Grand Total:</span>
                      <span>{formatRupiah(grandTotalComputed)}</span>
                    </div>
                  </div>

                  {formStatusBayar === "dp" && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 space-y-1">
                      <div className="flex justify-between text-indigo-600 dark:text-indigo-400 text-xs">
                        <span>Telah Dibayar (DP):</span>
                        <span>{formatRupiah(formJumlahDp)}</span>
                      </div>
                      <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <span>Sisa Tagihan:</span>
                        <span>{formatRupiah(Math.max(0, grandTotalComputed - formJumlahDp))}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {saving ? "Menyimpan Nota..." : editingOrder ? "Simpan Perubahan Nota" : "Terbitkan Nota Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
