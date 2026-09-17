const crypto = require('crypto');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'pos-concurrency-safe-secret-key-987654321';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

class AuthService {
  /**
   * Generates a tamper-proof HMAC-SHA256 bearer token
   */
  generateToken(user) {
    const payload = {
      id: user._id ? user._id.toString() : user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      exp: Date.now() + TOKEN_EXPIRY_MS,
    };

    const headerBase64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
      'base64url'
    );
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerBase64}.${payloadBase64}`)
      .digest('base64url');

    return `${headerBase64}.${payloadBase64}.${signature}`;
  }

  /**
   * Verifies token signature and expiry
   */
  verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerBase64, payloadBase64, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerBase64}.${payloadBase64}`)
      .digest('base64url');

    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
      if (payload.exp && Date.now() > payload.exp) {
        return null; // Expired
      }
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Authenticate user credentials
   */
  async authenticate(username, password) {
    if (!username || !password) {
      const error = new Error('Username and password are required');
      error.statusCode = 400;
      throw error;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });

    if (!user || !user.verifyPassword(password)) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        name: user.name,
      },
    };
  }

  /**
   * Create a new user (Admin only operation)
   */
  async createUser({ username, password, role = 'user', name }) {
    if (!username || !password) {
      const error = new Error('Username and password are required');
      error.statusCode = 400;
      throw error;
    }

    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters');
      error.statusCode = 400;
      throw error;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) {
      const error = new Error(`Username '${normalizedUsername}' already exists`);
      error.statusCode = 409;
      throw error;
    }

    const user = new User({
      username: normalizedUsername,
      name: name && name.trim() ? name.trim() : normalizedUsername,
      role: ['admin', 'user'].includes(role) ? role : 'user',
    });

    user.setPassword(password);
    await user.save();

    return {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get all registered users from database
   */
  async listUsers() {
    const users = await User.find();
    return users.map(u => ({
      id: (u._id || u.id).toString(),
      username: u.username,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Seed default administrator if database has 0 users
   */
  async seedDefaultAdmin() {
    try {
      const count = await User.countDocuments();
      if (count === 0) {
        const defaultAdmin = new User({
          username: 'admin',
          name: 'System Administrator',
          role: 'admin',
        });
        defaultAdmin.setPassword('admin123');
        await defaultAdmin.save();
        console.log('[Auth] Default administrator initialized: admin / admin123');
      }
    } catch (err) {
      console.error('[Auth] Error initializing default admin:', err.message);
    }
  }
}

module.exports = new AuthService();
