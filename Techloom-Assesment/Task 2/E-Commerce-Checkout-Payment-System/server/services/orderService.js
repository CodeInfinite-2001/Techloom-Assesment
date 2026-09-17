const crypto = require('crypto');
const { db } = require('../db/database');
const reservationService = require('./reservationService');

const uuidv4 = () => crypto.randomUUID();

class OrderService {
  /**
   * Fetch order history with optional filtering.
   * @param {Object} query - { status, search }
   */
  getOrders({ status, search } = {}) {
    let orders = db.getOrders();

    // Filter by status if provided and not 'ALL'
    if (status && status !== 'ALL') {
      orders = orders.filter(o => o.status === status);
    }

    // Filter by search query (order ID, item name, customer name)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter(o => {
        const idMatch = o.id.toLowerCase().includes(q);
        const nameMatch = o.customer?.name?.toLowerCase().includes(q);
        const itemMatch = o.items?.some(i => i.name.toLowerCase().includes(q));
        return idMatch || nameMatch || itemMatch;
      });
    }

    return orders;
  }

  /**
   * Get single order by ID
   */
  getOrderById(id) {
    return db.getOrderById(id);
  }

  /**
   * Cancel an order and process a simulated refund if already paid.
   * Restores inventory back to product stock.
   *
   * @param {string} orderId
   * @param {string} reason
   */
  async cancelAndRefundOrder(orderId, reason = 'Customer requested cancellation') {
    const order = db.getOrderById(orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found.` };
    }

    if (order.status === 'REFUNDED') {
      return { success: false, error: 'Order has already been refunded.' };
    }

    if (order.status === 'CANCELLED') {
      return { success: false, error: 'Order is already cancelled.' };
    }

    // Case 1: Order was PAID -> Process simulated refund & restore stock
    if (order.status === 'PAID') {
      console.log(`[Refund Service] Processing simulated refund for PAID Order ${orderId}...`);

      // Restore product inventory!
      order.items.forEach(item => {
        const product = db.getProductById(item.productId);
        if (product) {
          const newStock = product.stock + item.quantity;
          db.updateProduct(item.productId, { stock: newStock });
          console.log(`[Refund Service] Restored ${item.quantity} units to product "${product.name}". New Stock: ${newStock}`);
        }
      });

      const refundRecord = {
        refundId: `ref_${uuidv4().replace(/-/g, '').substring(0, 14)}`,
        amount: order.totalAmount,
        currency: 'USD',
        status: 'PROCESSED',
        reason: reason || 'Customer requested refund & cancellation',
        refundedAt: new Date().toISOString()
      };

      const updated = db.updateOrder(orderId, {
        status: 'REFUNDED',
        refund: refundRecord
      });

      return {
        success: true,
        order: updated,
        refund: refundRecord,
        stockRestored: true,
        message: `Order ${orderId} has been successfully cancelled and \$${order.totalAmount} was refunded to your payment method.`
      };
    }

    // Case 2: Order was PENDING_PAYMENT or FAILED
    if (order.status === 'PENDING_PAYMENT' || order.status === 'FAILED') {
      console.log(`[Cancellation Service] Cancelling unpaid/failed order ${orderId}...`);

      // If reservation is still active in checkout session, release it
      if (order.checkoutSessionId) {
        reservationService.releaseReservation(order.checkoutSessionId, 'ORDER_CANCELLED');
      }

      const updated = db.updateOrder(orderId, {
        status: 'CANCELLED',
        cancellationReason: reason
      });

      return {
        success: true,
        order: updated,
        stockRestored: true,
        message: `Order ${orderId} cancelled. Any reserved stock has been released back to the store.`
      };
    }

    return {
      success: false,
      error: `Order cannot be cancelled from current status: ${order.status}`
    };
  }
}

module.exports = new OrderService();
