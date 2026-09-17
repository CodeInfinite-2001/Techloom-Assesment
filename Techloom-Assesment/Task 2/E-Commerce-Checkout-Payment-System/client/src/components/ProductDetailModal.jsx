import React, { useState } from 'react';
import { X, Star, ShieldCheck, Check, ShoppingBag, Truck, Lock, ArrowRight } from 'lucide-react';

export default function ProductDetailModal({ product, onClose, onAddToCart, onInstantCheckout }) {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  if (!product) return null;

  const maxAvailable = product.availableStock || 0;
  const isOutOfStock = maxAvailable <= 0;

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleCheckoutNow = () => {
    onAddToCart(product, quantity);
    onInstantCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl glass-modal rounded-3xl overflow-hidden border border-emerald-500/30 my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 border border-emerald-500/30 text-gray-300 hover:text-white hover:bg-black/90 hover:border-cyber-neon transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Left: Product Image & Badges */}
          <div className="relative bg-cyber-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-emerald-500/20">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-72 sm:h-80 object-cover rounded-2xl border border-emerald-500/20 shadow-2xl"
            />
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {product.badge && (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyber-neon text-cyber-950">
                  {product.badge}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-black/60 border border-emerald-500/30 text-emerald-300">
                {product.category}
              </span>
            </div>

            {/* Micro-guarantee notice */}
            <div className="mt-5 w-full bg-black/40 rounded-xl p-3 border border-emerald-500/15 text-left text-xs space-y-1.5 text-gray-400">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Lock className="w-3.5 h-3.5" /> 10-Minute Stock Reservation
              </div>
              <p className="text-[11px] leading-relaxed">
                Stock is reserved the moment you enter checkout. No one else can purchase your reserved items.
              </p>
            </div>
          </div>

          {/* Right: Info, Specs, Actions */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              
              {/* Rating */}
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-gray-700 text-gray-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-white font-mono">{product.rating}</span>
                <span className="text-gray-400 text-xs">({product.reviewsCount} customer reviews)</span>
              </div>

              {/* Title & Price */}
              <div>
                <h2 className="text-2xl font-bold text-white leading-tight">
                  {product.name}
                </h2>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold font-mono text-cyber-neon">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">Tax calculated at checkout</span>
                </div>
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">Inventory Status:</span>
                {isOutOfStock ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-red-950 text-red-400 border border-red-500/40">
                    Out of Stock
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-cyber-neon border border-emerald-500/40">
                    ● {maxAvailable} Available in Warehouse
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm leading-relaxed">
                {product.description}
              </p>

              {/* Technical Specifications */}
              {product.specs && product.specs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-emerald-500/15">
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block">
                    Technical Specifications
                  </span>
                  <ul className="grid grid-cols-1 gap-1.5 text-xs text-gray-300">
                    {product.specs.map((spec, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyber-neon" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* Quantity Selector & Checkout Actions */}
            <div className="pt-4 border-t border-emerald-500/15 space-y-4">
              
              {!isOutOfStock && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-300">Quantity</span>
                  <div className="flex items-center bg-black/60 border border-emerald-500/30 rounded-xl p-1">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white rounded-lg hover:bg-emerald-500/10 font-mono text-base"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-mono font-bold text-white text-sm">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(q => Math.min(maxAvailable, q + 1))}
                      disabled={quantity >= maxAvailable}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white rounded-lg hover:bg-emerald-500/10 font-mono text-base disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAdd}
                  disabled={isOutOfStock}
                  className={`py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                    isOutOfStock
                      ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed col-span-2'
                      : justAdded
                      ? 'bg-cyber-neon text-cyber-950 font-bold shadow-glass-neon'
                      : 'bg-black/50 text-white border border-emerald-500/40 hover:border-cyber-neon hover:bg-emerald-500/10'
                  }`}
                >
                  {justAdded ? (
                    <>
                      <Check className="w-4 h-4 text-cyber-950" />
                      <span>Added to Cart!</span>
                    </>
                  ) : isOutOfStock ? (
                    <span>Sold Out</span>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-emerald-400" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>

                {!isOutOfStock && (
                  <button
                    onClick={handleCheckoutNow}
                    className="py-3 px-4 rounded-xl font-bold text-sm bg-cyber-neon text-cyber-950 hover:bg-emerald-400 shadow-glass-neon flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Instant Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
