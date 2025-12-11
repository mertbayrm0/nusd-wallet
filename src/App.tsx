import React, { createContext, useContext, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import AdminLogs from './screens/AdminLogs';
import AdminVaults from './screens/AdminVaults';
import AdminDepartments from './screens/AdminDepartments';
import UsdtPayment from './screens/UsdtPayment';
import MerchantPayment from './screens/MerchantPayment';
import FindAgent from './screens/FindAgent';
import AutoLogin from './screens/AutoLogin';
import BottomNav from './components/BottomNav';
import { UserState } from './types';
import { api } from './services/api';

interface AppContextType {
  user: UserState | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);

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

// Admin routes use their own Full-Screen Layout, so we don't wrap them in the mobile Layout component
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, isLoading } = useApp();

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

  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const savedEmail = localStorage.getItem('nusd_current_user');
      if (savedEmail) {
        const u = await api.getUser(savedEmail);
        if (u) {
          setUser(u);
        }
      }
      setIsLoading(false);
    };
    restoreSession();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    const res = await api.login(email, password || 'demo');
    if (res && res.token) {
      localStorage.setItem('nusd_auth_token', res.token);
      localStorage.setItem('nusd_current_user', res.user.email); // Ensure email is saved from response
      setUser(res.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nusd_current_user');
    localStorage.removeItem('nusd_auth_token'); // Clear token
  };

  const refreshUser = async () => {
    if (user) {
      const u = await api.getUser(user.email);
      if (u) setUser(u);
    }
  };

  // Auto-Logout on Inactivity
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    const handleLogout = () => {
      console.log("Session expired due to inactivity");
      logout();
    };

    const resetTimer = () => {
      if (!user) return;
      clearTimeout(timer);
      timer = setTimeout(handleLogout, TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    if (user) {
      resetTimer(); // Start timer
      events.forEach(e => window.addEventListener(e, resetTimer));
    }

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user]);

  return (
    <AppContext.Provider value={{ user, login, logout, refreshUser, isLoading }}>
      <HashRouter>
        <ScrollToTop />
        <Routes>
          {/* Admin Routes - Full Screen (MUST BE FIRST) */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/transactions" element={<ProtectedRoute adminOnly><AdminTransactions /></ProtectedRoute>} />
          <Route path="/admin/vaults" element={<ProtectedRoute adminOnly><AdminVaults /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute adminOnly><AdminDepartments /></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute adminOnly><AdminLogs /></ProtectedRoute>} />

          {/* Welcome Screen for First-Time Users */}
          <Route path="/welcome" element={<Welcome />} />

          {/* Mobile App Routes - Wrapped in Mobile Layout */}
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

          {/* Public Pages - No Auth Required */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/pay" element={<UsdtPayment />} />
          <Route path="/pay/:slug" element={<MerchantPayment />} />
          <Route path="/find-agent" element={<FindAgent />} />
          <Route path="/autologin" element={<AutoLogin />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
};
export default App;