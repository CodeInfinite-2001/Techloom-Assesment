const Product = require('../models/Product');
const { query } = require('../config/db');

/**
 * Concurrency-safe inventory management service for PostgreSQL.
 * Uses atomic SQL conditional updates ("WHERE available_stock >= qty RETURNING *")
 * to guarantee that no overselling can ever happen, even under intense concurrent load.
 */
class InventoryService {
  /**
   * Atomically reserves stock for a list of items.
   * If any item cannot be reserved due to insufficient availableStock,
   * any items reserved earlier in this batch are rolled back immediately.
   *
   * @param {Array<{ productId: string, quantity: number }>} items
   * @returns {Promise<Array<object>>} Updated products
   */
  async reserveStockForItems(items) {
    const reservedItems = [];

    try {
      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        if (qty <= 0) {
          throw new Error(`Invalid reservation quantity: ${qty}`);
        }

        // Atomic conditional update in PostgreSQL
        const res = await query(
          `UPDATE products
           SET available_stock = available_stock - $1,
               reserved_stock = reserved_stock + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND available_stock >= $1
           RETURNING *`,
          [qty, String(item.productId)]
        );

        if (res.rows.length === 0) {
          const currentProd = await Product.findById(item.productId);
          const name = currentProd ? currentProd.name : item.productId;
          const available = currentProd ? currentProd.availableStock : 0;
          const err = new Error(
            `Insufficient stock for "${name}". Available: ${available}, requested: ${qty}`
          );
          err.statusCode = 400;
          err.code = 'OUT_OF_STOCK';
          err.productId = item.productId;
          throw err;
        }

        const updatedProduct = Product._fromRow(res.rows[0]);
        reservedItems.push({
          productId: item.productId,
          quantity: qty,
          product: updatedProduct,
        });
      }

      return reservedItems;
    } catch (error) {
      // Compensating rollback for any items reserved before the failure
      for (const reserved of reservedItems) {
        try {
          await query(
            `UPDATE products
             SET available_stock = available_stock + $1,
                 reserved_stock = reserved_stock - $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [reserved.quantity, String(reserved.productId)]
          );
        } catch (rollbackErr) {
          console.error('[InventoryService] Rollback error for product:', reserved.productId, rollbackErr);
        }
      }
      throw error;
    }
  }

  /**
   * Releases previously reserved stock back to available stock.
   * Used when an order expires, is cancelled, or payment fails.
   *
   * @param {Array<{ productId: string, quantity: number }>} items
   */
  async releaseReservedStock(items) {
    const results = [];
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      const res = await query(
        `UPDATE products
         SET available_stock = available_stock + $1,
             reserved_stock = reserved_stock - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [qty, String(item.productId)]
      );
      if (res.rows.length > 0) {
        results.push(Product._fromRow(res.rows[0]));
      }
    }
    return results;
  }

  /**
   * Finalizes stock deduction upon successful payment.
   * Total physical stock is permanently decremented, and reservedStock is cleared.
   * Available stock was already decremented during reservation.
   *
   * @param {Array<{ productId: string, quantity: number }>} items
   */
  async finalizeReservedStock(items) {
    const results = [];
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      const res = await query(
        `UPDATE products
         SET stock = stock - $1,
             reserved_stock = reserved_stock - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [qty, String(item.productId)]
      );
      if (res.rows.length > 0) {
        results.push(Product._fromRow(res.rows[0]));
      }
    }
    return results;
  }

  /**
   * Gets current stock status for a product.
   */
  async getStockStatus(productId) {
    const product = await Product.findById(productId);
    if (!product) {
      const err = new Error(`Product not found: ${productId}`);
      err.statusCode = 404;
      throw err;
    }

    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      stock: product.stock,
      reservedStock: product.reservedStock,
      availableStock: product.availableStock,
      isAvailable: product.availableStock > 0,
    };
  }
}

module.exports = new InventoryService();
