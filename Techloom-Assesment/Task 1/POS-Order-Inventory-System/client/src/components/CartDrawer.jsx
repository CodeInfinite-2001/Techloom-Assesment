import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingCart, Lock } from 'lucide-react';
import { formatLKR } from '../api/client';

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  products,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  isReserving,
}) {
  if (!isOpen) return null;

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Active Order Cart</h2>
                <p className="text-xs text-slate-400">
                  {cart.length} unique item{cart.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <ShoppingCart className="w-12 h-12 text-slate-600 mb-3" />
                <h4 className="text-base font-semibold text-white">Your cart is empty</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Add products from the catalog to initiate stock reservation and checkout.
                </p>
              </div>
            ) : (
              cart.map(item => {
                const product = products.find(p => p._id === item.productId);
                const currentAvailable = product ? product.availableStock : 0;
                const canIncrease = item.quantity < currentAvailable;

                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{item.name}</h4>
                      <p className="text-xs font-mono text-slate-400">
                        {formatLKR(item.price)} each &bull; Avail: {currentAvailable}
                      </p>
                      <p className="text-xs font-bold text-blue-400 mt-1 font-mono">
                        {formatLKR(item.price * item.quantity)}
                      </p>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg p-1">
                      <button
                        onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        disabled={!canIncrease}
                        onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                          canIncrease
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                            : 'text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => onRemoveItem(item.productId)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-slate-800 bg-slate-900/90 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium">Order Subtotal</span>
                <span className="font-extrabold text-lg text-white font-mono">
                  {formatLKR(totalAmount)}
                </span>
              </div>

              {/* Informational stock lock note */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>
                  Proceeding locks inventory with a <strong>5-minute reservation</strong>,
                  protecting your items during payment.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClearCart}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Clear
                </button>
                <button
                  disabled={isReserving}
                  onClick={onProceedToCheckout}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {isReserving ? (
                    <span>Reserving Stock...</span>
                  ) : (
                    <>
                      <span>Lock Stock &amp; Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
