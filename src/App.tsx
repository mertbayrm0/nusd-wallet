import React, { createContext, useContext, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import Welcome from './screens/Welcome';
import Login from './screens/Login';
import Register from './screens/Register';
import Dashboard from './screens/Dashboard';
import Deposit from './screens/Deposit';
import DepositConfirmation from './screens/DepositConfirmation';
import Withdraw from './screens/Withdraw';
import CryptoWithdraw from './screens/CryptoWithdraw';
import CryptoDeposit from './screens/CryptoDeposit';
import History from './screens/History';
import BankAccounts from './screens/BankAccounts';
import Profile from './screens/Profile';
import QRScanner from './screens/QRScanner';
import PrivacyPolicy from './screens/PrivacyPolicy';
import TermsOfService from './screens/TermsOfService';
import AdminDashboard from './screens/AdminDashboard';
import AdminUsers from './screens/AdminUsers';
import AdminTransactions from './screens/AdminTransactions';
import AdminP2POrders from './screens/AdminP2POrders';
import AdminLogs from './screens/AdminLogs';
import AdminVaults from './screens/AdminVaults';
import AdminDepartments from './screens/AdminDepartments';
import AdminDepartmentDetail from './screens/AdminDepartmentDetail';
import FindAgent from './screens/FindAgent';
import AutoLogin from './screens/AutoLogin';
import PaymentPanel from './screens/PaymentPanel';
import BusinessDashboard from './screens/BusinessDashboard';
import KYCVerification from './screens/KYCVerification';
import ProfileEdit from './screens/ProfileEdit';
import TransactionLimits from './screens/TransactionLimits';
import BottomNav from './components/BottomNav';
import { UserState } from './types';
import { supabase } from './services/supabase';

// ===== TYPES =====
interface AppContextType {
  user: UserState | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);

// ===== HELPER: Fetch profile from Supabase with timeout =====
async function fetchOrCreateProfileWithTimeout(authUser: User, timeoutMs: number = 15000): Promise<UserState> {
  // Fallback user data from auth
  const fallbackUser: UserState = {
    email: authUser.email || '',
    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
    balance: 0,
    role: 'user',
    isActive: true,
    account_type: authUser.user_metadata?.accountType || 'personal',
    business_name: authUser.user_metadata?.businessName
  };

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('Profile fetch timeout - using fallback user');
      resolve(fallbackUser);
    }, timeoutMs);

    fetchProfileFromSupabase(authUser, fallbackUser)
      .then((profile) => {
        clearTimeout(timeout);
        resolve(profile);
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error('Profile fetch error:', error);
        resolve(fallbackUser);
      });
  });
}

async function fetchProfileFromSupabase(authUser: User, fallbackUser: UserState): Promise<UserState> {
  try {
    // Try to fetch existing profile by ID first
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    // If not found by ID, skip email lookup to avoid 406 errors
    // Email lookup is problematic due to RLS policies
    if (error && error.code === 'PGRST116') {
      console.log('Profile not found by ID, will create new profile');
      // Don't try email lookup - goes directly to profile creation below
    }

    // If profile still doesn't exist, create one
    if (error && error.code === 'PGRST116') {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          role: 'user',
          is_active: true,
          balance: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('Profile creation error:', insertError.message);
        return fallbackUser;
      }

      if (newProfile) {
        return {
          email: newProfile.email,
          name: newProfile.name || 'User',
          balance: newProfile.balance || 0,
          role: newProfile.role || 'user',
          isActive: newProfile.is_active ?? true,
          createdAt: newProfile.created_at ? new Date(newProfile.created_at).getTime() : Date.now(),
          trxAddress: newProfile.trx_address,
          account_type: newProfile.account_type || 'personal',
          business_name: newProfile.business_name,
          business_department_id: newProfile.business_department_id
        };
      }
      return fallbackUser;
    } else if (error) {
      console.error('Profile fetch error:', error.message);
      return fallbackUser;
    }

    if (profile) {
      return {
        email: profile.email,
        name: profile.name || 'User',
        balance: profile.balance || 0,
        role: profile.role || 'user',
        isActive: profile.is_active ?? true,
        createdAt: profile.created_at ? new Date(profile.created_at).getTime() : Date.now(),
        trxAddress: profile.trx_address,
        account_type: profile.account_type || 'personal',
        business_name: profile.business_name,
        business_department_id: profile.business_department_id
      };
    }
    return fallbackUser;
  } catch (e) {
    console.error('fetchProfileFromSupabase exception:', e);
    return fallbackUser;
  }
}

// ===== LAYOUT COMPONENT =====
const Layout = ({ children, showBottomNav = false }: { children?: React.ReactNode; showBottomNav?: boolean }) => {
  return (
    <div className="popup-layout flex justify-center min-h-screen bg-gray-100 dark:bg-gray-900 font-display">
      <div className="w-full max-w-md bg-background-light dark:bg-background-dark min-h-screen shadow-xl relative overflow-x-hidden">
        {children}
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
};

// ===== PROTECTED ROUTE COMPONENT =====
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, session, isLoading } = useApp();

  // Wait for session to be restored before redirecting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Check session first, then user data
  if (!session || !user) return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// ===== SCROLL TO TOP =====
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// ===== MAIN APP COMPONENT =====
const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ===== SINGLE SOURCE OF TRUTH: Supabase Auth =====
  useEffect(() => {
    let mounted = true;

    // Initial session check
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (mounted && currentSession?.user) {
          setSession(currentSession);
          const profile = await fetchOrCreateProfileWithTimeout(currentSession.user);
          if (mounted) setUser(profile);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);

        // INITIAL_SESSION ve TOKEN_REFRESHED eventlerini atla - profil zaten initializeAuth'da çekildi
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          if (newSession) {
            setSession(newSession);
          }
          return;
        }

        if (event === 'SIGNED_IN' && newSession?.user) {
          setSession(newSession);
          const profile = await fetchOrCreateProfileWithTimeout(newSession.user);
          setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ===== LOGIN: Only uses Supabase Auth =====
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error.message);
        return false;
      }

      if (data.session && data.user) {
        setSession(data.session);
        const profile = await fetchOrCreateProfileWithTimeout(data.user);
        setUser(profile);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login exception:', e);
      return false;
    }
  };

  // ===== LOGOUT: Only uses Supabase Auth =====
  const logout = async () => {
    await supabase.auth.signOut();
    // State will be cleared by onAuthStateChange listener
  };

  // ===== REFRESH USER: Fetches latest profile data =====
  const refreshUser = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      const profile = await fetchOrCreateProfileWithTimeout(currentSession.user);
      setUser(profile);
    }
  };

  // ===== AUTO-LOGOUT ON INACTIVITY (5 minutes) =====
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const TIMEOUT_MS = 5 * 60 * 1000;

    const handleAutoLogout = () => {
      console.log("Session expired due to inactivity");
      logout();
    };

    const resetTimer = () => {
      if (!session) return;
      clearTimeout(timer);
      timer = setTimeout(handleAutoLogout, TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    if (session) {
      resetTimer();
      events.forEach(e => window.addEventListener(e, resetTimer));
    }

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [session]);

  return (
    <AppContext.Provider value={{ user, session, login, logout, refreshUser, isLoading }}>
      <HashRouter>
        <ScrollToTop />
        <Routes>
          {/* Admin Routes - Full Screen */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/transactions" element={<ProtectedRoute adminOnly><AdminTransactions /></ProtectedRoute>} />
          <Route path="/admin/p2p-orders" element={<ProtectedRoute adminOnly><AdminP2POrders /></ProtectedRoute>} />
          <Route path="/admin/vaults" element={<ProtectedRoute adminOnly><AdminVaults /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute adminOnly><AdminDepartments /></ProtectedRoute>} />
          <Route path="/admin/departments/:id" element={<ProtectedRoute adminOnly><AdminDepartmentDetail /></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute adminOnly><AdminLogs /></ProtectedRoute>} />

          {/* Welcome Screen */}
          <Route path="/welcome" element={<Welcome />} />

          {/* Mobile App Routes */}
          <Route path="/" element={<Layout><Login /></Layout>} />
          <Route path="/register" element={<Layout><Register /></Layout>} />
          <Route path="/dashboard" element={<Layout showBottomNav><ProtectedRoute><Dashboard /></ProtectedRoute></Layout>} />
          <Route path="/profile" element={<Layout showBottomNav><ProtectedRoute><Profile /></ProtectedRoute></Layout>} />
          <Route path="/qr-scan" element={<Layout showBottomNav><ProtectedRoute><QRScanner /></ProtectedRoute></Layout>} />
          <Route path="/history" element={<Layout showBottomNav><ProtectedRoute><History /></ProtectedRoute></Layout>} />
          <Route path="/deposit" element={<Layout showBottomNav><ProtectedRoute><Deposit /></ProtectedRoute></Layout>} />
          <Route path="/deposit/confirm" element={<Layout><ProtectedRoute><DepositConfirmation /></ProtectedRoute></Layout>} />
          <Route path="/withdraw" element={<Layout showBottomNav><ProtectedRoute><Withdraw /></ProtectedRoute></Layout>} />
          <Route path="/crypto/withdraw" element={<Layout><ProtectedRoute><CryptoWithdraw /></ProtectedRoute></Layout>} />
          <Route path="/crypto/deposit" element={<Layout><ProtectedRoute><CryptoDeposit /></ProtectedRoute></Layout>} />
          <Route path="/bank-accounts" element={<Layout><ProtectedRoute><BankAccounts /></ProtectedRoute></Layout>} />
          <Route path="/kyc" element={<Layout><ProtectedRoute><KYCVerification /></ProtectedRoute></Layout>} />
          <Route path="/profile/edit" element={<Layout><ProtectedRoute><ProfileEdit /></ProtectedRoute></Layout>} />
          <Route path="/limits" element={<Layout><ProtectedRoute><TransactionLimits /></ProtectedRoute></Layout>} />

          {/* Public Pages */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/find-agent" element={<FindAgent />} />
          <Route path="/autologin" element={<AutoLogin />} />
          <Route path="/pay/:slug" element={<PaymentPanel />} />
          <Route path="/business" element={<Layout><ProtectedRoute><BusinessDashboard /></ProtectedRoute></Layout>} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;