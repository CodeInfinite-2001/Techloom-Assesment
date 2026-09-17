import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, ShieldCheck, Clock, AlertTriangle, CheckCircle2, XCircle, 
  CreditCard, Lock, ArrowRight, RotateCw, RefreshCw, Zap, Copy, Check, User 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  onPaymentComplete,
  onReservationExpired
}) {
  if (!isOpen) return null;

  const { user, token } = useAuth();

  // Checkout phases: 'RESERVING' | 'PAYMENT' | 'RESULT'
  const [phase, setPhase] = useState('RESERVING');
  const [session, setSession] = useState(null);
  const [reservationError, setReservationError] = useState(null);

  // Live 10-minute countdown
  const [secondsRemaining, setSecondsRemaining] = useState(600);

  // Payment form & simulation state
  const [simulationMode, setSimulationMode] = useState('SUCCESS'); // 'SUCCESS' | 'FAILED' | 'TIMEOUT'
  const [idempotencyKey, setIdempotencyKey] = useState(`idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [duplicateTestLogs, setDuplicateTestLogs] = useState([]);

  // Customer & Card Inputs - dynamically tied to logged in user
  const [customer, setCustomer] = useState({
    name: user?.name || 'Customer',
    email: user?.email || '',
    shippingAddress: '42 Sector C Cyber Lab, High Tech Park'
  });

  useEffect(() => {
    if (user) {
      setCustomer(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email
      }));
    }
  }, [user]);

  const [card, setCard] = useState({
    number: '4242 4242 4242 4242',
    name: (user?.name || 'VALUED CUSTOMER').toUpperCase(),
    expiry: '09/28',
    cvc: '789'
  });
  const [copiedKey, setCopiedKey] = useState(false);

  // 1. Initiate Stock Reservation on modal open
  useEffect(() => {
    let isMounted = true;
    async function startReservation() {
      try {
        setPhase('RESERVING');
        setReservationError(null);

        const itemsToReserve = cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity
        }));

        const activeCustomer = {
          name: user?.name || customer.name || 'Customer',
          email: user?.email || customer.email || '',
          shippingAddress: customer.shippingAddress || '42 Sector C Cyber Lab, High Tech Park',
          userId: user?.id || null
        };

        const res = await fetch('/api/checkout/reserve', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ items: itemsToReserve, customer: activeCustomer })
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success) {
          setSession(data.session);
          setSecondsRemaining(data.session.ttlSeconds || 600);
          setPhase('PAYMENT');
        } else {
          setReservationError(data.error || 'Failed to reserve stock. Items may be out of stock.');
        }
      } catch (err) {
        if (isMounted) {
          setReservationError('Network error connecting to reservation engine.');
        }
      }
    }

    startReservation();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Countdown Timer
  useEffect(() => {
    if (phase !== 'PAYMENT' || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onReservationExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, secondsRemaining]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // 3. Process Mock Payment
  const executePayment = async (customKey = null, modeOverride = null) => {
    if (isProcessing) return;

    setIsProcessing(true);
    const activeKey = customKey || idempotencyKey;
    const activeMode = modeOverride || simulationMode;

    const activeCustomer = {
      name: user?.name || customer.name || 'Customer',
      email: user?.email || customer.email || '',
      shippingAddress: customer.shippingAddress || '42 Sector C Cyber Lab, High Tech Park',
      userId: user?.id || null
    };

    try {
      const res = await fetch('/api/checkout/pay', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          checkoutSessionId: session.sessionId,
          idempotencyKey: activeKey,
          simulationMode: activeMode,
          paymentDetails: { cardNumber: card.number },
          customerInfo: activeCustomer
        })
      });

      const data = await res.json();

      if (res.status === 200) {
        // Success
        setPaymentResult({
          type: 'SUCCESS',
          status: 'PAID',
          order: data.order,
          transactionId: data.transactionId,
          isDuplicate: data.isDuplicateReplay,
          message: data.message
        });
        setPhase('RESULT');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff88', '#10b981', '#34d399', '#ffffff']
        });
        onPaymentComplete();
      } else if (res.status === 402) {
        // Declined
        setPaymentResult({
          type: 'FAILED',
          status: 'DECLINED',
          error: data.error,
          message: data.message,
          stockReleased: data.stockReleased
        });
        setPhase('RESULT');
        onPaymentComplete();
      } else if (res.status === 504) {
        // Timeout
        setPaymentResult({
          type: 'TIMEOUT',
          status: 'TIMEOUT',
          error: data.error,
          message: data.message,
          retryAllowed: true
        });
        setPhase('RESULT');
      } else {
        // Other error / duplicate
        setPaymentResult({
          type: 'ERROR',
          status: 'ERROR',
          error: data.error || 'Payment execution failed.',
          isDuplicate: data.isDuplicate
        });
        setPhase('RESULT');
      }
    } catch (err) {
      setPaymentResult({
        type: 'ERROR',
        status: 'NETWORK_ERROR',
        error: 'Network failure during mock payment gateway communication.'
      });
      setPhase('RESULT');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Dedicated Duplicate Payment Attack / Test Trigger
  const handleDuplicateTest = async () => {
    setIsProcessing(true);
    setDuplicateTestLogs(['🚀 Dispatching Request 1 and Request 2 simultaneously with identical Idempotency Key...']);

    const testKey = `dupe_test_${Date.now()}`;

    const activeCustomer = {
      name: user?.name || customer.name || 'Customer',
      email: user?.email || customer.email || '',
      shippingAddress: customer.shippingAddress || '42 Sector C Cyber Lab, High Tech Park',
      userId: user?.id || null
    };

    const makeCall = (reqNum) =>
      fetch('/api/checkout/pay', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          checkoutSessionId: session.sessionId,
          idempotencyKey: testKey,
          simulationMode: 'SUCCESS',
          paymentDetails: { cardNumber: card.number },
          customerInfo: activeCustomer
        })
      }).then(async res => ({ reqNum, status: res.status, data: await res.json() }));

    try {
      const [res1, res2] = await Promise.all([makeCall(1), makeCall(2)]);

      const logs = [
        `✅ Request 1 finished with HTTP ${res1.status}: ${res1.data.message || res1.data.status}`,
        `🛡️ Request 2 finished with HTTP ${res2.status}: ${res2.data.isDuplicateReplay ? 'Detected duplicate idempotency key! Returning cached receipt without duplicate charge.' : res2.data.error || 'Blocked'}`
      ];

      setDuplicateTestLogs(logs);

      // Finish by displaying result
      const successful = res1.status === 200 ? res1.data : res2.data;
      setPaymentResult({
        type: 'SUCCESS',
        status: 'PAID',
        order: successful.order,
        transactionId: successful.transactionId,
        isDuplicate: true,
        message: 'Duplicate charge test PASSED! Only 1 order/charge was authorized.'
      });
      setPhase('RESULT');
      onPaymentComplete();
    } catch (err) {
      setDuplicateTestLogs(prev => [...prev, 'Test network error: ' + err.message]);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyIdempotencyKey = () => {
    navigator.clipboard.writeText(idempotencyKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleClose = async () => {
    // If closing while in reservation phase, release stock early
    if (phase === 'PAYMENT' && session?.sessionId) {
      try {
        await fetch(`/api/checkout/release/${session.sessionId}`, { method: 'POST' });
        onPaymentComplete(); // trigger stock refresh
      } catch (e) {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl glass-modal rounded-3xl overflow-hidden border border-emerald-500/30 my-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-emerald-500/20 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-cyber-neon shadow-glass-neon">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                Secure Checkout & Payment Gateway
              </h2>
              <p className="text-xs text-emerald-400/80 font-mono">
                Atomic Inventory Locks • Idempotent Gateway
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* =======================================================
              PHASE 1: RESERVING STOCK (INITIALIZING)
             ======================================================= */}
          {phase === 'RESERVING' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              {reservationError ? (
                <div className="space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 mx-auto">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Stock Reservation Failed</h3>
                  <p className="text-xs text-red-300 leading-relaxed">
                    {reservationError}
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-gray-700"
                  >
                    Return to Cart
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-cyber-neon animate-spin">
                    <RotateCw className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Reserving Warehouse Stock...</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Applying 10-minute atomic hold on your cart items.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* =======================================================
              PHASE 2: ACTIVE RESERVATION & PAYMENT SIMULATOR
             ======================================================= */}
          {phase === 'PAYMENT' && session && (
            <div className="space-y-6">
              
              {/* Stock Reservation Countdown Banner */}
              <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glass-neon">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyber-neon/10 border border-cyber-neon/40 flex items-center justify-center text-cyber-neon flex-shrink-0">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-cyber-neon font-bold block">
                      Inventory Reserved Exclusively For You
                    </span>
                    <p className="text-[11px] text-gray-300">
                      Hold expires in: <span className="font-mono font-bold text-white">{formatTime(secondsRemaining)}</span>. Complete payment to finalize purchase.
                    </p>
                  </div>
                </div>

                {/* Live Countdown Badge */}
                <div className="px-4 py-2 rounded-xl bg-black/60 border border-cyber-neon/50 font-mono text-xl font-extrabold text-cyber-neon tracking-wider shadow-inner">
                  {formatTime(secondsRemaining)}
                </div>
              </div>

              {/* Items Summary in Reservation */}
              <div className="bg-black/40 rounded-xl p-4 border border-emerald-500/20">
                <div className="flex justify-between items-center text-xs font-mono text-gray-400 mb-2">
                  <span>Reserved Items ({session.items.length})</span>
                  <span className="text-white font-bold">Total: ${session.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {session.items.map((it, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-cyber-900 border border-emerald-500/30 text-gray-200">
                      {it.quantity}x {it.name} (${(it.price * it.quantity).toFixed(2)})
                    </span>
                  ))}
                </div>
              </div>

              {/* MOCK PAYMENT GATEWAY CONTROLS */}
              <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyber-neon" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Mock Payment Gateway Controls
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Evaluation Sandbox
                  </span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  Select a simulation condition to test how the checkout engine handles real-world gateway failures:
                </p>

                {/* Simulation Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSimulationMode('SUCCESS')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      simulationMode === 'SUCCESS'
                        ? 'bg-emerald-500/20 border-cyber-neon text-white shadow-glass-neon'
                        : 'bg-black/40 border-emerald-500/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyber-neon" />
                      <span className="text-xs font-bold">1. Success</span>
                    </div>
                    <span className="text-[10px] text-gray-400 block leading-tight">
                      Simulate 200 OK approved payment & confirm order
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulationMode('FAILED')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      simulationMode === 'FAILED'
                        ? 'bg-red-500/20 border-red-500 text-white shadow-lg'
                        : 'bg-black/40 border-emerald-500/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="text-xs font-bold text-red-300">2. Decline</span>
                    </div>
                    <span className="text-[10px] text-gray-400 block leading-tight">
                      Simulate card decline & verify stock release
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulationMode('TIMEOUT')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      simulationMode === 'TIMEOUT'
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg'
                        : 'bg-black/40 border-emerald-500/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-xs font-bold text-amber-300">3. Gateway 504</span>
                    </div>
                    <span className="text-[10px] text-gray-400 block leading-tight">
                      Simulate slow timeout & retry handling
                    </span>
                  </button>
                </div>

                {/* Idempotency Key Display */}
                <div className="bg-black/60 rounded-xl p-3 border border-emerald-500/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                      Generated Idempotency Key (Prevents Duplicate Charges)
                    </span>
                    <span className="text-xs font-mono text-cyber-neon truncate block max-w-xs sm:max-w-md">
                      {idempotencyKey}
                    </span>
                  </div>
                  <button
                    onClick={copyIdempotencyKey}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Copy Key"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-cyber-neon" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Customer Account & Shipping Information */}
              <div className="bg-black/40 rounded-xl p-3.5 border border-emerald-500/20 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-300 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                    <User className="w-3.5 h-3.5 text-cyber-neon" /> Order Account & Tracking
                  </span>
                  {user ? (
                    <span className="text-cyber-neon text-[11px] font-bold">
                      ● Linked to {user.email}
                    </span>
                  ) : (
                    <span className="text-amber-400 text-[11px]">Guest Checkout</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={customer.name}
                      onChange={e => setCustomer({ ...customer, name: e.target.value })}
                      className="w-full glass-input text-xs py-1.5 px-2.5 rounded-lg"
                      placeholder="Your Name"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Order Email (For History & Refund)</label>
                    <input
                      type="email"
                      value={customer.email}
                      disabled={Boolean(user)}
                      onChange={e => setCustomer({ ...customer, email: e.target.value })}
                      className="w-full glass-input text-xs py-1.5 px-2.5 rounded-lg disabled:opacity-75 font-mono"
                      placeholder="you@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-400 block mb-1">Shipping Address</label>
                  <input
                    type="text"
                    value={customer.shippingAddress}
                    onChange={e => setCustomer({ ...customer, shippingAddress: e.target.value })}
                    className="w-full glass-input text-xs py-1.5 px-2.5 rounded-lg font-mono"
                    placeholder="Delivery street address, city"
                  />
                </div>
              </div>

              {/* Payment Details Form */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-300 uppercase tracking-wider font-bold">Payment Credentials</span>
                  <span className="text-[11px] text-emerald-400/80 font-mono">Mock Visa / 256-bit SSL</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-gray-400 block mb-1">Card Number</label>
                    <input
                      type="text"
                      value={card.number}
                      onChange={e => setCard({ ...card, number: e.target.value })}
                      className="w-full glass-input text-xs py-2 px-3 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-gray-400 block mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={card.name}
                      onChange={e => setCard({ ...card, name: e.target.value })}
                      className="w-full glass-input text-xs py-2 px-3 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-gray-400 block mb-1">Expiry Date</label>
                    <input
                      type="text"
                      value={card.expiry}
                      onChange={e => setCard({ ...card, expiry: e.target.value })}
                      className="w-full glass-input text-xs py-2 px-3 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-gray-400 block mb-1">CVC Code</label>
                    <input
                      type="text"
                      value={card.cvc}
                      onChange={e => setCard({ ...card, cvc: e.target.value })}
                      className="w-full glass-input text-xs py-2 px-3 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Duplicate Request Test Logs if active */}
              {duplicateTestLogs.length > 0 && (
                <div className="bg-black/80 rounded-xl p-3 border border-emerald-500/30 text-xs font-mono space-y-1">
                  {duplicateTestLogs.map((log, idx) => (
                    <div key={idx} className="text-cyber-neon">{log}</div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => executePayment()}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-cyber-neon text-cyber-950 hover:bg-emerald-400 shadow-glass-neon flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Communicating with Payment Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay ${session.totalAmount.toFixed(2)} ({simulationMode} Mode)</span>
                    </>
                  )}
                </button>

                {/* Dedicated Test Duplicate Charge Button */}
                <button
                  type="button"
                  onClick={handleDuplicateTest}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 rounded-xl font-mono text-xs text-cyber-neon bg-black/60 border border-cyber-neon/30 hover:border-cyber-neon hover:bg-cyber-neon/10 flex items-center justify-center gap-2 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 text-cyber-neon" />
                  <span>Test Concurrent Duplicate Clicks (Idempotency Guard)</span>
                </button>
              </div>

            </div>
          )}

          {/* =======================================================
              PHASE 3: PAYMENT RESULT / RECEIPT
             ======================================================= */}
          {phase === 'RESULT' && paymentResult && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              {paymentResult.type === 'SUCCESS' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-cyber-neon flex items-center justify-center text-cyber-neon mx-auto shadow-glass-neon">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-cyber-neon font-bold block">
                      Payment Approved & Verified
                    </span>
                    <h3 className="text-2xl font-extrabold text-white mt-1">
                      Order #{paymentResult.order.id}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {paymentResult.message}
                    </p>
                  </div>

                  {/* Receipt Box */}
                  <div className="glass-card rounded-2xl p-5 text-left border border-emerald-500/30 space-y-3 font-mono text-xs">
                    <div className="flex justify-between pb-2 border-b border-emerald-500/15">
                      <span className="text-gray-400">Transaction ID:</span>
                      <span className="text-cyber-neon font-bold">{paymentResult.transactionId}</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-emerald-500/15">
                      <span className="text-gray-400">Total Charged:</span>
                      <span className="text-white font-bold">${paymentResult.order.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-emerald-500/15">
                      <span className="text-gray-400">Status:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-cyber-neon font-bold border border-emerald-500/40">
                        {paymentResult.order.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Inventory Status:</span>
                      <span className="text-emerald-300">Permanently Committed</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-cyber-neon text-cyber-950 font-bold text-xs hover:bg-emerald-400 shadow-glass-neon transition-all"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              )}

              {paymentResult.type === 'FAILED' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500 flex items-center justify-center text-red-400 mx-auto">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-red-400 font-bold block">
                      Payment Declined
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">
                      {paymentResult.error}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {paymentResult.message}
                    </p>
                  </div>

                  {/* Stock Restitution notice */}
                  <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 text-xs text-red-300 space-y-1 text-left">
                    <div className="font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-red-400" /> Stock Released Automatically
                    </div>
                    <p className="text-[11px] text-gray-300">
                      Because payment did not succeed, the held inventory has been restored immediately to available store stock.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold text-xs hover:bg-gray-700"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setPhase('PAYMENT');
                        setSimulationMode('SUCCESS');
                      }}
                      className="flex-1 py-3 rounded-xl bg-cyber-neon text-cyber-950 font-bold text-xs hover:bg-emerald-400 shadow-glass-neon"
                    >
                      Try with Another Mode
                    </button>
                  </div>
                </div>
              )}

              {paymentResult.type === 'TIMEOUT' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-950/80 border border-amber-500 flex items-center justify-center text-amber-400 mx-auto animate-pulse">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block">
                      HTTP 504 Gateway Timeout
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">
                      Network / Gateway Stalled
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {paymentResult.message}
                    </p>
                  </div>

                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 text-left space-y-1">
                    <span className="font-bold block">🔒 Stock Hold Preserved</span>
                    <p className="text-[11px] text-gray-300">
                      Your stock reservation is still active. You can retry with the same or new idempotency key without losing your items.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold text-xs hover:bg-gray-700"
                    >
                      Exit Checkout
                    </button>
                    <button
                      onClick={() => {
                        setPhase('PAYMENT');
                        setSimulationMode('SUCCESS');
                      }}
                      className="flex-1 py-3 rounded-xl bg-cyber-neon text-cyber-950 font-bold text-xs hover:bg-emerald-400 shadow-glass-neon flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry Payment</span>
                    </button>
                  </div>
                </div>
              )}

              {paymentResult.type === 'ERROR' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500 flex items-center justify-center text-red-400 mx-auto">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Payment Error</h3>
                    <p className="text-xs text-red-400 mt-1">{paymentResult.error}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-gray-800 text-white font-semibold text-xs hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
