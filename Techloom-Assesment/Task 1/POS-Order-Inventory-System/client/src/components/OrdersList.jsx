import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Ban,
  X,
  History,
  PackageCheck,
  User,
  Shield,
  Search,
  Check,
} from 'lucide-react';
import { formatLKR } from '../api/client';

export default function OrdersList({
  orders = [],
  currentUser,
  onRefresh,
  onCancelOrder,
  onOpenCheckout,
  onCompleteOrder,
  loading,
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [filterStatus, setFilterStatus] = useState('All');
  const [viewScope, setViewScope] = useState(isAdmin ? 'all' : 'my');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForAudit, setSelectedOrderForAudit] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Update clock every second for live reservation countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statuses = ['All', 'Reserved', 'Paid', 'Completed', 'Cancelled', 'Expired', 'Failed'];

  // Check if an order belongs to the currently logged in user
  const isUserOrder = order => {
    if (!currentUser) return false;
    const currentUserId = String(currentUser.id || currentUser._id || '');
    if (order.userId && String(order.userId) === currentUserId) return true;

    const cName = (order.customerName || '').toLowerCase();
    const uName = (currentUser.name || '').toLowerCase();
    const uUsername = (currentUser.username || '').toLowerCase();

    if (uName && cName.includes(uName)) return true;
    if (uUsername && cName.includes(uUsername)) return true;
    return false;
  };

  const myOrdersCount = orders.filter(isUserOrder).length;
  const allOrdersCount = orders.length;

  // Apply scope (My Orders vs All Store Orders)
  const scopedOrders = orders.filter(o => {
    if (viewScope === 'my') {
      return isUserOrder(o);
    }
    return true;
  });

  // Apply status filter and search query
  const filteredOrders = scopedOrders.filter(o => {
    const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const orderNum = (o.orderNumber || '').toLowerCase();
    const custName = (o.customerName || '').toLowerCase();
    return orderNum.includes(query) || custName.includes(query);
  });

  const handleComplete = async orderId => {
    if (!onCompleteOrder) return;
    setCompletingId(orderId);
    try {
      await onCompleteOrder(orderId);
      // If the audit modal is open for this order, update it
      if (selectedOrderForAudit && selectedOrderForAudit._id === orderId) {
        setSelectedOrderForAudit(prev => ({
          ...prev,
          status: 'Completed',
          history: [
            ...(prev.history || []),
            {
              status: 'Completed',
              timestamp: new Date().toISOString(),
              reason: `Order completed & fulfilled by ${currentUser?.name || currentUser?.username || 'User'}`,
            },
          ],
        }));
      }
    } finally {
      setCompletingId(null);
    }
  };

  const getStatusBadge = order => {
    switch (order.status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <PackageCheck className="w-3.5 h-3.5 text-purple-400" />
            Completed
          </span>
        );
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid
          </span>
        );
      case 'Reserved': {
        const remainingSec = Math.max(
          0,
          Math.floor((new Date(order.expiresAt).getTime() - now) / 1000)
        );
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Reserved ({formatted})</span>
          </span>
        );
      }
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <Ban className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case 'Expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Expired (5m)
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            Payment Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {order.status}
          </span>
        );
    }
  };

  // Render a mini visual 3-step lifecycle progress indicator
  const renderLifecycleStepper = order => {
    const isCompleted = order.status === 'Completed';
    const isPaid = order.status === 'Paid';
    const isReserved = order.status === 'Reserved';
    const isCancelled = order.status === 'Cancelled';
    const isExpired = order.status === 'Expired';
    const isFailed = order.status === 'Failed';

    if (isCancelled || isExpired || isFailed) {
      return (
        <div className="flex items-center gap-1 mt-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500" title="Step 1: Reserved" />
          <span className="w-2.5 h-0.5 bg-slate-700" />
          <span
            className={`w-2 h-2 rounded-full ${isExpired ? 'bg-amber-400' : 'bg-rose-400'}`}
            title={`Terminated: ${order.status}`}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 mt-1.5" title={`Lifecycle: ${order.status}`}>
        <span
          className={`w-2 h-2 rounded-full ${
            isReserved ? 'bg-blue-400 ring-2 ring-blue-400/40 animate-pulse' : 'bg-blue-500'
          }`}
          title="Step 1: Stock Reserved (5m)"
        />
        <span className={`w-2.5 h-0.5 ${isPaid || isCompleted ? 'bg-emerald-500' : 'bg-slate-700'}`} />
        <span
          className={`w-2 h-2 rounded-full ${
            isPaid
              ? 'bg-emerald-400 ring-2 ring-emerald-400/40 animate-pulse'
              : isCompleted
              ? 'bg-emerald-500'
              : 'bg-slate-700'
          }`}
          title="Step 2: Payment Verified"
        />
        <span className={`w-2.5 h-0.5 ${isCompleted ? 'bg-purple-500' : 'bg-slate-700'}`} />
        <span
          className={`w-2 h-2 rounded-full ${
            isCompleted ? 'bg-purple-400 ring-2 ring-purple-400/40' : 'bg-slate-700'
          }`}
          title="Step 3: Fulfilled & Completed"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Order Lifecycle Management
            </h2>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Shield className="w-3 h-3" /> Admin View
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <User className="w-3 h-3" /> User Account
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Full end-to-end lifecycle:{' '}
            <span className="text-blue-400 font-semibold">1. Stock Lock (5m)</span> &rarr;{' '}
            <span className="text-emerald-400 font-semibold">2. Payment Verification</span> &rarr;{' '}
            <span className="text-purple-400 font-semibold">3. Order Fulfillment</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Scope Toggles, Status Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/50 p-3 rounded-2xl border border-slate-800/80">
        {/* View Scope Toggle (My Orders vs All Orders) */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 w-fit">
          <button
            onClick={() => setViewScope('my')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewScope === 'my'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Orders ({myOrdersCount})</span>
          </button>

          <button
            onClick={() => setViewScope('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewScope === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>All Store Orders ({allOrdersCount})</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {statuses.map(s => {
            const count = scopedOrders.filter(o => s === 'All' || o.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  filterStatus === s
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {s} <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search order # or customer..."
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase font-semibold text-slate-400 border-b border-slate-700/80">
              <tr>
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total (LKR)</th>
                <th className="py-3.5 px-4">Lifecycle State</th>
                <th className="py-3.5 px-4">Created At</th>
                <th className="py-3.5 px-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <PackageCheck className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-medium">No orders found</p>
                      <p className="text-xs text-slate-600">
                        {viewScope === 'my'
                          ? "You haven't placed any orders matching this filter yet."
                          : `No store orders match status "${filterStatus}".`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isMine = isUserOrder(order);
                  return (
                    <tr
                      key={order._id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isMine ? 'bg-blue-950/10' : ''
                      }`}
                    >
                      {/* Order Number */}
                      <td className="py-3 px-4 font-mono text-xs font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{order.orderNumber}</span>
                          {isMine && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Mine
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td className="py-3 px-4 text-xs font-medium text-slate-300">
                        <div className="flex flex-col">
                          <span className="text-white">{order.customerName || 'Guest'}</span>
                          {order.userId && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              User ID: {order.userId.slice(-6)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4 text-xs text-slate-400">
                        <span title={order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                          {order.items.reduce((s, i) => s + i.quantity, 0)} item(s) (
                          {order.items.length} sku)
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {formatLKR(order.totalAmount)}
                      </td>

                      {/* Current Status + Lifecycle Stepper */}
                      <td className="py-3 px-4">
                        <div>
                          {getStatusBadge(order)}
                          {renderLifecycleStepper(order)}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Step 1 -> Step 2: Pay active reservation */}
                        {order.status === 'Reserved' && (
                          <>
                            <button
                              onClick={() => onOpenCheckout(order)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all shadow-blue-600/20"
                              title="Pay & lock stock permanently"
                            >
                              Pay Now
                            </button>
                            <button
                              onClick={() => onCancelOrder(order._id)}
                              className="px-2 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 text-xs font-medium transition-colors"
                              title="Cancel stock reservation"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {/* Step 2 -> Step 3: Complete / Fulfill paid order */}
                        {order.status === 'Paid' && (
                          <button
                            onClick={() => handleComplete(order._id)}
                            disabled={completingId === order._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all shadow-emerald-600/20 disabled:opacity-50"
                            title="Complete and fulfill this order"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>
                              {completingId === order._id ? 'Completing...' : 'Fulfill Order'}
                            </span>
                          </button>
                        )}

                        {/* Step 3: Fulfilled indication */}
                        {order.status === 'Completed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-semibold px-2 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <Check className="w-3 h-3 text-purple-400" />
                            Fulfilled
                          </span>
                        )}

                        {/* Audit Log / Detail Trigger */}
                        <button
                          onClick={() => setSelectedOrderForAudit(order)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="View order lifecycle history and audit trail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Modal */}
      {selectedOrderForAudit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <History className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Order Lifecycle: {selectedOrderForAudit.orderNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Customer: {selectedOrderForAudit.customerName || 'Guest'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForAudit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Lifecycle Stepper */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Lifecycle Progression
              </div>
              <div className="flex items-center justify-between pt-1">
                {/* Step 1: Reserved */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500 text-blue-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300 mt-1">Reserved</span>
                  <span className="text-[10px] text-slate-500">5-min lock</span>
                </div>

                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    ['Paid', 'Completed'].includes(selectedOrderForAudit.status)
                      ? 'bg-emerald-500'
                      : 'bg-slate-700'
                  }`}
                />

                {/* Step 2: Paid */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                      ['Paid', 'Completed'].includes(selectedOrderForAudit.status)
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    2
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300 mt-1">Paid</span>
                  <span className="text-[10px] text-slate-500">Stock Secured</span>
                </div>

                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    selectedOrderForAudit.status === 'Completed'
                      ? 'bg-purple-500'
                      : 'bg-slate-700'
                  }`}
                />

                {/* Step 3: Completed */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                      selectedOrderForAudit.status === 'Completed'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    3
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300 mt-1">Completed</span>
                  <span className="text-[10px] text-slate-500">Fulfilled</span>
                </div>
              </div>
            </div>

            {/* Status transition timeline */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Audit Trail &amp; History
              </h4>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selectedOrderForAudit.history && selectedOrderForAudit.history.length > 0 ? (
                  selectedOrderForAudit.history.map((h, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {h.status}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {new Date(h.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] pl-3">
                        {h.reason || 'Status updated'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No recorded history entries.</p>
                )}
              </div>
            </div>

            {/* Purchased Items */}
            <div className="border-t border-slate-800 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Purchased Items ({selectedOrderForAudit.items.length})
              </h4>
              <div className="divide-y divide-slate-800 text-xs max-h-36 overflow-y-auto">
                {selectedOrderForAudit.items.map((item, i) => (
                  <div key={i} className="py-1.5 flex justify-between">
                    <span className="text-white">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-mono text-slate-300">
                      {formatLKR(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-semibold text-xs text-white">
                <span>Grand Total</span>
                <span className="font-mono text-emerald-400 text-sm">
                  {formatLKR(selectedOrderForAudit.totalAmount)}
                </span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                {selectedOrderForAudit.status === 'Paid' && (
                  <button
                    onClick={() => handleComplete(selectedOrderForAudit._id)}
                    disabled={completingId === selectedOrderForAudit._id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>
                      {completingId === selectedOrderForAudit._id
                        ? 'Completing...'
                        : 'Fulfill & Complete Order'}
                    </span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedOrderForAudit(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
