const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const inventoryService = require('./inventoryService');
const orderService = require('./orderService');

class PaymentService {
  /**
   * Processes a payment through the mock payment gateway.
   *
   * @param {object} params
   * @param {string} params.orderId - The order ID to pay for
   * @param {string} params.idempotencyKey - Client-provided idempotency key
   * @param {string} params.paymentMethod - Payment method (e.g., 'Credit Card', 'Cash', 'Mobile Pay')
   * @param {string} params.outcome - Simulated outcome: 'success' | 'failure' | 'timeout'
   */
  async processPayment({ orderId, idempotencyKey, paymentMethod = 'Mock Gateway', outcome = 'success' }) {
    if (!orderId) {
      const err = new Error('orderId is required');
      err.statusCode = 400;
      throw err;
    }

    if (!idempotencyKey) {
      const err = new Error('idempotencyKey is required to prevent duplicate payment submissions');
      err.statusCode = 400;
      throw err;
    }

    // Step 1: Idempotency check - Has this payment request already been submitted?
    const existingPayment = await Payment.findOne({ idempotencyKey });
    if (existingPayment) {
      console.log(`[PaymentService] Duplicate payment detected for idempotencyKey: ${idempotencyKey}`);
      const order = await Order.findById(existingPayment.orderId);
      return {
        isDuplicate: true,
        payment: existingPayment,
        order,
        message: 'Duplicate payment submission detected. Returning previous transaction response.',
      };
    }

    // Step 2: Fetch and validate the order state
    let order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    // Check if the 5-minute reservation expired
    order = await orderService.checkAndExpireIfTimeout(order);

    if (order.status !== 'Reserved') {
      const err = new Error(
        `Payment rejected: Order is already in status '${order.status}'. Only 'Reserved' orders can accept payment.`
      );
      err.statusCode = 409; // Conflict
      err.orderStatus = order.status;
      throw err;
    }

    const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    // Step 3: Handle outcomes distinctly
    if (outcome === 'success') {
      // Transition order status to 'Paid'
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, status: 'Reserved' },
        {
          $set: {
            status: 'Paid',
            'paymentDetails.transactionId': transactionId,
            'paymentDetails.paymentMethod': paymentMethod,
            'paymentDetails.outcome': 'success',
            'paymentDetails.paidAt': new Date(),
          },
          $push: {
            history: {
              status: 'Paid',
              timestamp: new Date(),
              reason: `Payment successful via ${paymentMethod} (Txn: ${transactionId})`,
            },
          },
        },
        { new: true }
      );

      if (!updatedOrder) {
        const err = new Error('Order state changed concurrently during payment. Transaction aborted.');
        err.statusCode = 409;
        throw err;
      }

      // Finalize inventory deduction (stock permanently leaves inventory)
      await inventoryService.finalizeReservedStock(updatedOrder.items);

      // Record payment transaction
      const payment = new Payment({
        orderId,
        idempotencyKey,
        amount: updatedOrder.totalAmount,
        paymentMethod,
        gatewayOutcome: 'success',
        status: 'Completed',
        transactionId,
        gatewayResponse: {
          code: 'PAYMENT_SUCCESS',
          authorizationCode: crypto.randomUUID().substring(0, 6).toUpperCase(),
          gatewayTimestamp: new Date(),
        },
      });
      await payment.save();

      return {
        success: true,
        order: updatedOrder,
        payment,
        message: 'Payment confirmed successfully. Order completed.',
      };
    } else if (outcome === 'failure') {
      // Transition order to 'Failed'
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, status: 'Reserved' },
        {
          $set: {
            status: 'Failed',
            'paymentDetails.transactionId': transactionId,
            'paymentDetails.paymentMethod': paymentMethod,
            'paymentDetails.outcome': 'failure',
          },
          $push: {
            history: {
              status: 'Failed',
              timestamp: new Date(),
              reason: 'Payment gateway declined transaction (Card declined / Insufficient funds)',
            },
          },
        },
        { new: true }
      );

      if (!updatedOrder) {
        const err = new Error('Order state changed concurrently. Failed transition aborted.');
        err.statusCode = 409;
        throw err;
      }

      // Release reserved stock back to availableStock
      await inventoryService.releaseReservedStock(updatedOrder.items);

      // Record failed payment
      const payment = new Payment({
        orderId,
        idempotencyKey,
        amount: updatedOrder.totalAmount,
        paymentMethod,
        gatewayOutcome: 'failure',
        status: 'Failed',
        transactionId,
        errorMessage: 'Mock payment gateway declined transaction',
        gatewayResponse: {
          code: 'CARD_DECLINED',
          declineReason: 'Card issuer rejected transaction',
          gatewayTimestamp: new Date(),
        },
      });
      await payment.save();

      return {
        success: false,
        order: updatedOrder,
        payment,
        message: 'Payment failed. Reserved stock has been released back to inventory.',
      };
    } else if (outcome === 'timeout') {
      // Gateway timeout outcome:
      // Transition order to 'Expired' and release stock
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, status: 'Reserved' },
        {
          $set: {
            status: 'Expired',
            'paymentDetails.transactionId': transactionId,
            'paymentDetails.paymentMethod': paymentMethod,
            'paymentDetails.outcome': 'timeout',
          },
          $push: {
            history: {
              status: 'Expired',
              timestamp: new Date(),
              reason: 'Payment gateway timed out. Reservation released.',
            },
          },
        },
        { new: true }
      );

      if (!updatedOrder) {
        const err = new Error('Order state changed concurrently. Timeout transition aborted.');
        err.statusCode = 409;
        throw err;
      }

      // Release reserved stock immediately
      await inventoryService.releaseReservedStock(updatedOrder.items);

      // Record timeout payment
      const payment = new Payment({
        orderId,
        idempotencyKey,
        amount: updatedOrder.totalAmount,
        paymentMethod,
        gatewayOutcome: 'timeout',
        status: 'TimedOut',
        transactionId,
        errorMessage: 'Mock payment gateway connection timed out after 30s',
        gatewayResponse: {
          code: 'GATEWAY_TIMEOUT',
          gatewayTimestamp: new Date(),
        },
      });
      await payment.save();

      return {
        success: false,
        order: updatedOrder,
        payment,
        message: 'Payment timed out. Order reservation expired and stock released.',
      };
    } else {
      const err = new Error(`Invalid mock outcome '${outcome}'. Allowed: success, failure, timeout.`);
      err.statusCode = 400;
      throw err;
    }
  }
}

module.exports = new PaymentService();
