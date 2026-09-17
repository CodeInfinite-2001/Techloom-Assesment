import React, { useState, useEffect } from 'react';
import { 
  Shield, Layers, Clock, DollarSign, Package, Plus, Trash2, Edit2, 
  RotateCcw, CheckCircle2, AlertTriangle, RefreshCw, XCircle, Eye, ArrowUpRight 
} from 'lucide-react';

export default function AdminPortal({ onStockChangeTrigger }) {
  const [adminTab, setAdminTab] = useState('inventory'); // 'inventory' | 'reservations' | 'orders'
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  // New product form modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    category: 'Gaming',
    price: 199.99,
    stock: 10,
    description: '',
    specs: '',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
    badge: 'New Release'
  });

  // Fetch all admin data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, prodsRes, resRes, ordersRes] = await Promise.all([
        fetch('/api/admin/analytics'),
        fetch('/api/products'),
        fetch('/api/admin/reservations'),
        fetch('/api/orders')
      ]);

      const analyticsData = await analyticsRes.json();
      const prodsData = await prodsRes.json();
      const resData = await resRes.json();
      const ordersData = await ordersRes.json();

      if (analyticsData.success) setAnalytics(analyticsData.analytics);
      if (prodsData.success) setProducts(prodsData.products);
      if (resData.success) setReservations(resData.reservations);
      if (ordersData.success) setOrders(ordersData.orders);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  // Inline Stock Adjustment
  const handleAdjustStock = async (productId, currentStock, delta) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', message: `Stock updated to ${newStock}` });
        fetchAllData();
        if (onStockChangeTrigger) onStockChangeTrigger();
      }
    } catch (e) {
      setNotice({ type: 'error', message: 'Failed to adjust stock' });
    }
  };

  // Add Product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProd)
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNotice({ type: 'success', message: `Product "${data.product.name}" added to catalog!` });
        setNewProd({
          name: '',
          category: 'Gaming',
          price: 199.99,
          stock: 10,
          description: '',
          specs: '',
          imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
          badge: 'New Release'
        });
        fetchAllData();
        if (onStockChangeTrigger) onStockChangeTrigger();
      } else {
        setNotice({ type: 'error', message: data.error || 'Failed to add product' });
      }
    } catch (e) {
      setNotice({ type: 'error', message: 'Network error adding product' });
    }
  };

  // Delete Product
  const handleDeleteProduct = async (productId, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from store catalog?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', message: data.message });
        fetchAllData();
        if (onStockChangeTrigger) onStockChangeTrigger();
      }
    } catch (e) {
      setNotice({ type: 'error', message: 'Failed to delete product' });
    }
  };

  // Force Release a reservation hold
  const handleForceRelease = async (sessionId) => {
    try {
      const res = await fetch(`/api/admin/reservations/${sessionId}/force-release`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', message: data.message });
        fetchAllData();
        if (onStockChangeTrigger) onStockChangeTrigger();
      }
    } catch (e) {
      setNotice({ type: 'error', message: 'Failed to release reservation' });
    }
  };

  // Admin Cancel & Refund Order
  const handleAdminRefund = async (orderId) => {
    if (!window.confirm(`Issue administrative refund for Order ${orderId}? Stock will be restored to store inventory.`)) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Administrative refund issued via Admin Portal' })
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', message: data.message });
        fetchAllData();
        if (onStockChangeTrigger) onStockChangeTrigger();
      }
    } catch (e) {
      setNotice({ type: 'error', message: 'Failed to process refund' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-8 border border-purple-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/30 text-purple-300 text-xs font-mono uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" /> Admin Control Room
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            Store & Stock <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyber-neon">Executive Portal</span>
          </h1>
          <p className="mt-2 text-sm text-gray-300">
            Real-time warehouse inventory restock, live stock reservation monitor, and master order transaction audits.
          </p>
        </div>

        <button
          onClick={fetchAllData}
          className="p-2.5 rounded-xl bg-black/60 border border-emerald-500/30 text-cyber-neon hover:bg-emerald-500/10 flex items-center gap-2 text-xs font-mono transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Notice alert */}
      {notice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono ${
          notice.type === 'success'
            ? 'bg-emerald-950/80 border-cyber-neon text-cyber-neon'
            : 'bg-red-950/80 border-red-500 text-red-300'
        }`}>
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Analytics Metric Cards */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
              <span>Gross Revenue</span>
              <DollarSign className="w-4 h-4 text-cyber-neon" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              ${analytics.totalRevenue.toFixed(2)}
            </div>
            <span className="text-[11px] text-emerald-400/80 font-mono mt-1 block">
              {analytics.paidOrdersCount} paid orders
            </span>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-purple-500/20">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
              <span>Total Orders</span>
              <Package className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {analytics.totalOrders}
            </div>
            <span className="text-[11px] text-purple-300 font-mono mt-1 block">
              ${analytics.totalRefunded.toFixed(2)} refunded
            </span>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-amber-500/20">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
              <span>Active Stock Holds</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300">
              {analytics.activeReservationsCount}
            </div>
            <span className="text-[11px] text-gray-400 font-mono mt-1 block">
              Held in uncompleted checkout
            </span>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
              <span>Warehouse Health</span>
              <Layers className="w-4 h-4 text-cyber-neon" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {analytics.productsCount} items
            </div>
            <span className={`text-[11px] font-mono mt-1 block ${analytics.lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {analytics.lowStockCount} low-stock alerts
            </span>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-emerald-500/20 gap-2">
        <button
          onClick={() => setAdminTab('inventory')}
          className={`pb-3 px-4 text-xs font-mono font-bold transition-all border-b-2 ${
            adminTab === 'inventory'
              ? 'border-cyber-neon text-cyber-neon'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Inventory & Restock ({products.length})
        </button>

        <button
          onClick={() => setAdminTab('reservations')}
          className={`pb-3 px-4 text-xs font-mono font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            adminTab === 'reservations'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <span>Live Stock Holds</span>
          {reservations.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-950 text-amber-400 rounded-full text-[10px] border border-amber-500/40">
              {reservations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('orders')}
          className={`pb-3 px-4 text-xs font-mono font-bold transition-all border-b-2 ${
            adminTab === 'orders'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Master Orders ({orders.length})
        </button>
      </div>

      {/* ============================================================
          TAB 1: INVENTORY MANAGEMENT
         ============================================================ */}
      {adminTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-gray-400">
              Manage product catalog, real-time stock levels, and pricing
            </span>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cyber-neon text-cyber-950 hover:bg-emerald-400 shadow-glass-neon flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-emerald-500/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black/60 border-b border-emerald-500/20 text-gray-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Total Stock</th>
                    <th className="p-4">Reserved (Held)</th>
                    <th className="p-4">Available</th>
                    <th className="p-4 text-right">Quick Restock Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10 text-gray-300">
                  {products.map(prod => {
                    const reserved = prod.reservedStock || 0;
                    const avail = Math.max(0, prod.stock - reserved);

                    return (
                      <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-10 h-10 object-cover rounded-lg border border-emerald-500/20 bg-cyber-950"
                          />
                          <div>
                            <span className="font-bold text-white block">{prod.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{prod.id}</span>
                          </div>
                        </td>
                        <td className="p-4">{prod.category}</td>
                        <td className="p-4 font-bold text-white">${prod.price.toFixed(2)}</td>
                        <td className="p-4 font-bold text-white">{prod.stock}</td>
                        <td className="p-4">
                          {reserved > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40">
                              🔒 {reserved}
                            </span>
                          ) : (
                            <span className="text-gray-500">0</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            avail <= 0 
                              ? 'bg-red-950 text-red-400 border border-red-500/40' 
                              : avail <= 5 
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40' 
                              : 'bg-emerald-950 text-cyber-neon border border-emerald-500/40'
                          }`}>
                            {avail}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAdjustStock(prod.id, prod.stock, -1)}
                              title="Deduct 1 from stock"
                              className="px-2 py-1 rounded bg-black/60 border border-emerald-500/20 text-gray-300 hover:text-white hover:border-emerald-400"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleAdjustStock(prod.id, prod.stock, 1)}
                              title="Add 1 to stock"
                              className="px-2 py-1 rounded bg-black/60 border border-emerald-500/20 text-gray-300 hover:text-white hover:border-emerald-400"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleAdjustStock(prod.id, prod.stock, 5)}
                              title="Restock +5"
                              className="px-2.5 py-1 rounded bg-emerald-500/20 border border-cyber-neon/40 text-cyber-neon hover:bg-cyber-neon hover:text-cyber-950 font-bold"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              title="Remove Product"
                              className="p-1.5 rounded text-gray-500 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: LIVE STOCK RESERVATION MONITOR
         ============================================================ */}
      {adminTab === 'reservations' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl glass-panel border border-amber-500/30 text-xs leading-relaxed text-gray-300">
            <span className="font-bold text-amber-300 block mb-1">Stock Reservation Monitor:</span>
            This inspector displays items currently held in uncompleted customer checkout sessions. 
            When shoppers enter checkout, items are held with a 10-minute TTL to prevent double-booking.
            You can force-release any session to test instantaneous stock restoration.
          </div>

          {reservations.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-emerald-500/20 space-y-3">
              <Clock className="w-10 h-10 text-emerald-400/40 mx-auto" />
              <h3 className="text-sm font-bold text-white">No active stock holds</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No checkout sessions currently hold inventory locks. Initiate a checkout in the store to see it live here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reservations.map(res => (
                <div
                  key={res.sessionId}
                  className="glass-card rounded-2xl p-5 border border-amber-500/30 space-y-4 shadow-glass-neon"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-emerald-500/15">
                    <div>
                      <span className="font-mono font-bold text-white text-sm block">
                        {res.sessionId}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        Reserved at {new Date(res.reservedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold animate-pulse">
                      ⏳ {res.remainingSeconds}s remaining
                    </div>
                  </div>

                  {/* Reserved items list */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <span className="text-[10px] uppercase text-gray-400 tracking-wider">Reserved Items:</span>
                    {res.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between bg-black/40 p-2 rounded-lg border border-emerald-500/10">
                        <span className="text-gray-200">{it.quantity}x {it.name}</span>
                        <span className="text-cyber-neon font-bold">${(it.price * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-emerald-500/15 text-xs font-mono">
                    <span className="text-gray-400">Total Held: <strong className="text-white">${res.totalAmount.toFixed(2)}</strong></span>
                    <button
                      onClick={() => handleForceRelease(res.sessionId)}
                      className="px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 hover:bg-red-900/80 transition-colors text-[11px] font-bold"
                    >
                      Force Release Lock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 3: MASTER ORDERS & AUDITS
         ============================================================ */}
      {adminTab === 'orders' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl overflow-hidden border border-emerald-500/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black/60 border-b border-emerald-500/20 text-gray-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Payment Tx</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10 text-gray-300">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-bold text-white">{o.id}</td>
                      <td className="p-4">
                        <span className="block text-white">{o.customer?.name}</span>
                        <span className="text-[10px] text-gray-400">{o.customer?.email}</span>
                      </td>
                      <td className="p-4 font-bold text-cyber-neon">${o.totalAmount.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'PAID'
                            ? 'bg-emerald-950 text-cyber-neon border border-emerald-500/40'
                            : o.status === 'REFUNDED'
                            ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                            : o.status === 'FAILED'
                            ? 'bg-red-950 text-red-300 border border-red-500/40'
                            : 'bg-gray-900 text-gray-400 border border-gray-700'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-[11px] text-gray-400 truncate max-w-[140px]">
                        {o.payment?.transactionId || 'N/A'}
                      </td>
                      <td className="p-4 text-[10px] text-gray-400">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        {o.status === 'PAID' ? (
                          <button
                            onClick={() => handleAdminRefund(o.id)}
                            className="px-3 py-1 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 hover:bg-red-900/60 transition-colors text-[11px] font-bold"
                          >
                            Admin Refund
                          </button>
                        ) : o.status === 'REFUNDED' ? (
                          <span className="text-[10px] text-purple-400">Refunded & Stock Restored</span>
                        ) : (
                          <span className="text-[10px] text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ADD PRODUCT MODAL
         ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div 
            className="w-full max-w-lg glass-modal rounded-3xl p-6 sm:p-8 border border-cyber-neon/40 shadow-2xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-emerald-500/20 pb-3">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyber-neon" /> Add New Cyber Hardware
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={newProd.name}
                  onChange={e => setNewProd({ ...newProd, name: e.target.value })}
                  placeholder="e.g. Neural Link Interface Hub"
                  className="w-full glass-input p-2.5 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Category</label>
                  <select
                    value={newProd.category}
                    onChange={e => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full glass-input p-2.5 rounded-xl bg-cyber-950"
                  >
                    <option value="Audio">Audio</option>
                    <option value="Wearables">Wearables</option>
                    <option value="Computing">Computing</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Storage">Storage</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProd.price}
                    onChange={e => setNewProd({ ...newProd, price: parseFloat(e.target.value) })}
                    className="w-full glass-input p-2.5 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Warehouse Stock</label>
                  <input
                    type="number"
                    required
                    value={newProd.stock}
                    onChange={e => setNewProd({ ...newProd, stock: parseInt(e.target.value, 10) })}
                    className="w-full glass-input p-2.5 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Product Badge</label>
                  <input
                    type="text"
                    value={newProd.badge}
                    onChange={e => setNewProd({ ...newProd, badge: e.target.value })}
                    placeholder="New / Flagship"
                    className="w-full glass-input p-2.5 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Image URL</label>
                <input
                  type="url"
                  value={newProd.imageUrl}
                  onChange={e => setNewProd({ ...newProd, imageUrl: e.target.value })}
                  className="w-full glass-input p-2.5 rounded-xl text-[11px]"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Description</label>
                <textarea
                  rows="2"
                  value={newProd.description}
                  onChange={e => setNewProd({ ...newProd, description: e.target.value })}
                  placeholder="Hardware features and overview..."
                  className="w-full glass-input p-2.5 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-800 text-white hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold bg-cyber-neon text-cyber-950 hover:bg-emerald-400 shadow-glass-neon"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
