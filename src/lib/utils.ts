export function formatRupiah(amount: number | string | undefined | null): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (num === undefined || num === null || isNaN(num)) return "Rp 0";
  return "Rp " + Math.round(num).toLocaleString("id-ID");
}

export function formatTanggal(dateStr: string | undefined | null, withTime: boolean = false): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    };
    return new Intl.DateTimeFormat("id-ID", options).format(d);
  } catch {
    return dateStr;
  }
}

export function formatTanggalInput(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function formatTanggalNumeric(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr || "-";
  }
}

export function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "pending":
      return { label: "PENDING", bg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" };
    case "proses":
      return { label: "PROSES", bg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" };
    case "selesai":
      return { label: "SELESAI", bg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" };
    case "dibatalkan":
      return { label: "BATAL", bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" };
    default:
      return { label: (status || "-").toUpperCase(), bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" };
  }
}

export function getStatusBayarBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "lunas":
      return { label: "LUNAS", bg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" };
    case "dp":
      return { label: "DP", bg: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" };
    case "belum":
      return { label: "BELUM BAYAR", bg: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300" };
    default:
      return { label: (status || "-").toUpperCase(), bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" };
  }
}

export function cleanPhoneForWA(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

export function createWALink(phone: string, text: string): string {
  const target = cleanPhoneForWA(phone);
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}

export function angkaTerbilang(nominal: number | string | undefined | null): string {
  const n = typeof nominal === "string" ? Number(nominal) : nominal;
  if (n === undefined || n === null || isNaN(n) || n === 0) return "Nol Rupiah";

  const satuan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  function convert(num: number): string {
    num = Math.floor(Math.abs(num));
    if (num < 12) {
      return satuan[num];
    } else if (num < 20) {
      return convert(num - 10) + " Belas";
    } else if (num < 100) {
      return convert(Math.floor(num / 10)) + " Puluh " + convert(num % 10);
    } else if (num < 200) {
      return "Seratus " + convert(num - 100);
    } else if (num < 1000) {
      return convert(Math.floor(num / 100)) + " Ratus " + convert(num % 100);
    } else if (num < 2000) {
      return "Seribu " + convert(num - 1000);
    } else if (num < 1000000) {
      return convert(Math.floor(num / 1000)) + " Ribu " + convert(num % 1000);
    } else if (num < 1000000000) {
      return convert(Math.floor(num / 1000000)) + " Juta " + convert(num % 1000000);
    } else if (num < 1000000000000) {
      return convert(Math.floor(num / 1000000000)) + " Miliar " + convert(num % 1000000000);
    } else if (num < 1000000000000000) {
      return convert(Math.floor(num / 1000000000000)) + " Triliun " + convert(num % 1000000000000);
    }
    return "";
  }

  const hasil = convert(n).replace(/\s+/g, " ").trim();
  return (hasil ? hasil + " Rupiah" : "Nol Rupiah");
}
