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

  // Product Vendors & Margin
  getProductVendors: (productId: number) =>
    request<{ product_vendors: any[]; product: any }>(`/api/products/${productId}/vendors`),

  addProductVendor: (productId: number, data: { vendor_id: number; harga_modal: number; catatan?: string; is_default?: boolean }) =>
    request<{ message: string; product_vendor: any }>(`/api/products/${productId}/vendors`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProductVendor: (id: number, data: { harga_modal?: number; catatan?: string; is_default?: boolean }) =>
    request<{ message: string; product_vendor: any }>(`/api/product-vendors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProductVendor: (id: number) =>
    request<{ message: string }>(`/api/product-vendors/${id}`, {
      method: "DELETE",
    }),

  batchApplySimulations: (items: Array<{
    productId: number;
    newPrice?: number;
    newVendorCost?: number;
    vendorId?: number;
    updatePrice?: boolean;
    updateVendorCost?: boolean;
  }>) =>
    request<{ message: string; updatedProductCount: number; updatedVendorCostCount: number }>(
      "/api/products/batch-apply-simulations",
      {
        method: "POST",
        body: JSON.stringify({ items }),
      }
    ),

  getMarginThresholds: () =>
    request<{ margin_threshold_good: number; margin_threshold_warning: number }>("/api/settings/margin-threshold"),

  updateMarginThresholds: (data: { margin_threshold_good: number; margin_threshold_warning: number }) =>
    request<{ message: string; margin_threshold_good: number; margin_threshold_warning: number }>("/api/settings/margin-threshold", {
      method: "PUT",
      body: JSON.stringify(data),
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

  updateOrderStatus: (id: number, data: { status?: string; status_bayar?: string; progress_detail?: string }) =>
    request<{ message: string; order: any }>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  generateShareLink: (id: number) =>
    request<{
      message: string;
      share_token: string;
      share_url: string;
      expires_at: string | null;
      order: any;
    }>(`/api/orders/${id}/share`, {
      method: "POST",
    }),

  addProgressNote: (id: number, data: { detail: string; status?: string }) =>
    request<{ message: string; progress_notes: any[]; order: any }>(`/api/orders/${id}/progress-notes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPublicTracking: (token: string) =>
    request<any>(`/api/public/track/${token}`),

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
    kantong?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    metode?: string;
  }) => {
    const query = new URLSearchParams();
    if (filters?.tipe) query.append("tipe", filters.tipe);
    if (filters?.kategori) query.append("kategori", filters.kategori);
    if (filters?.kantong) query.append("kantong", filters.kantong);
    if (filters?.startDate) query.append("startDate", filters.startDate);
    if (filters?.endDate) query.append("endDate", filters.endDate);
    if (filters?.search) query.append("search", filters.search);
    if (filters?.metode) query.append("metode", filters.metode);
    return request<{ transactions: any[] }>(`/api/transactions?${query.toString()}`);
  },

  getTransactionSummary: (kantong?: string) => {
    const query = kantong && kantong !== "all" ? `?kantong=${encodeURIComponent(kantong)}` : "";
    return request<{ summary: any }>(`/api/transactions/summary${query}`);
  },

  getTransactionCategories: () =>
    request<{ incomeCategories: string[]; expenseCategories: string[]; categories?: any[] }>("/api/transactions/categories"),

  // Category Management CRUD
  getCategories: () =>
    request<{ categories: any[]; incomeCategories: string[]; expenseCategories: string[] }>("/api/categories"),

  createCategory: (data: { name: string; type: "masuk" | "keluar" }) =>
    request<{ message: string; category: any }>("/api/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCategory: (id: number, data: { name: string; type?: "masuk" | "keluar" }) =>
    request<{ message: string; category: any }>(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: number) =>
    request<{ message: string; category?: any }>(`/api/categories/${id}`, {
      method: "DELETE",
    }),

  createTransaction: (data: any) =>
    request<{ message: string; transaction: any }>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  autoAllocateOrder: (data: {
    nomor_nota?: string;
    breakdownHPP: {
      modal: number;
      overhead: number;
      gajiSaya: number;
      gajiKaryawan: number;
      margin: number;
    };
    diskon?: number;
    tanggal?: string;
    metode_pembayaran?: string;
    keterangan?: string;
    customer_name?: string;
  }) =>
    request<{
      message: string;
      transactions: any[];
      alokasi: any;
      sisaDiskonTidakTertutup: number;
      potonganModal: number;
      totalAllocated: number;
    }>("/api/transactions/auto-allocate-order", {
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

  // Public & Sharing
  getPublicOrder: (id: string | number) =>
    request<{ order: any; store: any }>(`/api/public/orders/${id}`),

  sendInvoiceEmail: (data: {
    orderId: number | string;
    recipientEmail: string;
    subject?: string;
    message?: string;
    publicInvoiceUrl?: string;
  }) =>
    request<{
      success: boolean;
      method: string;
      message: string;
      mailtoUrl?: string;
      data?: any;
    }>("/api/send-invoice-email", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Guides & SOP / Template Chat
  getGuides: (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    return request<{ guides: any[]; categories: string[] }>(`/api/guides?${query.toString()}`);
  },

  createGuide: (data: { category: string; title: string; content: string }) =>
    request<{ message: string; guide: any }>("/api/guides", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateGuide: (id: number, data: { category?: string; title?: string; content?: string }) =>
    request<{ message: string; guide: any }>(`/api/guides/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteGuide: (id: number) =>
    request<{ message: string; guide?: any }>(`/api/guides/${id}`, {
      method: "DELETE",
    }),

  // Activities
  getActivities: () =>
    request<{ activities: any[] }>("/api/activities"),

  // Database Management
  getDbStatus: () =>
    request<{
      connected: boolean;
      databaseUrlConfigured: boolean;
      databaseHost: string;
      tableCount: number;
      tables: Array<{ name: string; rowCount: number }>;
      lastChecked: string;
      error?: string;
    }>("/api/db/status"),

  initDatabase: () =>
    request<{ success: boolean; message: string; tableCount: number }>("/api/db/init", {
      method: "POST",
    }),

  // Image Uploading & Cloud Hosting (Cloudinary / Local)
  uploadImage: (dataUrl: string, filename?: string) =>
    request<{
      url: string;
      filename: string;
      provider: "cloudinary" | "local_base64";
      format?: string;
      bytes?: number;
      notice?: string;
    }>("/api/upload", {
      method: "POST",
      body: JSON.stringify({ dataUrl, filename }),
    }),

  testCloudinary: () =>
    request<{
      success: boolean;
      message: string;
      url?: string;
      cloudName?: string;
      missingKeys?: string[];
      details?: any;
    }>("/api/cloudinary/test", {
      method: "POST",
    }),

  // Integrations Status (Gemini, Resend, Cloudinary, Neon)
  getIntegrationsStatus: () =>
    request<{
      integrations: {
        neon: { name: string; connected: boolean; description: string };
        gemini: { name: string; connected: boolean; description: string };
        resend: { name: string; connected: boolean; description: string };
        cloudinary: {
          name: string;
          connected: boolean;
          cloudName?: string | null;
          hasApiKey?: boolean;
          hasApiSecret?: boolean;
          missingKeys?: string[];
          description: string;
        };
      };
    }>("/api/integrations/status"),
};
