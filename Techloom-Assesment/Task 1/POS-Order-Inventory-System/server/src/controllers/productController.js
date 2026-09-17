const Product = require('../models/Product');

/**
 * Controller for Product & Inventory Management.
 */
class ProductController {
  // GET /api/products
  async getProducts(req, res, next) {
    try {
      const { search, category } = req.query;
      const filter = {};

      if (category && category !== 'All') {
        filter.category = category;
      }
      if (search) {
        filter.search = search;
      }

      const products = await Product.find(filter);
      res.json({
        success: true,
        count: products.length,
        products,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/products/:id
  async getProductById(req, res, next) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.json({ success: true, product });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/products
  async createProduct(req, res, next) {
    try {
      const { name, sku, price, stock, category, description, imageUrl } = req.body;

      if (!name || !sku || price === undefined || stock === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Please provide name, sku, price, and initial stock count',
        });
      }

      const existing = await Product.findOne({ sku: sku.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Product with SKU "${sku}" already exists`,
        });
      }

      const product = new Product({
        name,
        sku: sku.trim().toUpperCase(),
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        availableStock: parseInt(stock, 10),
        reservedStock: 0,
        category: category || 'General',
        description: description || '',
        imageUrl: imageUrl || '',
      });

      await product.save();
      res.status(201).json({ success: true, product });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/products/:id
  async updateProduct(req, res, next) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const { name, price, stock, category, description, imageUrl } = req.body;

      if (name !== undefined) product.name = name;
      if (price !== undefined) product.price = parseFloat(price);
      if (category !== undefined) product.category = category;
      if (description !== undefined) product.description = description;
      if (imageUrl !== undefined) product.imageUrl = imageUrl;

      // If physical stock count is updated, adjust availableStock keeping existing reservations intact
      if (stock !== undefined) {
        const newStock = parseInt(stock, 10);
        if (newStock < product.reservedStock) {
          return res.status(400).json({
            success: false,
            message: `New stock (${newStock}) cannot be less than current reserved stock (${product.reservedStock})`,
          });
        }
        product.stock = newStock;
        product.availableStock = newStock - product.reservedStock;
      }

      await product.save();
      res.json({ success: true, product });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/products/:id
  async deleteProduct(req, res, next) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      if (product.reservedStock > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete product while ${product.reservedStock} unit(s) are held in active reservations`,
        });
      }

      await Product.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Automatic startup seeder if catalog is empty
  async seedDefaultProducts() {
    try {
      const count = await Product.countDocuments();
      if (count === 0) {
        console.log('[Product] Empty catalog detected. Auto-seeding initial demo products...');
        for (const p of DEMO_PRODUCTS) {
          await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
        }
        console.log(`[Product] Successfully auto-seeded ${DEMO_PRODUCTS.length} initial products.`);
      }
    } catch (err) {
      console.error('[Product] Error auto-seeding products:', err.message);
    }
  }

  // POST /api/products/seed
  async seedProducts(req, res, next) {
    try {
      // Upsert seed items
      for (const p of DEMO_PRODUCTS) {
        await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
      }

      const all = await Product.find();
      res.json({
        success: true,
        message: 'Sample catalog seeded successfully with realistic stock levels',
        products: all,
      });
    } catch (err) {
      next(err);
    }
  }
}

const DEMO_PRODUCTS = [
  {
    name: 'iPhone 15 Pro Max',
    sku: 'PHONE-001',
    price: 385000.0,
    stock: 5, // Limited stock, perfect for concurrency stress test!
    availableStock: 5,
    reservedStock: 0,
    category: 'Electronics',
    description: 'Flagship smartphone with titanium design and A17 Pro chip. Limited stock!',
  },
  {
    name: 'Sony WH-1000XM5 Headphones',
    sku: 'AUDIO-002',
    price: 95000.0,
    stock: 12,
    availableStock: 12,
    reservedStock: 0,
    category: 'Audio',
    description: 'Industry-leading wireless noise-cancelling headphones.',
  },
  {
    name: 'Logitech MX Master 3S Mouse',
    sku: 'PERIPH-003',
    price: 28500.0,
    stock: 25,
    availableStock: 25,
    reservedStock: 0,
    category: 'Accessories',
    description: 'High-precision ergonomic wireless mouse for power users.',
  },
  {
    name: 'Mechanical Gaming Keyboard',
    sku: 'KEYBD-004',
    price: 32000.0,
    stock: 8,
    availableStock: 8,
    reservedStock: 0,
    category: 'Accessories',
    description: 'RGB hot-swappable mechanical keyboard with tactile switches.',
  },
  {
    name: 'Artisan Espresso Coffee Beans (1kg)',
    sku: 'FOOD-005',
    price: 7500.0,
    stock: 50,
    availableStock: 50,
    reservedStock: 0,
    category: 'Beverages',
    description: 'Single-origin specialty roasted whole espresso beans.',
  },
  {
    name: '4K Ultra-Wide Curved Monitor 34"',
    sku: 'DISP-006',
    price: 145000.0,
    stock: 3, // Very limited stock!
    availableStock: 3,
    reservedStock: 0,
    category: 'Electronics',
    description: 'Immersive curved productivity display with USB-C 90W delivery.',
  },
];

module.exports = new ProductController();
