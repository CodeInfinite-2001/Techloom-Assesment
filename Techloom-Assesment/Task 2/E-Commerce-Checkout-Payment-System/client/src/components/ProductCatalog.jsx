import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Star, ShoppingCart, Eye, Check, AlertCircle, Sparkles } from 'lucide-react';

export default function ProductCatalog({
  products,
  loading,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  onAddToCart,
  onViewProduct
}) {
  const [maxPrice, setMaxPrice] = useState(1000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [addedIds, setAddedIds] = useState({});

  // Handle instant add to cart feedback
  const handleAdd = (product, e) => {
    e.stopPropagation();
    onAddToCart(product);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  // Client-side filtering & sorting for smooth UX
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // Category filter
        if (selectedCategory !== 'All' && product.category !== selectedCategory) {
          return false;
        }
        // Price filter
        if (product.price > maxPrice) {
          return false;
        }
        // Availability filter
        if (inStockOnly && product.availableStock <= 0) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = product.name.toLowerCase().includes(q);
          const matchDesc = product.description.toLowerCase().includes(q);
          const matchCategory = product.category.toLowerCase().includes(q);
          const matchSpecs = product.specs?.some(s => s.toLowerCase().includes(q));
          if (!matchName && !matchDesc && !matchCategory && !matchSpecs) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0; // default order
      });
  }, [products, selectedCategory, maxPrice, inStockOnly, searchQuery, sortBy]);

  return (
    <div className="space-y-8">
      {/* Hero Banner with Cyber Glow */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-8 border border-emerald-500/25">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-cyber-neon text-xs font-mono uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> High-Performance Cyber Tech Gear
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Next-Gen Hardware with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-neon to-emerald-400">Atomic Stock Reservation</span>
          </h1>
          <p className="mt-3 text-gray-300 text-sm sm:text-base leading-relaxed">
            Browse our verified inventory. When you enter checkout, items are held with a 10-minute lock 
            guaranteeing stock availability while you complete mock payment.
          </p>
        </div>
      </div>

      {/* Discovery Filters & Search Bar */}
      <div className="glass-panel rounded-xl p-5 border border-emerald-500/20 space-y-5">
        {/* Search input & Sort */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input
              type="text"
              placeholder="Search products by title, specs, audio, chip..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort & Quick Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="glass-input text-xs py-2 px-3 rounded-lg cursor-pointer"
              >
                <option value="featured" className="bg-cyber-900">Featured</option>
                <option value="price_asc" className="bg-cyber-900">Price: Low to High</option>
                <option value="price_desc" className="bg-cyber-900">Price: High to Low</option>
                <option value="rating" className="bg-cyber-900">Highest Rated</option>
              </select>
            </div>

            {/* In Stock Only Switch */}
            <label className="flex items-center gap-2 cursor-pointer select-none bg-black/40 px-3 py-2 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={e => setInStockOnly(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-400 bg-cyber-950 border-emerald-600/40 w-4 h-4"
              />
              <span className="text-xs font-medium text-gray-300">In Stock Only</span>
            </label>
          </div>
        </div>

        {/* Category Pills & Price Slider */}
        <div className="pt-2 border-t border-emerald-500/10 flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between">
          
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.name
                    ? 'bg-cyber-neon text-cyber-950 font-bold shadow-glass-neon'
                    : 'bg-black/40 text-gray-300 border border-emerald-500/20 hover:border-emerald-500/40 hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat.name ? 'bg-cyber-950/20 text-black' : 'bg-white/10 text-gray-400'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Price Range Slider */}
          <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-emerald-500/20 min-w-[260px]">
            <span className="text-xs text-gray-400 font-mono">Max Price:</span>
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full accent-cyber-neon cursor-pointer h-1.5 bg-gray-800 rounded-lg"
            />
            <span className="text-xs font-mono font-bold text-cyber-neon w-14 text-right">
              ${maxPrice}
            </span>
          </div>

        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-mono text-gray-400">
          Showing <span className="text-cyber-neon font-bold">{filteredProducts.length}</span> verified gadgets
        </span>
        {(searchQuery || selectedCategory !== 'All' || inStockOnly || maxPrice < 1000) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setInStockOnly(false);
              setMaxPrice(1000);
            }}
            className="text-xs text-emerald-400 hover:underline"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="glass-card rounded-2xl p-4 h-96 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty Search Results */
        <div className="glass-panel rounded-2xl p-12 text-center border border-emerald-500/20 space-y-4">
          <AlertCircle className="w-12 h-12 text-emerald-400/50 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No products found matching your criteria</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Try adjusting your search terms, increasing the maximum price slider, or enabling out-of-stock items.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setMaxPrice(1000);
              setInStockOnly(false);
            }}
            className="px-4 py-2 bg-emerald-500/20 text-cyber-neon rounded-xl border border-emerald-500/40 text-xs hover:bg-emerald-500/30"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Product Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const isAdded = addedIds[product.id];
            const isOutOfStock = product.availableStock <= 0;
            const isLowStock = product.availableStock > 0 && product.availableStock <= 5;
            const reservedCount = product.reservedStock || 0;

            return (
              <div
                key={product.id}
                onClick={() => onViewProduct(product)}
                className="glass-card rounded-2xl overflow-hidden flex flex-col group cursor-pointer border border-emerald-500/20 hover:border-cyber-neon/40"
              >
                {/* Image Container */}
                <div className="relative aspect-video sm:aspect-square bg-cyber-950 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {product.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-cyber-neon/90 text-cyber-950 font-bold shadow-md">
                        {product.badge}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/70 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                      {product.category}
                    </span>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="absolute top-3 right-3">
                    {isOutOfStock ? (
                      <span className="px-2 py-1 rounded-md text-[11px] font-mono bg-red-950/80 border border-red-500/50 text-red-300 backdrop-blur-md">
                        Sold Out
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2 py-1 rounded-md text-[11px] font-mono bg-amber-950/80 border border-amber-500/50 text-amber-300 backdrop-blur-md animate-pulse">
                        Only {product.availableStock} left
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-[11px] font-mono bg-black/70 border border-emerald-500/40 text-cyber-neon backdrop-blur-md">
                        {product.availableStock} in stock
                      </span>
                    )}
                  </div>

                  {/* Reserved Notice Pill if any item currently held */}
                  {reservedCount > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 text-center py-1 bg-black/85 backdrop-blur-md border border-amber-500/30 rounded text-[10px] font-mono text-amber-300">
                      🔒 {reservedCount} unit{reservedCount > 1 ? 's' : ''} currently held in checkout
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Rating & Reviews */}
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span className="font-semibold text-white">{product.rating}</span>
                      <span className="text-gray-400 text-[11px]">({product.reviewsCount})</span>
                    </div>

                    <h3 className="font-semibold text-white text-base leading-snug group-hover:text-cyber-neon transition-colors line-clamp-1">
                      {product.name}
                    </h3>

                    <p className="mt-1.5 text-gray-400 text-xs line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-3 border-t border-emerald-500/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 font-mono block">Price</span>
                      <span className="text-lg font-bold font-mono text-white">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProduct(product);
                        }}
                        title="View Details"
                        className="p-2.5 rounded-xl bg-black/50 border border-emerald-500/20 text-gray-300 hover:text-white hover:border-emerald-400/40 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleAdd(product, e)}
                        disabled={isOutOfStock}
                        className={`px-3.5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all ${
                          isOutOfStock
                            ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                            : isAdded
                            ? 'bg-cyber-neon text-cyber-950 font-bold shadow-glass-neon'
                            : 'bg-emerald-500/20 hover:bg-cyber-neon hover:text-cyber-950 text-cyber-neon border border-emerald-400/40 hover:shadow-glass-neon'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : isOutOfStock ? (
                          <span>Out of Stock</span>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
