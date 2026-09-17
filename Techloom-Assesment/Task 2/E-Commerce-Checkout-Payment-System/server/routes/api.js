const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const reservationService = require('../services/reservationService');
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');
const authService = require('../services/authService');

// Middleware to ensure expired reservations are cleaned up
router.use((req, res, next) => {
  try {
    reservationService.sweepExpiredReservations();
  } catch (err) {
    console.error('Sweeper middleware error:', err);
  }
  next();
});

// ==========================================
// 1. PRODUCT DISCOVERY & DETAILS
// ==========================================

// GET /api/products - Search and filter products
router.get('/products', (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, inStock, sort } = req.query;
    let products = db.getProducts().map(p => {
      const reserved = p.reservedStock || 0;
      const availableStock = Math.max(0, p.stock - reserved);
      return {
        ...p,
        availableStock,
        isSoldOut: availableStock <= 0
      };
    });

    // 1. Search Query
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.specs && p.specs.some(s => s.toLowerCase().includes(q)))
      );
    }

    // 2. Category Filter
    if (category && category !== 'All') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // 3. Price Filter
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) products = products.filter(p => p.price >= min);
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) products = products.filter(p => p.price <= max);
    }

    // 4. Availability Filter
    if (inStock === 'true' || inStock === true) {
      products = products.filter(p => p.availableStock > 0);
    }

    // 5. Sorting
    if (sort === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      products.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'name') {
      products.sort((a, b) => a.name.localeCompare(b.name));
    }

    return res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ success: false, error: 'Internal server error fetching products' });
  }
});

// GET /api/products/categories - Distinct categories with counts
router.get('/products/categories', (req, res) => {
  try {
    const products = db.getProducts();
    const categoriesMap = {};
    products.forEach(p => {
      categoriesMap[p.category] = (categoriesMap[p.category] || 0) + 1;
    });

    const categories = Object.keys(categoriesMap).map(cat => ({
      name: cat,
      count: categoriesMap[cat]
    }));

    return res.json({
      success: true,
      categories: [{ name: 'All', count: products.length }, ...categories]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// GET /api/products/:id - Single product detail
router.get('/products/:id', (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const reserved = product.reservedStock || 0;
    const availableStock = Math.max(0, product.stock - reserved);

    return res.json({
      success: true,
      product: {
        ...product,
        availableStock,
        isSoldOut: availableStock <= 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error fetching product' });
  }
});

// ==========================================
// 2. STOCK RESERVATION & CHECKOUT
// ==========================================

// POST /api/checkout/reserve - Reserve stock before payment attempt
router.post('/checkout/reserve', async (req, res) => {
  try {
    const { items, customer } = req.body;
    const authHeader = req.headers.authorization;
    const authUser = authHeader ? authService.verifyToken(authHeader) : null;

    const mergedCustomer = {
      ...customer,
      name: authUser?.name || customer?.name || 'Customer',
      email: authUser?.email || customer?.email || '',
      userId: authUser?.id || customer?.userId
    };

    const result = await reservationService.reserveStock(items, mergedCustomer);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(201).json(result);
  } catch (err) {
    console.error('Error reserving stock:', err);
    return res.status(500).json({ success: false, error: 'Failed to reserve stock' });
  }
});

// GET /api/checkout/session/:id - Check session status and countdown
router.get('/checkout/session/:id', (req, res) => {
  try {
    const session = reservationService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Checkout session not found' });
    }
    return res.json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to get session' });
  }
});

// POST /api/checkout/release/:id - Release reservation manually
router.post('/checkout/release/:id', (req, res) => {
  try {
    const result = reservationService.releaseReservation(req.params.id, 'USER_RELEASED');
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to release reservation' });
  }
});

// ==========================================
// 3. MOCK PAYMENT GATEWAY & IDEMPOTENCY
// ==========================================

// POST /api/checkout/pay - Process payment with simulation controls & idempotency guard
router.post('/checkout/pay', async (req, res) => {
  try {
    const { checkoutSessionId, idempotencyKey, simulationMode, paymentDetails, customerInfo } = req.body;
    const authHeader = req.headers.authorization;
    const authUser = authHeader ? authService.verifyToken(authHeader) : null;

    const mergedCustomerInfo = {
      ...customerInfo,
      name: authUser?.name || customerInfo?.name || 'Valued Customer',
      email: authUser?.email || customerInfo?.email || 'customer@example.com',
      userId: authUser?.id || customerInfo?.userId
    };

    const result = await paymentService.processPayment({
      checkoutSessionId,
      idempotencyKey,
      simulationMode: simulationMode || 'SUCCESS',
      paymentDetails,
      customerInfo: mergedCustomerInfo
    });

    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Payment processing error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during payment execution' });
  }
});

// ==========================================
// 4. POST-PURCHASE & ORDERS & REFUNDS
// ==========================================

// GET /api/orders - Get order history (Restricted to logged in users or admins)
router.get('/orders', (req, res) => {
  try {
    const { status, search, email } = req.query;
    const authHeader = req.headers.authorization;
    const authUser = authHeader ? authService.verifyToken(authHeader) : null;

    // Strict access control: If no authenticated user, block access completely
    if (!authUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to view order history.',
        orders: []
      });
    }

    let orders = orderService.getOrders({ status, search });

    // If user is a customer (not admin), strictly enforce filtering by their own email or userId
    if (authUser.role !== 'admin') {
      const userEmail = (authUser.email || '').toLowerCase().trim();
      const userId = authUser.id;
      orders = orders.filter(o => {
        const orderEmail = (o.customer?.email || '').toLowerCase().trim();
        const orderUserId = o.userId || o.customer?.userId;
        return (userEmail && orderEmail === userEmail) || (userId && orderUserId === userId);
      });
    } else if (email) {
      // If admin and requested a specific customer email, filter by it
      const queryEmail = email.trim().toLowerCase();
      orders = orders.filter(o => (o.customer?.email || '').toLowerCase().trim() === queryEmail);
    }

    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve orders' });
  }
});

// GET /api/orders/:id - Get single order receipt
router.get('/orders/:id', (req, res) => {
  try {
    const order = orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    return res.json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve order' });
  }
});

// POST /api/orders/:id/cancel - Cancel order and process simulated refund
router.post('/orders/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const authHeader = req.headers.authorization;
    const authUser = authHeader ? authService.verifyToken(authHeader) : null;

    const existingOrder = orderService.getOrderById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Customer can only cancel their own orders (admins can cancel any)
    if (authUser && authUser.role !== 'admin') {
      const userEmail = (authUser.email || '').toLowerCase().trim();
      const orderEmail = (existingOrder.customer?.email || '').toLowerCase().trim();
      const orderUserId = existingOrder.userId || existingOrder.customer?.userId;
      if (orderEmail !== userEmail && orderUserId !== authUser.id) {
        return res.status(403).json({ success: false, error: 'You are not authorized to cancel this order.' });
      }
    }

    const result = await orderService.cancelAndRefundOrder(req.params.id, reason);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('Error cancelling order:', err);
    return res.status(500).json({ success: false, error: 'Failed to process order cancellation' });
  }
});

// ==========================================
// 5. AUTHENTICATION & USER MANAGEMENT
// ==========================================

// POST /api/auth/register - Sign up
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.register({ name, email, password, role });
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(201).json(result);
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// POST /api/auth/login - Sign in
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    if (!result.success) {
      return res.status(401).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// GET /api/auth/me - Validate current session token
router.get('/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const user = authService.verifyToken(authHeader);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Session check failed' });
  }
});

// ==========================================
// 6. ADMIN PORTAL MANAGEMENT & ANALYTICS
// ==========================================

// GET /api/admin/analytics - Overview metrics
router.get('/admin/analytics', (req, res) => {
  try {
    const orders = db.getOrders();
    const products = db.getProducts();
    const sessions = db.getAllCheckoutSessions();
    const users = db.getUsers();

    const paidOrders = orders.filter(o => o.status === 'PAID');
    const refundedOrders = orders.filter(o => o.status === 'REFUNDED');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalRefunded = refundedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const now = Date.now();
    const activeReservations = sessions.filter(
      s => s.status === 'RESERVED' && new Date(s.expiresAt).getTime() > now
    );

    const lowStockCount = products.filter(p => {
      const avail = p.stock - (p.reservedStock || 0);
      return avail <= 5;
    }).length;

    return res.json({
      success: true,
      analytics: {
        totalRevenue: +totalRevenue.toFixed(2),
        totalRefunded: +totalRefunded.toFixed(2),
        totalOrders: orders.length,
        paidOrdersCount: paidOrders.length,
        activeReservationsCount: activeReservations.length,
        productsCount: products.length,
        lowStockCount,
        usersCount: users.length
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate analytics' });
  }
});

// GET /api/admin/reservations - Live inspection of held stock reservations
router.get('/admin/reservations', (req, res) => {
  try {
    const now = Date.now();
    const sessions = db.getAllCheckoutSessions();
    const active = sessions
      .filter(s => s.status === 'RESERVED' && new Date(s.expiresAt).getTime() > now)
      .map(s => {
        const remainingSeconds = Math.max(0, Math.floor((new Date(s.expiresAt).getTime() - now) / 1000));
        return {
          ...s,
          remainingSeconds
        };
      });

    return res.json({
      success: true,
      count: active.length,
      reservations: active
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch reservations' });
  }
});

// POST /api/admin/reservations/:id/force-release - Force release a stuck or test reservation
router.post('/admin/reservations/:id/force-release', (req, res) => {
  try {
    const result = reservationService.releaseReservation(req.params.id, 'ADMIN_RELEASED');
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json({
      success: true,
      message: `Reservation ${req.params.id} has been force-released. Stock restored to catalog.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to release reservation' });
  }
});

// POST /api/admin/products - Add product
router.post('/admin/products', (req, res) => {
  try {
    const { name, category, price, stock, description, specs, imageUrl, badge } = req.body;
    if (!name || !price || stock === undefined) {
      return res.status(400).json({ success: false, error: 'Name, price, and stock are required' });
    }

    const crypto = require('crypto');
    const newProduct = {
      id: `prod_${crypto.randomUUID().substring(0, 8)}`,
      name: name.trim(),
      category: category || 'General',
      price: parseFloat(price) || 0,
      rating: 5.0,
      reviewsCount: 1,
      stock: parseInt(stock, 10) || 0,
      reservedStock: 0,
      description: description || 'Next-gen cybertech hardware.',
      specs: Array.isArray(specs) ? specs : (specs ? specs.split(',').map(s => s.trim()) : ['High performance']),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      badge: badge || 'New'
    };

    const saved = db.addProduct(newProduct);
    return res.status(201).json({ success: true, product: saved });
  } catch (err) {
    console.error('Error adding product:', err);
    return res.status(500).json({ success: false, error: 'Failed to add product' });
  }
});

// PUT /api/admin/products/:id - Update product price, stock, etc.
router.put('/admin/products/:id', (req, res) => {
  try {
    const updates = req.body;
    if (updates.price !== undefined) updates.price = parseFloat(updates.price);
    if (updates.stock !== undefined) updates.stock = parseInt(updates.stock, 10);

    const updated = db.updateProduct(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.json({ success: true, product: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:id - Delete product
router.delete('/api/admin/products/:id', (req, res) => {
  try {
    const removed = db.deleteProduct(req.params.id);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.json({ success: true, message: `Product "${removed.name}" deleted successfully` });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// POST /api/admin/reset - Reset demo catalog and orders (for evaluation testing)
router.post('/admin/reset', (req, res) => {
  try {
    const products = db.resetCatalog();
    return res.json({
      success: true,
      message: 'Catalog and stock levels reset to default initial state',
      products
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to reset catalog' });
  }
});

module.exports = router;

