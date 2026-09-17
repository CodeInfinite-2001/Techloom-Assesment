const crypto = require('crypto');
const { db } = require('../db/database');
const reservationService = require('./reservationService');

const uuidv4 = () => crypto.randomUUID();

class PaymentService {
  /**
   * Process payment simulation with idempotency guard.
   *
   * @param {Object} params
   * @param {string} params.checkoutSessionId
   * @param {string} params.idempotencyKey
   * @param {string} params.simulationMode - 'SUCCESS' | 'FAILED' | 'TIMEOUT'
   * @param {Object} params.paymentDetails - { cardNumber, cardHolder, expiry, cvc }
   * @param {Object} params.customerInfo - { name, email, shippingAddress }
   */
  async processPayment({
    checkoutSessionId,
    idempotencyKey,
    simulationMode = 'SUCCESS',
    paymentDetails = {},
    customerInfo = {}
  }) {
    // 1. Validate inputs
    if (!checkoutSessionId) {
      return { status: 400, data: { success: false, error: 'checkoutSessionId is required' } };
    }
    if (!idempotencyKey) {
      return { status: 400, data: { success: false, error: 'idempotencyKey is required' } };
    }

    // 2. Check Idempotency Key
    const existingIdempotency = db.getIdempotencyRecord(idempotencyKey);
    if (existingIdempotency) {
      if (existingIdempotency.status === 'PROCESSING') {
        return {
          status: 409,
          data: {
            success: false,
            error: 'Duplicate payment request in progress. Please wait.',
            isDuplicate: true
          }
        };
      }
      if (existingIdempotency.status === 'COMPLETED') {
        console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
        return {
          status: 200,
          data: {
            ...existingIdempotency.response,
            isDuplicateReplay: true,
            message: 'Duplicate payment request detected. Returning original receipt without re-charging.'
          }
        };
      }
    }

    // Mark key as PROCESSING
    db.saveIdempotencyRecord({
      key: idempotencyKey,
      status: 'PROCESSING',
      checkoutSessionId,
      createdAt: new Date().toISOString()
    });

    // 3. Fetch and validate checkout session
    const session = reservationService.getSession(checkoutSessionId);
    if (!session) {
      db.saveIdempotencyRecord({
        key: idempotencyKey,
        status: 'COMPLETED',
        response: { success: false, error: 'Checkout session not found or invalid' }
      });
      return { status: 404, data: { success: false, error: 'Checkout session not found' } };
    }

    // Check if session expired
    if (session.isExpired || session.status === 'EXPIRED') {
      db.saveIdempotencyRecord({
        key: idempotencyKey,
        status: 'COMPLETED',
        response: { success: false, error: 'Stock reservation expired. Please return to cart.' }
      });
      return {
        status: 410,
        data: {
          success: false,
          error: 'Your 10-minute stock reservation has expired. The reserved items have been released.'
        }
      };
    }

    // Check if already paid/committed
    if (session.status === 'COMMITTED') {
      db.saveIdempotencyRecord({
        key: idempotencyKey,
        status: 'COMPLETED',
        response: { success: false, error: 'Session already completed and paid.' }
      });
      return {
        status: 400,
        data: { success: false, error: 'This checkout session has already been completed and paid.' }
      };
    }

    // 4. Execute Simulation Mode
    const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const maskedCard = paymentDetails.cardNumber
      ? `•••• •••• •••• ${paymentDetails.cardNumber.slice(-4)}`
      : '•••• •••• •••• 4242';

    // Outcome A: TIMEOUT SIMULATION
    if (simulationMode === 'TIMEOUT') {
      console.log(`[Payment Gateway] Simulating Gateway Timeout for Session ${checkoutSessionId}...`);
      // Simulate slow response / network stall
      await new Promise(resolve => setTimeout(resolve, 3500));

      const timeoutResponse = {
        success: false,
        status: 'TIMEOUT',
        error: 'Gateway Timeout: Payment processor did not respond within time limit (HTTP 504).',
        orderId,
        checkoutSessionId,
        retryAllowed: true,
        remainingSeconds: session.remainingSeconds,
        message: 'The payment gateway timed out. Your stock reservation is still active. You may retry payment.'
      };

      // Mark idempotency key failed/allow retry
      db.saveIdempotencyRecord({
        key: idempotencyKey,
        status: 'COMPLETED',
        response: timeoutResponse
      });

      return { status: 504, data: timeoutResponse };
    }

    // Outcome B: FAILED PAYMENT SIMULATION
    if (simulationMode === 'FAILED') {
      console.log(`[Payment Gateway] Simulating Payment Failure (Card Declined) for Session ${checkoutSessionId}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Release reserved stock back into available inventory!
      reservationService.releaseReservation(checkoutSessionId, 'PAYMENT_FAILED');

      const failedOrder = {
        id: orderId,
        checkoutSessionId,
        idempotencyKey,
        items: session.items,
        totalAmount: session.totalAmount,
        status: 'FAILED',
        userId: customerInfo.userId || session.customer?.userId || null,
        customer: {
          name: customerInfo.name || session.customer?.name || 'Valued Customer',
          email: customerInfo.email || session.customer?.email || 'customer@example.com',
          shippingAddress: customerInfo.shippingAddress || session.customer?.shippingAddress || '123 Cyber Lane, Tech City'
        },
        payment: {
          method: 'Credit Card',
          cardMask: maskedCard,
          status: 'DECLINED',
          declineReason: 'Insufficient Funds / Card Declined by Issuing Bank',
          attemptedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      };

      db.createOrder(failedOrder);

      const failedResponse = {
        success: false,
        status: 'FAILED',
        error: 'Payment declined: Insufficient funds or invalid card credentials.',
        order: failedOrder,
        stockReleased: true,
        message: 'Payment was declined by mock gateway. Reserved stock has been restored to store inventory.'
      };

      db.saveIdempotencyRecord({
        key: idempotencyKey,
        status: 'COMPLETED',
        response: failedResponse
      });

      return { status: 402, data: failedResponse };
    }

    // Outcome C: SUCCESSFUL PAYMENT
    console.log(`[Payment Gateway] Processing Successful Payment for Session ${checkoutSessionId}...`);
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Permanently commit stock deduction
    reservationService.commitReservation(checkoutSessionId);

    const paidOrder = {
      id: orderId,
      checkoutSessionId,
      idempotencyKey,
      userId: customerInfo.userId || session.customer?.userId || null,
      items: session.items,
      totalAmount: session.totalAmount,
      status: 'PAID',
      customer: {
        name: customerInfo.name || session.customer?.name || 'Valued Customer',
        email: customerInfo.email || session.customer?.email || 'customer@example.com',
        shippingAddress: customerInfo.shippingAddress || session.customer?.shippingAddress || '404 Emerald Boulevard, Neo-Tokyo'
      },
      payment: {
        method: 'Credit Card (Mock Visa)',
        cardMask: maskedCard,
        transactionId: `tx_live_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
        status: 'SUCCESS',
        paidAt: new Date().toISOString()
      },
      refund: null,
      createdAt: new Date().toISOString()
    };

    db.createOrder(paidOrder);

    const successResponse = {
      success: true,
      status: 'PAID',
      order: paidOrder,
      transactionId: paidOrder.payment.transactionId,
      message: 'Payment approved successfully! Order is confirmed.'
    };

    // Cache idempotency response
    db.saveIdempotencyRecord({
      key: idempotencyKey,
      status: 'COMPLETED',
      response: successResponse
    });

    return { status: 200, data: successResponse };
  }
}

module.exports = new PaymentService();
