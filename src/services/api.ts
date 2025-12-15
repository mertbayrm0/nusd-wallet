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
        console.error('Login error:', error.message);
        return null;
      }

      if (data.user) {
        // Get user profile from profiles table
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // If profile doesn't exist, create one
        if (!profile) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.name || email.split('@')[0],
              role: 'user',
              is_active: true,
              balance: 0
            })
            .select()
            .single();

          if (insertError) {
            console.error('Profile insert error:', insertError.message);
          } else {
            profile = newProfile;
          }
        }

        return {
          token: data.session?.access_token,
          user: {
            email: profile?.email || data.user.email,
            name: profile?.name || data.user.user_metadata?.name || 'User',
            balance: profile?.balance || 0,
            role: profile?.role || 'user',
            isActive: profile?.is_active ?? true,
            createdAt: profile?.created_at ? new Date(profile.created_at).getTime() : Date.now(),
            trxAddress: profile?.trx_address
          }
        };
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
        console.error('Register error:', error.message);
        alert(error.message || 'Registration failed');
        return null;
      }

      if (data.user) {
        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: name,
            role: 'user',
            is_active: true,
            balance: 0
          });

        if (profileError) {
          console.error('Profile creation error:', profileError.message);
        }

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
      if (!email) return [];

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError) {
        console.error('getTransactions profile error:', profileError.message);
        return [];
      }
      if (!profile) return [];

      const { data, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (txError) {
        console.error('getTransactions tx error:', txError.message);
        return [];
      }

      return (data || []).map((tx: any) => ({
        id: tx.id,
        type: tx.type?.toLowerCase() || 'unknown',
        amount: tx.amount,
        currency: 'NUSD',
        date: tx.created_at,
        status: tx.status?.toLowerCase() || 'pending',
        title: `${tx.type || 'Unknown'} Transaction`,
        network: tx.network,
        txHash: tx.tx_hash
      }));
    } catch (e: any) {
      console.error('getTransactions exception:', e.message);
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
      // Use secure Edge Function
      const { data, error } = await supabase.functions.invoke('create-withdrawal', {
        body: { amount, network, address }
      });

      if (error) throw error;
      return { success: true, transaction: data };
    } catch (e: any) {
      console.error('Withdrawal error:', e);
      if (e.context && e.context.json) {
        e.context.json().then((errBody: any) => console.error('Edge Function Error Body:', JSON.stringify(errBody, null, 2)));
      }
      return { success: false, error: e.message || 'Withdrawal failed' };
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
        .order('created_at', { ascending: false });

      return (data || []).map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        network: tx.network,
        txHash: tx.tx_hash,
        timestamp: tx.created_at,
        userEmail: tx.profiles?.email,
        userName: tx.profiles?.name
      }));
    } catch (e) {
      return [];
    }
  },

  getSystemStats: async () => {
    try {
      // Get all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('balance, is_active');

      // Get all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount, status');

      // Get departments count
      const { data: departments } = await supabase
        .from('departments')
        .select('id');

      // Get vaults
      const { data: vaults } = await supabase
        .from('vaults')
        .select('balance');

      // Calculate stats
      const totalUserBalance = profiles?.reduce((sum: number, p: any) => sum + (p.balance || 0), 0) || 0;
      const activeUsers = profiles?.filter((p: any) => p.is_active).length || 0;
      const totalVaultBalance = vaults?.reduce((sum: number, v: any) => sum + (v.balance || 0), 0) || 0;

      const txs = transactions || [];
      const totalTransactions = txs.length;
      const pendingTransactions = txs.filter((t: any) => t.status === 'PENDING').length;

      // Calculate deposits (positive amounts or DEPOSIT type)
      const deposits = txs.filter((t: any) => t.type === 'DEPOSIT' || (t.amount > 0 && t.status === 'COMPLETED'));
      const totalDeposits = deposits.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

      // Calculate withdrawals (negative amounts or WITHDRAW type)
      const withdrawals = txs.filter((t: any) => t.type === 'WITHDRAW' || t.type === 'P2P_SELL' || (t.amount < 0 && t.status === 'COMPLETED'));
      const totalWithdrawals = withdrawals.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

      const totalVolume = txs.reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);

      return {
        totalUserBalance,
        totalVaultBalance,
        totalDeposits,
        totalWithdrawals,
        vaultDeposits: 0, // TODO: Track vault-specific deposits
        vaultWithdrawals: 0, // TODO: Track vault-specific withdrawals
        pendingTransactions,
        totalTransactions,
        activeUsers,
        departmentCount: departments?.length || 0,
        totalRevenue: 0,
        totalVolume
      };
    } catch (e) {
      console.error('getSystemStats error:', e);
      return {
        totalUserBalance: 0,
        totalVaultBalance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        vaultDeposits: 0,
        vaultWithdrawals: 0,
        pendingTransactions: 0,
        totalTransactions: 0,
        activeUsers: 0,
        departmentCount: 0,
        totalRevenue: 0,
        totalVolume: 0
      };
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
      const { data, error } = await supabase.functions.invoke('approve-transaction', {
        body: { transactionId: txId, action: 'approve' }
      });

      if (error) {
        console.error('Approve error:', error);
        return false;
      }

      return data?.success || false;
    } catch (e) {
      console.error('Approve exception:', e);
      return false;
    }
  },

  rejectTransaction: async (txId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-transaction', {
        body: { transactionId: txId, action: 'reject' }
      });

      if (error) {
        console.error('Reject error:', error);
        return false;
      }

      return data?.success || false;
    } catch (e) {
      console.error('Reject exception:', e);
      return false;
    }
  },

  getTransactionLogs: async (txId: string) => {
    try {
      const { data, error } = await supabase
        .from('transaction_audit_logs')
        .select('*')
        .eq('transaction_id', txId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Audit log fetch error:', e);
      return [];
    }
  },

  // ===== DEPARTMENTS =====
  // ===== DEPARTMENTS =====
  getDepartments: async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          members:department_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getDepartments error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error('getDepartments exception:', e);
      return [];
    }
  },

  createDepartment: async (deptData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-department', {
        body: deptData
      });

      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('createDepartment fully detailed error:', e);
      if (e.context && e.context.json) {
        e.context.json().then((errBody: any) => console.error('Edge Function Error Body:', JSON.stringify(errBody, null, 2)));
      }
      return { success: false, error: e };
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

  getDepartment: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          panels:payment_panels(*),
          vaults(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('getDepartment error:', e);
      return null;
    }
  },

  createPaymentPanel: async (panelData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-panel', {
        body: panelData
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('createPaymentPanel error:', e);
      return { success: false, error: e };
    }
  },

  // ===== PAYMENT PANELS (PUBLIC) =====
  getPanelBySlug: async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_panels')
        .select(`
                *,
                department:departments(name)
            `)
        .eq('public_slug', slug)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('getPanelBySlug error:', e);
      return null;
    }
  },

  payViaPanel: async (slug: string, amount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-transaction-from-panel', {
        body: { slug, amount }
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('payViaPanel error:', e);
      return { success: false, error: e };
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
      const { data, error } = await supabase
        .from('vaults')
        .select('*');

      if (error) {
        console.error('Vaults fetch error:', error);
        return { vaults: [], ledger: [] };
      }

      return { vaults: data || [], ledger: [] };
    } catch (e) {
      console.error('Vaults exception:', e);
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
  manualVaultDeposit: async (vaultId: string, amount: number, userEmail: string, network: string, addToUser: boolean) => {
    try {
      // Get current vault balance
      const { data: vault, error: vaultError } = await supabase
        .from('vaults')
        .select('balance')
        .eq('id', vaultId)
        .single();

      if (vaultError || !vault) {
        console.error('Vault not found:', vaultError);
        return false;
      }

      // Update vault balance
      const { error: updateError } = await supabase
        .from('vaults')
        .update({ balance: (vault.balance || 0) + amount })
        .eq('id', vaultId);

      if (updateError) {
        console.error('Failed to update vault balance:', updateError);
        return false;
      }

      // If addToUser is true and userEmail is provided, credit user balance
      if (addToUser && userEmail && userEmail !== 'External Transfer') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, balance')
          .eq('email', userEmail)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ balance: (profile.balance || 0) + amount })
            .eq('id', profile.id);

          // Create a deposit transaction record
          await supabase
            .from('transactions')
            .insert({
              user_id: profile.id,
              type: 'DEPOSIT',
              amount: amount,
              status: 'COMPLETED',
              network: network
            });
        }
      }

      return true;
    } catch (e) {
      console.error('manualVaultDeposit error:', e);
      return false;
    }
  },

  // ===== VAULT LINKING (STEP 4) =====
  getAvailableVaults: async () => {
    try {
      const { data, error } = await supabase
        .from('vaults')
        .select('*')
        .is('department_id', null);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getAvailableVaults error:', e);
      return [];
    }
  },

  assignVault: async (vaultId: string, departmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-vault', {
        body: { action: 'assign', vault_id: vaultId, department_id: departmentId }
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('assignVault error:', e);
      return false;
    }
  },

  unassignVault: async (vaultId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-vault', {
        body: { action: 'unassign', vault_id: vaultId }
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('unassignVault error:', e);
      return false;
    }
  },

  setPrimaryVault: async (vaultId: string, departmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-vault', {
        body: { action: 'set_primary', vault_id: vaultId, department_id: departmentId }
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('setPrimaryVault error:', e);
      return false;
    }
  },
  createP2POrder: async (type: string, amount: number, email: string, iban: string, bankName: string, accountName: string) => {
    try {
      // Use secure Edge Function
      // Determine correct P2P type (BUY or SELL)
      const p2pType = type === 'BUY' ? 'P2P_BUY' : 'P2P_SELL';

      const { data, error } = await supabase.functions.invoke('create-withdrawal', {
        body: {
          amount,
          type: p2pType,
          memo_code: p2pType === 'P2P_SELL' ? `${bankName} - ${iban}` : undefined,
          network: 'P2P'
        }
      });

      if (error) throw new Error(error.message || 'P2P Order failed');

      return {
        success: true,
        orderId: data.id,
        message: 'P2P order created successfully'
      };
    } catch (e: any) {
      console.error('createP2POrder error:', e);

      let errorBody: any = null;
      let stage = 'Unknown';

      // Attempt to extract body from various places
      if (e.context && typeof e.context.json === 'function') {
        try {
          errorBody = await e.context.json();
        } catch { /* ignore */ }
      }

      if (!errorBody && e.response && typeof e.response.json === 'function') {
        try {
          errorBody = await e.response.json();
        } catch { /* ignore */ }
      }

      if (errorBody) {
        console.error('Edge Function Error Body:', JSON.stringify(errorBody, null, 2))
        stage = errorBody.stage || 'Unknown';
        alert(`Sistem Hatası: ${errorBody.error || 'Bilinmeyen Hata'} (Stage: ${stage})`);
      } else {
        // Fallback: Stringify the whole error to see if hidden props exist
        const errorStr = JSON.stringify(e, Object.getOwnPropertyNames(e));
        console.error('Raw Error Object:', errorStr);
        alert(`İşlem Başarısız: ${e.message || 'Bilinmeyen Hata'} \n\nDetay: ${errorStr.substring(0, 200)}`);
      }

      return { success: false, error: e.message };
    }
  },
  getP2POrderStatus: async (orderId: string) => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', orderId)
        .single();

      return data ? { status: data.status, match: null } : null;
    } catch (e) {
      return null;
    }
  },
  markP2PPaymentSent: async () => ({ success: false }),
  confirmP2PPaymentReceived: async () => ({ success: false }),
  getMyP2PActivity: async () => ({ orders: [], trades: [] }),
  getAllMerchants: async () => [],
  createMerchant: async () => ({ success: false }),
  updateMerchant: async () => ({ success: false }),
  deleteMerchant: async () => false,
  getDepartmentMerchant: async () => null
};