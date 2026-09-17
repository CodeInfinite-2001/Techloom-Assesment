const crypto = require('crypto');
const { query } = require('../config/db');
const { createQueryPromise } = require('./queryHelper');

class Product {
  constructor(data = {}) {
    this.id = data.id || data._id || crypto.randomUUID();
    this._id = this.id;
    this.name = data.name ? data.name.trim() : '';
    this.sku = data.sku ? data.sku.trim().toUpperCase() : '';
    this.description = data.description || '';
    this.category = data.category || 'General';
    this.price = parseFloat(data.price) || 0;
    this.stock = parseInt(data.stock, 10) || 0;
    this.reservedStock = parseInt(data.reservedStock ?? data.reserved_stock, 10) || 0;
    
    // Auto-calculate available stock if not provided
    if (data.availableStock !== undefined || data.available_stock !== undefined) {
      this.availableStock = parseInt(data.availableStock ?? data.available_stock, 10);
    } else {
      this.availableStock = Math.max(0, this.stock - this.reservedStock);
    }

    this.imageUrl = data.imageUrl || data.image_url || '';
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  static _fromRow(row) {
    if (!row) return null;
    return new Product({
      id: row.id,
      name: row.name,
      sku: row.sku,
      description: row.description,
      category: row.category,
      price: parseFloat(row.price),
      stock: parseInt(row.stock, 10),
      reservedStock: parseInt(row.reserved_stock, 10),
      availableStock: parseInt(row.available_stock, 10),
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  toJSON() {
    return {
      _id: this.id,
      id: this.id,
      name: this.name,
      sku: this.sku,
      description: this.description,
      category: this.category,
      price: this.price,
      stock: this.stock,
      reservedStock: this.reservedStock,
      availableStock: this.availableStock,
      imageUrl: this.imageUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    this.updatedAt = new Date();
    if (this.availableStock === undefined) {
      this.availableStock = Math.max(0, this.stock - (this.reservedStock || 0));
    }

    const existing = await query('SELECT id FROM products WHERE id = $1', [this.id]);
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO products 
         (id, sku, name, description, category, price, stock, reserved_stock, available_stock, image_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          this.id,
          this.sku,
          this.name,
          this.description,
          this.category,
          this.price,
          this.stock,
          this.reservedStock,
          this.availableStock,
          this.imageUrl,
          this.createdAt,
          this.updatedAt,
        ]
      );
    } else {
      await query(
        `UPDATE products
         SET sku = $2, name = $3, description = $4, category = $5, price = $6, stock = $7,
             reserved_stock = $8, available_stock = $9, image_url = $10, updated_at = $11
         WHERE id = $1`,
        [
          this.id,
          this.sku,
          this.name,
          this.description,
          this.category,
          this.price,
          this.stock,
          this.reservedStock,
          this.availableStock,
          this.imageUrl,
          this.updatedAt,
        ]
      );
    }
    return this;
  }

  static find(filter = {}) {
    return createQueryPromise(async ({ sortCriteria, limitCount }) => {
      let sql = 'SELECT * FROM products WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filter.category && filter.category !== 'All') {
        sql += ` AND category = $${paramIndex++}`;
        params.push(filter.category);
      }

      if (filter.search) {
        sql += ` AND (LOWER(name) LIKE $${paramIndex} OR LOWER(sku) LIKE $${paramIndex})`;
        params.push(`%${filter.search.toLowerCase()}%`);
        paramIndex++;
      }

      if (sortCriteria && sortCriteria.name === -1) {
        sql += ' ORDER BY name DESC';
      } else {
        sql += ' ORDER BY name ASC';
      }

      if (limitCount) {
        sql += ` LIMIT ${parseInt(limitCount, 10)}`;
      }

      const res = await query(sql, params);
      return res.rows.map(r => Product._fromRow(r));
    });
  }

  static async findById(id) {
    if (!id) return null;
    const res = await query('SELECT * FROM products WHERE id = $1 LIMIT 1', [String(id)]);
    return res.rows.length > 0 ? Product._fromRow(res.rows[0]) : null;
  }

  static async findOne(filter = {}) {
    if (filter.sku) {
      const res = await query('SELECT * FROM products WHERE sku = $1 LIMIT 1', [filter.sku.trim().toUpperCase()]);
      return res.rows.length > 0 ? Product._fromRow(res.rows[0]) : null;
    }
    if (filter._id || filter.id) {
      return await Product.findById(filter._id || filter.id);
    }
    return null;
  }

  static async findByIdAndUpdate(id, updates = {}, options = {}) {
    const product = await Product.findById(id);
    if (!product) return null;

    // Support MongoDB $inc syntax for atomic increments
    if (updates.$inc) {
      if (updates.$inc.availableStock !== undefined) product.availableStock += updates.$inc.availableStock;
      if (updates.$inc.reservedStock !== undefined) product.reservedStock += updates.$inc.reservedStock;
      if (updates.$inc.stock !== undefined) product.stock += updates.$inc.stock;
    }

    // Direct field updates
    if (updates.name !== undefined) product.name = updates.name.trim();
    if (updates.sku !== undefined) product.sku = updates.sku.trim().toUpperCase();
    if (updates.price !== undefined) product.price = parseFloat(updates.price);
    if (updates.stock !== undefined) product.stock = parseInt(updates.stock, 10);
    if (updates.reservedStock !== undefined) product.reservedStock = parseInt(updates.reservedStock, 10);
    if (updates.availableStock !== undefined) product.availableStock = parseInt(updates.availableStock, 10);
    if (updates.category !== undefined) product.category = updates.category;
    if (updates.description !== undefined) product.description = updates.description;
    if (updates.imageUrl !== undefined) product.imageUrl = updates.imageUrl;

    await product.save();
    return product;
  }

  static async findByIdAndDelete(id) {
    const product = await Product.findById(id);
    if (!product) return null;
    await query('DELETE FROM products WHERE id = $1', [String(id)]);
    return product;
  }

  static async findOneAndUpdate(filter, updates, options = {}) {
    if (filter.sku) {
      let product = await Product.findOne({ sku: filter.sku });
      if (!product && options.upsert) {
        product = new Product(updates);
        await product.save();
        return product;
      }
      if (product) {
        Object.assign(product, updates);
        await product.save();
        return product;
      }
    }
    return null;
  }

  static async countDocuments() {
    const res = await query('SELECT COUNT(*) AS count FROM products');
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = Product;
