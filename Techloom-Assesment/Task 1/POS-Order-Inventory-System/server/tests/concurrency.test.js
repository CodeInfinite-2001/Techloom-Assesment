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

describe('Concurrency Safety & Anti-Overselling Tests', () => {
  test('Prevents overselling when 25 concurrent checkout requests compete for 5 items', async () => {
    // 1. Create a product with strictly 5 units in stock
    const product = await Product.create({
      name: 'Limited Edition Sneakers',
      sku: 'SNEAKER-001',
      price: 199.99,
      stock: 5,
      availableStock: 5,
      reservedStock: 0,
    });

    const TOTAL_REQUESTS = 25;
    const REQUEST_QTY = 1;

    // 2. Prepare 25 concurrent checkout promises
    const checkoutPromises = Array.from({ length: TOTAL_REQUESTS }, (_, index) => {
      return request(app)
        .post('/api/orders')
        .send({
          customerName: `Shopper #${index + 1}`,
          items: [{ productId: product._id.toString(), quantity: REQUEST_QTY }],
          reservationDurationSec: 300,
        });
    });

    // 3. Execute all 25 requests simultaneously
    const responses = await Promise.all(checkoutPromises);

    // 4. Count successful vs failed responses
    const successfulCheckouts = responses.filter(res => res.status === 201);
    const failedCheckouts = responses.filter(res => res.status === 400);

    // 5. Verify assertions
    expect(successfulCheckouts.length).toBe(5);
    expect(failedCheckouts.length).toBe(20);

    // Check failed error messages
    failedCheckouts.forEach(res => {
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Insufficient stock/i);
    });

    // 6. Verify database product state
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(5); // Physical stock remains 5
    expect(updatedProduct.availableStock).toBe(0); // Available stock is exactly 0, never negative!
    expect(updatedProduct.reservedStock).toBe(5); // Exactly 5 units reserved

    // 7. Verify orders collection
    const totalOrdersCreated = await Order.countDocuments();
    expect(totalOrdersCreated).toBe(5);
  });
});
