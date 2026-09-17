import React, { useState } from 'react';
import { Search, Plus, Check, ShoppingBag, Sparkles } from 'lucide-react';
import StockBadge from './StockBadge';
import { formatLKR } from '../api/client';

export default function Storefront({
  products,
  cart,
  onAddToCart,
  loading,
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/20 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            POS Storefront (LKR)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Nexus Retail Storefront
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300">
            Select catalog products and proceed to checkout. The system guarantees atomic stock reservation
            for 5 minutes, preventing overselling under high concurrency.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name, SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      {products.length === 0 && !loading ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/50 border border-slate-800">
          <ShoppingBag className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Catalog is empty</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            No products currently in inventory. Please contact an administrator to add items.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map(product => {
            const cartItem = cart.find(c => c.productId === product._id);
            const inCartQty = cartItem ? cartItem.quantity : 0;
            const isOutOfStock = product.availableStock <= 0;
            const isMaxInCart = inCartQty >= product.availableStock;

            return (
              <div
                key={product._id}
                className="group flex flex-col justify-between rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 transition-all shadow-md hover:shadow-xl hover:shadow-blue-500/5"
              >
                <div>
                  {/* Category & SKU Header */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {product.category || 'General'}
                    </span>
                    <span className="font-mono">{product.sku}</span>
                  </div>

                  {/* Product Name */}
                  <h3 className="font-bold text-base text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {product.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 h-8">
                    {product.description || 'No description provided.'}
                  </p>

                  {/* Stock Status Indicators */}
                  <div className="mt-4">
                    <StockBadge
                      stock={product.stock}
                      reservedStock={product.reservedStock}
                      availableStock={product.availableStock}
                    />
                  </div>
                </div>

                {/* Footer: Price in LKR & Add to Cart Button */}
                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-400 block">Unit Price</span>
                    <span className="text-base sm:text-lg font-extrabold text-white font-mono">
                      {formatLKR(product.price)}
                    </span>
                  </div>

                  <button
                    disabled={isOutOfStock || isMaxInCart}
                    onClick={() => onAddToCart(product)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isOutOfStock
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                        : isMaxInCart
                        ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 active:scale-95'
                    }`}
                  >
                    {isOutOfStock ? (
                      <span>Sold Out</span>
                    ) : isMaxInCart ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>All {inCartQty} in Cart</span>
                      </>
                    ) : inCartQty > 0 ? (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add ({inCartQty})</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
