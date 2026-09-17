import React from 'react';
import { Lock, Package, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function StockBadge({ stock, reservedStock = 0, availableStock = 0, size = 'normal' }) {
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= 3;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {/* Available Stock Indicator */}
      <span
        className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
          isOutOfStock
            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            : isLowStock
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}
      >
        {isOutOfStock ? (
          <XCircle className="w-3.5 h-3.5" />
        ) : isLowStock ? (
          <AlertTriangle className="w-3.5 h-3.5" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" />
        )}
        <span>{availableStock} Avail</span>
      </span>

      {/* Reserved Stock Lock (only if reserved > 0) */}
      {reservedStock > 0 && (
        <span
          title={`${reservedStock} units held in active 5-minute reservations`}
          className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
        >
          <Lock className="w-3 h-3 text-indigo-400" />
          <span>{reservedStock} Locked</span>
        </span>
      )}

      {/* Total Physical Stock */}
      <span
        title={`Total physical inventory on hand = ${stock}`}
        className="inline-flex items-center gap-1 font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/40 text-xs"
      >
        <Package className="w-3 h-3 text-slate-500" />
        <span>{stock} Total</span>
      </span>
    </div>
  );
}
