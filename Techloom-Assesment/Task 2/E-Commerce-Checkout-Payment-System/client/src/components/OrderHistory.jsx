import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Clock, CheckCircle2, XCircle, RotateCcw, 
  AlertCircle, DollarSign, Calendar, ChevronRight, ShieldCheck, ArrowUpRight, Lock 
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function OrderHistory({ onStockChangeTrigger, onOpenAuth }) {
  const { user, token, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [onlyMyOrders, setOnlyMyOrders] = useState(true);

  const fetchOrders = async () => {
    // If not logged in, do NOT fetch any orders
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let url = '/api/orders?';
      if (filterStatus !== 'ALL') url += `status=${filterStatus}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      if (user && onlyMyOrders && !isAdmin) {
        url += `email=${encodeURIComponent(user.email)}&`;
      }

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, searchQuery, onlyMyOrders, user, token]);

  // If user is not logged in, display secure login gate
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="glass-modal rounded-3xl p-8 sm:p-12 text-center border border-emerald-500/30 shadow-2xl space-y-6">
          <div className="w-18 h-18 w-20 h-20 rounded-2xl bg-emerald-500/10 border border-cyber-neon/50 flex items-center justify-center text-cyber-neon mx-auto shadow-glass-neon">
            <Lock className="w-9 h-9" />
          </div>
          
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-cyber-neon font-bold block">
              Protected Customer Record
            </span>
            <h2 className="text-2xl font-extrabold text-white">
              Sign In to Access Order History
            </h2>
            <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
              Order history and refund management are only accessible to authenticated users or administrators. 
              Please sign in to view your past transactions, transaction hashes, and refund statuses.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="py-3 px-6 rounded-xl font-bold font-mono text-xs bg-cyber-neon text-cyber-950 hover:bg-emerald-400 shadow-glass-neon flex items-center justify-center gap-2 transition-all"
            >
              <span>Sign In Now</span>
            </button>

            <button
              onClick={() => onOpenAuth && onOpenAuth('signup')}
              className="py-3 px-6 rounded-xl font-bold font-mono text-xs bg-black/60 border border-emerald-500/40 text-cyber-neon hover:bg-emerald-500/10 transition-all"
            >
              <span>Create Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCancelAndRefund = async (orderId) => {
    if (!window.confirm(`Are you sure you want to cancel Order ${orderId}? If paid, a full refund will be simulated and stock will be restored to store inventory.`)) {
      return;
    }

    try {
      setCancellingId(orderId);
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: 'Customer requested refund via Order Portal' })
      });

      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: data.message || `Order ${orderId} successfully refunded and cancelled.`
        });
        fetchOrders();
        if (onStockChangeTrigger) onStockChangeTrigger();
      } else {
        setActionNotice({
          type: 'error',
          message: data.error || 'Failed to process cancellation.'
        });
      }
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: 'Network error during cancellation request.'
      });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/80 border border-cyber-neon/60 text-cyber-neon shadow-glass-neon">
            <CheckCircle2 className="w-3.5 h-3.5" /> PAID
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-950/80 border border-purple-500/60 text-purple-300">
            <RotateCcw className="w-3.5 h-3.5" /> REFUNDED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-950/80 border border-red-500/60 text-red-300">
            <XCircle className="w-3.5 h-3.5" /> FAILED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-gray-900 border border-gray-700 text-gray-400">
            CANCELLED
          </span>
        );
      case 'PENDING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-950/80 border border-amber-500/60 text-amber-300">
            <Clock className="w-3.5 h-3.5" /> PENDING
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-gray-800 text-gray-300">
            {status}
          </span>
        );
    }
  };

  const paidOrders = orders.filter(o => o.status === 'PAID');
  const refundedOrders = orders.filter(o => o.status === 'REFUNDED');
  const totalSpent = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalRefunded = refundedOrders.reduce((sum, o) => sum + (o.refund?.amount || o.totalAmount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-8 border border-emerald-500/25">
        <div className="max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-cyber-neon block mb-2 font-bold">
            Post-Purchase Order Management
          </span>
          <h1 className="text-3xl font-extrabold text-white">
            Order History & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-neon to-emerald-400">Refund Simulator</span>
          </h1>
          <p className="mt-2 text-sm text-gray-300 leading-relaxed">
            Review past transactions, verify payment statuses, and simulate order cancellations. 
            Cancelling a paid order automatically issues a simulated refund and restores product inventory back to warehouse stock.
          </p>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Total Orders</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-white">{orders.length}</p>
          <span className="text-[11px] font-mono text-gray-400 truncate block">Account: {user?.email}</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Paid / Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-cyber-neon" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-cyber-neon">{paidOrders.length}</p>
          <span className="text-[11px] font-mono text-emerald-400/80">${totalSpent.toFixed(2)} USD Paid</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-purple-500/30 bg-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-purple-300 uppercase tracking-wider">Refunds Processed</span>
            <RotateCcw className="w-4 h-4 text-purple-400" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-purple-300">{refundedOrders.length}</p>
          <span className="text-[11px] font-mono text-purple-400 font-bold">${totalRefunded.toFixed(2)} USD Refunded</span>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between animate-in fade-in duration-300 ${
          actionNotice.type === 'success'
            ? 'bg-emerald-950/80 border-cyber-neon text-cyber-neon'
            : 'bg-red-950/80 border-red-500 text-red-300'
        }`}>
          <div className="flex items-center gap-3 text-sm">
            {actionNotice.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="glass-panel rounded-xl p-4 border border-emerald-500/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'PAID', 'REFUNDED', 'FAILED', 'CANCELLED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                filterStatus === st
                  ? 'bg-cyber-neon text-cyber-950 font-bold shadow-glass-neon'
                  : 'bg-black/40 text-gray-400 border border-emerald-500/20 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
          <input
            type="text"
            placeholder="Search by Order ID or item..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 glass-input rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="glass-card rounded-2xl p-6 h-48 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-emerald-500/20 space-y-4">
          <Package className="w-12 h-12 text-emerald-500/40 mx-auto" />
          <h3 className="text-base font-semibold text-white">No orders found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {searchQuery || filterStatus !== 'ALL'
              ? 'No orders match your filter criteria.'
              : 'You have not placed any orders yet. Complete a checkout in the store to see it here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map(order => {
            const isPaid = order.status === 'PAID';
            const isRefunded = order.status === 'REFUNDED';
            const isFailed = order.status === 'FAILED';
            const isCancelled = order.status === 'CANCELLED';
            const canCancel = isPaid || order.status === 'PENDING_PAYMENT';

            return (
              <div
                key={order.id}
                className="glass-card rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all space-y-5"
              >
                {/* Order Top Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-500/15">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-500/30 text-cyber-neon">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-base">
                          {order.id}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <span className="text-xs font-mono text-gray-400">
                        Placed on {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs font-mono text-gray-400 block">Total Amount</span>
                    <span className="text-xl font-bold font-mono text-cyber-neon">
                      ${order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items in Order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-emerald-500/15">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg border border-emerald-500/20 bg-cyber-950"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-white truncate">{item.name}</h4>
                        <div className="flex justify-between items-center text-[11px] font-mono text-gray-400 mt-0.5">
                          <span>Qty: {item.quantity}</span>
                          <span className="text-emerald-400">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gateway Details */}
                <div className="pt-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-mono bg-black/30 p-3.5 rounded-xl border border-emerald-500/10">
                  <div className="space-y-1">
                    {order.payment?.transactionId && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-gray-400">Tx Hash:</span>
                        <span className="text-cyber-neon font-bold">{order.payment.transactionId}</span>
                      </div>
                    )}
                    {order.payment?.cardMask && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>Card:</span>
                        <span className="text-gray-200">{order.payment.cardMask}</span>
                      </div>
                    )}
                    {order.payment?.declineReason && (
                      <div className="text-red-400 flex items-center gap-2">
                        <span>Decline Reason: {order.payment.declineReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Cancellation & Refund Trigger */}
                  <div>
                    {canCancel ? (
                      <button
                        onClick={() => handleCancelAndRefund(order.id)}
                        disabled={cancellingId === order.id}
                        className="px-4 py-2 rounded-xl text-xs font-bold font-mono bg-red-950/60 border border-red-500/60 text-red-300 hover:bg-red-900/60 hover:border-red-400 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                      >
                        {cancellingId === order.id ? (
                          <span>Reversing Transaction...</span>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Cancel Order & Refund (${order.totalAmount.toFixed(2)})</span>
                          </>
                        )}
                      </button>
                    ) : isRefunded ? (
                      <span className="text-[11px] text-purple-300 font-mono font-bold flex items-center gap-1.5 bg-purple-950/60 px-3 py-1.5 rounded-lg border border-purple-500/40">
                        <ShieldCheck className="w-4 h-4 text-purple-400" /> Stock Restored to Inventory
                      </span>
                    ) : isFailed ? (
                      <span className="text-[11px] text-gray-400 font-mono bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
                        Held stock automatically returned to warehouse
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Dedicated Simulated Refund Receipt Box */}
                {(isRefunded || order.refund) && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/50 to-purple-900/30 border border-purple-500/40 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-purple-200">
                        <RotateCcw className="w-4 h-4 text-purple-400" />
                        <span className="font-mono font-bold text-xs uppercase tracking-wider">
                          Simulated Refund Receipt
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-purple-200 bg-purple-900/80 px-3 py-1 rounded-full border border-purple-400/50 shadow-sm">
                        +${(order.refund?.amount || order.totalAmount).toFixed(2)} USD Reimbursed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono text-gray-300 pt-2 border-t border-purple-500/20">
                      <div>
                        <span className="text-gray-400 block">Refund ID</span>
                        <span className="text-white font-bold">{order.refund?.refundId || 'ref_simulated'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Refund Processed Date</span>
                        <span className="text-gray-200">
                          {new Date(order.refund?.refundedAt || order.updatedAt || order.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Status & Restitution</span>
                        <span className="text-purple-300 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Stock Restocked
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
