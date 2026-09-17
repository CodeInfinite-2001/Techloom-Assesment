import React from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Layers,
  ClipboardList,
  Zap,
  Database,
  Users,
  LogOut,
  Shield,
  User as UserIcon,
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  cartCount,
  onOpenCart,
  isConnected,
  currentUser,
  onLogout,
}) {
  const isAdmin = currentUser?.role === 'admin';

  // Base tabs accessible to all authenticated users
  const tabs = [
    { id: 'storefront', label: 'Storefront', icon: ShoppingBag },
    { id: 'orders', label: 'Orders & Lifecycle', icon: ClipboardList },
  ];

  // Admin exclusive tabs
  if (isAdmin) {
    tabs.splice(1, 0, { id: 'inventory', label: 'Inventory Management', icon: Layers });
    tabs.splice(2, 0, { id: 'users', label: 'User Accounts', icon: Users });
    tabs.push({ id: 'simulator', label: 'Concurrency Simulator', icon: Zap, highlight: true });
  }

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setActiveTab('storefront')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Nexus POS
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  LKR
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Atomic Stock Reservation POS
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : tab.highlight
                      ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-700/50'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.highlight && !isActive ? 'text-amber-400' : ''}`} />
                  <span>{tab.label}</span>
                  {tab.highlight && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Section: User Profile & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Logged in User Badge */}
            {currentUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/70 text-xs">
                {isAdmin ? (
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                )}
                <div className="hidden sm:block text-left">
                  <div className="font-semibold text-white leading-none flex items-center gap-1.5">
                    <span>{currentUser.name || currentUser.username}</span>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                        isAdmin
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out of POS"
                  className="ml-1 p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Cart Drawer Trigger */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white text-blue-700 text-xs font-bold shadow">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden overflow-x-auto pb-2.5 gap-1 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
