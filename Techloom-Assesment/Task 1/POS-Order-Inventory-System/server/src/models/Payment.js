const crypto = require('crypto');
const { query } = require('../config/db');
const { createQueryPromise } = require('./queryHelper');

class Payment {
  constructor(data = {}) {
    this.id = data.id || data._id || crypto.randomUUID();
    this._id = this.id;
    this.orderId = data.orderId || data.order_id || '';
    this.idempotencyKey = data.idempotencyKey || data.idempotency_key || '';
    this.amount = parseFloat(data.amount) || 0;
    this.paymentMethod = data.paymentMethod || data.payment_method || 'Mock Gateway';
    this.gatewayOutcome = data.gatewayOutcome || data.gateway_outcome || 'success';
    this.status = data.status || 'Completed';
    this.transactionId = data.transactionId || data.transaction_id || `txn_${Date.now()}`;
    this.errorMessage = data.errorMessage || data.error_message || '';
    this.gatewayResponse = typeof data.gatewayResponse === 'string'
      ? JSON.parse(data.gatewayResponse)
      : typeof data.gateway_response === 'string'
      ? JSON.parse(data.gateway_response)
      : (data.gatewayResponse || data.gateway_response || {});
    this.createdAt = data.createdAt ? new Date(data.createdAt) : data.created_at ? new Date(data.created_at) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : data.updated_at ? new Date(data.updated_at) : new Date();
  }

  static _fromRow(row) {
    if (!row) return null;
    return new Payment({
      id: row.id,
      orderId: row.order_id,
      idempotencyKey: row.idempotency_key,
      amount: parseFloat(row.amount),
      paymentMethod: row.payment_method,
      gatewayOutcome: row.gateway_outcome,
      status: row.status,
      transactionId: row.transaction_id,
      errorMessage: row.error_message,
      gatewayResponse: typeof row.gateway_response === 'string' ? JSON.parse(row.gateway_response) : row.gateway_response,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  toJSON() {
    return {
      _id: this.id,
      id: this.id,
      orderId: this.orderId,
      idempotencyKey: this.idempotencyKey,
      amount: this.amount,
      paymentMethod: this.paymentMethod,
      gatewayOutcome: this.gatewayOutcome,
      status: this.status,
      transactionId: this.transactionId,
      errorMessage: this.errorMessage,
      gatewayResponse: this.gatewayResponse,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    this.updatedAt = new Date();
    const existing = await query('SELECT id FROM payments WHERE id = $1', [this.id]);
    const responseJson = JSON.stringify(this.gatewayResponse || {});

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO payments 
         (id, order_id, idempotency_key, amount, payment_method, gateway_outcome, status, transaction_id, error_message, gateway_response, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          this.id,
          this.orderId,
          this.idempotencyKey,
          this.amount,
          this.paymentMethod,
          this.gatewayOutcome,
          this.status,
          this.transactionId,
          this.errorMessage,
          responseJson,
          this.createdAt,
          this.updatedAt,
        ]
      );
    } else {
      await query(
        `UPDATE payments
         SET order_id = $2, idempotency_key = $3, amount = $4, payment_method = $5,
             gateway_outcome = $6, status = $7, transaction_id = $8, error_message = $9,
             gateway_response = $10, updated_at = $11
         WHERE id = $1`,
        [
          this.id,
          this.orderId,
          this.idempotencyKey,
          this.amount,
          this.paymentMethod,
          this.gatewayOutcome,
          this.status,
          this.transactionId,
          this.errorMessage,
          responseJson,
          this.updatedAt,
        ]
      );
    }
    return this;
  }

  static async findById(id) {
    if (!id) return null;
    const res = await query('SELECT * FROM payments WHERE id = $1 LIMIT 1', [String(id)]);
    return res.rows.length > 0 ? Payment._fromRow(res.rows[0]) : null;
  }

  static find(filter = {}) {
    return createQueryPromise(async ({ sortCriteria, limitCount }) => {
      let sql = 'SELECT * FROM payments WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filter.orderId) {
        sql += ` AND order_id = $${paramIndex++}`;
        params.push(String(filter.orderId));
      }

      sql += ' ORDER BY created_at DESC';

      if (limitCount) {
        sql += ` LIMIT ${parseInt(limitCount, 10)}`;
      }

      const res = await query(sql, params);
      return res.rows.map(r => Payment._fromRow(r));
    });
  }

  static async findOne(filter = {}) {
    if (filter.idempotencyKey) {
      const res = await query('SELECT * FROM payments WHERE idempotency_key = $1 LIMIT 1', [filter.idempotencyKey]);
      return res.rows.length > 0 ? Payment._fromRow(res.rows[0]) : null;
    }
    if (filter.orderId) {
      const res = await query('SELECT * FROM payments WHERE order_id = $1 LIMIT 1', [String(filter.orderId)]);
      return res.rows.length > 0 ? Payment._fromRow(res.rows[0]) : null;
    }
    if (filter.id || filter._id) {
      const res = await query('SELECT * FROM payments WHERE id = $1 LIMIT 1', [String(filter.id || filter._id)]);
      return res.rows.length > 0 ? Payment._fromRow(res.rows[0]) : null;
    }
    return null;
  }
}

module.exports = Payment;
