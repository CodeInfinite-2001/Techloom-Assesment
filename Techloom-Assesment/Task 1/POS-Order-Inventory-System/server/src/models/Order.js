const crypto = require('crypto');
const { query } = require('../config/db');
const { createQueryPromise } = require('./queryHelper');

class Order {
  constructor(data = {}) {
    this.id = data.id || data._id || crypto.randomUUID();
    this._id = this.id;
    this.orderNumber = data.orderNumber || data.order_number || '';
    this.customerName = data.customerName || data.customer_name || 'POS Customer';
    this.userId = data.userId || data.user_id || null;
    this.totalAmount = parseFloat(data.totalAmount ?? data.total_amount) || 0;
    this.status = data.status || 'Reserved';
    this.expiresAt = data.expiresAt ? new Date(data.expiresAt) : data.expires_at ? new Date(data.expires_at) : new Date(Date.now() + 300000);
    
    // Parse JSONB or object
    this.items = typeof data.items === 'string' ? JSON.parse(data.items) : (data.items || []);
    this.history = typeof data.history === 'string' ? JSON.parse(data.history) : (data.history || []);
    this.paymentDetails = typeof data.paymentDetails === 'string'
      ? JSON.parse(data.paymentDetails)
      : typeof data.payment_details === 'string'
      ? JSON.parse(data.payment_details)
      : (data.paymentDetails || data.payment_details || null);

    this.idempotencyKey = data.idempotencyKey || data.idempotency_key || null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : data.created_at ? new Date(data.created_at) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : data.updated_at ? new Date(data.updated_at) : new Date();
  }

  addHistory(status, reason = '') {
    this.history.push({
      status,
      timestamp: new Date().toISOString(),
      reason,
    });
  }

  static _fromRow(row) {
    if (!row) return null;
    return new Order({
      id: row.id,
      orderNumber: row.order_number,
      customerName: row.customer_name,
      userId: row.user_id,
      totalAmount: parseFloat(row.total_amount),
      status: row.status,
      expiresAt: row.expires_at,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      history: typeof row.history === 'string' ? JSON.parse(row.history) : row.history,
      paymentDetails: typeof row.payment_details === 'string' ? JSON.parse(row.payment_details) : row.payment_details,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  toJSON() {
    return {
      _id: this.id,
      id: this.id,
      orderNumber: this.orderNumber,
      customerName: this.customerName,
      userId: this.userId,
      totalAmount: this.totalAmount,
      status: this.status,
      expiresAt: this.expiresAt,
      items: this.items,
      history: this.history,
      paymentDetails: this.paymentDetails,
      idempotencyKey: this.idempotencyKey,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    this.updatedAt = new Date();
    const existing = await query('SELECT id FROM orders WHERE id = $1', [this.id]);

    const itemsJson = JSON.stringify(this.items);
    const historyJson = JSON.stringify(this.history);
    const paymentJson = this.paymentDetails ? JSON.stringify(this.paymentDetails) : null;

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO orders 
         (id, order_number, customer_name, user_id, total_amount, status, expires_at, items, history, payment_details, idempotency_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          this.id,
          this.orderNumber,
          this.customerName,
          this.userId,
          this.totalAmount,
          this.status,
          this.expiresAt,
          itemsJson,
          historyJson,
          paymentJson,
          this.idempotencyKey,
          this.createdAt,
          this.updatedAt,
        ]
      );
    } else {
      await query(
        `UPDATE orders
         SET order_number = $2, customer_name = $3, user_id = $4, total_amount = $5, status = $6,
             expires_at = $7, items = $8, history = $9, payment_details = $10,
             idempotency_key = $11, updated_at = $12
         WHERE id = $1`,
        [
          this.id,
          this.orderNumber,
          this.customerName,
          this.userId,
          this.totalAmount,
          this.status,
          this.expiresAt,
          itemsJson,
          historyJson,
          paymentJson,
          this.idempotencyKey,
          this.updatedAt,
        ]
      );
    }
    return this;
  }

  static async findById(id) {
    if (!id) return null;
    const res = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [String(id)]);
    return res.rows.length > 0 ? Order._fromRow(res.rows[0]) : null;
  }

  static async findOne(filter = {}) {
    if (filter.orderNumber) {
      const res = await query('SELECT * FROM orders WHERE order_number = $1 LIMIT 1', [filter.orderNumber]);
      return res.rows.length > 0 ? Order._fromRow(res.rows[0]) : null;
    }
    if (filter._id || filter.id) {
      return await Order.findById(filter._id || filter.id);
    }
    return null;
  }

  static async findOneAndUpdate(filter = {}, updates = {}, options = {}) {
    const id = String(filter._id || filter.id);
    if (!id) return null;

    // Fetch order to atomically update
    const current = await Order.findById(id);
    if (!current) return null;

    // Check status condition if specified in filter
    if (filter.status && current.status !== filter.status) {
      return null;
    }

    // Process updates
    const setObj = updates.$set || updates;
    if (setObj.status) current.status = setObj.status;

    if (setObj['paymentDetails.transactionId'] || setObj['paymentDetails.paymentMethod'] || setObj.paymentDetails) {
      current.paymentDetails = current.paymentDetails || {};
      if (setObj['paymentDetails.transactionId']) current.paymentDetails.transactionId = setObj['paymentDetails.transactionId'];
      if (setObj['paymentDetails.paymentMethod']) current.paymentDetails.paymentMethod = setObj['paymentDetails.paymentMethod'];
      if (setObj['paymentDetails.outcome']) current.paymentDetails.outcome = setObj['paymentDetails.outcome'];
      if (setObj['paymentDetails.paidAt']) current.paymentDetails.paidAt = setObj['paymentDetails.paidAt'];
      if (setObj.paymentDetails) Object.assign(current.paymentDetails, setObj.paymentDetails);
    }

    if (updates.$push && updates.$push.history) {
      current.history = current.history || [];
      current.history.push(updates.$push.history);
    }

    // Atomic update with status guard
    let updateSql = `
      UPDATE orders
      SET status = $2, items = $3, history = $4, payment_details = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    const params = [
      id,
      current.status,
      JSON.stringify(current.items),
      JSON.stringify(current.history),
      current.paymentDetails ? JSON.stringify(current.paymentDetails) : null,
    ];

    if (filter.status) {
      updateSql += ` AND status = $6`;
      params.push(filter.status);
    }

    updateSql += ' RETURNING *';

    const res = await query(updateSql, params);
    return res.rows.length > 0 ? Order._fromRow(res.rows[0]) : null;
  }

  static find(filter = {}) {
    return createQueryPromise(async ({ sortCriteria, limitCount }) => {
      let sql = 'SELECT * FROM orders WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filter.status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(filter.status);
      }
      if (filter.customerName) {
        sql += ` AND LOWER(customer_name) LIKE $${paramIndex++}`;
        params.push(`%${filter.customerName.toLowerCase()}%`);
      }
      if (filter.userId) {
        sql += ` AND user_id = $${paramIndex++}`;
        params.push(filter.userId);
      }

      if (sortCriteria && sortCriteria.createdAt === 1) {
        sql += ' ORDER BY created_at ASC';
      } else {
        sql += ' ORDER BY created_at DESC';
      }

      if (limitCount) {
        sql += ` LIMIT ${parseInt(limitCount, 10)}`;
      }

      const res = await query(sql, params);
      return res.rows.map(r => Order._fromRow(r));
    });
  }

  static async findExpired(now = new Date(), limit = 50) {
    const res = await query(
      `SELECT * FROM orders 
       WHERE status = 'Reserved' AND expires_at <= $1 
       ORDER BY expires_at ASC 
       LIMIT $2`,
      [now, limit]
    );
    return res.rows.map(r => Order._fromRow(r));
  }

  static async countDocuments() {
    const res = await query('SELECT COUNT(*) AS count FROM orders');
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = Order;
