import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout
}) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          className="w-screen max-w-md glass-panel border-l border-emerald-500/25 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-cyber-neon">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  Shopping Cart
                  {totalItems > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-neon/20 text-cyber-neon font-mono border border-cyber-neon/30">
                      {totalItems} items
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-400">Stock reservation begins at checkout</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-2xl bg-black/40 border border-emerald-500/20 flex items-center justify-center text-emerald-500/50">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">Your cart is empty</h3>
                  <p className="text-xs text-gray-400 max-w-xs">
                    Explore our neural audio, cyber wearables, and gaming hardware to add items.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-500/20 text-cyber-neon rounded-xl border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 transition-all"
                >
                  Start Exploring
                </button>
              </div>
            ) : (
              cartItems.map(item => (
                <div
                  key={item.id}
                  className="glass-card rounded-xl p-4 flex gap-4 border border-emerald-500/20 hover:border-emerald-500/40"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-18 h-18 w-20 h-20 object-cover rounded-lg border border-emerald-500/20 flex-shrink-0 bg-cyber-950"
                  />

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-semibold text-white line-clamp-1 pr-2">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-gray-400 hover:text-red-400 p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs font-mono text-emerald-400">
                        ${item.price.toFixed(2)} each
                      </span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center bg-black/60 border border-emerald-500/30 rounded-lg p-0.5">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white rounded font-mono text-xs"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono text-xs font-bold text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white rounded font-mono text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-sm font-bold font-mono text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer / Checkout */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-emerald-500/20 bg-cyber-950/60 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Cyber Shipping</span>
                  <span className="font-mono text-cyber-neon font-semibold">FREE</span>
                </div>
                <div className="pt-2 border-t border-emerald-500/10 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-white">Estimated Total</span>
                  <span className="text-xl font-bold font-mono text-cyber-neon">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Stock Reservation notice */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-300">
                <Sparkles className="w-4 h-4 text-cyber-neon flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-gray-300">
                  Proceeding to checkout holds inventory for <span className="text-cyber-neon font-semibold">10 minutes</span> with atomic reservation guarantees.
                </p>
              </div>

              {/* Checkout Trigger */}
              <button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-cyber-neon text-cyber-950 hover:bg-emerald-400 shadow-glass-neon flex items-center justify-center gap-2 transition-all"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onClearCart}
                className="w-full text-center text-xs text-gray-400 hover:text-red-400 transition-colors pt-1"
              >
                Clear Cart
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
