const paymentService = require('../services/paymentService');
const Payment = require('../models/Payment');

/**
 * Controller for Mock Payment Gateway processing.
 */
class PaymentController {
  // POST /api/payments/process
  async processPayment(req, res, next) {
    try {
      const { orderId, paymentMethod, outcome } = req.body;
      const idempotencyKey =
        req.body.idempotencyKey ||
        req.headers['idempotency-key'] ||
        req.headers['x-idempotency-key'];

      const result = await paymentService.processPayment({
        orderId,
        idempotencyKey,
        paymentMethod: paymentMethod || 'Mock Gateway',
        outcome: outcome || 'success',
      });

      const statusCode = result.isDuplicate ? 200 : result.success ? 200 : 402;
      res.status(statusCode).json(result);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/payments/order/:orderId
  async getPaymentByOrderId(req, res, next) {
    try {
      const payments = await Payment.find({ orderId: req.params.orderId });
      res.json({ success: true, count: payments.length, payments });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/payments/:id
  async getPaymentById(req, res, next) {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment record not found' });
      }
      res.json({ success: true, payment });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();
