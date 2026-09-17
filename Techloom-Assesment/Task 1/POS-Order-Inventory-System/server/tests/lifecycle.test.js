const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
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
});

describe('Order Lifecycle & Stock Restoration Tests', () => {
  test('Creating an order moves stock to reserved and creates 5-minute lock', async () => {
    const product = await Product.create({
      name: 'Wireless Mouse',
      sku: 'MOUSE-01',
      price: 29.99,
      stock: 10,
      availableStock: 10,
      reservedStock: 0,
    });

    const res = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Alice',
        items: [{ productId: product._id.toString(), quantity: 3 }],
        reservationDurationSec: 300,
      });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('Reserved');
    expect(res.body.order.totalAmount).toBe(89.97);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.availableStock).toBe(7);
    expect(updatedProduct.reservedStock).toBe(3);
    expect(updatedProduct.stock).toBe(10);
  });

  test('Cancelling a reserved order immediately restores available stock', async () => {
    const product = await Product.create({
      name: 'Mechanical Keyboard',
      sku: 'KEY-01',
      price: 99.0,
      stock: 5,
      availableStock: 5,
      reservedStock: 0,
    });

    // Create order with 2 items
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Bob',
        items: [{ productId: product._id.toString(), quantity: 2 }],
      });

    const orderId = orderRes.body.order._id;

    // Check stock after reservation
    let p = await Product.findById(product._id);
    expect(p.availableStock).toBe(3);
    expect(p.reservedStock).toBe(2);

    // Cancel order
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .send({ reason: 'Changed mind' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.order.status).toBe('Cancelled');

    // Stock should be restored
    p = await Product.findById(product._id);
    expect(p.availableStock).toBe(5);
    expect(p.reservedStock).toBe(0);
    expect(p.stock).toBe(5);
  });

  test('Expiring a reservation releases stock back to available inventory', async () => {
    const product = await Product.create({
      name: 'Coffee Beans',
      sku: 'BEANS-01',
      price: 15.0,
      stock: 8,
      availableStock: 8,
      reservedStock: 0,
    });

    // Create order with 1 second expiry for test
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Charlie',
        items: [{ productId: product._id.toString(), quantity: 4 }],
        reservationDurationSec: 1, // 1 second
      });

    const orderId = orderRes.body.order._id;

    // Manually trigger expiry or fetch after delay
    const expireRes = await request(app)
      .post(`/api/orders/${orderId}/expire`)
      .send();

    expect(expireRes.status).toBe(200);
    expect(expireRes.body.order.status).toBe('Expired');

    // Stock must be restored
    const p = await Product.findById(product._id);
    expect(p.availableStock).toBe(8);
    expect(p.reservedStock).toBe(0);
  });

  test('Rejects invalid status transitions (e.g. cancelling an already expired or cancelled order)', async () => {
    const product = await Product.create({
      name: 'USB Cable',
      sku: 'CABLE-01',
      price: 10.0,
      stock: 5,
      availableStock: 5,
      reservedStock: 0,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: product._id.toString(), quantity: 1 }],
      });
    const orderId = orderRes.body.order._id;

    // First cancellation succeeds
    await request(app).post(`/api/orders/${orderId}/cancel`);

    // Second cancellation must fail with 409 Conflict
    const secondCancelRes = await request(app).post(`/api/orders/${orderId}/cancel`);
    expect(secondCancelRes.status).toBe(409);
    expect(secondCancelRes.body.message).toMatch(/Cannot cancel order with status 'Cancelled'/i);
  });
});
