const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const slotsApiRoutes = require('./routes/slotsApi');
const gameCallbackRoutes = require('./routes/gameCallback');
const tournamentRoutes = require('./routes/tournaments');
const promocodeRoutes = require('./routes/promocodes');
const ticketRoutes = require('./routes/tickets');
const verificationRoutes = require('./routes/verification');
const referralRoutes = require('./routes/referral');
const cashbackRoutes = require('./routes/cashback');
const bonusRoutes = require('./routes/bonuses');
const configRoutes = require('./routes/config');
const vaultRoutes = require('./routes/vault');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Database connection (временно отключено для быстрого запуска)
console.log('⚠️  MongoDB временно отключен для быстрого запуска');
console.log('💡 Используется локальное хранилище в памяти');

// Temporary in-memory storage for quick demo
const { createAdminUser, createTestUser } = require('./data/adminUser');

// Инициализируем пользователей
const initializeUsers = async () => {
  const adminUser = await createAdminUser();
  const testUser = await createTestUser();
  
  global.tempUsers = [
    adminUser,
    testUser,
    {
      _id: 'demo_user',
      username: 'demo',
      email: 'demo@aurex.io',
      password: '$2b$12$/hQWwTrh.Uh3pvIlFbGdqOB9CAHU..s09L16Vmdnyq7sOxETyBaZq', // password: demo123
      balance: 10000,
      currency: 'RUB',
      vipLevel: 1,
      isVerified: true,
      isAdmin: false,
      isActive: true, // ✅ ИСПРАВЛЕНО: добавлен isActive
      b2b_user_id: 'aurex_demo_001',
      createdAt: new Date()
    }
  ];
  
  console.log('👤 Созданы пользователи:');
  console.log('  🔑 admin / admin123 - Баланс: 100,000₽ (B2B ID: aurex_admin_001)');
  console.log('  🔑 testuser / test123 - Баланс: 50,000₽ (B2B ID: aurex_user_001)');
  console.log('  🔑 demo / demo123 - Баланс: 10,000₽ (B2B ID: aurex_demo_001)');
};

initializeUsers();
global.tempSessions = [];
global.tempTransactions = [];

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-game', (gameId) => {
    socket.join(`game-${gameId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/slots', slotsApiRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/promocodes', promocodeRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/cashback', cashbackRoutes);
app.use('/api/bonuses', bonusRoutes);
app.use('/api/config', configRoutes);
app.use('/api/vault', vaultRoutes);

// Game callback routes (специфический путь для callback от провайдера)
app.use('/api/callback', gameCallbackRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 6000;

server.listen(PORT, () => {
  console.log(`🚀 AUREX Empire server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;