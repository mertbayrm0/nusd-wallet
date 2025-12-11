import { Transaction, UserState, WithdrawRequest, SystemState } from '../types';

const USE_REAL_SERVER = true;

// Use absolute URL for both Extension and Web to ensure consistency
const API_URL = 'https://nusd-wallet-production.up.railway.app/api';

const DB_KEY = 'nusd_wallet_db_v5';
const TOKEN_KEY = 'nusd_auth_token';

// Helper to get headers with JWT
const getHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Wrapper for fetch to handle auth
const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  });
  return res;
};

// ... (Local DB fallback logic essentially deprecated for Admin features but kept for structure)
const getDB = () => {
  const stored = localStorage.getItem(DB_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const api = {
  login: async (email: string, password?: string) => {
    try {
      const res = await fetchAPI('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.error === "Account suspended") alert("Account Suspended. Contact Admin.");
        return null;
      }
      return await res.json();
    } catch (e) {
      console.warn("Server unreachable.");
      return null;
    }
  },

  register: async (name: string, email: string, password?: string) => {
    try {
      const res = await fetchAPI('/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password: password || 'demo' })
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      alert(err.error || "Registration failed");
      return null;
    } catch (e) { return null; }
  },

  getUser: async (email: string) => {
    try {
      const res = await fetchAPI(`/users/${email}`);
      if (res.ok) return await res.json();
    } catch (e) { }
    return null;
  },

  // --- ADMIN API ---
  getAllUsers: async () => {
    try { return await (await fetchAPI('/admin/users')).json(); } catch (e) { return []; }
  },

  getAllRequests: async () => {
    try { return await (await fetch(`${API_URL}/admin/requests`)).json(); } catch (e) { return []; }
  },

  getAllTransactions: async () => { // New
    try { return await (await fetchAPI('/admin/transactions')).json(); } catch (e) { return []; }
  },

  getSystemStats: async () => {
    try { return await (await fetchAPI('/admin/system')).json(); } catch (e) { return {}; }
  },

  getAdminLogs: async () => { // New
    try { return await (await fetch(`${API_URL}/admin/logs`)).json(); } catch (e) { return []; }
  },

  getAdminVaults: async () => {
    try { return await (await fetch(`${API_URL}/admin/vaults`)).json(); } catch (e) { return { vaults: [], ledger: [] }; }
  },

  // Bank Account Management
  addBankAccount: async (email: string, bankName: string, iban: string, accountName: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${email}/bank-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, iban, accountName })
      });
      return res.ok ? await res.json() : null;
    } catch (e) { return null; }
  },

  getBankAccounts: async (email: string) => {
    try {
      const res = await fetchAPI(`/users/${email}/bank-accounts`);
      return res.ok ? await res.json() : [];
    } catch (e) { return []; }
  },

  deleteBankAccount: async (email: string, id: string) => {
    try {
      const res = await fetchAPI(`/users/${email}/bank-accounts/${id}`, { method: 'DELETE' });
      return res.ok ? await res.json() : null;
    } catch (e) { return null; }
  },

  toggleUserStatus: async (email: string) => { // New
    try { return await (await fetchAPI(`/admin/user/${email}/toggle-status`, { method: 'POST' })).json(); } catch (e) { return { success: false }; }
  },

  resetDB: async () => {
    try { return await fetchAPI('/admin/reset', { method: 'POST' }); } catch (e) { }
  },
  // ----------------

  getNotifications: async (email: string) => {
    try {
      const res = await fetchAPI(`/notifications/${email}`);
      return await res.json();
    } catch (e) { return []; }
  },

  markNotificationRead: async (id: string) => {
    try {
      await fetchAPI('/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
    } catch (e) { }
  },

  getTransactions: async (email: string) => {
    try { return await (await fetchAPI(`/transactions/${email}`)).json(); } catch (e) { return []; }
  },

  getPendingApprovals: async (email: string) => {
    try { return await (await fetchAPI(`/pending-approvals/${email}`)).json(); } catch (e) { return []; }
  },

  createWithdrawal: async (email: string, amount: number, isInstant = false, type = 'withdraw', network?: string, address?: string) => {
    try {
      const res = await fetchAPI('/withdraw', {
        method: 'POST',
        body: JSON.stringify({ email, amount, isInstant, type, network, address })
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err.error || "Failed");
        } catch (e) {
          throw new Error(text || `Server Error: ${res.status}`);
        }
      }
      return await res.json();
    } catch (e) { throw e; }
  },

  findMatches: async (amount: number, email: string) => {
    try {
      const res = await fetchAPI('/matches', { method: 'POST', body: JSON.stringify({ amount, email }) });
      return await res.json();
    } catch (e) { return null; }
  },

  lockMatch: async (matchId: string, email: string) => {
    try {
      const res = await fetchAPI('/lock-match', { method: 'POST', body: JSON.stringify({ matchId, email }) });
      const data = await res.json();
      return data.success;
    } catch (e) { return false; }
  },

  markPaymentSent: async (email: string, matchId: string, amount: number, hasReceipt: boolean, isInstant = false) => {
    try {
      if (isInstant) {
        // Keep legacy instant deposit logic if needed
        await fetchAPI('/mark-sent', { method: 'POST', body: JSON.stringify({ email, matchId, amount, hasReceipt, isInstant }) });
      } else {
        // Use proper P2P endpoint
        await fetchAPI(`/p2p/trade/${matchId}/payment-sent`, {
          method: 'POST',
          body: JSON.stringify({ userId: email, proofUrl: hasReceipt ? 'receipt_uploaded' : null })
        });
      }
    } catch (e) { }
  },

  approveRelease: async (requestId: string) => {
    try {
      await fetchAPI('/approve', { method: 'POST', body: JSON.stringify({ requestId }) });
    } catch (e) { }
  },

  cryptoDeposit: async (email: string, amount: number, txHash: string, network: string) => {
    try {
      await fetchAPI('/crypto-deposit', { method: 'POST', body: JSON.stringify({ email, amount, txHash, network }) });
    } catch (e) { }
  },

  approveTransaction: async (txId: string) => {
    try {
      const res = await fetchAPI(`/admin/transaction/${txId}/approve`, { method: 'POST' });
      return res.ok;
    } catch (e) { return false; }
  },

  rejectTransaction: async (txId: string) => {
    try {
      const res = await fetchAPI(`/admin/transaction/${txId}/reject`, { method: 'POST' });
      return res.ok;
    } catch (e) { return false; }
  },

  manualVaultDeposit: async (vaultId: string, amount: number, userEmail?: string, network?: string, addToUserBalance?: boolean) => {
    try {
      const res = await fetchAPI('/admin/vault/deposit', {
        method: 'POST',
        body: JSON.stringify({ vaultId, amount, userEmail, network, addToUserBalance })
      });
      return res.ok;
    } catch (e) { return false; }
  },

  // User deposit notification
  notifyDeposit: async (email: string, amount: number, network: string, txHash?: string, memoCode?: string) => {
    try {
      const res = await fetchAPI('/deposit/notify', {
        method: 'POST',
        body: JSON.stringify({ email, amount, network, txHash, memoCode })
      });
      return await res.json();
    } catch (e) { return { success: false, error: 'Connection error' }; }
  },

  // ===== VAULT MANAGEMENT =====
  getVaults: async () => {
    try {
      const res = await fetchAPI('/admin/vaults');
      return await res.json();
    } catch (e) { return { vaults: [] }; }
  },

  // ===== DEPARTMENT MANAGEMENT =====
  getDepartments: async () => {
    try {
      const res = await fetchAPI('/admin/departments');
      return await res.json();
    } catch (e) { return []; }
  },



  createDepartment: async (data: { name: string; color: string; category?: string; commissionType?: string; commissionRate?: number }) => {
    try {
      const res = await fetchAPI('/admin/departments', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) { return null; }
  },

  updateDepartment: async (id: string, data: { name?: string; color?: string; assignVaultId?: string; unassignVaultId?: string; category?: string; commissionType?: string; commissionRate?: number }) => {
    try {
      const res = await fetchAPI(`/admin/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) { return null; }
  },

  deleteDepartment: async (id: string) => {
    try {
      const res = await fetchAPI(`/admin/departments/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (e) { return false; }
  },

  getDepartmentDetail: async (id: string) => {
    try {
      const res = await fetchAPI(`/admin/departments/${id}`);
      return await res.json();
    } catch (e) { return null; }
  },

  // ===== P2P API METHODS =====

  createP2POrder: async (type: 'BUY' | 'SELL', amount: number, email: string, iban?: string, bankName?: string, accountName?: string) => {
    try {
      const res = await fetchAPI('/p2p/order/create', {
        method: 'POST',
        body: JSON.stringify({ type, amount, email, iban, bankName, accountName })
      });
      return await res.json();
    } catch (e) {
      console.error('P2P order creation error:', e);
      return { success: false, error: 'Connection error' };
    }
  },

  // Get P2P Order Status (for polling)
  getP2POrderStatus: async (orderId: string) => {
    try {
      const res = await fetchAPI(`/p2p/order/${orderId}/status`);
      return await res.json();
    } catch (e) {
      console.error('P2P status check error:', e);
      return null;
    }
  },

  // Mark Payment Sent (Buyer confirms payment)
  markP2PPaymentSent: async (tradeId: string, userId: string, proofUrl?: string) => {
    try {
      const res = await fetchAPI(`/p2p/trade/${tradeId}/payment-sent`, {
        method: 'POST',
        body: JSON.stringify({ userId, proofUrl })
      });
      return await res.json();
    } catch (e) {
      console.error('Payment confirmation error:', e);
      return { success: false };
    }
  },

  // Confirm Payment Received (Seller confirms)
  confirmP2PPaymentReceived: async (tradeId: string, userId: string) => {
    try {
      const res = await fetchAPI(`/p2p/trade/${tradeId}/confirm-received`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      return await res.json();
    } catch (e) {
      console.error('Seller confirmation error:', e);
      return { success: false };
    }
  },

  // Get My P2P Activity (orders and trades)
  getMyP2PActivity: async (email: string) => {
    try {
      const res = await fetchAPI(`/p2p/my-activity/${email}`);
      return await res.json();
    } catch (e) {
      console.error('Activity fetch error:', e);
      return { orders: [], trades: [] };
    }
  },

  // ===== MERCHANT API METHODS =====

  // Get Public Agents (Map)
  getPublicAgents: async () => {
    try {
      const res = await fetchAPI('/public/agents');
      if (res.ok) return await res.json();
    } catch (e) { }
    return [];
  },

  // Get merchant by slug (public)
  getMerchantBySlug: async (slug: string) => {
    try {
      // NOTE: Public endpoint, fetchAPI is fine (token optional)
      const res = await fetchAPI(`/merchant/${slug}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Merchant fetch error:', e);
      return null;
    }
  },

  // Get all merchants (admin)
  getAllMerchants: async () => {
    try {
      const res = await fetchAPI('/admin/merchants');
      return await res.json();
    } catch (e) { return []; }
  },

  // Create merchant (admin)
  createMerchant: async (data: { name: string; slug: string; departmentId: string; defaultVaultId?: string; primaryColor?: string; logo?: string }) => {
    try {
      const res = await fetchAPI('/admin/merchant', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) { return { success: false }; }
  },

  // Update merchant (admin)
  updateMerchant: async (id: string, data: { name?: string; slug?: string; departmentId?: string; defaultVaultId?: string; primaryColor?: string; logo?: string; isActive?: boolean }) => {
    try {
      const res = await fetchAPI(`/admin/merchant/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) { return { success: false }; }
  },

  // Delete merchant (admin)
  deleteMerchant: async (id: string) => {
    try {
      const res = await fetchAPI(`/admin/merchant/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (e) { return false; }
  },

  // Get merchant for department (admin)
  getDepartmentMerchant: async (deptId: string) => {
    try {
      const res = await fetchAPI(`/admin/department/${deptId}/merchant`);
      return await res.json();
    } catch (e) { return null; }
  }
};