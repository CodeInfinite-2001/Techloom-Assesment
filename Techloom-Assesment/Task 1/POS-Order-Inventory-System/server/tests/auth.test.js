const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const authService = require('../src/services/authService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await authService.seedDefaultAdmin();
});

describe('Authentication & User Management Integration Tests', () => {
  test('1. Default administrator is auto-seeded and can log in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('admin');
    expect(res.body.user.role).toBe('admin');
  });

  test('2. Reject invalid login credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('3. Admin can register a new cashier/user and store credentials in DB', async () => {
    // Admin login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    const adminToken = loginRes.body.token;

    // Admin registers cashier
    const createRes = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'cashier1',
        password: 'password123',
        name: 'Desk Cashier 1',
        role: 'user',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.user.username).toBe('cashier1');
    expect(createRes.body.user.role).toBe('user');

    // Verify stored in DB
    const dbUser = await User.findOne({ username: 'cashier1' });
    expect(dbUser).toBeDefined();
    expect(dbUser.verifyPassword('password123')).toBe(true);

    // Verify newly registered user can log in
    const cashierLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cashier1', password: 'password123' });

    expect(cashierLogin.status).toBe(200);
    expect(cashierLogin.body.user.role).toBe('user');
  });

  test('4. Non-admin user CANNOT register another user (403 Forbidden)', async () => {
    // Create a regular user
    await authService.createUser({
      username: 'cashier1',
      password: 'password123',
      role: 'user',
    });

    // Login as regular user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cashier1', password: 'password123' });
    const userToken = loginRes.body.token;

    // Attempt to register another user
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        username: 'hacker',
        password: 'password123',
        role: 'admin',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('5. Reject duplicate username registration', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    const adminToken = loginRes.body.token;

    // Try creating 'admin' again
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'admin',
        password: 'newpassword',
        role: 'admin',
      });

    expect(res.status).toBe(409);
  });

  test('6. Admin can retrieve list of all registered users without password exposure', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    const adminToken = loginRes.body.token;

    const listRes = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.users)).toBe(true);
    expect(listRes.body.users.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.users[0].passwordHash).toBeUndefined();
    expect(listRes.body.users[0].salt).toBeUndefined();
  });
});
