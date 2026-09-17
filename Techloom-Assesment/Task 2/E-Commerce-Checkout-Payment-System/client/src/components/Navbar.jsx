import React from 'react';
import { ShoppingBag, Clock, Terminal, RotateCcw, Cpu, Shield, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, cartCount, openCart, onResetDemo, onOpenAuth }) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-emerald-500/20 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('store')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyber-neon/10 border border-emerald-400/40 flex items-center justify-center shadow-glass-neon">
              <Cpu className="w-5 h-5 text-cyber-neon animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-wider font-mono text-white flex items-center gap-1.5">
                CYBER<span className="text-cyber-neon">STORE</span>
              </span>
              <span className="block text-[10px] font-mono tracking-widest text-emerald-400/70 uppercase">
                Zero-Loss Payment Engine
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 p-1 rounded-xl bg-black/40 border border-emerald-500/20">
            <button
              onClick={() => setActiveTab('store')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === 'store'
                  ? 'bg-emerald-500/20 text-cyber-neon border border-emerald-400/30 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Catalog & Store</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-emerald-500/20 text-cyber-neon border border-emerald-400/30 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{user ? 'My Orders & Refunds' : 'Order History'}</span>
            </button>

            {/* Admin Portal Tab (Only visible or highlighted if Admin) */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-sm'
                    : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-950/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Portal</span>
              </button>
            )}
          </nav>

          {/* Right Action Icons: Auth, Reset Stock, Cart */}
          <div className="flex items-center space-x-3">
            
            {/* User Profile / Auth Actions */}
            {user ? (
              <div className="flex items-center gap-2 bg-black/60 border border-emerald-500/25 rounded-xl p-1.5 pl-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-purple-400 animate-pulse' : 'bg-cyber-neon'}`} />
                  <span className="text-xs font-mono text-white font-medium truncate max-w-[100px] sm:max-w-[130px]">
                    {user.name}
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                      : 'bg-emerald-950 text-cyber-neon border border-emerald-500/40'
                  }`}>
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setActiveTab('store');
                  }}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-emerald-500/30 transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-cyber-neon" />
                  <span>Sign In</span>
                </button>

                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-cyber-neon/15 border border-cyber-neon/40 text-cyber-neon hover:bg-cyber-neon hover:text-cyber-950 transition-all flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Up</span>
                </button>
              </div>
            )}

            {/* Reset Stock Button */}
            <button
              onClick={onResetDemo}
              title="Reset inventory & demo data"
              className="hidden sm:flex p-2 text-xs font-mono text-gray-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Cart Trigger */}
            <button
              onClick={openCart}
              className="relative p-2.5 rounded-xl bg-black/60 border border-emerald-500/30 text-emerald-300 hover:text-cyber-neon hover:border-emerald-400/60 hover:shadow-glass-neon transition-all"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyber-neon text-cyber-950 font-bold text-xs shadow-md animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden border-t border-emerald-500/15 py-2 justify-around">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-1 text-xs py-1 px-2 rounded ${
              activeTab === 'store' ? 'text-cyber-neon bg-emerald-500/20 font-bold' : 'text-gray-400'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Store</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1 text-xs py-1 px-2 rounded ${
              activeTab === 'orders' ? 'text-cyber-neon bg-emerald-500/20 font-bold' : 'text-gray-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Orders</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1 text-xs py-1 px-2 rounded ${
                activeTab === 'admin' ? 'text-purple-300 bg-purple-500/20 font-bold' : 'text-purple-400'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
