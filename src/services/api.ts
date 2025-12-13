import { supabase } from './supabase';
import { Transaction, UserState, SystemState } from '../types';

export const api = {
  // ===== AUTHENTICATION =====
  login: async (email: string, password?: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || 'demo123'
      });

      if (error) {
        if (error.message.includes('Invalid login')) {
          return null;
        }
        console.error('Login error:', error.message);
        return null;
      }

      if (data.user) {
        // Get user profile from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          return {
            token: data.session?.access_token,
            user: {
              email: profile.email,
              name: profile.name,
              balance: profile.balance || 0,
              role: profile.role || 'user',
              isActive: profile.is_active,
              createdAt: new Date(profile.created_at).getTime(),
              trxAddress: profile.trx_address
            }
          };
        }
      }
      return null;
    } catch (e) {
      console.error('Login error:', e);
      return null;
    }
  },

  register: async (name: string, email: string, password?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || 'demo123',
        options: {
          data: { name }
        }
      });

      if (error) {
        alert(error.message || 'Registration failed');
        return null;
      }

      if (data.user) {
        return {
          token: data.session?.access_token,
          user: {
            email: data.user.email,
            name: name,
            balance: 0,
            role: 'user',
            isActive: true
          }
        };
      }
      return null;
    } catch (e) {
      console.error('Register error:', e);
      return null;
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  getUser: async (email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (profile) {
        return {
          email: profile.email,
          name: profile.name,
          balance: profile.balance || 0,
          role: profile.role || 'user',
          isActive: profile.is_active,
          createdAt: new Date(profile.created_at).getTime(),
          trxAddress: profile.trx_address
        };
      }
    } catch (e) {
      console.error('Get user error:', e);
    }
    return null;
  },

  // ===== NOTIFICATIONS =====
  getNotifications: async (email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) return [];

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      return data || [];
    } catch (e) {
      return [];
    }
  },

  markNotificationRead: async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch (e) {
      console.error('Mark notification read error:', e);
    }
  },

  // ===== TRANSACTIONS =====
  getTransactions: async (email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) return [];

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('timestamp', { ascending: false });

      return (data || []).map((tx: any) => ({
        id: tx.id,
        type: tx.type.toLowerCase(),
        amount: tx.amount,
        currency: 'NUSD',
        date: tx.timestamp,
        status: tx.status.toLowerCase(),
        title: `${tx.type} Transaction`,
        network: tx.network,
        txHash: tx.tx_hash
      }));
    } catch (e) {
      return [];
    }
  },

  // ===== BANK ACCOUNTS =====
  getBankAccounts: async (email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) return [];

      const { data } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', profile.id);

      return (data || []).map((acc: any) => ({
        id: acc.id,
        bankName: acc.bank_name,
        iban: acc.iban,
        accountName: acc.account_name,
        addedAt: acc.added_at
      }));
    } catch (e) {
      return [];
    }
  },

  addBankAccount: async (email: string, bankName: string, iban: string, accountName: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) return null;

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: profile.id,
          bank_name: bankName,
          iban,
          account_name: accountName
        })
        .select()
        .single();

      if (error) {
        console.error('Add bank account error:', error);
        return null;
      }

      return {
        id: data.id,
        bankName: data.bank_name,
        iban: data.iban,
        accountName: data.account_name
      };
    } catch (e) {
      return null;
    }
  },

  deleteBankAccount: async (email: string, id: string) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      return !error;
    } catch (e) {
      return null;
    }
  },

  // ===== WITHDRAWAL =====
  createWithdrawal: async (email: string, amount: number, isInstant = false, type = 'withdraw', network?: string, address?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, balance')
        .eq('email', email)
        .single();

      if (!profile) throw new Error('User not found');
      if (profile.balance < amount) throw new Error('Insufficient balance');

      // Create transaction
      const { data: tx, error } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          type: 'WITHDRAW',
          amount,
          status: 'PENDING',
          network,
          to_address: address
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Deduct from balance
      await supabase
        .from('profiles')
        .update({ balance: profile.balance - amount })
        .eq('id', profile.id);

      return { success: true, transaction: tx };
    } catch (e: any) {
      throw new Error(e.message || 'Withdrawal failed');
    }
  },

  // ===== DEPOSIT =====
  notifyDeposit: async (email: string, amount: number, network: string, txHash?: string, memoCode?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) return { success: false, error: 'User not found' };

      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          type: 'DEPOSIT',
          amount,
          status: 'PENDING',
          network,
          tx_hash: txHash
        });

      if (error) return { success: false, error: error.message };

      return { success: true };
    } catch (e) {
      return { success: false, error: 'Connection error' };
    }
  },

  // ===== PENDING APPROVALS (for P2P) =====
  getPendingApprovals: async (email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) return [];

      // Get pending transactions where user is counterparty
      return [];
    } catch (e) {
      return [];
    }
  },

  // ===== PUBLIC ENDPOINTS =====
  getPublicAgents: async () => {
    try {
      const { data } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_agent', true)
        .eq('is_active', true);

      return data || [];
    } catch (e) {
      return [];
    }
  },

  getMerchantBySlug: async (slug: string) => {
    try {
      const { data } = await supabase
        .from('merchants')
        .select('*, departments(*)')
        .eq('slug', slug)
        .single();

      return data;
    } catch (e) {
      return null;
    }
  },

  // ===== ADMIN API (simplified) =====
  getAllUsers: async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      return (data || []).map((p: any) => ({
        email: p.email,
        name: p.name,
        balance: p.balance,
        role: p.role,
        isActive: p.is_active,
        createdAt: new Date(p.created_at).getTime()
      }));
    } catch (e) {
      return [];
    }
  },

  getAllTransactions: async () => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*, profiles(email, name)')
        .order('timestamp', { ascending: false });

      return (data || []).map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        network: tx.network,
        txHash: tx.tx_hash,
        timestamp: tx.timestamp,
        userEmail: tx.profiles?.email,
        userName: tx.profiles?.name
      }));
    } catch (e) {
      return [];
    }
  },

  getSystemStats: async () => {
    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('balance');

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, status')
        .eq('status', 'COMPLETED');

      const totalUsers = users?.length || 0;
      const totalVolume = transactions?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0;

      return {
        totalUsers,
        totalVolume,
        totalRevenue: 0
      };
    } catch (e) {
      return {};
    }
  },

  toggleUserStatus: async (email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, is_active')
        .eq('email', email)
        .single();

      if (!profile) return { success: false };

      await supabase
        .from('profiles')
        .update({ is_active: !profile.is_active })
        .eq('id', profile.id);

      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  approveTransaction: async (txId: string) => {
    try {
      const { data: tx } = await supabase
        .from('transactions')
        .select('*, profiles(id, balance)')
        .eq('id', txId)
        .single();

      if (!tx) return false;

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'COMPLETED' })
        .eq('id', txId);

      // If deposit, add to user balance
      if (tx.type === 'DEPOSIT') {
        await supabase
          .from('profiles')
          .update({ balance: (tx.profiles.balance || 0) + tx.amount })
          .eq('id', tx.profiles.id);
      }

      return true;
    } catch (e) {
      return false;
    }
  },

  rejectTransaction: async (txId: string) => {
    try {
      const { data: tx } = await supabase
        .from('transactions')
        .select('*, profiles(id, balance)')
        .eq('id', txId)
        .single();

      if (!tx) return false;

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'FAILED' })
        .eq('id', txId);

      // If withdrawal, refund user
      if (tx.type === 'WITHDRAW') {
        await supabase
          .from('profiles')
          .update({ balance: (tx.profiles.balance || 0) + tx.amount })
          .eq('id', tx.profiles.id);
      }

      return true;
    } catch (e) {
      return false;
    }
  },

  // ===== DEPARTMENTS =====
  getDepartments: async () => {
    try {
      const { data } = await supabase
        .from('departments')
        .select('*')
        .order('created_at', { ascending: false });

      return data || [];
    } catch (e) {
      return [];
    }
  },

  createDepartment: async (data: { name: string; color: string; category?: string; commissionType?: string; commissionRate?: number }) => {
    try {
      const { data: dept, error } = await supabase
        .from('departments')
        .insert({
          name: data.name,
          color: data.color,
          category: data.category || 'MERCHANT',
          commission_type: data.commissionType || 'PERCENT',
          commission_rate: data.commissionRate || 0
        })
        .select()
        .single();

      if (error) return null;
      return dept;
    } catch (e) {
      return null;
    }
  },

  updateDepartment: async (id: string, data: any) => {
    try {
      const { data: dept, error } = await supabase
        .from('departments')
        .update({
          name: data.name,
          color: data.color,
          category: data.category,
          commission_type: data.commissionType,
          commission_rate: data.commissionRate
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return null;
      return dept;
    } catch (e) {
      return null;
    }
  },

  deleteDepartment: async (id: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      return !error;
    } catch (e) {
      return false;
    }
  },

  getDepartmentDetail: async (id: string) => {
    try {
      const { data } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single();
      return data;
    } catch (e) {
      return null;
    }
  },

  // ===== VAULTS (simplified) =====
  getVaults: async () => {
    try {
      const { data } = await supabase
        .from('vaults')
        .select('*, departments(name, color)');
      return { vaults: data || [] };
    } catch (e) {
      return { vaults: [] };
    }
  },

  getAdminVaults: async () => {
    try {
      const { data } = await supabase
        .from('vaults')
        .select('*, departments(name, color)');
      return { vaults: data || [], ledger: [] };
    } catch (e) {
      return { vaults: [], ledger: [] };
    }
  },

  // ===== STUBS for unused features =====
  getAllRequests: async () => [],
  getAdminLogs: async () => [],
  resetDB: async () => { },
  cryptoDeposit: async () => { },
  findMatches: async () => null,
  lockMatch: async () => false,
  markPaymentSent: async () => { },
  approveRelease: async () => { },
  manualVaultDeposit: async () => false,
  createP2POrder: async () => ({ success: false }),
  getP2POrderStatus: async () => null,
  markP2PPaymentSent: async () => ({ success: false }),
  confirmP2PPaymentReceived: async () => ({ success: false }),
  getMyP2PActivity: async () => ({ orders: [], trades: [] }),
  getAllMerchants: async () => [],
  createMerchant: async () => ({ success: false }),
  updateMerchant: async () => ({ success: false }),
  deleteMerchant: async () => false,
  getDepartmentMerchant: async () => null
};