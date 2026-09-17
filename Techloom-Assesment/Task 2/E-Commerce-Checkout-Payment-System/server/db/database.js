const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Seed catalog of futuristic cyber/tech products
const INITIAL_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'CyberPulse Neural Headphones',
    category: 'Audio',
    price: 299.99,
    rating: 4.9,
    reviewsCount: 142,
    stock: 12,
    reservedStock: 0,
    description: 'Active quantum noise cancellation, biometric neuro-sync, and 48-hour ultra-density battery life.',
    specs: ['Lossless Spatial Audio', 'Graphene Biometric Drivers', '48h Battery', 'Bluetooth 5.4 + 2.4Ghz Ultra-Low Latency'],
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    badge: 'Flagship'
  },
  {
    id: 'prod-002',
    name: 'AeroHolo Smart AR Glass',
    category: 'Wearables',
    price: 549.50,
    rating: 4.8,
    reviewsCount: 88,
    stock: 7,
    reservedStock: 0,
    description: 'Micro-OLED dual 4K heads-up display, real-time spatial computing, and gesture-controlled cyber HUD.',
    specs: ['Dual Micro-OLED 4K', 'Titanium Mesh Frame (62g)', 'Spatial Audio Ear-Stems', 'LiDAR Depth Sensor'],
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
    badge: 'Trending'
  },
  {
    id: 'prod-003',
    name: 'Vortex Mechanical Split Cyber-Board',
    category: 'Computing',
    price: 189.00,
    rating: 4.7,
    reviewsCount: 210,
    stock: 18,
    reservedStock: 0,
    description: 'Ergonomic split layout with hot-swappable hall-effect magnetic switches and emerald per-key backlighting.',
    specs: ['Hall Effect Rapid Trigger', 'Anodized Emerald Aluminum Base', 'OLED Status Screen', 'QMK / VIA Programmable'],
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    badge: 'Popular'
  },
  {
    id: 'prod-004',
    name: 'QuantumDrive 4TB Rugged SSD',
    category: 'Storage',
    price: 249.99,
    rating: 4.9,
    reviewsCount: 95,
    stock: 15,
    reservedStock: 0,
    description: 'Blazing 7,500 MB/s read speeds encased in an IP68 waterproof, shockproof military-grade carbon chassis.',
    specs: ['NVMe Gen 4x4 (7,500 MB/s)', 'Hardware 256-bit AES Encryption', 'IP68 Water & Dust Resistant', 'USB-C / Thunderbolt 4'],
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
    badge: 'Best Value'
  },
  {
    id: 'prod-005',
    name: 'OmniDeck Ultra Portable Gaming Rig',
    category: 'Gaming',
    price: 799.00,
    rating: 4.8,
    reviewsCount: 312,
    stock: 5,
    reservedStock: 0,
    description: 'Next-gen handheld powerhouse equipped with AMD Ryzen Z1 Extreme, 120Hz OLED, and hall-sensing joysticks.',
    specs: ['7.4" 120Hz OLED Display', 'AMD Ryzen Z1 Extreme + 16GB LPDDR5X', 'Zero-Drift Hall Joysticks', '65W Fast Charge'],
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    badge: 'Low Stock'
  },
  {
    id: 'prod-006',
    name: 'BioTrack Chrono Smart Watch X',
    category: 'Wearables',
    price: 329.99,
    rating: 4.6,
    reviewsCount: 164,
    stock: 20,
    reservedStock: 0,
    description: 'Medical-grade continuous ECG, blood oxygen, hydration metrics, and sapphire glass emerald titanium casing.',
    specs: ['Sapphire Crystal & DLC Titanium', 'Continuous ECG & PPG Sensors', '14-Day Battery Endurance', '5ATM Water Immersion'],
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    badge: 'New'
  },
  {
    id: 'prod-007',
    name: 'Synapse Ergonomic Cyber Mouse',
    category: 'Computing',
    price: 99.00,
    rating: 4.7,
    reviewsCount: 178,
    stock: 25,
    reservedStock: 0,
    description: 'Ultra-lightweight 49g honeycomb design with 30,000 DPI optical sensor and frictionless glass skates.',
    specs: ['30K Optical Sensor', '4K Polling Rate Receiver', '49g Featherweight Carbon', '100% Virgin Grade PTFE / Glass Skates'],
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
    badge: ''
  },
  {
    id: 'prod-008',
    name: 'NovaBeam Studio 4K Cyber Camera',
    category: 'Accessories',
    price: 199.50,
    rating: 4.5,
    reviewsCount: 64,
    stock: 10,
    reservedStock: 0,
    description: 'Dual Sony STARVIS sensors with hardware AI framing, beamforming mic array, and integrated emerald privacy shutter.',
    specs: ['4K 60FPS Sony Sensor', 'Hardware AI Auto-Focus & Framing', 'Integrated Magnetic Privacy Shutter', 'Dual Beamforming Microphones'],
    imageUrl: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=800&q=80',
    badge: 'Creator Choice'
  }
];

// Persistent File Store implementation with atomic writes & in-memory cache
class FileDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.filePath = path.join(this.dataDir, 'ecommerce_db.json');
    this.data = {
      users: [],
      products: [],
      checkoutSessions: [],
      orders: [],
      idempotencyKeys: []
    };
    this.init();
  }

  init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const SEED_USERS = [
      {
        id: 'usr_admin',
        name: 'Nexus Admin',
        email: 'admin@cyberstore.io',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_customer',
        name: 'Alex Vance',
        email: 'customer@cyberstore.io',
        password: 'customer123',
        role: 'customer',
        createdAt: new Date().toISOString()
      }
    ];

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all collections exist
        this.data.users = this.data.users || [];
        this.data.products = this.data.products || [];
        this.data.checkoutSessions = this.data.checkoutSessions || [];
        this.data.orders = this.data.orders || [];
        this.data.idempotencyKeys = this.data.idempotencyKeys || [];
        
        // Seed users if empty
        if (this.data.users.length === 0) {
          this.data.users = [...SEED_USERS];
        } else {
          // Ensure default admin exists
          if (!this.data.users.some(u => u.email === 'admin@cyberstore.io')) {
            this.data.users.push(SEED_USERS[0]);
          }
        }

        // If empty products, seed
        if (this.data.products.length === 0) {
          this.data.products = [...INITIAL_PRODUCTS];
        }
        this.persist();
      } catch (err) {
        console.error('Error reading db.json, reinitializing:', err);
        this.data.users = [...SEED_USERS];
        this.data.products = [...INITIAL_PRODUCTS];
        this.persist();
      }
    } else {
      this.data.users = [...SEED_USERS];
      this.data.products = [...INITIAL_PRODUCTS];
      this.persist();
    }
  }

  persist() {
    try {
      const tempPath = this.filePath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  // Users
  getUsers() {
    return this.data.users || [];
  }

  getUserById(id) {
    return (this.data.users || []).find(u => u.id === id);
  }

  getUserByEmail(email) {
    if (!email) return null;
    return (this.data.users || []).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user) {
    this.data.users = this.data.users || [];
    this.data.users.push(user);
    this.persist();
    return user;
  }

  // Products
  getProducts() {
    return this.data.products;
  }

  getProductById(id) {
    return this.data.products.find(p => p.id === id);
  }

  addProduct(product) {
    this.data.products.push(product);
    this.persist();
    return product;
  }

  deleteProduct(id) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      const removed = this.data.products.splice(idx, 1)[0];
      this.persist();
      return removed;
    }
    return null;
  }

  updateProduct(id, updates) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.products[idx] = { ...this.data.products[idx], ...updates };
      this.persist();
      return this.data.products[idx];
    }
    return null;
  }

  // Checkout Sessions (Stock Reservation)
  createCheckoutSession(session) {
    this.data.checkoutSessions.push(session);
    this.persist();
    return session;
  }

  getCheckoutSession(sessionId) {
    return this.data.checkoutSessions.find(s => s.sessionId === sessionId);
  }

  updateCheckoutSession(sessionId, updates) {
    const idx = this.data.checkoutSessions.findIndex(s => s.sessionId === sessionId);
    if (idx !== -1) {
      this.data.checkoutSessions[idx] = { ...this.data.checkoutSessions[idx], ...updates };
      this.persist();
      return this.data.checkoutSessions[idx];
    }
    return null;
  }

  getAllCheckoutSessions() {
    return this.data.checkoutSessions;
  }

  // Orders
  createOrder(order) {
    this.data.orders.unshift(order); // latest first
    this.persist();
    return order;
  }

  getOrders() {
    return this.data.orders;
  }

  getOrderById(id) {
    return this.data.orders.find(o => o.id === id);
  }

  updateOrder(id, updates) {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.data.orders[idx] = { 
        ...this.data.orders[idx], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      this.persist();
      return this.data.orders[idx];
    }
    return null;
  }

  // Idempotency Keys
  getIdempotencyRecord(key) {
    return this.data.idempotencyKeys.find(r => r.key === key);
  }

  saveIdempotencyRecord(record) {
    const idx = this.data.idempotencyKeys.findIndex(r => r.key === record.key);
    if (idx !== -1) {
      this.data.idempotencyKeys[idx] = { ...this.data.idempotencyKeys[idx], ...record };
    } else {
      this.data.idempotencyKeys.push(record);
    }
    this.persist();
    return record;
  }

  resetCatalog() {
    this.data.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.persist();
    return this.data.products;
  }
}

// Singleton database instance
const db = new FileDatabase();

// Optional Mongoose connection if MONGODB_URI is provided
let mongoConnected = false;
async function initMongoIfConfigured() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      console.log('Connecting to MongoDB at:', uri.replace(/:([^:@]{4})[^:@]*@/, ':****@'));
      await mongoose.connect(uri);
      mongoConnected = true;
      console.log('MongoDB connected successfully.');
    } catch (err) {
      console.warn('MongoDB connection failed, continuing with robust embedded file database:', err.message);
    }
  } else {
    console.log('No MONGODB_URI provided. Running on embedded persistent database (ready for instant Railway zero-config deploy).');
  }
}

initMongoIfConfigured();

module.exports = {
  db,
  INITIAL_PRODUCTS
};
