const TOKEN_KEY = "jeres_admin_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  logout: () =>
    request<{ message: string }>("/api/auth/logout", {
      method: "POST",
    }),

  getMe: () => request<{ user: any }>("/api/auth/me"),

  getStaff: () => request<{ staff: any[] }>("/api/auth/staff"),

  addStaff: (data: any) =>
    request<{ message: string; user: any }>("/api/auth/staff", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStaff: (id: number, data: any) =>
    request<{ message: string; user: any }>(`/api/auth/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteStaff: (id: number) =>
    request<{ message: string }>(`/api/auth/staff/${id}`, {
      method: "DELETE",
    }),

  changePassword: (data: any) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Products
  getProducts: (params?: { kategori?: string; search?: string; activeOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.kategori) query.set("kategori", params.kategori);
    if (params?.search) query.set("search", params.search);
    if (params?.activeOnly) query.set("activeOnly", "true");
    return request<{ products: any[] }>(`/api/products?${query.toString()}`);
  },

  createProduct: (data: any) =>
    request<{ message: string; product: any }>("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (id: number, data: any) =>
    request<{ message: string; product: any }>(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: number) =>
    request<{ message: string }>(`/api/products/${id}`, {
      method: "DELETE",
    }),

  toggleProduct: (id: number, field: "is_active" | "tampilkan_harga_publik") =>
    request<{ message: string; product: any }>(`/api/products/${id}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({ field }),
    }),

  // Orders
  getOrders: (params?: { status?: string; status_bayar?: string; search?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.status_bayar) query.set("status_bayar", params.status_bayar);
    if (params?.search) query.set("search", params.search);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    return request<{ orders: any[] }>(`/api/orders?${query.toString()}`);
  },

  getOrder: (id: number | string) =>
    request<{ order: any }>(`/api/orders/${id}`),

  createOrder: (data: any) =>
    request<{ message: string; order: any }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateOrder: (id: number, data: any) =>
    request<{ message: string; order: any }>(`/api/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateOrderStatus: (id: number, data: { status?: string; status_bayar?: string }) =>
    request<{ message: string; order: any }>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteOrder: (id: number) =>
    request<{ message: string }>(`/api/orders/${id}`, {
      method: "DELETE",
    }),

  // Vendors
  getVendors: (params?: { search?: string; kategori?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.kategori) query.set("kategori", params.kategori);
    return request<{ vendors: any[] }>(`/api/vendors?${query.toString()}`);
  },

  createVendor: (data: any) =>
    request<{ message: string; vendor: any }>("/api/vendors", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateVendor: (id: number, data: any) =>
    request<{ message: string; vendor: any }>(`/api/vendors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteVendor: (id: number) =>
    request<{ message: string }>(`/api/vendors/${id}`, {
      method: "DELETE",
    }),

  // Purchases
  getPurchases: (vendorId?: number) => {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    return request<{ purchases: any[] }>(`/api/purchases${query}`);
  },

  createPurchase: (data: any) =>
    request<{ message: string; purchase: any }>("/api/purchases", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deletePurchase: (id: number) =>
    request<{ message: string }>(`/api/purchases/${id}`, {
      method: "DELETE",
    }),

  // Financial Transactions (Keuangan Keluar Masuk)
  getTransactions: (filters?: {
    tipe?: string;
    kategori?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    metode?: string;
  }) => {
    const query = new URLSearchParams();
    if (filters?.tipe) query.append("tipe", filters.tipe);
    if (filters?.kategori) query.append("kategori", filters.kategori);
    if (filters?.startDate) query.append("startDate", filters.startDate);
    if (filters?.endDate) query.append("endDate", filters.endDate);
    if (filters?.search) query.append("search", filters.search);
    if (filters?.metode) query.append("metode", filters.metode);
    return request<{ transactions: any[] }>(`/api/transactions?${query.toString()}`);
  },

  getTransactionSummary: () =>
    request<{ summary: any }>("/api/transactions/summary"),

  getTransactionCategories: () =>
    request<{ incomeCategories: string[]; expenseCategories: string[] }>("/api/transactions/categories"),

  createTransaction: (data: any) =>
    request<{ message: string; transaction: any }>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTransaction: (id: number, data: any) =>
    request<{ message: string; transaction: any }>(`/api/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: number) =>
    request<{ message: string }>(`/api/transactions/${id}`, {
      method: "DELETE",
    }),

  scanReceipt: (image: string) =>
    request<{ success: boolean; result: any }>("/api/transactions/scan-receipt", {
      method: "POST",
      body: JSON.stringify({ image }),
    }),

  // Dashboard
  getDashboardStats: () =>
    request<any>("/api/dashboard/stats"),

  // Settings
  getSettings: () =>
    request<{ settings: any }>("/api/settings"),

  updateSettings: (data: any) =>
    request<{ message: string; settings: any }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  restoreBackup: (backupData: any) =>
    request<{ message: string }>("/api/settings/restore", {
      method: "POST",
      body: JSON.stringify({ backupData }),
    }),

  // Activities
  getActivities: () =>
    request<{ activities: any[] }>("/api/activities"),
};
