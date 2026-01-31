const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameSession'
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['bet', 'win', 'deposit', 'withdrawal', 'bonus', 'refund', 'rollback']
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['RUB', 'USD', 'EUR', 'BTC', 'LTC', 'KZT', 'UAH']
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  gameCode: {
    type: String
  },
  gameName: {
    type: String
  },
  roundId: {
    type: String
  },
  betId: {
    type: String
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String // For deposits/withdrawals
  },
  paymentId: {
    type: String // External payment system ID
  },
  metadata: {
    type: Object,
    default: {}
  },
  processedAt: {
    type: Date
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ gameSession: 1 });

// Pre-save middleware to set processedAt for completed transactions
transactionSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.processedAt) {
    this.processedAt = new Date();
  }
  next();
});

// Static method to generate unique transaction ID
transactionSchema.statics.generateTransactionId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN_${timestamp}_${random}`.toUpperCase();
};

// Method to complete transaction
transactionSchema.methods.complete = function() {
  this.status = 'completed';
  this.processedAt = new Date();
};

// Method to fail transaction
transactionSchema.methods.fail = function(reason) {
  this.status = 'failed';
  this.metadata.failureReason = reason;
  this.processedAt = new Date();
};

module.exports = mongoose.model('Transaction', transactionSchema);