const crypto = require('crypto');
const { db } = require('../db/database');

const uuidv4 = () => crypto.randomUUID();

const RESERVATION_TTL_MINUTES = 10;

class ReservationService {
  /**
   * Cleans up expired reservations and restores product stock.
   * Runs lazily on inventory checks and periodically via background timer.
   */
  sweepExpiredReservations() {
    const now = new Date().getTime();
    const sessions = db.getAllCheckoutSessions();
    let releasedCount = 0;

    sessions.forEach(session => {
      if (session.status === 'RESERVED' && new Date(session.expiresAt).getTime() < now) {
        console.log(`[Sweeper] Checkout session ${session.sessionId} expired. Releasing stock...`);
        this.releaseReservation(session.sessionId, 'EXPIRED');
        releasedCount++;
      }
    });

    return releasedCount;
  }

  /**
   * Atomically reserve stock for items in cart.
   * @param {Array<{productId: string, quantity: number}>} items
   * @param {Object} customer
   * @returns {Promise<{success: boolean, session?: Object, error?: string}>}
   */
  async reserveStock(items, customer = {}) {
    // First, sweep any expired sessions to ensure fresh availability
    this.sweepExpiredReservations();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return { success: false, error: 'Cart is empty. Cannot reserve stock.' };
    }

    // 1. Validation phase: check if all items exist and have sufficient stock
    const reservationPlan = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const product = db.getProductById(item.productId);
      if (!product) {
        return { success: false, error: `Product not found: ID ${item.productId}` };
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return { success: false, error: `Invalid quantity for ${product.name}` };
      }

      const available = product.stock - (product.reservedStock || 0);
      if (available < qty) {
        return {
          success: false,
          error: `Insufficient stock for "${product.name}". Available: ${available}, Requested: ${qty}`
        };
      }

      reservationPlan.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        imageUrl: product.imageUrl,
        subtotal: +(product.price * qty).toFixed(2)
      });

      calculatedTotal += product.price * qty;
    }

    // 2. Atomic Reservation: All items passed check, now increment reservedStock
    reservationPlan.forEach(planItem => {
      const product = db.getProductById(planItem.productId);
      const currentReserved = product.reservedStock || 0;
      db.updateProduct(planItem.productId, {
        reservedStock: currentReserved + planItem.quantity
      });
    });

    // 3. Create Checkout Session with TTL
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MINUTES * 60 * 1000);

    const session = {
      sessionId: `cs_${uuidv4().substring(0, 12)}`,
      items: reservationPlan,
      totalAmount: +calculatedTotal.toFixed(2),
      status: 'RESERVED',
      reservedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: RESERVATION_TTL_MINUTES * 60,
      customer: customer || {}
    };

    db.createCheckoutSession(session);

    return {
      success: true,
      session
    };
  }

  /**
   * Release reserved stock if session is expired, cancelled, or payment failed.
   */
  releaseReservation(sessionId, reason = 'RELEASED') {
    const session = db.getCheckoutSession(sessionId);
    if (!session) {
      return { success: false, error: 'Checkout session not found' };
    }

    // Only reserved sessions can be released. Committed sessions are already finalized.
    if (session.status !== 'RESERVED') {
      return { success: false, error: `Session already in state: ${session.status}` };
    }

    // Revert reservedStock for each item
    session.items.forEach(item => {
      const product = db.getProductById(item.productId);
      if (product) {
        const currentReserved = product.reservedStock || 0;
        const newReserved = Math.max(0, currentReserved - item.quantity);
        db.updateProduct(item.productId, { reservedStock: newReserved });
      }
    });

    db.updateCheckoutSession(sessionId, {
      status: reason,
      releasedAt: new Date().toISOString()
    });

    return { success: true };
  }

  /**
   * Permanently commit reserved stock when payment succeeds.
   * Decrements both total stock and reserved stock.
   */
  commitReservation(sessionId) {
    const session = db.getCheckoutSession(sessionId);
    if (!session) {
      return { success: false, error: 'Checkout session not found' };
    }

    if (session.status !== 'RESERVED') {
      return { success: false, error: `Session is not active (Status: ${session.status})` };
    }

    // Permanently deduct inventory
    session.items.forEach(item => {
      const product = db.getProductById(item.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        const newReserved = Math.max(0, (product.reservedStock || 0) - item.quantity);
        db.updateProduct(item.productId, {
          stock: newStock,
          reservedStock: newReserved
        });
      }
    });

    db.updateCheckoutSession(sessionId, {
      status: 'COMMITTED',
      committedAt: new Date().toISOString()
    });

    return { success: true };
  }

  /**
   * Get active session status and remaining reservation time.
   */
  getSession(sessionId) {
    this.sweepExpiredReservations();
    const session = db.getCheckoutSession(sessionId);
    if (!session) return null;

    const now = new Date().getTime();
    const expires = new Date(session.expiresAt).getTime();
    const remainingSeconds = Math.max(0, Math.floor((expires - now) / 1000));

    return {
      ...session,
      remainingSeconds,
      isExpired: remainingSeconds === 0 && session.status === 'RESERVED'
    };
  }
}

const reservationService = new ReservationService();

// Set up periodic background sweep every 20 seconds
setInterval(() => {
  try {
    reservationService.sweepExpiredReservations();
  } catch (err) {
    console.error('Error during scheduled reservation sweep:', err);
  }
}, 20000);

module.exports = reservationService;
