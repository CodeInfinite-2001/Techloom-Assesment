const http = require('http');

const BASE_URL = 'http://localhost:5050';

function request(method, path, body = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting End-to-End Automated Backend Verification...\n');

  try {
    // 1. Reset catalog
    console.log('1️⃣ Resetting test catalog...');
    const resetRes = await request('POST', '/api/admin/reset');
    console.log('   Status:', resetRes.status, 'Products count:', resetRes.data.products.length);

    // 2. Product Discovery: Search & Filter
    console.log('\n2️⃣ Testing Product Discovery (Search & Category Filtering)...');
    const allProducts = await request('GET', '/api/products');
    const initialProduct = allProducts.data.products.find(p => p.id === 'prod-001');
    const initialStock = initialProduct.availableStock;
    console.log(`   Product: "${initialProduct.name}", Available Stock: ${initialStock}`);

    const searchRes = await request('GET', '/api/products?search=neural');
    console.log(`   Search for 'neural' returned: ${searchRes.data.count} items (Expect 1)`);

    const filterRes = await request('GET', '/api/products?category=Wearables');
    console.log(`   Category 'Wearables' returned: ${filterRes.data.count} items`);

    // 3. Stock Reservation
    console.log('\n3️⃣ Testing Stock Reservation Flow (Holding 2 units for 10 minutes)...');
    const reserveRes = await request('POST', '/api/checkout/reserve', {
      items: [{ productId: 'prod-001', quantity: 2 }],
      customer: { name: 'Alice Test', email: 'alice@test.com' }
    });
    console.log('   Reservation status:', reserveRes.status);
    console.log('   Session ID:', reserveRes.data.session.sessionId);
    console.log('   Expires At:', reserveRes.data.session.expiresAt);

    // Verify available stock decreased by 2
    const afterReserve = await request('GET', '/api/products/prod-001');
    console.log(`   New Available Stock: ${afterReserve.data.product.availableStock} (Expected: ${initialStock - 2})`);
    if (afterReserve.data.product.availableStock !== initialStock - 2) {
      throw new Error('Stock reservation failed to decrease available stock!');
    }

    // 4. Duplicate Payment Prevention (Idempotency Key)
    console.log('\n4️⃣ Testing Mock Payment Gateway & Duplicate Payment Prevention (Idempotency)...');
    const idempotencyKey = `test-key-${Date.now()}`;
    const sessionId = reserveRes.data.session.sessionId;

    // First payment request (SUCCESS)
    console.log('   Sending Payment Request 1 (Initial)...');
    const payRes1 = await request('POST', '/api/checkout/pay', {
      checkoutSessionId: sessionId,
      idempotencyKey,
      simulationMode: 'SUCCESS',
      paymentDetails: { cardNumber: '4242424242424242' }
    });
    console.log('   Payment 1 Status:', payRes1.status, 'Order ID:', payRes1.data.order.id);
    const orderId = payRes1.data.order.id;

    // Second payment request with identical idempotencyKey (DUPLICATE ATTEMPT)
    console.log('   Sending Payment Request 2 (Duplicate with same Idempotency Key)...');
    const payRes2 = await request('POST', '/api/checkout/pay', {
      checkoutSessionId: sessionId,
      idempotencyKey,
      simulationMode: 'SUCCESS',
      paymentDetails: { cardNumber: '4242424242424242' }
    });
    console.log('   Payment 2 Status:', payRes2.status);
    console.log('   Is Duplicate Replay?', payRes2.data.isDuplicateReplay);
    console.log('   Message:', payRes2.data.message);
    if (!payRes2.data.isDuplicateReplay) {
      throw new Error('Idempotency guard failed: Did not detect duplicate request!');
    }

    // 5. Post-Purchase Flow: Order Cancellation & Simulated Refund
    console.log('\n5️⃣ Testing Order Cancellation & Simulated Refund with Stock Restitution...');
    const cancelRes = await request('POST', `/api/orders/${orderId}/cancel`, {
      reason: 'Automated test refund'
    });
    console.log('   Cancellation status:', cancelRes.status);
    console.log('   New Order Status:', cancelRes.data.order.status);
    console.log('   Refund ID:', cancelRes.data.refund.refundId);
    console.log('   Refund Amount: $' + cancelRes.data.refund.amount);

    // Verify stock was restored back to initialStock
    const afterRefund = await request('GET', '/api/products/prod-001');
    console.log(`   Stock after Refund Restitution: ${afterRefund.data.product.availableStock} (Expected: ${initialStock})`);
    if (afterRefund.data.product.availableStock !== initialStock) {
      throw new Error('Stock restitution failed: Inventory was not restored!');
    }

    // 6. Test Failed Payment Flow (Card Declined)
    console.log('\n6️⃣ Testing Failed Payment Simulation (Card Declined)...');
    const failReserve = await request('POST', '/api/checkout/reserve', {
      items: [{ productId: 'prod-002', quantity: 1 }]
    });
    const failSessionId = failReserve.data.session.sessionId;
    const prod2Before = (await request('GET', '/api/products/prod-002')).data.product.availableStock;

    const failPay = await request('POST', '/api/checkout/pay', {
      checkoutSessionId: failSessionId,
      idempotencyKey: `fail-key-${Date.now()}`,
      simulationMode: 'FAILED'
    });
    console.log('   Payment Decline Status:', failPay.status, 'Error:', failPay.data.error);
    console.log('   Stock Released flag:', failPay.data.stockReleased);

    const prod2After = (await request('GET', '/api/products/prod-002')).data.product.availableStock;
    console.log(`   Prod 2 Stock Restored: ${prod2After === prod2Before + 1}`);

    // 7. Test Gateway Timeout Simulation (504)
    console.log('\n7️⃣ Testing Payment Gateway Timeout Simulation (504)...');
    const timeoutReserve = await request('POST', '/api/checkout/reserve', {
      items: [{ productId: 'prod-003', quantity: 1 }]
    });
    const timeoutSessionId = timeoutReserve.data.session.sessionId;

    const timeoutPay = await request('POST', '/api/checkout/pay', {
      checkoutSessionId: timeoutSessionId,
      idempotencyKey: `timeout-key-${Date.now()}`,
      simulationMode: 'TIMEOUT'
    });
    console.log('   Timeout Status:', timeoutPay.status);
    console.log('   Error Message:', timeoutPay.data.error);
    console.log('   Retry Allowed?:', timeoutPay.data.retryAllowed);

    // 8. Order History Security Verification (Must be blocked for guests/logged out)
    console.log('\n8️⃣ Testing Order History Security (Blocked when logged out)...');
    const unauthOrdersRes = await request('GET', '/api/orders');
    console.log('   Unauthenticated GET /api/orders Status:', unauthOrdersRes.status, `(Expect 401 Unauthorized)`);
    if (unauthOrdersRes.status !== 401) {
      throw new Error('Security flaw: Unauthenticated guest was able to access order history!');
    }
    console.log('   🛡️ Verified: Guests & logged-out users are strictly blocked from seeing order history.');

    // 9. Authentication, User Signup, and Authenticated Order Access
    console.log('\n9️⃣ Testing User Sign Up & Authenticated Order Retrieval...');
    const testSignupEmail = `shopper_${Date.now()}@cybertest.io`;
    const signupRes = await request('POST', '/api/auth/register', {
      name: 'Cyber Tester',
      email: testSignupEmail,
      password: 'password123',
      role: 'customer'
    });
    console.log('   Sign Up Status:', signupRes.status);
    console.log('   Registered User ID:', signupRes.data.user.id);
    console.log('   User Role:', signupRes.data.user.role);
    if (signupRes.status !== 201 || signupRes.data.user.role !== 'customer') {
      throw new Error('User sign up failed!');
    }

    // Test that registering an additional admin is rejected (Only 1 admin allowed)
    const adminSignupAttempt = await request('POST', '/api/auth/register', {
      name: 'Rogue Admin',
      email: `rogue_${Date.now()}@cybertest.io`,
      password: 'password123',
      role: 'admin'
    });
    console.log('   Admin Signup Attempt Status (Expect 400):', adminSignupAttempt.status);
    if (adminSignupAttempt.status !== 400 || adminSignupAttempt.data.success !== false) {
      throw new Error('Admin registration was not blocked! Only 1 admin should be permitted.');
    }
    console.log('   🛡️ Verified: Admin signup is blocked with message:', adminSignupAttempt.data.error);

    // Login test
    const loginRes = await request('POST', '/api/auth/login', {
      email: testSignupEmail,
      password: 'password123'
    });
    console.log('   Login Status:', loginRes.status, 'Token exists:', Boolean(loginRes.data.token));
    const customerToken = loginRes.data.token;

    // Default Admin Login test
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@cyberstore.io',
      password: 'admin123'
    });
    console.log('   Admin Login Status:', adminLoginRes.status, 'Role:', adminLoginRes.data.user.role);
    const adminToken = adminLoginRes.data.token;

    // Authenticated Admin queries orders (Allowed!)
    const adminOrdersRes = await request('GET', '/api/orders', null, { Authorization: `Bearer ${adminToken}` });
    console.log(`   Authenticated Admin retrieved: ${adminOrdersRes.data.count} orders`);
    if (adminOrdersRes.status !== 200 || !Array.isArray(adminOrdersRes.data.orders)) {
      throw new Error('Authenticated admin was unable to retrieve orders!');
    }

    // Authenticated Customer queries orders (Allowed, scoped to customer)
    const customerOrdersRes = await request('GET', '/api/orders', null, { Authorization: `Bearer ${customerToken}` });
    console.log(`   Authenticated Customer retrieved own orders: ${customerOrdersRes.data.count}`);
    if (customerOrdersRes.status !== 200) {
      throw new Error('Authenticated customer was unable to retrieve own orders!');
    }

    // 10. Admin Management & Inventory Control
    console.log('\n🔟 Testing Admin Portal Operations (Analytics, Stock Adjustment & Add Product)...');
    const analyticsRes = await request('GET', '/api/admin/analytics');
    console.log('   Admin Gross Revenue: $' + analyticsRes.data.analytics.totalRevenue);
    console.log('   Admin Catalog Size:', analyticsRes.data.analytics.productsCount);

    // Admin Stock Adjustment (+10 units to prod-001)
    const prod1Before = (await request('GET', '/api/products/prod-001')).data.product.stock;
    const stockUpdateRes = await request('PUT', '/api/admin/products/prod-001', {
      stock: prod1Before + 10
    });
    console.log(`   Admin updated stock of prod-001 from ${prod1Before} to: ${stockUpdateRes.data.product.stock}`);
    if (stockUpdateRes.data.product.stock !== prod1Before + 10) {
      throw new Error('Admin stock adjustment failed!');
    }

    // Admin Add New Product
    const newProdRes = await request('POST', '/api/admin/products', {
      name: 'Quantum Cyber Droid Core',
      category: 'Computing',
      price: 499.00,
      stock: 8,
      description: 'Supercomputing quantum processor.',
      specs: ['Quantum 64-Qubit Array', 'Cryo-mesh Thermal Shield'],
      badge: 'Super-Core'
    });
    console.log('   Admin Product Created:', newProdRes.data.product.id, `(${newProdRes.data.product.name})`);
    if (newProdRes.status !== 201) {
      throw new Error('Admin product creation failed!');
    }

    console.log('\n🎉 ALL STORE, PAYMENT, AUTH, AND ADMIN PORTAL TESTS PASSED! ✅\n');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exit(1);
  }
}

// If run directly
runTests();

