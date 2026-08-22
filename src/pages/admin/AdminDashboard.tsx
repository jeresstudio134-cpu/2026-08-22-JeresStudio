import React, { useState, useEffect } from "react";
import { DashboardStats, Order, StoreSettings } from "../../types/index.js";
import { api } from "../../lib/api.js";
import { formatRupiah, formatTanggal, getStatusBadge, getStatusBayarBadge } from "../../lib/utils.js";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ArrowUpRight,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AdminDashboardProps {
  onNavigateOrders: () => void;
  onNavigateProducts: () => void;
  onNavigateFinance?: () => void;
  onPrintOrder: (order: Order) => void;
  settings: StoreSettings | null;
}

const CATEGORY_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateOrders,
  onNavigateProducts,
  onNavigateFinance,
  onPrintOrder,
  settings,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Fetch dashboard stats error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleQuickStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, { status: newStatus });
      fetchStats();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status");
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner Alert if Deadlines approaching */}
      {stats && stats.deadlineApproachingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Peringatan: {stats.deadlineApproachingCount} Pesanan Mendekati Batas Waktu!
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Ada order yang harus selesai dalam kurun 48 jam ke depan. Segera cek dan selesaikan produksi.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateOrders}
            className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Lihat Orderan
          </button>
        </div>
      )}

      {/* Quick Action Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi Cepat:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateFinance && (
            <button
              onClick={onNavigateFinance}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 rounded-xl shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Scan Nota Kas (AI)</span>
            </button>
          )}
          {onNavigateFinance && (
            <button
              onClick={onNavigateFinance}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buku Kas Toko</span>
            </button>
          )}
          <button
            onClick={onNavigateOrders}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
            <span>Semua Orderan</span>
          </button>
          <button
            onClick={onNavigateProducts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-amber-600" />
            <span>Katalog Harga</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Omzet */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Omzet Bulan Ini
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatRupiah(stats?.totalOmzetBulanIni || 0)}
            </h3>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Dari {stats?.totalOrderBulanIni || 0} transaksi bulan ini</span>
            </p>
          </div>
        </div>

        {/* Order Pending */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Order Pending
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.orderPending || 0}
            </h3>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
              Menunggu antrian / ACC desain
            </p>
          </div>
        </div>

        {/* Order Dalam Proses */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sedang Diproduksi
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.orderProses || 0}
            </h3>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
              Dalam mesin cetak & finishing
            </p>
          </div>
        </div>

        {/* Order Selesai */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Order Selesai
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.orderSelesai || 0}
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              Siap diambil / sudah diserahkan
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Trend Omzet 6 Bulan Terakhir
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grafik total pendapatan pesanan percetakan per bulan
              </p>
            </div>
            <button
              onClick={fetchStats}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="h-64 w-full pt-2">
            {stats && stats.revenueTrend && stats.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} vertical={false} />
                  <XAxis dataKey="bulan" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `Rp ${(val / 1000).toLocaleString()}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatRupiah(val), "Omzet"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="omzet" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Belum ada data grafik
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sebaran Kategori Cetakan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Berdasarkan item yang paling banyak dipesan
            </p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {stats && stats.categoryDistribution && stats.categoryDistribution.some((c) => c.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryDistribution.filter((c) => c.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} Item`, "Qty"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs text-center">
                Belum ada data pesanan
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            {stats?.categoryDistribution
              ?.filter((c) => c.value > 0)
              .map((cat, idx) => (
                <div key={idx} className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-400 capitalize truncate">
                    {cat.name}: <strong className="text-slate-900 dark:text-white">{cat.value}</strong>
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pesanan Terbaru Masuk
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daftar nota order yang baru dibuat atau sedang berjalan
            </p>
          </div>

          <button
            onClick={onNavigateOrders}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Buka Semua Orderan
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Table View (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold">
              <tr>
                <th className="py-3.5 px-6">No. Nota</th>
                <th className="py-3.5 px-6">Pelanggan</th>
                <th className="py-3.5 px-6">Tanggal Order</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Pembayaran</th>
                <th className="py-3.5 px-6 text-right">Total</th>
                <th className="py-3.5 px-6 text-center">Cetak / Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => {
                  const statusBadge = getStatusBadge(order.status);
                  const bayarBadge = getStatusBayarBadge(order.status_bayar);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                        {order.nomor_nota}
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-900 dark:text-white text-xs">{order.nama_pelanggan}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{order.no_wa}</p>
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-xs">
                        {formatTanggal(order.tanggal_order)}
                      </td>
                      <td className="py-4 px-6">
                        <select
                          value={order.status}
                          onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                          className={`text-xs font-bold px-3 py-1 rounded-full border-none focus:outline-none cursor-pointer ${statusBadge.bg}`}
                        >
                          <option value="pending">PENDING</option>
                          <option value="proses">PROSES</option>
                          <option value="selesai">SELESAI</option>
                          <option value="dibatalkan">BATAL</option>
                        </select>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${bayarBadge.bg}`}>
                          {bayarBadge.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {formatRupiah(order.total)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => onPrintOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Cetak Nota A5"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-500" />
                          Nota
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Belum ada orderan masuk
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Vertical Card View (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            stats.recentOrders.map((order) => {
              const statusBadge = getStatusBadge(order.status);
              const bayarBadge = getStatusBayarBadge(order.status_bayar);

              return (
                <div key={order.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                        {order.nomor_nota}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatTanggal(order.tanggal_order)}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatRupiah(order.total)}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {order.nama_pelanggan}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{order.no_wa}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <select
                        value={order.status}
                        onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border-none focus:outline-none cursor-pointer ${statusBadge.bg}`}
                      >
                        <option value="pending">PENDING</option>
                        <option value="proses">PROSES</option>
                        <option value="selesai">SELESAI</option>
                        <option value="dibatalkan">BATAL</option>
                      </select>

                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${bayarBadge.bg}`}>
                        {bayarBadge.label}
                      </span>
                    </div>

                    <button
                      onClick={() => onPrintOrder(order)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Nota</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada orderan masuk
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
