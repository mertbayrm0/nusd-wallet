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
            trxAddress: profile?.trx_address,
            account_type: profile?.account_type || 'personal',
            business_name: profile?.business_name,
            business_department_id: profile?.business_department_id
          }
        };
      }
      return null;
    } catch (e) {
      console.error('Login error:', e);
      return null;
    }
  },

  register: async (name: string, email: string, password?: string, accountType: 'personal' | 'business' = 'personal', businessName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || 'demo123',
        options: {
          data: { name, accountType, businessName }
        }
      });

      if (error) {
        console.error('Register error:', error.message);
        alert(error.message || 'Registration failed');
        return null;
      }

      if (data.user) {
        let departmentId = null;

        // If business account, create a department and payment panel
        if (accountType === 'business' && businessName) {
          // 1. Create department
          const { data: deptData, error: deptError } = await supabase
            .from('departments')
            .insert({
              name: businessName,
              category: 'business',
              is_active: true,
              color: '#FFD700',
              owner_id: data.user.id
            })
            .select()
            .single();

          if (deptError) {
            console.error('Department creation error:', deptError.message);
          } else {
            departmentId = deptData?.id;

            // 2. Create payment panel for the department
            const slug = businessName.toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .substring(0, 30) + '-' + Date.now().toString(36);

            const { error: panelError } = await supabase
              .from('payment_panels')
              .insert({
                department_id: departmentId,
                public_slug: slug,
                is_active: true
              });

            if (panelError) {
              console.error('Payment panel creation error:', panelError.message);
            }
          }
        }

        // Generate NUSD code from email
        const generateNusdCode = (email: string) => {
          const hash = email.split('').reduce((acc: number, char: string) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
          }, 0);
          const code = Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
          return `NUSD-${code}`;
        };

        // Create or update profile record
        const profileData: any = {
          id: data.user.id,
          email: data.user.email,
          name: accountType === 'business' ? businessName : name,
          role: 'user',
          is_active: true,
          balance: 0,
          account_type: accountType,
          business_role: accountType === 'business' ? 'owner' : null,
          nusd_code: generateNusdCode(email)
        };

        // Add business-specific fields
        if (accountType === 'business') {
          profileData.business_name = businessName;
          profileData.business_department_id = departmentId;
        }

        // Use upsert to avoid conflict if profile already exists
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });

        if (profileError) {
          console.error('Profile creation error:', profileError.message);
        }

        return {
          token: data.session?.access_token,
          user: {
            email: data.user.email,
            name: accountType === 'business' ? businessName : name,
            balance: 0,
            role: 'user',
            isActive: true,
            accountType,
            businessName: accountType === 'business' ? businessName : undefined
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
          trxAddress: profile.trx_address,
          account_type: profile.account_type || 'personal',
          business_name: profile.business_name,
          business_department_id: profile.business_department_id
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

  toggleUserRole: async (email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', email)
        .single();

      if (!profile) return { success: false };

      const newRole = profile.role === 'admin' ? 'user' : 'admin';
      await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profile.id);

      return { success: true, newRole };
    } catch (e) {
      return { success: false };
    }
  },

  updateUserBalance: async (email: string, newBalance: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('email', email);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  toggleDepartmentStatus: async (deptId: string) => {
    try {
      const { data: dept } = await supabase
        .from('departments')
        .select('id, is_active')
        .eq('id', deptId)
        .single();

      if (!dept) return { success: false };

      await supabase
        .from('departments')
        .update({ is_active: !dept.is_active })
        .eq('id', deptId);

      return { success: true, newStatus: !dept.is_active };
    } catch (e) {
      return { success: false };
    }
  },

  deletePaymentPanel: async (panelId: string) => {
    try {
      const { error } = await supabase
        .from('payment_panels')
        .delete()
        .eq('id', panelId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  toggleVaultStatus: async (vaultId: string) => {
    try {
      const { data: vault } = await supabase
        .from('vaults')
        .select('id, is_active')
        .eq('id', vaultId)
        .single();

      if (!vault) return { success: false };

      await supabase
        .from('vaults')
        .update({ is_active: !vault.is_active })
        .eq('id', vaultId);

      return { success: true, newStatus: !vault.is_active };
    } catch (e) {
      return { success: false };
    }
  },

  checkBlockchainDeposits: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-deposits');
      if (error) {
        console.error('Check deposits error:', error);
        return { success: false, error: error.message };
      }
      return data || { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  processBlockchainWithdrawal: async (withdrawalId: string, vaultId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: { withdrawal_id: withdrawalId, vault_id: vaultId }
      });
      if (error) {
        console.error('Process withdrawal error:', error);
        return { success: false, error: error.message };
      }
      return data || { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
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
          vaults(*),
          owner:profiles!departments_owner_id_fkey(id, email, full_name, balance, nusd_code, account_type)
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

  // Get primary vault for a department
  getVaultByDepartment: async (departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('vaults')
        .select('*')
        .eq('department_id', departmentId)
        .eq('is_primary', true)
        .single();

      if (error) {
        console.error('getVaultByDepartment error:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error('getVaultByDepartment exception:', e);
      return null;
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
  markPaymentSent: async (email: string, matchId: any, amount: any, confirmed: boolean) => { },
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


      let responseData = data;
      // Handle the case where we return 200 but with error field (Debugging Strategy)
      if (data && data.error) {
        throw {
          message: data.error,
          context: {
            json: () => Promise.resolve(data)
          }
        };
      }
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

  // ===== NEW P2P API (Isolated) =====

  // Create a new P2P order (BUY or SELL)
  createP2POrderNew: async (side: 'BUY' | 'SELL', amount_usd: number, iban?: string, bank_name?: string, account_name?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('p2p-create-order', {
        body: { side, amount_usd, iban, bank_name, account_name }
      });

      if (error) {
        console.error('P2P create order error:', error);
        return { success: false, error: error.message || 'Edge function error' };
      }

      // data contains the response from Edge Function
      if (data?.success === false) {
        return { success: false, error: data.error || 'Order creation failed' };
      }

      // data.order should contain the created order
      return { success: true, order: data?.order || data };
    } catch (e: any) {
      console.error('P2P create order exception:', e);
      return { success: false, error: e.message || 'Network error' };
    }
  },

  // Find a match for an order
  matchP2POrder: async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('p2p-match', {
        body: { orderId }
      });

      if (error) {
        console.error('P2P match error:', error);
        return { success: false, error: error.message || 'Match error' };
      }

      // Handle Edge Function response
      if (data?.success === false) {
        return { success: false, error: data.error || 'No match found', waiting: data.waiting };
      }

      return { success: true, match: data?.match || data };
    } catch (e: any) {
      console.error('P2P match exception:', e);
      return { success: false, error: e.message || 'Network error' };
    }
  },

  // Get pending withdrawals closest to target amount
  getPendingWithdrawals: async (targetAmount?: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-pending-withdrawals', {
        body: { targetAmount: targetAmount || 0 }
      });

      if (error) {
        console.error('Get pending withdrawals error:', error);
        return [];
      }

      return data?.withdrawals || [];
    } catch (e: any) {
      console.error('Get pending withdrawals exception:', e);
      return [];
    }
  },

  // Approve a crypto withdrawal
  approveWithdrawal: async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'approved' })
        .eq('id', withdrawalId);

      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      console.error('Approve withdrawal error:', e);
      return { success: false, error: e.message };
    }
  },

  // Reject a crypto withdrawal
  rejectWithdrawal: async (withdrawalId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'rejected', notes: reason })
        .eq('id', withdrawalId);

      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      console.error('Reject withdrawal error:', e);
      return { success: false, error: e.message };
    }
  },

  // Seller marks payment as sent
  markP2PPaid: async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('p2p-mark-paid', {
        body: { orderId }
      });

      if (error) {
        console.error('P2P mark paid error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (e: any) {
      console.error('P2P mark paid exception:', e);
      return { success: false, error: e.message };
    }
  },

  // Buyer confirms payment received
  buyerConfirmP2P: async (orderId: string, confirm: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('p2p-buyer-confirm', {
        body: { orderId, confirm }
      });

      if (error) {
        console.error('P2P buyer confirm error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (e: any) {
      console.error('P2P buyer confirm exception:', e);
      return { success: false, error: e.message };
    }
  },

  // Admin confirms/rejects order
  adminConfirmP2P: async (orderId: string, confirm: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('p2p-admin-confirm', {
        body: { orderId, confirm }
      });

      if (error) {
        console.error('P2P admin confirm error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (e: any) {
      console.error('P2P admin confirm exception:', e);
      return { success: false, error: e.message };
    }
  },

  // Get P2P order status (from new table)
  getP2POrderStatus: async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('p2p_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('P2P order status error:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('P2P order status exception:', e);
      return null;
    }
  },

  // Check for any active P2P order (SELL or BUY) - for page-level blocking
  getActiveP2POrder: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check for active SELL orders (en son oluşturulana göre sırala)
      // MATCHED durumunu çıkardık - eşleşme olduktan sonra blok yok
      const { data: sellOrders, error: sellError } = await supabase
        .from('p2p_orders')
        .select('id, status, amount_usd, created_at')
        .eq('seller_id', user.id)
        .in('status', ['OPEN', 'PAID'])  // MATCHED çıkarıldı
        .order('created_at', { ascending: false })
        .limit(1);

      if (sellError) {
        console.error('getActiveP2POrder SELL error:', sellError);
      }

      if (sellOrders && sellOrders.length > 0) {
        console.log('Active SELL order found:', sellOrders[0]);
        return { ...sellOrders[0], type: 'SELL' };
      }

      // Check for active BUY orders (en son oluşturulana göre sırala)
      // MATCHED durumunu çıkardık - eşleşme olduktan sonra blok yok
      const { data: buyOrders, error: buyError } = await supabase
        .from('p2p_orders')
        .select('id, status, amount_usd, created_at')
        .eq('buyer_id', user.id)
        .in('status', ['OPEN', 'PAID'])  // MATCHED çıkarıldı
        .order('created_at', { ascending: false })
        .limit(1);

      if (buyError) {
        console.error('getActiveP2POrder BUY error:', buyError);
      }

      if (buyOrders && buyOrders.length > 0) {
        console.log('Active BUY order found:', buyOrders[0]);
        return { ...buyOrders[0], type: 'BUY' };
      }

      console.log('No active P2P orders found');
      return null;
    } catch (e) {
      console.error('getActiveP2POrder error:', e);
      return null;
    }
  },

  // Cancel P2P order (via Edge Function)
  cancelP2POrder: async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('p2p-cancel-order', {
        body: { orderId }
      });

      if (error) {
        console.error('Cancel P2P order error:', error);
        return { success: false, error: error.message };
      }

      // Handle Edge Function response
      if (data?.success === false) {
        return { success: false, error: data.error || 'Cancel failed' };
      }

      return { success: true, order: data?.order || data };
    } catch (e: any) {
      console.error('Cancel P2P order exception:', e);
      return { success: false, error: e.message };
    }
  },

  // Get all P2P orders for current user
  getMyP2POrders: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('p2p_orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('My P2P orders error:', error);
        return [];
      }

      // Deduplicate matched order pairs
      const seenMatches = new Set<string>();
      const deduplicated = (data || []).filter((order: any) => {
        if (order.matched_order_id) {
          const pairKey = [order.id, order.matched_order_id].sort().join('|');
          if (seenMatches.has(pairKey)) return false;
          seenMatches.add(pairKey);
        }
        return true;
      });

      return deduplicated;
    } catch (e) {
      console.error('My P2P orders exception:', e);
      return [];
    }
  },

  // Get P2P events/audit log for an order
  getP2PEvents: async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('p2p_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('P2P events error:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('P2P events exception:', e);
      return [];
    }
  },

  // Admin: Get all P2P orders
  // Admin: Get all P2P orders (REMOVED DUPLICATE)

  // Legacy stubs (kept for compatibility)
  markP2PPaymentSent: async () => ({ success: false }),
  confirmP2PPaymentReceived: async () => ({ success: false }),
  getMyP2PActivity: async () => ({ orders: [], trades: [] }),
  getAllMerchants: async () => [],
  createMerchant: async () => ({ success: false }),
  updateMerchant: async () => ({ success: false }),
  deleteMerchant: async () => false,
  getDepartmentMerchant: async () => null,

  // ===== NEW UNIFIED P2P API =====
  p2pAction: async (action: 'create' | 'markPaid' | 'confirm' | 'reject', params: {
    orderId?: string;
    amount?: number;
    side?: 'BUY' | 'SELL';
    iban?: string;
    bankName?: string;
    accountName?: string;
  } = {}) => {
    try {
      const { data, error } = await supabase.functions.invoke('p2p-action', {
        body: { action, ...params }
      });

      if (error) {
        console.error('P2P action error:', error);
        return { success: false, error: error.message || 'Edge function error' };
      }

      return data || { success: false, error: 'No response' };
    } catch (e: any) {
      console.error('P2P action exception:', e);
      return { success: false, error: e.message || 'Network error' };
    }
  },

  // ===== BUSINESS ACCOUNT =====
  getProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*, business_department_id, business_name, account_type')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('getProfile error:', e);
      return null;
    }
  },

  getDepartmentTransactions: async (departmentId: string) => {
    try {
      // First get the department's owner_id
      const { data: dept } = await supabase
        .from('departments')
        .select('owner_id')
        .eq('id', departmentId)
        .single();

      if (!dept?.owner_id) {
        console.log('No owner_id for department:', departmentId);
        return [];
      }

      // Get owner's transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', dept.owner_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getDepartmentTransactions error:', e);
      return [];
    }
  },

  internalTransfer: async (recipientCode: string, amount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('internal-transfer', {
        body: { recipient_code: recipientCode, amount }
      });

      if (error) throw error;
      return data || { success: false, error: 'No response' };
    } catch (e: any) {
      console.error('internalTransfer error:', e);
      return { success: false, error: e.message || 'Transfer failed' };
    }
  },

  updatePanelStatus: async (panelId: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('payment_panels')
        .update({ is_active: isActive })
        .eq('id', panelId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, panel: data };
    } catch (e: any) {
      console.error('updatePanelStatus error:', e);
      return { success: false, error: e.message };
    }
  },

  createBusinessAccount: async (businessName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-business-account', {
        body: { businessName }
      });

      if (error) throw error;
      return data || { success: false, error: 'No response' };
    } catch (e: any) {
      console.error('createBusinessAccount error:', e);
      return { success: false, error: e.message || 'Failed to create business account' };
    }
  },

  // =============================================
  // P2P ADMIN FUNCTIONS
  // =============================================

  // Get all P2P orders for admin panel (filtered to avoid duplicates)
  getAllP2POrders: async () => {
    try {
      const { data, error } = await supabase
        .from('p2p_orders')
        .select(`
          *,
          buyer:profiles!p2p_orders_buyer_id_fkey(email, name),
          seller:profiles!p2p_orders_seller_id_fkey(email, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getAllP2POrders error:', error);
        // Fallback query without joins if foreign key issue
        const { data: fallbackData } = await supabase
          .from('p2p_orders')
          .select('*')
          .order('created_at', { ascending: false });
        return fallbackData || [];
      }

      // Filter out duplicate orders - only show the "main" order, not the matched pair
      // If an order has a matched_order_id, check if that matched order is already in the list
      // If so, skip this one to avoid showing the same trade twice
      const seenPairs = new Set<string>();
      const filteredData = (data || []).filter(order => {
        // Create a unique pair key (sorted to ensure same pair regardless of direction)
        if (order.matched_order_id) {
          const pairKey = [order.id, order.matched_order_id].sort().join('|');
          if (seenPairs.has(pairKey)) {
            return false; // Skip this duplicate
          }
          seenPairs.add(pairKey);
        }
        return true;
      });

      return filteredData;
    } catch (e) {
      console.error('getAllP2POrders error:', e);
      return [];
    }
  },

  // Admin: Force complete a P2P order
  adminForceCompleteP2POrder: async (orderId: string) => {
    try {
      // Edge Function kullan - SERVICE_ROLE ile RLS bypass
      const { data, error } = await supabase.functions.invoke('p2p-admin-action', {
        body: { action: 'forceComplete', orderId }
      });

      if (error) {
        console.error('Admin force complete error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (e: any) {
      console.error('adminForceCompleteP2POrder error:', e);
      return { success: false, error: e.message };
    }
  },

  // Admin: Force cancel a P2P order
  adminForceCancelP2POrder: async (orderId: string) => {
    try {
      // Edge Function kullan - SERVICE_ROLE ile RLS bypass
      const { data, error } = await supabase.functions.invoke('p2p-admin-action', {
        body: { action: 'forceCancel', orderId }
      });

      if (error) {
        console.error('Admin force cancel error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (e: any) {
      console.error('adminForceCancelP2POrder error:', e);
      return { success: false, error: e.message };
    }
  },

  // ===== EXCHANGE RATES =====
  getExchangeRate: async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate, buy_rate, sell_rate, spread, fetched_at')
        .eq('pair', 'USDT/TRY')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('getExchangeRate error:', error);
        // Return fallback rate if no data (güncel piyasa yaklaşık değeri)
        return {
          rate: 42.50,
          buy_rate: 42.60,
          sell_rate: 42.40,
          spread: 0.10,
          fetched_at: new Date().toISOString(),
          is_fallback: true
        };
      }

      return {
        rate: data.rate,
        buy_rate: data.buy_rate,
        sell_rate: data.sell_rate,
        spread: data.spread,
        fetched_at: data.fetched_at,
        is_fallback: false
      };
    } catch (e: any) {
      console.error('getExchangeRate exception:', e);
      return {
        rate: 42.50,
        buy_rate: 42.60,
        sell_rate: 42.40,
        spread: 0.10,
        fetched_at: new Date().toISOString(),
        is_fallback: true
      };
    }
  },

  // Update exchange rate by calling Edge Function
  updateExchangeRate: async () => {
    try {
      const response = await fetch(
        'https://bzbzcnyipynpkzaqauxd.supabase.co/functions/v1/update-exchange-rate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6YnpjbnlpcHlucGt6YXFhdXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDg3ODIsImV4cCI6MjA4MTE4NDc4Mn0.1CfLmFr80h9B0_tvicYxQSJUAmaWBBi3V5ZkD451r-g`
          }
        }
      );

      const data = await response.json();
      return data;
    } catch (e: any) {
      console.error('updateExchangeRate error:', e);
      return { success: false, error: e.message };
    }
  },

  // ===== NOTIFICATIONS =====

  // Bildirim geçmişini getir (max 15)
  getNotificationHistory: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) {
        console.error('getNotificationHistory error:', error);
        return [];
      }

      return data || [];
    } catch (e: any) {
      console.error('getNotificationHistory exception:', e);
      return [];
    }
  },

  // Bildirim oluştur (eski bildirimleri sil - max 15 tut)
  createNotification: async (type: string, title: string, message: string, data: any = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      // Yeni bildirim ekle
      const { data: newNotif, error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type,
          title,
          message,
          data
        })
        .select()
        .single();

      if (insertError) {
        console.error('createNotification insert error:', insertError);
        return { success: false, error: insertError.message };
      }

      // 15'ten fazla bildirim varsa eskileri sil
      const { data: allNotifs } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (allNotifs && allNotifs.length > 15) {
        const idsToDelete = allNotifs.slice(15).map(n => n.id);
        await supabase
          .from('notifications')
          .delete()
          .in('id', idsToDelete);
      }

      return { success: true, notification: newNotif };
    } catch (e: any) {
      console.error('createNotification exception:', e);
      return { success: false, error: e.message };
    }
  },

  // Bildirimi okundu işaretle
  markNotificationAsRead: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('markNotificationAsRead error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      console.error('markNotificationAsRead exception:', e);
      return { success: false, error: e.message };
    }
  },

  // Tüm bildirimleri okundu işaretle
  markAllNotificationsAsRead: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('markAllNotificationsAsRead error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      console.error('markAllNotificationsAsRead exception:', e);
      return { success: false, error: e.message };
    }
  },

  // Okunmamış bildirim sayısı
  getUnreadNotificationCount: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('getUnreadNotificationCount error:', error);
        return 0;
      }

      return count || 0;
    } catch (e: any) {
      console.error('getUnreadNotificationCount exception:', e);
      return 0;
    }
  },

  // ===== BUSINESS TEAM MANAGEMENT =====

  // İşletme üyesi davet et
  inviteBusinessMember: async (email: string, role: string = 'staff') => {
    try {
      const { data, error } = await supabase.functions.invoke('invite-business-member', {
        body: { email, role }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ...data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // İşletme davetini kabul et
  acceptBusinessInvite: async (inviteCode: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('accept-business-invite', {
        body: { invite_code: inviteCode }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ...data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // İşletme ekibi üyelerini getir
  getBusinessTeam: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Unauthorized' };

      // Get current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, parent_business_id, business_role')
        .eq('id', user.id)
        .single();

      // Determine the business ID (either self if owner, or parent)
      const businessId = profile?.parent_business_id || profile?.id;

      // Get all team members
      const { data: members, error } = await supabase
        .from('profiles')
        .select('id, email, name, business_role, created_at')
        .or(`id.eq.${businessId},parent_business_id.eq.${businessId}`);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, members: members || [] };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Bekleyen davetleri getir
  getBusinessInvites: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Unauthorized' };

      const { data: invites, error } = await supabase
        .from('business_invites')
        .select('*')
        .eq('business_id', user.id)
        .eq('status', 'pending');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, invites: invites || [] };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Daveti iptal et
  cancelBusinessInvite: async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('business_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Admin: İşletme Paneli yetkilendirmesi (Edge Function ile RLS bypass)
  activateBusinessPanel: async (userId: string, activate: boolean = true) => {
    try {
      const { data, error } = await supabase.functions.invoke('activate-business-panel', {
        body: { userId, activate }
      });

      if (error) {
        console.error('activateBusinessPanel error:', error);
        return { success: false, error: error.message };
      }
      return data || { success: true };
    } catch (e: any) {
      console.error('activateBusinessPanel exception:', e);
      return { success: false, error: e.message };
    }
  },

  // Portal Talep Sistemi
  createPortalRequest: async (departmentId: string, name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { error } = await supabase
        .from('portal_requests')
        .insert({
          department_id: departmentId,
          requested_by: user.id,
          name,
          status: 'pending'
        });

      if (error) {
        console.error('createPortalRequest error:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getPortalRequests: async (departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('portal_requests')
        .select('*, requester:profiles!portal_requests_requested_by_fkey(email, name)')
        .eq('department_id', departmentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getPortalRequests error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  },

  approvePortalRequest: async (requestId: string) => {
    try {
      // Get request details
      const { data: request, error: fetchError } = await supabase
        .from('portal_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        return { success: false, error: 'Request not found' };
      }

      // Create the portal
      const slug = request.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30) + '-' + Date.now().toString(36);

      const { error: panelError } = await supabase
        .from('payment_panels')
        .insert({
          department_id: request.department_id,
          name: request.name,
          public_slug: slug,
          is_active: true
        });

      if (panelError) {
        console.error('Panel creation error:', panelError);
        return { success: false, error: panelError.message };
      }

      // Update request status
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('portal_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', requestId);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  rejectPortalRequest: async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('portal_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', requestId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // ===== TELEGRAM VERIFICATION (KYC & DEKONT) =====

  // Submit KYC or Deposit verification
  submitVerification: async (
    type: 'kyc' | 'deposit',
    documentFile: File,
    documentFile2?: File,
    amount?: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();

      // Upload first document to storage
      const fileName1 = `${user.id}/${type}_${Date.now()}_1.${documentFile.name.split('.').pop()}`;
      const { error: uploadError1 } = await supabase.storage
        .from('verification-docs')
        .upload(fileName1, documentFile);

      if (uploadError1) {
        console.error('Upload error 1:', uploadError1);
        return { success: false, error: 'Belge yüklenemedi' };
      }

      // Upload second document if provided
      let fileName2 = null;
      if (documentFile2) {
        fileName2 = `${user.id}/${type}_${Date.now()}_2.${documentFile2.name.split('.').pop()}`;
        const { error: uploadError2 } = await supabase.storage
          .from('verification-docs')
          .upload(fileName2, documentFile2);

        if (uploadError2) {
          console.error('Upload error 2:', uploadError2);
        }
      }

      // Create submission record
      const { data: submission, error: insertError } = await supabase
        .from('verification_submissions')
        .insert({
          user_id: user.id,
          user_email: profile?.email || user.email,
          user_name: profile?.name,
          submission_type: type,
          document_url: fileName1,
          document_url_2: fileName2,
          amount: type === 'deposit' ? amount : null,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return { success: false, error: 'Başvuru oluşturulamadı' };
      }

      // Send to Telegram via Edge Function
      const { error: telegramError } = await supabase.functions.invoke('send-telegram-verification', {
        body: {
          submission_id: submission.id,
          submission_type: type,
          user_email: profile?.email || user.email,
          user_name: profile?.name,
          document_url: fileName1,
          document_url_2: fileName2,
          amount
        }
      });

      if (telegramError) {
        console.error('Telegram error:', telegramError);
        // Don't fail - submission is saved, just telegram notification failed
      }

      return { success: true, submission_id: submission.id };
    } catch (e: any) {
      console.error('submitVerification error:', e);
      return { success: false, error: e.message };
    }
  },

  // Get current verification status
  getVerificationStatus: async (type?: 'kyc' | 'deposit') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      let query = supabase
        .from('verification_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('submission_type', type);
      }

      const { data, error } = await query.limit(1).single();

      if (error && error.code !== 'PGRST116') {
        console.error('getVerificationStatus error:', error);
      }

      return data;
    } catch (e) {
      console.error('getVerificationStatus error:', e);
      return null;
    }
  },

  // Get verification history
  getVerificationHistory: async (type?: 'kyc' | 'deposit') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('verification_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('submission_type', type);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error('getVerificationHistory error:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('getVerificationHistory error:', e);
      return [];
    }
  },

  // Check if user has verified KYC
  isKYCVerified: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('kyc_verified')
        .eq('id', user.id)
        .single();

      return profile?.kyc_verified || false;
    } catch (e) {
      return false;
    }
  }
};