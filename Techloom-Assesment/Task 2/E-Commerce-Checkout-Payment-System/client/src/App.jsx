import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProductCatalog from './components/ProductCatalog';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import OrderHistory from './components/OrderHistory';
import AdminPortal from './components/AdminPortal';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';

function StoreApp() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'orders' | 'admin'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([{ name: 'All', count: 0 }]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart state persisted in localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cyberstore_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  // Save cart changes
  useEffect(() => {
    localStorage.setItem('cyberstore_cart', JSON.stringify(cart));
  }, [cart]);

  // If user logs out or role changes, redirect away from protected tabs
  useEffect(() => {
    if (!user && (activeTab === 'orders' || activeTab === 'admin')) {
      setActiveTab('store');
    } else if (!isAdmin && activeTab === 'admin') {
      setActiveTab('store');
    }
  }, [user, isAdmin, activeTab]);

  // Fetch products from server
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/products/categories')
      ]);

      const prodData = await prodRes.json();
      const catData = await catRes.json();

      if (prodData.success) setProducts(prodData.products);
      if (catData.success) setCategories(catData.categories);
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Cart actions
  const handleAddToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const maxAvailable = product.availableStock || 0;

      if (existing) {
        const newQty = Math.min(maxAvailable, existing.quantity + quantity);
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: newQty, availableStock: maxAvailable } : item
        );
      } else {
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: Math.min(maxAvailable, quantity),
            availableStock: maxAvailable,
            imageUrl: product.imageUrl
          }
        ];
      }
    });
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleResetDemo = async () => {
    if (window.confirm('Reset all catalog inventory and stock counts back to default initial values?')) {
      try {
        await fetch('/api/admin/reset', { method: 'POST' });
        await fetchProducts();
        alert('Catalog reset successfully! Stock counts restored.');
      } catch (e) {
        alert('Reset failed.');
      }
    }
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#040807] text-gray-100 selection:bg-emerald-500 selection:text-black">
      {/* Top Glass Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={totalCartCount}
        openCart={() => setIsCartOpen(true)}
        onResetDemo={handleResetDemo}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Role Banner if logged in */}
      {user && (
        <div className="bg-black/50 border-b border-emerald-500/15 py-1.5 px-4 text-center text-xs font-mono">
          <span className="text-gray-400">Authenticated Session: </span>
          <span className="text-white font-bold">{user.name} ({user.email})</span>
          <span className="mx-2 text-gray-600">|</span>
          <span className="text-gray-400">Portal Mode: </span>
          <span className={`font-bold uppercase ${isAdmin ? 'text-purple-400' : 'text-cyber-neon'}`}>
            {isAdmin ? 'Store Administrator' : 'Verified Customer'}
          </span>
          {isAdmin && activeTab !== 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className="ml-3 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[11px] hover:bg-purple-900/80"
            >
              Go to Admin Portal →
            </button>
          )}
          {isAdmin && activeTab === 'admin' && (
            <button
              onClick={() => setActiveTab('store')}
              className="ml-3 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-cyber-neon text-[11px] hover:bg-emerald-900/80"
            >
              ← Switch to Customer Store View
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'store' && (
          <ProductCatalog
            products={products}
            loading={loading}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onAddToCart={handleAddToCart}
            onViewProduct={prod => setSelectedProduct(prod)}
          />
        )}

        {activeTab === 'orders' && (
          <OrderHistory
            onStockChangeTrigger={fetchProducts}
            onOpenAuth={(mode) => {
              setAuthModalMode(mode);
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPortal onStockChangeTrigger={fetchProducts} />
        )}
      </main>

      {/* Modals & Slide-overs */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onInstantCheckout={() => {
          setSelectedProduct(null);
          setIsCheckoutOpen(true);
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cartItems={cart}
          onPaymentComplete={() => {
            fetchProducts();
            handleClearCart();
          }}
          onReservationExpired={() => {
            alert('Your 10-minute stock reservation expired. Please select your items again.');
            fetchProducts();
            setIsCheckoutOpen(false);
          }}
        />
      )}

      {/* Auth Modal (Sign in / Sign up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={(u) => {
          if (u.role === 'admin') setActiveTab('admin');
        }}
      />

      {/* Footer with Glass Cyber Aesthetics */}
      <footer className="glass-panel border-t border-emerald-500/20 py-8 mt-12 text-center text-xs text-gray-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="text-gray-400">
            CYBERSTORE // Architecture with Role-Based Admin & Customer Portals, Stock Locks & Idempotent Gateways
          </p>
          <div className="flex justify-center gap-6 text-[11px] text-emerald-400/80">
            <span>● Express.js Node Backend</span>
            <span>● Customer & Admin Portals</span>
            <span>● 1-Click Railway Deployment Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreApp />
    </AuthProvider>
  );
}
