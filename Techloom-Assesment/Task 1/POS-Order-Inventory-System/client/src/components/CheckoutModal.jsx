import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Lock,
  RefreshCw,
  ShieldCheck,
  X,
  ArrowRight,
} from 'lucide-react';
import { formatLKR } from '../api/client';

export default function CheckoutModal({
  order,
  isOpen,
  onClose,
  onProcessPayment,
  onCancelReservation,
  onExpireReservation,
  isProcessing,
  lastPaymentResult,
}) {
  if (!isOpen || !order) return null;

  const [timeLeftSec, setTimeLeftSec] = useState(300);
  const [outcome, setOutcome] = useState('success');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [idempotencyKey, setIdempotencyKey] = useState(
    () =>
      `IDEMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  );
  const [duplicateTestMode, setDuplicateTestMode] = useState(false);

  const isCompleted =
    order.status === 'Paid' ||
    order.status === 'Cancelled' ||
    order.status === 'Expired' ||
    order.status === 'Failed' ||
    (lastPaymentResult && lastPaymentResult.success);

  // Live 5-minute countdown timer linked to order.expiresAt
  useEffect(() => {
    if (!order.expiresAt || isCompleted) return;

    const calculateRemaining = () => {
      const expires = new Date(order.expiresAt).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((expires - now) / 1000));
      return diffSec;
    };

    setTimeLeftSec(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeLeftSec(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (order.status === 'Reserved') {
          onExpireReservation(order._id);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order.expiresAt, order._id, order.status, isCompleted, onExpireReservation]);

  const minutes = Math.floor(timeLeftSec / 60);
  const seconds = timeLeftSec % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const isTimeCritical = timeLeftSec <= 60 && !isCompleted;

  const handlePay = isDuplicate => {
    onProcessPayment({
      orderId: order._id,
      idempotencyKey,
      paymentMethod,
      outcome,
      simulateDuplicate: isDuplicate || duplicateTestMode,
    });
  };

  const handleRegenerateKey = () => {
    setIdempotencyKey(
      `IDEMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Header with Timer Banner & Close Button */}
        <div
          className={`p-5 text-white flex items-center justify-between border-b ${
            isCompleted
              ? order.status === 'Paid' || lastPaymentResult?.success
                ? 'bg-emerald-950/70 border-emerald-800/60'
                : 'bg-slate-800/80 border-slate-700/60'
              : isTimeCritical
              ? 'bg-rose-950/60 border-rose-800/60'
              : 'bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                {order.orderNumber}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  order.status === 'Paid' || lastPaymentResult?.success
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : order.status === 'Cancelled'
                    ? 'bg-slate-500/20 text-slate-300'
                    : order.status === 'Failed'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                Status: {lastPaymentResult?.order?.status || order.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {isCompleted ? 'Payment & Order Summary' : 'Checkout & Stock Reservation'}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* 5-minute Countdown Timer (Active only if Reserved) */}
            {!isCompleted && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                  isTimeCritical
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}
              >
                <Clock className="w-4 h-4" />
                <div className="text-right font-mono">
                  <div className="text-sm font-bold leading-none">{formattedTime}</div>
                  <div className="text-[9px] uppercase text-slate-400">Lock Expiry</div>
                </div>
              </div>
            )}

            {/* Close 'X' Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
              title="Close payment tab"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Active Reservation Notice (Only when pending) */}
          {!isCompleted && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-400">
                <Lock className="w-3.5 h-3.5" />
                Stock is locked exclusively for this checkout session
              </div>
              <p>
                If payment is not confirmed within 5 minutes, items are automatically returned to
                available inventory.
              </p>
            </div>
          )}

          {/* Items Summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Order Items ({order.items.length})
            </h4>
            <div className="divide-y divide-slate-800 rounded-2xl bg-slate-800/40 border border-slate-800 p-3 max-h-36 overflow-y-auto">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 text-xs">
                  <div className="truncate mr-2">
                    <span className="font-semibold text-white">{item.name}</span>
                    <span className="text-slate-400 ml-1.5 font-mono">x{item.quantity}</span>
                  </div>
                  <span className="font-mono text-slate-300 font-medium">
                    {formatLKR(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800">
              <span className="text-sm font-semibold text-slate-300">Total Due:</span>
              <span className="text-xl font-extrabold text-white">
                {formatLKR(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* Active Payment Controls (Only when pending payment) */}
          {!isCompleted && (
            <>
              {/* Mock Gateway Outcome Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Simulate Gateway Outcome:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOutcome('success')}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                      outcome === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 mb-1 text-emerald-400" />
                    <span>Success</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Confirm &amp; Finalize
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutcome('failure')}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                      outcome === 'failure'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <XCircle className="w-5 h-5 mb-1 text-rose-400" />
                    <span>Failure</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Decline &amp; Release
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutcome('timeout')}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                      outcome === 'timeout'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5 mb-1 text-amber-400" />
                    <span>Timeout</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Gateway Timeout
                    </span>
                  </button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Payment Method:</span>
                <div className="flex items-center gap-1.5">
                  {['Credit Card', 'Cash (LKR)', 'Mobile Pay'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        paymentMethod === m
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Idempotency Key Guard Section */}
              <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold">Idempotency Key (Double-Charge Guard):</span>
                  </div>
                  <button
                    onClick={handleRegenerateKey}
                    title="Generate new unique key"
                    className="text-blue-400 hover:text-blue-300 text-[11px] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    New Key
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-700/60 truncate">
                  {idempotencyKey}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="dupToggle"
                    checked={duplicateTestMode}
                    onChange={e => setDuplicateTestMode(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="dupToggle" className="text-xs text-slate-400 cursor-pointer">
                    Simulate double-click / duplicate submission with same key
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Result Alert / Confirmation */}
          {lastPaymentResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                lastPaymentResult.isDuplicate
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : lastPaymentResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="font-bold text-sm flex items-center gap-1.5">
                {lastPaymentResult.isDuplicate ? (
                  '⚡ Duplicate Transaction Guard Activated'
                ) : lastPaymentResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Payment Approved &amp; Order Finalized!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Payment Failed — Stock Restored to Inventory</span>
                  </>
                )}
              </div>
              <p className="text-xs leading-relaxed">{lastPaymentResult.message}</p>
              {lastPaymentResult.payment && (
                <div className="font-mono text-[11px] opacity-80 pt-1 border-t border-white/10">
                  Transaction ID: {lastPaymentResult.payment.transactionId} &bull; Outcome:{' '}
                  {lastPaymentResult.payment.status} &bull; Currency: LKR
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            {isCompleted ? (
              /* Completed State: Prominent Close Tab Button */
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all"
                >
                  <span>Close &amp; Return to POS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Pending State: Cancel or Submit */
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onCancelReservation(order._id);
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
                >
                  Cancel &amp; Release Stock
                </button>

                <button
                  type="button"
                  disabled={isProcessing || timeLeftSec <= 0}
                  onClick={() => handlePay(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isProcessing
                      ? 'Processing...'
                      : timeLeftSec <= 0
                      ? 'Expired'
                      : `Pay ${formatLKR(order.totalAmount)}`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
