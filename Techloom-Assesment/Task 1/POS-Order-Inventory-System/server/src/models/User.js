const crypto = require('crypto');
const { query } = require('../config/db');
const { createQueryPromise } = require('./queryHelper');

class User {
  constructor(data = {}) {
    this.id = data.id || data._id || crypto.randomUUID();
    this._id = this.id;
    this.username = data.username ? data.username.toLowerCase().trim() : '';
    this.name = data.name || this.username;
    this.salt = data.salt || '';
    this.passwordHash = data.passwordHash || data.password_hash || '';
    this.role = data.role || 'user';
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  static hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  setPassword(plainPassword) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.passwordHash = User.hashPassword(plainPassword, this.salt);
  }

  verifyPassword(plainPassword) {
    if (!this.salt || !this.passwordHash) return false;
    const hash = User.hashPassword(plainPassword, this.salt);
    return crypto.timingSafeEqual(Buffer.from(this.passwordHash), Buffer.from(hash));
  }

  async save() {
    this.updatedAt = new Date();
    const existing = await query('SELECT id FROM users WHERE id = $1', [this.id]);
    
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO users (id, username, name, salt, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [this.id, this.username, this.name, this.salt, this.passwordHash, this.role, this.createdAt, this.updatedAt]
      );
    } else {
      await query(
        `UPDATE users
         SET username = $2, name = $3, salt = $4, password_hash = $5, role = $6, updated_at = $7
         WHERE id = $1`,
        [this.id, this.username, this.name, this.salt, this.passwordHash, this.role, this.updatedAt]
      );
    }
    return this;
  }

  toJSON() {
    return {
      _id: this.id,
      id: this.id,
      username: this.username,
      name: this.name,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static _fromRow(row) {
    if (!row) return null;
    return new User({
      id: row.id,
      username: row.username,
      name: row.name,
      salt: row.salt,
      passwordHash: row.password_hash,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  static async findOne(filter = {}) {
    if (filter.username) {
      const res = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [filter.username.toLowerCase().trim()]);
      return res.rows.length > 0 ? User._fromRow(res.rows[0]) : null;
    }
    if (filter._id || filter.id) {
      return await User.findById(filter._id || filter.id);
    }
    return null;
  }

  static async findById(id) {
    if (!id) return null;
    const res = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [String(id)]);
    return res.rows.length > 0 ? User._fromRow(res.rows[0]) : null;
  }

  static find(filter = {}) {
    return createQueryPromise(async ({ sortCriteria, limitCount }) => {
      let sql = 'SELECT * FROM users WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filter.role) {
        sql += ` AND role = $${paramIndex++}`;
        params.push(filter.role);
      }

      sql += ' ORDER BY created_at DESC';

      if (limitCount) {
        sql += ` LIMIT ${parseInt(limitCount, 10)}`;
      }

      const res = await query(sql, params);
      return res.rows.map(r => User._fromRow(r));
    });
  }

  static async countDocuments() {
    const res = await query('SELECT COUNT(*) AS count FROM users');
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = User;
