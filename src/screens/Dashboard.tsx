import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useApp();
  const [txs, setTxs] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [notification, setNotification] = useState<any>(null);
  const [p2pPending, setP2pPending] = useState<any[]>([]); // P2P orders needing action

  useEffect(() => {
    refreshUser();
    if (user) {
      // Initial Load
      loadData();

      // Poll every 3 seconds
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Fetch regular transactions
    const transactions = await api.getTransactions(user.email);

    // Fetch P2P orders
    const p2pOrders = await api.getMyP2POrders();

    // Convert P2P orders to transaction format for display
    const p2pAsTxs = (p2pOrders || []).map((order: any) => {
      const isSeller = order.seller_id !== null && order.buyer_id === null;
      return {
        id: order.id,
        title: isSeller ? 'P2P SELL Order' : 'P2P BUY Order',
        amount: isSeller ? -order.amount_usd : order.amount_usd,
        status: order.status,
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
    api.getPendingApprovals(user.email).then(setApprovals);

    // Check for notifications
    const notifs = await api.getNotifications(user.email);
    const unread = notifs.filter((n: any) => !n.read);
    if (unread.length > 0) {
      const latest = unread[0];
      setNotification((prev: any) => (prev?.id === latest.id ? prev : latest));
    }
  };

  // P2P: Seller marks payment as sent
  const handleMarkPaid = async (orderId: string) => {
    const result = await api.markP2PPaid(orderId);
    if (result?.success) {
      alert('Ödeme gönderildi olarak işaretlendi!');
      loadData();
      refreshUser();
    } else {
      alert('Hata: ' + (result?.error || 'İşlem başarısız'));
    }
  };

  // P2P: Buyer confirms payment received
  const handleBuyerConfirm = async (orderId: string) => {
    const result = await api.buyerConfirmP2P(orderId, true);
    if (result?.success) {
      alert('Ödeme onaylandı! İşlem tamamlandı.');
      loadData();
      refreshUser();
    } else {
      alert('Hata: ' + (result?.error || 'İşlem başarısız'));
    }
  };

  // P2P: Seller confirms they received the payment
  const handleSellerConfirm = async (orderId: string) => {
    const result = await api.buyerConfirmP2P(orderId, true);
    if (result?.success) {
      alert('Transfer onaylandı! Bakiye alıcıya aktarıldı.');
      loadData();
      refreshUser();
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
    alert("Approved!");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col font-display pb-20">
      {/* Header */}
      <div className="px-5 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-green-600 flex items-center justify-center text-black font-bold text-sm shadow-lg shadow-lime-500/30">
            {user.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{user.name || user.email}</p>
            <p className="text-gray-500 text-xs">NUSD Wallet</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-white transition-colors relative">
          <span className="material-symbols-outlined text-xl">notifications</span>
          {notification && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
        </button>
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

      <div className="px-5 flex-1 overflow-y-auto">
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

        {/* P2P Transfer Notification Popup - Minimal */}
        {p2pPending.filter((o: any) => o.status === 'PAID').length > 0 && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-xs w-full text-center">
              <p className="text-white text-lg font-bold mb-4">
                Hesabınıza Transfer Gerçekleşti
              </p>
              <button
                onClick={() => {
                  const paidOrder = p2pPending.find((o: any) => o.status === 'PAID');
                  if (paidOrder) handleSellerConfirm(paidOrder.id);
                }}
                className="w-full bg-lime-500 hover:bg-lime-400 text-black py-3 rounded-xl font-bold transition-colors"
              >
                Onaylıyorum
              </button>
            </div>
          </div>
        )}

        {/* Balance Card with Action Buttons */}
        <div className="mb-8 relative">
          {/* Aurora Background Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 via-transparent to-purple-500/10 rounded-3xl blur-xl"></div>

          <div className="relative bg-[#1a1a1a]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/5">
            <p className="text-gray-500 font-medium text-sm mb-2">Your balance</p>
            <h2 className="text-5xl font-extrabold text-white tracking-tight mb-6">
              ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>

            {/* Action Buttons - Inside Card */}
            <div className="flex justify-between gap-2">
              {/* Deposit */}
              <button onClick={() => navigate('/deposit')} className="flex flex-col items-center gap-2 group flex-1">
                <div className="w-12 h-12 rounded-full bg-lime-500 flex items-center justify-center shadow-lg shadow-lime-500/30 group-hover:scale-110 group-active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-black text-xl">arrow_downward</span>
                </div>
                <span className="text-gray-400 text-xs font-medium group-hover:text-white transition-colors">Deposit</span>
              </button>

              {/* Withdraw */}
              <button onClick={() => navigate('/withdraw')} className="flex flex-col items-center gap-2 group flex-1">
                <div className="w-12 h-12 rounded-full bg-lime-500 flex items-center justify-center shadow-lg shadow-lime-500/30 group-hover:scale-110 group-active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-black text-xl">arrow_upward</span>
                </div>
                <span className="text-gray-400 text-xs font-medium group-hover:text-white transition-colors">Withdraw</span>
              </button>

              {/* Crypto Deposit */}
              <button onClick={() => navigate('/crypto/deposit')} className="flex flex-col items-center gap-2 group flex-1">
                <div className="w-12 h-12 rounded-full bg-lime-500 flex items-center justify-center shadow-lg shadow-lime-500/30 group-hover:scale-110 group-active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-black text-xl">download</span>
                </div>
                <span className="text-gray-400 text-[10px] font-medium group-hover:text-white transition-colors text-center leading-tight">Crypto<br />Deposit</span>
              </button>

              {/* Crypto Withdraw */}
              <button onClick={() => navigate('/crypto/withdraw')} className="flex flex-col items-center gap-2 group flex-1">
                <div className="w-12 h-12 rounded-full bg-lime-500 flex items-center justify-center shadow-lg shadow-lime-500/30 group-hover:scale-110 group-active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-black text-xl">upload</span>
                </div>
                <span className="text-gray-400 text-[10px] font-medium group-hover:text-white transition-colors text-center leading-tight">Crypto<br />Withdraw</span>
              </button>
            </div>

            {/* Find Agent Button */}
            <button
              onClick={() => navigate('/find-agent')}
              className="mt-4 w-full bg-[#222] border border-white/10 p-3 rounded-2xl flex items-center justify-between group hover:bg-[#2a2a2a] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400 group-hover:bg-lime-500 group-hover:text-black transition-colors">
                  <span className="material-symbols-outlined">map</span>
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Find Agent</p>
                  <p className="text-gray-500 text-xs">Locate nearest exchange points</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-500 group-hover:text-white">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Admin Panel Button */}
        {user.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] transition-all text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-purple-500/30 mb-6"
          >
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            Admin Panel
          </button>
        )}

        {/* Recent Activity */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-white">Recent Activity</h3>
          <button
            onClick={() => navigate('/history')}
            className="text-lime-400 text-xs font-bold flex items-center hover:text-lime-300 transition-colors"
          >
            View All <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
          </button>
        </div>

        <div className="space-y-3">
          {txs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-[#1a1a1a] rounded-2xl border border-white/5 text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-30">history</span>
              <p className="text-sm font-medium">No recent transactions</p>
            </div>
          ) : (
            txs.map((tx: any) => (
              <div key={tx.id} className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 flex justify-between items-center transition-all hover:bg-[#222] hover:border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-lime-500/20 text-lime-400' : 'bg-red-500/20 text-red-400'}`}>
                    <span className="material-symbols-outlined text-xl">
                      {tx.amount > 0 ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{tx.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tx.date?.split(',')[0] || tx.date?.split('T')[0]} • <span className={tx.status?.toLowerCase() === 'completed' ? 'text-lime-400' : 'text-amber-400'}>{tx.status === 'PAYMENT_REVIEW' ? 'PENDING' : tx.status}</span></p>
                  </div>
                </div>
                <span className={`font-bold text-base ${tx.amount > 0 ? 'text-lime-400' : 'text-white'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div >
  );
};
export default Dashboard;