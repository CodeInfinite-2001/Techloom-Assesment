const orderService = require('../services/orderService');

/**
 * Controller for Order Creation, Lifecycle, and Cancellation.
 */
class OrderController {
  // POST /api/orders
  async createOrder(req, res, next) {
    try {
      const { items, customerName, reservationDurationSec } = req.body;
      const userId = req.user ? req.user.id : null;
      const finalCustomerName =
        customerName || (req.user ? `${req.user.name} (${req.user.role})` : 'POS Customer');

      const order = await orderService.createOrder({
        items,
        customerName: finalCustomerName,
        userId,
        // Standard: 300 seconds (5 minutes), allows custom duration for testing
        reservationDurationSec: reservationDurationSec ? parseInt(reservationDurationSec, 10) : 300,
      });

      res.status(201).json({
        success: true,
        message: 'Order created and stock successfully reserved for 5 minutes',
        order,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/orders
  async listOrders(req, res, next) {
    try {
      const { status, customerName, myOrders } = req.query;
      const filter = {};
      if (status && status !== 'All') filter.status = status;
      if (customerName) filter.customerName = customerName;
      if (myOrders === 'true' && req.user) {
        filter.userId = req.user.id;
      }

      const orders = await orderService.listOrders(filter);
      res.json({
        success: true,
        count: orders.length,
        orders,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/orders/:id
  async getOrderById(req, res, next) {
    try {
      const order = await orderService.getOrderById(req.params.id);
      res.json({ success: true, order });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/orders/:id/cancel
  async cancelOrder(req, res, next) {
    try {
      const { reason } = req.body || {};
      const userReason = reason || (req.user ? `Cancelled by ${req.user.name}` : 'Cancelled by customer/cashier');
      const order = await orderService.cancelOrder(req.params.id, userReason);
      res.json({
        success: true,
        message: 'Order cancelled and reserved stock restored to available inventory',
        order,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/orders/:id/expire
  async expireOrder(req, res, next) {
    try {
      const { reason } = req.body || {};
      const order = await orderService.expireOrder(
        req.params.id,
        reason || 'Reservation manually expired / timeout simulated'
      );
      res.json({
        success: true,
        message: 'Order expired and reserved stock released',
        order,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/orders/:id/complete
  async completeOrder(req, res, next) {
    try {
      const { reason } = req.body || {};
      const userReason = reason || (req.user ? `Fulfilled by ${req.user.name}` : 'Order fulfilled and delivered');
      const order = await orderService.completeOrder(req.params.id, userReason);
      res.json({
        success: true,
        message: 'Order successfully marked as completed / fulfilled',
        order,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
