const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'POS Order & Inventory System',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// In production, serve the built React frontend from client/dist
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get(/(.*)/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), err => {
    if (err) {
      // If client build doesn't exist yet, return API welcome message
      res.status(200).send(`
        <html>
          <head><title>POS Order & Inventory Backend API</title></head>
          <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
            <h1>🚀 POS Order & Inventory System API</h1>
            <p>The backend is active and ready.</p>
            <ul>
              <li><a style="color: #38bdf8" href="/api/health">Health Check (/api/health)</a></li>
              <li><a style="color: #38bdf8" href="/api/products">Products API (/api/products)</a></li>
              <li><a style="color: #38bdf8" href="/api/orders">Orders API (/api/orders)</a></li>
            </ul>
          </body>
        </html>
      `);
    }
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
