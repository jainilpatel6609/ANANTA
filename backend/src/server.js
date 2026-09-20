const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();
const { PORT, CLIENT_URL, NODE_ENV } = require('./config/env');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dealerRoutes = require('./routes/dealerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const pincodeRoutes = require('./routes/pincodeRoutes');

const app = express();

// Database Connection
connectDB();

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from all origins during local development or matched CLIENT_URL
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Logging
if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file storage for uploads (Royalty & Weighbridge documents)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root status endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'ANANTA TRADERS Full-Stack API & Real-Time Socket Server',
    status: 'ONLINE',
    environment: NODE_ENV,
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      deliveries: '/api/deliveries'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    success: isDbConnected,
    status: isDbConnected ? 'ONLINE' : 'DEGRADED',
    database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED / CONNECTING',
    service: 'ANANTA TRADERS Full-Stack API',
    timestamp: new Date().toISOString()
  });
});

// Database Readiness Gate for API routes
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is connecting. Please check MONGODB_URI in Render dashboard and ensure MongoDB Atlas IP Access List allows 0.0.0.0/0.',
      data: null
    });
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/vehicle-configs', require('./routes/vehicleConfigRoutes'));
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/dealers', dealerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pincode', pincodeRoutes);
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/dealer-transport', require('./routes/dealerTransportRoutes'));

// Global Error Handler
app.use(errorHandler);

const http = require('http');
const { initSocket } = require('./sockets/socket');
const EscalationScheduler = require('./services/escalationScheduler');

const server = http.createServer(app);
initSocket(server);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  ANANTA TRADERS API SERVER & REAL-TIME SOCKET.IO`);
    console.log(`  Quality Materials. Reliable Delivery.`);
    console.log(`  Running on: http://0.0.0.0:${PORT}`);
    console.log(`  Environment: ${NODE_ENV}`);
    console.log(`=======================================================`);
    
    // Start background 15-minute dealer response SLA timeout monitor
    EscalationScheduler.start(30000);
  });
}

app.server = server;
module.exports = app;
