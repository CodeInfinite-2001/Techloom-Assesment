const Order = require('../models/Order');
const orderService = require('./orderService');

let workerIntervalId = null;

/**
 * Background worker that continuously scans for expired reservations
 * and safely releases inventory back to available stock.
 */
async function checkExpiredReservations() {
  try {
    const now = new Date();
    // Find all active orders whose reservation expiry time has passed
    const expiredOrders = await Order.findExpired(now, 50);

    if (expiredOrders.length > 0) {
      console.log(`[ExpiryWorker] Found ${expiredOrders.length} expired reservation(s) to release.`);
      for (const order of expiredOrders) {
        try {
          await orderService.expireOrder(
            order._id,
            'Reservation timed out (automatically expired by 5-minute background worker)'
          );
          console.log(`[ExpiryWorker] Expired order ${order.orderNumber} and restored stock.`);
        } catch (err) {
          console.error(`[ExpiryWorker] Error expiring order ${order._id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('[ExpiryWorker] Worker error scanning for expired orders:', err.message);
  }
}

/**
 * Starts the background expiration worker.
 * @param {number} intervalMs - Polling interval in ms (default: 5000ms)
 */
function startExpiryWorker(intervalMs = 5000) {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
  }
  console.log(`[ExpiryWorker] Starting background reservation cleanup worker (interval: ${intervalMs}ms)...`);
  workerIntervalId = setInterval(checkExpiredReservations, intervalMs);
}

/**
 * Stops the background worker (useful for clean shutdown and tests).
 */
function stopExpiryWorker() {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    console.log('[ExpiryWorker] Background worker stopped.');
  }
}

module.exports = {
  checkExpiredReservations,
  startExpiryWorker,
  stopExpiryWorker,
};
