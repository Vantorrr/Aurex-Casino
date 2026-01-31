const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameCode: {
    type: String,
    required: true
  },
  gameName: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    default: 'B2B Slots'
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  operatorId: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['RUB', 'USD', 'EUR', 'BTC', 'LTC', 'KZT', 'UAH']
  },
  startBalance: {
    type: Number,
    required: true
  },
  currentBalance: {
    type: Number,
    required: true
  },
  totalBet: {
    type: Number,
    default: 0
  },
  totalWin: {
    type: Number,
    default: 0
  },
  spinsCount: {
    type: Number,
    default: 0
  },
  gameUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'terminated'],
    default: 'active'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }]
}, {
  timestamps: true
});

// Index for performance
gameSessionSchema.index({ user: 1, createdAt: -1 });
gameSessionSchema.index({ sessionId: 1 });
gameSessionSchema.index({ status: 1 });

// Calculate session profit/loss
gameSessionSchema.virtual('profit').get(function() {
  return this.totalWin - this.totalBet;
});

// Calculate session duration
gameSessionSchema.virtual('duration').get(function() {
  const end = this.endedAt || new Date();
  return Math.floor((end - this.startedAt) / 1000); // in seconds
});

// Method to end session
gameSessionSchema.methods.endSession = function() {
  this.status = 'completed';
  this.endedAt = new Date();
  this.currentBalance = this.startBalance + this.profit;
};

// Update last activity
gameSessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
};

module.exports = mongoose.model('GameSession', gameSessionSchema);