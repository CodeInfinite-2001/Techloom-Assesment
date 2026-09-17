const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await Payment.deleteMany({});
});

describe('Mock Payment Gateway & Idempotency Tests', () => {
  test('Payment SUCCESS confirms order and permanently finalizes inventory', async () => {
    const product = await Product.create({
      name: 'Smart Watch',
      sku: 'WATCH-01',
      price: 250.0,
      stock: 5,
      availableStock: 5,
      reservedStock: 0,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: product._id.toString(), quantity: 2 }],
      });
    const orderId = orderRes.body.order._id;

    // Process successful payment
    const payRes = await request(app)
      .post('/api/payments/process')
      .send({
        orderId,
        idempotencyKey: 'idemp-test-success-001',
        outcome: 'success',
        paymentMethod: 'Credit Card',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.order.status).toBe('Paid');

    // Verify stock is permanently deducted:
    // stock becomes 5 - 2 = 3
    // reservedStock becomes 0
    // availableStock remains 3
    const updatedProd = await Product.findById(product._id);
    expect(updatedProd.stock).toBe(3);
    expect(updatedProd.reservedStock).toBe(0);
    expect(updatedProd.availableStock).toBe(3);
  });

  test('Payment FAILURE releases reserved stock back to available inventory', async () => {
    const product = await Product.create({
      name: 'Tablet 10-inch',
      sku: 'TAB-01',
      price: 400.0,
      stock: 4,
      availableStock: 4,
      reservedStock: 0,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: product._id.toString(), quantity: 1 }],
      });
    const orderId = orderRes.body.order._id;

    // Process failed payment
    const payRes = await request(app)
      .post('/api/payments/process')
      .send({
        orderId,
        idempotencyKey: 'idemp-test-fail-002',
        outcome: 'failure',
      });

    expect(payRes.status).toBe(402);
    expect(payRes.body.success).toBe(false);
    expect(payRes.body.order.status).toBe('Failed');

    // Stock should be restored
    const updatedProd = await Product.findById(product._id);
    expect(updatedProd.stock).toBe(4);
    expect(updatedProd.availableStock).toBe(4);
    expect(updatedProd.reservedStock).toBe(0);
  });

  test('Payment TIMEOUT expires reservation and releases stock', async () => {
    const product = await Product.create({
      name: 'Desk Lamp',
      sku: 'LAMP-01',
      price: 45.0,
      stock: 6,
      availableStock: 6,
      reservedStock: 0,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: product._id.toString(), quantity: 3 }],
      });
    const orderId = orderRes.body.order._id;

    // Process timeout payment
    const payRes = await request(app)
      .post('/api/payments/process')
      .send({
        orderId,
        idempotencyKey: 'idemp-test-timeout-003',
        outcome: 'timeout',
      });

    expect(payRes.status).toBe(402);
    expect(payRes.body.order.status).toBe('Expired');

    // Stock restored
    const updatedProd = await Product.findById(product._id);
    expect(updatedProd.availableStock).toBe(6);
    expect(updatedProd.reservedStock).toBe(0);
  });

  test('Duplicate payment submission with same Idempotency-Key is safely rejected/cached', async () => {
    const product = await Product.create({
      name: 'Wireless Earbuds',
      sku: 'BUDS-01',
      price: 99.0,
      stock: 10,
      availableStock: 10,
      reservedStock: 0,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: product._id.toString(), quantity: 1 }],
      });
    const orderId = orderRes.body.order._id;

    const idempotencyKey = 'unique-key-xyz-789';

    // First payment
    const res1 = await request(app)
      .post('/api/payments/process')
      .send({
        orderId,
        idempotencyKey,
        outcome: 'success',
      });
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Second payment with SAME idempotency key
    const res2 = await request(app)
      .post('/api/payments/process')
      .send({
        orderId,
        idempotencyKey,
        outcome: 'success',
      });
    expect(res2.status).toBe(200);
    expect(res2.body.isDuplicate).toBe(true);

    // Ensure only 1 payment was created in database
    const paymentCount = await Payment.countDocuments({ idempotencyKey });
    expect(paymentCount).toBe(1);

    // Ensure inventory was deducted ONLY ONCE (10 - 1 = 9)
    const updatedProd = await Product.findById(product._id);
    expect(updatedProd.stock).toBe(9);
    expect(updatedProd.availableStock).toBe(9);
  });
});
