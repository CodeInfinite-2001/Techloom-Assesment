const crypto = require('crypto');
const { db } = require('../db/database');

class AuthService {
  /**
   * Helper to generate safe session token
   */
  generateToken(user) {
    const payload = JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      issuedAt: Date.now()
    });
    return Buffer.from(payload).toString('base64');
  }

  /**
   * Helper to decode token
   */
  verifyToken(token) {
    try {
      if (!token) return null;
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const raw = Buffer.from(cleanToken, 'base64').toString('utf-8');
      const data = JSON.parse(raw);
      const user = (data.id && db.getUserById(data.id)) || (data.email && db.getUserByEmail(data.email));
      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
      if (data.id && data.email) {
        return {
          id: data.id,
          name: data.name || 'Customer',
          email: data.email,
          role: data.role || 'customer'
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Register a new user (Customer or Admin)
   */
  async register({ name, email, password, role = 'customer' }) {
    if (!name || !name.trim()) {
      return { success: false, error: 'Name is required' };
    }
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Valid email address is required' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Admin registration is restricted: only 1 administrator account is permitted
    if (role === 'admin') {
      const existingAdmin = (db.getUsers() || []).some(u => u.role === 'admin');
      if (existingAdmin) {
        return { 
          success: false, 
          error: 'Admin registration is disabled. Only 1 administrator account is permitted in the system.' 
        };
      }
    }

    const validRole = role === 'admin' ? 'admin' : 'customer';

    const newUser = {
      id: `usr_${crypto.randomUUID().substring(0, 10)}`,
      name: name.trim(),
      email: cleanEmail,
      password: password, // in production we'd use bcrypt
      role: validRole,
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    };

    const token = this.generateToken(safeUser);

    return {
      success: true,
      token,
      user: safeUser,
      message: `Account created successfully as ${validRole.toUpperCase()}`
    };
  }

  /**
   * Sign in with email and password
   */
  async login({ email, password }) {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);

    if (!user || user.password !== password) {
      return { success: false, error: 'Invalid email or password' };
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = this.generateToken(safeUser);

    return {
      success: true,
      token,
      user: safeUser,
      message: `Welcome back, ${user.name}!`
    };
  }
}

module.exports = new AuthService();
