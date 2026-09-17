const Order = require('../models/Order');
const Product = require('../models/Product');
const inventoryService = require('./inventoryService');

class OrderService {
  /**
   * Creates an order and atomically reserves inventory for all items.
   * Standard reservation lock is 5 minutes (300 seconds), configurable for testing.
   */
  async createOrder({ items, customerName = 'POS Customer', userId = null, reservationDurationSec = 300 }) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      const err = new Error('Order must contain at least one item');
      err.statusCode = 400;
      throw err;
    }

    // Step 1: Validate items and fetch latest product details
    const orderItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        const err = new Error(`Invalid item quantity for product ${item.productId}`);
        err.statusCode = 400;
        throw err;
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        const err = new Error(`Product not found: ${item.productId}`);
        err.statusCode = 404;
        throw err;
      }

      const subtotal = Math.round(product.price * qty * 100) / 100;
      calculatedTotal += subtotal;

      orderItems.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        quantity: qty,
        subtotal,
      });
    }

    calculatedTotal = Math.round(calculatedTotal * 100) / 100;

    // Step 2: Atomically reserve stock
    // This will throw OUT_OF_STOCK and rollback any partial reservations if unavailable
    await inventoryService.reserveStockForItems(orderItems);

    // Step 3: Create the Order document with Reserved status and expiresAt
    const expiresAt = new Date(Date.now() + reservationDurationSec * 1000);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    const order = new Order({
      orderNumber,
      customerName,
      userId,
      items: orderItems,
      totalAmount: calculatedTotal,
      status: 'Reserved',
      expiresAt,
      history: [
        {
          status: 'Reserved',
          timestamp: new Date(),
          reason: `Stock locked for checkout (expires in ${reservationDurationSec}s)`,
        },
      ],
    });

    await order.save();
    return order;
  }

  /**
   * Lazily checks if a Reserved order has exceeded its 5-minute expiry timestamp.
   * If expired, transitions it to Expired and releases inventory.
   */
  async checkAndExpireIfTimeout(order) {
    if (order && order.status === 'Reserved' && new Date() > new Date(order.expiresAt)) {
      return await this.expireOrder(order._id, 'Reservation expired (timeout reached)');
    }
    return order;
  }

  /**
   * Get an order by ID with automatic lazy expiry check.
   */
  async getOrderById(orderId) {
    let order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }
    order = await this.checkAndExpireIfTimeout(order);
    return order;
  }

  /**
   * Cancels a Reserved order and releases the stock reservation back to inventory.
   */
  async cancelOrder(orderId, reason = 'Cancelled by customer/cashier') {
    let order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    // Lazy check in case it already expired
    order = await this.checkAndExpireIfTimeout(order);

    if (order.status !== 'Reserved') {
      const err = new Error(
        `Cannot cancel order with status '${order.status}'. Only 'Reserved' orders can be cancelled.`
      );
      err.statusCode = 409; // Conflict
      throw err;
    }

    // Atomic transition from Reserved -> Cancelled
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: 'Reserved' },
      {
        $set: { status: 'Cancelled' },
        $push: {
          history: {
            status: 'Cancelled',
            timestamp: new Date(),
            reason,
          },
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      const err = new Error('Order status changed concurrently. Cancellation aborted.');
      err.statusCode = 409;
      throw err;
    }

    // Release reserved stock back to availableStock
    await inventoryService.releaseReservedStock(updatedOrder.items);
    return updatedOrder;
  }

  /**
   * Expire a Reserved order and release stock.
   */
  async expireOrder(orderId, reason = 'Reservation timeout expired') {
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: 'Reserved' },
      {
        $set: { status: 'Expired' },
        $push: {
          history: {
            status: 'Expired',
            timestamp: new Date(),
            reason,
          },
        },
      },
      { new: true }
    );

    if (updatedOrder) {
      await inventoryService.releaseReservedStock(updatedOrder.items);
    }

    return updatedOrder || (await Order.findById(orderId));
  }

  /**
   * Complete / fulfill a Paid order
   */
  async completeOrder(orderId, reason = 'Order fulfilled and handed over to customer') {
    let order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.status !== 'Paid') {
      const err = new Error(`Cannot complete order with status '${order.status}'. Only 'Paid' orders can be marked as Completed.`);
      err.statusCode = 409;
      throw err;
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: 'Paid' },
      {
        $set: { status: 'Completed' },
        $push: {
          history: {
            status: 'Completed',
            timestamp: new Date(),
            reason,
          },
        },
      },
      { new: true }
    );

    return updatedOrder || (await Order.findById(orderId));
  }

  /**
   * List all orders, optionally filtered.
   */
  async listOrders(filters = {}) {
    const query = {};
    if (filters.status && filters.status !== 'All') {
      query.status = filters.status;
    }
    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.customerName) {
      query.customerName = filters.customerName;
    }
    const orders = await Order.find(query);

    // Check expiry for any Reserved orders returned
    const now = new Date();
    const updatedList = [];
    for (const order of orders) {
      if (order.status === 'Reserved' && now > new Date(order.expiresAt)) {
        const expired = await this.expireOrder(order._id, 'Reservation expired');
        updatedList.push(expired);
      } else {
        updatedList.push(order);
      }
    }
    return updatedList;
  }
}

module.exports = new OrderService();
