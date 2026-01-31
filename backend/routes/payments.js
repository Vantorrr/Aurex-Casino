const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { User, Transaction } = require('../models/temp-models');
const config = require('../config/config');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Lava Top Payment Service
class LavaTopService {
  constructor() {
    this.apiUrl = config.lavaTop.apiUrl;
    this.shopId = config.lavaTop.shopId;
    this.apiKey = config.lavaTop.apiKey;
  }

  // Create invoice for deposit
  async createInvoice(amount, currency, userId, orderId) {
    try {
      const invoiceData = {
        shopId: this.shopId,
        amount: amount,
        currency: currency,
        orderId: orderId,
        hookUrl: `${config.server.frontendUrl}/api/payments/lava-callback`,
        successUrl: `${config.server.frontendUrl}/payment/success`,
        failUrl: `${config.server.frontendUrl}/payment/fail`,
        additionalData: JSON.stringify({ userId })
      };

      const signature = this.generateSignature(invoiceData);
      invoiceData.signature = signature;

      const response = await axios.post(`${this.apiUrl}/createInvoice`, invoiceData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('Lava Top create invoice error:', error);
      throw new Error('Failed to create payment invoice');
    }
  }

  // Check invoice status
  async getInvoiceStatus(invoiceId) {
    try {
      const response = await axios.get(`${this.apiUrl}/statusInvoice`, {
        params: { invoiceId },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 15000
      });

      return response.data;
    } catch (error) {
      console.error('Lava Top status check error:', error);
      throw new Error('Failed to check payment status');
    }
  }

  // Create payout for withdrawal
  async createPayout(amount, currency, card, userId, orderId) {
    try {
      const payoutData = {
        shopId: this.shopId,
        amount: amount,
        currency: currency,
        orderId: orderId,
        card: card,
        hookUrl: `${config.server.frontendUrl}/api/payments/lava-payout-callback`,
        additionalData: JSON.stringify({ userId })
      };

      const signature = this.generateSignature(payoutData);
      payoutData.signature = signature;

      const response = await axios.post(`${this.apiUrl}/createPayout`, payoutData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('Lava Top create payout error:', error);
      throw new Error('Failed to create payout');
    }
  }

  // Generate signature for Lava Top
  generateSignature(data) {
    const sortedData = Object.keys(data)
      .filter(key => key !== 'signature')
      .sort()
      .map(key => `${key}:${data[key]}`)
      .join('|');
    
    return crypto
      .createHmac('sha256', this.apiKey)
      .update(sortedData)
      .digest('hex');
  }

  // Verify webhook signature
  verifySignature(data, signature) {
    const generatedSignature = this.generateSignature(data);
    return generatedSignature === signature;
  }
}

const lavaTopService = new LavaTopService();

// Get user's payment history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = { 
      user: req.user.id,
      type: { $in: ['deposit', 'withdrawal'] }
    };
    
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment history'
    });
  }
});

// Create deposit
router.post('/deposit', auth, [
  body('amount')
    .isFloat({ min: 100 })
    .withMessage('Minimum deposit amount is 100'),
  body('currency')
    .isIn(['RUB', 'USD', 'EUR'])
    .withMessage('Invalid currency')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, currency } = req.body;
    const userId = req.user.id;

    // Generate unique order ID
    const orderId = `DEP_${Date.now()}_${userId}`;

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      transactionId: Transaction.generateTransactionId(),
      type: 'deposit',
      amount: amount,
      currency: currency,
      balanceBefore: req.user.balance[currency] || 0,
      balanceAfter: (req.user.balance[currency] || 0) + amount,
      description: `Deposit ${amount} ${currency}`,
      status: 'pending',
      paymentMethod: 'lava_top',
      paymentId: orderId,
      ipAddress: req.ip
    });

    await transaction.save();

    // Create Lava Top invoice
    const invoice = await lavaTopService.createInvoice(amount, currency, userId, orderId);

    // Update transaction with invoice data
    transaction.metadata = {
      invoiceId: invoice.id,
      invoiceUrl: invoice.url
    };
    await transaction.save();

    res.json({
      success: true,
      data: {
        transactionId: transaction.transactionId,
        paymentUrl: invoice.url,
        amount: amount,
        currency: currency,
        orderId: orderId
      }
    });
  } catch (error) {
    console.error('Create deposit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create deposit'
    });
  }
});

// Create withdrawal
router.post('/withdraw', auth, [
  body('amount')
    .isFloat({ min: 500 })
    .withMessage('Minimum withdrawal amount is 500'),
  body('currency')
    .isIn(['RUB', 'USD', 'EUR'])
    .withMessage('Invalid currency'),
  body('card')
    .matches(/^\d{16,19}$/)
    .withMessage('Invalid card number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, currency, card } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user has sufficient balance
    if (!user.canAfford(currency, amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Check minimum withdrawal amount based on user's deposit history
    const totalDeposited = await Transaction.aggregate([
      { 
        $match: { 
          user: userId, 
          type: 'deposit', 
          status: 'completed',
          currency: currency
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const depositedAmount = totalDeposited.length > 0 ? totalDeposited[0].total : 0;
    if (amount > depositedAmount * 2) {
      return res.status(400).json({
        success: false,
        error: 'Withdrawal amount cannot exceed 200% of total deposits'
      });
    }

    // Generate unique order ID
    const orderId = `WDR_${Date.now()}_${userId}`;

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      transactionId: Transaction.generateTransactionId(),
      type: 'withdrawal',
      amount: -amount, // Negative for withdrawal
      currency: currency,
      balanceBefore: user.balance[currency],
      balanceAfter: user.balance[currency] - amount,
      description: `Withdrawal ${amount} ${currency} to card ${card.slice(-4)}`,
      status: 'pending',
      paymentMethod: 'lava_top',
      paymentId: orderId,
      metadata: { card: card },
      ipAddress: req.ip
    });

    // Update user balance (hold the amount)
    user.updateBalance(currency, -amount);
    user.totalWithdrawn += amount;

    await Promise.all([transaction.save(), user.save()]);

    // Create Lava Top payout
    try {
      const payout = await lavaTopService.createPayout(amount, currency, card, userId, orderId);
      
      transaction.metadata.payoutId = payout.id;
      await transaction.save();

      res.json({
        success: true,
        data: {
          transactionId: transaction.transactionId,
          amount: amount,
          currency: currency,
          orderId: orderId,
          status: 'pending'
        }
      });
    } catch (payoutError) {
      // Revert balance if payout creation failed
      user.updateBalance(currency, amount);
      user.totalWithdrawn -= amount;
      await user.save();

      transaction.fail('Payout creation failed');
      await transaction.save();

      throw payoutError;
    }
  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create withdrawal'
    });
  }
});

// Get payment methods and limits
router.get('/methods', auth, async (req, res) => {
  try {
    const methods = {
      deposit: {
        lava_top: {
          name: 'Lava Top',
          currencies: ['RUB', 'USD', 'EUR'],
          minAmount: { RUB: 100, USD: 2, EUR: 2 },
          maxAmount: { RUB: 500000, USD: 7000, EUR: 6000 },
          fee: 0, // No fee for deposits
          processingTime: '1-5 minutes'
        }
      },
      withdrawal: {
        lava_top: {
          name: 'Lava Top',
          currencies: ['RUB', 'USD', 'EUR'],
          minAmount: { RUB: 500, USD: 7, EUR: 6 },
          maxAmount: { RUB: 500000, USD: 7000, EUR: 6000 },
          fee: { RUB: 50, USD: 1, EUR: 1 },
          processingTime: '1-24 hours'
        }
      }
    };

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods'
    });
  }
});

// Lava Top deposit callback
router.post('/lava-callback', async (req, res) => {
  try {
    const { signature, ...data } = req.body;

    // Verify signature
    if (!lavaTopService.verifySignature(data, signature)) {
      console.error('Invalid Lava Top signature');
      return res.status(400).send('Invalid signature');
    }

    const { orderId, status, amount, currency } = data;
    const additionalData = JSON.parse(data.additionalData || '{}');
    const userId = additionalData.userId;

    // Find transaction
    const transaction = await Transaction.findOne({ paymentId: orderId });
    if (!transaction) {
      console.error('Transaction not found for orderId:', orderId);
      return res.status(404).send('Transaction not found');
    }

    if (status === 'success' && transaction.status === 'pending') {
      // Payment successful
      const user = await User.findById(userId);
      if (user) {
        // Update user balance
        user.updateBalance(currency, amount);
        user.totalDeposited += amount;
        await user.save();

        // Complete transaction
        transaction.complete();
        transaction.balanceAfter = user.balance[currency];
        await transaction.save();

        console.log(`Deposit completed: ${amount} ${currency} for user ${userId}`);
        
        // Process referral commission if user was referred
        const referredBy = user.referredBy || user.referral?.referredBy;
        if (referredBy) {
          try {
            const referrer = await User.findById(referredBy);
            if (referrer) {
              // Calculate commission based on referral tier (10-20%)
              const referralCount = referrer.referralCount || referrer.referral?.referralCount || 0;
              let commissionPercent = 10;
              if (referralCount >= 50) commissionPercent = 20;
              else if (referralCount >= 30) commissionPercent = 18;
              else if (referralCount >= 15) commissionPercent = 15;
              else if (referralCount >= 5) commissionPercent = 12;
              
              const commission = Math.floor(amount * commissionPercent / 100);
              
              // Add commission to referrer's balance
              if (referrer.balance && typeof referrer.balance === 'object') {
                referrer.balance[currency] = (referrer.balance[currency] || 0) + commission;
              }
              if (referrer.referral) {
                referrer.referral.referralEarnings = (referrer.referral.referralEarnings || 0) + commission;
              } else {
                referrer.referralEarnings = (referrer.referralEarnings || 0) + commission;
              }
              
              // Save referrer
              if (typeof referrer.save === 'function') {
                await referrer.save();
              } else {
                await User.findByIdAndUpdate(referrer._id, referrer);
              }
              
              console.log(`Referral commission: ${commission} ${currency} to user ${referrer._id}`);
            }
          } catch (refError) {
            console.error('Referral commission error:', refError);
          }
        }
      }
    } else if (status === 'failed') {
      // Payment failed
      transaction.fail('Payment failed');
      await transaction.save();

      console.log(`Deposit failed for orderId: ${orderId}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Lava Top callback error:', error);
    res.status(500).send('Internal server error');
  }
});

// Lava Top withdrawal callback
router.post('/lava-payout-callback', async (req, res) => {
  try {
    const { signature, ...data } = req.body;

    // Verify signature
    if (!lavaTopService.verifySignature(data, signature)) {
      console.error('Invalid Lava Top payout signature');
      return res.status(400).send('Invalid signature');
    }

    const { orderId, status } = data;

    // Find transaction
    const transaction = await Transaction.findOne({ paymentId: orderId });
    if (!transaction) {
      console.error('Withdrawal transaction not found for orderId:', orderId);
      return res.status(404).send('Transaction not found');
    }

    if (status === 'success' && transaction.status === 'pending') {
      // Withdrawal successful
      transaction.complete();
      await transaction.save();

      console.log(`Withdrawal completed for orderId: ${orderId}`);
    } else if (status === 'failed') {
      // Withdrawal failed - return money to user
      const user = await User.findById(transaction.user);
      if (user) {
        user.updateBalance(transaction.currency, Math.abs(transaction.amount));
        user.totalWithdrawn -= Math.abs(transaction.amount);
        await user.save();
      }

      transaction.fail('Withdrawal failed');
      await transaction.save();

      console.log(`Withdrawal failed for orderId: ${orderId}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Lava Top payout callback error:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;