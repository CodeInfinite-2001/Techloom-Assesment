/**
 * CLI Concurrency Simulation Script
 * Demonstrates zero overselling under heavy simultaneous checkout attempts.
 *
 * Usage: node scripts/simulateConcurrency.js [concurrentRequests] [stockCount]
 */
require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/db');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const orderService = require('../src/services/orderService');

async function runSimulation() {
  const concurrentRequests = parseInt(process.argv[2] || '20', 10);
  const stockCount = parseInt(process.argv[3] || '5', 10);

  console.log(`\n======================================================`);
  console.log(`  🚀 POS CONCURRENCY & OVERSELLING STRESS TEST`);
  console.log(`======================================================`);
  console.log(`• Initial Stock Count:        ${stockCount} units`);
  console.log(`• Simultaneous Shoppers:      ${concurrentRequests} requests`);
  console.log(`• Target: 1 item per checkout request`);
  console.log(`• Connecting to database...`);

  await connectDB();

  // Create or reset test product
  const sku = `TEST-CONCURRENCY-${Date.now().toString(36).toUpperCase()}`;
  const product = await Product.create({
    name: 'Flash Sale Gaming Laptop',
    sku,
    price: 1299.99,
    stock: stockCount,
    availableStock: stockCount,
    reservedStock: 0,
    category: 'Electronics',
  });

  console.log(`✓ Created test product: "${product.name}" with available stock = ${product.availableStock}\n`);
  console.log(`⚡ Blasting ${concurrentRequests} checkout requests in parallel via Promise.all()...\n`);

  const startTime = Date.now();

  const requests = Array.from({ length: concurrentRequests }, (_, i) => {
    return orderService
      .createOrder({
        items: [{ productId: product._id, quantity: 1 }],
        customerName: `Concurrent Shopper #${i + 1}`,
        reservationDurationSec: 300,
      })
      .then(order => ({
        index: i + 1,
        success: true,
        orderId: order._id,
        orderNumber: order.orderNumber,
      }))
      .catch(err => ({
        index: i + 1,
        success: false,
        error: err.message,
        code: err.code || 'ERROR',
      }));
  });

  const results = await Promise.all(requests);
  const durationMs = Date.now() - startTime;

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  // Re-fetch product from DB
  const finalProduct = await Product.findById(product._id);
  const ordersCount = await Order.countDocuments({ 'items.productId': product._id });

  console.log(`======================================================`);
  console.log(`  📊 STRESS TEST RESULTS (Completed in ${durationMs}ms)`);
  console.log(`======================================================`);
  console.log(`  Total Requests Executed:    ${concurrentRequests}`);
  console.log(`  Successful Orders Placed:   ${successful.length}  (Expected: ${stockCount})`);
  console.log(`  Rejected (Out of Stock):    ${failed.length}  (Expected: ${concurrentRequests - stockCount})`);
  console.log(`------------------------------------------------------`);
  console.log(`  Initial Stock:              ${stockCount}`);
  console.log(`  Final Available Stock:      ${finalProduct.availableStock}`);
  console.log(`  Final Reserved Stock:       ${finalProduct.reservedStock}`);
  console.log(`  Final Total Stock (Physical):${finalProduct.stock}`);
  console.log(`  Orders in Database:         ${ordersCount}`);
  console.log(`------------------------------------------------------`);

  const isConcurrencySafe =
    successful.length === stockCount &&
    failed.length === concurrentRequests - stockCount &&
    finalProduct.availableStock === 0 &&
    finalProduct.reservedStock === stockCount;

  if (isConcurrencySafe) {
    console.log(`  ✅ TEST PASSED: ZERO OVERSELLING OCCURRED!`);
    console.log(`     Strict inventory isolation and atomic guards preserved consistency.`);
  } else {
    console.log(`  ❌ TEST FAILED: INVENTORY INCONSISTENCY DETECTED!`);
  }
  console.log(`======================================================\n`);

  await disconnectDB();
  process.exit(isConcurrencySafe ? 0 : 1);
}

runSimulation().catch(err => {
  console.error('Fatal simulation error:', err);
  process.exit(1);
});
