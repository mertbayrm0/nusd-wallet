import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import SuccessModal from '../components/SuccessModal';
import { DashboardSkeleton } from '../components/Skeleton';
import { useTheme } from '../theme';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useApp();
  const { isDark } = useTheme();
  const [txs, setTxs] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [notification, setNotification] = useState<any>(null);
  const [p2pPending, setP2pPending] = useState<any[]>([]); // P2P orders needing action
  const [authUserId, setAuthUserId] = useState<string | null>(null); // Supabase auth user ID
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    refreshUser();
    if (user) {
      // Initial Load
      loadData();

      // Get auth user ID for realtime filters
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setAuthUserId(data.user.id);

          // 🔥 REALTIME: P2P Orders değişikliklerini dinle
          const p2pChannel = supabase
            .channel('p2p-realtime')
            .on(
              'postgres_changes',
              {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'p2p_orders',
                filter: `buyer_id=eq.${data.user.id}`
              },
              (payload) => {
                console.log('[REALTIME] P2P order change (buyer):', payload);
                loadData(); // Veri güncelle
                refreshUser(); // Bakiye güncelle
              }
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'p2p_orders',
                filter: `seller_id=eq.${data.user.id}`
              },
              (payload) => {
                console.log('[REALTIME] P2P order change (seller):', payload);
                loadData();
                refreshUser();
              }
            )
            .subscribe();

          // 🔥 REALTIME: Bakiye değişikliklerini dinle
          const balanceChannel = supabase
            .channel('balance-realtime')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${data.user.id}`
              },
              (payload) => {
                console.log('[REALTIME] Balance updated:', payload.new);
                refreshUser(); // Bakiyeyi güncelle
              }
            )
            .subscribe();

          // Cleanup on unmount
          return () => {
            supabase.removeChannel(p2pChannel);
            supabase.removeChannel(balanceChannel);
          };
        }
      });

      // Fallback: Daha uzun aralıklı polling (30 sn) - realtime bağlantı koparsa
      const fallbackInterval = setInterval(() => {
        loadData();
      }, 30000);

      return () => {
        clearInterval(fallbackInterval);
      };
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Get current auth user ID for filtering
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) setAuthUserId(authUser.id);

    try {
      // 🚀 PARALLEL DATA FETCHING - All API calls run simultaneously
      const [transactions, p2pOrders, pendingApprovals, notifs] = await Promise.all([
        api.getTransactions(user.email),
        api.getMyP2POrders(),
        api.getPendingApprovals(user.email),
        api.getNotifications(user.email)
      ]);

      // Convert P2P orders to transaction format for display
      // Only show OPEN (pending) and COMPLETED, not MATCHED/PAID (intermediate states)
      // Dedupe: For matched pairs, only show one order (using matched_order_id tracking)
      const seenPairs = new Set<string>();

      const p2pAsTxs = (p2pOrders || [])
        .filter((order: any) => order.status === 'OPEN' || order.status === 'COMPLETED')
        .filter((order: any) => {
          // Matched order pair deduplication
          if (order.matched_order_id) {
            const pairKey = [order.id, order.matched_order_id].sort().join('|');
            if (seenPairs.has(pairKey)) {
              return false; // Skip duplicate of matched pair
            }
            seenPairs.add(pairKey);
          }
          return true;
        })
        .map((order: any) => {
          // Kullanıcının seller mı buyer mı olduğunu authUserId ile kontrol et
          const isSeller = order.seller_id === authUserId;
          return {
            id: order.id,
            title: isSeller ? 'P2P SELL Order' : 'P2P BUY Order',
            amount: isSeller ? -order.amount_usd : order.amount_usd,
            status: order.status === 'OPEN' ? 'PENDING' : order.status,
            date: order.created_at,
            type: isSeller ? 'P2P_SELL' : 'P2P_BUY'
          };
        });

      // Merge and sort by date
      const allTxs = [...transactions, ...p2pAsTxs]
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTxs(allTxs.slice(0, 4) as any);

      // Filter P2P orders that need user action
      const pendingP2P = (p2pOrders || []).filter((order: any) => {
        // After matching, both buyer_id and seller_id are set
        // Need to check if current user is the seller or buyer via RLS query

        // Status MATCHED = seller needs to mark as paid
        if (order.status === 'MATCHED') {
          // If user can see this order, they're either buyer or seller
          // Seller needs to click "Ödedim"
          return true;
        }

        // Status PAID = buyer needs to confirm
        if (order.status === 'PAID' && !order.buyer_confirmed_at) {
          return true;
        }

        return false;
      });

      setP2pPending(pendingP2P);
      setApprovals(pendingApprovals);

      // Check for notifications
      const unread = notifs.filter((n: any) => !n.read);
      if (unread.length > 0) {
        const latest = unread[0];
        setNotification((prev: any) => (prev?.id === latest.id ? prev : latest));
      }
    } catch (error) {
      console.error('Dashboard loadData error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // P2P: Seller marks payment as sent
  const handleMarkPaid = async (orderId: string) => {
    const result = await api.markP2PPaid(orderId);
    if (result?.success) {
      setSuccessModal({
        isOpen: true,
        title: 'Ödeme İşaretlendi!',
        message: 'Ödeme gönderildi olarak işaretlendi.'
      });
      loadData();
      refreshUser();
    } else {
      setSuccessModal({
        isOpen: true,
        title: 'Hata!',
        message: result?.error || 'İşlem başarısız oldu.'
      });
    }
  };

  // P2P: Buyer confirms payment received
  const handleBuyerConfirm = async (orderId: string) => {
    const result = await api.buyerConfirmP2P(orderId, true);
    if (result?.success) {
      setSuccessModal({
        isOpen: true,
        title: 'Ödeme Onaylandı!',
        message: 'Ödeme onaylandı! İşlem başarıyla tamamlandı.'
      });
      loadData();
      refreshUser();
    } else {
      setSuccessModal({
        isOpen: true,
        title: 'Hata!',
        message: result?.error || 'İşlem başarısız oldu.'
      });
    }
  };

  // P2P: Seller confirms they received the payment
  const handleSellerConfirm = async (orderId: string) => {
    const result = await api.p2pAction('confirm', { orderId });
    if (result?.success) {
      setSuccessModal({
        isOpen: true,
        title: 'Transfer Onaylandı!',
        message: 'Bakiye alıcıya başarıyla aktarıldı.'
      });
      loadData();
      refreshUser();
    } else {
      alert('Hata: ' + (result?.error || 'İşlem başarısız'));
    }
  };

  // P2P: Seller rejects the payment (dispute)
  const handleSellerReject = async (orderId: string) => {
    const result = await api.p2pAction('reject', { orderId });
    if (result?.success) {
      alert('İşlem reddedildi. Eşleşme iptal edildi.');
      loadData();
    } else {
      alert('Hata: ' + (result?.error || 'İşlem başarısız'));
    }
  };

  const handleNotificationClick = async () => {
    if (notification) {
      await api.markNotificationRead(notification.id);
      setNotification(null);
      // Refresh data to show approval if related
      loadData();
    }
  };

  const handleApprove = async (id: string) => {
    await api.approveRelease(id);
    refreshUser();
    setSuccessModal({
      isOpen: true,
      title: 'Approved!',
      message: 'Transaction has been approved successfully.'
    });
  };

  if (!user) return null;

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-primary flex flex-col font-display pb-20">
        {/* Header Skeleton */}
        <div className="px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
            <div>
              <div className="w-24 h-4 bg-gray-800 rounded animate-pulse mb-1" />
              <div className="w-16 h-3 bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display overflow-hidden relative">

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        message={successModal.message}
      />

      {/* Premium Header */}
      <div className="px-5 pt-6 pb-4 flex justify-between items-start">
        <div>
          <p className="text-emerald-300/80 text-sm font-medium mb-1">Welcome</p>
          <h1 className="text-white text-2xl font-bold tracking-tight">{user.name || user.email?.split('@')[0]}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notifications')}
            className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-colors relative hover:bg-white/20"
          >
            <span className="material-symbols-outlined text-white text-xl">notifications</span>
            {notification && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                1
              </span>
            )}
          </button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 p-0.5 shadow-lg shadow-emerald-500/40">
            <div className="w-full h-full rounded-full bg-emerald-800 flex items-center justify-center text-white font-bold text-lg">
              {user.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {
        notification && (
          <div className="fixed top-20 left-4 right-4 z-50 animate-slide-in-top cursor-pointer" onClick={handleNotificationClick}>
            <div className="bg-gray-900/95 backdrop-blur-xl border border-lime-500/50 p-4 rounded-2xl shadow-2xl shadow-lime-500/10 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">notifications_active</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">{notification.title}</h4>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{notification.message}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleNotificationClick(); }} className="text-gray-500 hover:text-white">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>
        )
      }

      <div className="px-5 flex-1 overflow-hidden">
        {/* Approvals Alert */}
        {approvals.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl mb-6 backdrop-blur-sm">
            <h3 className="font-bold text-amber-400 flex items-center gap-2 mb-3 text-sm">
              <span className="material-symbols-outlined text-lg">notifications_active</span>
              Pending Approvals
            </h3>
            {approvals.map((a: any) => (
              <div key={a.id} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl mb-2 last:mb-0">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-medium">REQUEST</span>
                  <span className="text-sm font-bold text-white">From: {a.lockedBy} <span className="text-lime-400">(${a.amount})</span></span>
                </div>
                <button onClick={() => handleApprove(a.id)} className="bg-lime-500 text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-lime-400 transition-colors">Approve</button>
              </div>
            ))}
          </div>
        )}

        {/* P2P Ödeme Onayı Popup - Only show to SELLER */}
        {p2pPending.filter((o: any) => o.status === 'PAID' && o.seller_id === authUserId).length > 0 && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] rounded-2xl p-5 max-w-xs w-full border border-gray-700">
              {/* Icon + Title Row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lime-400">payments</span>
                </div>
                <h3 className="text-white font-bold text-lg">Ödeme Onayı</h3>
              </div>

              {/* Message */}
              <p className="text-gray-400 text-sm mb-5">
                Hesabınıza para aktarılmıştır ödemeyi onaylıyor musunuz?
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const paidOrder = p2pPending.find((o: any) => o.status === 'PAID');
                    if (paidOrder) handleSellerReject(paidOrder.id);
                  }}
                  className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-semibold hover:bg-[#333] transition-colors"
                >
                  Reddet
                </button>
                <button
                  onClick={() => {
                    const paidOrder = p2pPending.find((o: any) => o.status === 'PAID');
                    if (paidOrder) handleSellerConfirm(paidOrder.id);
                  }}
                  className="flex-1 bg-lime-500 text-black py-3 rounded-xl font-bold hover:bg-lime-400 transition-colors"
                >
                  Onaylıyorum
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Balance Card with Action Buttons */}
        <div className="mb-6">
          <div className="bg-emerald-700/50 backdrop-blur-sm p-6 rounded-3xl border border-emerald-600/30">
            {/* İŞLETME PANELİ BUTONU - Sadece business hesaplar için */}
            {user.account_type === 'business' && (
              <button
                onClick={() => navigate('/business')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] transition-all text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/30 mb-4"
              >
                <span className="material-symbols-outlined text-lg">storefront</span>
                İşletme Paneli
              </button>
            )}

            <div className="text-center">
              <p className="text-emerald-200/70 text-sm mb-1 flex items-center justify-center gap-1">
                Total Balance
                <span className="material-symbols-outlined text-sm">visibility</span>
              </p>
              <h2 className="text-4xl font-extrabold text-white tracking-tight mb-3">
                ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <span className="inline-flex items-center gap-1 bg-emerald-600/50 px-3 py-1 rounded-full text-xs text-emerald-100 font-medium">
                USD <span className="material-symbols-outlined text-sm">expand_more</span>
              </span>
            </div>

            {/* Action Buttons - Grid Style */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {/* Deposit */}
              <button onClick={() => navigate('/deposit')} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl bg-lime-400 flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-emerald-900 text-2xl">arrow_downward</span>
                </div>
                <span className="text-emerald-100 text-[11px] font-medium">Deposit</span>
              </button>

              {/* Withdraw */}
              <button onClick={() => navigate('/withdraw')} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl bg-lime-400 flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-emerald-900 text-2xl">arrow_upward</span>
                </div>
                <span className="text-emerald-100 text-[11px] font-medium">Withdraw</span>
              </button>

              {/* Crypto Deposit */}
              <button onClick={() => navigate('/crypto/deposit')} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl bg-lime-400 flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-emerald-900 text-2xl">download</span>
                </div>
                <span className="text-emerald-100 text-[10px] font-medium text-center leading-tight">Crypto<br />Deposit</span>
              </button>

              {/* Crypto Withdraw */}
              <button onClick={() => navigate('/crypto/withdraw')} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl bg-lime-400 flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-emerald-900 text-2xl">upload</span>
                </div>
                <span className="text-emerald-100 text-[10px] font-medium text-center leading-tight">Crypto<br />Withdraw</span>
              </button>
            </div>
          </div>
        </div>

        {/* Find Agent Button */}
        <button
          onClick={() => navigate('/find-agent')}
          className="w-full p-4 rounded-2xl flex items-center justify-between group transition-all bg-emerald-700/30 border border-emerald-600/30 hover:bg-emerald-700/50 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-lime-400/20 flex items-center justify-center text-lime-400 group-hover:bg-lime-400 group-hover:text-emerald-900 transition-colors">
              <span className="material-symbols-outlined">location_on</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-white">Find Agent</p>
              <p className="text-emerald-300/70 text-xs">Locate nearest exchange points</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-emerald-400 group-hover:text-white">chevron_right</span>
        </button>

        {/* Admin Panel Button */}
        {user.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] transition-all text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-purple-500/30 mb-3"
          >
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            Admin Panel
          </button>
        )}

        {/* Transaction History - Bottom Sheet */}
        <div
          className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl shadow-2xl shadow-black/30 transition-all duration-300 ease-out z-40`}
          style={{ height: sheetExpanded ? 'calc(100vh - 120px)' : '280px' }}
        >
          {/* Drag Handle */}
          <div
            className="flex justify-center py-4 cursor-pointer touch-none"
            onClick={() => setSheetExpanded(!sheetExpanded)}
            onTouchStart={(e) => setTouchStart(e.touches[0].clientY)}
            onTouchEnd={(e) => {
              if (touchStart === null) return;
              const diff = touchStart - e.changedTouches[0].clientY;
              if (diff > 50) setSheetExpanded(true);  // Swipe up
              if (diff < -50) setSheetExpanded(false); // Swipe down
              setTouchStart(null);
            }}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>

          <div className="px-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900">Transaction History</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-emerald-500 text-xs font-bold flex items-center hover:text-emerald-400 transition-colors"
              >
                View All <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
              </button>
            </div>
          </div>

          <div
            className="px-5 space-y-3 overflow-y-auto pb-24"
            style={{ height: sheetExpanded ? 'calc(100% - 80px)' : '100px' }}
          >
            {txs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-2xl bg-gray-50 text-gray-400">
                <span className="material-symbols-outlined text-3xl mb-2 opacity-30">history</span>
                <p className="text-sm font-medium">No recent transactions</p>
              </div>
            ) : (
              txs.slice(0, sheetExpanded ? txs.length : 1).map((tx: any) => (
                <div key={tx.id} className="p-4 rounded-2xl bg-gray-50 flex justify-between items-center transition-all hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                      <span className="material-symbols-outlined text-xl">
                        {tx.amount > 0 ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{tx.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{tx.date?.split(',')[0] || tx.date?.split('T')[0]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-base ${tx.amount > 0 ? 'text-emerald-500' : 'text-gray-900'}`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                    <p className="text-xs text-gray-400">{tx.status === 'PAYMENT_REVIEW' ? 'Pending' : tx.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div >
  );
};
export default Dashboard;